import { describe, expect, it } from "vitest";
import { BURST_MAX, BURST_TICKS, GATE_TICKS, NoteGate, ROOT_HZ,
         noteFor } from "./fishmusic.js";
import { panFor } from "./audio.js";

// The tank's drawn size (core/tuning.ts): every note is placed in it.
const TANK = { width: 320, height: 200 };
/** Semitones above the root of every degree the scale uses. */
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
const semisAbove = (f: number): number =>
  Math.round(12 * Math.log2(f / ROOT_HZ) * 1e6) / 1e6;

describe("noteFor", () => {
  it("sings the top of the scale at the surface and the root on the gravel", () => {
    const high = noteFor({ x: 160, y: 0 }, TANK, false).freq;
    const low = noteFor({ x: 160, y: TANK.height - 1 }, TANK, false).freq;
    expect(semisAbove(low)).toBe(SCALE[0]);
    expect(semisAbove(high)).toBe(SCALE[SCALE.length - 1]);
    expect(high).toBeGreaterThan(low);
  });

  it("keeps every depth inside the scale", () => {
    for (let y = 0; y < TANK.height; y++) {
      const s = semisAbove(noteFor({ x: 10, y }, TANK, false).freq);
      expect(SCALE).toContain(s);
    }
  });

  it("clamps a fish outside the tank to the scale's ends", () => {
    // Saved and spawned positions are clamped, but a note must never
    // read outside the table whatever it is handed.
    expect(noteFor({ x: 0, y: -50 }, TANK, false).freq)
      .toBe(noteFor({ x: 0, y: 0 }, TANK, false).freq);
    expect(noteFor({ x: 0, y: 9000 }, TANK, false).freq)
      .toBe(noteFor({ x: 0, y: TANK.height - 1 }, TANK, false).freq);
  });

  it("drops an octave at night", () => {
    const day = noteFor({ x: 40, y: 90 }, TANK, false).freq;
    const night = noteFor({ x: 40, y: 90 }, TANK, true).freq;
    expect(day / night).toBeCloseTo(2, 6);
  });

  it("lifts a grace note an octave without leaving the scale", () => {
    const plain = noteFor({ x: 40, y: 90 }, TANK, false).freq;
    const grace = noteFor({ x: 40, y: 90 }, TANK, false, 1).freq;
    expect(grace / plain).toBeCloseTo(2, 6);
    // An octave up is outside the base table, but still a degree of
    // the same scale, so a grace note can never sound out of key.
    const pitchClass = ((semisAbove(grace) % 12) + 12) % 12;
    expect(SCALE.map((s) => s % 12)).toContain(pitchClass);
  });

  it("pans a fish by where it is across the tank", () => {
    // The tank's event sounds pan the same way, so a note comes from
    // where the fish is rather than from somewhere else.
    expect(noteFor({ x: 0, y: 10 }, TANK, false).pan)
      .toBe(panFor(0, TANK.width));
    expect(noteFor({ x: 320, y: 10 }, TANK, false).pan)
      .toBe(panFor(320, TANK.width));
    expect(noteFor({ x: 160, y: 10 }, TANK, false).pan).toBe(0);
  });
});

describe("NoteGate", () => {
  it("lets one note through, then holds the rest back", () => {
    const g = new NoteGate();
    expect(g.try(0)).toBe(true);
    expect(g.try(1)).toBe(false);
    expect(g.try(GATE_TICKS - 1)).toBe(false);
    expect(g.try(GATE_TICKS)).toBe(true);
  });

  it("caps how many notes land in a short window", () => {
    const g = new NoteGate();
    let played = 0;
    // A fish turns about every six seconds; the gate must thin that
    // to a trickle even at one note per gate interval.
    for (let t = 0; t < BURST_TICKS; t += GATE_TICKS)
      if (g.try(t)) played++;
    expect(played).toBeLessThanOrEqual(BURST_MAX);
    // And once the window has moved on, notes sound again.
    expect(g.try(BURST_TICKS + GATE_TICKS)).toBe(true);
  });

  it("does not let a rejected note push the gate out", () => {
    const g = new NoteGate();
    g.try(0);
    expect(g.try(1)).toBe(false);
    // Still exactly GATE_TICKS after the note that played, not after
    // the calls that did not.
    expect(g.try(GATE_TICKS)).toBe(true);
  });

  it("accepts nothing at a tick that is not a number", () => {
    const g = new NoteGate();
    expect(g.try(NaN)).toBe(false);
    expect(g.try(Infinity)).toBe(false);
    expect(g.try(0)).toBe(true);
  });

  it("starts over when the sim's clock goes backwards", () => {
    // A reloaded or refilled tank restarts its tick count. Keeping
    // the old history would silence the gate until the count climbed
    // back past where the previous session ended.
    const g = new NoteGate();
    for (let t = 0; t < 5000; t += GATE_TICKS) g.try(t);
    expect(g.try(GATE_TICKS)).toBe(true);
    // And the fresh history is a fresh history, not the old one.
    expect(g.try(GATE_TICKS + 1)).toBe(false);
  });

  it("does not let a backwards tick re-open a spent burst window", () => {
    const g = new NoteGate();
    // Three notes fill the window; going backwards must not let a
    // fourth straight away.
    for (let i = 0; i < BURST_MAX; i++) g.try(i * GATE_TICKS);
    expect(g.try(1)).toBe(true);      // backwards: history dropped
    expect(g.try(2)).toBe(false);     // and the new history counts
  });
});
