"""Wayland protocol requests GTK 4 has no API for: KDE's appmenu
(org_kde_kwin_appmenu), which tells KWin where a window's global menu
lives on D-Bus (dbusmenu.py). Only KWin offers the protocol; elsewhere
announce_appmenu does nothing.

The requests go through libwayland-client on GDK's own connection.
The registry is read on a private event queue, so GDK's queue never
sees its events. Nothing here has events to dispatch after that.

Import only after app.py has chosen the GDK backend.
"""

from __future__ import annotations

import ctypes
from typing import Optional

from gi.repository import Gdk

from . import logic

log = logic.log

_MANAGER = b"org_kde_kwin_appmenu_manager"
_APPMENU = b"org_kde_kwin_appmenu"
# The protocol versions this module speaks.
_MANAGER_VERSION = 2
# Opcodes, from the protocols' XML: wl_display.get_registry,
# wl_registry.bind, org_kde_kwin_appmenu_manager.create,
# org_kde_kwin_appmenu.set_address.
_GET_REGISTRY = 1
_BIND = 0
_CREATE = 0
_SET_ADDRESS = 0


class _Message(ctypes.Structure):
    _fields_ = [
        ("name", ctypes.c_char_p),
        ("signature", ctypes.c_char_p),
        ("types", ctypes.POINTER(ctypes.c_void_p)),
    ]


class _Interface(ctypes.Structure):
    _fields_ = [
        ("name", ctypes.c_char_p),
        ("version", ctypes.c_int),
        ("method_count", ctypes.c_int),
        ("methods", ctypes.POINTER(_Message)),
        ("event_count", ctypes.c_int),
        ("events", ctypes.POINTER(_Message)),
    ]


_GLOBAL = ctypes.CFUNCTYPE(
    None,
    ctypes.c_void_p,
    ctypes.c_void_p,
    ctypes.c_uint32,
    ctypes.c_char_p,
    ctypes.c_uint32,
)
_GLOBAL_REMOVE = ctypes.CFUNCTYPE(
    None, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_uint32
)


class _Listener(ctypes.Structure):
    _fields_ = [("global_", _GLOBAL), ("global_remove", _GLOBAL_REMOVE)]


def _types(*interfaces: Optional[int]) -> ctypes.Array:
    return (ctypes.c_void_p * len(interfaces))(*interfaces)


