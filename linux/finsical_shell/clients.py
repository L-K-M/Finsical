"""The client windows (Preferences, Tank Overview, Import Add-ons, Tank
Stats): a port of osmium-ui's native window host (OsmiumWindows.swift).

Each is an undecorated, transparent window filled by a page that draws
the whole Mac OS 8 window, shadow included. The page's boxes post
window ops on its "osmium" handler:

  winClose           hide the window (kept, with its page, for reuse)
  winShade {on}      fold to the title bar and back
  winZoom            toggle between the user and standard frames
  winGrow            resize from the bottom-right corner
  dragWindow         move the window with the mouse

Import only after app.py has chosen the GDK backend.
"""

from __future__ import annotations

from typing import Any, Callable, Optional

from gi.repository import Gdk, Gtk

from . import logic, x11
from .logic import Rect
from .screen import (
    is_x11,
    make_transparent,
    monitor_rects,
    window_frame,
    work_area,
)
from .tank import TankWindow
from .web import PageView, Press, WebHost

log = logic.log

# (client, json_text, parsed) for a client's "finsical" bus post.
BusHandler = Callable[["ClientWindow", str, Any], None]
# (client, parsed) for a client's "osmium" window op, after it is applied.
OpObserver = Callable[["ClientWindow", Any], None]
# Adds the app's keyboard shortcuts to a new window.
ShortcutInstaller = Callable[[Gtk.Window], None]


class ClientWindow:
    """One client window, created on first show and reused after close."""

    def __init__(self, spec: logic.ClientSpec) -> None:
        self.spec = spec
        self.state = logic.ClientWindowState(spec)
        self.window: Optional[Gtk.ApplicationWindow] = None
        self.page: Optional[PageView] = None
        # Where to put the window when it next maps (X11 only).
        self.pending_position: Optional[tuple[int, int]] = None

    @property
    def visible(self) -> bool:
        return self.window is not None and self.window.get_visible()


