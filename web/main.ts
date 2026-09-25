import { BOTTOM_PAD, DAY_TICKS, FOOD_ENTRY_Y, Sim,
         SURFACE, WAKE_LIGHT } from "../core/sim.js";
import { CLOCK_NIGHT_LIGHT, DEMO_NIGHT_LIGHT, lightAt, moonIllumination,
         nightFloor, sanitizeLighting, twilightTint } from "../core/light.js";
import { fishPose, pitch, restPose } from "../core/pose.js";
import { FISH_CAP, FOOD_CAP, HUNGER_SEEK, SPAWN_HUNGER, TANK_SIZE }
  from "../core/tuning.js";
import { planFrame } from "../core/loop.js";
import { Aquarium } from "../core/aquarium/aquarium.js";
import type { SavedAquarium } from "../core/aquarium/aquarium.js";
import { sanitizeLife } from "../core/aquarium/life.js";
import { DEFAULT_CARE, sanitizeCare } from "../core/data/species.js";
import type { SpeciesCare } from "../core/data/species.js";
import { conditionLabel, eventText, noticeText } from "./lifecopy.js";
import { decodeIndexedPng, loadAzpack, SpriteSheet } from "../core/data/azpack.js";
import { isPack } from "../core/data/fsh.js";
import { decodeDroppedPacks } from "./drop.js";
import { decorFrame, decorPhase, decorPhaseFrac }
  from "../core/data/decor.js";
import { bodySize, pickDrawableSheet }
  from "../core/data/swimsheet.js";
import { fishScale } from "./artscale.js";
import { panFor, sanitizeSoundConfig, TankAudio } from "./audio.js";
import { drawRipples, drawSplashes, newSplash, tickRipples,
         tickSplashes } from "./fx.js";
import type { Ripple, Splash } from "./fx.js";
import { pushButton } from "osmium-ui";
import { alertOpen, showAlert } from "./alert.js";
import { recentTaps, shouldScold } from "./scold.js";
import { backfillStarterSounds, showWelcome, wantsWelcome }
  from "./welcome.js";
import { clampDecorCopies, decorCopyRoom, fetchAddon, installProblem,
         mountImportPanel, orphanedSounds, recordAddon,
         qualifySoundItemName, isListed, usablePacks, usableProblem,
         COLLECTIONS }
  from "./import.js";
import { SWAY_BANDS, swayOffset } from "./sway.js";
import { fileSoundRecords, qualifySoundNames } from "../core/data/snd.js";
import { isLocalPack, LOCAL_PREFIX, packDelete, packPut, sndsGet,
         sndsMerge, sndsRemove } from "./store.js";
import { coverCrop, decorCanvases, imageCanvas, isBackdropImage,
         isGravelImage,
         previewOf, soundIcon, swimCanvas } from "./render.js";
import { placeholderFrames } from "./placeholder.js";
import { containPoint, isFeedZone } from "./feedzone.js";
import { PAW_ART, PAW_FIRST, PAW_FIRST_RANGE, PAW_FUR, PAW_GAP,
         PAW_GAP_RANGE, PAW_H, PAW_W, pawPose, pawSpawnX, pawSwatAt }
  from "./catpaw.js";
import type { PawVisit } from "./catpaw.js";
import { SNAIL_H, snailCanvas, snailPose, snailSpawn } from "./snail.js";
import { bootPhase, drawBoot, fadeProgress, paradeIcon }
  from "./boot.js";
import { fishThumbKey, inNativeShell, openBus } from "./bus.js";
import { claimTank } from "./tankclaim.js";
import { docOpen, menuOpen, mountTankMenuBar, openClientWindow }
  from "./menubar.js";
import { stateLabel } from "./overviewmodel.js";
import { initCrt, sanitizeCrtConfig } from "./crt.js";
import { bubbleOffset, bubblePops, drawAir, drawBubblePop,
         drawBubbles, drawFood, drawLight, drawMurk, drawRefraction,
         drawSurface, feedPinch, sunFactor, tapBubble } from "./water.js";
import { disturbSurface, newSurface, surfaceLine, SURFACE_W, tickSurface }
  from "./surface.js";
import {
  DEFAULT_MACHINE, glassRect, machineById, rasterInGlass, SCREENBACK_HOLE_PAD,
  shellMarkup,
} from "./machines.js";
import type { CrtConfig } from "./crt.js";
import type { WaterMotion } from "./water.js";
import type { SoundConfig } from "./audio.js";
import type { Machine } from "./machines.js";
import type { Lighting } from "../core/light.js";
import type { BusMsg } from "./bus.js";
import type { Importable } from "./import.js";
import type { Fish } from "../core/sim.js";
import type { SnailVisit } from "./snail.js";
import type { AzpackManifest, IndexedImage } from "../core/data/azpack.js";

const TANK = TANK_SIZE;
const TICKS_PER_SECOND = 30;
const STEP_MS = 1000 / TICKS_PER_SECOND;

const canvas = document.getElementById("tank") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
ctx.imageSmoothingEnabled = false;

// The loop only draws after a sim tick; requestPaint() asks for one draw
// without a tick, for changes the sim doesn't make (feeding, taps,
// installs, removals, settings) so they show at once even while no
// tick runs. Declared first: module-level setup (setCrt, lighting)
// already requests paints while the module evaluates.
let frameDirty = true;
function requestPaint(): void { frameDirty = true; }

/** Sim id the Overview's selection spotlights; null = none. */
let focusId: number | null = null;
// The Overview re-asserts its selection on a heartbeat — the focus is
// a lease, not a toggle. BroadcastChannel has no disconnect event and
// a bfcache eviction fires no pagehide, so without an expiry a
// vanished overview would leave its spotlight on the fish forever.
// Wall-clock, not ticks: a paused sim never advances tickCount, which
// would freeze the lease mid-flight.
let focusAt = -Infinity;
let focusOwner = "";
/** Wall-clock ms a focus stays live without a re-assert. Sized past
 * the ~60 s clamp browsers put on hidden-tab timers. */
const FOCUS_TTL = 180_000;

// ---- persistence ---------------------------------------------------------
// Tank state (fish, water, installed add-ons) survives restarts via
// localStorage. Add-ons are re-imported on launch — archives are
// immutable per URL so the same packs come back, in install order, so
// each fish's saved sheetIdx still points at the right sprite sheet.
const SAVE_KEY = "finsical:tank";
interface SavedTank {
  // v=1 predates fish spawning on install: its addons list can hold fish
  // packs the roster never gained. v=2 rosters are authoritative.
  v: 1 | 2;
  tickCount: number;
  waterQuality: number;
  fish: Partial<Fish>[];
  addons: Importable[];
  /** The chosen scenery (see sceneryChoice) — add-on urls. */
  scenery?: SceneryChoice;
  /** Water, equipment and medicine (core/aquarium); absent in saves
   * from before the life model, which start with fresh aged water. */
  aquarium?: SavedAquarium;
  /** When this was saved (ms since 1970): the time the tank was away,
   * which the aquarium catches up on the next launch. */
  savedAt?: number;
  /** Each installed fish pack's care needs, by pack url, so catch-up
   * can run before the packs themselves have restored. */
  care?: Record<string, SpeciesCare>;
}
/** The structural check shared by loadTank and tank-file import:
 * unknown keys ride along — save fields this build doesn't know yet
 * belong to a newer version, not to us. */
function parseTank(raw: unknown): SavedTank | null {
  const s = raw as SavedTank;
  if ((s?.v !== 1 && s?.v !== 2) ||
      !Array.isArray(s.fish) || !Array.isArray(s.addons) ||
      // Fish entries only need to be objects: the restore path's
      // filter + sanitizeSavedFish drop or clamp anything malformed.
      // Addons get no such treatment — they're fetched as URLs, so
      // reject non-strings here.
      !s.addons.every((u) => typeof u === "string"))
    return null;
  return s;
}
function loadTank(): SavedTank | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? parseTank(JSON.parse(raw)) : null;
  } catch { return null; }
}
const saved = loadTank();
const installedAddons: Importable[] = [...(saved?.addons ?? [])];

// ---- startup parade (web/boot.ts) ---------------------------------------
// A 90s-Mac boot over the first seconds: black, the smiling fishbowl
// on a grey desktop, restored add-ons marching in along the bottom,
// then a fade to the water. Skipped with nothing to restore, under
// reduced motion, or when the Tank menu turns it off; a click or a
// key skips it outright.
const BOOT_KEY = "finsical:boot";
let bootEnabled = true;
try { bootEnabled = localStorage.getItem(BOOT_KEY) !== "off"; }
catch { /* storage unavailable: default on */ }
let bootT0 = bootEnabled && installedAddons.length > 0 &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ? performance.now() : null;
let bootDoneAt: number | null = null; // elapsed ms when restore settled
const paradeIcons: string[][] = [];   // one icon per restored add-on
function skipBoot(): void {
  if (bootT0 === null) return;
  bootT0 = null;
  requestPaint();
}
// The scenery the user chose: what their latest live install, "Use"
// or Remove put on display. It is saved instead of what happens to be
// showing, so a chosen pack that can't restore on one launch doesn't
// lose its place to whatever the restore chain showed instead.
type SceneryKind = "backdrop" | "gravel";
type SceneryChoice = Partial<Record<SceneryKind, string>>;
const sceneryChoice: SceneryChoice = {};
for (const kind of ["backdrop", "gravel"] as const) {
  const url: unknown = (saved?.scenery as SceneryChoice | undefined)?.[kind];
  if (typeof url === "string" && url !== "") sceneryChoice[kind] = url;
}
// A v=1 save keeps writing v=1 until reconcileFish() has run once —
// otherwise an offline first launch would stamp the roster "final"
// before its fish packs could restore.
let rosterComplete = saved?.v !== 1;

// A random seed, so each launch plays a fresh tape rather than the
// same one — tests keep determinism by passing a seed to Sim().
// ?seed=<uint32> pins the tape so a reported oddity can be replayed.
const seedParam = new URLSearchParams(location.search).get("seed");
const seedPinned = seedParam !== null && /^\d{1,10}$/.test(seedParam)
  && Number(seedParam) <= 0xFFFFFFFF;
if (seedParam !== null && !seedPinned)
  console.warn("tank sim: ignoring invalid ?seed= (expected uint32):",
               seedParam);
const simSeed = seedPinned
  ? Number(seedParam) >>> 0
  : (Math.random() * 0x100000000) >>> 0;
// console.log, not debug — Chrome's default filter hides Verbose.
console.log("tank sim seed:", simSeed);
const sim = new Sim(TANK, simSeed);
const audio = new TankAudio();
// Hidden (Cmd-H, minimized, background tab): rAF stops and the sim
// freezes, so the ambient loop and the audio device pause with it.
const syncAudioVisibility = (): void => audio.setHidden(document.hidden);
document.addEventListener("visibilitychange", syncAudioVisibility);
syncAudioVisibility();
if (saved) {
  // Storage is untrusted: a negative or fractional tick count would
  // re-persist and skew the day cycle.
  if (Number.isFinite(saved.tickCount))
    sim.tickCount = Math.max(0, Math.trunc(saved.tickCount));
  if (saved.aquarium)
    sim.aquarium = Aquarium.fromJSON(saved.aquarium,
                                     () => Math.random());
}
// Species care by pack url: from the save now, from each pack as it
// (re)installs. Fish without a known pack get the stand-in's needs.
const careByPack = new Map<string, SpeciesCare>();
for (const [url, raw] of Object.entries(saved?.care ?? {})) {
  const c = sanitizeCare(raw);
  if (c) careByPack.set(url, c);
}
sim.careOf = (f) =>
  (f.pack !== undefined ? careByPack.get(f.pack) : undefined) ?? DEFAULT_CARE;
// Wall-clock time (ms) the aquarium has been run up to. The tank lives
// on real time like the original — at speed 1 a stomach empties in 18
// hours — so the time since the last save is caught up at launch.
let lifeClock = typeof saved?.savedAt === "number" &&
  Number.isFinite(saved.savedAt) && saved.savedAt <= Date.now()
  ? saved.savedAt : Date.now();
// The water change Tank ▸ Change Water repeats: the last one set in
// Tank Stats (default a fifth of the tank at the heater's temperature).
const CHANGE_KEY = "finsical:waterChange";
interface WaterChange { fraction: number; temp: number }
let waterChangeCfg: WaterChange = (() => {
  try {
    const o = JSON.parse(localStorage.getItem(CHANGE_KEY) ?? "null") as
      Partial<WaterChange> | null;
    const f = o?.fraction, t = o?.temp;
    if (typeof f === "number" && Number.isFinite(f) &&
        typeof t === "number" && Number.isFinite(t))
      return { fraction: Math.min(0.9, Math.max(0.01, f)),
               temp: Math.min(36, Math.max(16, t)) };
  } catch { /* storage unavailable */ }
  return { fraction: 0.2, temp: sim.aquarium.heater.target };
})();

// ---- lighting -------------------------------------------------------------
// The demo cycle runs inside the sim; the light timer follows this
// Mac's clock (core/light.ts). The clock is read here and handed to
// the sim, which stays tick-only. Declared this early because
// postState() reads it and runs during module eval.
const LIGHTING_KEY = "finsical:lighting";
let lighting: Lighting = (() => {
  try {
    return sanitizeLighting(
      JSON.parse(localStorage.getItem(LIGHTING_KEY) ?? "null"));
  } catch { return sanitizeLighting(null); /* storage: defaults */ }
})();
const minutesOfDay = (d: Date): number =>
  d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
function syncLight(now: Date): void {
  const before = sim.light;
  sim.setLight(lightAt(minutesOfDay(now), lighting));
  // A paused tank runs no ticks, but the timer's light still moves.
  if (sim.light !== before) requestPaint();
}
syncLight(new Date());
/** Merge a partial schedule (prefs pop-up) onto the current one. */
function applyLighting(raw: unknown): void {
  const lampWas = lighting.lamp;
  lighting = sanitizeLighting(raw, lighting);
  if (lighting.lamp !== lampWas) audio.lampSwitch();
  syncLight(new Date());
  requestPaint(); // shows at once, even while no tick runs
  try { localStorage.setItem(LIGHTING_KEY, JSON.stringify(lighting)); }
  catch { /* storage unavailable */ }
  postState();
}
const DEFAULT_FISH: (Partial<Fish> & { x: number; y: number })[] =
  [0, 1, 2, 3].map((i) =>
    ({ x: 40 + i * 60, y: 50 + i * 30, facing: (i % 2 ? -1 : 1) as 1 | -1,
       hunger: SPAWN_HUNGER }));
/** Saved fish fields are untrusted input: a corrupted hunger or
 * heading enters the sim (NaN hunger ⇒ fish can never seek food) and
 * then re-persists. Clamp each numeric field; keep x/y finite-or-drop
 * as the hard filter. */
function sanitizeSavedFish(f: Partial<Fish> & { x: number; y: number }):
    Partial<Fish> & { x: number; y: number } {
  const num = (v: number | undefined, lo: number, hi: number,
               dflt: number): number =>
    typeof v === "number" && Number.isFinite(v)
      ? Math.min(hi, Math.max(lo, v)) : dflt;
  // bandY's fallback must reuse the clamped y — the raw value only
  // passed the finite check, so a corrupt save could seed an
  // out-of-bounds band and re-persist it.
  const y = num(f.y, 0, TANK.height - 1, TANK.height / 2);
  // Only the fields saveTank writes come back: anything else a save
  // carries stays out of the sim rather than passing through unchecked.
  const out: Partial<Fish> & { x: number; y: number } = {
    x: num(f.x, 0, TANK.width - 1, TANK.width / 2),
    y,
    facing: f.facing === -1 ? -1 as const : 1 as const,
    heading: num(f.heading, -2 * Math.PI, 2 * Math.PI, 0),
    speed: num(f.speed, 0.1, 8, 1),
    cruise: num(f.cruise, 0.1, 8, 1),
    vy: num(f.vy, -8, 8, 0),
    bandY: num(f.bandY, 0, TANK.height - 1, y),
    hunger: num(f.hunger, 0, 1, 0.2),
    // Pre-growth saves carry no scale: those fish are grown, not
    // juveniles. addFish clamps the value into the sim's range.
    scale: typeof f.scale === "number" && Number.isFinite(f.scale)
      ? f.scale : 1,
    species: typeof f.species === "string" ? f.species : "",
  };
  // Optional fields drop rather than zero out — a bogus sheetIdx or
  // pack must read as "no binding", not bind to slot 0.
  if (Number.isInteger(f.id) && f.id! >= 0) out.id = f.id!;
  if (Number.isInteger(f.sheetIdx) && f.sheetIdx! >= 0)
    out.sheetIdx = f.sheetIdx!;
  if (typeof f.pack === "string") out.pack = f.pack;
  const life = sanitizeLife(f.life);
  if (life) {
    out.life = life;
    // A body is found on the bottom, as the original reloads its
    // dead: it settles straight there rather than floating up again.
    if (life.dead) out.corpse = "sink";
  }
  if (typeof f.entry === "string") out.entry = f.entry;
  return out;
}
const roster = (saved?.fish ?? [])
  .filter((f): f is Partial<Fish> & { x: number; y: number } =>
    !!f && Number.isFinite(f.x) && Number.isFinite(f.y))
  .map(sanitizeSavedFish);
// A saved, deliberately empty v=2 roster stays empty (Empty Tank, or
// every fish removed); only a missing or pre-roster save gets starters.
const keepEmpty = saved?.v === 2 && saved.fish.length === 0;
// A fresh tank's stand-ins, which the starter set replaces when the
// user accepts it on first launch (web/welcome.ts).
const placeholderIds = new Set<number>();
if (roster.length || keepEmpty) for (const f of roster) sim.addFish(f);
else for (const f of DEFAULT_FISH) placeholderIds.add(sim.addFish(f).id);

// ---- life clock and notices --------------------------------------------
// Fish that die, fall sick or recover are announced like the original's
// event dialogs; a burst (a long catch-up) folds into one notice.
const pendingNotices: string[] = [];
function collectEvents(): void {
  const ev = sim.aquarium.events.splice(0);
  for (const e of ev) {
    const f = sim.fish.find((x) => x.id === e.fish);
    pendingNotices.push(eventText(e, f?.species || "A fish"));
  }
  if (ev.length) { requestPaint(); saveTank(); }
}
function showNotices(): void {
  if (!pendingNotices.length || alertOpen()) return;
  showAlert({ icon: "note", text: noticeText(pendingNotices.splice(0)),
              buttons: [{ title: "OK", default: true, cancel: true }] });
}
/** Run the aquarium up to now. Paused, time stands still (the
 * original's speed 0). */
function runLife(): void {
  const now = Date.now();
  if (!paused && now > lifeClock) sim.advanceLife((now - lifeClock) / 1000);
  lifeClock = now;
  collectEvents();
}

// Two same-origin tank tabs would both simulate, both answer every
// mutating bus op, and both write SAVE_KEY — last writer wins and the
// saves interleave. The first tab holds a lease; a second runs the
// tank view-only — sim and render still go, but nothing saves and no
// bus message is answered — until the owner's lease lapses or its
// pagehide releases it, then reloads to take over.
const claim = claimTank(() => location.reload()); // lease stolen
                                                  // mid-session
const tankOwner = claim.owned;
if (!tankOwner) {
  setInterval(() => { if (claim.ownerGone()) location.reload(); },
              1_500);
  showAlert({
    icon: "note",
    text: "Finsical is already open in another window. This copy is " +
          "view only — it won't save.",
    buttons: [{ title: "OK", default: true, cancel: true }],
  });
}

