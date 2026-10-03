/**
 * The Tank Overview's selection spotlight is a lease, not a toggle:
 * the window re-asserts it on a heartbeat, and it lapses when the
 * window goes away. BroadcastChannel has no disconnect event and a
 * bfcache eviction fires no pagehide, so without an expiry a vanished
 * Overview would leave its marching-ants marquee on a fish forever.
 * Wall-clock, not ticks: a paused sim never advances tickCount, which
 * would freeze the lease mid-flight. Pure so the tank frame loop can
 * run the check on every frame, paused or not.
 */

/** Wall-clock ms a focus stays live without a re-assert. Sized past
 * the ~60 s clamp browsers put on hidden-tab timers. */
export const SPOTLIGHT_TTL_MS = 180_000;

/** Whether the lease is still live: it has not lapsed and its fish is
 * still in the tank. A clock that stepped backwards (NTP) reads as
 * live, so the spotlight is never lifted on a negative age. */
export function spotlightAlive(id: number | null, at: number, now: number,
                               fishPresent: boolean): boolean {
  return id !== null && now - at <= SPOTLIGHT_TTL_MS && fishPresent;
}
