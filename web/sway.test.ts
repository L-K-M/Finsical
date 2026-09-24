import { describe, expect, it } from "vitest";
import { SWAY_AMP, SWAY_PERIOD_TICKS, swayOffset } from "./sway.js";

describe("swayOffset", () => {
  it("keeps the root planted and lets the tip swing", () => {
    for (let t = 0; t < 600; t += 7) {
      expect(swayOffset(t, 0.3, 1)).toBe(0); // root never moves
      expect(swayOffset(t, 0.3, 2)).toBe(0); // frac clamps at the root
      expect(swayOffset(t, 0.3, -0.5))
        .toBe(swayOffset(t, 0.3, 0)); // frac clamps at the tip
      expect(Math.abs(swayOffset(t, 0.3, 0)))
        .toBeLessThanOrEqual(Math.ceil(SWAY_AMP));
    }
  });

  it("clamps frac outside [0, 1] and swallows NaN", () => {
    for (let t = 0; t < 600; t += 11) {
      expect(swayOffset(t, 0.3, 2)).toBe(0); // past the root → planted
      expect(swayOffset(t, 0.3, -0.5))       // past the tip → tip
        .toBe(swayOffset(t, 0.3, 0));
      expect(swayOffset(t, 0.3, NaN)).toBe(0);
    }
  });

  it("offsets decrease monotonically from tip to root at the peak", () => {
    // sin hits +1 a quarter cycle in (phase 0).
    const t = Math.round(SWAY_PERIOD_TICKS / 4);
    expect(swayOffset(t, 0, 0)).toBe(2);   // tip at peak ≈ SWAY_AMP
    expect(swayOffset(t, 0, 0.5)).toBe(1); // quarter lift ≈ 0.6 → 1
    expect(swayOffset(t, 0, 1)).toBe(0);
    expect(swayOffset(t, 0, 0.2))
      .toBeGreaterThanOrEqual(swayOffset(t, 0, 0.6));
  });

  it("desyncs per fractional phase — integer phases would lockstep", () => {
    // The bug this guards: integer phases are whole sin cycles apart.
    const a = swayOffset(100, 0.13, 0);
    const b = swayOffset(100, 0.74, 0);
    expect(a).not.toBe(b);
    expect(swayOffset(100, 0, 0)).toBe(swayOffset(100, 3, 0)); // why
  });

  it("is periodic in phase and tick", () => {
    expect(swayOffset(0, 0.25, 0)).toBe(swayOffset(0, 1.25, 0));
    expect(swayOffset(0, 0.1, 0))
      .toBe(swayOffset(SWAY_PERIOD_TICKS, 0.1, 0));
  });
});
