"""The X11 window operations GTK 4 dropped: placing a window, reading
its position, keeping it above or on every desktop (EWMH), and cutting
its visible outline where there is no compositor (XShape).

Wayland leaves all of these to the compositor, so callers check
screen.is_x11 first. Requests go through GDK's own Xlib connection
inside GDK's error trap: a second connection would need its own error
handler, and Xlib's handler is process-wide, so it would replace GDK's.

Import only after app.py has chosen the GDK backend.
"""

from __future__ import annotations

import ctypes
from typing import Optional

from gi.repository import Gdk, GdkX11

from . import logic
from .logic import Rect

log = logic.log

# X.h and X11/extensions/shape.h.
_CLIENT_MESSAGE = 33
_SUBSTRUCTURE_NOTIFY_MASK = 1 << 19
_SUBSTRUCTURE_REDIRECT_MASK = 1 << 20
_SHAPE_BOUNDING = 0
_SHAPE_SET = 0
_UNSORTED = 0
# EWMH _NET_WM_STATE actions, and the source indication of a normal app.
_NET_WM_STATE_REMOVE = 0
_NET_WM_STATE_ADD = 1
_SOURCE_APPLICATION = 1
# _NET_WM_DESKTOP's "all desktops".
_ALL_DESKTOPS = 0xFFFFFFFF


class _ClientMessage(ctypes.Structure):
    _fields_ = [
        ("type", ctypes.c_int),
        ("serial", ctypes.c_ulong),
        ("send_event", ctypes.c_int),
        ("display", ctypes.c_void_p),
        ("window", ctypes.c_ulong),
        ("message_type", ctypes.c_ulong),
        ("format", ctypes.c_int),
        ("data", ctypes.c_long * 5),
    ]


class _Event(ctypes.Union):
    # XEvent is a union padded to 24 longs.
    _fields_ = [("xclient", _ClientMessage), ("pad", ctypes.c_long * 24)]


class _Rectangle(ctypes.Structure):
    _fields_ = [
        ("x", ctypes.c_short),
        ("y", ctypes.c_short),
        ("width", ctypes.c_ushort),
        ("height", ctypes.c_ushort),
    ]


class _Libraries:
    """libX11, libXext and GTK's accessor for its Display*, loaded on
    first use so a Wayland session never loads them."""

    def __init__(self) -> None:
        x = ctypes.CDLL("libX11.so.6")
        ext = ctypes.CDLL("libXext.so.6")
        gtk = ctypes.CDLL("libgtk-4.so.1")
        c_ulong, c_int = ctypes.c_ulong, ctypes.c_int
        c_void_p = ctypes.c_void_p

        gtk.gdk_x11_display_get_xdisplay.restype = c_void_p
        gtk.gdk_x11_display_get_xdisplay.argtypes = [c_void_p]
        x.XDefaultRootWindow.restype = c_ulong
        x.XDefaultRootWindow.argtypes = [c_void_p]
        x.XInternAtom.restype = c_ulong
        x.XInternAtom.argtypes = [c_void_p, ctypes.c_char_p, c_int]
        x.XSendEvent.argtypes = [
            c_void_p, c_ulong, c_int, ctypes.c_long, ctypes.POINTER(_Event)
        ]
        x.XMoveWindow.argtypes = [c_void_p, c_ulong, c_int, c_int]
        x.XTranslateCoordinates.restype = c_int
        x.XTranslateCoordinates.argtypes = [
            c_void_p, c_ulong, c_ulong, c_int, c_int,
            ctypes.POINTER(c_int), ctypes.POINTER(c_int),
            ctypes.POINTER(c_ulong),
        ]
        x.XFlush.argtypes = [c_void_p]
        ext.XShapeCombineRectangles.argtypes = [
            c_void_p, c_ulong, c_int, c_int, c_int,
            ctypes.POINTER(_Rectangle), c_int, c_int, c_int,
        ]
        ext.XShapeCombineMask.argtypes = [
            c_void_p, c_ulong, c_int, c_int, c_int, c_ulong, c_int
        ]
        capsule = ctypes.pythonapi.PyCapsule_GetPointer
        capsule.restype = c_void_p
        capsule.argtypes = [ctypes.py_object, ctypes.c_char_p]

        self.x, self.ext, self.gtk, self.capsule = x, ext, gtk, capsule


_libraries: Optional[_Libraries] = None


def _libs() -> _Libraries:
    global _libraries
    if _libraries is None:
        _libraries = _Libraries()
    return _libraries


