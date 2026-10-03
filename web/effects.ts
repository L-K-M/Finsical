/**
 * The tank's optional visual extras — the flourishes Finsical draws
 * that the original AquaZone did not: sunlight in the water, a moving
 * surface, tap ripples and feed splashes, swaying decor, fouled-water
 * murk, the night torch and the snail's visits. Each is a checkbox on
 * Preferences' Effects pane; every one defaults on, so a tank keeps
 * its looks until somebody asks for the original's plainer rendering —
 * except the glass prints, which change the glass itself and so
 * default off. The tank page owns the state, persists it, and applies
 * posts from the pane — this module is the shape both sides share.
 */
export interface EffectsConfig {
  /** Sun shafts through the water and the caustic web over the lower
   * tank and gravel (drawLight in water.ts). */
  sunlight: boolean;
  /** The spring-driven waterline: its swell, the waves that splashes,
   * taps and cruising fish send along it, and the refraction waver
   * just under it. Off draws the resting flat line. */
  surface: boolean;
  /** Rings where the glass is tapped and droplets where food or a new
   * fish enters the water (fx.ts), including the ring a tap-popped
   * bubble leaves. */
  splashes: boolean;
  /** Plants and decor drifting in the current (sway.ts). */
  sway: boolean;
  /** The green-brown wash and drifting debris over fouled water
   * (drawMurk in water.ts). */
  murk: boolean;
  /** The warm circle of light a hovering pointer carries over a dark
   * tank (keepTorch/drawTorch in water.ts). */
  torch: boolean;
  /** The snail that creeps across the gravel every so often
   * (snail.ts). */
  snail: boolean;
  /** Prints on the inside of the glass where fish have settled
   * (smudges in water.ts): the one extra that changes the glass
   * itself, so it alone defaults off — and its history is per visit,
   * never saved. */
  smudges: boolean;
}

/** Every extra on: the tank's long-standing look. The glass prints
 *  are the one exception — see smudges. */
export const EFFECTS_DEFAULTS: Readonly<EffectsConfig> =
  Object.freeze<EffectsConfig>({
    sunlight: true, surface: true, splashes: true, sway: true,
    murk: true, torch: true, snail: true, smudges: false,
  });

/** Validate a stored or posted effects config, field by field, onto
 * `base` — unknown keys drop, non-booleans fall back. */
export function sanitizeEffects(
    raw: unknown, base: EffectsConfig = EFFECTS_DEFAULTS): EffectsConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as
    Record<string, unknown>;
  const out = {} as Record<keyof EffectsConfig, boolean>;
  for (const k of Object.keys(EFFECTS_DEFAULTS) as (keyof EffectsConfig)[])
    out[k] = typeof r[k] === "boolean" ? r[k]! : base[k];
  return out;
}
