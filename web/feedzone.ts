/**
 * The surface strip that drops food on click, instead of knocking on
 * the glass, plus the object-fit:contain letterbox mapping shared by
 * click and hover. Pure so vitest can pin both without a DOM.
 */

/** Top fraction of the tank that feeds. Matches the original: clicks
 * with y < height * 0.15 drop a pellet; deeper clicks knock. */
export const FEED_ZONE = 0.15;

/** True when a tank-space y falls inside the feed strip. The bound is
 * exclusive, same as the pointerdown check it replaced. */
export function isFeedZoneY(y: number, tankHeight: number): boolean {
  return y < tankHeight * FEED_ZONE;
}

/** First tank row that is *not* feedable — where the boundary line is
 * drawn so it sits on the first non-feed pixel, not inside the strip. */
export function feedZoneLineY(tankHeight: number): number {
  return Math.ceil(tankHeight * FEED_ZONE);
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
