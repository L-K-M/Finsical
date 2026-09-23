/**
 * The surface strip that drops food on click, instead of knocking on
 * the glass. Pure so vitest can pin the boundary without a DOM.
 */

/** Top fraction of the tank that feeds. Matches the original: clicks
 * with y < height * 0.15 drop a pellet; deeper clicks knock. */
export const FEED_ZONE = 0.15;

/** True when a tank-space y falls inside the feed strip. The bound is
 * exclusive, same as the pointerdown check it replaced. */
export function isFeedZoneY(y: number, tankHeight: number): boolean {
  return y < tankHeight * FEED_ZONE;
}
