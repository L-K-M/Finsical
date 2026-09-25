/**
 * Depth in the tank: how far from the back glass a fish or a piece of
 * decor sits, 0 (back) to 1 (front). The original sorted fish, plants
 * and accessories into one list by depth (Sort_Anim_Obj_By_Depth), so
 * fish swim behind and between the decor; its tank layouts store a
 * depth per item (PlPI/AccI, 0 to about 400) with every item's bottom
 * on the floor, whatever its depth.
 */

/** A decor item as seen from the front: its horizontal span, the top
 * of its art and its depth. Bottoms sit on the floor. */
export interface Cover {
  x0: number;
  x1: number;
  top: number;
  depth: number;
}

/** Depth band a piece of decor is seeded into, by its height as a
 * share of the tank: aquascapers put tall plants at the back, carpets
 * and small pieces at the front, the middle in between. Standalone
 * plant and accessory packs carry no depth of their own. */
const DEPTH_BANDS: readonly { maxH: number; lo: number; hi: number }[] = [
  { maxH: 0.25, lo: 0.65, hi: 0.95 },
  { maxH: 0.55, lo: 0.35, hi: 0.7 },
  { maxH: Infinity, lo: 0.2, hi: 0.45 },
];

/** Depth for a standalone decor piece `h` px tall in a `tankH` tank,
 * placed at `frac` (a stable per-copy hash in [0, 1)) through its
 * height's band. */
export function decorDepth(h: number, tankH: number, frac: number): number {
  const share = tankH > 0 ? h / tankH : 1;
  const band = DEPTH_BANDS.find((b) => share <= b.maxH)!;
  const f = Math.min(1, Math.max(0, frac));
  return band.lo + f * (band.hi - band.lo);
}

/** One entry of a depth-sorted draw list. */
export type Layer =
  | { kind: "decor"; i: number }
  | { kind: "fish"; i: number }
  | { kind: "mid" };

/** Everything the tank draws between the gravel and the water's
 * surface, back to front: decor at its depth, fish at theirs, and the
 * `mid` layer (light, food, snail) at `midDepth`. Ties keep decor
 * behind fish, so a fish level with a plant reads in front of it. */
export function drawOrder(decorDepths: readonly number[],
                          fishDepths: readonly number[],
                          midDepth: number): Layer[] {
  const items: { l: Layer; d: number; rank: number }[] = [];
  decorDepths.forEach((d, i) => items.push({ l: { kind: "decor", i }, d, rank: 0 }));
  items.push({ l: { kind: "mid" }, d: midDepth, rank: 1 });
  fishDepths.forEach((d, i) => items.push({ l: { kind: "fish", i }, d, rank: 2 }));
  // Array.prototype.sort is stable, so equal keys keep push order.
  items.sort((a, b) => a.d - b.d || a.rank - b.rank);
  return items.map((it) => it.l);
}
