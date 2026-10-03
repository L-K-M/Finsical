import { describe, expect, it } from "vitest";
import { laserAim } from "./laser.js";

describe("laserAim", () => {
  it("hides with no pointer or over the air strip", () => {
    expect(laserAim(null)).toBeNull();
    expect(laserAim({ x: 100, y: 4 }, 10)).toBeNull();
    // The resting line itself is water, so the dot shows right at it.
    expect(laserAim({ x: 100, y: 10 }, 10)).toEqual({ x: 100, y: 10 });
  });

  it("rounds and pins the dot a pixel inside the glass", () => {
    expect(laserAim({ x: -5, y: 150 })).toEqual({ x: 1, y: 150 });
    expect(laserAim({ x: 999, y: 999 })).toEqual({ x: 318, y: 198 });
    expect(laserAim({ x: 100.6, y: 50.4 })).toEqual({ x: 101, y: 50 });
  });
});
