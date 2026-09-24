import { BOTTOM_PAD, DAY_TICKS, FOOD_ENTRY_Y, Sim, SURFACE }
  from "../core/sim.js";
import { CLOCK_NIGHT_LIGHT, DEMO_NIGHT_LIGHT, lightAt, moonIllumination,
         nightFloor, sanitizeLighting, twilightTint } from "../core/light.js";
import { fishPose, pitch, restPose } from "../core/pose.js";
import { FISH_CAP, HUNGER_SEEK, SPAWN_HUNGER } from "../core/tuning.js";
import { planFrame } from "../core/loop.js";
import { decodeIndexedPng, loadAzpack, SpriteSheet } from "../core/data/azpack.js";
import { isPack } from "../core/data/fsh.js";
import { decodeDroppedPacks } from "./drop.js";
import { decorFrame, decorPhase } from "../core/data/decor.js";
import { bodySize, pickSwimSheet } from "../core/data/swimsheet.js";
import { fishScale } from "./artscale.js";
import { sanitizeSoundConfig, TankAudio } from "./audio.js";
import { drawRipples, drawSplashes, newSplash, tickRipples,
         tickSplashes } from "./fx.js";
import type { Ripple, Splash } from "./fx.js";
import { pushButton } from "osmium-ui";
import { alertOpen, showAlert } from "./alert.js";
import { recentTaps, shouldScold } from "./scold.js";
import { backfillStarterSounds, showWelcome, wantsWelcome }
  from "./welcome.js";
import { fetchAddon, installProblem, mountImportPanel, orphanedSounds,
         recordAddon, qualifySoundItemName, isListed, COLLECTIONS }
  from "./import.js";
import { fileSoundRecords, qualifySoundNames } from "../core/data/snd.js";
import { isLocalPack, LOCAL_PREFIX, packDelete, packPut, sndsGet,
         sndsMerge, sndsRemove } from "./store.js";
import { coverCrop, decorCanvases, imageCanvas, previewOf, soundIcon,
         swimCanvas } from "./render.js";
import { placeholderFrames } from "./placeholder.js";
import { containPoint, isFeedZone } from "./feedzone.js";
import { PAW_ART, PAW_FIRST, PAW_FIRST_RANGE, PAW_FUR, PAW_GAP,
         PAW_GAP_RANGE, PAW_H, PAW_W, pawPose, pawSpawnX, pawSwatAt }
  from "./catpaw.js";
import type { PawVisit } from "./catpaw.js";
import { fishThumbKey, inNativeShell, openBus } from "./bus.js";
import { docOpen, menuOpen, mountTankMenuBar, openClientWindow }
  from "./menubar.js";
import { stateLabel } from "./overviewmodel.js";
import { initCrt, sanitizeCrtConfig } from "./crt.js";
import { bubblePops, drawAir, drawBubbles, drawFood, drawLight, drawMurk,
         drawRefraction, drawSurface, feedPinch, sunFactor } from "./water.js";
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
import type { AzpackManifest, IndexedImage } from "../core/data/azpack.js";

const TANK = { width: 320, height: 200 };

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
}
function loadTank(): SavedTank | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as SavedTank;
    if ((s?.v !== 1 && s?.v !== 2) ||
        !Array.isArray(s.fish) || !Array.isArray(s.addons))
      return null;
    return s;
  } catch { return null; }
}
const saved = loadTank();
const installedAddons: Importable[] = [...(saved?.addons ?? [])];
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

const sim = new Sim(TANK, 0x9003);
const audio = new TankAudio();
// Hidden (Cmd-H, minimized, background tab): rAF stops and the sim
// freezes, so the ambient loop and the audio device pause with it.
const syncAudioVisibility = (): void => audio.setHidden(document.hidden);
document.addEventListener("visibilitychange", syncAudioVisibility);
syncAudioVisibility();
if (saved) {
  // Storage is untrusted: a negative or fractional tick count, or water
  // outside 0..1, would re-persist and skew the day cycle or the murk.
  if (Number.isFinite(saved.tickCount))
    sim.tickCount = Math.max(0, Math.trunc(saved.tickCount));
  if (Number.isFinite(saved.waterQuality))
    sim.waterQuality = Math.min(1, Math.max(0, saved.waterQuality));
}

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

