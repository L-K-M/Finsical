// The public aquarium's sign, 'Please don't tap on the glass', for a
// knocking spree: enough glass taps close together, and not again soon
// after it was last shown, so it stays a joke instead of a nag.

/** Taps within SPREE_MS that make a spree. */
export const SPREE_TAPS = 6;
export const SPREE_MS = 8_000;
/** The sign stays down this long after it was shown. */
export const SCOLD_COOLDOWN_MS = 30 * 60_000;

/** The taps worth keeping for the next check: those in the spree
 * window, so the list stays bounded however long the tank runs. */
export function recentTaps(times: readonly number[], now: number): number[] {
  return times.filter((t) => now - t < SPREE_MS && t <= now);
}

/** Whether glass taps at `times` (ms) call for the sign at `now`.
 * `lastShownAt` is when it was last shown, or null if never. */
export function shouldScold(times: readonly number[], now: number,
                            lastShownAt: number | null): boolean {
  if (lastShownAt !== null && now - lastShownAt < SCOLD_COOLDOWN_MS)
    return false;
  return recentTaps(times, now).length >= SPREE_TAPS;
}
