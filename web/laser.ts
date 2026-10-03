/**
 * The laser-pointer toy: a red dot that follows the pointer over the
 * water. It reuses the tank's own curiosity — `sim.notice` gathers the
 * calm fish exactly as a resting pointer does (curiosity.ts) — so the
 * dot only needs a place to shine. It hides over the air strip, where
 * there is no water to catch it, and is pinned a pixel inside the
 * glass so a pointer at the very edge never draws it over the frame.
 */
import { TANK_SIZE } from "../core/tuning.js";

export interface LaserAim {
  x: number;
  y: number;
}

/** The dot for a pointer at `p` (tank px, null off the picture); null
 * hides it. `above` is the y the water's top sits at (the rendered
 * waterline): a pointer over the air has nothing to shine on. */
export function laserAim(p: { x: number; y: number } | null,
                         above = 0): LaserAim | null {
  if (!p || p.y < above) return null;
  return {
    x: Math.min(TANK_SIZE.width - 2, Math.max(1, Math.round(p.x))),
    y: Math.min(TANK_SIZE.height - 2, Math.max(1, Math.round(p.y))),
  };
}
