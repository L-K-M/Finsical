// Frame pacing for the tank page: the sim runs at a fixed step while the
// display runs at whatever rate rAF delivers (60, 120 Hz, ...). Kept
// DOM-free so the pacing rules are testable without a browser.

/** Longest wall-clock gap one frame may feed the sim. After a stall or
 * a hidden stretch the tank resumes instead of fast-forwarding. */
export const MAX_FRAME_MS = 200;

/** Hard bound on loop iterations per frame: even a near-zero step
 * returns quickly, dropping the excess time like a stall. */
export const ABSOLUTE_MAX_TICKS = 10_000;

export interface FramePlan {
  /** Sim ticks to run this frame; 0 means the picture is unchanged. */
  ticks: number;
  /** Leftover time to carry into the next frame, below one step. */
  acc: number;
}

/** Add one frame's elapsed time to the accumulator and split it into
 * whole sim steps. A negative dt (the first rAF timestamp can predate
 * the clock read at startup) counts as no time, as does any non-finite
 * one; a non-positive or NaN step runs no ticks (that frame's dt is
 * dropped, so there is no catch-up burst later) rather than looping
 * forever. Ticks per frame are capped at one frame's worth of steps so
 * a huge-but-finite accumulator or a tiny step can't stall the frame;
 * the excess time is dropped like a stall. */
export function planFrame(acc: number, dtMs: number,
                          stepMs: number): FramePlan {
  const kept = Number.isFinite(acc) ? acc : 0;
  if (!Number.isFinite(stepMs) || stepMs <= 0)
    return { ticks: 0, acc: kept };
  const dt = Number.isFinite(dtMs)
    ? Math.min(Math.max(0, dtMs), MAX_FRAME_MS) : 0;
  let a = kept + dt;
  let ticks = 0;
  // Repeated subtraction, not floor(): the same float steps the loop
  // has always taken, so tick timing doesn't drift at boundaries. The
  // cap keeps a poisoned-but-finite acc (or a near-zero step) from
  // turning the loop into an effective hang: one frame's worth of
  // steps, and never more than a bounded number of iterations. Normal
  // frames stay far below both (acc carries less than one step plus
  // one clamped dt).
  const maxTicks = Math.min(Math.ceil(MAX_FRAME_MS / stepMs) + 1,
                            ABSOLUTE_MAX_TICKS);
  while (a >= stepMs) {
    if (ticks >= maxTicks) { a = 0; break; }
    a -= stepMs;
    ticks++;
  }
  return { ticks, acc: a };
}
