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

/** Alpha mask (1 = opaque): every pixel of the key index is transparent. */
export function keyMask(img: IndexedImage, key: number): Uint8Array {
  const { w, h, idx } = img;
  const opaque = new Uint8Array(w * h);
  for (let i = 0; i < idx.length; i++) opaque[i] = idx[i] === key ? 0 : 1;
  return opaque;
}