function tankSnapshot(): SavedTank {
  return {
    v: rosterComplete ? 2 : 1,
    tickCount: sim.tickCount, waterQuality: sim.waterQuality,
    // Corpses don't get saved — a dead fish stays dead.
    fish: sim.fish.filter((f) => f.state !== "dead").map((f) => ({
      id: f.id, species: f.species, x: f.x, y: f.y, facing: f.facing,
      heading: f.heading, speed: f.speed, cruise: f.cruise, vy: f.vy,
      bandY: f.bandY, hunger: f.hunger, scale: f.scale,
      ...(f.sheetIdx !== undefined ? { sheetIdx: f.sheetIdx } : {}),
      ...(f.pack !== undefined ? { pack: f.pack } : {}),
      ...(f.life ? { life: f.life } : {}),
    })),
    addons: installedAddons,
    scenery: sceneryChoice,
    aquarium: sim.aquarium.toJSON(),
    savedAt: lifeClock,
    care: Object.fromEntries(careByPack),
  };
}
// Set by a tank import before it reloads: the pagehide /
// visibilitychange handlers would otherwise save the OLD tank over
// the freshly imported SAVE_KEY during unload.
let suppressSave = false;
// A bfcache restore brings back the pre-import page: clearing the
// flag would let its stale tank overwrite the imported SAVE_KEY on
// the next visibilitychange, so reload into the imported tank —
// the same strategy the import flow itself uses.
window.addEventListener("pageshow", (e) => {
  if (e.persisted && suppressSave) location.reload();
});
function saveTank(): void {
  // A spectator never writes the shared save.
  if (suppressSave || !tankOwner) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(tankSnapshot()));
  } catch { /* storage unavailable — the tank still runs */ }
  postState(); // panel keeps fresh state even if persistence is off
}
// ---- tank files -----------------------------------------------------------
// A .fins file is the saved-tank JSON — how an aquarium moves between
// Macs or survives a cleared profile. Add-ons are stored by URL, so an
// imported tank re-downloads its packs on the next launch.
function exportTank(): void {
  const blob = new Blob([JSON.stringify(tankSnapshot(), null, 2)],
                        { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "finsical-tank.fins";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

const tankFile = document.createElement("input");
tankFile.type = "file";
tankFile.accept = ".fins,application/json";
tankFile.style.display = "none";
document.body.appendChild(tankFile);
tankFile.addEventListener("change", () => {
  const f = tankFile.files?.[0];
  tankFile.value = ""; // picking the same file twice must re-fire
  if (!f) return;
  // A saved tank is a few KB of JSON; anything bigger isn't one, and
  // a huge file would freeze the tab in JSON.parse before parseTank
  // ever saw it.
  if (f.size > 5_000_000) {
    showAlert({ icon: "caution",
                text: "That file is too big to be a Finsical tank.",
                buttons: [{ title: "OK", default: true, cancel: true }] });
    return;
  }
  void f.text().then((text) => {
    const parsed = parseTank(JSON.parse(text));
    if (!parsed) {
      showAlert({ icon: "caution",
                  text: "That file isn't a Finsical tank.",
                  buttons: [{ title: "OK", default: true, cancel: true }] });
      return;
    }
    // The launch path does the rest: roster, add-ons, scenery. Write
    // and reload rather than swap a live tank out from under the sim.
    try {
      // Keep the outgoing tank recoverable — import has no confirm.
      // Skip the write when there's nothing to back up: an empty
      // string isn't valid JSON and would need special-casing later.
      try {
        const prior = localStorage.getItem(SAVE_KEY);
        if (prior !== null)
          localStorage.setItem(SAVE_KEY + ".bak", prior);
      } catch { /* backup is best-effort */ }
      localStorage.setItem(SAVE_KEY, JSON.stringify(parsed));
    } catch {
      showAlert({ icon: "caution",
                  text: "The tank couldn't be saved — storage is " +
                        "unavailable.",
                  buttons: [{ title: "OK", default: true, cancel: true }] });
      return;
    }
    // Reload fires pagehide/visibilitychange, whose saveTank calls
    // would overwrite the import with a snapshot of the old tank.
    suppressSave = true;
    location.reload();
  }).catch(() => {
    showAlert({ icon: "caution",
                text: "That file couldn't be read as a tank.",
                buttons: [{ title: "OK", default: true, cancel: true }] });
  });
});
function importTank(): void { tankFile.click(); }

window.addEventListener("pagehide", saveTank);
// WKWebView doesn't reliably deliver pagehide on quit; it does
// deliver visibilitychange.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") saveTank();
});
// Every mutation path already calls saveTank() directly, so the
// interval's 10 s cadence only needs to keep client windows fed —
// postState — while a ≥60 s elapsed guard persists clock/position
// drift. localStorage writes drop from 6/min to 1/min of idle
// main-thread serialization instead of hitching a frame on slow
// storage. Monotonic elapsed time, not a tick count or wall clock:
// hidden tabs throttle the interval itself (~1/min under Chrome's
// intensive throttling) so counting fires would stretch the save to
// ~6 min, and a backward NTP step would freeze it just as long.
// (Caveat: some platforms pause this clock during system suspend —
// fine here, since a suspended tab can't mutate state anyway.)
let lastSaveAt = performance.now();
setInterval(() => {
  postState();
  if (performance.now() - lastSaveAt >= 60_000) {
    lastSaveAt = performance.now();
    saveTank();
  }
}, 10_000);

// The canvas box only moves when the machine layout is recomputed —
// cache the bounding rect so per-frame hover work doesn't force a
// layout read every rAF. layoutMachine() drops it; the scroll/resize
// listeners below cover paths that can move the box without a layout
// pass (the page is position:fixed, so this is belt-and-suspenders).
let canvasRect: DOMRect | null = null;
function tankRect(): DOMRect {
  return canvasRect ??= canvas.getBoundingClientRect();
}
window.addEventListener("resize", () => { canvasRect = null; });
document.addEventListener("scroll", () => { canvasRect = null; },
                          { capture: true });

/** CSS-pixel pointer coords → tank-space point; null in the
 * letterbox bars (object-fit: contain inside the element box). */
function tankPoint(clientX: number, clientY: number):
    { x: number; y: number } | null {
  return containPoint(clientX, clientY, tankRect(), TANK);
}

/** The fish under a tank point. None in the air above the waterline:
 * a fin reaching up there only shows dimmed through the air, and a click
 * there feeds. */
function fishAtPoint(p: { x: number; y: number }): Fish | null {
  return isFeedZone(p.x, p.y, waterline) ? null : sim.fishAt(p.x, p.y);
}

// Feed-zone affordance: over the air above the waterline, where a
// click drops food, the cursor becomes a crosshair and the waterline
// brightens (see render()). Hover is re-evaluated every frame from the
// last client point (see frame()), so a resize under a stationary
// pointer can't leave it stale, and getBoundingClientRect runs once
// per frame instead of per move.
let overFeedZone = false;
let lastClient: { x: number; y: number } | null = null;
function setFeedHover(on: boolean): void {
  if (on === overFeedZone) return;
  overFeedZone = on;
  canvas.style.cursor = on ? "crosshair" : "";
  requestPaint();
}
function syncFeedHover(): void {
  if (!lastClient) { setFeedHover(false); return; }
  const p = containPoint(lastClient.x, lastClient.y,
                         tankRect(), TANK);
  // Paused drops the affordance too — the click below is gated the
  // same way, so the cursor mustn't promise a feed that won't land.
  setFeedHover(p !== null && !paused &&
               isFeedZone(p.x, p.y, waterline));
}

canvas.addEventListener("pointerdown", (e) => {
  if (bootT0 !== null) { skipBoot(); return; } // a click skips the boot
  if (e.button !== 0) return; // ignore right/middle clicks
  const p = tankPoint(e.clientX, e.clientY);
  if (!p) return; // letterbox bar
  if (alertOpen()) return; // the alert's scrim covers the tank anyway
  audio.unlock(); // an ⌥-click is a gesture too
  if (e.altKey) {
    // ⌥-click is "Get Info": open the card on the fish under the
    // pointer, or dismiss it when the water is empty.
    const f = fishAtPoint(p);
    if (f) openInfo(f); else closeInfo();
    return;
  }
  // A paused tank ignores knocks and feeding — the ripples, splashes
  // and pellets would freeze mid-animation and fire all at once on
  // resume. ⌥-click Get Info above still works: the card reads the
  // frozen sim fine.
  if (paused) return;
  if (isFeedZone(p.x, p.y, waterline)) {
    const pellet = sim.dropFood(p.x);
    if (pellet) {
      audio.feed(panFor(pellet.x, TANK.width));
      splashAt(pellet.x, pellet.y, PUSH.pellet);
    } else {
      noteFoodRefused();
    }
  } else {
    sim.tap(p.x, p.y); audio.tap(p.x, p.y, TANK.width, TANK.height);
    // A rising bubble under the tap pops early — the knock already
    // ripples; this is the toy on top. The nearest bubble inside its
    // drawn radius (plus a finger's worth of slop) wins, so clustered
    // bubbles pop the one the tap actually touched.
    const bi = tapBubble(sim.bubbles, p.x, p.y);
    if (bi >= 0) {
      const [b] = sim.bubbles.splice(bi, 1);
      // The same pop ring the waterline path draws — a tap-pop reads
      // as a pop, not a vanish.
      pops.push({ x: b!.x + bubbleOffset(b!.x, b!.y), y: b!.y, age: 0 });
    }
    ripples.push({ x: p.x, y: p.y, age: 0 });
    // The glass knock slops the water a little, on the tapped side.
    disturbSurface(surface, p.x, PUSH.tap, 8);
    noteGlassTap();
  }
  requestPaint();
});
// The nearest calm fish notices the hovering pointer and drifts over
// to look — hunger and panic still outrank curiosity in the sim.

// Hover a fish and its species (and mood) pops up in a little
// balloon — a nod to System 7's Balloon Help.
const fishTip = document.createElement("div");
fishTip.id = "fishtip";
fishTip.style.display = "none";
document.body.appendChild(fishTip);
/** The fish to name under a hovered point — none while Get Info, a
 * menu, the add-on window, a document window or an alert is up (the
 * tip would float over them). */
const anyOverlayOpen = (): boolean =>
  !!(infoCard || importPanel.isOpen || menuOpen() || docOpen() || alertOpen());
const fishToName = (p: { x: number; y: number }): Fish | null =>
  anyOverlayOpen() ? null : fishAtPoint(p);
const fishTipLabel = (f: Fish): string =>
  (f.species || "Fish") +
  (f.life?.dead || f.life?.sick ? ` — ${conditionLabel(conditionOf(f))}`
    : f.state === "drift" ? "" : ` — ${stateLabel(f.state)}`);
function conditionOf(f: Fish): { health?: number; sick?: number | null;
                                dead?: number | null } {
  const l = f.life;
  return l ? { health: l.health, sick: l.sick?.disease ?? null,
               dead: l.dead?.cause ?? null } : {};
}
// Tank coords of the last hover — the frame loop re-checks it so the
// tip doesn't linger when the fish swims away from a parked cursor.
let lastHover: { x: number; y: number } | null = null;

/** The hover tip for a tank point: the fish's name, or in the air
 * strip a hint that a click drops food there. fishToName already
 * declines while Get Info, a menu or an alert is up — the hint
 * follows the same rule. */
function tipForPoint(p: { x: number; y: number }): string | null {
  const f = fishToName(p);
  if (f) return fishTipLabel(f);
  if (anyOverlayOpen()) return null;
  return !paused && isFeedZone(p.x, p.y, waterline)
    ? "Click to feed" : null;
}

function placeTip(e: { clientX: number; clientY: number }): void {
  fishTip.style.display = "";
  // Clamp inside the viewport — the tank usually fills the window,
  // so an unclamped +14 offset clips at the right and bottom edges.
  fishTip.style.left = `${Math.max(4, Math.min(e.clientX + 14,
    innerWidth - fishTip.offsetWidth - 4))}px`;
  fishTip.style.top = `${Math.max(4, Math.min(e.clientY + 14,
    innerHeight - fishTip.offsetHeight - 4))}px`;
}

canvas.addEventListener("pointermove", (e) => {
  lastClient = { x: e.clientX, y: e.clientY };
  if (!e.isPrimary) return; // one pointer drives curiosity
  const p = tankPoint(e.clientX, e.clientY);
  sim.notice = p;
  if (e.pointerType === "touch") return; // no hover on touch
  lastHover = p;
  const tip = p && tipForPoint(p);
  if (!tip) { fishTip.style.display = "none"; return; }
  fishTip.textContent = tip;
  placeTip(e);
});
canvas.addEventListener("pointerleave", (e) => {
  lastClient = null;
  lastHover = null;
  fishTip.style.display = "none";
  setFeedHover(false); // pointer is definitionally off the tank — clear now
  if (!e.isPrimary) return; // don't clear the primary's curiosity
  sim.notice = null;
});

// ---- fish Get-Info card -------------------------------------------------
// A tiny Mac window that follows the ⌥-clicked fish — its name, hunger
// and mood. Closed by its close box, Escape, an ⌥-click on empty water,
// or the fish leaving the tank.
let infoCard: {
  root: HTMLElement; hunger: HTMLElement; mood: HTMLElement; fish: Fish;
} | null = null;

function closeInfo(): void {
  infoCard?.root.remove();
  infoCard = null;
}

function openInfo(f: Fish): void {
  if (zen) setZen(false); // the card is chrome — show it, leave zen
  closeInfo();
  fishTip.style.display = "none"; // the card says more
  const root = document.createElement("div");
  root.className = "finfo";
  const title = document.createElement("div");
  title.className = "fintitle";
  const close = document.createElement("button");
  close.className = "finclose";
  close.type = "button";
  close.setAttribute("aria-label", "Close");
  close.addEventListener("click", () => closeInfo());
  const name = document.createElement("div");
  name.className = "finname";
  name.textContent = f.species || "Fish";
  title.append(close, name);
  const body = document.createElement("div");
  body.className = "finbody";
  const hunger = document.createElement("div");
  const mood = document.createElement("div");
  body.append(hunger, mood);
  root.append(title, body);
  // A press on the card is on the card — never feed or tap through it.
  root.addEventListener("pointerdown", (e) => e.stopPropagation());
  // On body, not #screen: #screen's stacking context paints under
  // #machine, so a card inside it slid under the glass reflections.
  document.body.appendChild(root);
  infoCard = { root, hunger, mood, fish: f };
  // Position now, not next frame: unpositioned the card would paint
  // once at its in-flow default (the end of body) before landing.
  layoutInfo();
}

/** Reposition the card over its fish and refresh the two live lines.
 * Runs every frame from frame() while a card is open; the fish's
 * removal closes it. */
function layoutInfo(): void {
  const card = infoCard;
  if (!card) return;
  const f = card.fish;
  if (!sim.fish.includes(f)) { closeInfo(); return; }
  // Fixed on body, so card space is viewport coordinates.
  const r = canvas.getBoundingClientRect();
  const s = Math.min(r.width / TANK.width, r.height / TANK.height);
  const ox = r.left + (r.width - TANK.width * s) / 2;
  const oy = r.top + (r.height - TANK.height * s) / 2;
  const cw = card.root.offsetWidth, ch = card.root.offsetHeight;
  let px = ox + f.x * s - cw / 2;
  let py = oy + f.y * s - ch - 8;
  if (py < r.top) py = oy + f.y * s + 16; // too near the surface: go under
  // Clamp inside the tank rect — the card can't slide under the
  // case's bezel edge or off the window.
  card.root.style.left =
    `${Math.max(r.left, Math.min(px, r.right - cw))}px`;
  card.root.style.top =
    `${Math.max(r.top, Math.min(py, r.bottom - ch))}px`;
  const hunger = f.life?.dead ? conditionLabel(conditionOf(f))
    : `Health  ${f.life?.health ?? 100}%  Hunger  ${Math.round(f.hunger * 100)}%`;
  const mood = f.life?.sick && !f.life.dead
    ? conditionLabel(conditionOf(f)) : stateLabel(f.state);
  if (card.hunger.textContent !== hunger)
    card.hunger.textContent = hunger;
  if (card.mood.textContent !== mood) card.mood.textContent = mood;
}

// A knocking spree gets the public aquarium's sign (web/scold.ts).
const SCOLD_KEY = "finsical:scoldSign";
let glassTaps: number[] = [];
let scoldedAt: number | null = null;
let scoldOn = true;
try { scoldOn = localStorage.getItem(SCOLD_KEY) !== "off"; }
catch { /* storage unavailable */ }
function noteGlassTap(): void {
  if (!scoldOn) return;
  const now = performance.now();
  glassTaps = [...recentTaps(glassTaps, now), now];
  if (!shouldScold(glassTaps, now, scoldedAt)) return;
  scoldedAt = now;
  glassTaps = [];
  showAlert({ icon: "caution",
              text: "Please don't tap on the glass. It frightens the fish.",
              buttons: [{ title: "OK", default: true, cancel: true }] });
}

// A refused feed (the tank already holds MAX_UNEATEN pellets) says so
// once — a silent no-op would read as a broken click.
let foodRefusedAt = -Infinity; // first refusal always shows
function noteFoodRefused(): void {
  const now = performance.now();
  if (now - foodRefusedAt < 60_000) return;
  foodRefusedAt = now;
  showAlert({ icon: "note",
              text: "The tank is full of food the fish haven't eaten. " +
                    "More would only foul the water.",
              buttons: [{ title: "OK", default: true, cancel: true }] });
}

// ---- sprite loading ----------------------------------------------------
// Drop an emitted .azpack into web/pack/ (manifest.json at its root), or
// drag the folder onto the window, and real Aquazone sprites replace the
// placeholder fish.
// The adult swim ring per imported pack; fish bind to their own pack's
// or species' sheet so a tank can mix species.
let fishSheets: SpriteSheet[] = [];
function usePack(pack: { sheets: Map<string, SpriteSheet>;
                         manifest?: AzpackManifest },
                 read?: (path: string) => Promise<Uint8Array>): number {
  const sheet = pickDrawableSheet(pack.sheets.values());
  if (sheet) {
    fishSheets.push(sheet);
    // A new sheet can resolve a fish whose binding was out of range.
    for (const f of sim.fish) bindExtents(f);
  }
  if (pack.manifest && read)
    void audio.load(read, pack.manifest)
      .then(() => audio.startAmbient())
      .catch((e) => console.warn("audio load failed:", e));
  return sheet ? fishSheets.length - 1 : -1;
}

/** Whether a spawn honors FISH_CAP. Healing a pre-cap roster bypasses
 * it: those fish were installed before the cap existed. */
type CapRule = "enforce" | "bypass";

/** Why the tank refuses a new fish, or null when there is room. Both
 * install paths (the in-page panel and the Import Add-ons window) ask
 * this before fetching, so neither reports a fish that never spawns. */
function fishRefusal(section: string): string | null {
  if (section !== "fish" || sim.fish.length < FISH_CAP) return null;
  return `The tank is full: ${FISH_CAP} fish is plenty. ` +
         "Release one from Tank Overview first.";
}

/** A newly installed fish pack adds one fish bound to its sheet —
 * "Add again" adds another of the same species. `pack` is the add-on's
 * install URL: the precise identity when packs share a species name.
 * Returns the new fish, or null when the tank is already full. */
function spawnFish(sheetIdx: number, species: string, pack?: string,
                   cap: CapRule = "enforce", entry?: string): Fish | null {
  if (cap === "enforce" && sim.fish.length >= FISH_CAP) return null;
  const facing = Math.random() < 0.5 ? 1 : -1;
  const x = 60 + Math.random() * (TANK.width - 120);
  const f = sim.addFish({
    x,
    // New fish enter through the surface, where the splash below lands
    // — not mid-tank, which read as a pop-in. A little vy sells the
    // drop until steering takes over.
    y: FOOD_ENTRY_Y + 6 + Math.random() * 14,
    vy: 0.4,
    facing: facing as 1 | -1,
    heading: facing > 0 ? 0 : Math.PI,
    cruise: 1.1 + Math.random() * 0.7,
    hunger: SPAWN_HUNGER,
    sheetIdx, species,
    ...(pack !== undefined ? { pack } : {}),
    ...(entry !== undefined ? { entry } : {}),
  });
  bindExtents(f);
  // A new fish enters through the surface — pair the splash sound
  // with droplets where it went in.
  splashAt(x, FOOD_ENTRY_Y, PUSH.newFish);
  saveTank();
  requestPaint();
  return f;
}

/** A drop-time spawn: splash on success, say why on refusal — after
 * the idx guard, spawnFish only declines a full tank. Drops have no
 * panel to ack, so the explanation goes to the console. */
function spawnFromDrop(idx: number, species: string): Fish | null {
  if (idx < 0) return null;
  const f = spawnFish(idx, species);
  if (f) audio.splash(panFor(f.x, TANK.width));
  else console.warn(`Tank is full — ${FISH_CAP} fish max. ` +
    "Release one from Tank Overview first.");
  return f;
}

// Biggest pack image large enough to matter becomes the tank backdrop —
// tiny fish portraits/icons are skipped. Wide, short images (Aquazone
// .grv beds are ~6:1) become the gravel strip instead.
// `src` records which add-on provided the art ("" = bundled/dropped) so
// the overview can remove a pack's visuals again.
// Picks are kept per source pack so removing the current winner falls
// back to an earlier pack instead of leaving the tank bare.
const backdropByPack = new Map<string, HTMLCanvasElement>();
const gravelByPack = new Map<string, HTMLCanvasElement>();
let backdropCv: HTMLCanvasElement | null = null;
let backdropSrc = "";
let gravelCv: HTMLCanvasElement | null = null;
let gravelSrc = "";
// Scenery is fitted once at import so render() stays a 1:1 blit:
// backdrops cover-crop to the tank frame (no aspect distortion,
// no per-frame scale), gravel pre-scales to tank width.
// NOTE: these caches bake in the TANK dims (a fixed 320x200
// logical resolution) — a dynamic TANK would need them rebuilt.
function fitBackdrop(img: IndexedImage): HTMLCanvasElement {
  const src = imageCanvas(img, true);
  const r = coverCrop(src.width, src.height, TANK.width, TANK.height);
  // Whole texels: a fractional source rect starts mid-texel and
  // browsers disagree on sampling it with smoothing disabled.
  const sx = Math.round(r.sx), sy = Math.round(r.sy);
  const sw = Math.min(Math.round(r.sw), src.width - sx);
  const sh = Math.min(Math.round(r.sh), src.height - sy);
  const out = document.createElement("canvas");
  out.width = TANK.width; out.height = TANK.height;
  const c = out.getContext("2d")!;
  c.imageSmoothingEnabled = false; // keep the crunch
  c.drawImage(src, sx, sy, sw, sh, 0, 0, out.width, out.height);
  return out;
}
/** The gravel bed never covers more than this many pixels of tank —
 * the sim's floor stays at BOTTOM_PAD regardless, and a tall strip
 * painted deeper would put fish visibly under the gravel. */
const GRAVEL_MAX_H = 20;
function fitGravel(img: IndexedImage): HTMLCanvasElement {
  const src = imageCanvas(img, false);
  const out = document.createElement("canvas");
  out.width = TANK.width;
  out.height = Math.min(GRAVEL_MAX_H,
    Math.max(1, Math.round(src.height * TANK.width / src.width)));
  const c = out.getContext("2d")!;
  c.imageSmoothingEnabled = false; // keep the crunch
  // A capped strip draws its top rows — the gravel's visible surface —
  // at the same scale, rather than stretching or swallowing the tank.
  const srcH = Math.min(src.height,
                        out.height * src.width / TANK.width);
  c.drawImage(src, 0, 0, src.width, srcH, 0, 0, out.width, out.height);
  return out;
}
function pickBackdrop(images: Iterable<IndexedImage>, src = ""): void {
  let best: IndexedImage | null = null;
  let gravel: IndexedImage | null = null;
  for (const img of images) {
    if (isGravelImage(img, TANK.width)) { if (!gravel || img.w > gravel.w) gravel = img; continue; }
    if (!isBackdropImage(img, TANK)) continue;
    if (!best || img.w * img.h > best.w * best.h) best = img;
  }
  // delete-then-set: Map keeps an existing key's insertion position, so
  // re-picks must reinsert to keep key order == install recency.
  if (best) { backdropByPack.delete(src);
              backdropByPack.set(src, fitBackdrop(best)); }
  if (gravel) { gravelByPack.delete(src);
                gravelByPack.set(src, fitGravel(gravel)); }
  // A pack with no qualifying art leaves the current winner in place.
  if (best) { backdropCv = backdropByPack.get(src)!; backdropSrc = src; }
  if (gravel) { gravelCv = gravelByPack.get(src)!; gravelSrc = src; }
}
function pickGravel(images: Iterable<IndexedImage>, src: string): void {
  // .grv packs also carry a ~square texture-fill tile — strip-only, never a backdrop
  let gravel: IndexedImage | null = null;
  for (const img of images) {
    if (isGravelImage(img, TANK.width) &&
        (!gravel || img.w > gravel.w)) gravel = img;
  }
  if (gravel) { gravelByPack.delete(src);
                gravelByPack.set(src, fitGravel(gravel)); }
  if (gravel) { gravelCv = gravelByPack.get(src)!; gravelSrc = src; }
}
/** Record what now shows as the user's choice ("" clears it). */
function chooseScenery(kind: SceneryKind, src: string): void {
  if (src) sceneryChoice[kind] = src;
  else delete sceneryChoice[kind];
}
/** Put the chosen scenery back on display wherever its pack has
 * loaded: after the launch restore chain, and after a retry lands a
 * pack. A choice whose pack isn't loaded keeps the current art. */
function applySceneryChoice(): void {
  const bd = sceneryChoice.backdrop, gr = sceneryChoice.gravel;
  if (bd !== undefined && backdropByPack.has(bd)) {
    backdropCv = backdropByPack.get(bd)!;
    backdropSrc = bd;
  }
  if (gr !== undefined && gravelByPack.has(gr)) {
    gravelCv = gravelByPack.get(gr)!;
    gravelSrc = gr;
  }
  requestPaint();
}
// Decorations (plants/accessories) sit on the gravel between the backdrop
// and the fish, all at the fish's art scale; the set is re-spaced across
// the tank floor whenever one is added. Animated packs loop their frames
// on the sim clock, each item from its own phase.
const decors: { frames: HTMLCanvasElement[]; phase: number;
                sway: number; pack: string; plant: boolean }[] = [];
function addDecor(images: Iterable<IndexedImage>, src: string,
                  plant: boolean): void {
  const frames = decorCanvases(images, TANK.height);
  if (!frames) return;
  const copy = decors.filter((d) => d.pack === src).length;
  // phase is an integer frame index — useless for sway, where a whole
  // cycle of phase looks identical on every plant. sway keeps the
  // fraction so each copy drifts on its own rhythm.
  decors.push({ frames, phase: decorPhase(src, copy, frames.length),
                sway: decorPhaseFrac(src, copy), pack: src, plant });
}
/** The floor anchor a decor piece centers on — shared by the renderer
 * and the plant-bubble emitter so the two can't drift apart. */
function decorAnchor(i: number, dn: number): number {
  return TANK.width * (i + 0.5) / dn;
}
/** Pixels above the tank floor where decor sits — the y-axis half of
 * the shared anchor, for the same reason. */
const DECOR_FLOOR = 6;
const fishSlot = new WeakMap<Fish, number>();
const MAX_FISH_SLOTS = 4096;
let nextSlot = 0;
/** One storage alert per drop event — a multi-file drop shouldn't
 * stack them, but a later failing drop deserves its own warning. */
let storageWarnedAt = -1;
function sheetOf(f: Fish): SpriteSheet | null {
  if (!fishSheets.length) return null;
  if (f.sheetIdx !== undefined && f.sheetIdx >= 0 &&
      f.sheetIdx < fishSheets.length)
    return fishSheets[f.sheetIdx]!;
  // An unbound fish resolves only through identity — its pack URL,
  // then its species name. Anything else draws the stand-in: adopting
  // another species' art by position made every fish a liar, and let
  // stand-ins and cache-miss restores masquerade as whatever pack
  // happened to be installed.
  if (f.pack !== undefined) {
    const idx = f.entry !== undefined
      ? sheetByEntry.get(entryKey(f.pack, f.entry))
      : sheetByPack.get(f.pack);
    return idx !== undefined ? fishSheets[idx] ?? null : null;
  }
  if (f.species) {
    const idx = sheetBySpecies.get(f.species);
    return idx !== undefined ? fishSheets[idx] ?? null : null;
  }
  return null;
}
// archive.org add-on import: Tank > Import Add-ons… (⌘I) opens the
// browser of fish/gravel packs hosted as inner zip entries (web/import.ts).
// In the app that browser lives in the Import Add-ons window
// (web/addons.ts) and its installs arrive over the bus; the in-page
// window below stays as the fallback for plain-browser and touch use.
// Species name → fishSheets slot, rebuilt as packs load. Saved fish
// bind to sheets by position, which drifts if a pack fails to restore
// or a drag-dropped pack isn't restorable — remap by species instead.
const sheetBySpecies = new Map<string, number>();
// Add-on URL → sheet slot: the precise binding when two packs share a
// species name (basenames collide across collections). A multi-entry
// add-on maps its URL to the last registered entry's slot here — the
// per-entry binding below is the exact one.
const sheetByPack = new Map<string, number>();
// Add-on URL + zip entry name → sheet slot: a zip holding several fish
// packs registers one slot per entry, so each fish rebinds to its own
// blob after relaunch instead of collapsing onto the last entry.
const sheetByEntry = new Map<string, number>();
const entryKey = (url: string, entry: string): string =>
  `${url}\n${entry}`;
// Reverse of sheetByPack — which pack owns a slot, for migrating
// species-bound fish onto the URL binding of the sheet they render.
const packBySheet = new Map<number, string>();
// URLs installed whole — their slots hold every entry's art, the only
// pack-level slots an entry-scoped re-add may reuse.
const wholePackUrls = new Set<string>();
function handleSheets(sheets: Map<string, SpriteSheet>, name: string,
                      url: string, section: string, live: boolean,
                      care?: SpeciesCare | null, entry?: string): void {
  // Only fish sections register sheets — a tank/scenery pack's sprite
  // streams mustn't join the fish pool or fish could bind to art
  // nobody chose.
  if (section !== "fish") return;
  if (care) careByPack.set(url, care);
  // A restore retry or an Add Again re-registers the same art — reuse
  // the pack's existing slot instead of leaking a fishSheets entry
  // (slots are kept forever to preserve sheetIdx bindings). An entry
  // may also reuse the URL's whole-pack slot, which holds every
  // entry's art — but never another entry's slot, and a whole-pack
  // install must not collapse onto an entry's partial art either.
  const wholeSlot = wholePackUrls.has(url) ? sheetByPack.get(url)
                                           : undefined;
  const known = (entry !== undefined
                   ? sheetByEntry.get(entryKey(url, entry))
                   : undefined) ?? wholeSlot;
  const idx = known ?? usePack({ sheets });
  if (idx < 0) {
    // A sheet that can't draw is not an install — usePack refused it.
    console.info(`archive.org: ${section} ${name} has no usable art`);
    return;
  }
  sheetBySpecies.set(name, idx);
  if (entry !== undefined) sheetByEntry.set(entryKey(url, entry), idx);
  // A reinstall can rebind the url to a new slot — drop the old
  // reverse entry so each slot names at most one pack. Once a
  // whole-pack slot exists it owns the URL binding: an entry retry
  // must not repoint it at partial art. packBySheet may then hold
  // several slots for the URL — every slot rendering the pack's art
  // should map back to it so species-bound fish can migrate.
  if (entry === undefined || !wholePackUrls.has(url)) {
    const prior = sheetByPack.get(url);
    if (prior !== undefined && prior !== idx) packBySheet.delete(prior);
    sheetByPack.set(url, idx);
  }
  packBySheet.set(idx, url);
  if (entry === undefined) wholePackUrls.add(url);
  // A live fish-pack install adds a real fish; restores replay sheets
  // only — the saved roster already carries those fish.
  if (live) {
    const f = spawnFish(idx, name, url, "enforce", entry);
    if (f) audio.splash(panFor(f.x, TANK.width));
  }
  console.info(`archive.org: imported ${section} ${name}`);
  requestPaint(); // restores can rebind existing fish to new art
  if (pendingThumbs.size) serveThumbs([...pendingThumbs]);
}

/** Rebind each saved fish's sheetIdx to where its species' pack actually
 * landed this session. Fish whose pack or species has no sheet lose
 * their binding entirely — a stale in-range index renders the wrong
 * species, and the stand-in is the honest answer until a restore retry
 * lands the real pack. */
function remapSheetIdx(): void {
  for (const f of sim.fish) {
    // Fish spawned by an add-on rebind by pack URL; older saves carry
    // only a species name — fall back to it (collisions just share art).
    const idx = f.pack !== undefined
      ? (f.entry !== undefined
         ? sheetByEntry.get(entryKey(f.pack, f.entry))
         : sheetByPack.get(f.pack))
      : f.species ? sheetBySpecies.get(f.species) : undefined;
    if (idx !== undefined) {
      f.sheetIdx = idx;
      // Migrate species-bound fish onto the URL binding of the pack
      // whose sheet they actually render — precise when two packs
      // share a species name, and it lets the panel dedupe by URL.
      if (f.pack === undefined) {
        const u = packBySheet.get(idx);
        if (u !== undefined) f.pack = u;
      }
      // Backfill entry for any fish whose sheet slot is known —
      // including ones that already had `pack` recorded — or the next
      // relaunch still collapses them onto the add-on's last entry.
      if (f.pack !== undefined && f.entry === undefined)
        for (const [k, v] of sheetByEntry)
          if (v === idx && k.startsWith(`${f.pack}\n`)) {
            f.entry = k.slice(f.pack.length + 1);
            break;
          }
    } else {
      delete f.sheetIdx;
    }
    bindExtents(f);
  }
}

/** v=1 saves predate install-time spawning: their addons list can hold
 * fish packs the roster never gained ("added many, still four fish").
 * Spawn one fish per installed fish pack whose species is missing —
 * "Add again" duplicates stay whatever the roster recorded. v=2
 * rosters are authoritative: a fish the user removed stays removed. */
function reconcileFish(): void {
  if (saved?.v !== 1) return;
  let pending = false;
  for (const it of installedAddons) {
    if (it.section !== "fish") continue;
    // A fish counts as this add-on's when bound by pack URL (new saves)
    // or carrying its species name — but only pre-pack roster entries
    // use species, or a same-named pack's fish would satisfy this pack.
    if (sim.fish.some((f) => f.pack === it.url ||
        (f.pack === undefined && f.species === it.inner)))
      continue;
    const idx = sheetByPack.get(it.url) ?? sheetBySpecies.get(it.inner);
    if (idx === undefined) { pending = true; continue; } // restore failed — retry next launch
    // These packs were installed before fish spawned on install (and
    // before the cap), so healing them isn't a new fish: bypass it.
    spawnFish(idx, it.inner, it.url, "bypass");
  }
  // spawnFish's own saves went out as v=1 — stamp the reconciled roster.
  rosterComplete = !pending;
  if (rosterComplete) saveTank();
}

// A failed restore is usually a transient fetch — retry a couple of
// times in the background so one flaky launch doesn't leave art-less
// fish (or missing scenery) for the whole session. Only runs remap/
// reconcile again when at least one pack actually landed.
const RESTORE_RETRY_DELAYS = [15_000, 60_000];
/** Restores and their retries skip an add-on removed since they were
 * queued (Remove, Empty Tank) instead of bringing it back. */
const stillListed = (it: Importable): boolean => isListed(installedAddons, it);
// Each exhausted offline round would arm its own "online" listener —
// dedupe so one reconnect launches one retry round, not N concurrent
// chains racing the same sequential restore path.
let onlineRetryArmed = false;
function retryRestores(failed: Importable[], attempt = 0): void {
  if (!failed.length) return;
  if (attempt >= RESTORE_RETRY_DELAYS.length) {
    // Timers ran out — if we're simply offline, connectivity returning
    // earns one fresh round of retries instead of a reload.
    if (!navigator.onLine && !onlineRetryArmed) {
      onlineRetryArmed = true;
      window.addEventListener("online", () => {
        onlineRetryArmed = false;
        retryRestores(restoreFailed, 0);
      }, { once: true });
    }
    return;
  }
  setTimeout(() => {
    const wanted = failed.filter(stillListed);
    void importPanel.restore(wanted, stillListed).then((still) => {
      restoreFailed = still;
      if (still.length < wanted.length) {
        applySceneryChoice(); // a landed pack must not override it
        remapSheetIdx(); reconcileFish(); postState();
      }
      retryRestores(still, attempt + 1);
    }).catch((e) =>
      console.warn("add-on restore retry failed:", e));
  }, RESTORE_RETRY_DELAYS[attempt]);
}
function handleImages(images: Iterable<IndexedImage>, src: string,
                      section: string, live: boolean,
                      count = 1): void {
  // fish packs carry portraits too — only scenery sections touch the tank
  if (section === "gravel") pickGravel(images, src);
  else if (section === "plants" || section === "accessories") {
    // A restore replays the persisted copy count; `images` may be a
    // single-use Map iterator, so materialize before looping. Live
    // clicks arrive as count=1 — cap them by the pack's current copy
    // count too, or a tank could grow past what the save can restore.
    const imgs = [...images];
    const n = clampDecorCopies(count);
    const room = live ? decorCopyRoom(decors, src) : n;
    for (let i = 0; i < Math.min(n, room); i++)
      addDecor(imgs, src, section === "plants");
  }
  else if (section === "backgrounds" || section === "tanks")
    pickBackdrop(images, src);
  else return;
  if (live) audio.sceneryIn();
  // A live install shows its art and so becomes the choice; a restore
  // only puts art back and leaves the choice alone.
  if (live && backdropSrc === src) chooseScenery("backdrop", src);
  if (live && gravelSrc === src) chooseScenery("gravel", src);
  console.info(`archive.org: imported scenery ${src}`);
  requestPaint();
  if (pendingThumbs.size) serveThumbs([...pendingThumbs]);
}
// `soundNames` are the bank records this install contributed — stored
// on the add-on so uninstall can drop exactly its own sounds.
function recordInstall(it: Importable, soundNames: string[] = []): void {
  recordAddon(installedAddons, it, soundNames, "install");
  saveTank();
}
/** A launch restore only refreshes a record that is still there. */
function refreshInstall(it: Importable, soundNames: string[]): void {
  if (recordAddon(installedAddons, it, soundNames, "refresh")) saveTank();
}

/** Imported sound records (audio file or 'snd ' fork) enter the live
 * bank and persist — both install paths (local panel, remote relay)
 * funnel here so behavior can't diverge. Live installs also play the
 * first record once as feedback; restores stay silent. */
async function handleSounds(
    recs: { name: string; wav: Uint8Array }[],
    live = true): Promise<void> {
  if (!recs.length) return;
  qualifySoundNames(recs); // same-stem files in one batch mustn't alias
  // addWavs already skips undecodable records individually; the catch
  // keeps a wholesale failure (e.g. AudioContext unavailable) from
  // blocking persistence.
  await audio.addWavs(recs)
    .catch((e) => console.warn("sound decode skipped:", e));
  // Persist best-effort — a quota failure logs, never breaks import.
  void sndsMerge(recs).catch((e) =>
    console.warn("snd persist failed:", e));
  // The Add-to-Tank click and the file drop are gestures; a context
  // still locked at decode time must resume before the feedback plays.
  if (live) { audio.unlock(); audio.playImported(recs[0]!.name); }
  audio.startAmbient();
}

const importPanel = mountImportPanel({
  onSheets: handleSheets,
  onImages: handleImages,
  onSounds: (recs, live) => {
    void handleSounds(recs, live)
      .catch((e) => console.warn("sound import failed:", e));
  },
  onInstall: recordInstall,
  onRestore: (it, names) => {
    refreshInstall(it, names);
    // A boot in progress marches each restored add-on in as an icon.
    if (bootT0 !== null) { paradeIcons.push(paradeIcon(it.section)); }
  },
  refuse: (it) => fishRefusal(it.section),
  preview: previewOf,
});

// ---- panel-window bus ------------------------------------------------------
// The add-on browser (and later the tank overview) can live in a second
// native window. It sends intents here; replies and state pushes go back
// over the same bus.
// Transparent page background only inside the native shell — a dev
// browser keeps the dark backdrop.
if (inNativeShell()) document.documentElement.classList.add("native");

const bus = openBus(onBusMessage);

// Random per page-load — lets clients detect a tank restart (their
// in-flight wants died with the old page) and re-ask once.
const boot = Math.random().toString(36).slice(2);

/** The tank's water and equipment for Tank Stats: readings per litre,
 * as the original's water window showed them. */
function aquariumState(): Record<string, unknown> {
  const a = sim.aquarium, w = a.water, L = w.litres;
  return {
    litres: L, temp: w.temp, pH: w.pH, gH: w.gH,
    o2: w.o2 / L, co2: w.co2 / L, nitrate: w.nitrate / L,
    ammonia: w.ammonia / L, chlorine: w.chlorine / L,
    organics: a.organics(), oxygenSat: 1 - a.oxygenDeficit(),
    heaterTarget: a.heater.target, heaterMin: a.heater.min,
    heaterMax: a.heater.max, filterDirt: a.filter.dirt,
    doses: a.doses.map((d) => ({ id: d.medicine, ml: d.ml })),
    speed: a.speed, days: a.minutes / 1440,
    change: waterChangeCfg,
  };
}

/** Mutation pushes merge inside this window — a burst of edits costs
 * one serialization and broadcast instead of one per call site. */
const STATE_MIN_MS = 250;
/** Client windows poll with hello every ~2s; each visible window's
 * hello used to trigger a full state push to every window (~1.5/s with
 * three windows). Answering at this cadence instead keeps a client's
 * worst-case wait under a second while merging coincident hellos. */
const HELLO_MIN_MS = 750;
let stateTimer = 0, stateDue = 0, lastStatePost = 0;

/** Push tank state to client windows, coalesced: calls inside minWait
 * of the last push fold into one trailing push carrying the latest
 * state. A queued push reschedules earlier when a caller asks for a
 * shorter wait, never later. */
function postState(minWait = STATE_MIN_MS): void {
  // A spectator stays silent — the owning tab answers the panels.
  if (!tankOwner) return;
  const now = Date.now();
  const due = Math.max(now, lastStatePost + minWait);
  if (stateTimer && due >= stateDue) return;
  if (!stateTimer && due <= now) { lastStatePost = now; sendState(); return; }
  if (stateTimer) clearTimeout(stateTimer);
  stateDue = due;
  stateTimer = setTimeout(() => {
    stateTimer = 0;
    lastStatePost = Date.now();
    sendState();
  }, due - now);
}

function sendState(): void {
  bus.post({
    op: "state",
    boot,
    paused,
    // The native shell retunes the window's aspect to the machine's
    // viewBox outline; prefs needs just the id.
    machine: { id: machine.id, w: machine.vbW, h: machine.vbH,
               shape: machine.shape, mask: machine.image ?? null,
               // hole is in viewBox units like sx..sh — the mask must
               // scale it identically or backplate and mask drift.
               hole: machine.hole ?? null },
    addons: installedAddons,
    // Which scenery packs are on display — Overview's "Use" acts on it.
    scenery: { backdrop: backdropSrc, gravel: gravelSrc },
    // `pack` lets the panel tell pack-bound fish from loose ones —
    // a fish add-on with a living fish doesn't repeat in Add-ons.
    fish: sim.fish.map(({ id, species, hunger, state, pack, life }) =>
      ({ id, species, hunger, state,
         // Starter stand-ins read as such in the Overview — they
         // leave when real fish arrive.
         ...(placeholderIds.has(id) ? { standIn: true } : {}),
         ...(pack !== undefined ? { pack } : {}),
         ...(life ? { health: life.health, ageDays: life.age / 1440,
                      sick: life.sick?.disease ?? null,
                      dead: life.dead?.cause ?? null } : {}) })),
    waterQuality: sim.waterQuality,
    aquarium: aquariumState(),
    tickCount: sim.tickCount,
    // The stats window reads these; kept as raw counts so it can derive
    // its own guidance (e.g. settled pellets foul the water as they rot).
    food: sim.food.length,
    foodSettled: sim.food.reduce((n, f) => n + (f.settled > 0 ? 1 : 0), 0),
    bubbles: sim.bubbles.length,
    light: sim.light,
    lighting,
    autoFeed,
    // Preferences window reads this — `on`/`available` reflect the
    // live GL state (a lost context reports off/unavailable even if
    // the stored preference says on).
    crt: {
      available: crt?.usable ?? false,
      on: crt?.enabled ?? false,
      cfg: crtCfg,
    },
    sound: soundCfg,
  });
}

// ---- overview thumbnails --------------------------------------------------
// The panel shows art next to names. Thumbs render from the live
// objects on request (op:"wantThumbs" → op:"thumbs") so state pushes
// stay slim — the panel only asks for keys it hasn't seen. Keys:
// "f:{id}:{species}" for fish, "a:{url}" for add-ons. Species rides
// along because ids can be reused for a different species after the
// tank page reloads under a still-open panel.
const THUMB_W = 38, THUMB_H = 28;
const thumbMemo = new Map<string, string>();
function scaledThumb(cv: HTMLCanvasElement): string | null {
  const s = Math.min(1, THUMB_W / cv.width, THUMB_H / cv.height);
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(cv.width * s));
  out.height = Math.max(1, Math.round(cv.height * s));
  const c = out.getContext("2d")!;
  c.imageSmoothingEnabled = false; // keep the crunch
  c.drawImage(cv, 0, 0, out.width, out.height);
  try { return out.toDataURL("image/png"); }
  catch { return null; }
}
function fishThumb(f: Fish): string | null {
  const key = fishThumbKey(f);
  const hit = thumbMemo.get(key);
  if (hit) return hit;
  const sheet = sheetOf(f);
  if (!sheet) return null; // placeholder fish — nothing to render
  let url: string | null = null;
  // Always the level profile, never whatever pose the fish was in at
  // the moment of the ask: the thumb is memoized for its lifetime.
  try { url = scaledThumb(thumbFrame(sheet)); }
  catch { /* sheet can't render that pose */ }
  if (url) thumbMemo.set(key, url);
  return url;
}
/** A sheet's right-facing profile, box-filtered down to thumb size. */
function thumbFrame(sheet: SpriteSheet): HTMLCanvasElement {
  const pose = restPose(sheet, 1);
  // Cells hold the fish on its side (swimFrame rotates it upright), so
  // the drawn width is cellH and the drawn height cellW.
  const s = Math.min(1, THUMB_W / sheet.meta.cellH, THUMB_H / sheet.meta.cellW);
  return swimCanvas(sheet, 0, pose.mir, pose.g, s);
}
function addonThumb(url: string): string | null {
  const key = `a:${url}`;
  const hit = thumbMemo.get(key);
  if (hit) return hit;
  let cv: HTMLCanvasElement | null = null;
  const i = sheetByPack.get(url);
  if (i !== undefined && fishSheets[i]) {
    try { cv = thumbFrame(fishSheets[i]!); } catch { /* scenery below */ }
  }
  cv ??= gravelByPack.get(url) ?? backdropByPack.get(url)
    ?? decors.find((d) => d.pack === url)?.frames[0] ?? null;
  // Sound add-ons have no art: they list with the sound icon.
  if (!cv && installedAddons.some((a) => a.url === url &&
                                         a.section === "sounds"))
    cv = soundIcon();
  if (!cv) return null;
  const data = scaledThumb(cv);
  if (data) thumbMemo.set(key, data);
  return data;
}

