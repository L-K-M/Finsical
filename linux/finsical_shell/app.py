"""Entry point: options, the web root, and bringing up GTK in the one
order that gives the app its id and X11 backend.

Nothing here imports Gdk or Gtk at module level: which backend GDK
uses, and the program class, are fixed the moment they are imported.
"""

from __future__ import annotations

import argparse
import logging
import os
import shutil
import sys
import tempfile

from . import logic

# WebKitGTK 2.40 added evaluate_javascript (and the Depends says so).
MIN_WEBKIT = (2, 40)
_PACKAGES = "python3-gi python3-gi-cairo gir1.2-gtk-3.0 gir1.2-webkit2-4.1"


class StartupError(Exception):
    """The app cannot start; the message says what to do."""


def _bring_up_gtk() -> None:
    """Load GTK and WebKit. The order matters: the program name before
    GDK loads, the backend choice before PyGObject's Gdk override
    initialises GDK, the program class right after."""
    try:
        import gi
    except ImportError as e:
        raise StartupError(
            f"PyGObject is missing ({e}); install {_PACKAGES}"
        ) from e
    try:
        gi.require_version("Gdk", "3.0")
        gi.require_version("Gtk", "3.0")
        gi.require_version("GdkPixbuf", "2.0")
        gi.require_version("WebKit2", "4.1")
        gi.require_version("Soup", "3.0")
        # Input and window shapes pass cairo regions (python3-gi-cairo).
        gi.require_foreign("cairo")
    except (ValueError, ImportError) as e:
        raise StartupError(f"{e}; install {_PACKAGES}") from e

    from gi.repository import GLib

    # Before GTK loads: the X11 WM_CLASS and the Wayland app id come
    # from the program name, and must match the desktop file.
    GLib.set_prgname(logic.APP_ID)
    if "GDK_BACKEND" not in os.environ:
        # Prefer X11 (XWayland on a Wayland desktop): only there can the
        # app keep the tank above, on all desktops, where it was left,
        # and shaped without a compositor. GDK_BACKEND=wayland opts out.
        # PyGObject's Gdk override initialises GDK on import, so this
        # has to go through the raw introspection module.
        from gi.module import get_introspection_module

        get_introspection_module("Gdk").set_allowed_backends("x11,wayland")

    from gi.repository import Gdk, WebKit2

    Gdk.set_program_class(logic.APP_ID)
    if Gdk.Display.get_default() is None:
        raise StartupError(
            "cannot open a display: run inside a desktop session "
            "(DISPLAY or WAYLAND_DISPLAY), or check GDK_BACKEND"
        )
    webkit = (WebKit2.get_major_version(), WebKit2.get_minor_version())
    if webkit < MIN_WEBKIT:
        raise StartupError(
            "WebKitGTK %d.%d is too old; %d.%d or later is required"
            % (webkit + MIN_WEBKIT)
        )


def _parse_args(argv: list[str], version: str) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="finsical", description="A lightweight retro virtual aquarium."
    )
    parser.add_argument(
        "--smoke-test",
        action="store_true",
        help="start on a throwaway profile, check the tank, its "
        "windows, the relay between them and a menu action, then quit "
        "(exit status 0 when everything works)",
    )
    parser.add_argument(
        "--version", action="version", version=f"Finsical {version}"
    )
    return parser.parse_args(argv[1:])


def main(argv: list[str], share_dir: str, layout: logic.Layout) -> int:
    version = logic.read_version(share_dir)
    args = _parse_args(argv, version)
    logging.basicConfig(
        format="finsical: %(message)s",
        level=logging.INFO if args.smoke_test else logging.WARNING,
    )
    try:
        root = logic.WebRoot(
            logic.find_web_root(
                os.environ.get(logic.WEB_ROOT_ENV), share_dir, layout
            )
        )
        _bring_up_gtk()
    except (logic.WebRootError, StartupError) as e:
        print(f"finsical: {e}", file=sys.stderr)
        return 1

    from . import shell

    if not args.smoke_test:
        return shell.run(shell.default_config(root, version))
    return _smoke_test(root, version)


def _smoke_test(root: logic.WebRoot, version: str) -> int:
    from . import shell, smoke

    # Never the user's profile: storage, frames and settings all live
    # in a directory that is gone afterwards.
    profile = tempfile.mkdtemp(prefix="finsical-smoke-")
    test = smoke.SmokeTest()
    try:
        config = shell.ShellConfig(
            web_root=root,
            version=version,
            data_dir=os.path.join(profile, "data"),
            cache_dir=os.path.join(profile, "cache"),
            config_dir=os.path.join(profile, "config"),
            non_unique=True,
            console_to_stdout=True,
        )
        status = shell.run(config, test)
    finally:
        try:
            shutil.rmtree(profile)
        except OSError as e:
            logic.log.warning("could not remove %s: %s", profile, e)

    if test.passed and status == 0:
        print("smoke test passed", flush=True)
        return 0
    reason = (
        test.failure or f"the app exited with status {status} before finishing"
    )
    print(f"smoke test failed: {reason}", file=sys.stderr, flush=True)
    return 1
