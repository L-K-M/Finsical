"""The shell's rules that need no GTK: web-root paths and responses,
window geometry, the client windows' shade/zoom state, the saved-state
files, the tank's state pushes and the bus relay script.

This module must import without python3-gi (CI runs its tests on a
runner without it) and must stay Python 3.10 syntax (Ubuntu 22.04).
Geometry is in GDK's y-down screen coordinates throughout; the macOS
code it ports (macos/Finsical.swift, osmium-ui OsmiumWindows.swift) is
y-up, so its top-edge rules appear here as rules on `y`.
"""

from __future__ import annotations

import base64
import binascii
import bisect
import enum
import json
import logging
import math
import os
import re
import tempfile
import urllib.parse
from dataclasses import dataclass, replace
from typing import Any, Optional

log = logging.getLogger("finsical")

APP_ID = "dev.finsical.app"
SCHEME = "finsical"
# Pages load as finsical://app/<page>; the handler ignores the host.
APP_URL = f"{SCHEME}://app/"
TANK_PAGE = "index.html"

# ---------------------------------------------------------------------------
# Where things live


class Layout(enum.Enum):
    """How the launcher found the shell package."""

    # /usr/games/finsical with the package and web root in
    # /usr/share/finsical (also an extracted staging tree).
    INSTALLED = "installed"
    # linux/finsical in a checkout, next to linux/finsical_shell; the
    # web root is the repository's `npm run build` output.
    SOURCE_TREE = "source-tree"


WEB_ROOT_ENV = "FINSICAL_WEB_ROOT"
VERSION_FILE = "version.txt"
DEVELOPMENT_VERSION = "development build"


class WebRootError(Exception):
    """No usable web root; the message says how to get one."""


def find_web_root(
    env_value: Optional[str], share_dir: str, layout: Layout
) -> str:
    """The directory to serve on finsical://, which must hold index.html.

    An explicit FINSICAL_WEB_ROOT wins and must be valid: silently
    serving some other build instead would hide the mistake.
    """
    if env_value:
        if os.path.isfile(os.path.join(env_value, TANK_PAGE)):
            return os.path.realpath(env_value)
        raise WebRootError(
            f"{WEB_ROOT_ENV}={env_value} has no {TANK_PAGE}; point it at "
            "the output of `npm run build` (the dist/ directory)"
        )

    if layout is Layout.INSTALLED:
        candidate = os.path.join(share_dir, "web")
    else:
        candidate = os.path.join(share_dir, os.pardir, "dist")
    if os.path.isfile(os.path.join(candidate, TANK_PAGE)):
        return os.path.realpath(candidate)
    raise WebRootError(
        f"no web app in {os.path.normpath(candidate)}: run `npm run build` "
        f"in the repository root, or set {WEB_ROOT_ENV} to a built web root"
    )


def read_version(share_dir: str) -> str:
    """The version build-deb.sh recorded, or DEVELOPMENT_VERSION when
    running from a checkout."""
    try:
        with open(
            os.path.join(share_dir, VERSION_FILE), encoding="utf-8"
        ) as f:
            version = f.read().strip()
    except FileNotFoundError:
        return DEVELOPMENT_VERSION
    return version or DEVELOPMENT_VERSION


# ---------------------------------------------------------------------------
# The finsical:// scheme

# macos/Finsical.swift's map, plus wav for bundled pack sounds.
_MIME = {
    "html": "text/html",
    "js": "text/javascript",
    "json": "application/json",
    "png": "image/png",
    "svg": "image/svg+xml",
    "css": "text/css",
    "wasm": "application/wasm",
    "bin": "application/octet-stream",
    "wav": "audio/wav",
}
_DEFAULT_MIME = "application/octet-stream"
# An encoded "/" survives WebKit's path normalisation, so it could
# smuggle "..%2f" past it; an encoded NUL would truncate a path.
_FORBIDDEN_ESCAPE = re.compile(r"%(2f|00)", re.IGNORECASE)
HTTP_OK = 200
HTTP_NOT_FOUND = 404


def content_type(path: str) -> str:
    """Content-Type for a served file. Text types carry the utf-8
    charset, as the macOS shell sends them."""
    ext = os.path.splitext(path)[1][1:].lower()
    mime = _MIME.get(ext, _DEFAULT_MIME)
    textual = mime.startswith("text/") or mime in (
        "image/svg+xml",
        "application/json",
    )
    return f"{mime}; charset=utf-8" if textual else mime


