import { BOTTOM_PAD, Sim } from "../core/sim.js";
import { loadAzpack, SpriteSheet } from "../core/data/azpack.js";
import type { Fish } from "../core/sim.js";

const TANK = { width: 320, height: 200 };

const canvas = document.getElementById("tank") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
ctx.imageSmoothingEnabled = false;

const sim = new Sim(TANK, 0x9003);
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
  if (y < TANK.height * 0.15) sim.dropFood(x);
  else sim.tap(x, y);
});

// ---- sprite loading ----------------------------------------------------
// Drop an emitted .azpack into web/pack/ (manifest.json at its root), or
// drag the folder onto the window, and real Aquazone sprites replace the
// placeholder fish.
let fishSheet: SpriteSheet | null = null;
function usePack(pack: { sheets: Map<string, SpriteSheet> }): void {
  // Most orientation groups wins; tiebreak toward the crunchier cell.
  const sheets = [...pack.sheets.values()];
  sheets.sort((a, b) =>
    b.meta.groups - a.meta.groups || a.meta.cellH - b.meta.cellH);
  fishSheet = sheets[0] ?? null;
}
loadAzpack(async (p) => {
  const r = await fetch(`pack/${p}`);
  if (!r.ok) throw new Error(`${p}: ${r.status}`);
  return new Uint8Array(await r.arrayBuffer());
}).then(usePack)
  .catch((e) => console.warn("azpack load failed; using placeholder fish:", e));

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
    if (!flat.has("manifest.json")) {
      console.warn("drop: no manifest.json found — not an .azpack folder");
      return;
    }
    usePack(await loadAzpack(async (p) => {
      const f = flat.get(p);
      if (!f) throw new Error(`pack file missing: ${p}`);
      return new Uint8Array(await f.arrayBuffer());
    }));
    console.info(`azpack imported: ${flat.size} files`);
  })().catch((e) => console.warn("azpack import failed:", e));
});

// Aquazone sprite groups: 2 = right-facing, 6 = left-facing (8 compass
// buckets). Sheets with fewer groups get mirrored instead.
const RIGHT_G = 2, LEFT_G = 6;
function groupFor(facing: number, ng: number): { g: number; mirror: boolean } {
  if (ng >= 8) return { g: facing > 0 ? RIGHT_G : LEFT_G, mirror: false };
  return { g: Math.min(RIGHT_G, ng - 1), mirror: facing < 0 };
}

const frameCache = new WeakMap<SpriteSheet, Map<string, HTMLCanvasElement>>();
function frameCanvas(sheet: SpriteSheet, g: number, f: number): HTMLCanvasElement {
  let cache = frameCache.get(sheet);
  if (!cache) frameCache.set(sheet, (cache = new Map()));
  const key = `${g}:${f}`;
  let cv = cache.get(key);
  if (cv) return cv;
  const fr = sheet.frame(g, f);
  cv = document.createElement("canvas");
  cv.width = fr.w; cv.height = fr.h;
  const fctx = cv.getContext("2d")!;
  const img = fctx.createImageData(fr.w, fr.h);
  for (let i = 0; i < fr.idx.length; i++) {
    const pi = fr.idx[i] ?? 0;
    const [r, gg, b] = fr.palette[pi] ?? [0, 0, 0];
    img.data[i * 4] = r; img.data[i * 4 + 1] = gg; img.data[i * 4 + 2] = b;
    img.data[i * 4 + 3] = pi === 0 ? 0 : 255; // index 0 = transparent
  }
  fctx.putImageData(img, 0, 0);
  cache.set(key, cv);
  return cv;
}

// Tail-wag animation advances with swim speed.
const anims = new WeakMap<Fish, number>();
function animFrame(f: Fish, nf: number): number {
  const total = Math.max(1, nf);
  const a = ((anims.get(f) ?? 0) + 0.15 + f.speed * 0.12) % total;
  anims.set(f, a);
  return Math.floor(a);
}

function drawFish(f: Fish): void {
  if (!fishSheet) return drawPlaceholder(f.x, f.y, f.facing);
  const { g, mirror } = groupFor(f.facing, fishSheet.meta.groups);
  const cv = frameCanvas(fishSheet, g, animFrame(f, fishSheet.meta.framesPerGroup));
  ctx.save();
  ctx.translate(Math.round(f.x), Math.round(f.y));
  if (mirror) ctx.scale(-1, 1);
  ctx.drawImage(cv, -(cv.width >> 1), -(cv.height >> 1));
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

function render(): void {
  ctx.fillStyle = tankGradient;
  ctx.fillRect(0, 0, TANK.width, TANK.height);

  ctx.fillStyle = "#8a6d3b"; // gravel
  ctx.fillRect(0, TANK.height - BOTTOM_PAD, TANK.width, BOTTOM_PAD);

  for (const fd of sim.food) {
    ctx.fillStyle = "#c9a227";
    ctx.fillRect(Math.round(fd.x) - 1, Math.round(fd.y) - 1, 3, 3);
  }
  for (const f of sim.fish) drawFish(f);

  ctx.fillStyle = "#cfe8ff";
  for (const b of sim.bubbles) {
    ctx.fillRect(Math.round(b.x), Math.round(b.y), 2, 2);
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
