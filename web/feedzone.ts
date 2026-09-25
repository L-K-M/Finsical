/**
 * The air above the waterline, where a click drops food instead of
 * knocking on the glass, plus the object-fit:contain letterbox mapping
 * shared by click and hover. Pure so vitest can pin both without a DOM.
 */
import { SURFACE } from "../core/sim.js";

/** True when a tank-space point is above the water: the air strip, or
 * the surface line's own row, so a click on the line feeds too.
 * Anything lower is in the water and knocks on the glass. `waterline`
 * is the drawn line per column (see surfaceLine) — the waves wander
 * SURFACE ± SURFACE_MAX, so a fixed threshold would let clicks on a
 * crest's submerged pixels feed and clicks on a trough's bare pixels
 * knock. A column outside the line's length falls back to the rest
 * height. */
export function isFeedZone(x: number, y: number,
                           waterline: ArrayLike<number>): boolean {
  const i = Math.round(x);
  const line = i >= 0 && i < waterline.length ? waterline[i]! : SURFACE;
  return y < line + 1;
}

/**
 * Map a client point through an object-fit: contain letterbox back to
 * tank space. Returns null when the point is in the letterbox bar or
 * the non-finite garbage a bad rect can produce.
 */
export function containPoint(
  clientX: number, clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  tank: { width: number; height: number },
): { x: number; y: number } | null {
  const s = Math.min(rect.width / tank.width, rect.height / tank.height);
  const x = (clientX - rect.left - (rect.width - tank.width * s) / 2) / s;
  const y = (clientY - rect.top - (rect.height - tank.height * s) / 2) / s;
  if (!Number.isFinite(x) || !Number.isFinite(y) ||
      x < 0 || x >= tank.width || y < 0 || y >= tank.height) return null;
  return { x, y };
}