@dataclass(frozen=True)
class WebResponse:
    status: int
    content_type: Optional[str]
    body: bytes


class WebRoot:
    """A directory served read-only, never outside itself."""

    def __init__(self, path: str) -> None:
        self._root = os.path.realpath(path)

    @property
    def path(self) -> str:
        return self._root

    def resolve_request(self, request_path: str) -> Optional[str]:
        """The file a finsical:// request path (as WebKit hands it
        over: percent-encoded, query stripped) names, or None when the
        path is malformed or leaves the root. The file may not exist."""
        if _FORBIDDEN_ESCAPE.search(request_path) or "\0" in request_path:
            return None
        try:
            path = urllib.parse.unquote(request_path, errors="strict")
        except UnicodeDecodeError:
            return None
        if path == "" or path.endswith("/"):
            path += "index.html"
        return self._contain(path.lstrip("/"))

    def resolve_asset(self, rel: str) -> Optional[str]:
        """A plain root-relative path from a page message (the machine
        mask), or None when it is absolute, climbs with "..", or
        leaves the root through a symlink."""
        if (
            not rel
            or os.path.isabs(rel)
            or "\0" in rel
            or ".." in rel.split("/")
        ):
            return None
        return self._contain(rel)

    def respond(self, request_path: str) -> WebResponse:
        """The response for a request path: the file, or a real 404
        (the page probes for an optional bundled pack with fetch and
        must see the status). Other I/O errors raise OSError."""
        path = self.resolve_request(request_path)
        if path is None:
            return WebResponse(HTTP_NOT_FOUND, None, b"")
        try:
            with open(path, "rb") as f:
                body = f.read()
        except (FileNotFoundError, IsADirectoryError, NotADirectoryError):
            return WebResponse(HTTP_NOT_FOUND, None, b"")
        return WebResponse(HTTP_OK, content_type(path), body)

    def _contain(self, rel: str) -> Optional[str]:
        real = os.path.realpath(
            os.path.join(self._root, os.path.normpath(rel))
        )
        if not real.startswith(self._root + os.sep):
            return None
        return real


# ---------------------------------------------------------------------------
# Geometry


@dataclass(frozen=True)
class Rect:
    x: int
    y: int
    w: int
    h: int

    def intersects(self, other: Rect) -> bool:
        return (
            self.x < other.x + other.w
            and other.x < self.x + self.w
            and self.y < other.y + other.h
            and other.y < self.y + self.h
        )


@dataclass(frozen=True)
class Size:
    w: int
    h: int


def intersects_any(frame: Rect, monitors: list[Rect]) -> bool:
    """True when some part of `frame` is on an attached monitor; a
    frame left on a detached display is not restored."""
    return any(frame.intersects(m) for m in monitors)


# A saved tank frame is restored only if this much of it is on some
# monitor's work area: a 1 px overlap would bring back a sliver no one
# can find or grab (macOS restoreTankFrame; 44 is the drag strip twice).
TANK_GRAB_MIN = Size(64, 44)


def grabbable_on_any(frame: Rect, areas: list[Rect]) -> bool:
    """True when some work area shows at least TANK_GRAB_MIN of
    `frame`."""
    for a in areas:
        w = min(frame.x + frame.w, a.x + a.w) - max(frame.x, a.x)
        h = min(frame.y + frame.h, a.y + a.h) - max(frame.y, a.y)
        if w >= TANK_GRAB_MIN.w and h >= TANK_GRAB_MIN.h:
            return True
    return False


def clamp_to_visible(frame: Rect, area: Rect) -> Rect:
    """`frame` moved (not resized) into the work area; a frame larger
    than the area pins to its top-left (macOS clampToVisible). A case
    swap keeps the top-left, so a taller case would otherwise push the
    bottom off the screen."""
    x = (
        area.x
        if frame.w >= area.w
        else max(area.x, min(frame.x, area.x + area.w - frame.w))
    )
    y = (
        area.y
        if frame.h >= area.h
        else max(area.y, min(frame.y, area.y + area.h - frame.h))
    )
    return Rect(x, y, frame.w, frame.h)


def centered(size: Size, area: Rect) -> Rect:
    return Rect(
        area.x + (area.w - size.w) // 2,
        area.y + (area.h - size.h) // 2,
        size.w,
        size.h,
    )


