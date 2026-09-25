"""The tank window: an undecorated, transparent window shaped to the
machine case the page draws (macos/Finsical.swift's TankWindow,
DragStrip and mask code).

Import only after app.py has chosen the GDK backend.
"""

from __future__ import annotations

import math
from typing import Callable, Optional

import cairo
from gi.repository import Gdk, GdkPixbuf, GLib, Gtk

from . import logic
from .logic import Rect, Size
from .screen import (
    is_x11,
    make_transparent,
    monitor_rects,
    window_frame,
    work_area,
)
from .web import PageView

log = logic.log

TANK_TITLE = "Finsical"
# A machine change sets the new aspect when the window reports its new
# size, or after this long if the window manager never gives it that.
ASPECT_FALLBACK_MS = 1000
# How far the tank's aspect may stray from its case's: one pixel on a
# minimum-size (about 200 px) tank, so the case art stays within a
# pixel of its outline.
TANK_ASPECT_SLACK = 0.005


class _Silhouette:
    """The machine's window shape: its case image's alpha with the glass
    filled in (processed once per machine), or its shape rects."""

    def __init__(
        self, machine: logic.Machine, mask: Optional[cairo.ImageSurface]
    ) -> None:
        self.machine = machine
        self._mask = mask

    def region(self, w: int, h: int) -> Optional[cairo.Region]:
        """The shape at window size, or None for no shape at all."""
        if self._mask is not None:
            # Nearest-neighbour stretch, like the page stretches the art
            # (preserveAspectRatio="none"); A1 is what the region is
            # built from anyway.
            target = cairo.ImageSurface(cairo.FORMAT_A1, w, h)
            cr = cairo.Context(target)
            cr.scale(w / self._mask.get_width(), h / self._mask.get_height())
            cr.set_source_surface(self._mask, 0, 0)
            cr.get_source().set_filter(cairo.FILTER_NEAREST)
            cr.paint()
            target.flush()
            return Gdk.cairo_region_create_from_surface(target)

        rects = logic.scaled_shape_rects(
            self.machine.shape, w / self.machine.w
        )
        if not rects:
            # An empty region would make the whole tank click-through.
            log.warning(
                "machine %s has no shape; leaving the window unshaped",
                self.machine.id,
            )
            return None
        return cairo.Region(
            [cairo.RectangleInt(r.x, r.y, r.w, r.h) for r in rects]
        )


def load_mask(
    root: logic.WebRoot, machine: logic.Machine
) -> Optional[cairo.ImageSurface]:
    """The machine's case image as an A8 mask with its screen aperture
    and interior filled in, or None (logged) when it has none or it
    cannot be loaded, in which case the shape rects stand in."""
    if machine.mask is None:
        return None
    path = root.resolve_asset(machine.mask)
    if path is None:
        log.warning(
            "machine %s: mask %r is not inside the web root",
            machine.id,
            machine.mask,
        )
        return None
    try:
        pixbuf = GdkPixbuf.Pixbuf.new_from_file(path)
    except GLib.Error as e:
        log.warning(
            "mask image failed to load: %s (%s)", machine.mask, e.message
        )
        return None
    if not pixbuf.get_has_alpha() or pixbuf.get_n_channels() != 4:
        log.warning("mask image has no alpha channel: %s", machine.mask)
        return None

    w, h = pixbuf.get_width(), pixbuf.get_height()
    stride = pixbuf.get_rowstride()
    pixels = pixbuf.get_pixels()
    alpha = bytearray(w * h)
    for y in range(h):
        alpha[y * w : (y + 1) * w] = pixels[
            y * stride + 3 : y * stride + w * 4 : 4
        ]

    # The art cuts the glass out transparent; as a mask that would punch
    # a real hole where the aquarium shows. The fill backs the measured
    # rect up where it lags the art's translucent rim.
    hole = machine.hole
    if hole is not None:
        kx, ky = w / machine.w, h / machine.h
        logic.fill_rect_opaque(
            alpha,
            w,
            h,
            math.floor(hole.x * kx),
            math.floor(hole.y * ky),
            math.ceil((hole.x + hole.w) * kx),
            math.ceil((hole.y + hole.h) * ky),
        )
    logic.fill_interior(alpha, w, h)

    a8_stride = cairo.ImageSurface.format_stride_for_width(cairo.FORMAT_A8, w)
    data = bytearray(a8_stride * h)
    for y in range(h):
        data[y * a8_stride : y * a8_stride + w] = alpha[y * w : (y + 1) * w]
    return cairo.ImageSurface.create_for_data(
        data, cairo.FORMAT_A8, w, h, a8_stride
    )