// Keys the tank couldn't serve yet stay pending — a restore lists
// add-ons in state before their packs finish decoding, so the panel's
// first ask can land early. Retried whenever new assets arrive.
const pendingThumbs = new Set<string>();
function serveThumbs(keys: Iterable<unknown>): void {
  const thumbs: Record<string, string> = {};
  // One key→fish map per call — each f: lookup used to scan the roster
  // and rebuild the key string, O(keys × fish) per wantThumbs push.
  const fishByKey = new Map(sim.fish.map((f) => [fishThumbKey(f), f]));
  for (const k of keys) {
    if (typeof k !== "string") continue;
    const data = k.startsWith("f:")
      ? (() => {
          const f = fishByKey.get(k);
          return f ? fishThumb(f) : null;
        })()
      : k.startsWith("a:") ? addonThumb(k.slice(2)) : null;
    if (data) { thumbs[k] = data; pendingThumbs.delete(k); }
    else {
      // Keys that can never resolve or self-heal — a fish that's
      // gone or an add-on no longer installed — drop. Alive fish
      // with no sheet yet (placeholders) stay pending on purpose:
      // a reinstall re-serves them on the next asset import.
      const alive = k.startsWith("f:")
        ? fishByKey.has(k)
        : k.startsWith("a:") &&
          installedAddons.some((a) => a.url === k.slice(2));
      if (alive) pendingThumbs.add(k); else pendingThumbs.delete(k);
    }
  }
  if (Object.keys(thumbs).length) bus.post({ op: "thumbs", thumbs });
}

