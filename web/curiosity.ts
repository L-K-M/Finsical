/**
 * How long the fish stay curious about a resting pointer. The nearest
 * calm fish comes over to look at the pointer (core/sim.ts); a pointer
 * left parked over the floating tank, its owner typing in another app,
 * would otherwise hold that fish there for hours. Curiosity fades after
 * about 20 s without a real move, and a move brings it back. Kept apart
 * from the sim, which stays tick-driven and deterministic.
 */

/** Moves this small (tank px) are a hand resting on the mouse. */
export const NOTICE_MOVE = 3;
/** Sim ticks of stillness before the fish lose interest (20 s). */
export const NOTICE_FADE_TICKS = 600;

/** Where the pointer last really moved to, and the sim tick it did. */
export interface Notice { x: number; y: number; at: number }

/** The notice after the pointer is seen at `p` on sim tick `tick`: a
 * move of more than NOTICE_MOVE starts it afresh; a smaller one keeps
 * the point and its age. null when the pointer is off the tank. */
export function nextNotice(prev: Notice | null,
                           p: { x: number; y: number } | null,
                           tick: number): Notice | null {
  if (!p) return null;
  if (prev && Math.hypot(p.x - prev.x, p.y - prev.y) <= NOTICE_MOVE)
    return prev;
  return { x: p.x, y: p.y, at: tick };
}

/** The point the fish notice on sim tick `tick`, or null once
 * curiosity has faded. */
export function noticePoint(n: Notice | null, tick: number):
    { x: number; y: number } | null {
  return n && tick - n.at <= NOTICE_FADE_TICKS ? { x: n.x, y: n.y } : null;
}
