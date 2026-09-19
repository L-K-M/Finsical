import { BOTTOM_PAD, FOOD_ROT_TICKS, Sim } from "../core/sim.js";
import { decodeIndexedPng, loadAzpack, SpriteSheet } from "../core/data/azpack.js";
import { fshToSheets, isPack, packImages } from "../core/data/fsh.js";
import { swimFrame } from "../core/data/orient.js";
import { TankAudio } from "./audio.js";
import { mountImportPanel } from "./import.js";
import type { PackResult } from "./import.js";
import type { Fish } from "../core/sim.js";
import type { AzpackManifest, IndexedImage } from "../core/data/azpack.js";

const TANK = { width: 320, height: 200 };

const canvas = document.getElementById("tank") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
ctx.imageSmoothingEnabled = false;

const sim = new Sim(TANK, 0x9003);
const audio = new TankAudio();
for (let i = 0; i < 4; i++) {
  sim.addFish({ x: 40 + i * 60, y: 50 + i * 30, facing: i % 2 ? -1 : 1 });
}

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
                 read?: (path: string) => Promise<Uint8Array>): void {
  // Most orientation groups wins; tiebreak toward the crunchier cell.
  const sheets = [...pack.sheets.values()];
  sheets.sort((a, b) =>
    b.meta.groups - a.meta.groups || a.meta.cellH - b.meta.cellH);
  if (sheets[0]) fishSheets.push(sheets[0]);
  if (pack.manifest && read)
    void audio.load(read, pack.manifest)
      .then(() => audio.startAmbient())
      .catch((e) => console.warn("audio load failed:", e));
}

// Biggest pack image large enough to matter becomes the tank backdrop —
// tiny fish portraits/icons are skipped. Wide, short images (Aquazone
// .grv beds are ~6:1) become the gravel strip instead.
let backdropCv: HTMLCanvasElement | null = null;
let gravelCv: HTMLCanvasElement | null = null;
function pickBackdrop(images: Iterable<IndexedImage>): void {
  let best: IndexedImage | null = null;
  let gravel: IndexedImage | null = null;
  for (const img of images) {
    if (img.w >= img.h * 3 && img.w >= TANK.width / 2) { if (!gravel || img.w > gravel.w) gravel = img; continue; }
    if (img.w * img.h < (TANK.width * TANK.height) / 4) continue;
    if (img.w < TANK.width / 2 || img.h < TANK.height / 2) continue;
    if (!best || img.w * img.h > best.w * best.h) best = img;
  }
  backdropCv = best ? imageCanvas(best, true) : null;
  gravelCv = gravel ? imageCanvas(gravel, false) : null; // index 0 = transparent
}
const fishSlot = new WeakMap<Fish, number>();
const MAX_FISH_SLOTS = 4096;
let nextSlot = 0;
function sheetOf(f: Fish): SpriteSheet | null {
  if (!fishSheets.length) return null;
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
function previewOf(rs: PackResult[]): HTMLCanvasElement | null {
  const sheets = rs.flatMap((r) => [...r.sheets.values()]);
  sheets.sort((a, b) => b.meta.cellW * b.meta.cellH - a.meta.cellW * a.meta.cellH);
  for (const sh of sheets) {
    for (let f = 0; f < sh.meta.framesPerGroup; f++)
      try { return swimCanvas(sh, f, 1); } catch { /* try next */ }
  }
  const imgs = rs.flatMap((r) => [...r.images.values()]);
  imgs.sort((a, b) => b.w * b.h - a.w * a.h);
  if (!imgs[0]) return null;
  try { return imageCanvas(imgs[0], true); }
  catch (e) { console.warn("preview render failed:", e); return null; }
}

const importPanel = mountImportPanel({
  onSheets: (sheets, name) => {
    usePack({ sheets });
    console.info(`archive.org: imported fish ${name}`);
  },
  onImages: (images, name, section) => {
    // fish packs carry portraits too — only scenery sections touch the tank
    if (section !== "gravel") return;
    pickBackdrop(images);
    console.info(`archive.org: imported scenery ${name}`);
  },
  preview: previewOf,
});

// Native-menu / keyboard entry points (macos/Finsical.swift calls these).
function feedFish(): void {
  sim.dropFood(TANK.width / 2);
  audio.feed();
}
(window as unknown as { finsical?: unknown }).finsical =
  { openImport: () => importPanel.open(), feedFish };

// Keyboard entry point — the native Tank menu (⌘I / Ctrl+I) is the primary
// path. Touch fallback: hover-less devices have no keyboard or native menu.
// Re-evaluate on change so convertibles adapt when their input mode flips.
const hoverNone = window.matchMedia("(hover: none)");
const syncTrigger = (show: boolean): void => {
  document.getElementById("opentrigger")?.remove();
  if (!show) return;
  const trigger = document.createElement("button");
  trigger.id = "opentrigger";
  trigger.textContent = "+ add-ons";
  trigger.addEventListener("click", () => importPanel.open());
  document.body.appendChild(trigger);
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
  }
});