// Thumb entries keyed to a fish or add-on that's gone can never be
// served again — sweep them on any removal so the maps stay bounded.
function sweepThumbs(): void {
  const alive = (k: string) =>
    k.startsWith("f:")
      ? sim.fish.some((x) => fishThumbKey(x) === k)
      : k.startsWith("a:") &&
        installedAddons.some((a) => a.url === k.slice(2));
  for (const k of [...thumbMemo.keys()]) if (!alive(k)) thumbMemo.delete(k);
  for (const k of [...pendingThumbs]) if (!alive(k)) pendingThumbs.delete(k);
}

/** Run a removal the user asked for, and let the water out once if it
 * took fish with it. */
function fishOutAfter(remove: () => void): void {
  const before = sim.fish.length;
  remove();
  if (sim.fish.length < before) audio.fishOut();
}

function onBusMessage(m: BusMsg): void {
  if (!tankOwner) return; // view-only: the owner answers everything
  if (m.op === "hello") postState(HELLO_MIN_MS);
  else if (m.op === "focusFish") {
    // The Overview's selection spotlights a fish — null lifts it.
    // Selection posts carry the sender's page id and claim the lease;
    // keepAlive beats only renew it. Two Overviews then can't
    // ping-pong the spotlight, and a non-owner's unload can't lift it.
    const from = typeof m.from === "string" ? m.from : "";
    const keepAlive = m.keepAlive === true;
    const fid = typeof m.id === "number" ? m.id : null;
    // An unowned lease (fresh tank load, or a lapse cleared the owner)
    // is claimable by any beat — the first live Overview to ping wins,
    // and the others' beats stay rejected, so still no ping-pong.
    if (keepAlive ? fid !== null &&
                    (from === focusOwner || focusOwner === "")
                  : fid !== null || from === focusOwner) {
      focusId = fid;
      focusOwner = fid === null ? "" : from;
      focusAt = Date.now();
    }
    requestPaint();
  }
  else if (m.op === "install")
    void remoteInstall(m.item as Importable, m.again === true);
  else if (m.op === "removeFish" && typeof m.id === "number") {
    if (sim.removeFish(m.id)) { audio.fishOut(); sweepThumbs(); saveTank(); }
  } else if (m.op === "removeAddon" &&
             typeof m.url === "string" && m.url !== "") {
    const url = m.url;
    fishOutAfter(() => removeAddon(url));
  } else if (m.op === "useAddon" &&
             typeof m.url === "string" && m.url !== "") {
    useScenery(m.url);
  } else if (m.op === "emptyTank") {
    fishOutAfter(emptyTank);
  } else if (m.op === "wantThumbs" && Array.isArray(m.keys)) {
    serveThumbs(m.keys);
  } else if (m.op === "changeWater") {
    changeWater({ fraction: m.fraction as number, temp: m.temp as number });
  } else if (m.op === "cleanFilter") {
    cleanFilter();
  } else if (m.op === "heaterTarget") {
    setHeater(m.value);
  } else if (m.op === "addMedicine") {
    addMedicine(m.id, m.ml);
  } else if (m.op === "simSpeed") {
    setSimSpeed(m.value);
  } else if (m.op === "crtEnabled") {
    setCrt(m.on === true);
  } else if (m.op === "crtConfig") {
    applyCrtConfig(m.cfg);
  } else if (m.op === "lighting") {
    applyLighting(m.lighting);
  } else if (m.op === "soundConfig") {
    applySoundConfig(m.cfg);
  } else if (m.op === "machine" && typeof m.id === "string") {
    const nm = machineById(m.id);
    if (nm && nm.id !== machine.id) { applyMachine(nm); postState(); }
  } else if (m.op === "soundsLoaded") {
    // The panel page dropped sound files into the shared IndexedDB
    // store — re-read it (merges under the same name) and optionally
    // play the named record as feedback.
    void sndsGet().then((recs) => {
      if (!recs?.length) return;
      // Returned, so the outer catch sees addWavs rejections too.
      return audio.addWavs(recs).then(() => {
        if (typeof m.name === "string") audio.playImported(m.name);
        audio.startAmbient();
      });
    }).catch((e) => console.warn("snd reload failed:", e));
  }
}

/** Overview's "Use": show this pack's backdrop/gravel art. A pack can
 * supply either or both (aspect decides at decode); a url that
 * produced neither just resyncs the panel. Persists through the save
 * so the choice survives relaunch. */
function useScenery(url: string): void {
  const bd = backdropByPack.get(url), gr = gravelByPack.get(url);
  if (!bd && !gr) { postState(); return; }
  if (bd) chooseScenery("backdrop", url);
  if (gr) chooseScenery("gravel", url);
  applySceneryChoice();
  saveTank(); // also retags the panel's row now, not on the next tick
}

/** Uninstall an add-on: drops it from the saved list (it won't restore
 * next launch) and clears this session's contributions — its fish, its
 * decor, and gravel/backdrop it supplied. Sprite sheets stay loaded so
 * other fish's sheetIdx bindings don't shift. */
function removeAddon(url: string, opts: { persist?: boolean } = {}): void {
  const persist = opts.persist !== false;
  const gone = installedAddons.filter((a) => a.url === url);
  // Unknown add-on — no teardown or persist, but push fresh state so a
  // stale panel resyncs now instead of waiting for the heartbeat.
  if (!gone.length) {
    postState();
    return;
  }
  for (let i = installedAddons.length - 1; i >= 0; i--)
    if (installedAddons[i]!.url === url) installedAddons.splice(i, 1);
  // Species no remaining installed pack still provides — legacy fish
  // (no pack url) only drop when theirs is truly orphaned.
  const species = new Set(gone.map((a) => a.inner));
  const orphaned = new Set([...species].filter((s) =>
    !installedAddons.some((a) => a.section === "fish" && a.inner === s)));
  for (const f of [...sim.fish])
    if (f.pack === url || (f.pack === undefined &&
        f.species && orphaned.has(f.species)))
      sim.removeFish(f.id);
  for (let i = decors.length - 1; i >= 0; i--)
    if (decors[i]!.pack === url) decors.splice(i, 1);
  gravelByPack.delete(url);
  backdropByPack.delete(url);
  // Fall back to the most recent remaining pack's art — Map order is
  // insertion order, so the last key is the newest survivor.
  if (gravelSrc === url) {
    const prev = [...gravelByPack.keys()].pop();
    gravelCv = prev !== undefined ? gravelByPack.get(prev)! : null;
    gravelSrc = prev ?? "";
  }
  if (backdropSrc === url) {
    const prev = [...backdropByPack.keys()].pop();
    backdropCv = prev !== undefined ? backdropByPack.get(prev)! : null;
    backdropSrc = prev ?? "";
  }
  // Removing the chosen pack makes its stand-in the choice.
  if (sceneryChoice.gravel === url) chooseScenery("gravel", gravelSrc);
  if (sceneryChoice.backdrop === url) chooseScenery("backdrop", backdropSrc);
  // Sounds this add-on put in the bank leave it — unless a surviving
  // add-on claims the same record name.
  const dropSnds = orphanedSounds(gone, installedAddons);
  if (dropSnds.length) {
    audio.removeWavs(dropSnds);
    void sndsRemove(dropSnds)
      .catch((e) => console.warn("snd removal failed:", e));
  }
  for (const s of orphaned) sheetBySpecies.delete(s);
  for (const k of [...sheetByEntry.keys()])
    if (k.startsWith(`${url}\n`)) sheetByEntry.delete(k);
  // Drop every reverse entry still naming this pack — whole-pack and
  // entry slots alike. A slot a rebind handed to another pack maps to
  // that URL instead and is left alone.
  for (const [k, v] of packBySheet)
    if (v === url) packBySheet.delete(k);
  sheetByPack.delete(url);
  wholePackUrls.delete(url);
  // A dropped pack's stored bytes are the only copy — uninstall
  // deletes them (archive packs keep their cache entries).
  if (isLocalPack(url)) void packDelete(url)
    .catch((e) => console.warn("pack delete failed:", e));
  // Drop thumb state that can only rot: this pack's own memo and any
  // queued ask, plus entries for fish that no longer exist anywhere.
  thumbMemo.delete(`a:${url}`);
  pendingThumbs.delete(`a:${url}`);
  sweepThumbs();
  if (persist) saveTank(); // persists and pushes fresh state to the panel
  bus.post({ op: "uninstalled", url });
  requestPaint(); // removed fish and decor vanish at once
}

// Bumped by Empty Tank — an install that was fetching when the wipe
// ran discards its results instead of repopulating the emptied tank.
let tankEpoch = 0;