function saveTank(): void {
  try {
    const s: SavedTank = {
      v: rosterComplete ? 2 : 1,
      tickCount: sim.tickCount, waterQuality: sim.waterQuality,
      fish: sim.fish.map((f) => ({
        id: f.id, species: f.species, x: f.x, y: f.y, facing: f.facing,
        heading: f.heading, speed: f.speed, cruise: f.cruise, vy: f.vy,
        bandY: f.bandY, hunger: f.hunger, scale: f.scale,
        ...(f.sheetIdx !== undefined ? { sheetIdx: f.sheetIdx } : {}),
        ...(f.pack !== undefined ? { pack: f.pack } : {}),
      })),
      addons: installedAddons,
      scenery: sceneryChoice,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch { /* storage unavailable — the tank still runs */ }
  postState(); // panel keeps fresh state even if persistence is off
}
window.addEventListener("pagehide", saveTank);
// WKWebView doesn't reliably deliver pagehide on quit; it does
// deliver visibilitychange.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") saveTank();
});
setInterval(saveTank, 10_000);

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
                         canvas.getBoundingClientRect(), TANK);
  // Paused drops the affordance too — the click below is gated the
  // same way, so the cursor mustn't promise a feed that won't land.
  setFeedHover(p !== null && !paused &&
               isFeedZone(p.x, p.y, waterline));
}

