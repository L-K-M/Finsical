/**
 * Fish music: which note a fish plays, and how often the tank may
 * play one.
 *
 * The idea is a desk instrument rather than a soundtrack. A fish that
 * turns its corner plays one soft note from a pentatonic scale, the
 * scale degree chosen by how deep it swims (a fish near the surface
 * sings high, one on the gravel sings low) and the stereo position by
 * how far across the tank it is. At night everything drops an octave,
 * the way the rest of the tank dims.
 *
 * A tank is too lively to play every turn, so a gate lets one note
 * through at a time and caps how many land in any short window. The
 * gate is pure: no clock reads, no WebAudio — main.ts hands it the
 * sim tick it already has, and audio.ts builds the voice.
 *
 * Off by default (SoundConfig.music): the tank's own sounds come from
 * the original's bank, and a user who wants them should not acquire a
 * kalimba.
 */

// The tank's event sounds and a fish's note both pan from its x, by one
// rule; import it rather than restate it.
import { panFor } from "./audio.js";

/** Root of the scale, C4 — the note a fish on the gravel sings. */
export const ROOT_HZ = 261.63;
/** Two octaves of a major pentatonic, low to high. C major pentatonic
 * has no semitone steps, so any pair of fish that happen to overlap
 * still lands in key — the point of a scale over a melody. */
const DEGREES = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21] as const;
/** Octave shift when the tank is dark: the fish settle down a key
 * field, so a night tank reads lower without a different scale. */
const NIGHT_OCTAVE = -12;

/** A point in the tank. */
export interface Point {
  x: number;
  y: number;
}

/** A tank's drawn size, in the same coordinates the sim uses. */
export interface TankSpan {
  width: number;
  height: number;
}

/** The note a fish plays: its pitch and where it sits in the stereo
 * field. `octave` lifts the same degree for a grace note. */
export interface Note {
  freq: number;
  pan: number;
}

/** How a fish's depth maps onto the scale. The waterline is the top
 * of the drawn tank, and the sim keeps fish below it; a fish at the
 * very top or very bottom still lands on the first or last degree
 * rather than off the scale. */
export function noteFor(fish: Point, tank: TankSpan,
                        night: boolean, octave = 0): Note {
  const span = tank.height > 1 ? tank.height - 1 : 1;
  // 0 at the surface, 1 on the gravel.
  const depth = Math.min(1, Math.max(0, fish.y / span));
  const top = DEGREES.length - 1;
  const i = Math.round((1 - depth) * top);
  const semis = DEGREES[i]! + 12 * octave + (night ? NIGHT_OCTAVE : 0);
  return { freq: ROOT_HZ * Math.pow(2, semis / 12),
           pan: panFor(fish.x, tank.width) };
}

/** Ticks (at the sim's 30 per second) one fish must wait between
 * notes. A fish turns about once every six seconds, so this keeps a
 * lone fish audible while stopping a crowd from turning into a chord
 * struck all at once. */
export const GATE_TICKS = Math.round(30 * 0.35);
/** Notes allowed in any window of this many ticks. A full tank's worth
 * of turns is about one per second; this holds even that to a
 * trickle. */
export const BURST_TICKS = 30 * 2;
export const BURST_MAX = 3;

/** Decides when the tank may play a note. Feed it the sim tick; it
 * counts ticks itself, so it pauses with the tank and speeds up with
 * it, and stays testable without a clock. */
export class NoteGate {
  private last = -Infinity;
  private recent: number[] = [];

  /** True when a note may sound at `tick`. Records the tick only when
   * it answers true, so a rejected call doesn't push the gate out. */
  try(tick: number): boolean {
    if (!Number.isFinite(tick)) return false;
    // A tick behind the last one means the sim's clock went backwards —
    // a reloaded tank, or a fresh one. The old history describes a
    // tank that is gone, and keeping it would silence the gate until
    // the count climbed back past where it was.
    if (tick < this.last) this.reset();
    if (tick - this.last < GATE_TICKS) return false;
    // Drop everything outside the window, then ask about this one.
    const from = tick - BURST_TICKS;
    let i = 0;
    while (i < this.recent.length && this.recent[i]! <= from) i++;
    if (i > 0) this.recent = this.recent.slice(i);
    if (this.recent.length >= BURST_MAX) return false;
    this.recent.push(tick);
    this.last = tick;
    return true;
  }

  /** Forget the history: after a long pause, when the tank is emptied
   * and refilled, or when the sim's clock goes backwards. */
  reset(): void {
    this.last = -Infinity;
    this.recent = [];
  }
}