/** The Overview's danger button: uninstall every add-on (removes its
 * fish, decor and scenery) then release whatever fish remain —
 * bundled-pack or legacy fish no add-on claimed. Preferences, water
 * and the sound bank stay; scenery leaves with its add-on, so the
 * default gradient backdrop returns. */
function emptyTank(): void {
  tankEpoch++;
  // Nothing is left to reconcile: the empty roster is final (saves as
  // v=2), so a relaunch keeps the tank empty.
  rosterComplete = true;
  // Each removal tears down its own contributions; persist once at
  // the end instead of serializing the whole tank per add-on.
  for (const a of [...installedAddons])
    removeAddon(a.url, { persist: false });
  for (const f of [...sim.fish]) sim.removeFish(f.id);
  sweepThumbs();
  requestPaint();
  saveTank(); // persists the empty roster and resyncs the panel
}

// Bus messages cross a page boundary — validate before trusting them.
const KNOWN_SECTIONS = new Set(COLLECTIONS.map((c) => c.section));
const installsInFlight = new Map<string, Promise<void>>();
async function remoteInstall(it: Importable, again: boolean): Promise<void> {
  if (!it?.url || typeof it.url !== "string" ||
      !it.url.startsWith("https://archive.org/") ||
      !KNOWN_SECTIONS.has(it.section) ||
      typeof it.inner !== "string" || !it.inner.trim()) {
    bus.post({ op: "installFailed", url: it?.url ?? "",
               error: "invalid add-on item" });
    return;
  }
  // installAddon reports the outcome to the panel itself.
  await installAddon(it, again).catch(() => {});
}

/** Add an add-on to the tank: the one install path for the Import
 * Add-ons window's requests and the first-run starter set. Acks the
 * outcome over the bus either way (the panel may be waiting on this
 * url), and rejects on failure. */
function installAddon(it: Importable, again: boolean): Promise<void> {
  // The panel's retry timeout can fire while the original fetch is still
  // running, and a starter install can overlap a panel request: a second
  // request for the same url rides the first instead of double-installing.
  const running = installsInFlight.get(it.url);
  if (running) {
    if (!again) return running;
    // "Add Again" means one more copy — riding the in-flight run would
    // install just the one. Chain a real install behind it. The guard
    // is defensive: the anchor's own finally clears its slot before any
    // tail runs (it attaches first), so the slot is already gone or
    // holds a newer run — an unconditional delete could drop that
    // newer registration and let two installs overlap.
    return running.then(() => {
      if (installsInFlight.get(it.url) === running)
        installsInFlight.delete(it.url);
      return installAddon(it, again);
    });
  }
  // A restore may have landed this add-on while the panel's detail fetch
  // was in flight — unless the user clicked "Add again", that's a dup.
  if (!again && installedAddons.some((a) => a.url === it.url)) {
    importPanel.notify({ op: "installed", url: it.url });
    bus.post({ op: "installed", url: it.url });
    return Promise.resolve();
  }
  // A fish pack can't be added past the population cap — refuse up
  // front so the panel explains it instead of fetching for nothing.
  const refusal = fishRefusal(it.section);
  if (refusal) {
    bus.post({ op: "installFailed", url: it.url, error: refusal });
    return Promise.reject(new Error(refusal));
  }
  const run = downloadAddon(it).then(() => {
    // The in-page add-on window marks it too, so it offers Add Again.
    // recordInstall's save already pushed fresh state.
    importPanel.notify({ op: "installed", url: it.url });
    bus.post({ op: "installed", url: it.url });
  }, (e: unknown) => {
    // String(e) would ship "Error: https://archive.org/…long-url…: 404"
    // to the panel's status line — send the one-line explanation.
    bus.post({ op: "installFailed", url: it.url,
               error: installProblem(e) });
    throw e;
  }).finally(() => {
    // Identity guard: a settling run must not delete a newer run's
    // slot if a queued tail already re-registered the url.
    if (installsInFlight.get(it.url) === run)
      installsInFlight.delete(it.url);
  });
  installsInFlight.set(it.url, run);
  return run;
}

async function downloadAddon(it: Importable): Promise<void> {
  const epoch = tankEpoch;
  const rs = await fetchAddon(it.url);
  // The tank was emptied while this pack was fetching — applying
  // it now would repopulate the tank the user just cleared.
  if (epoch !== tankEpoch)
    throw new Error("cancelled — the tank was emptied mid-install");
  const usable = usablePacks(rs, it.section);
  if (!usable.length) throw new Error(usableProblem(it.section));
  for (const r of usable) {
    if (r.sheets.size)
      handleSheets(r.sheets, it.inner, it.url, it.section, true,
                   r.care, r.entry);
    if (r.images.size)
      handleImages(r.images.values(), it.url, it.section, true);
  }
  // One batch across resources: dedupes names globally, plays the
  // feedback once, and a decode failure can't fail the install. The
  // listing's qualified `inner` is the record identity — a sibling
  // stem installed separately mustn't overwrite under the basename.
  const sounds = usable.flatMap(
    (r) => qualifySoundItemName(r.sounds, it.inner));
  let storedNames: string[] = [];
  if (sounds.length)
    await handleSounds(sounds)
      // handleSounds dedupes colliding names in place — record the
      // final ones, and only on success: a failed decode must not
      // claim provenance over records never written.
      .then(() => { storedNames = sounds.map((s) => s.name); })
      .catch((e) => console.warn("sound install skipped:", e));
  // Re-check after the awaits: a wipe during sound decode would
  // otherwise record an add-on whose fish are already gone.
  if (epoch !== tankEpoch)
    throw new Error("cancelled — the tank was emptied mid-install");
  recordInstall(it, storedNames); // saveTank() inside pushes fresh state
}

// ---- pause -----------------------------------------------------------------
// Stops hunger, rot, filtration, and the day/night clock while the app
// stays interactive (render, CRT, saves). Keyboard P / Tank ▸ Pause.
let paused = false;
const PAUSE_KEY = "finsical:paused";
function setPaused(on: boolean): boolean {
  if (paused !== on) {
    paused = on;
    // Pause is also a feed-hover input — without a pointer event the
    // affordance would lag the state until the mouse next moved.
    syncFeedHover();
    requestPaint(); // the banner comes and goes without a tick
    try { localStorage.setItem(PAUSE_KEY, on ? "1" : "0"); }
    catch { /* storage unavailable — pause is session-only */ }
    postState();
  }
  return paused;
}
try { paused = localStorage.getItem(PAUSE_KEY) === "1"; }
catch { /* storage unavailable */ }

// ---- CRT effect ------------------------------------------------------------
// Optional tube emulation (web/crt.ts): the 320×200 canvas becomes a
// texture for a device-resolution shader. Off = untouched 2D path.
const CRT_KEY = "finsical:crt";
const CRT_CFG_KEY = "finsical:crt-cfg";
const crt = initCrt(canvas);
let crtOn = false;
let crtCfg: CrtConfig;
try {
  crtCfg = sanitizeCrtConfig(
    JSON.parse(localStorage.getItem(CRT_CFG_KEY) ?? "null"));
} catch { crtCfg = sanitizeCrtConfig(null); /* storage — defaults */ }
crt?.configure(crtCfg);
function setCrt(on: boolean): void {
  crtOn = crt !== null && on;
  crt?.setEnabled(crtOn);
  // Enabling sizes the WebGL buffer, which clears it: redraw now
  // rather than show black until the next tick.
  if (crtOn) requestPaint();
  if (crt !== null) {
    try { localStorage.setItem(CRT_KEY, crtOn ? "1" : "0"); }
    catch { /* storage unavailable */ }
  }
  // Report even when GL is missing — the prefs checkbox needs the
  // "can't enable" answer either way.
  postState();
}
/** Ring the degauss coil — the raster wobble plus the BWONG. Silent
 * no-op while the tube is off or dead. */
function degaussTube(): void {
  // Dead tube — nothing to degauss; don't play the BWONG either.
  if (!crtOn || !crt?.usable) return;
  crt.degauss();
  // Menu/keyboard paths may carry activation — degauss() itself stays
  // silent when the context can't run, but unlock() costs nothing.
  audio.unlock();
  audio.degauss();
}
/** Merge a partial config (prefs slider) onto the current one, clamp,
 * persist — and apply to the shader when it exists. Works with GL
 * unavailable so the settings still save for next launch. */
function applyCrtConfig(raw: unknown): void {
  const merged: Record<string, unknown> = { ...crtCfg };
  if (raw && typeof raw === "object")
    for (const [k, v] of Object.entries(raw))
      if (v !== undefined) merged[k] = v;
  crtCfg = sanitizeCrtConfig(merged);
  crt?.configure(crtCfg);
  requestPaint(); // slider drags show up at once
  try { localStorage.setItem(CRT_CFG_KEY, JSON.stringify(crtCfg)); }
  catch { /* storage unavailable */ }
  postState();
}
// Machine selection is declared up here, not in the machine-case
// section — setCrt below calls postState() during module eval, and a
// let/TDZ read would throw (silently, inside that try) before a later
// declaration ran.
const MACHINE_KEY = "finsical:machine";
// localStorage access itself can throw where storage is blocked — a
// bare read here would abort module eval entirely.
let machine: Machine =
  (() => { try {
    return machineById(localStorage.getItem(MACHINE_KEY) ?? "");
  } catch { return undefined; } })()
  ?? machineById(DEFAULT_MACHINE)!;

// ---- sound settings ------------------------------------------------------
// Volume, mute and the bubble/ambience switches. Declared before the
// setCrt call below for the same TDZ reason: postState() reads them.
const SOUND_KEY = "finsical:sound";
let soundCfg: SoundConfig = sanitizeSoundConfig(
  (() => { try {
    return JSON.parse(localStorage.getItem(SOUND_KEY) ?? "null");
  } catch { return null; /* storage or JSON: defaults */ } })());
function configureAudio(): void {
  audio.setVolume(soundCfg.volume);
  audio.setMuted(soundCfg.muted);
  audio.setOptions({ bubbles: soundCfg.bubbles, ambient: soundCfg.ambient });
}
configureAudio();
/** Merge a partial config (Sound pane, Mute Sound, the M key) onto the
 * current one, sanitize, persist and apply. */
function applySoundConfig(raw: unknown): void {
  const merged: Record<string, unknown> = { ...soundCfg };
  if (raw && typeof raw === "object")
    for (const [k, v] of Object.entries(raw))
      if (v !== undefined) merged[k] = v;
  soundCfg = sanitizeSoundConfig(merged);
  configureAudio();
  try { localStorage.setItem(SOUND_KEY, JSON.stringify(soundCfg)); }
  catch { /* storage unavailable */ }
  postState();
}
const toggleMute = (): void => {
  audio.unlock(); // Tank > Mute Sound can be the first gesture
  applySoundConfig({ muted: !soundCfg.muted });
};

// ---- auto-feeder ---------------------------------------------------------
// The original's scheduled feeding: while armed, a pinch of pellets
// drops every AUTOFEED_TICKS of tank uptime — a paused tank doesn't
// feed, and an empty tank or a pile-up skips the drop entirely.
// Declared up here like the other flags: the setCrt call below runs
// postState() during module eval, and a later `let` would TDZ-throw.
const AUTOFEED_KEY = "finsical:autofeed";
const AUTOFEED_TICKS = 45 * 60 * TICKS_PER_SECOND; // every 45 tank minutes
const AUTOFEED_MAX_FOOD = 4;
let autoFeed = (() => { try {
    return localStorage.getItem(AUTOFEED_KEY) === "1";
  } catch { return false; /* storage unavailable — default off */ } })();

try { setCrt(localStorage.getItem(CRT_KEY) === "1"); }
catch { /* storage unavailable — default off */ }

// ---- machine case -----------------------------------------------------
// The window has no native chrome — the "computer" around the tank is
// a rendered image (web/machines.ts) layered OVER the aquarium so its
// transparent glass and baked reflections stay on top of the water.
// #screenback paints unlit-glass black into the aperture behind the
// tank; the native mask refills the same aperture so the window keeps
// a screen-shaped silhouette instead of a see-through hole.
// Last --glare value written to the shell — setProperty every frame
// would re-style the masked image for nothing.
let lastGlare = -1;
const machineEl = document.getElementById("machine")!;
const shellEl = document.getElementById("shell")!;
const screenEl = document.getElementById("screen")!;
const crtEl = document.getElementById("crt")!;
// Cosmetic layer — recreate #screenback and enforce sibling order when
// stale markup is detected (#machine/#shell/#screen must still exist).
let backEl = document.getElementById("screenback");
if (!backEl) {
  backEl = document.createElement("div");
  backEl.id = "screenback";
}
// A stale index.html nests #screen inside #machine — the art then
// paints UNDER the tank (and #machine's pointer-events:none swallows
// tank clicks). Enforce backplate → screen → machine regardless.
if (!backEl.isConnected ||
    backEl.parentElement !== machineEl.parentElement ||
    screenEl.parentElement !== machineEl.parentElement ||
    !(backEl.compareDocumentPosition(screenEl) &
      Node.DOCUMENT_POSITION_FOLLOWING) ||
    !(screenEl.compareDocumentPosition(machineEl) &
      Node.DOCUMENT_POSITION_FOLLOWING))
  machineEl.before(backEl, screenEl);

function layoutMachine(): void {
  canvasRect = null; // the tank may have moved with the aperture
  // The browser's menu bar is fixed over the page top — letterbox
  // into the room below it so it never covers the case's crown or,
  // on Bare, the tank's top feed rows. Hidden/absent (zen, native,
  // old markup) measures 0 and the layout is unchanged.
  const barH = document.getElementById("menubar")?.offsetHeight ?? 0;
  const w = machineEl.clientWidth, h = machineEl.clientHeight - barH;
  if (!w || h <= 0) return;
  // preserveAspectRatio=meet letterboxes the shell — land the screen
  // and its backplate on the same scaled + offset rects as the art's
  // glass. Computed, not CSS-percentage'd, so browser dev (no native
  // aspect enforcement) stays aligned too.
  const s = Math.min(w / machine.vbW, h / machine.vbH);
  const ox = (w - machine.vbW * s) / 2;
  const oy = barH + (h - machine.vbH * s) / 2;
  screenEl.style.left = `${ox + machine.sx * s}px`;
  screenEl.style.top = `${oy + machine.sy * s}px`;
  screenEl.style.width = `${machine.sw * s}px`;
  screenEl.style.height = `${machine.sh * s}px`;
  // The CRT canvas spans the whole glass, not just the tank, so the
  // height/width pots can grow the raster into the aperture's black
  // margins. Offsets are relative to #screen, its parent.
  // Pixel-art scaling: upscales snap to integer multiples of the
  // 320x200 raster on the *device* grid — a fractional contain
  // shimmers, and so does a CSS-integer multiple under a fractional
  // devicePixelRatio. The margin reads as the glass's inner bezel;
  // containPoint() maps clicks off the canvas's own rect, so the
  // wider letterbox needs no pointer change.
  const aw = machine.sw * s, ah = machine.sh * s;
  const k = Math.min(aw / TANK.width, ah / TANK.height);
  const dpr = window.devicePixelRatio || 1;
  const dev = Math.floor(k * dpr);
  const ik = k >= 1 && dev >= 1 ? dev / dpr : k;
  // Sub-1x can't be pixel-crisp anyway — a smooth downscale beats a
  // ragged pixelated one in a tiny window.
  canvas.style.imageRendering = ik >= 1 ? "pixelated" : "auto";
  canvas.style.width = `${TANK.width * ik}px`;
  canvas.style.height = `${TANK.height * ik}px`;
  // Center on the device grid too — a half-px offset unevenly clips
  // the raster's edge columns.
  canvas.style.left = `${Math.round((aw - TANK.width * ik) / 2 * dpr) / dpr}px`;
  canvas.style.top = `${Math.round((ah - TANK.height * ik) / 2 * dpr) / dpr}px`;
  const glass = glassRect(machine);
  crtEl.style.left = `${(glass.x - machine.sx) * s}px`;
  crtEl.style.top = `${(glass.y - machine.sy) * s}px`;
  crtEl.style.width = `${glass.w * s}px`;
  crtEl.style.height = `${glass.h * s}px`;
  crt?.setRasterBox(rasterInGlass(machine));
  // The shader only re-reads the box on a render — repaint so a
  // machine switch while paused doesn't keep the old placement.
  requestPaint();
  if (backEl) {
    const hole = machine.hole;
    backEl.style.display = hole ? "block" : "none";
    if (hole) {
      // Pad past the measured aperture: the art's translucent glass rim
      // can run a few px outside it and would otherwise leak the
      // desktop. The overshoot hides behind the opaque bezel — every
      // machine keeps >= 44px of opaque art around its hole.
      const pad = SCREENBACK_HOLE_PAD;
      backEl.style.left = `${ox + (hole.x - pad) * s}px`;
      backEl.style.top = `${oy + (hole.y - pad) * s}px`;
      backEl.style.width = `${(hole.w + pad * 2) * s}px`;
      backEl.style.height = `${(hole.h + pad * 2) * s}px`;
    }
  }
}

function applyMachine(m: Machine): void {
  // A new case is a new tube: ring the degauss coil like a monitor
  // waking up. The init call passes the stored machine (same id), so
  // this only fires on an actual swap.
  if (m.id !== machine.id && crtOn) degaussTube();
  machine = m;
  shellEl.setAttribute("viewBox", `0 0 ${m.vbW} ${m.vbH}`);
  shellEl.innerHTML = shellMarkup(m);
  layoutMachine();
  try { localStorage.setItem(MACHINE_KEY, m.id); }
  catch { /* storage unavailable */ }
}
window.addEventListener("resize", layoutMachine);
applyMachine(machine);
// The machine art is pointer-events:none — a press anywhere that
// isn't the tank or real UI means a grab on the case → window drag.
document.addEventListener("pointerdown", (e) => {
  // A click on the case skips the boot — it must not fall through
  // into the window-drag path below.
  if (bootT0 !== null) { skipBoot(); return; }
  // Native performDrag loops on real mouse state — a synthesized
  // leftMouseDown from a touch tap has none and could hang it.
  if (e.button !== 0 || e.pointerType !== "mouse") return;
  if (!(e.target instanceof Element) || e.target.closest(
      "#screen, .ov, .osm-menu, #opentrigger, button, a, input, textarea,"
      + " select, label, [contenteditable]"))
    return;
  e.preventDefault();
  document.body.classList.add("grabbing");
  bus.post({ op: "dragWindow" }); // native shell → performDrag
});
// The case grab is :active's job done in JS: a native performDrag
// loops on real mouse state and the page may never see the pointerup,
// so every plausible release signal clears the class.
const endGrab = (): void => document.body.classList.remove("grabbing");
window.addEventListener("pointerup", endGrab);
window.addEventListener("pointercancel", endGrab);
window.addEventListener("blur", endGrab);
// A native modal drag can bounce focus on its way out.
window.addEventListener("focus", endGrab);
document.addEventListener("pointermove", (e) => {
  if (!e.buttons) endGrab(); // drag ended while the OS owned the mouse
});
// Seed clients + the native aspect before the first save/heartbeat —
// a launch with no open windows otherwise waits for the 10s save.
postState();

// Native-menu / keyboard entry points (macos/Finsical.swift calls these).
/** A pinch of pellets, one per hungry fish, scattered around a random
 * spot on the surface and raining in over a moment: repeated feeds
 * neither stack into one sinking column nor always pile up in the
 * middle. Each pellet splashes where it goes in. */