canvas.addEventListener("pointerdown", (e) => {
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
    audio.feed();
    splashAt(pellet.x, pellet.y, PUSH.pellet);
  } else {
    sim.tap(p.x, p.y); audio.tap(p.x, p.y, TANK.width, TANK.height);
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
const fishToName = (p: { x: number; y: number }): Fish | null =>
  infoCard || importPanel.isOpen || menuOpen() || docOpen() || alertOpen()
    ? null : fishAtPoint(p);
const fishTipLabel = (f: Fish): string =>
  (f.species || "Fish") +
  (f.state === "drift" ? "" : ` — ${stateLabel(f.state)}`);
// Tank coords of the last hover — the frame loop re-checks it so the
// tip doesn't linger when the fish swims away from a parked cursor.
let lastHover: { x: number; y: number } | null = null;

canvas.addEventListener("pointermove", (e) => {
  lastClient = { x: e.clientX, y: e.clientY };
  if (!e.isPrimary) return; // one pointer drives curiosity
  const p = tankPoint(e.clientX, e.clientY);
  sim.notice = p;
  if (e.pointerType === "touch") return; // no hover on touch
  lastHover = p;
  const best = p && fishToName(p);
  if (!best) { fishTip.style.display = "none"; return; }
  fishTip.textContent = fishTipLabel(best);
  fishTip.style.display = "";
  // Clamp inside the viewport — the tank usually fills the window,
  // so an unclamped +14 offset clips at the right and bottom edges.
  fishTip.style.left = `${Math.max(4, Math.min(e.clientX + 14,
    innerWidth - fishTip.offsetWidth - 4))}px`;
  fishTip.style.top = `${Math.max(4, Math.min(e.clientY + 14,
    innerHeight - fishTip.offsetHeight - 4))}px`;
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
  screenEl.appendChild(root);
  infoCard = { root, hunger, mood, fish: f };
}

/** Reposition the card over its fish and refresh the two live lines.
 * Runs every frame from frame() while a card is open; the fish's
 * removal closes it. */
function layoutInfo(): void {
  const card = infoCard;
  if (!card) return;
  const f = card.fish;
  if (!sim.fish.includes(f)) { closeInfo(); return; }
  const r = canvas.getBoundingClientRect();
  const sr = screenEl.getBoundingClientRect();
  const s = Math.min(r.width / TANK.width, r.height / TANK.height);
  // Card space is screenEl-relative — rect deltas stay right under
  // scroll and regardless of which ancestor is positioned.
  const ox = r.left - sr.left + (r.width - TANK.width * s) / 2;
  const oy = r.top - sr.top + (r.height - TANK.height * s) / 2;
  const cw = card.root.offsetWidth, ch = card.root.offsetHeight;
  let px = ox + f.x * s - cw / 2;
  let py = oy + f.y * s - ch - 8;
  if (py < 0) py = oy + f.y * s + 16; // too near the surface: go under
  // Bounds are screenEl-relative like the offsets above — the canvas
  // may not fill the screen exactly.
  card.root.style.left =
    `${Math.max(0, Math.min(px, sr.width - cw))}px`;
  card.root.style.top =
    `${Math.max(0, Math.min(py, sr.height - ch))}px`;
  const hunger = `Hunger  ${Math.round(f.hunger * 100)}%`;
  const mood = stateLabel(f.state);
  if (card.hunger.textContent !== hunger)
    card.hunger.textContent = hunger;
  if (card.mood.textContent !== mood) card.mood.textContent = mood;
}

// A knocking spree gets the public aquarium's sign (web/scold.ts).
let glassTaps: number[] = [];
let scoldedAt: number | null = null;
function noteGlassTap(): void {
  const now = performance.now();
  glassTaps = [...recentTaps(glassTaps, now), now];
  if (!shouldScold(glassTaps, now, scoldedAt)) return;
  scoldedAt = now;
  glassTaps = [];
  showAlert({ icon: "caution",
              text: "Please don't tap on the glass. It frightens the fish.",
              buttons: [{ title: "OK", default: true, cancel: true }] });
}

// ---- sprite loading ----------------------------------------------------
// Drop an emitted .azpack into web/pack/ (manifest.json at its root), or
// drag the folder onto the window, and real Aquazone sprites replace the
// placeholder fish.
// The adult swim ring per imported pack; fish get sheets round-robin so
// a tank can mix species.
let fishSheets: SpriteSheet[] = [];
function usePack(pack: { sheets: Map<string, SpriteSheet>;
                         manifest?: AzpackManifest },
                 read?: (path: string) => Promise<Uint8Array>): number {
  const sheet = pickSwimSheet(pack.sheets.values());
  if (sheet) {
    fishSheets.push(sheet);
    // One more sheet re-deals every round-robin fish's art.
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
                   cap: CapRule = "enforce"): Fish | null {
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
function spawnFromDrop(idx: number, species: string): void {
  if (idx < 0) return;
  if (spawnFish(idx, species)) audio.splash();
  else console.warn(`Tank is full — ${FISH_CAP} fish max. ` +
    "Release one from Tank Overview first.");
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
function fitGravel(img: IndexedImage): HTMLCanvasElement {
  const src = imageCanvas(img, false);
  const out = document.createElement("canvas");
  out.width = TANK.width;
  out.height = Math.max(1, Math.round(src.height * TANK.width / src.width));
  const c = out.getContext("2d")!;
  c.imageSmoothingEnabled = false; // keep the crunch
  c.drawImage(src, 0, 0, out.width, out.height);
  return out;
}
function pickBackdrop(images: Iterable<IndexedImage>, src = ""): void {
  let best: IndexedImage | null = null;
  let gravel: IndexedImage | null = null;
  for (const img of images) {
    if (img.w >= img.h * 3 && img.w >= TANK.width / 2) { if (!gravel || img.w > gravel.w) gravel = img; continue; }
    if (img.w * img.h < (TANK.width * TANK.height) / 4) continue;
    if (img.w < TANK.width / 2 || img.h < TANK.height / 2) continue;
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
    if (img.w >= img.h * 3 && img.w >= TANK.width / 2 &&
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
                pack: string }[] = [];
function addDecor(images: Iterable<IndexedImage>, src: string): void {
  const frames = decorCanvases(images, TANK.height);
  if (!frames) return;
  const copy = decors.filter((d) => d.pack === src).length;
  decors.push({ frames, phase: decorPhase(src, copy, frames.length),
                pack: src });
}
const fishSlot = new WeakMap<Fish, number>();
const MAX_FISH_SLOTS = 4096;
let nextSlot = 0;
function sheetOf(f: Fish): SpriteSheet | null {
  if (!fishSheets.length) return null;
  // Fish spawned by a specific pack keep its sheet; the rest round-robin.
  // Out-of-range bindings fall through rather than wrapping onto an
  // unrelated species' art.
  if (f.sheetIdx !== undefined && f.sheetIdx >= 0 &&
      f.sheetIdx < fishSheets.length)
    return fishSheets[f.sheetIdx]!;
  let i = fishSlot.get(f);
  if (i === undefined) {
    i = nextSlot;
    nextSlot = (nextSlot + 1) % MAX_FISH_SLOTS; // slots may repeat after wrap; only used to pick a sheet
    fishSlot.set(f, i);
  }
  return fishSheets[i % fishSheets.length]!;
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
// species name (basenames collide across collections).
const sheetByPack = new Map<string, number>();
// Reverse of sheetByPack — which pack owns a slot, for migrating
// species-bound fish onto the URL binding of the sheet they render.
const packBySheet = new Map<number, string>();
function handleSheets(sheets: Map<string, SpriteSheet>, name: string,
                      url: string, section: string, live: boolean): void {
  // Only fish sections register sheets — a tank/scenery pack's sprite
  // streams mustn't join the fish pool or starter fish could
  // round-robin onto art nobody chose.
  if (section !== "fish") return;
  const idx = usePack({ sheets });
  if (idx >= 0) {
    sheetBySpecies.set(name, idx);
    // A reinstall can rebind the url to a new slot — drop the old
    // reverse entry so the two maps stay exact inverses.
    const prior = sheetByPack.get(url);
    if (prior !== undefined && prior !== idx) packBySheet.delete(prior);
    sheetByPack.set(url, idx);
    packBySheet.set(idx, url);
    // A live fish-pack install adds a real fish; restores replay sheets
    // only — the saved roster already carries those fish.
    if (live && spawnFish(idx, name, url)) audio.splash();
  }
  console.info(`archive.org: imported ${section} ${name}`);
  requestPaint(); // restores can rebind existing fish to new art
  if (pendingThumbs.size) serveThumbs([...pendingThumbs]);
}

/** Rebind each saved fish's sheetIdx to where its species' pack actually
 * landed this session. Unknown species keep in-range bindings (the
 * bundled pack registers its tag too) — only out-of-range ones drop. */
function remapSheetIdx(): void {
  for (const f of sim.fish) {
    // Fish spawned by an add-on rebind by pack URL; older saves carry
    // only a species name — fall back to it (collisions just share art).
    const idx = f.pack !== undefined
      ? sheetByPack.get(f.pack)
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
    } else if (f.sheetIdx !== undefined &&
               (f.sheetIdx < 0 || f.sheetIdx >= fishSheets.length))
      delete f.sheetIdx;
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
                      section: string, live: boolean): void {
  // fish packs carry portraits too — only scenery sections touch the tank
  if (section === "gravel") pickGravel(images, src);
  else if (section === "plants" || section === "accessories")
    addDecor(images, src);
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
  if (live) audio.playImported(recs[0]!.name);
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
  onRestore: refreshInstall,
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

function postState(): void {
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
    fish: sim.fish.map(({ id, species, hunger, state, pack }) =>
      ({ id, species, hunger, state,
         ...(pack !== undefined ? { pack } : {}) })),
    waterQuality: sim.waterQuality,
    tickCount: sim.tickCount,
    // The stats window reads these; kept as raw counts so it can derive
    // its own guidance (e.g. settled pellets foul the water as they rot).
    food: sim.food.length,
    foodSettled: sim.food.reduce((n, f) => n + (f.settled > 0 ? 1 : 0), 0),
    bubbles: sim.bubbles.length,
    light: sim.light,
    lighting,
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
  for (const k of keys) {
    if (typeof k !== "string") continue;
    const data = k.startsWith("f:")
      ? (() => {
          const f = sim.fish.find((x) => fishThumbKey(x) === k);
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
        ? sim.fish.some((x) => fishThumbKey(x) === k)
        : k.startsWith("a:") &&
          installedAddons.some((a) => a.url === k.slice(2));
      if (alive) pendingThumbs.add(k); else pendingThumbs.delete(k);
    }
  }
  if (Object.keys(thumbs).length) bus.post({ op: "thumbs", thumbs });
}

// Thumb entries keyed to a fish that's gone can never be served
// again — sweep them on any removal so the maps stay bounded.
function sweepThumbs(): void {
  const alive = (k: string) =>
    !k.startsWith("f:") ||
    sim.fish.some((x) => fishThumbKey(x) === k);
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
  if (m.op === "hello") postState();
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
    changeWater();
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
  const slot = sheetByPack.get(url);
  // Only delete the reverse entry it still owns — a rebind may have
  // handed the slot to a different pack since.
  if (slot !== undefined && packBySheet.get(slot) === url)
    packBySheet.delete(slot);
  sheetByPack.delete(url);
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
  if (running) return running;
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
  }).finally(() => installsInFlight.delete(it.url));
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
  const usable = rs.filter(
    (r) => r.sheets.size || r.images.size || r.sounds.length);
  if (!usable.length) throw new Error("no pack inside");
  for (const r of usable) {
    if (r.sheets.size)
      handleSheets(r.sheets, it.inner, it.url, it.section, true);
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

try { setCrt(localStorage.getItem(CRT_KEY) === "1"); }
catch { /* storage unavailable — default off */ }

// ---- machine case -----------------------------------------------------
// The window has no native chrome — the "computer" around the tank is
// a rendered image (web/machines.ts) layered OVER the aquarium so its
// transparent glass and baked reflections stay on top of the water.
// #screenback paints unlit-glass black into the aperture behind the
// tank; the native mask refills the same aperture so the window keeps
// a screen-shaped silhouette instead of a see-through hole.
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
  const w = machineEl.clientWidth, h = machineEl.clientHeight;
  if (!w || !h) return;
  // preserveAspectRatio=meet letterboxes the shell — land the screen
  // and its backplate on the same scaled + offset rects as the art's
  // glass. Computed, not CSS-percentage'd, so browser dev (no native
  // aspect enforcement) stays aligned too.
  const s = Math.min(w / machine.vbW, h / machine.vbH);
  const ox = (w - machine.vbW * s) / 2;
  const oy = (h - machine.vbH * s) / 2;
  screenEl.style.left = `${ox + machine.sx * s}px`;
  screenEl.style.top = `${oy + machine.sy * s}px`;
  screenEl.style.width = `${machine.sw * s}px`;
  screenEl.style.height = `${machine.sh * s}px`;
  // The CRT canvas spans the whole glass, not just the tank, so the
  // height/width pots can grow the raster into the aperture's black
  // margins. Offsets are relative to #screen, its parent.
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
  // Native performDrag loops on real mouse state — a synthesized
  // leftMouseDown from a touch tap has none and could hang it.
  if (e.button !== 0 || e.pointerType !== "mouse") return;
  if (!(e.target instanceof Element) || e.target.closest(
      "#screen, .ov, .osm-menu, #opentrigger, button, a, input, textarea,"
      + " select, label, [contenteditable]"))
    return;
  e.preventDefault();
  bus.post({ op: "dragWindow" }); // native shell → performDrag
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
  if (paused) return; // pellets only sink in tick(); fed now they'd hang
  // Bare F is a real user gesture, but Tank ▸ Feed Fish arrives via
  // evaluateJavaScript with no user activation — without unlock() the
  // context stays suspended until the first tank click.
  audio.unlock();
  const x = 30 + Math.random() * (TANK.width - 60);
  const hungry = sim.fish.filter((f) => f.hunger > HUNGER_SEEK).length;
  for (const p of feedPinch(Math.random, hungry)) {
    setTimeout(() => {
      if (paused) return; // paused since the pinch was scattered
      const pellet = sim.dropFood(x + p.dx);
      splashAt(pellet.x, pellet.y, PUSH.pellet);
      requestPaint();
    }, p.delay);
  }
  audio.feed();
  requestPaint();
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
  c.drawImage(canvas, 0, 0, out.width, out.height);
  const d = new Date();
  const pad = (n: number): string => String(n).padStart(2, "0");
  const a = document.createElement("a");
  a.href = out.toDataURL("image/png");
  a.download = `finsical-${d.getFullYear()}${pad(d.getMonth() + 1)}` +
    `${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}` +
    `${pad(d.getSeconds())}.png`;
  a.click();
}
// A partial water change, also callable from the stats window's bus op.
function changeWater(): void {
  audio.unlock(); // Tank ▸ Change Water can be the first gesture
  sim.changeWater();
  audio.changeWater();
  requestPaint(); // the murk clears at once, even while paused
  saveTank(); // persists + pushes fresh state to open panels
}
(window as unknown as { finsical?: unknown }).finsical =
  { openImport: () => importPanel.open(), feedFish, changeWater, toggleLights,
    // Menu clicks land here via evaluateJavaScript — not always a
    // user activation, but unlock() is harmless if resume is blocked.
    toggleCrt: () => { audio.unlock(); setCrt(!crtOn); }, toggleMute,
    // Returns the new flag, so the native menu retitles at once.
    togglePause: () => setPaused(!paused) };

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
    if (e.target === hit) importPanel.open();
  });
  const trigger = document.createElement("button");
  trigger.className = "osm-button";
  trigger.textContent = "Add-ons\u2026";
  hit.appendChild(trigger);
  document.body.appendChild(hit);
  pushButton(trigger, () => importPanel.open());
};
syncTrigger(hoverNone.matches);
hoverNone.addEventListener("change", (e) => syncTrigger(e.matches));
window.addEventListener("keydown", (e) => {
  // Any key is a user gesture for WebAudio — unlock before the F/C
  // handlers so the first keyboard action also starts ambient sound.
  audio.unlock();
  const k = e.key.toLowerCase();
  // One Escape closes one thing: the card claims it first, and a key
  // another window already handled leaves the card alone.
  if (k === "escape" && infoCard && !e.defaultPrevented && !alertOpen()) {
    closeInfo();
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
    importPanel.open(); e.preventDefault();
  } else if (bare && k === "f") {
    feedFish(); // bare F: Cmd-F is Find in browsers; the native menu owns ⌘F
  } else if (bare && k === "c") {
    setCrt(!crtOn); // bare C: ⌘C is Copy via the Edit menu
  } else if (bare && k === "l") {
    toggleLights(); // bare L: the lamp; ⌘L belongs to the native menu
  } else if (bare && k === "m") {
    toggleMute(); // bare M: ⌘M is Minimize
  } else if (bare && k === "p") {
    setPaused(!paused); // bare P: ⌘P is Print; the app's menu owns it
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
  importAddons: () => importPanel.open(),
  takePicture,
  toggleCrt: () => setCrt(!crtOn),
  toggleLamp: toggleLights,
  toggleMute,
  togglePause: () => { setPaused(!paused); },
  state: () => ({ crtUsable: crt?.usable ?? false, crtOn,
                  lampOn: lighting.lamp, muted: soundCfg.muted, paused }),
});

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
  .then((failed) => { restoreFailed = failed; })
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
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => {
  e.preventDefault();
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
      spawnFromDrop(idx, pack.manifest.tag);
      const imgs: IndexedImage[] = [];
      for (const c of pack.manifest.chunks) {
        if (!c.image) continue;
        try { imgs.push(await decodeIndexedPng(await readFile(c.image))); }
        catch { /* keep going without that image */ }
      }
      pickBackdrop(imgs);
      console.info(`azpack imported: ${flat.size} files`);
      return;
    }
    // Audio files (mp3/wav/…) and 'snd ' resource forks — a dropped
    // AQUAZONE .rsrc (or its .bin/.hqx/AppleDouble wrapping) or a plain
    // audio file decodes in-app and persists. Classic forks cap at
    // ~16MB, but .bin/.hqx wrappers inflate that (BinHex text is ~4/3),
    // so allow up to 32MB before skipping.
    const recs: { name: string; wav: Uint8Array }[] = [];
    // Pack files are collected here (their head is read once) and
    // decoded in the pass below, so no file is buffered twice.
    const packFiles: [string, File][] = [];
    for (const [name, file] of flat) {
      const head = new Uint8Array(await file.slice(0, 0x104).arrayBuffer());
      if (isPack(head)) { packFiles.push([name, file]); continue; }
      if (file.size > 32 * 1024 * 1024) {
        console.warn("snd skip (too large):", name);
        continue;
      }
      const got = fileSoundRecords(
        name, new Uint8Array(await file.arrayBuffer()));
      if (!got.length) continue;
      recs.push(...got);
      console.info(`${name}: ${got.length} sounds imported`);
    }
    // A bad audio file mustn't abort the raw-pack pass below.
    if (recs.length)
      await handleSounds(recs)
        .catch((e) => console.warn("sound import failed:", e));
    // Not an .azpack folder — every dropped pack file imports, not
    // just the first (web/drop.ts, tested there). One file at a time:
    // an unreadable file costs only itself, and a folder drop never
    // holds every pack's bytes at once. Sections come from the
    // extension like remote installs' collections: a .fsh fish adds
    // no scenery, so its catalog art can't take the backdrop.
    let imported = 0;
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
      if (!stored)
        console.warn(`drop: ${name} could not be stored — it won't ` +
          "survive a relaunch");
      // The archive install path: handleSheets binds the sheet to the
      // url and spawns the fish; scenery keys by url so Overview's
      // Remove clears it.
      if (p.sheets.size) handleSheets(p.sheets, p.name, url, "fish", true);
      if (p.images.size)
        handleImages(p.images.values(), url, p.section, true);
      // Only when the bytes persisted — a dangling record would throw
      // "stored pack missing" on every launch. A pack with fish records
      // as fish (a .REZ's scenery then stays session-only).
      if (stored)
        recordInstall({ section: p.sheets.size ? "fish" : p.section,
                        inner: p.name, url });
      imported++;
      console.info(`${name}: pack imported${stored ? "" : " (session only)"}`);
    }
    if (!imported && !recs.length)
      console.warn("drop: no manifest.json, pack file, or 'snd ' found");
  })().catch((e) => console.warn("azpack import failed:", e));
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
 * change (spawn, a pack landing re-dealing round-robin sheets, restore
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
    ctx.rotate(pitch(f));
    ctx.drawImage(cv, -(cv.width >> 1), -(cv.height >> 1));
  } finally {
    ctx.restore();
  }
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
  ctx.scale(-f.facing * scale, scale);
  // In the mirrored draw space the pitch angle flips sign.
  ctx.rotate(-f.facing * pitch(f));
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
// The surface's springs, and the waterline drawn from them each frame.
// Pre-filled with the rest-state swell so isFeedZone reads a real line
// even before the first render.
const surface = newSurface();
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
function render(): void {
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
  for (let i = 0; i < dn; i++) {
    const { frames, phase } = decors[i]!;
    const d = frames[decorFrame(sim.tickCount, frames.length, phase)]!;
    const x = Math.round(TANK.width * (i + 0.5) / dn - d.width / 2);
    ctx.drawImage(d, Math.min(Math.max(x, 0), Math.max(0, TANK.width - d.width)),
                  TANK.height - 6 - d.height);
  }

  const floor = nightFloor(lighting);
  drawLight(ctx, sim.light, sim.tickCount, waterMotion, floor);

  drawFood(ctx, sim.food);
  for (const f of sim.fish) drawFish(f);

  // Ambient motion (swell, glint, shimmer) holds still under reduced
  // motion; waves from splashes and taps still play out, like ripples.
  const t = waterMotion === "animated" ? sim.tickCount : 0;
  surfaceLine(surface, t, waterline);
  drawRefraction(ctx, t);
  // The lamp lights the air as brightly as the daylight in the water.
  const sun = sunFactor(sim.light, floor);
  drawAir(ctx, sun, waterline);
  // The waterline divides feeding from tapping, so it brightens while
  // a click would feed. Under the murk and night overlays, so it dims
  // with the water instead of glowing at night.
  drawSurface(ctx, waterline, sun, t, overFeedZone);
  drawBubbles(ctx, sim.bubbles, waterline);

  // On the glass, so over the fish: ripples and splashes paint last.
  drawRipples(ctx, ripples);
  drawSplashes(ctx, splashes);
  // The cat presses its paw to the outside of the glass — over the
  // water but under the murk/night tint it can't dim (it's out there
  // with the viewer).
  if (pawVisit) {
    const pose = pawPose(pawVisit, sim.tickCount);
    if (pose) drawPaw(pose.x, pose.y);
  }

  // Fouled water murks the whole scene.
  drawMurk(ctx, sim.waterQuality, t);

  drawNight(new Date());

  if (paused) {
    ctx.save();
    ctx.fillStyle = "rgba(4,8,24,0.35)";
    ctx.fillRect(0, 0, TANK.width, TANK.height);
    ctx.fillStyle = "#e8e8e8";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("PAUSED", TANK.width / 2, TANK.height / 2);
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
    // Warmest at the surface, where the low sun comes in.
    const rgb = `${tint.r},${tint.g},${tint.b}`;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `rgba(${rgb},${tint.a.toFixed(3)})`);
    g.addColorStop(1, `rgba(${rgb},${(tint.a * 0.3).toFixed(3)})`);
    ctx.globalCompositeOperation = "source-over";
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

function tickSim(): void {
  const bubbles = sim.bubbles.length;
  stirSurface();
  sim.tick();
  tickSurface(surface);
  pawTick();
  tickRipples(ripples);
  tickSplashes(splashes);
  // Sparse bloops: only some spawns make a sound. Checked per tick so
  // the odds don't depend on how often the tank is drawn.
  if (sim.bubbles.length > bubbles && Math.random() < 0.25)
    audio.bubble();
}

// Fixed-step sim on rAF. render() depends only on sim state and
// installed art, so a frame without a tick would redraw the same
// picture: at 60 Hz every other frame, at 120 Hz three in four, each
// also re-uploading the CRT texture. Those frames are skipped (the CRT
// grain and flicker then move at the tick rate too).
const TICKS_PER_SECOND = 30;
const STEP_MS = 1000 / TICKS_PER_SECOND;
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
  // An open Get-Info card follows its fish, and moves with the window
  // on a resize, whether or not a tick runs.
  if (infoCard) layoutInfo();
  // The CRT's power-on warm-up animates on its own clock.
  const warming = crtOn && (crt?.animating ?? false);
  if (ticks === 0 && !frameDirty && !warming) return;
  frameDirty = false;
  render();
  // A parked cursor doesn't re-hit-test: hide the tip once the fish
  // under it has swum off, and refresh the label while it stays —
  // the state word would otherwise go stale between pointermoves.
  if (lastHover && fishTip.style.display !== "none") {
    const best = fishToName(lastHover);
    if (!best) fishTip.style.display = "none";
    else {
      const label = fishTipLabel(best);
      if (fishTip.textContent !== label) fishTip.textContent = label;
    }
  }
  if (crtOn) crt?.render();
}
// A resize changes the CRT buffer size, and resizing a WebGL canvas
// clears it: draw on the next frame instead of waiting for a tick.
window.addEventListener("resize", requestPaint);
requestAnimationFrame(frame);
