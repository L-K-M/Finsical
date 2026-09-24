/**
 * The water's surface as a row of coupled springs, one per tank column
 * (the usual 1D height-field water). Splashes, bubble pops, glass taps
 * and fish swimming near the top push columns; each spring pulls its
 * column back to rest and passes some of the push on to its neighbours,
 * so a disturbance spreads out as a pair of waves, reflects off the
 * glass and dies away. Render-only state, ticked on the sim's 30 tps
 * clock like the tap ripples, and never saved.
 *
 * Heights are in pixels, positive downward (screen y), relative to
 * SURFACE. What the tank draws is the rounded height plus a gentle
 * ambient swell, clamped to SURFACE_MAX so the water never reaches the
 * hood.
 */
import { SURFACE } from "../core/sim.js";

export const SURFACE_W = 320;
/** Furthest the drawn waterline moves from rest, px. */
export const SURFACE_MAX = 3;

/** Pull of each spring back to rest, per tick. */
const TENSION = 0.015;
/** Velocity lost per tick. */
const DAMPING = 0.022;
/** Share of a height difference passed to each neighbour per pass. */
const SPREAD = 0.2;
/** Spread passes per tick: more passes, faster waves. */
const SPREAD_PASSES = 3;
/** Cap on a column's height and speed, so a burst of feeding can't
 * pump the water into a standing slosh. */
const H_CAP = 6;
const V_CAP = 3;

export interface Surface {
  /** Column heights, px, positive down. */
  readonly h: Float32Array;
  /** Column vertical velocities, px/tick. */
  readonly v: Float32Array;
}

export function newSurface(): Surface {
  return { h: new Float32Array(SURFACE_W), v: new Float32Array(SURFACE_W) };
}

function clampAbs(v: number, cap: number): number {
  return Math.min(cap, Math.max(-cap, v));
}

/**
 * Push the water at column `x`. A positive impulse (px/tick) presses the
 * surface down, as a pellet or a fish entering does; a negative one
 * lifts it. The push is spread over a few columns with a smooth falloff
 * so it doesn't start as a one-pixel spike.
 */
export function disturbSurface(s: Surface, x: number, impulse: number,
                               radius = 3): void {
  const c = Math.round(x);
  for (let d = -radius; d <= radius; d++) {
    const i = c + d;
    if (i < 0 || i >= SURFACE_W) continue;
    const w = 0.5 + 0.5 * Math.cos((d / (radius + 1)) * Math.PI);
    s.v[i] = clampAbs(s.v[i]! + impulse * w, V_CAP);
  }
}

// Scratch buffers for the spread pass; one surface per page, so shared.
const left = new Float32Array(SURFACE_W);
const right = new Float32Array(SURFACE_W);

/** Advance the springs one sim tick. The end columns have one
 * neighbour each, so waves reflect off the glass. */
export function tickSurface(s: Surface): void {
  const { h, v } = s;
  for (let i = 0; i < SURFACE_W; i++) {
    v[i] = v[i]! - TENSION * h[i]! - DAMPING * v[i]!;
    h[i] = clampAbs(h[i]! + v[i]!, H_CAP);
  }
  for (let p = 0; p < SPREAD_PASSES; p++) {
    for (let i = 0; i < SURFACE_W; i++) {
      left[i] = i > 0 ? SPREAD * (h[i]! - h[i - 1]!) : 0;
      right[i] = i < SURFACE_W - 1 ? SPREAD * (h[i]! - h[i + 1]!) : 0;
    }
    for (let i = 0; i < SURFACE_W; i++) {
      if (i > 0) {
        v[i - 1] = v[i - 1]! + left[i]!;
        h[i - 1] = h[i - 1]! + left[i]!;
      }
      if (i < SURFACE_W - 1) {
        v[i + 1] = v[i + 1]! + right[i]!;
        h[i + 1] = h[i + 1]! + right[i]!;
      }
    }
  }
}

/** Filter current and air movement: a small travelling swell that
 * keeps the line from lying ruler-flat. Peaks under a pixel, so it only
 * nudges the line where both waves crest together. */
export function ambientSwell(x: number, t: number): number {
  return 0.4 * Math.sin(x * 0.09 - t * 0.05) +
         0.25 * Math.sin(x * 0.23 + t * 0.071 + 1.7);
}

/**
 * The drawn waterline: the row of the surface at each column, whole
 * pixels, within SURFACE ± SURFACE_MAX. `t` drives the ambient swell;
 * pass a constant to hold it still. Writes into `out` (length
 * SURFACE_W) and returns it, so a frame allocates nothing.
 */
export function surfaceLine(s: Surface, t: number,
                            out: Int16Array): Int16Array {
  for (let x = 0; x < SURFACE_W; x++) {
    const d = Math.round(s.h[x]! + ambientSwell(x, t));
    out[x] = SURFACE + clampAbs(d, SURFACE_MAX);
  }
  return out;
}
