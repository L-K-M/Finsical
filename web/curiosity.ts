/**
 * How long the fish stay curious about a resting pointer. The nearest
 * calm fish (up to NOTICE_CAP in core/sim.ts) come over to look at the
 * pointer; a pointer left parked over the floating tank, its owner
 * typing in another app, would otherwise hold them there for hours. Curiosity fades after
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
  // A notice stamped after `tick` (the sim clock went back, say a
  // restored tank) is stale: any sighting restarts it on this clock.
  if (prev && prev.at <= tick &&
      Math.hypot(p.x - prev.x, p.y - prev.y) <= NOTICE_MOVE)
    return prev;
  return { x: p.x, y: p.y, at: tick };
}

/** The point the fish notice on sim tick `tick`, or null once
 * curiosity has faded. A negative age (a notice from a clock that has
 * since gone back) counts as stale too, the same as nextNotice treats
 * it, so a rewound clock can't hold the fish for longer than the fade;
 * the next real sighting starts a fresh notice. */
export function noticePoint(n: Notice | null, tick: number):
    { x: number; y: number } | null {
  if (!n) return null;
  const age = tick - n.at;
  return age >= 0 && age <= NOTICE_FADE_TICKS ? { x: n.x, y: n.y } : null;
}
