import type { IndexedImage, SpriteSheet } from "./azpack.js";

/**
 * The sheet a fish swims with. Every AquaZone fish pack carries two
 * sprite families under the same ids, the adult (ELRA) and the baby
 * (ELRB), each a set of an 8-group swim ring, a 6-group pitch sheet
 * and 2-group turn and dying sheets. The baby rings are generic
 * hatchling art shared across species (one 9x31 fry serves clownfish,
 * comet, ryukin and a dozen others), so ranking by pose count alone
 * lands on it half the time. Among the sheets with the most groups the
 * adult is the largest; ties keep pack order (GP*.REZ strain sets hold
 * many equal adult rings, and the first is the pack's own).
 */
export function pickSwimSheet(
    sheets: Iterable<SpriteSheet>): SpriteSheet | null {
  let best: SpriteSheet | null = null;
  for (const s of sheets) {
    if (!best) { best = s; continue; }
    const dg = s.meta.groups - best.meta.groups;
    const da = s.meta.cellW * s.meta.cellH -
               best.meta.cellW * best.meta.cellH;
    if (dg > 0 || (dg === 0 && da > 0)) best = s;
  }
  return best;
}

/** Whether any frame of the sheet has an opaque pixel. Cells whose
 * dims are missing or truncated (frame() throws) count for nothing —
 * a sheet that can only throw or paint transparency installs no fish.
 * Assumes palette index 0 is the transparent key wherever a sheet
 * renders (indexedPixels' opaque=false path). */
export function hasDrawableFrame(sheet: SpriteSheet): boolean {
  for (let g = 0; g < sheet.meta.groups; g++)
    for (let f = 0; f < sheet.meta.framesPerGroup; f++) {
      let img: IndexedImage;
      try { img = sheet.frame(g, f); }
      catch { continue; }
      if (img.idx.some((px) => px !== 0)) return true;
    }
  return false;
}

/** pickSwimSheet, but only among sheets that can draw anything — a
 * pack whose frames are all empty or truncated must not register a
 * sheet its fish can only render as the stand-in, and a blank top
 * pick mustn't sink a pack whose other sheet is fine. */
export function pickDrawableSheet(
    sheets: Iterable<SpriteSheet>): SpriteSheet | null {
  return pickSwimSheet([...sheets].filter(hasDrawableFrame));
}

/** How long and tall a fish looks in profile, in art pixels. */
export interface BodySize { length: number; height: number }

/**
 * The opaque extent of one pose group across all of its frames, so the
 * tail's full swing counts. Cells are padded, some to two or three
 * times the fish, so the cell overstates how big a species looks.
 * Frames hold the fish on its side: rows run along its length. Falls
 * back to the cell when no frame has an opaque pixel to measure.
 */
export function bodySize(sheet: SpriteSheet, group: number): BodySize {
  // Checked up front: a bad group would otherwise fail every frame and
  // pass for a blank one, quietly measuring the padded cell.
  if (!Number.isInteger(group) || group < 0 || group >= sheet.meta.groups)
    throw new RangeError(`bodySize: no pose group ${group}`);
  let x0 = Infinity, x1 = -1, y0 = Infinity, y1 = -1;
  for (let f = 0; f < sheet.meta.framesPerGroup; f++) {
    let img: IndexedImage;
    try { img = sheet.frame(group, f); }
    catch (e) {
      if (e instanceof RangeError) continue; // a truncated pack's cell
      throw e;
    }
    for (let y = 0; y < img.h; y++) {
      for (let x = 0; x < img.w; x++) {
        if (img.idx[y * img.w + x] === 0) continue;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x);
        y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
    }
  }
  if (x1 < 0) return { length: sheet.meta.cellH, height: sheet.meta.cellW };
  return { length: y1 - y0 + 1, height: x1 - x0 + 1 };
}
