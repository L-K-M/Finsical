/**
 * The air above the waterline, where a click drops food instead of
 * knocking on the glass, plus the object-fit:contain letterbox mapping
 * shared by click and hover. Pure so vitest can pin both without a DOM.
 */
import { SURFACE } from "../core/sim.js";

/** True when a tank-space y is above the water: the air strip, or the
 * surface line's own row, so a click on the line feeds too. Anything
 * lower is in the water and knocks on the glass. */
export function isFeedZoneY(y: number): boolean {
  return y < SURFACE + 1;
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

/** Where the tank's picture sits inside a host element: `s` screen px
 * per tank px, and the picture's top-left corner `ox`, `oy` in the
 * host's own px. The forward twin of containPoint. */
export interface TankMap { s: number; ox: number; oy: number }

/** The object-fit: contain placement of a `tank`-sized picture drawn
 * in `canvas`, measured from `host`'s corner (both client rects). */
export function tankMap(
  canvas: { left: number; top: number; width: number; height: number },
  host: { left: number; top: number },
  tank: { width: number; height: number },
): TankMap {
  const s = Math.min(canvas.width / tank.width, canvas.height / tank.height);
  return {
    s,
    ox: canvas.left - host.left + (canvas.width - tank.width * s) / 2,
    oy: canvas.top - host.top + (canvas.height - tank.height * s) / 2,
  };
}
