// Frame pacing for the tank page: the sim runs at a fixed step while the
// display runs at whatever rate rAF delivers (60, 120 Hz, ...). Kept
// DOM-free so the pacing rules are testable without a browser.

/** Longest wall-clock gap one frame may feed the sim. After a stall or
 * a hidden stretch the tank resumes instead of fast-forwarding. */
export const MAX_FRAME_MS = 200;

export interface FramePlan {
  /** Sim ticks to run this frame; 0 means the picture is unchanged. */
  ticks: number;
  /** Leftover time to carry into the next frame, below one step. */
  acc: number;
}

/** Add one frame's elapsed time to the accumulator and split it into
 * whole sim steps. A negative dt (the first rAF timestamp can predate
 * the clock read at startup) counts as no time. */
export function planFrame(acc: number, dtMs: number,
                          stepMs: number): FramePlan {
  let a = acc + Math.min(Math.max(0, dtMs), MAX_FRAME_MS);
  let ticks = 0;
  // Repeated subtraction, not floor(): the same float steps the loop
  // has always taken, so tick timing doesn't drift at boundaries.
  while (a >= stepMs) {
    a -= stepMs;
    ticks++;
  }
  return { ticks, acc: a };
}

/** Run draw() for `key` unless it threw before. On the first throw,
 * remember the key, log once and draw the fallback from then on, so
 * one bad sprite sheet can't take down every frame. */
export function drawOrFallback<K extends object>(
    broken: WeakSet<K>, key: K, draw: () => void,
    fallback: () => void): void {
  if (broken.has(key)) return fallback();
  try {
    draw();
  } catch (e) {
    broken.add(key);
    console.warn("sprite draw failed; using the placeholder:", e);
    fallback();
  }
}