# The tank at launch, before its first state push names a machine.
TANK_LAUNCH_SIZE = Size(640, 400)
TANK_LAUNCH_ASPECT = (320, 200)
# Smallest tank window, as a fraction of the machine's viewBox (one
# pixel per viewBox unit), macOS tankMinScale.
TANK_MIN_SCALE = 0.25
# Larger/Smaller change the tank's size by this factor per step.
TANK_SIZE_STEP = 1.25
# Top strip of the tank that drags the window (macOS DragStrip). The
# Bare tank gets a thin one: 22 px would cover most of its feed zone,
# and its edges still drag.
TANK_DRAG_STRIP_HEIGHT = 22
TANK_DRAG_STRIP_HEIGHT_BARE = 8
BARE_MACHINE_ID = "bare"


def drag_strip_height(machine_id: Optional[str]) -> int:
    return (
        TANK_DRAG_STRIP_HEIGHT_BARE
        if machine_id == BARE_MACHINE_ID
        else TANK_DRAG_STRIP_HEIGHT
    )


def tank_min_size(vb_w: float, vb_h: float) -> Size:
    return Size(
        math.ceil(vb_w * TANK_MIN_SCALE), math.ceil(vb_h * TANK_MIN_SCALE)
    )


def first_machine_frame(frame: Rect, vb_w: float, vb_h: float) -> Rect:
    """The launch frame snapped to the first machine's outline: same
    height, width from the machine's aspect, same horizontal centre."""
    w = round(frame.h * vb_w / vb_h)
    center = frame.x + frame.w / 2
    return Rect(round(center - w / 2), frame.y, w, frame.h)


def swapped_machine_frame(
    frame: Rect, old_vb_w: float, vb_w: float, vb_h: float
) -> Rect:
    """A case swap keeps pixels per viewBox unit, so the screen keeps
    its size; the top-left corner stays put."""
    w = frame.w * (vb_w / old_vb_w)
    return Rect(frame.x, frame.y, round(w), round(w * vb_h / vb_w))


class SizeStep(enum.Enum):
    LARGER = "larger"
    SMALLER = "smaller"


def stepped_tank_size(
    current: Size,
    step: SizeStep,
    aspect: float,
    min_size: Size,
    max_size: Size,
) -> Size:
    """The tank's size one Larger/Smaller step on, at the machine's
    aspect: no bigger than the monitor's work area, no smaller than the
    tank's minimum (which wins on a monitor too small for both)."""
    factor = TANK_SIZE_STEP if step is SizeStep.LARGER else 1 / TANK_SIZE_STEP
    w = current.w * factor
    w = min(w, max_size.w, max_size.h * aspect)
    w = max(w, min_size.w, min_size.h * aspect)
    return Size(round(w), round(w / aspect))


# Space between the tank and a client window placed beside it.
CLIENT_GAP = 12


def beside_tank(
    tank: Rect, size: Size, work_area: Rect, gap: int = CLIENT_GAP
) -> tuple[int, int]:
    """Top-left corner for a window of `size` beside the tank, top edges
    aligned: to its right when that fits in the work area, else to its
    left, then clamped into the work area with the top edge winning."""
    right = work_area.x + work_area.w
    x = tank.x + tank.w + gap
    if x + size.w > right:
        x = tank.x - gap - size.w
    x = max(work_area.x, min(x, right - size.w))
    y = max(work_area.y, min(tank.y, work_area.y + work_area.h - size.h))
    return x, y


# ---------------------------------------------------------------------------
# Client windows (osmium-ui OsmiumWindows.swift)


@dataclass(frozen=True)
class ClientSpec:
    """A client window, with the macOS shell's sizes (not the pages'
    browser-mode values). Sizes include the page's 1px drop shadow;
    `min_size` None means a fixed-size window without zoom or grow."""

    name: str
    page: str
    title: str
    frame_key: str
    size: Size
    min_size: Optional[Size]

    @property
    def url(self) -> str:
        return APP_URL + self.page


