import { describe, expect, it } from "vitest";
import { MAX_FRAME_MS, planFrame } from "./loop.js";

const STEP = 1000 / 30;

/** Ticks per frame for `frames` frames of `dt` ms each, from acc = 0. */
function ticksPerFrame(dt: number, frames: number): number[] {
  let acc = 0;
  const out: number[] = [];
  for (let i = 0; i < frames; i++) {
    const p = planFrame(acc, dt, STEP);
    acc = p.acc;
    out.push(p.ticks);
  }
  return out;
}

describe("planFrame", () => {
  it("alternates 0 and 1 ticks at 60 Hz", () => {
    const t = ticksPerFrame(16.7, 60);
    expect(t.slice(0, 6)).toEqual([0, 1, 0, 1, 0, 1]);
    expect(Math.max(...t)).toBe(1);
    expect(t.filter((n) => n === 1).length).toBe(30);
  });

  it("ticks on one frame in four at 120 Hz", () => {
    const t = ticksPerFrame(1000 / 120, 120);
    expect(Math.max(...t)).toBe(1);
    expect(t.filter((n) => n === 1).length).toBe(30);
    // Every window of four consecutive frames holds exactly one tick.
    for (let i = 0; i + 4 <= t.length; i++)
      expect(t.slice(i, i + 4).reduce((a, b) => a + b)).toBe(1);
  });

  it("keeps the remainder below one step", () => {
    const p = planFrame(10, 100, STEP);
    expect(p.ticks).toBe(3);
    expect(p.acc).toBeCloseTo(110 - 3 * STEP);
  });

  it("clamps a long stall so the sim doesn't fast-forward", () => {
    const p = planFrame(0, 5000, STEP);
    // 200 ms is six steps on paper; float subtraction leaves the sixth
    // just short, so it runs on the next frame instead.
    expect(p.ticks).toBeGreaterThanOrEqual(5);
    expect(p.ticks).toBeLessThanOrEqual(Math.round(MAX_FRAME_MS / STEP));
    expect(p.acc + p.ticks * STEP).toBeCloseTo(MAX_FRAME_MS);
    expect(p.acc).toBeLessThan(STEP);
  });

  it("ignores a timestamp that runs backwards", () => {
    expect(planFrame(5, -20, STEP)).toEqual({ ticks: 0, acc: 5 });
  });

  it("never hangs on a non-positive or NaN step", () => {
    for (const step of [0, -STEP, NaN]) {
      expect(planFrame(5, 16.7, step)).toEqual({ ticks: 0, acc: 5 });
    }
  });

  it("treats a NaN accumulator or dt as no time", () => {
    // A poisoned accumulator restarts from zero; this frame's dt still
    // counts. A NaN dt counts as no time and keeps the accumulator.
    expect(planFrame(NaN, 16.7, STEP)).toEqual({ ticks: 0, acc: 16.7 });
    expect(planFrame(5, NaN, STEP)).toEqual({ ticks: 0, acc: 5 });
  });
});
