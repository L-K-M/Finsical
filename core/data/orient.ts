/**
 * Sprite orientation for Aquazone fish art.
 *
 * Fish sprites are stored in canonical vertical poses: the profile
 * views live in groups 0 and groups/2 (opposite poses), diagonal views
 * in between, and edge-on depth views fill the rest — the engine
 * rotated profiles for horizontal travel. Verified across every pack
 * in az-src plus add-ons: group 0 faces head-down with the dorsal side
 * at x=0, so a 90° clockwise rotation gives a dorsal-up fish facing
 * left; a horizontal mirror gives the right-facing canonical pose.
 */
import type { IndexedImage, SpriteSheet } from "./azpack.js";

/** Rotate an indexed image 90° clockwise. */
export function rotateCW(img: IndexedImage): IndexedImage {
  const { w, h, idx, palette } = img;
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      out[x * h + (h - 1 - y)] = idx[y * w + x]!;
  return { w: h, h: w, palette, idx: out };
}

/** Mirror an indexed image horizontally. */
export function mirrorX(img: IndexedImage): IndexedImage {
  const { w, h, idx, palette } = img;
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      out[y * w + (w - 1 - x)] = idx[y * w + x]!;
  return { w, h, palette, idx: out };
}

/** Canonical swim frame: the profile from pose `group` rotated
 * dorsal-up and facing `facing` (1 = right, -1 = left). Roll-capable
 * sheets (groups >= 4) carry real art for both directions in groups
 * 0 and groups/2 — pass facing=-1 there so nothing is mirrored. */
export function swimFrame(sheet: SpriteSheet, frameIdx: number,
                          facing: 1 | -1, group = 0): IndexedImage {
  const img = rotateCW(sheet.frame(group, frameIdx));
  return facing > 0 ? mirrorX(img) : img;
}
