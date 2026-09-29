"""The application: single instance, the app menu and its shortcuts,
the bus relay between the tank and the client windows, and quitting.

Import only after app.py has chosen the GDK backend.
"""

from __future__ import annotations

import os
import signal
from dataclasses import dataclass
from typing import Any, Callable, Optional

from gi.repository import Gio, GLib, Gtk

from . import dbusmenu, logic, wayland, x11
from .clients import ClientHost, ClientWindow
from .logic import WindowPref
from .screen import is_x11
from .tank import TankWindow
from .web import PageView, WebHost, open_in_browser

log = logic.log

# Saved frames are written this long after the last move or resize.
SAVE_DELAY_MS = 1000
# Quit never waits longer than this for the tank's save.
QUIT_TIMEOUT_MS = 2000

# The macOS About panel's credits (macos/Finsical.swift showAbout).
CREDITS = (
    "Inspired by AquaZone by 9003 Inc., published by Mindscape.\n"
    "Fish, plants and scenery add-ons from the Internet Archive.\n"
    "Mac OS 8 windows by the Osmium UI library."
)
LICENSE_NOTE = (
    "Finsical is free and unencumbered software released into "
    "the public domain (the Unlicense).\n\n"
    "Its MACE sound decoder is ported from FFmpeg and is "
    "licensed under the GNU Lesser General Public License, "
    "version 2.1 or later. See /usr/share/doc/finsical/copyright."
)


@dataclass(frozen=True)
class ShellConfig:
    web_root: logic.WebRoot
    version: str
    data_dir: str
    cache_dir: str
    config_dir: str
    # One process per run, ignoring a running instance (smoke test).
    non_unique: bool
    console_to_stdout: bool


class Observer:
    """Hooks for the smoke test; the app itself needs none."""

    def started(self, app: FinsicalApp) -> None:
        pass

    def tank_posted(self, msg: Any) -> None:
        pass

    def client_posted(
        self, client: ClientWindow, handler: str, msg: Any
    ) -> None:
        pass

    def picture_offered(self, name: str, png: bytes) -> bool:
        """Take a Picture delivered a PNG; True means handled (no save
        dialog)."""
        return False

    def quit_finished(self, via_timeout: bool) -> None:
        pass


