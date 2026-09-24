import { describe, expect, it } from "vitest";
import { SWAY_AMP, swayOffset } from "./sway.js";

describe("swayOffset", () => {
  it("keeps the root planted and lets the tip swing", () => {
    for (let t = 0; t < 600; t += 7) {
      expect(swayOffset(t, 0.3, 1)).toBe(0); // root never moves
      expect(Math.abs(swayOffset(t, 0.3, 0)))
        .toBeLessThanOrEqual(Math.ceil(SWAY_AMP));
    }
  });

  it("sways monotonically more toward the top", () => {
    // Find a moment with positive sway, then compare band offsets.
    let t = 0;
    while (swayOffset(t, 0, 0) <= 0) t++;
    expect(swayOffset(t, 0, 0)).toBeGreaterThanOrEqual(
      swayOffset(t, 0, 0.5));
    expect(swayOffset(t, 0, 0.5)).toBeGreaterThanOrEqual(
      swayOffset(t, 0, 0.9));
  });

  it("is periodic in phase and tick", () => {
    expect(swayOffset(0, 0.25, 0)).toBe(swayOffset(0, 1.25, 0));
    // 270 ticks is one full sway cycle.
    expect(swayOffset(0, 0.1, 0)).toBe(swayOffset(270, 0.1, 0));
  });
});
