import { swimFrame } from "../core/data/orient.js";
import { pickSwimSheet } from "../core/data/swimsheet.js";
import { restPose } from "../core/pose.js";
import { shrinkSprite } from "./artscale.js";
import type { SpriteSheet, IndexedImage } from "../core/data/azpack.js";
import type { Palette } from "osmium-ui";
import { ICON_PALETTE, SOUND_ICON } from "./icons.js";
import type { PackResult } from "./import.js";

// Canvas rasterizers shared by the tank page and the panel window.

/** A pixel grid on a canvas, in Osmium's sprite keys: a hex digit is a
 * gray level, another letter a `palette` color, '.' transparent. (The
 * built-in lavender ramp isn't known here; its keys throw.) */
export function gridCanvas(rows: readonly string[],
                           palette: Palette): HTMLCanvasElement {
  const w = rows[0]?.length ?? 0;
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = rows.length;
  const c = cv.getContext("2d")!;
  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      const k = row[x] ?? ".";
      if (k === ".") continue;
      const color = /^[0-9a-f]$/.test(k) ? "#" + k.repeat(6) : palette[k];
      if (!color) throw new Error(`unknown pixel key "${k}"`);
      c.fillStyle = color;
      c.fillRect(x, y, 1, 1);
    }
  });
  return cv;
}

let soundCanvas: HTMLCanvasElement | undefined;
/** Sound add-ons have no art of their own; the add-on lists and the
 * preview show this icon instead. One shared canvas: callers copy it. */
export function soundIcon(): HTMLCanvasElement {
  return (soundCanvas ??= gridCanvas(SOUND_ICON, ICON_PALETTE));
}

/** Rasterize an indexed image to a canvas. opaque=false makes index 0
 * transparent (sprite convention); opaque=true keeps every pixel. A
 * mask overrides both — 0 = transparent, 1 = opaque. */
export function imageCanvas(img: IndexedImage, opaque: boolean,
                            mask?: Uint8Array): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = img.w; cv.height = img.h;
  const c = cv.getContext("2d")!;
  if (mask && mask.length !== img.idx.length)
    throw new Error(
      `mask length ${mask.length} != pixel count ${img.idx.length}`);
  const im = c.createImageData(img.w, img.h);
  for (let i = 0; i < img.idx.length; i++) {
    const pi = img.idx[i] ?? 0;
    const [r, g, b] = img.palette[pi] ?? [0, 0, 0];
    im.data[i * 4] = r; im.data[i * 4 + 1] = g; im.data[i * 4 + 2] = b;
    im.data[i * 4 + 3] = mask ? mask[i]! * 255
                            : (opaque || pi !== 0 ? 255 : 0);
  }
  c.putImageData(im, 0, 0);
  return cv;
}

/** A sprite frame shrunk with shrinkSprite onto a canvas. */
function shrunkCanvas(img: IndexedImage, s: number): HTMLCanvasElement {
  const { w, h, data } = shrinkSprite(img, s);
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  cv.getContext("2d")!.putImageData(new ImageData(data, w, h), 0, 0);
  return cv;
}

/** One swim frame, oriented and shrunk to `scale`, built once per
 * sheet: the tank draws it every frame without resampling. */
const swimCache = new WeakMap<SpriteSheet, Map<string, HTMLCanvasElement>>();
export function swimCanvas(sheet: SpriteSheet, f: number,
                           facing: 1 | -1, group = 0,
                           scale = 1): HTMLCanvasElement {
  let cache = swimCache.get(sheet);
  if (!cache) swimCache.set(sheet, (cache = new Map()));
  const key = `${group}:${f}:${facing}:${scale}`;
  let cv = cache.get(key);
  if (cv) return cv;
  const img = swimFrame(sheet, f, facing, group);
  cv = scale < 1 ? shrunkCanvas(img, scale) : imageCanvas(img, false);
  cache.set(key, cv);
  return cv;
}

/** Best preview tile for a fetched add-on: the fish the tank would
 * draw, in its right-facing profile, else the largest scenery image. */
export function previewOf(rs: PackResult[]): HTMLCanvasElement | null {
  const sheets = rs.flatMap((r) => [...r.sheets.values()]);
  const swim = pickSwimSheet(sheets);
  // The rest by size, in case the swim sheet has no drawable frame.
  sheets.sort((a, b) => b.meta.cellW * b.meta.cellH - a.meta.cellW * a.meta.cellH);
  for (const sh of swim ? [swim, ...sheets.filter((s) => s !== swim)] : []) {
    const pose = restPose(sh, 1);
    for (let f = 0; f < sh.meta.framesPerGroup; f++)
      try { return swimCanvas(sh, f, pose.mir, pose.g); }
      catch { /* try next */ }
  }
  const imgs = rs.flatMap((r) => [...r.images.values()]);
  imgs.sort((a, b) => b.w * b.h - a.w * a.h);
  if (!imgs[0]) return null;
  try { return imageCanvas(imgs[0], true); }
  catch (e) { console.warn("preview render failed:", e); return null; }
}
