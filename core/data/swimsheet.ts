import type { SpriteSheet } from "./azpack.js";

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