const packFetch = async (p: string): Promise<Uint8Array> => {
  const r = await fetch(`pack/${p}`);
  if (!r.ok) throw new Error(`${p}: ${r.status}`);
  return new Uint8Array(await r.arrayBuffer());
};
void (async () => {
  const pack = await loadAzpack(packFetch);
  usePack(pack, packFetch);
  const imgs: IndexedImage[] = [];
  for (const c of pack.manifest.chunks) {
    if (!c.image) continue;
    try { imgs.push(await decodeIndexedPng(await packFetch(c.image))); }
    catch { /* keep going without that image */ }
  }
  pickBackdrop(imgs);
})().catch((e) => console.warn("azpack load failed; using placeholder fish:", e));

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
      usePack(pack, readFile);
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
    // Not an .azpack folder — try each dropped file as a raw .fsh/.REZ pack.
    for (const [name, file] of flat) {
      const head = new Uint8Array(await file.slice(0, 0x104).arrayBuffer());
      if (!isPack(head)) continue;
      const data = new Uint8Array(await file.arrayBuffer());
      const sheets = fshToSheets(data);
      if (!sheets.size) continue;
      usePack({ sheets });
      pickBackdrop(packImages(data).values());
      if (fishSheets.length) {
        console.info(`${name}: pack imported`);
        return;
      }
    }
    console.warn("drop: no manifest.json or pack file found");
  })().catch((e) => console.warn("azpack import failed:", e));
});

// Aquazone fish art is stored vertical (profiles in groups 0 and
// groups/2, dorsal toward x=0); orient.ts rotates the group-0 profile
// into a canonical dorsal-up pose and mirrors it for right-facing
// fish, so facing comes straight from Fish.facing.

/** Rasterize an indexed image to a canvas. opaque=false makes index 0
 * transparent (sprite convention); opaque=true keeps every pixel. */
function imageCanvas(img: IndexedImage, opaque: boolean): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = img.w; cv.height = img.h;
  const c = cv.getContext("2d")!;
  const im = c.createImageData(img.w, img.h);
  for (let i = 0; i < img.idx.length; i++) {
    const pi = img.idx[i] ?? 0;
    const [r, g, b] = img.palette[pi] ?? [0, 0, 0];
    im.data[i * 4] = r; im.data[i * 4 + 1] = g; im.data[i * 4 + 2] = b;
    im.data[i * 4 + 3] = opaque || pi !== 0 ? 255 : 0;
  }
  c.putImageData(im, 0, 0);
  return cv;
}

const swimCache = new WeakMap<SpriteSheet, Map<string, HTMLCanvasElement>>();
function swimCanvas(sheet: SpriteSheet, f: number,
                    facing: 1 | -1): HTMLCanvasElement {
  let cache = swimCache.get(sheet);
  if (!cache) swimCache.set(sheet, (cache = new Map()));
  const key = `${f}:${facing}`;
  let cv = cache.get(key);
  if (cv) return cv;
  cv = imageCanvas(swimFrame(sheet, f, facing), false);
  cache.set(key, cv);
  return cv;
}

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
  return Math.floor(ph) % Math.max(1, nf);
}

// Sprite cells run large (the angelfish is 170px tall); scale big
// sheets down to a share of the tank rather than clipping them.
const MAX_FISH_W = TANK.width * 0.6, MAX_FISH_H = TANK.height * 0.6;

function drawFish(f: Fish): void {
  const sheet = sheetOf(f);
  if (!sheet) return drawPlaceholder(f.x, f.y, f.facing);
  const cv = swimCanvas(sheet, animFrame(f, sheet.meta.framesPerGroup),
                        f.facing > 0 ? 1 : -1);
  const s = Math.min(1, MAX_FISH_W / cv.width, MAX_FISH_H / cv.height);
  const w = cv.width * s, h = cv.height * s;
  ctx.save();
  ctx.translate(Math.round(f.x), Math.round(f.y));
  ctx.drawImage(cv, -w / 2, -h / 2, w, h);
  ctx.restore();
}

// Placeholder sprite until real Aquazone assets are imported.
function drawPlaceholder(x: number, y: number, facing: number): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(-facing, 1);
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
  g.addColorStop(0, "#1a4d7a");
  g.addColorStop(1, "#0b2a45");
  return g;
})();

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

  // Fouled water murks the whole scene.
  const murk = 1 - sim.waterQuality;
  if (murk > 0.02) {
    ctx.fillStyle = `rgba(96,80,36,${(murk * 0.28).toFixed(3)})`;
    ctx.fillRect(0, 0, TANK.width, TANK.height);
  }

  // day/night dimming
  const dark = 1 - sim.light;
  if (dark > 0.01) {
    ctx.fillStyle = `rgba(4,8,24,${(dark * 0.75).toFixed(3)})`;
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
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