class ClientHost:
    """Opens the client windows and applies their pages' window ops."""

    def __init__(
        self,
        app: Gtk.Application,
        web: WebHost,
        frames: logic.FrameStore,
        install_shortcuts: ShortcutInstaller,
        tank: TankWindow,
        on_bus: BusHandler,
        on_op: OpObserver,
        on_frame_changed: Callable[[], None],
    ) -> None:
        self._app = app
        self._web = web
        self._frames = frames
        self._install_shortcuts = install_shortcuts
        self._tank = tank
        self._on_bus = on_bus
        self._on_op = on_op
        self._on_frame_changed = on_frame_changed
        self._keep_above = True
        self.windows = {
            spec.name: ClientWindow(spec) for spec in logic.CLIENT_SPECS
        }

    def visible_clients(self) -> list[ClientWindow]:
        return [c for c in self.windows.values() if c.visible]

    def client_for(self, window: Any) -> Optional[ClientWindow]:
        return next(
            (
                c
                for c in self.windows.values()
                if c.window is not None and c.window is window
            ),
            None,
        )

    def set_keep_above(self, keep_above: bool) -> None:
        """Clients take the tank's level: one left floating over a normal
        tank would cover every other app, and a normal one could never
        come up over the floating tank."""
        self._keep_above = keep_above
        for c in self.windows.values():
            if c.window is not None and c.window.get_mapped():
                self._apply_state(c.window)

    def show(self, name: str) -> None:
        client = self.windows[name]
        reopening = client.window is not None
        if client.window is None:
            self._create(client)
        window = client.window
        assert window is not None
        frame = window_frame(window)
        reopened = client.state.reopen(frame)
        if reopened is not None:
            self._apply_hints(client)
            self._resize(client, reopened.w, reopened.h)
        # A hidden window maps anew, and an X11 window manager would
        # place it anew: put it back where hide() saved it.
        saved = self._frames.get(client.spec.frame_key)
        if (
            reopening
            and not window.get_visible()
            and self._x11(window)
            and saved is not None
            and saved.x is not None
            and saved.y is not None
        ):
            client.pending_position = (saved.x, saved.y)
        window.present()

    def hide(self, client: ClientWindow) -> None:
        if client.window is not None and client.window.get_visible():
            self._save_frame(client)
            client.window.set_visible(False)

    def save_frames(self) -> None:
        """GTK 4 reports no moves: the quit sequence saves positions."""
        for client in self.visible_clients():
            self._save_frame(client)

    def _x11(self, window: Gtk.Window) -> bool:
        return is_x11(window.get_display())

    def _apply_state(self, window: Gtk.Window) -> None:
        if self._x11(window):
            x11.set_state(window.get_surface(), self._keep_above, False)

    def _create(self, client: ClientWindow) -> None:
        spec = client.spec
        page = self._web.create_view(
            {
                "finsical": lambda text, msg: self._on_bus(client, text, msg),
                "osmium": lambda _text, msg: self._handle_op(client, msg),
            }
        )
        window = Gtk.ApplicationWindow(application=self._app, title=spec.title)
        window.set_decorated(False)
        make_transparent(window)
        # The view is the window: the page sizes its drawn window to the
        # viewport, so no decoration or margin may take any of it.
        window.set_child(page.view)
        self._install_shortcuts(window)
        client.window, client.page = window, page
        self._apply_hints(client)
        self._place(client)
        window.connect("close-request", lambda *_: self.hide(client) or True)
        window.connect("realize", lambda w: self._on_realize(client, w))
        window.connect("map", lambda w: self._on_map(client, w))
        page.load(spec.url)

    def _on_realize(self, client: ClientWindow, window: Gtk.Window) -> None:
        window.get_surface().connect(
            "layout", lambda *_: self._save_frame(client)
        )

    def _on_map(self, client: ClientWindow, window: Gtk.Window) -> None:
        if not self._x11(window):
            return
        if client.pending_position is not None:
            x11.move(window.get_surface(), *client.pending_position)
            client.pending_position = None
        self._apply_state(window)

    def _place(self, client: ClientWindow) -> None:
        """The saved frame (a fixed window only takes its position), else
        beside the tank: on first open, or when the saved position is
        on a monitor that is gone. Positions are X11 only."""
        spec, window = client.spec, client.window
        assert window is not None
        saved = self._frames.get(spec.frame_key)
        if saved is None or not client.state.resizable:
            size = spec.size
        else:
            size = logic.Size(saved.w, saved.h)
        window.set_default_size(size.w, size.h)
        if not self._x11(window):
            return

        if saved is not None and saved.x is not None and saved.y is not None:
            frame = Rect(saved.x, saved.y, size.w, size.h)
            if logic.intersects_any(
                frame, monitor_rects(window.get_display())
            ):
                client.pending_position = (frame.x, frame.y)
                return
        tank_area = work_area(self._tank.window)
        if tank_area is None:
            return
        client.pending_position = logic.beside_tank(
            window_frame(self._tank.window), size, tank_area
        )

    def _apply_hints(self, client: ClientWindow) -> None:
        """GTK 4 has no size hints: the minimum is the content's size
        request. There is no maximum either, so a fixed window is only
        held to its size by having no grow box. It stays resizable all
        the same: GTK never shrinks a non-resizable window to a smaller
        request, so it could not fold."""
        assert client.window is not None and client.page is not None
        hints = client.state.hints()
        client.page.view.set_size_request(hints.min_w, hints.min_h)

    def _resize(self, client: ClientWindow, w: int, h: int) -> None:
        assert client.window is not None
        client.window.set_default_size(w, h)

    def _save_frame(self, client: ClientWindow) -> None:
        window = client.window
        assert window is not None
        if not window.get_realized():
            return
        frame = client.state.frame_to_save(window_frame(window))
        position = (frame.x, frame.y) if self._x11(window) else None
        self._frames.put(client.spec.frame_key, frame.w, frame.h, position)
        self._on_frame_changed()

    def _handle_op(self, client: ClientWindow, msg: Any) -> None:
        if isinstance(msg, dict):
            op = msg.get("op")
            if op == "winClose":
                self.hide(client)
            elif op == "winShade":
                self._shade(client, msg.get("on") is True)
            elif op == "winZoom":
                self._zoom(client)
            elif op == "winGrow":
                self._grow(client)
            elif op == "dragWindow":
                self._drag(client)
            # Anything else is not a window op; ignore it.
        self._on_op(client, msg)

    def _shade(self, client: ClientWindow, on: bool) -> None:
        window = client.window
        assert window is not None
        frame = window_frame(window)
        new = client.state.shade(frame) if on else client.state.unshade(frame)
        if new is None:
            return
        # The minimum changes first, or it would hold the fold open.
        self._apply_hints(client)
        self._resize(client, new.w, new.h)

    def _zoom(self, client: ClientWindow) -> None:
        window = client.window
        assert window is not None
        new = client.state.zoom(window_frame(window), work_area(window))
        if new is None:
            return
        self._resize(client, new.w, new.h)
        if self._x11(window):
            x11.move(window.get_surface(), new.x, new.y)

    def _grow(self, client: ClientWindow) -> None:
        window, page = client.window, client.page
        assert window is not None and page is not None
        if not client.state.resizable:
            return

        # Top-left pinned; the minimum size is the page's size request.
        def begin(p: Press) -> None:
            window.get_surface().begin_resize(
                Gdk.SurfaceEdge.SOUTH_EAST,
                p.device,
                p.button,
                p.x,
                p.y,
                p.time,
            )

        page.begin_window_drag(begin)

    def _drag(self, client: ClientWindow) -> None:
        window, page = client.window, client.page
        assert window is not None and page is not None
        page.begin_window_drag(
            lambda p: window.get_surface().begin_move(
                p.device, p.button, p.x, p.y, p.time
            )
        )
