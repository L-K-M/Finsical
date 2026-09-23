import { BOTTOM_PAD, FOOD_ROT_TICKS, Sim } from "../core/sim.js";
import { fishPose, pitch } from "../core/pose.js";
import { decodeIndexedPng, loadAzpack, SpriteSheet } from "../core/data/azpack.js";
import { fshToSheets, isPack, packImages } from "../core/data/fsh.js";
import { keyMask, pickDecorArt } from "../core/data/decor.js";
import { TankAudio } from "./audio.js";
import { pushButton } from "osmium-ui";
import { fetchAddon, mountImportPanel, qualifySoundItemName,
         COLLECTIONS } from "./import.js";
import { fileSoundRecords, qualifySoundNames } from "../core/data/snd.js";
import { sndsGet, sndsMerge } from "./store.js";
import { imageCanvas, previewOf, soundIcon, swimCanvas } from "./render.js";
import { fishThumbKey, inNativeShell, openBus } from "./bus.js";
import { initCrt, sanitizeCrtConfig } from "./crt.js";
import { DEFAULT_MACHINE, machineById, SCREENBACK_HOLE_PAD, shellMarkup }
  from "./machines.js";
import type { CrtConfig } from "./crt.js";
import type { Machine } from "./machines.js";
import type { BusMsg } from "./bus.js";
import type { Importable } from "./import.js";
import type { Fish } from "../core/sim.js";
import type { AzpackManifest, IndexedImage } from "../core/data/azpack.js";

const TANK = { width: 320, height: 200 };

const canvas = document.getElementById("tank") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
ctx.imageSmoothingEnabled = false;

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
// A v=1 save keeps writing v=1 until reconcileFish() has run once —
// otherwise an offline first launch would stamp the roster "final"
// before its fish packs could restore.
let rosterComplete = saved?.v !== 1;

const sim = new Sim(TANK, 0x9003);
const audio = new TankAudio();
if (saved) {
  if (Number.isFinite(saved.tickCount)) sim.tickCount = saved.tickCount;
  if (Number.isFinite(saved.waterQuality))
    sim.waterQuality = saved.waterQuality;
}
const DEFAULT_FISH: (Partial<Fish> & { x: number; y: number })[] =
  [0, 1, 2, 3].map((i) =>
    ({ x: 40 + i * 60, y: 50 + i * 30, facing: (i % 2 ? -1 : 1) as 1 | -1 }));
const roster = (saved?.fish ?? []).filter(
  (f): f is Partial<Fish> & { x: number; y: number } =>
    !!f && Number.isFinite(f.x) && Number.isFinite(f.y));
for (const f of roster?.length ? roster : DEFAULT_FISH) sim.addFish(f);

function saveTank(): void {
  try {
    const s: SavedTank = {
      v: rosterComplete ? 2 : 1,
      tickCount: sim.tickCount, waterQuality: sim.waterQuality,
      fish: sim.fish.map((f) => ({
        id: f.id, species: f.species, x: f.x, y: f.y, facing: f.facing,
        heading: f.heading, speed: f.speed, cruise: f.cruise, vy: f.vy,
        bandY: f.bandY, hunger: f.hunger,
        ...(f.sheetIdx !== undefined ? { sheetIdx: f.sheetIdx } : {}),
        ...(f.pack !== undefined ? { pack: f.pack } : {}),
      })),
      addons: installedAddons,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch { /* storage unavailable — the tank still runs */ }
  postState(); // panel keeps fresh state even if persistence is off
}
window.addEventListener("pagehide", saveTank);
setInterval(saveTank, 10_000);

// Click near the surface drops food; deeper clicks knock on the glass.
canvas.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return; // ignore right/middle clicks
  // object-fit: contain letterboxes the bitmap inside the element box.
  const r = canvas.getBoundingClientRect();
  const s = Math.min(r.width / TANK.width, r.height / TANK.height);
  const x = (e.clientX - r.left - (r.width - TANK.width * s) / 2) / s;
  const y = (e.clientY - r.top - (r.height - TANK.height * s) / 2) / s;
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x >= TANK.width || y < 0 || y >= TANK.height) return; // letterbox bar
  audio.unlock();
  if (y < TANK.height * 0.15) { sim.dropFood(x); audio.feed(); }
  else { sim.tap(x, y); audio.tap(x, y, TANK.width, TANK.height); }
  addRipple(x, y);
});

