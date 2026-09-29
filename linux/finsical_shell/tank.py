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

from . import logic, x11
from .logic import Rect, Size
from .screen import (
    is_x11,
    make_frameless,
    surface_point,
    window_frame,
    work_area,
    work_areas,
)
from .web import PageView, Press

log = logic.log

TANK_TITLE = "Finsical"


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
    machine the page's state pushes name.

    GTK 4 has no aspect hint, so the window manager does not hold the
    tank to its case: every size the app sets (launch, a machine
    change, Larger/Smaller) is computed at the case's aspect instead.
    The tank has no edges to drag, so only a window manager's own
    resize (a keyboard shortcut, tiling) can leave it off-aspect.
    """

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
        # Where to put the window when it maps (X11 only: GTK 4 cannot
        # place a window, see x11.py).
        self._pending_position: Optional[tuple[int, int]] = None
        self._float_above = False
        self._all_desktops = False

        self.window = Gtk.ApplicationWindow(application=app, title=TANK_TITLE)
        make_frameless(self.window)
        self.x11 = is_x11(self.window.get_display())

        # The drag strip across the top is the only way to move the
        # Bare tank, which has no case to grab. It sits above the page
        # and takes the presses there, so they never reach it.
        overlay = Gtk.Overlay()
        overlay.set_child(page.view)
        strip = Gtk.Box(valign=Gtk.Align.START, halign=Gtk.Align.FILL)
        strip.set_size_request(-1, logic.TANK_DRAG_STRIP_HEIGHT)
        click = Gtk.GestureClick(button=Gdk.BUTTON_PRIMARY)
        click.connect("pressed", self._on_strip_press)
        strip.add_controller(click)
        overlay.add_overlay(strip)
        self._strip = strip
        self._overlay = overlay
        self.window.set_child(overlay)

        self._restore_frame()
        self.window.connect("realize", self._on_realize)
        self.window.connect("map", self._on_map)
        self.window.connect("close-request", lambda *_: on_close() or True)
        self.window.get_display().connect(
            "notify::composited", lambda *_: self._schedule_shape()
        )

    @property
    def machine(self) -> Optional[logic.Machine]:
        return self._silhouette.machine if self._silhouette else None

    def show(self) -> None:
        self.window.present()
        self.page.view.grab_focus()  # bare keys (F, C, L...) reach the page

    def apply_window_prefs(
        self, float_above: bool, all_desktops: bool
    ) -> None:
        self._float_above = float_above
        self._all_desktops = all_desktops
        if self.x11 and self.window.get_mapped():
            x11.set_state(self.window.get_surface(), float_above, all_desktops)

    def save_frame(self) -> None:
        """Remember where the tank is. GTK 4 reports no moves, so this
        runs on every resize and before the window hides."""
        if not self.window.get_realized():
            return
        frame = window_frame(self.window)
        self._frames.put(
            logic.TANK_FRAME_KEY,
            frame.w,
            frame.h,
            (frame.x, frame.y) if self.x11 else None,
        )
        self._on_frame_changed()

    def apply_machine(self, machine: logic.Machine) -> None:
        """Retune the window to a machine case. Only an id change counts:
        state pushes arrive every few seconds."""
        old = self.machine
        if old is not None and old.id == machine.id:
            return
        self._silhouette = _Silhouette(machine, load_mask(self._root, machine))
        self._strip.set_size_request(-1, logic.drag_strip_height(machine.id))

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
        # The swap keeps the top-left, so a taller case could push the
        # bottom under a panel or off the monitor: keep it all visible.
        area = work_area(self.window) if self.x11 else None
        if area is not None:
            new = logic.clamp_to_visible(new, area)
        self._set_min_size()
        self.window.set_default_size(new.w, new.h)
        if self.x11 and (new.x, new.y) != (frame.x, frame.y):
            self._move(new.x, new.y)
        self._schedule_shape()

    def step_size(self, step: logic.SizeStep) -> None:
        """Larger/Smaller: an undecorated window has no edges to drag."""
        area = work_area(self.window)
        if area is None:
            log.warning("no monitor to size the tank against")
            return
        frame = window_frame(self.window)
        new = logic.stepped_tank_size(
            Size(frame.w, frame.h),
            step,
            self._aspect(),
            self._min_size(),
            Size(area.w, area.h),
        )
        self.window.set_default_size(new.w, new.h)

    def drag_from_page(self) -> None:
        """A press on the case: move the window with the mouse."""
        self.page.begin_window_drag(self._begin_move)

    def _begin_move(self, press: Press) -> None:
        surface = self.window.get_surface()
        if surface is not None:
            surface.begin_move(
                press.device, press.button, press.x, press.y, press.time
            )

    def _move(self, x: int, y: int) -> None:
        if self.window.get_mapped():
            x11.move(self.window.get_surface(), x, y)
        else:
            self._pending_position = (x, y)

    def _min_size(self) -> Size:
        machine = self.machine
        if machine is None:
            return logic.tank_min_size(*logic.TANK_LAUNCH_ASPECT)
        return logic.tank_min_size(machine.w, machine.h)

    def _set_min_size(self) -> None:
        minimum = self._min_size()
        self._overlay.set_size_request(minimum.w, minimum.h)

    def _aspect(self) -> float:
        machine = self.machine
        if machine is None:
            return logic.TANK_LAUNCH_ASPECT[0] / logic.TANK_LAUNCH_ASPECT[1]
        return machine.w / machine.h

    def _restore_frame(self) -> None:
        """Where the user left the tank: its size always, its position
        on X11 when enough of it still lands on a monitor's work area to
        see and grab (a 1 px sliver would be a lost window), else
        centred. Wayland leaves placement to the compositor."""
        saved = self._frames.get(logic.TANK_FRAME_KEY)
        size = (
            logic.TANK_LAUNCH_SIZE
            if saved is None
            else Size(saved.w, saved.h)
        )
        self._set_min_size()
        self.window.set_default_size(size.w, size.h)
        if not self.x11:
            return

        display = self.window.get_display()
        if (
            saved is not None
            and saved.x is not None
            and saved.y is not None
            and logic.grabbable_on_any(
                Rect(saved.x, saved.y, size.w, size.h), work_areas(display)
            )
        ):
            self._pending_position = (saved.x, saved.y)
            return
        area = work_area(self.window)
        if area is not None:
            c = logic.centered(size, area)
            self._pending_position = (c.x, c.y)

    def _on_realize(self, window: Gtk.Window) -> None:
        window.get_surface().connect("layout", self._on_layout)

    def _on_map(self, window: Gtk.Window) -> None:
        """Placement and the window prefs go on once the window manager
        has the window: it drops them for an unmapped one."""
        surface = window.get_surface()
        if self.x11:
            if self._pending_position is not None:
                x11.move(surface, *self._pending_position)
                self._pending_position = None
            x11.set_state(surface, self._float_above, self._all_desktops)
        # Again now it is mapped: bare keys (F, C, L...) reach the page.
        self.page.view.grab_focus()
        self._schedule_shape()

    def _on_layout(self, _surface: Gdk.Surface, w: int, h: int) -> None:
        if self._size == (w, h):
            return
        self._size = (w, h)
        self.save_frame()
        self._schedule_shape()

    def _on_strip_press(
        self, gesture: Gtk.GestureClick, n_press: int, x: float, y: float
    ) -> None:
        device = gesture.get_device()
        if n_press != 1 or device is None:
            return
        gesture.set_state(Gtk.EventSequenceState.CLAIMED)
        sx, sy = surface_point(self._strip, x, y)
        self._begin_move(
            Press(
                gesture.get_current_button(),
                sx,
                sy,
                gesture.get_current_event_time(),
                device,
            )
        )
        # The window manager keeps the release; see PageView.
        gesture.reset()
        # Moving leaves focus off the page; bare keys would go dead.
        self.page.view.grab_focus()

    def _schedule_shape(self) -> None:
        # Resizes arrive in bursts; rebuild the region once they settle.
        if not self._shape_pending:
            self._shape_pending = True
            GLib.idle_add(self._update_shape)

    def _update_shape(self) -> bool:
        """Clip the window to the case: clicks on the transparent corners
        reach the desktop (the input region). An X11 server without a
        compositor would also show those corners black, so there the
        visible outline is cut too."""
        self._shape_pending = False
        surface = self.window.get_surface()
        if (
            surface is None
            or not self.window.get_mapped()
            or self._silhouette is None
        ):
            return GLib.SOURCE_REMOVE
        w, h = surface.get_width(), surface.get_height()
        region = self._silhouette.region(w, h)
        if region is None:
            region = cairo.Region(cairo.RectangleInt(0, 0, w, h))
        surface.set_input_region(region)
        if self.x11:
            composited = self.window.get_display().is_composited()
            x11.set_outline(
                surface, None if composited else _region_rects(region)
            )
        return GLib.SOURCE_REMOVE


def _region_rects(region: cairo.Region) -> list[Rect]:
    rects = []
    for i in range(region.num_rectangles()):
        r = region.get_rectangle(i)
        rects.append(Rect(r.x, r.y, r.width, r.height))
    return rects
