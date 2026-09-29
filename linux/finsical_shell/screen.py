"""Display and window helpers shared by the tank and the client windows.

Import only after app.py has chosen the GDK backend.
"""

from __future__ import annotations

from typing import Optional

from gi.repository import Gdk, Graphene, Gtk

from . import logic, x11
from .logic import Rect

log = logic.log

# Frameless windows whose page draws every visible pixel. On Wayland
# they are client-decorated (see make_frameless): no shadow, corner
# rounding or margin may come from the theme's window decoration.
_TRANSPARENT_CLASS = "finsical-transparent"
_TRANSPARENT_CSS = f"""
window.{_TRANSPARENT_CLASS} {{ background: none; }}
window.{_TRANSPARENT_CLASS},
window.{_TRANSPARENT_CLASS} > decoration {{
  box-shadow: none; border-radius: 0; margin: 0; outline: none;
}}
"""
# Displays that have the stylesheet (by name: GDK has one per server).
_styled_displays: set[str] = set()


def is_x11(display: Gdk.Display) -> bool:
    """X11 (or XWayland) lets the app place windows, keep them above
    and on all desktops; Wayland keeps those to the compositor."""
    return display.__gtype__.name == "GdkX11Display"


def _monitors(display: Gdk.Display) -> list[Gdk.Monitor]:
    model = display.get_monitors()
    return [model.get_item(i) for i in range(model.get_n_items())]


def _rect(r: Gdk.Rectangle) -> Rect:
    return Rect(r.x, r.y, r.width, r.height)


def _work_area(monitor: Gdk.Monitor) -> Rect:
    """The monitor without panels and docks. Only X11 publishes that
    (_NET_WORKAREA); elsewhere the whole monitor stands in."""
    if is_x11(monitor.get_display()):
        from gi.repository import GdkX11

        return _rect(GdkX11.X11Monitor.get_workarea(monitor))
    return _rect(monitor.get_geometry())


def monitor_rects(display: Gdk.Display) -> list[Rect]:
    return [_rect(m.get_geometry()) for m in _monitors(display)]


def work_areas(display: Gdk.Display) -> list[Rect]:
    return [_work_area(m) for m in _monitors(display)]


def work_area(window: Gtk.Window) -> Optional[Rect]:
    """The work area of the monitor showing `window` (or the first one
    before it is realized)."""
    display = window.get_display()
    surface = window.get_surface()
    monitor = display.get_monitor_at_surface(surface) if surface else None
    if monitor is None:
        monitors = _monitors(display)
        monitor = monitors[0] if monitors else None
    if monitor is None:
        return None
    return _work_area(monitor)


def make_frameless(window: Gtk.Window) -> None:
    """No frame, and the page's transparent pixels show what is behind
    the window. That needs a compositor; without one they render black
    (see the tank's X11 outline fallback).

    On Wayland, an undecorated GTK window asks KWin for a frame of its
    own (GTK 4.14 requests server-side decorations for it, and 4.22
    leaves KWin's server-side default), so KDE drew a title bar and
    border around the case. A client-decorated window with an empty
    title bar tells KWin the app draws its own, and draws nothing."""
    display = window.get_display()
    if is_x11(display):
        window.set_decorated(False)
    else:
        window.set_titlebar(Gtk.Box())
    if display.get_name() not in _styled_displays:
        provider = Gtk.CssProvider()
        provider.load_from_string(_TRANSPARENT_CSS)
        Gtk.StyleContext.add_provider_for_display(
            display, provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
        )
        _styled_displays.add(display.get_name())
    window.add_css_class(_TRANSPARENT_CLASS)


def window_frame(window: Gtk.Window) -> Rect:
    """The window's frame; the position is (0, 0) on Wayland and before
    the window is realized."""
    surface = window.get_surface()
    if surface is None or not window.get_realized():
        w, h = window.get_default_size()
        return Rect(0, 0, w, h)
    x, y = 0, 0
    if is_x11(window.get_display()):
        x, y = x11.position(surface) or (0, 0)
    return Rect(x, y, surface.get_width(), surface.get_height())


def surface_point(
    widget: Gtk.Widget, x: float, y: float
) -> tuple[float, float]:
    """A point in `widget`'s coordinates, in its surface's: what window
    drags and moves take."""
    native = widget.get_native()
    point = Graphene.Point()
    point.init(x, y)
    ok, out = widget.compute_point(native, point)
    if not ok:
        out = point
    dx, dy = native.get_surface_transform()
    return out.x + dx, out.y + dy