function feedFish(): void {
  // The click and key paths already check, but Tank ▸ Feed Fish can
  // arrive while a modal alert is up — don't drop food behind its scrim.
  if (alertOpen()) return;
  if (paused) return; // pellets only sink in tick(); fed now they'd hang
  // Bare F is a real user gesture, but Tank ▸ Feed Fish arrives via
  // evaluateJavaScript with no user activation — without unlock() the
  // context stays suspended until the first tank click.
  audio.unlock();
  const x = 30 + Math.random() * (TANK.width - 60);
  const hungry = sim.fish.filter(
    (f) => f.state !== "dead" && f.hunger > HUNGER_SEEK).length;
  const room = FOOD_CAP - sim.food.filter((p) => !p.eaten).length;
  // The cap refuses a pellet with a bare blip where it would have
  // landed — whether it's refused now or at drop time.
  const blip = (bx: number): void => {
    splashAt(bx, FOOD_ENTRY_Y, PUSH.pellet);
    requestPaint();
  };
  if (room <= 0) {
    // The tank's already full of uneaten food — no pellets, no shake.
    blip(x);
    return;
  }
  for (const p of feedPinch(Math.random, Math.min(hungry, room))) {
    setTimeout(() => {
      if (paused) return; // paused since the pinch was scattered
      // Re-check at drop time: a second click fills the tank while a
      // first pinch is still falling.
      if (sim.food.filter((q) => !q.eaten).length >= FOOD_CAP) {
        blip(x + p.dx);
        return;
      }
      const pellet = sim.dropFood(x + p.dx);
      if (!pellet) { noteFoodRefused(); return; }
      splashAt(pellet.x, pellet.y, PUSH.pellet);
      requestPaint();
    }, p.delay);
  }
  audio.feed(panFor(x, TANK.width));
  requestPaint();
}
function toggleAutoFeed(): void {
  audio.unlock(); // Tank ▸ Auto-Feed can be the first gesture
  autoFeed = !autoFeed;
  try { localStorage.setItem(AUTOFEED_KEY, autoFeed ? "1" : "0"); }
  catch { /* storage unavailable */ }
  postState();
}
function feederDrop(): void {
  const x = 30 + Math.random() * (TANK.width - 60);
  for (const p of feedPinch(Math.random, 0)) {
    if (sim.food.length >= AUTOFEED_MAX_FOOD) break; // cap, not just a gate
    const pellet = sim.dropFood(x + p.dx);
    if (!pellet) break; // a racer refilled the tank past MAX_UNEATEN
    splashAt(pellet.x, pellet.y, PUSH.pellet);
  }
  audio.feederChime();
}
/** Lamp switch: off holds the tank at night, on hands it back to the
 * Lighting mode. Persisted with the lighting settings. */
function toggleLights(): void {
  audio.unlock(); // Tank > Lamp On can be the first gesture
  applyLighting({ lamp: !lighting.lamp });
}
// A souvenir PNG of the live tank at 2x, nearest-neighbor so the
// pixels stay crisp. The 2D canvas always holds the scene, CRT or not.
function takePicture(): void {
  const out = document.createElement("canvas");
  out.width = TANK.width * 2;
  out.height = TANK.height * 2;
  const c = out.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  // A paused canvas carries the scrim and the PAUSED label — repaint
  // without them for the shot, then put the overlay back. Both
  // renders run inside this task, so nothing flickers.
  if (paused) render(true);
  c.drawImage(canvas, 0, 0, out.width, out.height);
  if (paused) render();
  const d = new Date();
  const pad = (n: number): string => String(n).padStart(2, "0");
  const name = `finsical-${d.getFullYear()}${pad(d.getMonth() + 1)}` +
    `${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}` +
    `${pad(d.getSeconds())}.png`;
  // A detached anchor's click() is ignored by some browsers — append
  // it for the click, then remove.
  const save = (href: string, revoke = false): void => {
    const a = document.createElement("a");
    a.href = href;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    // Revoking in the same tick can abort the download where blob
    // saves start asynchronously (Safari, Firefox).
    if (revoke) setTimeout(() => URL.revokeObjectURL(href), 5000);
  };
  const saveBlob = (blob: Blob | null): void => {
    if (!blob) { save(out.toDataURL("image/png")); return; }
    // WKWebView ignores <a download> entirely — hand the PNG bytes to
    // the shell, which answers with a real NSSavePanel.
    if (inNativeShell()) {
      const r = new FileReader();
      r.onload = () => {
        const url = typeof r.result === "string" ? r.result : "";
        bus.post({ op: "savePicture", name,
                   png: url.slice(url.indexOf(",") + 1) });
      };
      // Without this the picture just vanishes — try the anchor as a
      // last resort (ignored by WKWebView, harmless elsewhere).
      r.onerror = () => {
        console.warn("takePicture: FileReader failed:", r.error);
        save(URL.createObjectURL(blob), true);
      };
      r.readAsDataURL(blob);
      return;
    }
    save(URL.createObjectURL(blob), true);
  };
  // toBlob encodes off the critical path where supported; toDataURL
  // (synchronous on the main thread) is the fallback.
  if (typeof out.toBlob === "function") out.toBlob(saveBlob, "image/png");
  else save(out.toDataURL("image/png"));
}
// ---- keeping the tank --------------------------------------------------
// The water change, filter, heater, medicine and speed controls live in
// Tank Stats (web/stats.ts); Tank ▸ Change Water repeats the last change
// set there. Fresh tap water carries chlorine and, at another
// temperature, shocks the fish, as in the original.
function changeWater(cfg: Partial<WaterChange> = {}): void {
  audio.unlock(); // Tank ▸ Change Water can be the first gesture
  runLife(); // settle the tank up to now before the fresh water goes in
  const f = typeof cfg.fraction === "number" && Number.isFinite(cfg.fraction)
    ? Math.min(0.9, Math.max(0.01, cfg.fraction)) : waterChangeCfg.fraction;
  const t = typeof cfg.temp === "number" && Number.isFinite(cfg.temp)
    ? Math.min(36, Math.max(16, cfg.temp)) : waterChangeCfg.temp;
  waterChangeCfg = { fraction: f, temp: t };
  try { localStorage.setItem(CHANGE_KEY, JSON.stringify(waterChangeCfg)); }
  catch { /* storage unavailable */ }
  sim.changeWater(f, t);
  collectEvents();
  audio.changeWater();
  requestPaint(); // the murk clears at once, even while paused
  saveTank(); // persists + pushes fresh state to open panels
}
function cleanFilter(): void {
  runLife();
  sim.aquarium.cleanFilter();
  saveTank();
}
function setHeater(t: unknown): void {
  if (typeof t !== "number") return;
  runLife();
  sim.aquarium.setHeaterTarget(t);
  saveTank();
}
function addMedicine(id: unknown, ml: unknown): void {
  if (typeof id !== "number" || typeof ml !== "number") return;
  runLife();
  if (sim.aquarium.addMedicine(id, Math.min(10000, ml))) {
    audio.unlock();
    audio.feed();
    saveTank();
  }
}
function setSimSpeed(v: unknown): void {
  if (typeof v !== "number") return;
  runLife(); // time so far runs at the old speed, as in the original
  sim.aquarium.setSpeed(v);
  saveTank();
}
// Zen mode: the tank alone — menu bar, fish tips and the add-ons
// trigger all hide. The sim, the lamp and the bubbler keep running;
// it's the relaxation toy with every piece of chrome gone.
let zen = false;
function setZen(on: boolean): boolean {
  zen = on;
  document.body.classList.toggle("zen", on);
  if (on) {
    closeInfo(); // the card is chrome too
    fishTip.style.display = "none";
  }
  // Zen hides the menu bar — the case reclaims its 20 px (or pays it
  // back on exit).
  layoutMachine();
  requestPaint();
  return zen; // like togglePause: the native menu retitles at once
}
// Touch devices have no Escape or menu bar: a double-tap on the water
// leaves zen. Single taps still feed and tap the glass — zen is a
// view mode, not a lock.
canvas.addEventListener("dblclick", () => { if (zen) setZen(false); });
// Chrome that opens on top of zen leaves it — the menu bar comes back
// with the panel rather than the panel floating chrome-less.
function openImport(): void {
  if (zen) setZen(false);
  importPanel.open();
}
// Only what the native menu actually calls — Swift's Import Add-ons
// opens its own window, and Auto Feed, Degauss and Zen have no menu
// item to reach them through here. The type documents the bridge shape
// for this side only: Swift's evaluateJavaScript strings are untyped,
// so keep the member list in sync by hand.
const finsicalBridge = {
  feedFish, changeWater, toggleLights, takePicture,
  // Menu clicks land here via evaluateJavaScript — not always a
  // user activation, but unlock() is harmless if resume is blocked.
  toggleCrt: () => { audio.unlock(); setCrt(!crtOn); }, toggleMute,
  // Returns the new flag, so the native menu retitles at once.
  togglePause: () => setPaused(!paused),
};
type FinsicalBridge = typeof finsicalBridge;
declare global {
  interface Window { finsical?: FinsicalBridge; }
}
window.finsical = finsicalBridge;

// Keyboard entry point — the native Tank menu (⌘I / Ctrl+I) is the primary
// path. Touch fallback: hover-less devices have no keyboard or native menu.
// Re-evaluate on change so convertibles adapt when their input mode flips.
const hoverNone = window.matchMedia("(hover: none)");
const syncTrigger = (show: boolean): void => {
  document.getElementById("opentrigger")?.remove();
  if (!show) return;
  // A 20px Osmium push button is too small for a finger: a transparent
  // margin around it takes taps too (44px tall in all).
  const hit = document.createElement("div");
  hit.id = "opentrigger";
  hit.addEventListener("click", (e) => {
    if (e.target === hit) openImport();
  });
  const trigger = document.createElement("button");
  trigger.className = "osm-button";
  trigger.textContent = "Add-ons\u2026";
  hit.appendChild(trigger);
  document.body.appendChild(hit);
  pushButton(trigger, () => openImport());
};
syncTrigger(hoverNone.matches);
hoverNone.addEventListener("change", (e) => syncTrigger(e.matches));
window.addEventListener("keydown", (e) => {
  // Any key is a user gesture for WebAudio — unlock before the F/C
  // handlers so the first keyboard action also starts ambient sound.
  audio.unlock();
  if (bootT0 !== null) { skipBoot(); return; } // a key skips the boot
  const k = e.key.toLowerCase();
  // One Escape closes one thing: the card claims it first, then Zen
  // mode, and a key another window already handled leaves both alone.
  if (k === "escape" && infoCard && !e.defaultPrevented && !alertOpen()) {
    closeInfo();
    e.preventDefault();
    return;
  }
  if (k === "escape" && zen && !e.defaultPrevented && !alertOpen()) {
    setZen(false);
    e.preventDefault();
    return;
  }
  // Bare keys stand down while a menu, the add-on window or a modal
  // alert owns them.
  const bare = !e.metaKey && !e.ctrlKey && !e.altKey && !e.repeat &&
    !importPanel.isOpen && !menuOpen() && !docOpen() && !alertOpen();
  if ((e.metaKey || e.ctrlKey) && k === "i" && !inNativeShell() &&
      !alertOpen()) {
    // The app's Tank menu owns Cmd-I and opens the Import Add-ons
    // window; the overlay would squeeze into the tank.
    openImport(); e.preventDefault();
  } else if (bare && k === "f") {
    feedFish(); // bare F: Cmd-F is Find in browsers; the native menu owns ⌘F
  } else if (bare && k === "c") {
    setCrt(!crtOn); // bare C: ⌘C is Copy via the Edit menu
  } else if (bare && k === "l") {
    toggleLights(); // bare L: the lamp; ⌘L belongs to the native menu
  } else if (bare && k === "m") {
    toggleMute(); // bare M: ⌘M is Minimize
  } else if (bare && k === "d") {
    degaussTube(); // bare D: ⌘D is Bookmark in browsers
  } else if (bare && k === "p") {
    setPaused(!paused); // bare P: ⌘P is Print; the app's menu owns it
  } else if (bare && k === "z") {
    setZen(!zen); // bare Z: ⌘Z is Undo via the Edit menu
  } else if (bare && k === "s" && !inNativeShell()) {
    // Browser-only — the app opens stats.html via Tank ▸ Tank Stats.
    // Reuse without re-navigating: a reload would wipe the 90 s trend
    // window stats.ts keeps for the arrows.
    openClientWindow("stats");
  }
});

// The browser shell gets a Mac OS 8 menu bar of its own — the native
// app has its real menu. Its windows (Preferences, Tank Overview, Tank
// Stats) talk back over the BroadcastChannel bus, and About/Shortcuts
// are little in-page documents.
mountTankMenuBar({
  feed: feedFish,
  changeWater,
  toggleAutoFeed,
  importAddons: openImport,
  takePicture,
  exportTank,
  importTank,
  toggleCrt: () => setCrt(!crtOn),
  degauss: degaussTube,
  toggleLamp: toggleLights,
  toggleMute,
  togglePause: () => { setPaused(!paused); },
  toggleZen: () => setZen(!zen),
  toggleScold: () => {
    scoldOn = !scoldOn;
    // Drop the in-flight tally too, so a spree can't span the toggle:
    // taps counted before "off" would otherwise complete the moment
    // the sign comes back on inside the 8 s window.
    if (!scoldOn) glassTaps = [];
    try { localStorage.setItem(SCOLD_KEY, scoldOn ? "on" : "off"); }
    catch { /* storage unavailable */ }
  },
  toggleBoot: () => {
    bootEnabled = !bootEnabled;
    try { localStorage.setItem(BOOT_KEY, bootEnabled ? "on" : "off"); }
    catch { /* storage unavailable */ }
  },
  state: () => ({ autoFeed, crtUsable: crt?.usable ?? false, crtOn,
                  lampOn: lighting.lamp, muted: soundCfg.muted, paused,
                  zen, scoldOn, bootOn: bootEnabled }),
});
// The bar may have mounted after the first layout — place the case
// below it now rather than waiting for a resize.
layoutMachine();

// web/pack/ is gitignored and no build ships one, so a missing
// manifest means no bundled pack, not a failure worth a warning.
class NoBundledPack extends Error {}
const packFetch = async (p: string): Promise<Uint8Array> => {
  const r = await fetch(`pack/${p}`);
  if (r.status === 404 && p === "manifest.json") throw new NoBundledPack();
  if (!r.ok) throw new Error(`${p}: ${r.status}`);
  return new Uint8Array(await r.arrayBuffer());
};
// Add-ons the launch-time restore couldn't fetch — retried in the
// background by retryRestores once the chain settles.
let restoreFailed: Importable[] = [];
// Sound records the launch restored from storage (dropped files and
// installed sound add-ons alike).
let storedSounds = 0;
// Decided before the restore chain can save a tank.
const welcomePending = wantsWelcome(saved !== null);
void (async () => {
  const pack = await loadAzpack(packFetch);
  const idx = usePack(pack, packFetch);
  if (idx >= 0) sheetBySpecies.set(pack.manifest.tag, idx);
  const imgs: IndexedImage[] = [];
  for (const c of pack.manifest.chunks) {
    if (!c.image) continue;
    try { imgs.push(await decodeIndexedPng(await packFetch(c.image))); }
    catch { /* keep going without that image */ }
  }
  pickBackdrop(imgs);
})()
  .catch((e) => {
    if (e instanceof NoBundledPack) console.info("no bundled pack in pack/");
    else console.warn("azpack load failed; using placeholder fish:", e);
  })
  // Saved add-ons re-import after the bundled pack; once they've landed,
  // rebind saved fish to their species' actual sheet slot and heal
  // pre-spawning rosters that never gained their fish.
  .then(() => importPanel.restore([...installedAddons], stillListed))
  .then((failed) => {
    restoreFailed = failed;
    // The parade holds a beat after the last add-on settles (boot.ts).
    if (bootT0 !== null) bootDoneAt = performance.now() - bootT0;
  })
  // Imported 'snd ' sets persist — restore them so dropped sounds
  // survive relaunch even when no pack in use carries audio. Best
  // effort: a restore failure must not skip the fish roster healing.
  .then(() => sndsGet().catch((e) => {
    console.warn("snd restore failed:", e); return null;
  }))
  .then((recs) => {
    storedSounds = recs?.length ?? 0;
    return storedSounds ? audio.addWavs(recs!).catch((e) =>
      console.warn("snd decode failed:", e)) : undefined;
  })
  .then(() => {
    // The saved sounds are back: the bubbling starts, and the opening
    // sound plays now or on the first click.
    audio.open();
    // The user's chosen scenery wins over install-recency — applied
    // once every pack has had its restore chance. A pack that failed
    // to restore leaves whatever the chain picked, until a retry.
    applySceneryChoice();
    remapSheetIdx(); reconcileFish();
    retryRestores(restoreFailed);
    backfillStarterSounds({
      welcomePending,
      hasSounds: storedSounds > 0 ||
        installedAddons.some((a) => a.section === "sounds"),
      install: (it) => installAddon(it, false),
    }).catch((e) => console.warn("starter sounds skipped:", e));
  });

// First launch: offer to stock the tank (web/welcome.ts). Accepting
// installs through the same path as the Import Add-ons window, and the
// stand-ins leave once a real fish is in; declining keeps them.
if (welcomePending) {
  showWelcome({
    install: (it) => installAddon(it, false),
    fishArrived: removePlaceholders,
  });
}
function removePlaceholders(): void {
  let gone = false;
  for (const id of placeholderIds) gone = sim.removeFish(id) || gone;
  placeholderIds.clear();
  if (gone) { sweepThumbs(); requestPaint(); saveTank(); }
}

