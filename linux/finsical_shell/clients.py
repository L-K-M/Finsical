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

from . import logic
from .logic import Rect
from .screen import (
    is_x11,
    make_transparent,
    monitor_rects,
    window_frame,
    work_area,
)
from .tank import TankWindow
from .web import PageView, WebHost

log = logic.log

# (client, json_text, parsed) for a client's "finsical" bus post.
BusHandler = Callable[["ClientWindow", str, Any], None]
# (client, parsed) for a client's "osmium" window op, after it is applied.
OpObserver = Callable[["ClientWindow", Any], None]


class ClientWindow:
    """One client window, created on first show and reused after close."""

    def __init__(self, spec: logic.ClientSpec) -> None:
        self.spec = spec
        self.state = logic.ClientWindowState(spec)
        self.window: Optional[Gtk.ApplicationWindow] = None
        self.page: Optional[PageView] = None

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
        accels: Gtk.AccelGroup,
        tank: TankWindow,
        on_bus: BusHandler,
        on_op: OpObserver,
        on_frame_changed: Callable[[], None],
    ) -> None:
        self._app = app
        self._web = web
        self._frames = frames
        self._accels = accels
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
            if c.window is not None:
                c.window.set_keep_above(keep_above)

    def show(self, name: str) -> None:
        client = self.windows[name]
        if client.window is None:
            self._create(client)
        window = client.window
        assert window is not None
        reopened = client.state.reopen(window_frame(window))
        if reopened is not None:
            self._apply_hints(client)
            window.resize(reopened.w, reopened.h)
        window.set_keep_above(self._keep_above)
        window.present_with_time(Gtk.get_current_event_time())

    def hide(self, client: ClientWindow) -> None:
        if client.window is not None:
            client.window.hide()

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
        window.add(page.view)
        window.add_accel_group(self._accels)
        client.window, client.page = window, page
        self._apply_hints(client)
        self._place(client)
        window.connect("delete-event", lambda w, _e: w.hide_on_delete())
        window.connect("configure-event", lambda *_: self._save_frame(client))
        page.view.show()
        page.load(spec.url)

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
        if not is_x11(window.get_display()):
            return

        if saved is not None and saved.x is not None and saved.y is not None:
            frame = Rect(saved.x, saved.y, size.w, size.h)
            if logic.intersects_any(
                frame, monitor_rects(window.get_display())
            ):
                window.move(frame.x, frame.y)
                return
        tank_area = work_area(self._tank.window)
        if tank_area is None:
            return
        x, y = logic.beside_tank(
            window_frame(self._tank.window), size, tank_area
        )
        window.move(x, y)

    def _apply_hints(self, client: ClientWindow) -> None:
        assert client.window is not None
        hints = client.state.hints()
        geometry = Gdk.Geometry()
        geometry.min_width, geometry.min_height = hints.min_w, hints.min_h
        flags = Gdk.WindowHints.MIN_SIZE
        if hints.max_w is not None and hints.max_h is not None:
            geometry.max_width, geometry.max_height = hints.max_w, hints.max_h
            flags |= Gdk.WindowHints.MAX_SIZE
        client.window.set_geometry_hints(None, geometry, flags)

    def _save_frame(self, client: ClientWindow) -> bool:
        assert client.window is not None
        frame = client.state.frame_to_save(window_frame(client.window))
        position = (
            (frame.x, frame.y) if is_x11(client.window.get_display()) else None
        )
        self._frames.put(client.spec.frame_key, frame.w, frame.h, position)
        self._on_frame_changed()
        return False

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
        # The hints change first: GTK clamps the resize to them.
        self._apply_hints(client)
        window.resize(new.w, new.h)

    def _zoom(self, client: ClientWindow) -> None:
        window = client.window
        assert window is not None
        new = client.state.zoom(window_frame(window), work_area(window))
        if new is None:
            return
        window.resize(new.w, new.h)
        if is_x11(window.get_display()):
            window.move(new.x, new.y)

    def _grow(self, client: ClientWindow) -> None:
        window, page = client.window, client.page
        assert window is not None and page is not None
        if not client.state.resizable:
            return
        # Top-left pinned; the minimum size comes from the hints.
        page.begin_window_drag(
            lambda p: window.begin_resize_drag(
                Gdk.WindowEdge.SOUTH_EAST, p.button, p.x_root, p.y_root, p.time
            )
        )

    def _drag(self, client: ClientWindow) -> None:
        window, page = client.window, client.page
        assert window is not None and page is not None
        page.begin_window_drag(
            lambda p: window.begin_move_drag(
                p.button, p.x_root, p.y_root, p.time
            )
        )