PREFS = ClientSpec(
    "prefs", "prefs.html", "Preferences", "FinsicalPrefs", Size(565, 457), None
)
OVERVIEW = ClientSpec(
    "overview",
    "overview.html",
    "Tank Overview",
    "FinsicalOverview",
    Size(521, 381),
    Size(361, 201),
)
ADDONS = ClientSpec(
    "addons",
    "addons.html",
    "Import Add-ons",
    "FinsicalAddons",
    Size(621, 441),
    Size(441, 301),
)
# The stats page clips rather than scrolls, so its minimum keeps the
# water readings, two care hints and the Keeping controls visible.
STATS = ClientSpec(
    "stats",
    "stats.html",
    "Tank Stats",
    "FinsicalStats",
    Size(380, 640),
    Size(340, 560),
)
CLIENT_SPECS = (PREFS, OVERVIEW, ADDONS, STATS)

TANK_FRAME_KEY = "FinsicalTank"
# The page's 22px folded window plus the 1px shadow it draws below.
SHADED_HEIGHT = 23
# A saved height below this is a title-bar sliver from a build that
# saved the folded frame; reopening grows it back.
SLIVER_HEIGHT = 40
# Zoom compares sizes within this tolerance.
_ZOOM_EPSILON = 0.5


@dataclass(frozen=True)
class SizeHints:
    min_w: int
    min_h: int
    max_w: Optional[int]
    max_h: Optional[int]


class ClientWindowState:
    """The windowshade and zoom state of one client window.

    Each operation takes the window's current frame and returns the
    frame to apply, or None for no change; apply `hints()` first, since
    GTK clamps a resize to the geometry hints. The minimum height to
    restore after a fold comes from the spec, which is the only thing
    that sets it, so there is no separate saved minimum.
    """

    def __init__(self, spec: ClientSpec) -> None:
        self.spec = spec
        self._pre_shade_h: Optional[int] = None
        self._user_frame: Optional[Rect] = None

    @property
    def shaded(self) -> bool:
        return self._pre_shade_h is not None

    @property
    def resizable(self) -> bool:
        return self.spec.min_size is not None

    def hints(self) -> SizeHints:
        # Fixed windows use min = max rather than a non-resizable
        # window: GTK refuses to fold those to the title bar.
        if self.spec.min_size is None:
            h = SHADED_HEIGHT if self.shaded else self.spec.size.h
            return SizeHints(self.spec.size.w, h, self.spec.size.w, h)
        min_h = SHADED_HEIGHT if self.shaded else self.spec.min_size.h
        return SizeHints(self.spec.min_size.w, min_h, None, None)

    def shade(self, current: Rect) -> Rect:
        """Fold to the title bar, top edge pinned. A reload while folded
        re-sends the fold: the first captured height is kept, or
        unfolding would restore the sliver."""
        if self._pre_shade_h is None:
            floor = (self.spec.min_size or self.spec.size).h
            self._pre_shade_h = max(current.h, floor)
        return replace(current, h=SHADED_HEIGHT)

    def unshade(self, current: Rect) -> Optional[Rect]:
        """Unfold to the height before the fold. Every page load posts
        an unfold, so this is a no-op unless folded."""
        if self._pre_shade_h is None:
            return None
        h = self._pre_shade_h
        self._pre_shade_h = None
        return replace(current, h=h)

    def reopen(self, current: Rect) -> Optional[Rect]:
        """The frame to show a hidden window at: expanded if it was
        closed while folded (only the shell knows it is reopening; the
        page unfolds itself when its viewport grows), or at the spec
        height if it is a saved sliver."""
        unfolded = self.unshade(current)
        if unfolded is not None:
            return unfolded
        if current.h < SLIVER_HEIGHT:
            return replace(current, h=self.spec.size.h)
        return None

    def zoom(self, current: Rect, work_area: Optional[Rect]) -> Optional[Rect]:
        """The zoom box, Mac OS 8 style: a window at its standard size
        goes back to the user frame; any other frame becomes the user
        frame and zooms to standard. Ignored while folded and for
        fixed-size windows."""
        if self.shaded or not self.resizable:
            return None
        standard = self.standard_frame(current, work_area)
        at_standard = (
            abs(current.w - standard.w) < _ZOOM_EPSILON
            and abs(current.h - standard.h) < _ZOOM_EPSILON
        )
        if not at_standard:
            self._user_frame = current
            return standard
        if self._user_frame is None:
            return None
        frame, self._user_frame = self._user_frame, None
        return frame

    def standard_frame(self, current: Rect, work_area: Optional[Rect]) -> Rect:
        """The spec size with the top-left pinned, shifted into the work
        area when it would run off an edge (top edge wins)."""
        size = self.spec.size
        frame = Rect(current.x, current.y, size.w, size.h)
        if work_area is None:
            return frame
        right = work_area.x + work_area.w
        bottom = work_area.y + work_area.h
        x = max(work_area.x, min(frame.x, right - size.w))
        y = max(work_area.y, min(frame.y, bottom - size.h))
        return Rect(x, y, size.w, size.h)

    def frame_to_save(self, current: Rect) -> Rect:
        """A folded window saves its expanded frame: quitting while
        folded must not bring it back as a sliver."""
        if self._pre_shade_h is None:
            return current
        return replace(current, h=self._pre_shade_h)