def _xdisplay(display: Gdk.Display) -> int:
    libs = _libs()
    return libs.gtk.gdk_x11_display_get_xdisplay(
        libs.capsule(display.__gpointer__, None)
    )


class _Request:
    """One batch of requests on a surface's window, flushed and inside
    GDK's error trap: the window can be gone by the time the server
    reads them, and that must not end the app."""

    def __init__(self, surface: Gdk.Surface) -> None:
        self.display = surface.get_display()
        self.xdisplay = _xdisplay(self.display)
        self.xid = GdkX11.X11Surface.get_xid(surface)
        self.libs = _libs()

    def __enter__(self) -> _Request:
        self.display.error_trap_push()
        return self

    def __exit__(self, *_exc: object) -> None:
        self.libs.x.XFlush(self.xdisplay)
        self.display.error_trap_pop_ignored()


def position(surface: Gdk.Surface) -> Optional[tuple[int, int]]:
    """The window's top-left on the screen, or None if the server has
    no answer (the window is gone)."""
    x, y = ctypes.c_int(), ctypes.c_int()
    child = ctypes.c_ulong()
    with _Request(surface) as r:
        root = r.libs.x.XDefaultRootWindow(r.xdisplay)
        ok = r.libs.x.XTranslateCoordinates(
            r.xdisplay, r.xid, root, 0, 0,
            ctypes.byref(x), ctypes.byref(y), ctypes.byref(child),
        )
    if not ok:
        return None
    # X11 coordinates are device pixels; GTK's are scaled.
    scale = surface.get_scale_factor()
    return x.value // scale, y.value // scale


def move(surface: Gdk.Surface, x: int, y: int) -> None:
    scale = surface.get_scale_factor()
    with _Request(surface) as r:
        r.libs.x.XMoveWindow(r.xdisplay, r.xid, x * scale, y * scale)


def set_state(surface: Gdk.Surface, above: bool, sticky: bool) -> None:
    """_NET_WM_STATE_ABOVE and _STICKY for a mapped window. The window
    manager keeps them only while it is mapped, so callers send them
    again on every map. Sticky also asks for every desktop, as GTK 3's
    gtk_window_stick did: some window managers (openbox) go by
    _NET_WM_DESKTOP alone."""
    if sticky:
        GdkX11.X11Surface.move_to_desktop(surface, _ALL_DESKTOPS)
    elif GdkX11.X11Surface.get_desktop(surface) == _ALL_DESKTOPS:
        GdkX11.X11Surface.move_to_current_desktop(surface)
    with _Request(surface) as r:
        root = r.libs.x.XDefaultRootWindow(r.xdisplay)
        message_type = r.libs.x.XInternAtom(r.xdisplay, b"_NET_WM_STATE", 0)
        for name, on in ((b"_NET_WM_STATE_ABOVE", above),
                         (b"_NET_WM_STATE_STICKY", sticky)):
            event = _Event()
            m = event.xclient
            m.type = _CLIENT_MESSAGE
            m.send_event = 1
            m.window = r.xid
            m.message_type = message_type
            m.format = 32
            m.data[0] = _NET_WM_STATE_ADD if on else _NET_WM_STATE_REMOVE
            m.data[1] = r.libs.x.XInternAtom(r.xdisplay, name, 0)
            m.data[3] = _SOURCE_APPLICATION
            r.libs.x.XSendEvent(
                r.xdisplay,
                root,
                0,
                _SUBSTRUCTURE_REDIRECT_MASK | _SUBSTRUCTURE_NOTIFY_MASK,
                ctypes.byref(event),
            )


def set_outline(surface: Gdk.Surface, rects: Optional[list[Rect]]) -> None:
    """Cut the visible window to `rects` (window coordinates), or give
    it back its whole rectangle for None. Only for a server without a
    compositor, where transparent pixels would show black."""
    scale = surface.get_scale_factor()
    with _Request(surface) as r:
        if rects is None:
            r.libs.ext.XShapeCombineMask(
                r.xdisplay, r.xid, _SHAPE_BOUNDING, 0, 0, 0, _SHAPE_SET
            )
            return
        array = (_Rectangle * len(rects))(
            *(
                _Rectangle(
                    rect.x * scale, rect.y * scale,
                    rect.w * scale, rect.h * scale,
                )
                for rect in rects
            )
        )
        r.libs.ext.XShapeCombineRectangles(
            r.xdisplay, r.xid, _SHAPE_BOUNDING, 0, 0,
            array, len(rects), _SHAPE_SET, _UNSORTED,
        )
