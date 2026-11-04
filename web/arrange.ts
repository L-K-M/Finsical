/**
 * Where plants and accessories stand on the tank floor, and which one
 * a press in Arrange Decorations picks up. Each piece keeps its own
 * centre x in tank pixels: a new piece goes into the widest stretch of
 * free floor, so pieces already placed stay put, and a drag moves one
 * piece sideways. Depth is not touched here; the original's layouts
 * stored x and depth separately too (docs/ORIGINAL-SIM.md, "Depth").
 *
 * Pure so vitest can pin the geometry without a DOM.
 */

/** A piece's horizontal footprint: its centre x and drawn width. */
export interface Footprint {
  x: number;
  w: number;
}

/** A piece as a press sees it: its drawn box and depth, 0 (back) to
 * 1 (front). */
export interface DecorBox {
  x0: number;
  y0: number;
  w: number;
  h: number;
  depth: number;
}

/** The centre a `w`-wide piece may take in a `tankW`-wide tank: wholly
 * inside the glass, or centred when it is wider than the tank. */
export function clampCenter(x: number, w: number, tankW: number): number {
  if (w >= tankW) return tankW / 2;
  return Math.min(Math.max(x, w / 2), tankW - w / 2);
}

/** The left edge a piece draws at, in whole pixels: its centre less
 * half its width, pulled inside the glass. A piece wider than the tank
 * hangs off the right edge from x = 0, as before positions were kept. */
export function decorLeft(x: number, w: number, tankW: number): number {
  return Math.min(Math.max(Math.round(x - w / 2), 0),
                  Math.max(0, tankW - w));
}

/** Copy i of n in the even spread every piece had before pieces kept
 * their own places: n equal stretches of floor, one centre each, with
 * a `w`-wide piece kept inside the glass. A save from then has no
 * places, so its pieces come back exactly where they stood. */
export function spreadCenter(i: number, n: number, w: number,
                             tankW: number): number {
  return clampCenter(tankW * (i + 0.5) / n, w, tankW);
}

/** The centre of the widest stretch of floor no piece covers, for a
 * new `w`-wide piece: the middle of an empty tank, then the middle of
 * whatever gap is largest. Ties go to the leftmost gap. Where no gap
 * fits the piece, it still goes to the widest one, overlapping its
 * neighbours as little as the floor allows. Whole pixels. */
export function widestGapCenter(placed: readonly Footprint[], w: number,
                                tankW: number): number {
  const spans = placed
    .map((p) => {
      const x0 = decorLeft(p.x, p.w, tankW);
      return { x0, x1: Math.min(tankW, x0 + p.w) };
    })
    .sort((a, b) => a.x0 - b.x0);
  let best = { x0: 0, x1: 0 };
  let edge = 0;
  for (const s of spans) {
    if (s.x0 - edge > best.x1 - best.x0) best = { x0: edge, x1: s.x0 };
    edge = Math.max(edge, s.x1);
  }
  if (tankW - edge > best.x1 - best.x0) best = { x0: edge, x1: tankW };
  return Math.round(clampCenter((best.x0 + best.x1) / 2, w, tankW));
}

/** Copy k's saved centre x (untrusted: localStorage or a .fins
 * file), or null when the entry is missing or is not a finite number
 * in [0, tankW]. Returned exactly as saved, so a piece reloads on the
 * pixel it was left on. Read per copy, so one bad entry only sends its
 * own copy to a free gap. */
export function savedPlace(places: unknown, k: number,
                           tankW: number): number | null {
  if (!Array.isArray(places)) return null;
  const x: unknown = places[k];
  if (typeof x !== "number" || !Number.isFinite(x)) return null;
  return x < 0 || x > tankW ? null : x;
}

/** The piece a press at tank point (px, py) picks up: the frontmost
 * whose art is solid anywhere in the square `slop` pixels out from the
 * point on each axis (a square, so a stem at a box corner still
 * grabs), or -1. Ties in depth go to the later piece, which draws on
 * top. `solid(i, x, y)`
 * answers for piece i's own art coordinates and is only asked inside
 * the piece's box. */
export function pickDecor(boxes: readonly DecorBox[], px: number, py: number,
                          slop: number,
                          solid: (i: number, x: number, y: number) => boolean):
    number {
  const order = boxes.map((_, i) => i)
    .sort((a, b) => boxes[b]!.depth - boxes[a]!.depth || b - a);
  const r = Math.max(0, Math.floor(slop));
  for (const i of order) {
    const b = boxes[i]!;
    const lx = Math.floor(px - b.x0), ly = Math.floor(py - b.y0);
    if (lx < -r || ly < -r || lx >= b.w + r || ly >= b.h + r) continue;
    for (let dy = -r; dy <= r; dy++) {
      const y = ly + dy;
      if (y < 0 || y >= b.h) continue;
      for (let dx = -r; dx <= r; dx++) {
        const x = lx + dx;
        if (x < 0 || x >= b.w) continue;
        if (solid(i, x, y)) return i;
      }
    }
  }
  return -1;
}
