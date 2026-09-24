import type { IndexedImage } from "../core/data/azpack.js";

/** The size AquaZone art draws at in the 320 x 200 tank. The originals
 * were painted for 640 x 480 aquariums (most backgrounds are that
 * size), so half size keeps plants, accessories and small fish in their
 * original proportion to the tank; fishScale shrinks big fish further. */
export const ART_SCALE = 0.5;

/** Fish whose body at ART_SCALE spans up to this share of the tank
 * (length against its width, height against its height) draw at
 * ART_SCALE: an eighth, 40 x 25 px, which keeps tetras, platies and
 * clownfish at their original size. */
const FISH_KNEE = 1 / 8;
/** Share of each step past FISH_KNEE a bigger body keeps. */
const FISH_SQUASH = 0.4;

/**
 * The scale a fish with this body (art pixels, see bodySize) draws at
 * in a tankW x tankH tank (320 x 200: the canvas the scene is drawn on
 * before it is scaled to the window). At ART_SCALE a discus or an
 * angelfish stands 85 px, over two fifths of a tank only 200 px high,
 * and big species crowd out the rest, so bodies past FISH_KNEE
 * compress: the discus comes out 49 px tall and a shark 68 px long,
 * and bigger art still draws bigger.
 */
export function fishScale(body: { length: number; height: number },
                          tankW: number, tankH: number): number {
  const share = ART_SCALE *
    Math.max(body.length / tankW, body.height / tankH);
  if (share <= FISH_KNEE) return ART_SCALE;
  return ART_SCALE * (FISH_KNEE + (share - FISH_KNEE) * FISH_SQUASH) / share;
}

export interface Rgba {
  w: number; h: number;
  /** A plain ArrayBuffer underneath, as ImageData requires. */
  data: Uint8ClampedArray<ArrayBuffer>;
}

/**
 * Shrink sprite art by `s` (0 < s <= 1) with an area-weighted box
 * filter; palette index 0 is transparent. Nearest-neighbor would drop
 * whole rows and columns (at half size, every other one) and break
 * fins and outlines apart. A pixel stays opaque when opaque source
 * covers at least a third of it and takes the mean color of that
 * opaque source only, so the silhouette stays crisp and the transparent
 * key color never fringes it. A third, not a half: fins dithered to 50%
 * translucency cover a pixel by a little under or over half at most
 * scales, and a half cutoff breaks them into a checkerboard.
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
      if (cover * 3 < kx * ky) continue; // mostly transparent
      const o = (oy * w + ox) * 4;
      data[o] = r / cover; data[o + 1] = g / cover; data[o + 2] = b / cover;
      data[o + 3] = 255;
    }
  }
  return { w, h, data };
}