// ---- sprite loading ----------------------------------------------------
// Drop an emitted .azpack into web/pack/ (manifest.json at its root), or
// drag the folder onto the window, and real Aquazone sprites replace the
// placeholder fish.
// Best sheet per imported pack; fish get sheets round-robin so a tank can
// mix species.
let fishSheets: SpriteSheet[] = [];
function usePack(pack: { sheets: Map<string, SpriteSheet>;
                         manifest?: AzpackManifest },
                 read?: (path: string) => Promise<Uint8Array>): number {
  // Most orientation groups wins; tiebreak toward the crunchier cell.
  const sheets = [...pack.sheets.values()];
  sheets.sort((a, b) =>
    b.meta.groups - a.meta.groups || a.meta.cellH - b.meta.cellH);
  if (sheets[0]) fishSheets.push(sheets[0]);
  if (pack.manifest && read)
    void audio.load(read, pack.manifest)
      .then(() => audio.startAmbient())
      .catch((e) => console.warn("audio load failed:", e));
  return sheets[0] ? fishSheets.length - 1 : -1;
}

/** A newly installed fish pack adds one fish bound to its sheet —
 * "Add again" adds another of the same species. `pack` is the add-on's
 * install URL: the precise identity when packs share a species name. */
function spawnFish(sheetIdx: number, species: string, pack?: string): void {
  const facing = Math.random() < 0.5 ? 1 : -1;
  sim.addFish({
    x: 60 + Math.random() * (TANK.width - 120),
    y: 30 + Math.random() * (TANK.height - 90),
    facing: facing as 1 | -1,
    heading: facing > 0 ? 0 : Math.PI,
    cruise: 1.1 + Math.random() * 0.7,
    sheetIdx, species,
    ...(pack !== undefined ? { pack } : {}),
  });
  saveTank();
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
              backdropByPack.set(src, imageCanvas(best, true)); }
  if (gravel) { gravelByPack.delete(src);
                gravelByPack.set(src, imageCanvas(gravel, false)); }
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
                gravelByPack.set(src, imageCanvas(gravel, false)); }
  if (gravel) { gravelCv = gravelByPack.get(src)!; gravelSrc = src; }
}
// Decorations (plants/accessories) sit on the gravel between the backdrop
// and the fish. Each pack's art frame is scaled to fit; the set is
// re-spaced across the tank floor whenever one is added.
const decors: { cv: HTMLCanvasElement; pack: string }[] = [];
function addDecor(images: Iterable<IndexedImage>, src: string): void {
  // Art frames share one corner key index (0 or 255 depending on the
  // pack); catalog thumbnails have textured corners and are skipped.
  const pick = pickDecorArt(images);
  if (!pick) return;
  if (!pick.img.w || !pick.img.h) return; // zero-area art renders nothing
  const cv = pick.guessed
    ? imageCanvas(pick.img, false) // legacy: global index-0 clear
    : imageCanvas(pick.img, false, keyMask(pick.img, pick.key));
  const s = Math.min(1, TANK.height * 0.8 / cv.height,
                     TANK.width * 0.5 / cv.width);
  if (s >= 1) { decors.push({ cv, pack: src }); return; }
  const scaled = document.createElement("canvas");
  scaled.width = Math.max(1, Math.round(cv.width * s));
  scaled.height = Math.max(1, Math.round(cv.height * s));
  const c2 = scaled.getContext("2d")!;
  c2.imageSmoothingEnabled = false;
  c2.drawImage(cv, 0, 0, scaled.width, scaled.height);
  decors.push({ cv: scaled, pack: src });
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
  const idx = usePack({ sheets });
  if (section === "fish" && idx >= 0) {
    sheetBySpecies.set(name, idx);
    // A reinstall can rebind the url to a new slot — drop the old
    // reverse entry so the two maps stay exact inverses.
    const prior = sheetByPack.get(url);
    if (prior !== undefined && prior !== idx) packBySheet.delete(prior);
    sheetByPack.set(url, idx);
    packBySheet.set(idx, url);
    // A live fish-pack install adds a real fish; restores replay sheets
    // only — the saved roster already carries those fish.
    if (live) { spawnFish(idx, name, url); audio.splash(); }
  }
  console.info(`archive.org: imported ${section} ${name}`);
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
    spawnFish(idx, it.inner, it.url);
  }
  // spawnFish's own saves went out as v=1 — stamp the reconciled roster.
  rosterComplete = !pending;
  if (rosterComplete) saveTank();
}
function handleImages(images: Iterable<IndexedImage>, src: string,
                      section: string): void {
  // fish packs carry portraits too — only scenery sections touch the tank
  if (section === "gravel") pickGravel(images, src);
  else if (section === "plants" || section === "accessories")
    addDecor(images, src);
  else if (section === "backgrounds" || section === "tanks")
    pickBackdrop(images, src);
  else return;
  console.info(`archive.org: imported scenery ${src}`);
  if (pendingThumbs.size) serveThumbs([...pendingThumbs]);
}
function recordInstall(it: Importable): void {
  if (!installedAddons.some((a) => a.url === it.url))
    installedAddons.push(it);
  saveTank();
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
    // The native shell retunes the window's aspect to the machine's
    // viewBox outline; prefs needs just the id.
    machine: { id: machine.id, w: machine.vbW, h: machine.vbH,
               shape: machine.shape, mask: machine.image ?? null,
               // hole is in viewBox units like sx..sh — the mask must
               // scale it identically or backplate and mask drift.
               hole: machine.hole ?? null },
    addons: installedAddons,
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
    // Preferences window reads this — `on`/`available` reflect the
    // live GL state (a lost context reports off/unavailable even if
    // the stored preference says on).
    crt: {
      available: crt?.usable ?? false,
      on: crt?.enabled ?? false,
      cfg: crtCfg,
    },
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
  try {
    const pose = fishPose(sheet, f);
    url = scaledThumb(swimCanvas(sheet, 0, pose.mir, pose.g));
  } catch { /* sheet can't render that pose */ }
  if (url) thumbMemo.set(key, url);
  return url;
}
function addonThumb(url: string): string | null {
  const key = `a:${url}`;
  const hit = thumbMemo.get(key);
  if (hit) return hit;
  let cv: HTMLCanvasElement | null = null;
  const i = sheetByPack.get(url);
  if (i !== undefined && fishSheets[i]) {
    try { cv = swimCanvas(fishSheets[i]!, 0, 1); } catch { /* scenery below */ }
  }
  cv ??= gravelByPack.get(url) ?? backdropByPack.get(url)
    ?? decors.find((d) => d.pack === url)?.cv ?? null;
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

function onBusMessage(m: BusMsg): void {
  if (m.op === "hello") postState();
  else if (m.op === "install")
    void remoteInstall(m.item as Importable, m.again === true);
  else if (m.op === "removeFish" && typeof m.id === "number") {
    if (sim.removeFish(m.id)) { sweepThumbs(); saveTank(); }
  } else if (m.op === "removeAddon" &&
             typeof m.url === "string" && m.url !== "") {
    removeAddon(m.url);
  } else if (m.op === "wantThumbs" && Array.isArray(m.keys)) {
    serveThumbs(m.keys);
  } else if (m.op === "crtEnabled") {
    setCrt(m.on === true);
  } else if (m.op === "crtConfig") {
    applyCrtConfig(m.cfg);
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

/** Uninstall an add-on: drops it from the saved list (it won't restore
 * next launch) and clears this session's contributions — its fish, its
 * decor, and gravel/backdrop it supplied. Sprite sheets stay loaded so
 * other fish's sheetIdx bindings don't shift. */
function removeAddon(url: string): void {
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
  for (const s of orphaned) sheetBySpecies.delete(s);
  const slot = sheetByPack.get(url);
  // Only delete the reverse entry it still owns — a rebind may have
  // handed the slot to a different pack since.
  if (slot !== undefined && packBySheet.get(slot) === url)
    packBySheet.delete(slot);
  sheetByPack.delete(url);
  // Drop thumb state that can only rot: this pack's own memo and any
  // queued ask, plus entries for fish that no longer exist anywhere.
  thumbMemo.delete(`a:${url}`);
  pendingThumbs.delete(`a:${url}`);
  sweepThumbs();
  saveTank(); // persists and pushes fresh state to the panel
  bus.post({ op: "uninstalled", url });
}

// Bus messages cross a page boundary — validate before trusting them.
const KNOWN_SECTIONS = new Set(COLLECTIONS.map((c) => c.section));
const installsInFlight = new Set<string>();
async function remoteInstall(it: Importable, again: boolean): Promise<void> {
  const fail = (error: string) =>
    bus.post({ op: "installFailed", url: it?.url ?? "", error });
  if (!it?.url || typeof it.url !== "string" ||
      !it.url.startsWith("https://archive.org/") ||
      !KNOWN_SECTIONS.has(it.section)) {
    fail("invalid add-on item");
    return;
  }
  // The panel's retry timeout can fire while the original fetch is still
  // running — a second request for the same url would double-install.
  if (installsInFlight.has(it.url)) return; // original request will ack
  // A restore may have landed this add-on while the panel's detail fetch
  // was in flight — unless the user clicked "Add again", that's a dup.
  if (!again && installedAddons.some((a) => a.url === it.url)) {
    bus.post({ op: "installed", url: it.url });
    return;
  }
  installsInFlight.add(it.url);
  try {
    const rs = await fetchAddon(it.url);
    const usable = rs.filter(
      (r) => r.sheets.size || r.images.size || r.sounds.length);
    if (!usable.length) throw new Error("no pack inside");
    for (const r of usable) {
      if (r.sheets.size)
        handleSheets(r.sheets, it.inner, it.url, it.section, true);
      if (r.images.size) handleImages(r.images.values(), it.url, it.section);
    }
    // One batch across resources: dedupes names globally, plays the
    // feedback once, and a decode failure can't fail the install. The
    // listing's qualified `inner` is the record identity — a sibling
    // stem installed separately mustn't overwrite under the basename.
    const sounds = usable.flatMap(
      (r) => qualifySoundItemName(r.sounds, it.inner));
    if (sounds.length)
      await handleSounds(sounds)
        .catch((e) => console.warn("sound install skipped:", e));
    recordInstall(it);
    bus.post({ op: "installed", url: it.url });
    postState();
  } catch (e) { fail(String(e)); }
  finally { installsInFlight.delete(it.url); }
}

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
  if (backEl) {
    const hole = machine.hole;
    backEl.style.display = hole ? "block" : "none";
    if (hole) {
      // Pad past the measured aperture: the art's translucent glass rim
      // can run a few px outside it and would otherwise leak the
      // desktop. The overshoot hides behind the opaque bezel — every
      // machine keeps >= 46px of opaque art around its hole.
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
function feedFish(): void {
  sim.dropFood(TANK.width / 2);
  audio.feed();
}
(window as unknown as { finsical?: unknown }).finsical =
  { openImport: () => importPanel.open(), feedFish,
    toggleCrt: () => setCrt(!crtOn) };

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
  const k = e.key.toLowerCase();
  if ((e.metaKey || e.ctrlKey) && k === "i") {
    importPanel.open(); e.preventDefault();
  } else if (!e.metaKey && !e.ctrlKey && !e.altKey && k === "f" &&
             !e.repeat && !importPanel.isOpen) {
    feedFish(); // bare F: Cmd-F is Find in browsers; the native menu owns ⌘F
  } else if (!e.metaKey && !e.ctrlKey && !e.altKey && k === "c" &&
             !e.repeat && !importPanel.isOpen) {
    setCrt(!crtOn); // bare C: ⌘C is Copy via the Edit menu
  } else if (!e.metaKey && !e.ctrlKey && !e.altKey && k === "s" &&
             !e.repeat && !importPanel.isOpen && !inNativeShell()) {
    // Browser-only fallback — the app opens stats.html via Tank ▸
    // Tank Stats; over BroadcastChannel the new tab finds the tank.
    // Reuse without re-navigating: a reload would wipe the 90 s trend
    // window stats.ts keeps for the arrows.
    const existing = window.open("", "finsical-stats");
    try {
      if (existing && !existing.closed &&
          existing.location.pathname.endsWith("/stats.html")) {
        existing.focus();
      } else if (existing && !existing.closed) {
        // Navigate the tab this gesture already grabbed — a second
        // window.open can be blocked (one open per gesture in Safari).
        // Resolve against our URL — assign uses the target's base.
        existing.location.assign(
          new URL("stats.html", location.href).href);
        existing.focus();
      } else {
        window.open("stats.html", "finsical-stats");
      }
    } catch {
      // The named tab went cross-origin — reading location throws
      // SecurityError, but writing href is allowed. Steer the tab
      // home instead of a second window.open (blocked in Safari).
      if (existing) {
        existing.location.href = new URL("stats.html", location.href).href;
        existing.focus();
      } else {
        window.open("stats.html", "finsical-stats");
      }
    }
  }
});

const packFetch = async (p: string): Promise<Uint8Array> => {
  const r = await fetch(`pack/${p}`);
  if (!r.ok) throw new Error(`${p}: ${r.status}`);
  return new Uint8Array(await r.arrayBuffer());
};
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
  .catch((e) => console.warn("azpack load failed; using placeholder fish:", e))
  // Saved add-ons re-import after the bundled pack; once they've landed,
  // rebind saved fish to their species' actual sheet slot and heal
  // pre-spawning rosters that never gained their fish.
  .then(() => importPanel.restore([...installedAddons]))
  // Imported 'snd ' sets persist — restore them so dropped sounds
  // survive relaunch even when no pack in use carries audio. Best
  // effort: a restore failure must not skip the fish roster healing.
  .then(() => sndsGet().catch((e) => {
    console.warn("snd restore failed:", e); return null;
  }))
  .then((recs) => recs?.length ? audio.addWavs(recs).catch((e) =>
    console.warn("snd decode failed:", e)) : undefined)
  .then(() => { remapSheetIdx(); reconcileFish(); });

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
  void (async () => {
    const files = new Map<string, File>();
    for (const ent of entries) await walkEntry(ent, "", files);
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
      if (idx >= 0) { spawnFish(idx, pack.manifest.tag); audio.splash(); }
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
    for (const [name, file] of flat) {
      // A pack file belongs to the pass below — don't buffer it twice.
      const head = new Uint8Array(await file.slice(0, 0x104).arrayBuffer());
      if (isPack(head)) continue;
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
    // Not an .azpack folder — try each dropped file as a raw .fsh/.REZ pack.
    for (const [name, file] of flat) {
      const head = new Uint8Array(await file.slice(0, 0x104).arrayBuffer());
      if (!isPack(head)) continue;
      const data = new Uint8Array(await file.arrayBuffer());
      const sheets = fshToSheets(data);
      if (!sheets.size) continue;
      const idx = usePack({ sheets });
      if (idx >= 0) { spawnFish(idx, name.replace(/\.[^.]*$/, "")); audio.splash(); }
      pickBackdrop(packImages(data).values());
      if (fishSheets.length) {
        console.info(`${name}: pack imported`);
        return;
      }
    }
    if (!recs.length)
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

// Sprite cells run large (the angelfish is 170px tall); scale big
// sheets down to a share of the tank rather than clipping them.
const MAX_FISH_W = TANK.width * 0.6, MAX_FISH_H = TANK.height * 0.6;

function drawFish(f: Fish): void {
  const sheet = sheetOf(f);
  if (!sheet) return drawPlaceholder(f.x, f.y, f.facing, pitch(f));
  const pose = fishPose(sheet, f);
  const cv = swimCanvas(sheet, animFrame(f, sheet.meta.framesPerGroup),
                        pose.mir, pose.g);
  const s = Math.min(1, MAX_FISH_W / cv.width, MAX_FISH_H / cv.height);
  const w = cv.width * s, h = cv.height * s;
  ctx.save();
  ctx.translate(Math.round(f.x), Math.round(f.y));
  ctx.rotate(pitch(f));
  ctx.drawImage(cv, -w / 2, -h / 2, w, h);
  ctx.restore();
}

// Placeholder sprite until real Aquazone assets are imported.
function drawPlaceholder(x: number, y: number, facing: number,
                         dev = 0): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(-facing, 1);
  // In the mirrored draw space the pitch angle flips sign.
  ctx.rotate(-facing * dev);
  ctx.fillStyle = "#e8a33d";
  ctx.fillRect(-8, -4, 14, 8);   // body
  ctx.fillRect(6, -6, 6, 12);    // tail
  ctx.fillRect(-2, -7, 6, 3);    // dorsal
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(-6, -2, 2, 2);    // eye
  ctx.restore();
}

const tankGradient = (() => {
  const g = ctx.createLinearGradient(0, 0, 0, TANK.height);
  g.addColorStop(0, "#2e7fc4");
  g.addColorStop(1, "#14508c");
  return g;
})();

// Glass-tap ripples — render-side chrome, not sim state, so the sim
// stays deterministic. Expanding ring that fades over ~half a second.
const ripples: { x: number; y: number; born: number }[] = [];
const RIPPLE_MS = 500;
function addRipple(x: number, y: number): void {
  ripples.push({ x, y, born: performance.now() });
  // Generous bound — expired rings self-clean in render(); the cap
  // only guards against pathological input, so it must never evict a
  // ring mid-animation under fast tapping.
  if (ripples.length > 32) ripples.shift();
}

let prevBubbles = 0;
function render(): void {
  if (backdropCv) {
    ctx.drawImage(backdropCv, 0, 0, TANK.width, TANK.height);
  } else {
    ctx.fillStyle = tankGradient;
    ctx.fillRect(0, 0, TANK.width, TANK.height);
  }
  if (gravelCv) {
    const gh = Math.round(gravelCv.height * TANK.width / gravelCv.width);
    ctx.drawImage(gravelCv, 0, TANK.height - gh, TANK.width, gh);
  } else if (!backdropCv) {
    ctx.fillStyle = "#8a6d3b"; // gravel
    ctx.fillRect(0, TANK.height - BOTTOM_PAD, TANK.width, BOTTOM_PAD);
  }
  // Decorations spread evenly across the floor, bottoms planted in gravel.
  const dn = decors.length;
  for (let i = 0; i < dn; i++) {
    const d = decors[i]!.cv;
    ctx.drawImage(d, Math.round(TANK.width * (i + 0.5) / dn - d.width / 2),
                  TANK.height - 6 - d.height);
  }

  for (const fd of sim.food) {
    // Rotting pellets dissolve — fade them out over their rot lifetime.
    ctx.globalAlpha = 1 - 0.65 * Math.min(1, fd.settled / FOOD_ROT_TICKS);
    ctx.fillStyle = "#c9a227";
    ctx.fillRect(Math.round(fd.x) - 1, Math.round(fd.y) - 1, 3, 3);
    ctx.globalAlpha = 1;
  }
  for (const f of sim.fish) drawFish(f);

  ctx.fillStyle = "#cfe8ff";
  for (const b of sim.bubbles) {
    ctx.fillRect(Math.round(b.x), Math.round(b.y), 2, 2);
  }
  // Sparse bloops: only some spawns make a sound.
  if (sim.bubbles.length > prevBubbles && Math.random() < 0.25)
    audio.bubble();
  prevBubbles = sim.bubbles.length;

  const nowMs = performance.now();
  ctx.lineWidth = 1.5;
  for (let i = ripples.length - 1; i >= 0; i--) {
    const rp = ripples[i]!;
    const t = (nowMs - rp.born) / RIPPLE_MS;
    if (t >= 1) { ripples.splice(i, 1); continue; }
    ctx.strokeStyle =
      `rgba(215,238,255,${(0.6 * (1 - t)).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(rp.x, rp.y, 3 + t * 30, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Fouled water murks the whole scene.
  const murk = 1 - sim.waterQuality;
  if (murk > 0.02) {
    ctx.fillStyle = `rgba(96,80,36,${(murk * 0.28).toFixed(3)})`;
    ctx.fillRect(0, 0, TANK.width, TANK.height);
  }

  // day/night dimming
  const dark = 1 - sim.light;
  if (dark > 0.01) {
    ctx.fillStyle = `rgba(4,8,24,${(dark * 0.55).toFixed(3)})`;
    ctx.fillRect(0, 0, TANK.width, TANK.height);
  }
}

// Fixed-step sim; render on rAF.
const TICKS_PER_SECOND = 30;
let acc = 0;
let last = performance.now();
function frame(now: number): void {
  acc += Math.min(now - last, 200);
  last = now;
  const step = 1000 / TICKS_PER_SECOND;
  while (acc >= step) {
    sim.tick();
    acc -= step;
  }
  render();
  if (crtOn) crt?.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
