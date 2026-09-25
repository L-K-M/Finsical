"""Display and window helpers shared by the tank and the client windows.

Import only after app.py has chosen the GDK backend.
"""

from __future__ import annotations

from typing import Optional

from gi.repository import Gdk, Gtk

from . import logic
from .logic import Rect

log = logic.log


def is_x11(display: Gdk.Display) -> bool:
    """X11 (or XWayland) lets the app place windows, keep them above
    and on all desktops; Wayland keeps those to the compositor."""
    return display.__gtype__.name == "GdkX11Display"


def monitor_rects(display: Gdk.Display) -> list[Rect]:
    rects = []
    for i in range(display.get_n_monitors()):
        g = display.get_monitor(i).get_geometry()
        rects.append(Rect(g.x, g.y, g.width, g.height))
    return rects


def work_areas(display: Gdk.Display) -> list[Rect]:
    """Every monitor's work area (without panels and docks)."""
    rects = []
    for i in range(display.get_n_monitors()):
        a = display.get_monitor(i).get_workarea()
        rects.append(Rect(a.x, a.y, a.width, a.height))
    return rects


def work_area(window: Gtk.Window) -> Optional[Rect]:
    """The work area of the monitor showing `window` (or the primary
    one before it is realized)."""
    display = window.get_display()
    gdk_window = window.get_window()
    monitor = (
        display.get_monitor_at_window(gdk_window)
        if gdk_window
        else display.get_primary_monitor() or display.get_monitor(0)
    )
    if monitor is None:
        return None
    a = monitor.get_workarea()
    return Rect(a.x, a.y, a.width, a.height)


def make_transparent(window: Gtk.Window) -> None:
    """Let the page's transparent pixels show what is behind the window.
    Needs a compositor; without one they render black (see the tank's
    XShape fallback)."""
    visual = window.get_screen().get_rgba_visual()
    if visual is None:
        log.warning("no RGBA visual: transparent window areas will be black")
    else:
        window.set_visual(visual)
    window.set_app_paintable(True)


def window_frame(window: Gtk.Window) -> Rect:
    """The window's frame; the position is (0, 0) on Wayland."""
    x, y = window.get_position()
    w, h = window.get_size()
    return Rect(x, y, w, h)