# ---------------------------------------------------------------------------
# Saved state ($XDG_CONFIG_HOME/finsical/*.json)

WINDOWS_FILE = "windows.json"
SETTINGS_FILE = "settings.json"


def _umask() -> int:
    mask = os.umask(0)
    os.umask(mask)
    return mask


def write_file_atomic(path: str, data: bytes, mode: int = 0o600) -> None:
    """Write `data` to `path` through a temporary file in the same
    directory, so readers never see half a file and a failed write
    leaves the old one. `mode` is filtered by the umask. Raises
    OSError."""
    directory = os.path.dirname(path) or "."
    fd, tmp = tempfile.mkstemp(prefix=".tmp-", dir=directory)
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(data)
        os.chmod(tmp, mode & ~_umask())
        os.replace(tmp, path)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


class JsonStore:
    """One JSON object in a file: read once, written back atomically.

    A missing file is an empty store. An unreadable or corrupt one is
    logged and treated as empty; the next flush replaces it, so a bad
    file costs the saved values once instead of breaking every launch.
    """

    def __init__(self, path: str) -> None:
        self._path = path
        self._data = self._load()
        self._dirty = False

    def get(self, key: str) -> Any:
        return self._data.get(key)

    def set(self, key: str, value: Any) -> None:
        if self._data.get(key) == value:
            return
        self._data[key] = value
        self._dirty = True

    def flush(self) -> bool:
        """Write pending changes; False (and logged) on failure, when
        the changes stay pending for the next flush."""
        if not self._dirty:
            return True
        text = json.dumps(self._data, indent=1, sort_keys=True) + "\n"
        try:
            os.makedirs(os.path.dirname(self._path), exist_ok=True)
            write_file_atomic(self._path, text.encode("utf-8"))
        except OSError as e:
            log.warning("could not save %s: %s", self._path, e)
            return False
        self._dirty = False
        return True

    def _load(self) -> dict:
        try:
            with open(self._path, encoding="utf-8") as f:
                data = json.load(f)
        except FileNotFoundError:
            return {}
        except (OSError, ValueError) as e:
            log.warning(
                "ignoring unreadable %s (%s); using defaults", self._path, e
            )
            return {}
        if not isinstance(data, dict):
            log.warning(
                "ignoring %s: not a JSON object; using defaults", self._path
            )
            return {}
        return data


@dataclass(frozen=True)
class SavedFrame:
    """A window's saved size, and its position where the display
    server reports one (X11; Wayland keeps positions to itself)."""

    w: int
    h: int
    x: Optional[int] = None
    y: Optional[int] = None


def _is_int(v: Any) -> bool:
    return isinstance(v, int) and not isinstance(v, bool)


class FrameStore:
    """Window frames by key (FinsicalTank, FinsicalPrefs, ...)."""

    def __init__(self, store: JsonStore) -> None:
        self._store = store

    def get(self, key: str) -> Optional[SavedFrame]:
        raw = self._store.get(key)
        if not isinstance(raw, dict):
            return None
        w, h, x, y = (raw.get(k) for k in ("w", "h", "x", "y"))
        if not (_is_int(w) and _is_int(h)) or w <= 0 or h <= 0:
            return None
        if not (_is_int(x) and _is_int(y)):
            x = y = None
        return SavedFrame(w, h, x, y)

    def put(
        self, key: str, w: int, h: int, position: Optional[tuple[int, int]]
    ) -> None:
        """Save a frame. Without a position (Wayland) the previously
        saved one is kept, so a Wayland session doesn't forget where
        the window sat under X11."""
        value: dict[str, int] = {"w": w, "h": h}
        if position is None:
            old = self.get(key)
            if old is not None and old.x is not None and old.y is not None:
                position = (old.x, old.y)
        if position is not None:
            value["x"], value["y"] = position
        self._store.set(key, value)

    def flush(self) -> bool:
        return self._store.flush()