class FinsicalApp(Gtk.Application):
    """One tank per session (a second launch brings it to the front);
    its client windows; the menu, shortcuts and relay between them."""

    def __init__(
        self, config: ShellConfig, observer: Optional[Observer] = None
    ) -> None:
        flags = (
            Gio.ApplicationFlags.NON_UNIQUE
            if config.non_unique
            else Gio.ApplicationFlags.FLAGS_NONE
        )
        super().__init__(application_id=logic.APP_ID, flags=flags)
        self._config = config
        self._observer = observer or Observer()
        self._status = logic.TankStatus()
        self._frames = logic.FrameStore(
            logic.JsonStore(
                os.path.join(config.config_dir, logic.WINDOWS_FILE)
            )
        )
        self._settings = logic.Settings(
            logic.JsonStore(
                os.path.join(config.config_dir, logic.SETTINGS_FILE)
            )
        )
        self._save_source = 0
        self._quitting = False
        self._about: Optional[Gtk.AboutDialog] = None
        # Take a Picture's save dialog while it is up: repeated clicks
        # must not stack dialogs.
        self._picture_dialog: Optional[Gtk.FileDialog] = None
        self.tank: Optional[TankWindow] = None
        self.clients: Optional[ClientHost] = None
        # The global menu (KDE's Global Menu widget), where there is a
        # session bus.
        self._menu: Optional[dbusmenu.MenuExporter] = None
        self._menu_entries = {
            e.action: e for e in logic.APP_MENU if e is not None
        }

    # -- lifecycle ----------------------------------------------------------

    def do_startup(self) -> None:
        Gtk.Application.do_startup(self)
        # Taskbars and window managers that read a window's own icon
        # (_NET_WM_ICON: libwnck, xfwm4) find it in the hicolor theme.
        Gtk.Window.set_default_icon_name(logic.APP_ID)
        self._web = WebHost(
            self._config.web_root,
            self._config.data_dir,
            self._config.cache_dir,
            self._config.console_to_stdout,
        )
        self._web.set_menu_factory(self._build_menu)
        self._add_actions()
        self.connect("window-added", self._on_window_added)
        bus = dbusmenu.session_bus()
        if bus is not None:
            self._menu = dbusmenu.MenuExporter(
                bus, self._menu_item, self._activate_menu_action
            )
        for signum in (signal.SIGINT, signal.SIGTERM):
            GLib.unix_signal_add(
                GLib.PRIORITY_DEFAULT, signum, self._on_signal
            )

    def do_activate(self) -> None:
        # A second launch lands here in the running instance.
        if self.tank is not None:
            self.tank.window.present()
            return

        page = self._web.create_view({"finsical": self._on_tank_bus})
        self.tank = TankWindow(
            self,
            page,
            self._config.web_root,
            self._frames,
            self._schedule_save,
            self.quit_gracefully,
        )
        self._install_shortcuts(self.tank.window)
        self.clients = ClientHost(
            self,
            self._web,
            self._frames,
            self._install_shortcuts,
            self.tank,
            self._on_client_bus,
            lambda c, m: self._observer.client_posted(c, "osmium", m),
            self._schedule_save,
        )
        self._apply_window_prefs()
        page.load(logic.APP_URL + logic.TANK_PAGE)
        self.tank.show()
        self._observer.started(self)

    def quit_gracefully(self) -> None:
        """Hide every window, which makes the tank page save (its hidden
        visibilitychange handler), wait for one script round trip so
        the save has run, then quit. Never hangs: after
        QUIT_TIMEOUT_MS it quits anyway."""
        if self._quitting:
            return
        self._quitting = True
        # GTK 4 reports no moves: positions are saved on the way out.
        if self.tank is not None:
            self.tank.save_frame()
        if self.clients is not None:
            self.clients.save_frames()
        for window in self.get_windows():
            window.set_visible(False)

        done = False

        def finish(via_timeout: bool) -> bool:
            nonlocal done
            if not done:
                done = True
                if via_timeout:
                    log.warning(
                        "the tank did not answer within %d ms;"
                        " quitting anyway",
                        QUIT_TIMEOUT_MS,
                    )
                self._flush_saves()
                self._observer.quit_finished(via_timeout)
                self.quit()
            return GLib.SOURCE_REMOVE

        GLib.timeout_add(QUIT_TIMEOUT_MS, finish, True)
        if self.tank is None:
            finish(False)
            return
        self.tank.page.evaluate("0", lambda _v, _e: finish(False))

    def show_client(self, name: str) -> None:
        if self.clients is not None:
            self.clients.show(name)

    def _on_signal(self) -> bool:
        self.quit_gracefully()
        return GLib.SOURCE_CONTINUE

    # -- saved state --------------------------------------------------------

    def _schedule_save(self) -> None:
        if self._save_source == 0:
            self._save_source = GLib.timeout_add(
                SAVE_DELAY_MS, self._flush_saves
            )

    def _flush_saves(self) -> bool:
        if self._save_source:
            GLib.source_remove(self._save_source)
            self._save_source = 0
        self._frames.flush()
        self._settings.flush()
        return GLib.SOURCE_REMOVE

    # -- bus relay (macos/Finsical.swift userContentController) -----------

    def _on_tank_bus(self, text: str, msg: Any) -> None:
        assert self.tank is not None and self.clients is not None
        if isinstance(msg, dict):
            op = msg.get("op")
            # The tank's case drag is for the shell alone.
            if op == "dragWindow":
                self.tank.drag_from_page()
                return
            # Take a Picture hands the shell the PNG to save, as on macOS.
            if op == "savePicture":
                self._save_picture(msg)
                return
            # State carries the menu's toggles and the machine case, and
            # still goes on to the clients.
            if op == "state":
                self._apply_state(msg)
        self._observer.tank_posted(msg)
        # Hidden clients keep their pages but need no pushes until shown.
        for client in self.clients.visible_clients():
            assert client.page is not None
            self._deliver(client.page, client.spec.title, text)

    def _on_client_bus(
        self, client: ClientWindow, text: str, msg: Any
    ) -> None:
        assert self.tank is not None
        self._observer.client_posted(client, "finsical", msg)
        self._deliver(self.tank.page, "tank", text)

    def _deliver(self, page: PageView, name: str, text: str) -> None:
        """Hand a message to a page's bus. A page that has not registered
        its bus yet drops it; clients recover through their hello
        retries, so a drop is logged, not retried."""

        def done(value: Any, error: Optional[GLib.Error]) -> None:
            if error is not None:
                log.warning("bus relay to %s failed: %s", name, error.message)
            elif (
                value is not None
                and value.is_string()
                and value.to_string() == logic.BUS_DROPPED
            ):
                log.info("bus relay to %s dropped: page not ready", name)

        page.evaluate(logic.bus_delivery_script(text), done)

    def _apply_state(self, msg: dict) -> None:
        assert self.tank is not None
        self._status = logic.update_status(self._status, msg)
        self._sync_status_actions()
        machine = logic.parse_machine(msg)
        if machine is not None:
            self.tank.apply_machine(machine)

    # -- actions and the app menu -------------------------------------------

    def _add_actions(self) -> None:
        stateless: dict[str, Callable[[], None]] = {
            "overview": lambda: self.show_client(logic.OVERVIEW.name),
            "stats": lambda: self.show_client(logic.STATS.name),
            "import": lambda: self.show_client(logic.ADDONS.name),
            "prefs": lambda: self.show_client(logic.PREFS.name),
            "feed": lambda: self._call_tank("feedFish"),
            "water": lambda: self._call_tank("changeWater"),
            "pause": self._toggle_pause,
            "picture": lambda: self._call_tank("takePicture"),
            "larger": lambda: self._step_tank(logic.SizeStep.LARGER),
            "smaller": lambda: self._step_tank(logic.SizeStep.SMALLER),
            "donate": lambda: open_in_browser(logic.DONATE_URL),
            "help": lambda: open_in_browser(logic.HELP_URL),
            "about": self._show_about,
            "quit": self.quit_gracefully,
        }
        # Check items; their state mirrors the tank (from its state
        # pushes) or the window prefs. GTK menus only take stateless
        # or boolean actions.
        toggles: dict[str, tuple[bool, Callable[[], None]]] = {
            "crt": (self._status.crt_on, lambda: self._call_tank("toggleCrt")),
            "lamp": (
                self._status.lamp_on,
                lambda: self._call_tank("toggleLights"),
            ),
            "mute": (
                self._status.muted,
                lambda: self._call_tank("toggleMute"),
            ),
            "float-above": (
                self._settings.get(WindowPref.FLOAT_ABOVE),
                lambda: self._toggle_pref(WindowPref.FLOAT_ABOVE),
            ),
            "all-desktops": (
                self._settings.get(WindowPref.ALL_DESKTOPS),
                lambda: self._toggle_pref(WindowPref.ALL_DESKTOPS),
            ),
        }
        for name, run in stateless.items():
            action = Gio.SimpleAction.new(name, None)
            action.connect("activate", lambda _a, _p, run=run: run())
            self.add_action(action)
        for name, (state, run) in toggles.items():
            action = Gio.SimpleAction.new_stateful(
                name, None, GLib.Variant.new_boolean(state)
            )
            action.connect("activate", lambda _a, _p, run=run: run())
            self.add_action(action)
        self._action("crt").set_enabled(self._status.crt_available)

    def _action(self, name: str) -> Gio.SimpleAction:
        action = self.lookup_action(name)
        assert isinstance(action, Gio.SimpleAction), name
        return action

    def _install_shortcuts(self, window: Gtk.Window) -> None:
        """The menu's shortcuts, and Ctrl+W to close a client window. They
        run in the capture phase, before the page, so a page that
        swallows a key cannot take a menu command."""
        controller = Gtk.ShortcutController()
        controller.set_propagation_phase(Gtk.PropagationPhase.CAPTURE)
        for entry in logic.APP_MENU:
            if entry is None:
                continue
            for accel in entry.accels:
                controller.add_shortcut(
                    Gtk.Shortcut.new(
                        Gtk.ShortcutTrigger.parse_string(accel),
                        Gtk.CallbackAction.new(
                            self._shortcut_handler(entry.action)
                        ),
                    )
                )
        controller.add_shortcut(
            Gtk.Shortcut.new(
                Gtk.ShortcutTrigger.parse_string(logic.CLOSE_WINDOW_ACCEL),
                Gtk.CallbackAction.new(self._on_close_shortcut),
            )
        )
        window.add_controller(controller)

    def _shortcut_handler(self, name: str) -> Callable[..., bool]:
        def activate(*_args: Any) -> bool:
            action = self._action(name)
            if action.get_enabled():
                action.activate(None)
            return True

        return activate

    def _on_close_shortcut(self, widget: Gtk.Widget, *_args: Any) -> bool:
        if self.clients is None:
            return True
        client = self.clients.client_for(widget.get_root())
        if client is not None:
            self.clients.hide(client)
        return True  # the tank has no close: quitting takes Ctrl+Q

    def _build_menu(self) -> Gio.MenuModel:
        """The app menu. Boolean actions show as check items; disabled
        ones grey out. The shortcuts are labels only: the windows'
        shortcut controllers run them."""
        menu = Gio.Menu()
        section = Gio.Menu()
        for entry in logic.APP_MENU:
            if entry is None:
                menu.append_section(None, section)
                section = Gio.Menu()
                continue
            label = (
                logic.pause_label(self._status.paused)
                if entry.action == "pause"
                else entry.label
            )
            item = Gio.MenuItem.new(label, f"app.{entry.action}")
            if entry.accels:
                item.set_attribute_value(
                    "accel", GLib.Variant.new_string(entry.accels[0])
                )
            section.append_item(item)
        menu.append_section(None, section)
        return menu

    def _sync_status_actions(self) -> None:
        s = self._status
        for name, on in (
            ("crt", s.crt_on),
            ("lamp", s.lamp_on),
            ("mute", s.muted),
        ):
            self._action(name).set_state(GLib.Variant.new_boolean(on))
        self._action("crt").set_enabled(s.crt_available)
        self._menu_changed()

    def _call_tank(
        self, function: str, then: Optional[Callable[[Any], None]] = None
    ) -> None:
        if self.tank is None:
            log.warning("%s skipped: no tank", function)
            return

        def done(value: Any, error: Optional[GLib.Error]) -> None:
            if error is not None:
                log.warning("%s failed: %s", function, error.message)
            elif then is not None:
                then(value)

        self.tank.page.evaluate(logic.tank_call_script(function), done)

    def _toggle_pause(self) -> None:
        # togglePause returns the new flag: retitle at once rather than
        # wait for the state push.
        def paused(value: Any) -> None:
            if value is None or not value.is_boolean():
                log.warning("togglePause returned a non-boolean result")
                return
            self._status = logic.update_status(
                self._status, {"paused": value.to_boolean()}
            )
            self._menu_changed()

        self._call_tank("togglePause", paused)

    def _step_tank(self, step: logic.SizeStep) -> None:
        if self.tank is not None:
            self.tank.step_size(step)

    def _toggle_pref(self, pref: WindowPref) -> None:
        self._settings.set(pref, not self._settings.get(pref))
        self._apply_window_prefs()
        self._schedule_save()

    def _apply_window_prefs(self) -> None:
        """Float Above Other Windows and Show on All Desktops. Wayland
        leaves both to the compositor, so they show disabled there."""
        assert self.tank is not None and self.clients is not None
        float_above = self._settings.get(WindowPref.FLOAT_ABOVE)
        all_desktops = self._settings.get(WindowPref.ALL_DESKTOPS)
        self.tank.apply_window_prefs(float_above, all_desktops)
        self.clients.set_keep_above(float_above)
        # An About left floating over a normal tank would cover every
        # other app (macOS applyWindowPrefs).
        if self._about is not None and self._about.get_mapped():
            self._apply_about_state(self._about)
        on_x11 = is_x11(self.tank.window.get_display())
        for name, on in (
            ("float-above", float_above),
            ("all-desktops", all_desktops),
        ):
            action = self._action(name)
            action.set_state(GLib.Variant.new_boolean(on))
            action.set_enabled(on_x11)
        self._menu_changed()

    # -- the global menu ----------------------------------------------------

    @property
    def global_menu(self) -> Optional[dbusmenu.MenuExporter]:
        """None where there is no session bus."""
        return self._menu

    def _menu_item(self, name: str) -> Optional[dbusmenu.Item]:
        entry = self._menu_entries.get(name)
        if entry is None:
            return None
        action = self._action(name)
        state = action.get_state()
        return dbusmenu.Item(
            action=name,
            label=(
                logic.pause_label(self._status.paused)
                if name == "pause"
                else entry.label
            ),
            enabled=action.get_enabled(),
            checked=None if state is None else state.get_boolean(),
            accel=entry.accels[0] if entry.accels else None,
        )

    def _activate_menu_action(self, name: str) -> None:
        action = self._action(name)
        if action.get_enabled():
            action.activate(None)

    def _menu_changed(self) -> None:
        if self._menu is not None:
            self._menu.refresh()

    def _on_window_added(
        self, _app: Gtk.Application, window: Gtk.Window
    ) -> None:
        window.connect("realize", self._announce_menu)
        if window.get_realized():
            self._announce_menu(window)

    def _announce_menu(self, window: Gtk.Window) -> None:
        """Point the desktop's global menu for this window at ours."""
        surface = window.get_surface()
        if self._menu is None or surface is None:
            return
        service, path = self._menu.bus_name, dbusmenu.OBJECT_PATH
        display = window.get_display()
        if is_x11(display):
            x11.set_appmenu(surface, service, path)
        elif display.__gtype__.name == "GdkWaylandDisplay":
            wayland.announce_appmenu(surface, service, path)

    def _save_picture(self, msg: dict) -> None:
        """Offer the tank's picture to a save dialog. The page names the
        file; directory parts are dropped all the same."""
        png = logic.decode_picture(msg.get("png"))
        if png is None:
            log.warning("savePicture payload was not PNG data")
            return
        name = logic.picture_file_name(msg.get("name"))
        if self._observer.picture_offered(name, png):
            return
        if self._picture_dialog is not None:
            log.info("savePicture dropped: a save dialog is open")
            return
        assert self.tank is not None
        png_filter = Gtk.FileFilter()
        png_filter.set_name("PNG image")
        png_filter.add_mime_type("image/png")
        filters = Gio.ListStore.new(Gtk.FileFilter)
        filters.append(png_filter)
        # Asks before overwriting; in a sandbox it is the portal's dialog.
        dialog = Gtk.FileDialog(
            title="Take a Picture",
            initial_name=name,
            filters=filters,
            default_filter=png_filter,
        )

        def saved(d: Gtk.FileDialog, result: Gio.AsyncResult) -> None:
            self._picture_dialog = None
            try:
                file = d.save_finish(result)
            except GLib.Error as e:
                dismissed = e.matches(
                    Gtk.DialogError.quark(), Gtk.DialogError.DISMISSED
                )
                if not dismissed:
                    log.warning(
                        "Take a Picture: the save dialog failed: %s", e.message
                    )
                return
            path = file.get_path() if file is not None else None
            if path is None:
                log.warning("Take a Picture: the chosen file has no path")
                return
            try:
                logic.write_file_atomic(path, png, 0o666)
            except OSError as e:
                log.warning("Take a Picture: could not save %s: %s", path, e)

        self._picture_dialog = dialog
        dialog.save(self.tank.window, None, saved)

    def _show_about(self) -> None:
        if self._about is not None:
            self._about.present()
            return
        about = Gtk.AboutDialog(
            program_name="Finsical",
            version=self._config.version,
            logo_icon_name=logic.APP_ID,
            comments=CREDITS,
            website=logic.HOMEPAGE_URL,
            license_type=Gtk.License.CUSTOM,
            license=LICENSE_NOTE,
            wrap_license=True,
        )
        if self.tank is not None:
            about.set_transient_for(self.tank.window)
        about.connect("map", self._apply_about_state)
        about.connect("destroy", lambda *_: setattr(self, "_about", None))
        self._about = about
        about.present()

    def _apply_about_state(self, about: Gtk.Window) -> None:
        """Over the floating tank, or the tank would cover it."""
        if is_x11(about.get_display()):
            x11.set_state(
                about.get_surface(),
                self._settings.get(WindowPref.FLOAT_ABOVE),
                False,
            )


def default_config(web_root: logic.WebRoot, version: str) -> ShellConfig:
    """Storage in the user's XDG directories."""
    return ShellConfig(
        web_root=web_root,
        version=version,
        data_dir=os.path.join(GLib.get_user_data_dir(), "finsical"),
        cache_dir=os.path.join(GLib.get_user_cache_dir(), "finsical"),
        config_dir=os.path.join(GLib.get_user_config_dir(), "finsical"),
        non_unique=False,
        console_to_stdout=False,
    )


def run(config: ShellConfig, observer: Optional[Observer] = None) -> int:
    app = FinsicalApp(config, observer)
    # Our own options were parsed already; GApplication gets none.
    return app.run(["finsical"])
