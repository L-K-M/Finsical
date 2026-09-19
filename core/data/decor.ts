/**
 * Decor-art selection and transparency for .acc/.plt packs.
 *
 * These packs carry a catalog thumbnail (83×83, textured background)
 * alongside the real animation frames. Every art frame shares a single
 * palette index across all four corners — the pack's transparent key —
 * while the thumbnail's corners differ. The key index varies per pack
 * (0 in the official sets, 255 in the Meka packs), so it's read off the
 * frame rather than assumed.
 *
 * Keyed pixels enclosed by art (e.g. a bird's white plumage) must stay
 * opaque, so transparency is flood-filled from the border instead of
 * applied globally to the index.
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

/** The decor art frame: largest image with a uniform corner key.
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
    const key = cornerKey(img);
    if (key === null) continue;
    if (!best || img.w * img.h > best.img.w * best.img.h)
      best = { img, key };
  }
  return best ?? (anyImg ? { img: anyImg, key: 0, guessed: true } : null);
}

/** Alpha mask (1 = opaque): key-index pixels connected to the border
 * become transparent; enclosed same-index pixels stay opaque.
 *
 * Exception: line-art packs (e.g. Silver Reed) draw sparse strokes on the
 * key color, so the fronds enclose huge key-index regions the flood can't
 * reach. When enclosed key pixels make up half or more of what remains
 * opaque, they are background showing through the art — clear the index
 * globally. Dense subjects keep far less enclosed key color (Robobot's
 * white body ~0.3, a bird's plumage ~0.03), so they survive the flood. */
export function keyMask(img: IndexedImage, key: number): Uint8Array {
  const { w, h, idx } = img;
  const opaque = new Uint8Array(w * h).fill(1);
  const q: number[] = [];
  const push = (i: number) => {
    if (opaque[i] && idx[i] === key) { opaque[i] = 0; q.push(i); }
  };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (q.length) {
    const i = q.pop()!;
    const x = i % w, y = (i / w) | 0;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (y > 0) push(i - w);
    if (y < h - 1) push(i + w);
  }
  let left = 0, keyLeft = 0;
  for (let i = 0; i < idx.length; i++) {
    if (!opaque[i]) continue;
    left++;
    if (idx[i] === key) keyLeft++;
  }
  if (left && keyLeft * 2 >= left)
    for (let i = 0; i < idx.length; i++) if (idx[i] === key) opaque[i] = 0;
  return opaque;
}
