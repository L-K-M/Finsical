import type { IndexedImage } from "../core/data/azpack.js";

/** The size AquaZone art draws at in the 320 x 200 tank. The originals
 * were painted for 640 x 480 aquariums (most backgrounds are that
 * size), so half size keeps a clownfish, a comet and a discus in their
 * original proportion to each other and to the tank. */
export const ART_SCALE = 0.5;

export interface Rgba { w: number; h: number; data: Uint8ClampedArray }

/**
 * Shrink sprite art by `s` (0 < s <= 1) with an area-weighted box
 * filter; palette index 0 is transparent. Nearest-neighbor would drop
 * whole rows and columns (at half size, every other one) and break
 * fins and outlines apart. A pixel stays opaque when opaque source
 * covers at least half of it and takes the mean color of that opaque
 * source only, so the silhouette stays crisp and the transparent key
 * color never fringes it.
 */
export function shrinkSprite(img: IndexedImage, s: number): Rgba {
  const w = Math.max(1, Math.round(img.w * s));
  const h = Math.max(1, Math.round(img.h * s));
  const kx = img.w / w, ky = img.h / h; // source px per output px
  const data = new Uint8ClampedArray(w * h * 4);
  for (let oy = 0; oy < h; oy++) {
    const y0 = oy * ky, y1 = y0 + ky;
    const sy1 = Math.min(img.h, Math.ceil(y1));
    for (let ox = 0; ox < w; ox++) {
      const x0 = ox * kx, x1 = x0 + kx;
      const sx1 = Math.min(img.w, Math.ceil(x1));
      let cover = 0, r = 0, g = 0, b = 0;
      for (let sy = Math.floor(y0); sy < sy1; sy++) {
        const wy = Math.min(y1, sy + 1) - Math.max(y0, sy);
        for (let sx = Math.floor(x0); sx < sx1; sx++) {
          const pi = img.idx[sy * img.w + sx] ?? 0;
          if (pi === 0) continue;
          const wt = wy * (Math.min(x1, sx + 1) - Math.max(x0, sx));
          const c = img.palette[pi] ?? [0, 0, 0];
          cover += wt;
          r += c[0] * wt; g += c[1] * wt; b += c[2] * wt;
        }
      }
      if (cover * 2 < kx * ky) continue; // mostly transparent
      const o = (oy * w + ox) * 4;
      data[o] = r / cover; data[o + 1] = g / cover; data[o + 2] = b / cover;
      data[o + 3] = 255;
    }
  }
  return { w, h, data };
}