// Drag an .azpack folder onto the window to import it.
async function walkEntry(ent: FileSystemEntry, prefix: string,
                         out: Map<string, File>): Promise<void> {
  if (ent.isFile) {
    const file = await new Promise<File>((res, rej) =>
      (ent as FileSystemFileEntry).file(res, rej));
    out.set(prefix + file.name, file);
  } else if (ent.isDirectory) {
    const rd = (ent as FileSystemDirectoryEntry).createReader();
    for (;;) {
      const batch = await new Promise<FileSystemEntry[]>((res, rej) =>
        rd.readEntries(res, rej));
      if (!batch.length) break;
      for (const e of batch) await walkEntry(e, `${prefix}${ent.name}/`, out);
    }
  }
}
// Drop cue: while files hover the window, the glass shows a dashed
// frame and a hint. dragenter/dragleave nest per element, so a depth
// counter — not the events alone — owns the class.
let dragDepth = 0;
const setDragging = (on: boolean): void => {
  document.body.classList.toggle("dragging", on);
};
window.addEventListener("dragenter", (e) => {
  if (!e.dataTransfer?.types.includes("Files")) return;
  if (++dragDepth === 1) setDragging(true);
});
window.addEventListener("dragleave", (e) => {
  if (!e.dataTransfer?.types.includes("Files")) return;
  if (dragDepth > 0 && --dragDepth === 0) setDragging(false);
});
// Capture phase here too: a descendant that swallows dragover would
// keep dropEffect at "none" and the drop event would never fire.
window.addEventListener("dragover", (e) => e.preventDefault(), true);
// Capture phase: a drop ends the drag without a leave event, and a
// descendant handler that stops propagation must not strand the cue —
// nor let the browser navigate away to the dropped file.
window.addEventListener("drop", (e) => {
  e.preventDefault();
  dragDepth = 0;
  setDragging(false);
}, true);
// Right-click surfaces WebKit's generic menu (Reload etc.) — nothing
// in it applies to the tank, and the native window has no chrome.
window.addEventListener("contextmenu", (e) => e.preventDefault());
// A drop has no panel to ack into — say what happened on the glass
// itself, the way the "Drop to add" cue speaks from the same place.
const dropMsg = document.createElement("div");
dropMsg.id = "dropmsg";
// A polite live region — the result reaches screen readers too.
dropMsg.setAttribute("role", "status");
dropMsg.hidden = true;
document.getElementById("screen")!.appendChild(dropMsg);
let dropMsgTimer: ReturnType<typeof setTimeout> | undefined;
function dropSay(text: string): void {
  // A live region only announces a change — an identical repeat (two
  // bad drops in a row) needs a cleared frame between writes to speak.
  dropMsg.textContent = "";
  requestAnimationFrame(() => { dropMsg.textContent = text; });
  dropMsg.hidden = false;
  clearTimeout(dropMsgTimer);
  dropMsgTimer = setTimeout(() => {
    dropMsg.hidden = true;
    dropMsg.textContent = ""; // invisible, so stale text leaves the tree
  }, 4000);
}
window.addEventListener("drop", (e) => {
  e.preventDefault();
  // A drop is a gesture — wake audio now so the install feedback can
  // still answer it once the (async) decode finishes.
  audio.unlock();
  // Entries must be read before the handler returns — items invalidate.
  const items = e.dataTransfer?.items;
  const entries: FileSystemEntry[] = [];
  for (let i = 0; items && i < items.length; i++) {
    const ent = items[i]!.webkitGetAsEntry?.();
    if (ent) entries.push(ent);
  }
  // Snapshot the flat list now: the DataTransfer item list is cleared
  // once the drop event finishes dispatching, so reading .files after
  // an await sees nothing.
  const droppedFiles = Array.from(e.dataTransfer?.files ?? []);
  void (async () => {
    const files = new Map<string, File>();
    for (const ent of entries) await walkEntry(ent, "", files);
    // Items that expose no filesystem entry (webkitGetAsEntry missing
    // or returning null, as for items a script created): fall back to
    // the flat file list. Single .fsh/.REZ/audio drops still import;
    // an .azpack folder needs its entries.
    if (!files.size && droppedFiles.length) {
      for (const f of droppedFiles) files.set(f.name, f);
      if (files.size)
        console.info("drop: no folder entries; importing the files alone");
    }
    if (!files.size) {
      console.warn("drop: nothing readable in the drop");
      return;
    }
    // Strip a shared top-level folder so manifest.json sits at the root.
    const first = [...files.keys()][0] ?? "";
    let flat = new Map(files);
    if (!flat.has("manifest.json")) {
      const root = first.slice(0, first.indexOf("/") + 1);
      if (root && [...flat.keys()].every((p) => p.startsWith(root)))
        flat = new Map([...flat].map(([p, f]) => [p.slice(root.length), f]));
    }
    const readFile = async (p: string) => {
      const f = flat.get(p);
      if (!f) throw new Error(`pack file missing: ${p}`);
      return new Uint8Array(await f.arrayBuffer());
    };
    if (flat.has("manifest.json")) {
      const pack = await loadAzpack(readFile);
      const idx = usePack(pack, readFile);
      const spawn = spawnFromDrop(idx, pack.manifest.tag);
      const imgs: IndexedImage[] = [];
      for (const c of pack.manifest.chunks) {
        if (!c.image) continue;
        try { imgs.push(await decodeIndexedPng(await readFile(c.image))); }
        catch { /* keep going without that image */ }
      }
      pickBackdrop(imgs);
      dropSay(idx >= 0 && !spawn
        ? fishRefusal("fish") ?? "The tank is full."
        : `Added ${pack.manifest.tag?.trim() || "the add-on"}.`);
      console.info(`azpack imported: ${flat.size} files`);
      return;
    }
    // Audio files (mp3/wav/…) and 'snd ' resource forks — a dropped
    // AQUAZONE .rsrc (or its .bin/.hqx/AppleDouble wrapping) or a plain
    // audio file decodes in-app and persists. Classic forks cap at
    // ~16MB, but .bin/.hqx wrappers inflate that (BinHex text is ~4/3),
    // so allow up to 32MB before skipping.
    const recs: { name: string; wav: Uint8Array }[] = [];
    // A real 'snd ' bank is ~25 records; a folder drop of MP3s is
    // bounded so it can't decode hundreds of files into the tank.
    const DROP_SOUNDS_MAX = 64;
    // Pack files are collected here (their head is read once) and
    // decoded in the pass below, so no file is buffered twice.
    const packFiles: [string, File][] = [];
    let sndSkipped = 0;
    for (const [name, file] of flat) {
      const head = new Uint8Array(await file.slice(0, 0x104).arrayBuffer());
      if (isPack(head)) { packFiles.push([name, file]); continue; }
      if (file.size > 32 * 1024 * 1024) {
        console.warn("snd skip (too large):", name);
        continue;
      }
      if (recs.length >= DROP_SOUNDS_MAX) { sndSkipped++; continue; }
      const got = fileSoundRecords(
        name, new Uint8Array(await file.arrayBuffer()));
      if (!got.length) continue;
      recs.push(...got);
      console.info(`${name}: ${got.length} sounds imported`);
    }
    if (sndSkipped)
      console.warn(`drop: ${sndSkipped} files skipped — ` +
                   `${DROP_SOUNDS_MAX} sounds per drop is plenty`);
    const notes: string[] = [];
    // A bad audio file mustn't abort the raw-pack pass below.
    if (recs.length) {
      const ok = await handleSounds(recs)
        .then(() => true)
        .catch((e) => { console.warn("sound import failed:", e);
                        return false; });
      if (ok)
        notes.push(`Added ${recs.length} ` +
                   `sound${recs.length === 1 ? "" : "s"}.`);
      else notes.push("Couldn't save the sounds.");
    }
    // Not an .azpack folder — every dropped pack file imports, not
    // just the first (web/drop.ts, tested there). One file at a time:
    // an unreadable file costs only itself, and a folder drop never
    // holds every pack's bytes at once. Sections come from the
    // extension like remote installs' collections: a .fsh fish adds
    // no scenery, so its catalog art can't take the backdrop.
    let imported = 0;
    let packName = "";
    for (const [name, file] of packFiles) {
      let data: Uint8Array;
      try { data = new Uint8Array(await file.arrayBuffer()); }
      catch (e) {
        console.warn(`drop: skipping unreadable ${name}:`, e);
        continue;
      }
      const [p] = decodeDroppedPacks([[name, data]]);
      if (!p) {
        // No art: it may be the game's sound bank (AZ_WAVES.REZ). Its
        // records persist like any dropped sound; the pack isn't kept.
        const bank = fileSoundRecords(name, data);
        if (!bank.length) continue;
        try {
          await handleSounds(bank);
          imported++;
          console.info(`${name}: ${bank.length} sounds imported`);
        } catch (e) {
          console.warn("sound import failed:", e);
        }
        continue;
      }
      // A full tank takes no new fish: say so rather than store and
      // record a pack whose fish never spawns.
      const refusal = p.sheets.size ? fishRefusal("fish") : null;
      if (refusal) {
        console.warn(`drop: ${name}: ${refusal}`);
        if (!notes.includes(refusal)) notes.push(refusal);
        continue;
      }
      // A dropped pack has no home URL — mint a local: identity so the
      // bytes persist (the only copy lives in IndexedDB) and the pack
      // restores next launch like an installed add-on. Same-named
      // drops reuse the record and overwrite the stored bytes.
      const url = `${LOCAL_PREFIX}${name}`;
      // Await the write: a quota/private-mode failure should be logged
      // now, not discovered as a missing pack on next launch. The
      // catch is belt-and-braces: packPut's contract is never-fail,
      // but a rejection here would skip the remaining files.
      const stored = await packPut(url, data).catch((err) => {
        console.warn(`drop: ${name} packPut rejected`, err);
        return null;
      });
      if (!stored) {
        console.warn(`drop: ${name} could not be stored — it won't ` +
          "survive a relaunch");
        // The fish swims on, so a silent skip would read as a save —
        // say once per drop that this pack is session-only. packPut
        // can also fail for non-quota reasons (private mode, a dead
        // IndexedDB), so the wording stays cause-agnostic.
        if (storageWarnedAt !== e.timeStamp) {
          storageWarnedAt = e.timeStamp;
          showAlert({ icon: "caution",
            text: "Couldn't save dropped add-ons — they'll be gone " +
              "after you reload. If storage is full, remove some " +
              "add-ons to make room.",
            buttons: [{ title: "OK", default: true, cancel: true }] });
        }
      }
      // The archive install path: handleSheets binds the sheet to the
      // url and spawns the fish; scenery keys by url so Overview's
      // Remove clears it.
      // importAddon gives a stored local pack entry === url; record the
      // same binding so the fish's saved identity matches its restore.
      if (p.sheets.size)
        handleSheets(p.sheets, p.name, url, "fish", true, p.care, url);
      if (p.images.size)
        handleImages(p.images.values(), url, p.section, true);
      // Only when the bytes persisted — a dangling record would throw
      // "stored pack missing" on every launch. A pack with fish records
      // as fish (a .REZ's scenery then stays session-only).
      if (stored)
        recordInstall({ section: p.sheets.size ? "fish" : p.section,
                        inner: p.name, url });
      imported++;
      if (!packName) packName = p.name || name;
      console.info(`${name}: pack imported${stored ? "" : " (session only)"}`);
    }
    if (imported)
      notes.push(imported === 1 ? `Added ${packName}.`
                                : `Added ${imported} add-ons.`);
    if (notes.length) dropSay(notes.join(" "));
    // Sounds push a note on either outcome, so nothing said yet means
    // the drop had nothing usable at all.
    else
      dropSay(`Finsical can't use ${flat.size === 1 ? "that file" :
        "those files"} — drop an AquaZone .fsh or .azpack, ` +
        "or a sound file.");
    if (!imported && !recs.length)
      console.warn("drop: no manifest.json, pack file, or 'snd ' found");
  })().catch((e) => {
    console.warn("drop failed:", e);
    dropSay("Couldn't finish the drop — the file may be damaged or unsupported.");
  });
});

// Aquazone fish art is stored vertical (profiles in groups 0 and
// groups/2, dorsal toward x=0); orient.ts rotates the profile into a
// canonical dorsal-up pose. Sheets with a pose ring (groups >= 4) carry
// real art for both facings and the roll poses between — turns step the
// ring; simpler sheets mirror group 0 for right-facing fish.

// Tail-wag animation advances on the sim clock (30 tps), not per
// rendered frame — ~4-7 fps at cruise, quicker when startled. Phase is
// integrated per tick so speed changes alter the rate going forward,
// never the accumulated position; a fixed offset keeps fish desynced.
const animPhase = new WeakMap<Fish, number>();
const lastTick = new WeakMap<Fish, number>();
let nextPhase = 0;
function animFrame(f: Fish, nf: number): number {
  if (f.state === "dead") return 0; // a body doesn't wag its tail
  let ph = animPhase.get(f);
  if (ph === undefined) { ph = nextPhase; nextPhase += 1.618; }
  const last = lastTick.get(f) ?? sim.tickCount;
  ph = (ph + Math.max(0, sim.tickCount - last) * (0.1 + f.speed * 0.08))
    % Math.max(1, nf);
  animPhase.set(f, ph);
  lastTick.set(f, sim.tickCount);
  return Math.floor(ph);
}

// Small species draw at the shared art scale and big ones compress
// (fishScale), judged by the body their frames paint; a safety cap
// keeps an unusually large cell from filling the tank.
const MAX_FISH_W = TANK.width * 0.6, MAX_FISH_H = TANK.height * 0.6;
const sheetScales = new WeakMap<SpriteSheet, number>();
/** Frames are stored vertically: a profile is cellH wide once rotated.
 * Memoized: every drawn frame asks, and measuring scans the art. */
function sheetScale(sheet: SpriteSheet): number {
  let s = sheetScales.get(sheet);
  if (s === undefined) {
    const body = bodySize(sheet, restPose(sheet, 1).g);
    s = Math.min(fishScale(body, TANK.width, TANK.height),
                 MAX_FISH_W / sheet.meta.cellH,
                 MAX_FISH_H / sheet.meta.cellW);
    sheetScales.set(sheet, s);
  }
  return s;
}

/** Report a fish's half-extents at full growth to the sim, which
 * scales them by the fish's growth and keeps big bodies inside the
 * glass by them. Cells hold the fish on its side, so cellH is its
 * drawn width. Called wherever the fish's sheet can
 * change (spawn, a pack landing resolving waiting fish, restore
 * remaps) rather than while drawing, so no tick runs on stale extents
 * and a newly bound big fish doesn't snap inward on its next tick. */
function bindExtents(f: Fish): void {
  const sheet = sheetOf(f);
  if (!sheet) {
    delete f.halfW; delete f.halfH;
    return;
  }
  const s = sheetScale(sheet);
  f.halfW = sheet.meta.cellH * s / 2;
  f.halfH = sheet.meta.cellW * s / 2;
}

/** The scale a fish draws at: its sheet's art scale times its growth.
 * swimCanvas caches a shrunk frame per exact scale, so growth rounds
 * to 0.05 steps (finer than a pixel for most fish) to keep that cache
 * bounded. */
function drawScale(sheet: SpriteSheet, f: Fish): number {
  return sheetScale(sheet) * Math.round(f.scale * 20) / 20;
}

function drawFish(f: Fish): void {
  const sheet = sheetOf(f);
  if (!sheet) return drawPlaceholder(f);
  let cv: HTMLCanvasElement;
  try {
    const pose = fishPose(sheet, f);
    cv = swimCanvas(sheet, animFrame(f, sheet.meta.framesPerGroup),
                    pose.mir, pose.g, drawScale(sheet, f));
  } catch (e) {
    if (!(e instanceof RangeError)) throw e;
    // A truncated pack can legitimately lack this cell; an uncaught
    // RangeError here would abort the rest of every frame, so fall back.
    return drawPlaceholder(f);
  }
  ctx.save();
  // finally: a throwing drawImage must not leave its transform behind
  // for everything drawn after it. Whole-pixel offsets: an odd-sized
  // frame would otherwise sit on a half pixel.
  try {
    ctx.translate(Math.round(f.x), Math.round(f.y));
    if (f.state === "dead") bellyUp();
    else {
      if (f.life?.sick) ctx.globalAlpha = 0.55; // wan, but still swimming
      ctx.rotate(pitch(f));
    }
    ctx.drawImage(cv, -(cv.width >> 1), -(cv.height >> 1));
  } finally {
    ctx.restore();
  }
}

/** A dead fish floats belly-up, its colour gone grey. */
function bellyUp(): void {
  ctx.scale(1, -1);
  ctx.filter = "grayscale(0.7) brightness(0.85)";
}

// Placeholder until real Aquazone assets are imported: a pixel guppy
// (web/placeholder.ts) whose tail wags on the same clock as real fish.
function drawPlaceholder(f: Fish): void {
  // Takes the fish, not loose numbers: the frame, pitch and growth all
  // come from it, so no caller can pass a pitch where a frame goes.
  const frames = placeholderFrames();
  const cv = frames[animFrame(f, frames.length)]!;
  const scale = Math.round(f.scale * 20) / 20; // as drawScale rounds it
  ctx.save();
  ctx.translate(Math.round(f.x), Math.round(f.y));
  if (f.state === "dead") bellyUp();
  else if (f.life?.sick) ctx.globalAlpha = 0.55; // wan, but still swimming
  ctx.scale(-f.facing * scale, scale);
  // In the mirrored draw space the pitch angle flips sign.
  if (f.state !== "dead") ctx.rotate(-f.facing * pitch(f));
  ctx.drawImage(cv, -(cv.width >> 1), -(cv.height >> 1));
  ctx.restore();
}

const tankGradient = (() => {
  const g = ctx.createLinearGradient(0, 0, 0, TANK.height);
  g.addColorStop(0, "#2e7fc4");
  g.addColorStop(1, "#14508c");
  return g;
})();

// Reduced motion freezes the ambient light (caustics, shafts, glint).
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let waterMotion: WaterMotion = reducedMotion.matches ? "still" : "animated";
reducedMotion.addEventListener("change", (e) => {
  waterMotion = e.matches ? "still" : "animated";
});
// Water feedback — glass-tap rings and feed splashes, ticked on the
// sim clock so they animate even while fish pause between decisions.
const ripples: Ripple[] = [];
const splashes: Splash[] = [];
// The snail visitor: armed on the first tick (so a restored tickCount
// counts from the restore, not from zero), then re-armed after each
// crossing. Deliberately rare — minutes between visits.
let snail: SnailVisit | null = null;
let snailNextAt = -1;
const SNAIL_MIN_TICKS = 1800; // one tank minute at 30 tps
const snailSprite = new Map<string, HTMLCanvasElement>();
function drawSnail(x: number, paused: boolean, dir: 1 | -1): void {
  const key = `${dir}${paused ? "p" : ""}`;
  let cv = snailSprite.get(key);
  if (!cv) { cv = snailCanvas(dir, paused); snailSprite.set(key, cv); }
  // Foot row sits a pixel into the gravel strip so it reads planted.
  ctx.drawImage(cv, Math.round(x), TANK.height - BOTTOM_PAD - SNAIL_H + 2);
}
// Tap-popped bubbles: the ring lingers a few ticks where it burst.
const pops: { x: number; y: number; age: number }[] = [];
// The surface's springs, and the waterline drawn from them each frame.
// Pre-filled with the rest-state swell so isFeedZone reads a real line
// even before the first render.
const surface = newSurface();
// Surface columns are indexed by tank x — the widths must agree or
// the waterline, air cover and bubble masking land off by the drift.
if (SURFACE_W !== TANK.width)
  throw new Error(
    `SURFACE_W (${SURFACE_W}) must match TANK.width (${TANK.width})`);
const waterline = surfaceLine(surface, 0, new Int16Array(SURFACE_W));

/** How hard things push the surface, px/tick. */
const PUSH = { pellet: 1.6, newFish: 3.2, pop: 0.35, tap: 0.6 } as const;
/** A fish whose back is within this many px of the surface stirs it. */
const WAKE_DEPTH = 4;
/** Surface push per px/tick of a fish's speed at the top. */
const WAKE_PUSH = 0.05;

/** Droplets where something enters the water, and the waves it makes. */
function splashAt(x: number, y: number, push: number): void {
  splashes.push(newSplash(x, y));
  disturbSurface(surface, x, push);
}

/** Per-tick surface forcing: bubbles popping and fish cruising along
 * the top. Taps and splashes push it where they happen. */