class _AppMenu:
    """libwayland-client, the two interfaces, and the manager global
    bound on one display (None where the compositor has none)."""

    def __init__(self, display: Gdk.Display) -> None:
        wl = ctypes.CDLL("libwayland-client.so.0")
        gtk = ctypes.CDLL("libgtk-4.so.1")
        c_void_p, c_uint32 = ctypes.c_void_p, ctypes.c_uint32
        for name in (
            "wl_proxy_marshal_flags",
            "wl_proxy_create_wrapper",
            "wl_display_create_queue",
        ):
            getattr(wl, name).restype = c_void_p
        wl.wl_proxy_create_wrapper.argtypes = [c_void_p]
        wl.wl_proxy_wrapper_destroy.argtypes = [c_void_p]
        wl.wl_proxy_set_queue.argtypes = [c_void_p, c_void_p]
        wl.wl_proxy_get_version.restype = c_uint32
        wl.wl_proxy_get_version.argtypes = [c_void_p]
        wl.wl_proxy_add_listener.argtypes = [c_void_p, c_void_p, c_void_p]
        wl.wl_proxy_destroy.argtypes = [c_void_p]
        wl.wl_display_create_queue.argtypes = [c_void_p]
        wl.wl_display_roundtrip_queue.argtypes = [c_void_p, c_void_p]
        wl.wl_event_queue_destroy.argtypes = [c_void_p]
        wl.wl_display_flush.argtypes = [c_void_p]
        gtk.gdk_wayland_display_get_wl_display.restype = c_void_p
        gtk.gdk_wayland_display_get_wl_display.argtypes = [c_void_p]
        gtk.gdk_wayland_surface_get_wl_surface.restype = c_void_p
        gtk.gdk_wayland_surface_get_wl_surface.argtypes = [c_void_p]
        capsule = ctypes.pythonapi.PyCapsule_GetPointer
        capsule.restype = c_void_p
        capsule.argtypes = [ctypes.py_object, ctypes.c_char_p]
        self._wl, self._gtk, self._capsule = wl, gtk, capsule

        registry_interface = _Interface.in_dll(wl, "wl_registry_interface")
        surface_interface = _Interface.in_dll(wl, "wl_surface_interface")
        # Everything libwayland reads through a pointer is kept here.
        self._address_types = _types(None, None)
        self._appmenu_methods = (_Message * 2)(
            _Message(b"set_address", b"ss", self._address_types),
            _Message(b"release", b"2", None),
        )
        self._appmenu = _Interface(
            _APPMENU, _MANAGER_VERSION, 2, self._appmenu_methods, 0, None
        )
        self._manager_types = _types(
            ctypes.addressof(self._appmenu),
            ctypes.addressof(surface_interface),
        )
        self._manager_methods = (_Message * 2)(
            _Message(b"create", b"no", self._manager_types),
            _Message(b"release", b"2", None),
        )
        self._manager_interface = _Interface(
            _MANAGER, _MANAGER_VERSION, 2, self._manager_methods, 0, None
        )

        self._display = gtk.gdk_wayland_display_get_wl_display(
            capsule(display.__gpointer__, None)
        )
        self.manager = self._bind_manager(registry_interface)

    def _bind_manager(self, registry_interface: _Interface) -> Optional[int]:
        wl = self._wl
        queue = wl.wl_display_create_queue(self._display)
        wrapper = wl.wl_proxy_create_wrapper(self._display)
        wl.wl_proxy_set_queue(wrapper, queue)
        registry = wl.wl_proxy_marshal_flags(
            ctypes.c_void_p(wrapper),
            ctypes.c_uint32(_GET_REGISTRY),
            ctypes.byref(registry_interface),
            ctypes.c_uint32(wl.wl_proxy_get_version(wrapper)),
            ctypes.c_uint32(0),
            None,
        )
        wl.wl_proxy_wrapper_destroy(wrapper)
        if not registry:
            wl.wl_event_queue_destroy(queue)
            return None

        found: list[tuple[int, int]] = []

        def on_global(_data, _registry, name, interface, version):
            if interface == _MANAGER:
                found.append((name, version))

        listener = _Listener(
            _GLOBAL(on_global), _GLOBAL_REMOVE(lambda *_: None)
        )
        wl.wl_proxy_add_listener(registry, ctypes.byref(listener), None)
        wl.wl_display_roundtrip_queue(self._display, queue)

        manager = None
        if found:
            name, version = found[0]
            version = min(version, _MANAGER_VERSION)
            manager = wl.wl_proxy_marshal_flags(
                ctypes.c_void_p(registry),
                ctypes.c_uint32(_BIND),
                ctypes.byref(self._manager_interface),
                ctypes.c_uint32(version),
                ctypes.c_uint32(0),
                ctypes.c_uint32(name),
                ctypes.c_char_p(_MANAGER),
                ctypes.c_uint32(version),
                None,
            )
        # The manager has no events: nothing more arrives on the queue.
        wl.wl_proxy_destroy(registry)
        if manager is not None:
            wl.wl_proxy_set_queue(manager, None)
        wl.wl_event_queue_destroy(queue)
        return manager

    def announce(self, surface: Gdk.Surface, service: str, path: str) -> None:
        wl = self._wl
        wl_surface = self._gtk.gdk_wayland_surface_get_wl_surface(
            self._capsule(surface.__gpointer__, None)
        )
        if not wl_surface or self.manager is None:
            return
        appmenu = wl.wl_proxy_marshal_flags(
            ctypes.c_void_p(self.manager),
            ctypes.c_uint32(_CREATE),
            ctypes.byref(self._appmenu),
            ctypes.c_uint32(wl.wl_proxy_get_version(self.manager)),
            ctypes.c_uint32(0),
            None,
            ctypes.c_void_p(wl_surface),
        )
        wl.wl_proxy_marshal_flags(
            ctypes.c_void_p(appmenu),
            ctypes.c_uint32(_SET_ADDRESS),
            None,
            ctypes.c_uint32(wl.wl_proxy_get_version(appmenu)),
            ctypes.c_uint32(0),
            ctypes.c_char_p(service.encode()),
            ctypes.c_char_p(path.encode()),
        )
        wl.wl_display_flush(self._display)


# One per display, created on first use; None once found missing.
_appmenus: dict[str, Optional[_AppMenu]] = {}


def announce_appmenu(surface: Gdk.Surface, service: str, path: str) -> None:
    """Point KWin's global menu for `surface` at the DBusMenu object at
    `path` on the bus name `service`. A no-op on a compositor without
    the protocol. The appmenu object lives as long as the surface."""
    display = surface.get_display()
    key = display.get_name()
    if key not in _appmenus:
        try:
            appmenu: Optional[_AppMenu] = _AppMenu(display)
        except (OSError, AttributeError, TypeError, ValueError) as e:
            log.info("no Wayland appmenu support: %s", e)
            appmenu = None
        if appmenu is not None and appmenu.manager is None:
            log.info("the compositor offers no global menu protocol")
            appmenu = None
        _appmenus[key] = appmenu
    appmenu = _appmenus[key]
    if appmenu is not None:
        appmenu.announce(surface, service, path)
