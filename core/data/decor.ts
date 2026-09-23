/**
 * Decor-art selection and transparency for .acc/.plt packs.
 *
 * These packs carry a catalog thumbnail (83×83, textured background)
 * and a top view for the layout editor alongside the real animation
 * frames. Every art frame shares a single palette index, the pack's
 * transparent key, across all four corners (or, where the art touches
 * a corner, most of its border), while the thumbnail's textured edge
 * has none. The key index varies per pack
 * (0 in the official sets, 255 in the Meka packs), so it's read off the
 * frame rather than assumed.
 *
 * Every pixel of the key index is transparent — the classic QuickDraw-era
 * keyed-sprite convention these packs were authored against. Art that
 * encloses key-colored regions (a reed's fronds wrapping the background,
 * a bird's white plumage) keys out wherever the index appears; flood-
 * filling from the border wrongly keeps enclosed background opaque.
 */
import type { IndexedImage } from "./azpack.js";

/** The corner palette index if all four match — the transparent key —
 * or null when the corners differ (thumbnail-style textured edge). */
export function cornerKey(img: IndexedImage): number | null {
  const { w, h, idx } = img;
  if (!w || !h) return null; // zero-area frames have no corner key
  const tl = idx[0]!;
  if (tl === idx[w - 1] && tl === idx[(h - 1) * w] && tl === idx[w * h - 1])
    return tl;
  return null;
}

/** The palette index covering most of the 1-px border, if it covers at
 * least half of it: the key of art whose feet or edges touch a corner.
 * Ties prefer 0, then 255 (the official and Meka keys). A catalog
 * tile's textured edge has no such majority and returns null. */
export function borderKey(img: IndexedImage): number | null {
  const { w, h, idx } = img;
  if (!w || !h) return null;
  const counts = new Uint32Array(256);
  let n = 0;
  const tally = (i: number) => { counts[idx[i]!]! += 1; n++; };
  for (let x = 0; x < w; x++) {
    tally(x);
    if (h > 1) tally((h - 1) * w + x);
  }
  for (let y = 1; y < h - 1; y++) {
    tally(y * w);
    if (w > 1) tally(y * w + w - 1);
  }
  let best = 0;
  for (let i = 1; i < 256; i++) {
    const c = counts[i]!, b = counts[best]!;
    if (c > b || (c === b && i === 255 && best !== 0)) best = i;
  }
  return counts[best]! * 2 >= n ? best : null;
}

/** An image's transparent key: its corner key, else its border
 * majority; null for a textured edge. */
function frameKey(img: IndexedImage): number | null {
  return cornerKey(img) ?? borderKey(img);
}

/** The decor art frame: largest image with a corner or border key.
 * Falls back (`guessed`) to the largest image with sprite-convention
 * index-0 transparency when no frame declares a key — legacy packs may
 * rely on enclosed index-0 holes staying transparent, so the fallback
 * keeps the old global-clear semantics instead of flood-filling. */
export function pickDecorArt(images: Iterable<IndexedImage>):
    { img: IndexedImage; key: number; guessed?: boolean } | null {
  let best: { img: IndexedImage; key: number } | null = null;
  let anyImg: IndexedImage | null = null;
  for (const img of images) {
    if (!anyImg || img.w * img.h > anyImg.w * anyImg.h) anyImg = img;
    const key = frameKey(img);
    if (key === null) continue;
    if (!best || img.w * img.h > best.img.w * best.img.h)
      best = { img, key };
  }
  return best ?? (anyImg ? { img: anyImg, key: 0, guessed: true } : null);
}

/** The longest animation an item plays; longer runs are cut here to
 * bound the canvases each item keeps (most packs ship 10 frames). */
export const MAX_DECOR_FRAMES = 16;

/** Sim ticks per decor frame: 30 ticks/s gives 10 frames/s. A guess;
 * packs carry a 2-byte value (0x96, 0xa8, ...) that may be the real
 * timing, but its meaning is unverified. */
export const DECOR_TICKS_PER_FRAME = 3;

/** An animation needs at least this many equal frames; one or two
 * same-size images are more often a catalog tile and a top view. */
const MIN_ANIMATION_FRAMES = 3;

export interface DecorFrames {
  frames: IndexedImage[];
  key: number;
  guessed?: boolean;
}

/**
 * Pick the in-tank art of a decor pack, as animation frames in chunk
 * order. Packs hold an 83×83 catalog tile, a top view for the original
 * layout editor and the side-view art, often as ~10 equal frames. The
 * top view can be larger than the art, so the largest group of at
 * least MIN_ANIMATION_FRAMES equal-size, equal-key images wins (ties:
 * larger frames); without one, pickDecorArt's single largest image.
 */
export function pickDecorFrames(images: Iterable<IndexedImage>):
    DecorFrames | null {
  const all = [...images];
  const groups = new Map<string, { frames: IndexedImage[]; key: number }>();
  for (const img of all) {
    const key = frameKey(img);
    if (key === null) continue;
    const id = `${img.w}x${img.h}:${key}`;
    let g = groups.get(id);
    if (!g) groups.set(id, (g = { frames: [], key }));
    g.frames.push(img);
  }
  let best: { frames: IndexedImage[]; key: number } | null = null;
  for (const g of groups.values()) {
    if (g.frames.length < MIN_ANIMATION_FRAMES) continue;
    const area = g.frames[0]!.w * g.frames[0]!.h;
    if (!best || g.frames.length > best.frames.length ||
        (g.frames.length === best.frames.length &&
         area > best.frames[0]!.w * best.frames[0]!.h)) best = g;
  }
  if (best)
    return { frames: best.frames.slice(0, MAX_DECOR_FRAMES), key: best.key };

  const one = pickDecorArt(all);
  if (!one) return null;
  const { img, ...rest } = one;
  return { frames: [img], ...rest };
}

/** The frame an item shows at sim tick `tick`: `n` frames looped, each
 * held DECOR_TICKS_PER_FRAME ticks, starting `phase` frames in. */
export function decorFrame(tick: number, n: number, phase: number): number {
  return (Math.floor(tick / DECOR_TICKS_PER_FRAME) + phase) % n;
}

/** The first frame (0 to n-1) the `copy`th installed copy of pack `src`
 * shows: an FNV-1a hash of the URL, stepped by the golden ratio per
 * copy, so neither different packs nor Add Again copies of one pack
 * sway in lockstep. Stable across relaunches for the same tank. */
export function decorPhase(src: string, copy: number, n: number): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < src.length; i++)
    h = Math.imul(h ^ src.charCodeAt(i), 0x01000193);
  const t = (h >>> 0) / 2 ** 32 + copy * 0.6180339887;
  return Math.floor((t % 1) * n);
}

/**
 * The same art with palette index `key` moved to index 0 (entries and
 * pixels swapped), so code built on the sprite convention (index 0 is
 * transparent) keys every key pixel out, enclosed pockets included
 * (no flood fill). Key-0 art comes back as is.
 */
export function keyToZero(img: IndexedImage, key: number): IndexedImage {
  if (key === 0) return img;
  const palette = img.palette.slice();
  palette[0] = img.palette[key] ?? [0, 0, 0];
  palette[key] = img.palette[0] ?? [0, 0, 0];
  const idx = img.idx.map((v) => v === key ? 0 : v === 0 ? key : v);
  return { w: img.w, h: img.h, palette, idx };
}