class WindowPref(enum.Enum):
    """The tank's window toggles; both default on."""

    FLOAT_ABOVE = "floatAbove"
    ALL_DESKTOPS = "allDesktops"


class Settings:
    def __init__(self, store: JsonStore) -> None:
        self._store = store

    def get(self, pref: WindowPref) -> bool:
        value = self._store.get(pref.value)
        return value if isinstance(value, bool) else True

    def set(self, pref: WindowPref, value: bool) -> None:
        self._store.set(pref.value, value)

    def flush(self) -> bool:
        return self._store.flush()


# ---------------------------------------------------------------------------
# The tank's state pushes


def _number(v: Any) -> Optional[float]:
    if isinstance(v, bool) or not isinstance(v, (int, float)):
        return None
    return float(v) if math.isfinite(v) else None


@dataclass(frozen=True)
class BoxRect:
    """A rect in viewBox units (the case PNG's pixels), y down."""

    x: float
    y: float
    w: float
    h: float


def _box(raw: Any) -> Optional[BoxRect]:
    if not isinstance(raw, dict):
        return None
    vals = [_number(raw.get(k)) for k in ("x", "y", "w", "h")]
    if any(v is None for v in vals):
        return None
    return BoxRect(*vals)  # type: ignore[arg-type]


@dataclass(frozen=True)
class Machine:
    """The machine case from a `state` push (web/main.ts postState)."""

    id: str
    w: float
    h: float
    shape: tuple[BoxRect, ...]
    mask: Optional[str]
    hole: Optional[BoxRect]


def parse_machine(state: dict) -> Optional[Machine]:
    """The machine a state push carries, or None when it has none or
    it is malformed (the shell then keeps the current one)."""
    raw = state.get("machine")
    if not isinstance(raw, dict):
        return None
    mid, w, h = raw.get("id"), _number(raw.get("w")), _number(raw.get("h"))
    if not isinstance(mid, str) or w is None or h is None or w <= 0 or h <= 0:
        return None
    shape_raw = raw.get("shape")
    shapes = shape_raw if isinstance(shape_raw, list) else []
    shape = tuple(b for b in (_box(s) for s in shapes) if b is not None)
    mask = raw.get("mask")
    return Machine(
        mid,
        w,
        h,
        shape,
        mask if isinstance(mask, str) and mask else None,
        _box(raw.get("hole")),
    )


@dataclass(frozen=True)
class TankStatus:
    """The tank's live toggles, mirrored in the app menu. Until the
    first push CRT stays unavailable (and its item disabled)."""

    crt_on: bool = False
    crt_available: bool = False
    lamp_on: bool = True
    muted: bool = False
    paused: bool = False


def update_status(status: TankStatus, state: dict) -> TankStatus:
    """Fold a state push into the status; absent groups keep their
    values, as in the macOS shell."""
    crt, lighting, sound = (state.get(k) for k in ("crt", "lighting", "sound"))
    if isinstance(crt, dict):
        status = replace(
            status,
            crt_on=crt.get("on") is True,
            crt_available=crt.get("available") is True,
        )
    if isinstance(lighting, dict):
        status = replace(status, lamp_on=lighting.get("lamp") is not False)
    if isinstance(sound, dict):
        status = replace(status, muted=sound.get("muted") is True)
    if isinstance(state.get("paused"), bool):
        status = replace(status, paused=state["paused"])
    return status


def pause_label(paused: bool) -> str:
    return "Resume Simulation" if paused else "Pause Simulation"


# ---------------------------------------------------------------------------
# Scripts evaluated in the pages

BUS_DROPPED = "dropped"
# window.finsical entry points the menus call (web/main.ts).
TANK_FUNCTIONS = frozenset(
    {
        "feedFish",
        "changeWater",
        "toggleCrt",
        "toggleLights",
        "toggleMute",
        "togglePause",
        "takePicture",
    }
)


def bus_delivery_script(json_text: str) -> str:
    """Deliver a bus message to a page's window.__bus, answering
    'dropped' when the page has not registered it yet. JSON.stringify
    leaves U+2028/U+2029 raw, which older engines read as line breaks
    inside the spliced source; escape them as the macOS shell does."""
    payload = json_text.replace("\u2028", "\\u2028").replace(
        "\u2029", "\\u2029"
    )
    return (
        f"window.__bus ? (window.__bus({payload}), undefined)"
        f" : '{BUS_DROPPED}'"
    )


