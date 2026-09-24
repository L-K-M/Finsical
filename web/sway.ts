/**
 * Plant/decor sway: each decor item is drawn in horizontal bands whose
 * x-offset grows toward the top, so roots stay planted in the gravel
 * while tips drift — the aquarium's tell that the water is alive.
 * Pure math lives here so the gait is testable; main.ts does the
 * banded drawImage.
 */

/** How many horizontal slices a decor item is drawn in. Six is enough
 * that the stepped offsets read as a curve at pixel-art scale. */
export const SWAY_BANDS = 6;

/** Peak tip offset in px — small enough to read as drift, not wind. */
export const SWAY_AMP = 1.6;

/** Radians per tick — about a 9-second full cycle at 30 tps. */
const SWAY_RATE = (Math.PI * 2) / 270;

/** Horizontal offset for the band whose vertical center sits `frac`
 * of the item's height below its top (0 = tip, 1 = root). Quadratic
 * lift keeps the bottom pixel glued while the tip swings ~SWAY_AMP. */
export function swayOffset(tick: number, phase: number,
                           frac: number): number {
  const lift = 1 - Math.min(Math.max(frac, 0), 1);
  // `|| 0` folds Math.round's -0 back to +0 so offsets stay plain ints.
  return Math.round(SWAY_AMP * lift * lift *
                    Math.sin(tick * SWAY_RATE + phase * Math.PI * 2)) || 0;
}
