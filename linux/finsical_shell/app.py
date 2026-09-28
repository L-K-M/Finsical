"""Entry point: options, the web root, and bringing up GTK in the one
order that gives the app its id and backend.

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

# WebKitGTK 2.40 is the first with the 6.0 (GTK 4) API; GTK 4.12 added
# Widget.compute_point and CssProvider.load_from_string. The Depends
# say the same.
MIN_WEBKIT = (2, 40)
MIN_GTK = (4, 12)
_PACKAGES = "python3-gi python3-gi-cairo gir1.2-gtk-4.0 gir1.2-webkit-6.0"


class StartupError(Exception):
    """The app cannot start; the message says what to do."""


def _bring_up_gtk() -> None:
    """Load GTK and WebKit. The order matters: the program name and the
    backend choice before GTK opens the display."""
    try:
        import gi
    except ImportError as e:
        raise StartupError(
            f"PyGObject is missing ({e}); install {_PACKAGES}"
        ) from e
    try:
        gi.require_version("Gdk", "4.0")
        gi.require_version("GdkX11", "4.0")
        gi.require_version("Gtk", "4.0")
        gi.require_version("Graphene", "1.0")
        gi.require_version("GdkPixbuf", "2.0")
        gi.require_version("WebKit", "6.0")
        gi.require_version("Soup", "3.0")
        # Input regions are cairo regions (python3-gi-cairo).
        gi.require_foreign("cairo")
    except (ValueError, ImportError) as e:
        raise StartupError(f"{e}; install {_PACKAGES}") from e

    from gi.repository import GLib

    # Before GTK loads: the X11 WM_CLASS and the Wayland app id come
    # from the program name, and must match the desktop file.
    GLib.set_prgname(logic.APP_ID)
    if "GDK_BACKEND" not in os.environ:
        # Prefer X11 (XWayland on a Wayland desktop): only there can the
        # app keep the tank above, on all desktops and where it was left
        # (see x11.py). GDK_BACKEND=wayland opts out, and a sandbox
        # without X11 access (the Flatpak's fallback-x11 on a Wayland
        # desktop) gets Wayland anyway.
        from gi.repository import Gdk

        Gdk.set_allowed_backends("x11,wayland")

    from gi.repository import Gtk, WebKit

    if not Gtk.init_check():
        raise StartupError(
            "cannot open a display: run inside a desktop session "
            "(DISPLAY or WAYLAND_DISPLAY), or check GDK_BACKEND"
        )
    gtk = (Gtk.get_major_version(), Gtk.get_minor_version())
    if gtk < MIN_GTK:
        raise StartupError(
            "GTK %d.%d is too old; %d.%d or later is required"
            % (gtk + MIN_GTK)
        )
    webkit = (WebKit.get_major_version(), WebKit.get_minor_version())
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