class TankWindow:
    """The tank. Its page owns all state; this window follows the
    machine the page's state pushes name."""

    def __init__(
        self,
        app: Gtk.Application,
        page: PageView,
        root: logic.WebRoot,
        frames: logic.FrameStore,
        on_frame_changed: Callable[[], None],
        on_close: Callable[[], None],
    ) -> None:
        self.page = page
        self._root = root
        self._frames = frames
        self._on_frame_changed = on_frame_changed
        self._silhouette: Optional[_Silhouette] = None
        self._shape_pending = False
        self._size: Optional[tuple[int, int]] = None
        # The size a machine change asked for, until the window has it
        # and the machine's aspect can go on (see apply_machine).
        self._aspect_pending: Optional[Size] = None
        self._aspect_timer = 0

        self.window = Gtk.ApplicationWindow(application=app, title=TANK_TITLE)
        self.window.set_decorated(False)
        make_transparent(self.window)
        self.x11 = is_x11(self.window.get_display())

        # The drag strip across the top is the only way to move the
        # Bare tank, which has no case to grab. It sits above the page
        # (an input-only event box), so presses there never reach it.
        overlay = Gtk.Overlay()
        overlay.add(page.view)
        strip = Gtk.EventBox(
            visible_window=False, valign=Gtk.Align.START, halign=Gtk.Align.FILL
        )
        strip.set_size_request(-1, logic.TANK_DRAG_STRIP_HEIGHT)
        strip.add_events(Gdk.EventMask.BUTTON_PRESS_MASK)
        strip.connect("button-press-event", self._on_strip_press)
        overlay.add_overlay(strip)
        self.window.add(overlay)

        self._restore_frame()
        self.window.connect("configure-event", self._on_configure)
        self.window.connect("delete-event", lambda *_: on_close() or True)
        self.window.get_screen().connect(
            "composited-changed", lambda *_: self._schedule_shape()
        )

    @property
    def machine(self) -> Optional[logic.Machine]:
        return self._silhouette.machine if self._silhouette else None

    def show(self) -> None:
        self.window.show_all()
        self.page.view.grab_focus()  # bare keys (F, C, L...) reach the page

    def apply_window_prefs(
        self, float_above: bool, all_desktops: bool
    ) -> None:
        self.window.set_keep_above(float_above)
        if all_desktops:
            self.window.stick()
        else:
            self.window.unstick()

    def apply_machine(self, machine: logic.Machine) -> None:
        """Retune the window to a machine case. Only an id change counts:
        state pushes arrive every few seconds."""
        old = self.machine
        if old is not None and old.id == machine.id:
            return
        self._silhouette = _Silhouette(machine, load_mask(self._root, machine))

        frame = window_frame(self.window)
        if old is None:
            # The launch frame is 320x200-aspect but the machine's isn't:
            # snap to the case outline so the bezel doesn't letterbox
            # inside dead glass until the user resizes.
            new = logic.first_machine_frame(frame, machine.w, machine.h)
        else:
            new = logic.swapped_machine_frame(
                frame, old.w, machine.w, machine.h
            )
        # The new aspect goes on only once the window has its new size. A
        # window manager that applies a changed aspect to the current size
        # first (openbox: the 640x400 launch frame grows 825 px tall) also
        # pushes the window back on screen, and it stays there.
        self._set_hints(None)
        self._aspect_pending = Size(new.w, new.h)
        if self._aspect_timer:
            GLib.source_remove(self._aspect_timer)
        self._aspect_timer = GLib.timeout_add(
            ASPECT_FALLBACK_MS, self._on_aspect_timeout
        )
        self.window.resize(new.w, new.h)
        if self.x11 and old is None:
            self.window.move(new.x, new.y)
        self._schedule_shape()

    def step_size(self, step: logic.SizeStep) -> None:
        """Larger/Smaller: an undecorated window has no edges to drag."""
        area = work_area(self.window)
        if area is None:
            log.warning("no monitor to size the tank against")
            return
        w, h = self.window.get_size()
        new = logic.stepped_tank_size(
            Size(w, h),
            step,
            self._aspect(),
            self._min_size(),
            Size(area.w, area.h),
        )
        self.window.resize(new.w, new.h)

    def drag_from_page(self) -> None:
        """A press on the case: move the window with the mouse."""
        self.page.begin_window_drag(
            lambda p: self.window.begin_move_drag(
                p.button, p.x_root, p.y_root, p.time
            )
        )

    def _min_size(self) -> Size:
        machine = self.machine
        if machine is None:
            return logic.tank_min_size(*logic.TANK_LAUNCH_ASPECT)
        return logic.tank_min_size(machine.w, machine.h)

    def _aspect(self) -> float:
        machine = self.machine
        if machine is None:
            return logic.TANK_LAUNCH_ASPECT[0] / logic.TANK_LAUNCH_ASPECT[1]
        return machine.w / machine.h

    def _set_hints(self, aspect: Optional[float]) -> None:
        """The minimum size, and the aspect unless it is None."""
        minimum = self._min_size()
        geometry = Gdk.Geometry()
        geometry.min_width, geometry.min_height = minimum.w, minimum.h
        # An explicit zero base size: without one GDK sends the minimum
        # as the base, and ICCCM window managers (openbox) then hold
        # (size - base) to the aspect, which shrank a restored 310x399
        # tank to 105x82.
        geometry.base_width = geometry.base_height = 0
        flags = Gdk.WindowHints.MIN_SIZE | Gdk.WindowHints.BASE_SIZE
        if aspect is not None:
            # A little slack: few integer sizes hit a case's aspect
            # exactly, and a window manager that enforces it exactly
            # (openbox) trims a pixel on every resize and every launch.
            geometry.min_aspect = aspect * (1 - TANK_ASPECT_SLACK)
            geometry.max_aspect = aspect * (1 + TANK_ASPECT_SLACK)
            flags |= Gdk.WindowHints.ASPECT
        self.window.set_geometry_hints(None, geometry, flags)

    def _apply_pending_aspect(self) -> None:
        if self._aspect_timer:
            GLib.source_remove(self._aspect_timer)
            self._aspect_timer = 0
        if self._aspect_pending is not None:
            self._aspect_pending = None
            self._set_hints(self._aspect())

    def _on_aspect_timeout(self) -> bool:
        self._aspect_timer = 0
        self._apply_pending_aspect()
        return GLib.SOURCE_REMOVE

    def _restore_frame(self) -> None:
        """Where the user left the tank: its size always, its position
        on X11 when that still lands on a monitor, else centred."""
        saved = self._frames.get(logic.TANK_FRAME_KEY)
        if saved is None:
            self._set_hints(self._aspect())
            size = logic.TANK_LAUNCH_SIZE
        else:
            # GTK holds even programmatic sizes to the aspect hint, so a
            # saved frame (already at its machine's aspect) keeps its own
            # until the first state push names the machine.
            self._set_hints(saved.w / saved.h)
            size = Size(saved.w, saved.h)
        self.window.set_default_size(size.w, size.h)

        display = self.window.get_display()
        if (
            self.x11
            and saved is not None
            and saved.x is not None
            and saved.y is not None
            and logic.intersects_any(
                Rect(saved.x, saved.y, size.w, size.h), monitor_rects(display)
            )
        ):
            self.window.move(saved.x, saved.y)
            return
        area = work_area(self.window)
        if self.x11 and area is not None:
            c = logic.centered(size, area)
            self.window.move(c.x, c.y)
        else:
            self.window.set_position(Gtk.WindowPosition.CENTER)

    def _on_configure(
        self, _window: Gtk.Window, _event: Gdk.EventConfigure
    ) -> bool:
        frame = window_frame(self.window)
        self._frames.put(
            logic.TANK_FRAME_KEY,
            frame.w,
            frame.h,
            (frame.x, frame.y) if self.x11 else None,
        )
        self._on_frame_changed()
        pending = self._aspect_pending
        if (
            pending is not None
            and abs(frame.w - pending.w) <= 1
            and abs(frame.h - pending.h) <= 1
        ):
            self._apply_pending_aspect()
        if self._size != (frame.w, frame.h):
            self._size = (frame.w, frame.h)
            self._schedule_shape()
        return False

    def _on_strip_press(
        self, _strip: Gtk.EventBox, event: Gdk.EventButton
    ) -> bool:
        if (
            event.button != Gdk.BUTTON_PRIMARY
            or event.type != Gdk.EventType.BUTTON_PRESS
        ):
            return False
        self.window.begin_move_drag(
            event.button, int(event.x_root), int(event.y_root), event.time
        )
        # Moving leaves focus off the page; bare keys would go dead.
        self.page.view.grab_focus()
        return True

    def _schedule_shape(self) -> None:
        # Resizes arrive in bursts; rebuild the region once they settle.
        if not self._shape_pending:
            self._shape_pending = True
            GLib.idle_add(self._update_shape)

    def _update_shape(self) -> bool:
        """Clip the window to the case: with a compositor only the input
        shape (clicks on the transparent corners reach the desktop);
        without one also the visible shape (XShape), or the corners
        would show black."""
        self._shape_pending = False
        if self.window.get_window() is None or self._silhouette is None:
            return GLib.SOURCE_REMOVE
        w, h = self.window.get_size()
        region = self._silhouette.region(w, h)
        if self.window.get_screen().is_composited():
            self.window.shape_combine_region(None)
            self.window.input_shape_combine_region(region)
        else:
            self.window.input_shape_combine_region(None)
            self.window.shape_combine_region(region)
        return GLib.SOURCE_REMOVE