function stirSurface(): void {
  for (const b of sim.bubbles)
    if (bubblePops(b.y)) disturbSurface(surface, b.x, PUSH.pop, 1);
  for (const f of sim.fish) {
    const back = f.y - (f.halfH ?? 0) * f.scale;
    if (back > SURFACE + WAKE_DEPTH || f.speed < 0.2) continue;
    // Alternate the sign with the stroke so a wake ripples rather
    // than pressing a trough that follows the fish.
    const sign = f.phase & 4 ? 1 : -1;
    disturbSurface(surface, f.x, sign * f.speed * WAKE_PUSH, 2);
  }
}
function render(hidePauseOverlay = false): void {
  // The startup parade owns the canvas until it fades: black, desktop,
  // marching icons — then the tank draws normally under a fading boot
  // screen, so the crossfade needs no compositing machinery.
  let bootFade = -1;
  if (bootT0 !== null) {
    const elapsed = performance.now() - bootT0;
    const phase = bootPhase(elapsed, bootDoneAt);
    if (phase === "done") bootT0 = null;
    else if (phase === "fade")
      bootFade = fadeProgress(elapsed, bootDoneAt);
    else { drawBoot(ctx, phase, paradeIcons); return; }
  }
  if (backdropCv) {
    ctx.drawImage(backdropCv, 0, 0);
  } else {
    ctx.fillStyle = tankGradient;
    ctx.fillRect(0, 0, TANK.width, TANK.height);
  }
  if (gravelCv) {
    ctx.drawImage(gravelCv, 0, TANK.height - gravelCv.height);
  } else if (!backdropCv) {
    ctx.fillStyle = "#8a6d3b"; // gravel
    ctx.fillRect(0, TANK.height - BOTTOM_PAD, TANK.width, BOTTOM_PAD);
  }
  // Decorations spread evenly across the floor, bottoms planted in gravel.
  // Art keeps its authored width now (no 160 px cap), so a wide piece
  // is pulled inside the glass rather than hanging past it.
  const dn = decors.length;
  const sway = waterMotion === "animated";
  for (let i = 0; i < dn; i++) {
    const { frames, phase, sway: swayPh } = decors[i]!;
    const d = frames[decorFrame(sim.tickCount, frames.length, phase)]!;
    const x = Math.min(Math.max(
        Math.round(decorAnchor(i, dn) - d.width / 2), 0),
      Math.max(0, TANK.width - d.width));
    const y = TANK.height - DECOR_FLOOR - d.height;
    if (!sway) { ctx.drawImage(d, x, y); continue; }
    // Sway per horizontal band — offsets grow toward the tip, so the
    // planted root stays glued while the top drifts. Runs on the sim
    // clock like decor frames: a paused tank holds still. Each band
    // clamps around the planted x, so in-glass pieces never overhang.
    // Anchor the window at x: an oversized or out-of-bounds piece keeps
    // its planted position instead of snapping to a glass edge.
    const xmin = Math.min(x, 0);
    const xmax = Math.max(x, TANK.width - d.width);
    for (let b = 0; b < SWAY_BANDS; b++) {
      const y0 = Math.floor(b * d.height / SWAY_BANDS);
      const y1 = Math.floor((b + 1) * d.height / SWAY_BANDS);
      if (y1 <= y0) continue;
      const dx = swayOffset(sim.tickCount, swayPh,
                            (y0 + y1) / 2 / d.height);
      const bx = Math.min(Math.max(x + dx, xmin), xmax);
      ctx.drawImage(d, 0, y0, d.width, y1 - y0,
                    bx, y + y0, d.width, y1 - y0);
    }
  }

  const floor = nightFloor(lighting);
  drawLight(ctx, sim.light, sim.tickCount, waterMotion, floor);

  drawFood(ctx, sim.food);
  // The snail crawls the gravel behind the fish — under them like the
  // decor, not floating over the water.
  if (snail) {
    const p = snailPose(snail, sim.tickCount, TANK.width);
    if (p) drawSnail(p.x, p.paused, snail.dir);
  }
  for (const f of sim.fish) drawFish(f);

  // The Overview's pick spotlights its fish with a marching-ants
  // marquee — the Finder's own selection cue. Ants march on the sim
  // clock so a paused tank doesn't freeze them mid-stroke.
  if (focusId !== null) {
    // The lease lapsed — the overview is gone and can't lift it.
    // Clearing the owner too lets any live Overview's next beat
    // reclaim the spotlight after the holder dies silently.
    if (Date.now() - focusAt > FOCUS_TTL) {
      focusId = null;
      focusOwner = "";
    }
    const f = focusId === null ? null
      : sim.fish.find((x) => x.id === focusId);
    // The fish left the tank — lift the spotlight so a recycled id
    // can't quietly reattach it to a new fish.
    if (focusId !== null && !f) focusId = null;
    if (f) {
      // halfW/halfH are the fish's unscaled sprite extents; a
      // juvenile's box shrinks with its growth scale. The fallbacks
      // box a fish whose sheet hasn't bound yet.
      const hw = (f.halfW ?? 10) * f.scale + 3;
      const hh = (f.halfH ?? 7) * f.scale + 3;
      const x0 = Math.max(1, Math.round(f.x - hw));
      const y0 = Math.max(1, Math.round(f.y - hh));
      const x1 = Math.min(TANK.width - 1, Math.round(f.x + hw));
      const y1 = Math.min(TANK.height - 1, Math.round(f.y + hh));
      ctx.save();
      ctx.setLineDash([2, 2]);
      ctx.lineWidth = 1;
      // The ants hold still under reduced motion, like the water.
      ctx.lineDashOffset = waterMotion === "animated"
        ? -(sim.tickCount % 8) / 2 : 0;
      ctx.strokeStyle = "rgba(0,0,0,.8)";
      ctx.strokeRect(x0 + .5, y0 + .5, x1 - x0 - 1, y1 - y0 - 1);
      ctx.lineDashOffset += 1;
      ctx.strokeStyle = "rgba(255,255,255,.8)";
      ctx.strokeRect(x0 + .5, y0 + .5, x1 - x0 - 1, y1 - y0 - 1);
      ctx.restore();
    }
  }

  // Ambient motion (swell, glint, shimmer) holds still under reduced
  // motion; waves from splashes and taps still play out, like ripples.
  const t = waterMotion === "animated" ? sim.tickCount : 0;
  surfaceLine(surface, t, waterline);
  drawRefraction(ctx, t);
  // The lamp lights the air as brightly as the daylight in the water.
  const sun = sunFactor(sim.light, floor);
  // The glare baked into the iMac renders rides over the tank — dim
  // it with the room light so fish stay readable at night. Only on
  // machines that ask (glassR); others' reflections stay put.
  if (machine.glassR !== undefined) {
    const glare = 0.25 + 0.35 * sun;
    if (Math.abs(glare - lastGlare) >= 0.02) {
      lastGlare = glare;
      shellEl.style.setProperty("--glare", String(glare));
    }
  }
  drawAir(ctx, sun, waterline);
  // The waterline divides feeding from tapping, so it brightens while
  // a click would feed. Under the murk and night overlays, so it dims
  // with the water instead of glowing at night.
  drawSurface(ctx, waterline, sun, t, overFeedZone);
  drawBubbles(ctx, sim.bubbles, waterline);
  for (const p of pops) drawBubblePop(ctx, p.x, p.y);

  // On the glass, so over the fish: ripples and splashes paint last.
  drawRipples(ctx, ripples);
  drawSplashes(ctx, splashes);

  // Fouled water murks the whole scene.
  drawMurk(ctx, sim.waterQuality, t);

  drawNight(new Date());

  // The cat presses its paw to the outside of the glass — painted after
  // the murk and night tints, which can't dim what's on the viewer's
  // side (a dark paw would vanish into fouled water otherwise).
  if (pawVisit) {
    const pose = pawPose(pawVisit, sim.tickCount);
    if (pose) drawPaw(pose.x, pose.y);
  }

  if (paused && !hidePauseOverlay) {
    ctx.save();
    ctx.fillStyle = "rgba(4,8,24,0.35)";
    ctx.fillRect(0, 0, TANK.width, TANK.height);
    ctx.fillStyle = "#e8e8e8";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("PAUSED", TANK.width / 2, TANK.height / 2);
    ctx.restore();
  }

  if (bootFade >= 0) {
    ctx.save();
    ctx.globalAlpha = 1 - bootFade;
    drawBoot(ctx, "parade", paradeIcons);
    ctx.restore();
  }
}

/** Night's blue, multiplied over the scene at the darkest demo night:
 * the water keeps its blues while warm colors fade. A dim blue screen
 * then lifts the shadows, so fish read as moonlit gray rather than
 * sinking into black. */
const NIGHT_TINT = { r: 70, g: 90, b: 150 };
const NIGHT_LIFT = { r: 26, g: 34, b: 60 };
/** Moonbeam strength under a full moon. */
const MOONBEAM_ALPHA = 0.08;
function drawNight(now: Date): void {
  const k = Math.min(1, (1 - sim.light) / (1 - DEMO_NIGHT_LIGHT));
  const W = TANK.width, H = TANK.height;
  ctx.save();
  if (k > 0.01) {
    const mix = (c: number): number => Math.round(255 - (255 - c) * k);
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle =
      `rgb(${mix(NIGHT_TINT.r)},${mix(NIGHT_TINT.g)},${mix(NIGHT_TINT.b)})`;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = `rgb(${Math.round(NIGHT_LIFT.r * k)},` +
      `${Math.round(NIGHT_LIFT.g * k)},${Math.round(NIGHT_LIFT.b * k)})`;
    ctx.fillRect(0, 0, W, H);
  }
  const cycle = (sim.tickCount % DAY_TICKS) / DAY_TICKS;
  const tint = twilightTint(lighting, minutesOfDay(now), cycle);
  if (tint) {
    // Warmest at the surface, where the low sun comes in. Soft-light
    // leaves black black and warms midtones — source-over lifted the
    // whole tank toward brown mud instead.
    const rgb = `${tint.r},${tint.g},${tint.b}`;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0,
      `rgba(${rgb},${Math.min(1, 2 * tint.a).toFixed(3)})`);
    g.addColorStop(1, `rgba(${rgb},${(0.6 * tint.a).toFixed(3)})`);
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  // Timer nights get a faint slanted moonbeam that waxes and wanes
  // with the real moon, so an evening tank has something to glow.
  const night = lighting.mode === "timer"
    ? Math.min(1, (1 - sim.light) / (1 - CLOCK_NIGHT_LIGHT)) : 0;
  const beam = MOONBEAM_ALPHA * night * moonIllumination(now.getTime());
  if (beam > 0.002) {
    const x0 = W * 0.62, slant = 70, half = 20;
    const g = ctx.createLinearGradient(x0 - half, 0, x0 + half, 0);
    g.addColorStop(0, "rgba(200,220,255,0)");
    g.addColorStop(0.5, `rgba(200,220,255,${beam.toFixed(3)})`);
    g.addColorStop(1, "rgba(200,220,255,0)");
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = g;
    // Skewed so the beam leans down and to the left; the gradient
    // skews with it and stays centered across the beam.
    ctx.transform(1, 0, -slant / H, 1, 0, 0);
    ctx.fillRect(x0 - half, 0, half * 2, H);
  }
  ctx.restore();
}

// ---- the cat ------------------------------------------------------------
// AquaZone's signature visitor: a paw drops from the top edge every few
// minutes, bats at the glass a couple of times, and leaves. Tick-driven,
// so it pauses with the sim and never fires while the tank is hidden.
let pawVisit: PawVisit | null = null;
/** tickCount of the next allowed visit; -1 until first scheduled. */
let pawNextAt = -1;
const pawSwatted = new Set<number>();

function pawTick(): void {
  const t = sim.tickCount;
  if (pawNextAt < 0)
    pawNextAt = t + PAW_FIRST + Math.floor(Math.random() * PAW_FIRST_RANGE);
  if (!pawVisit && t >= pawNextAt) {
    pawVisit = { t0: t, x: pawSpawnX(Math.random),
                 swats: 2 + (Math.random() < 0.4 ? 1 : 0) };
  }
  if (!pawVisit) return;
  if (!pawPose(pawVisit, t)) {
    pawVisit = null;
    pawSwatted.clear();
    pawNextAt = t + PAW_GAP + Math.floor(Math.random() * PAW_GAP_RANGE);
    return;
  }
  const sw = pawSwatAt(pawVisit, t);
  if (sw && !pawSwatted.has(sw.i)) {
    pawSwatted.add(sw.i);
    // The bat lands like a hard knock on that spot: startle the fish,
    // ring the glass, slap the surface.
    sim.tap(sw.x, sw.y);
    audio.tap(sw.x, sw.y, TANK.width, TANK.height);
    ripples.push({ x: sw.x, y: sw.y, age: 0 });
    disturbSurface(surface, sw.x, PUSH.tap, 8);
  }
}

/** The paw: a leg column to the top edge plus the pixel-art pad. */
function drawPaw(cx: number, top: number): void {
  ctx.fillStyle = PAW_FUR;
  ctx.fillRect(Math.round(cx) - 2, 0, 4, Math.max(0, Math.round(top)));
  const x0 = Math.round(cx - PAW_W / 2), y0 = Math.round(top);
  for (let y = 0; y < PAW_ART.length; y++) {
    const row = PAW_ART[y]!;
    for (let x = 0; x < row.length; x++)
      if (row[x] === "K") ctx.fillRect(x0 + x, y0 + y, 1, 1);
  }
}

// Dinner bell: one soft chime when somebody first starts begging —
// edge-triggered, so a tank that stays hungry doesn't nag, and a fed
// tank re-arms the bell for next time. The re-arm debounces: hunger
// and water quality can both flicker across their thresholds inside
// one episode, so the latch only clears after a sustained lull.
let bellHungry = false;
let bellCalmTicks = 0;
/** Per tick per plant, the chance its foliage releases an oxygen
 * bubble — a thin stream in daylight, not a fountain. */
const PLANT_BUBBLE = 0.006;

function tickSim(): void {
  const bubbles = sim.bubbles.length;
  const pellets = sim.food.slice();
  stirSurface();
  sim.tick();
  // Lifecycle: each transition rings its original event sound. A birth
  // also binds the fry's sprite extents and splashes it in.
  let rosterChanged = false;
  for (const e of sim.events.splice(0)) {
    if (e.type === "sick") audio.sick();
    else if (e.type === "dead") {
      audio.dead();
      rosterChanged = true; // the roster shrank — don't resurrect it on reload
    } else if (e.type === "birth") {
      bindExtents(e.fish);
      splashAt(e.fish.x, e.fish.y, PUSH.newFish);
      audio.birth();
      rosterChanged = true; // the roster grew
    }
  }
  if (rosterChanged) saveTank();
  // The feeder runs on tank time (tickCount), so a restored tank
  // resumes mid-cycle rather than restarting the countdown.
  if (autoFeed && sim.fish.length && sim.food.length < AUTOFEED_MAX_FOOD &&
      sim.tickCount % AUTOFEED_TICKS === 0)
    feederDrop();
  // Snail visits run on the sim clock so a paused tank's snail waits.
  if (snailNextAt < 0)
    snailNextAt = sim.tickCount + (6 + Math.random() * 8) * SNAIL_MIN_TICKS;
  if (!snail && sim.tickCount >= snailNextAt)
    snail = snailSpawn(sim.tickCount, Math.random);
  if (snail && !snailPose(snail, sim.tickCount, TANK.width)) {
    snail = null;
    snailNextAt = sim.tickCount + (10 + Math.random() * 15) * SNAIL_MIN_TICKS;
  }
  // Photosynthesis: while the tank is lit, each plant leaks the odd
  // bubble from its crown — they rise through the same sim path as
  // gravel bubbles and pop at the waterline.
  if (sim.light >= WAKE_LIGHT)
    for (let i = 0; i < decors.length; i++) {
      const d = decors[i]!;
      if (!d.plant || Math.random() >= PLANT_BUBBLE) continue;
      sim.spawnBubble(
        decorAnchor(i, decors.length) + (Math.random() - 0.5) * 6,
        TANK.height - DECOR_FLOOR - d.frames[0]!.height * 0.7);
    }
  tickSurface(surface);
  pawTick();
  // Latch on the chime actually sounding: while the AudioContext is
  // suspended dinnerBell() returns false and we keep waiting, so a
  // hungry tank still rings once audio is unlocked.
  const anyBegging = sim.anyBegging;
  if (anyBegging) {
    bellCalmTicks = 0;
    if (!bellHungry) bellHungry = audio.dinnerBell();
  } else if (bellHungry && ++bellCalmTicks > TICKS_PER_SECOND * 10) {
    bellHungry = false;
  }
  tickRipples(ripples);
  tickSplashes(splashes);
  // A pellet eaten this tick is already spliced out of sim.food — its
  // `eaten` flag still reads on the snapshot taken above.
  for (const p of pellets)
    if (p.eaten && !sim.food.includes(p))
      audio.eat(panFor(p.x, TANK.width));
  for (let i = pops.length - 1; i >= 0; i--)
    if (++pops[i]!.age > 8) pops.splice(i, 1);
  // Sparse bloops: only some spawns make a sound. Checked per tick so
  // the odds don't depend on how often the tank is drawn.
  if (sim.bubbles.length > bubbles && Math.random() < 0.25) {
    const b = sim.bubbles[sim.bubbles.length - 1]!;
    audio.bubble(panFor(b.x, TANK.width));
  }
}

// Fixed-step sim on rAF. render() depends only on sim state and
// installed art, so a frame without a tick would redraw the same
// picture: at 60 Hz every other frame, at 120 Hz three in four, each
// also re-uploading the CRT texture. Those frames are skipped (the CRT
// grain and flicker then move at the tick rate too).
let acc = 0;
let last = performance.now();
function frame(now: number): void {
  // Schedule first: an exception while drawing must not stop the tank.
  requestAnimationFrame(frame);
  const plan = planFrame(acc, now - last, STEP_MS);
  acc = plan.acc;
  last = now;
  // The light timer follows the Mac's clock; hand the sim this
  // frame's light before it ticks.
  syncLight(new Date());
  // Ahead of the tick gate: hover must update (and repaint) even
  // while no tick runs.
  syncFeedHover();
  // Pause freezes the sim clock (hunger, rot, filtration, the demo
  // day) but not the page: hover, the light timer and repaints still
  // run. Dropping the accumulator keeps a long pause from
  // fast-forwarding on resume.
  if (paused) acc = 0;
  const ticks = paused ? 0 : plan.ticks;
  for (let i = 0; i < ticks; i++) tickSim();
  runLife();
  showNotices();
  // An open Get-Info card follows its fish, and moves with the window
  // on a resize, whether or not a tick runs.
  if (infoCard) layoutInfo();
  // The CRT's tube animations (warm-up, collapse, degauss) run on
  // their own clock — collapse in particular must keep drawing after
  // crtOn has already cleared. The boot parade also animates on its
  // own clock: it needs a draw per frame even before the first tick.
  const crtBusy = crt?.animating ?? false;
  if (ticks === 0 && !frameDirty && !crtBusy && bootT0 === null) return;
  frameDirty = false;
  render();
  // A parked cursor doesn't re-hit-test: hide the tip once the fish
  // under it has swum off, and refresh the label while it stays —
  // the state word would otherwise go stale between pointermoves.
  if (lastHover && fishTip.style.display !== "none") {
    const tip = tipForPoint(lastHover);
    if (!tip) fishTip.style.display = "none";
    else if (fishTip.textContent !== tip) {
      fishTip.textContent = tip;
      // A longer label can overflow the edge the last clamp used —
      // re-clamp against the new size.
      if (lastClient) placeTip({ clientX: lastClient.x,
                                 clientY: lastClient.y });
    }
  }
  if (crtOn || crtBusy) crt?.render();
}
// A resize changes the CRT buffer size, and resizing a WebGL canvas
// clears it: draw on the next frame instead of waiting for a tick.
window.addEventListener("resize", requestPaint);
requestAnimationFrame(frame);