def tank_call_script(function: str) -> str:
    """Call a window.finsical entry point, throwing when it is missing
    so the failure surfaces instead of passing silently."""
    if function not in TANK_FUNCTIONS:
        raise ValueError(f"unknown tank function {function!r}")
    return (
        f"window.finsical?.{function} ? window.finsical.{function}()"
        f" : (() => {{ throw new Error('window.finsical.{function}"
        f" missing') }})()"
    )


# ---------------------------------------------------------------------------
# The tank's silhouette

# Pixels at least this opaque stop the interior fill (Finsical.swift).
INTERIOR_ALPHA = 250
OPAQUE = 255
_PASSABLE = bytes(1 if a < INTERIOR_ALPHA else 0 for a in range(256))
_RUN = re.compile(b"\x01+")


def fill_rect_opaque(
    alpha: bytearray,
    width: int,
    height: int,
    x0: int,
    y0: int,
    x1: int,
    y1: int,
) -> None:
    """Set alpha to opaque inside [x0, x1) x [y0, y1), clipped to the
    image: the screen aperture, which the case art cuts out."""
    x0, x1 = max(0, x0), min(width, x1)
    y0, y1 = max(0, y0), min(height, y1)
    if x0 >= x1:
        return
    run = bytes([OPAQUE]) * (x1 - x0)
    for y in range(y0, y1):
        alpha[y * width + x0 : y * width + x1] = run


def fill_interior(alpha: bytearray, width: int, height: int) -> None:
    """In place: every pixel that cannot reach the image border through
    clearly transparent (alpha < 250) pixels becomes opaque, so the
    glass, its translucent rim and enclosed gaps join the silhouette
    while edge-connected gaps (a handle recess, the space between
    feet) stay transparent. Matches the macOS mask's 4-connected fill.

    Works on runs of transparent pixels per row instead of pixels, so
    a full-size case image takes milliseconds in pure Python.
    """
    if len(alpha) != width * height:
        raise ValueError("alpha buffer does not match width x height")
    passable = alpha.translate(_PASSABLE)
    runs = [
        [m.span() for m in _RUN.finditer(passable, y * width, (y + 1) * width)]
        for y in range(height)
    ]
    # Spans are buffer offsets; make them row-relative.
    runs = [
        [(a - y * width, b - y * width) for a, b in row]
        for y, row in enumerate(runs)
    ]
    ends = [[b for _a, b in row] for row in runs]
    reached = [bytearray(len(row)) for row in runs]

    stack = []
    for y, row in enumerate(runs):
        for i, (a, b) in enumerate(row):
            if y in (0, height - 1) or a == 0 or b == width:
                reached[y][i] = 1
                stack.append((y, i))
    while stack:
        y, i = stack.pop()
        a, b = runs[y][i]
        for ny in (y - 1, y + 1):
            if not 0 <= ny < height:
                continue
            # Runs sharing a column with [a, b) are 4-connected to it.
            j = bisect.bisect_right(ends[ny], a)
            while j < len(runs[ny]) and runs[ny][j][0] < b:
                if not reached[ny][j]:
                    reached[ny][j] = 1
                    stack.append((ny, j))
                j += 1

    for y, row in enumerate(runs):
        base, prev = y * width, 0
        for i, (a, b) in enumerate(row):
            if reached[y][i]:
                alpha[base + prev : base + a] = bytes([OPAQUE]) * (a - prev)
                prev = b
        alpha[base + prev : base + width] = bytes([OPAQUE]) * (width - prev)


def scaled_shape_rects(shape: tuple[BoxRect, ...], scale: float) -> list[Rect]:
    """The silhouette of a machine without a mask image: its shape rects
    in window pixels (corner radii are ignored; no current machine
    rounds them)."""
    rects = []
    for r in shape:
        if r.w <= 0 or r.h <= 0:
            continue
        x0, y0 = math.floor(r.x * scale), math.floor(r.y * scale)
        x1 = math.ceil((r.x + r.w) * scale)
        y1 = math.ceil((r.y + r.h) * scale)
        if x1 > x0 and y1 > y0:
            rects.append(Rect(x0, y0, x1 - x0, y1 - y0))
    return rects


# ---------------------------------------------------------------------------
# Take a Picture (the tank posts {op: "savePicture", name, png})

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
# Far above a 2x tank PNG (a few hundred KB); anything bigger is not
# one of the tank's pictures.
PICTURE_MAX_BYTES = 32 * 1024 * 1024
DEFAULT_PICTURE_NAME = "finsical.png"


def decode_picture(png_base64: Any) -> Optional[bytes]:
    """The PNG bytes of a savePicture message, or None when the payload
    is not base64 PNG data (or absurdly large)."""
    if not isinstance(png_base64, str):
        return None
    if len(png_base64) > PICTURE_MAX_BYTES * 4 // 3 + 4:
        return None
    try:
        data = base64.b64decode(png_base64, validate=True)
    except (binascii.Error, ValueError):
        return None
    return data if data.startswith(PNG_SIGNATURE) else None


def picture_file_name(suggested: Any) -> str:
    """The page's suggested file name without any directory parts."""
    if not isinstance(suggested, str):
        return DEFAULT_PICTURE_NAME
    name = suggested.replace("\\", "/").rsplit("/", 1)[-1].strip()
    if name in ("", ".", "..") or "\0" in name:
        return DEFAULT_PICTURE_NAME
    return name


# ---------------------------------------------------------------------------
# Web process crash recovery (macOS webViewWebContentProcessDidTerminate)

# A crashed page reloads after this delay, at most CRASH_RETRY_LIMIT
# times per CRASH_RETRY_WINDOW_S seconds; past that it is a
# deterministic crasher and its window stays blank rather than burning
# CPU on process spawns.
CRASH_RETRY_WINDOW_S = 60.0
CRASH_RETRY_LIMIT = 3
CRASH_RETRY_DELAY_MS = 500


class CrashLimiter:
    """Recent crash times for one web view."""

    def __init__(self) -> None:
        self._times: list[float] = []

    def allow_reload(self, now: float) -> bool:
        """Record a crash at `now` (seconds, monotonic); True while the
        view may still be reloaded."""
        self._times = [
            t for t in self._times if now - t <= CRASH_RETRY_WINDOW_S
        ] + [now]
        return len(self._times) <= CRASH_RETRY_LIMIT

    @property
    def recent(self) -> int:
        return len(self._times)


# ---------------------------------------------------------------------------
# The app menu (right-click on any window; accelerators on every window)


@dataclass(frozen=True)
class MenuEntry:
    action: str
    label: str
    accels: tuple[str, ...] = ()


# None separates groups. Ctrl+A/C/V/X/Z are never bound: text fields
# need them, and window accelerators run before the page sees a key.
APP_MENU: tuple[Optional[MenuEntry], ...] = (
    MenuEntry("overview", "Tank Overview", ("<Control>o",)),
    MenuEntry("stats", "Tank Stats", ("<Control><Shift>s",)),
    MenuEntry("import", "Import Add-ons\u2026", ("<Control>i",)),
    MenuEntry("prefs", "Preferences\u2026", ("<Control>comma",)),
    None,
    MenuEntry("feed", "Feed Fish", ("<Control>f",)),
    MenuEntry("water", "Change Water"),
    MenuEntry("crt", "CRT Effect", ("<Control>r",)),
    MenuEntry("lamp", "Lamp On", ("<Control>l",)),
    MenuEntry("mute", "Mute Sound", ("<Control><Alt>s",)),
    MenuEntry("pause", pause_label(False), ("<Control>p",)),
    MenuEntry("picture", "Take a Picture"),
    None,
    MenuEntry(
        "larger",
        "Larger",
        ("<Control>equal", "<Control>plus", "<Control>KP_Add"),
    ),
    MenuEntry(
        "smaller", "Smaller", ("<Control>minus", "<Control>KP_Subtract")
    ),
    MenuEntry("float-above", "Float Above Other Windows"),
    MenuEntry("all-desktops", "Show on All Desktops"),
    None,
    MenuEntry("donate", "Support the Internet Archive"),
    MenuEntry("help", "Finsical Help", ("F1",)),
    MenuEntry("about", "About Finsical"),
    MenuEntry("quit", "Quit Finsical", ("<Control>q",)),
)
# Hides the focused client window; not in the menu (the page has its
# own close box), and a no-op on the tank.
CLOSE_WINDOW_ACCEL = "<Control>w"

DONATE_URL = "https://archive.org/donate"
HELP_URL = "https://github.com/L-K-M/Finsical#readme"
HOMEPAGE_URL = "https://github.com/L-K-M/Finsical"
