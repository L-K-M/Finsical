import { describe, expect, it } from "vitest";
import { newSplash, RIPPLE_TICKS, SPLASH_TICKS,
         tickRipples, tickSplashes } from "./fx.js";

describe("ripples", () => {
  it("ages and removes expired rings", () => {
    const rs = [{ x: 10, y: 10, age: RIPPLE_TICKS }];
    tickRipples(rs);
    expect(rs).toHaveLength(0);
  });

  it("keeps young rings aging", () => {
    const rs = [{ x: 1, y: 2, age: 0 }];
    tickRipples(rs);
    expect(rs[0]!.age).toBe(1);
  });
});

describe("splashes", () => {
  it("droplets rise first, then fall back past the surface", () => {
    const ss = [newSplash(50, 12)];
    let top = ss[0]!.drops[1]!.y;
    for (let t = 0; t < SPLASH_TICKS; t++) {
      tickSplashes(ss);
      top = Math.min(top, ss[0]!.drops[1]!.y);
    }
    expect(top).toBeLessThan(12); // went up…
    expect(ss[0]!.drops[1]!.y).toBeGreaterThan(12); // …and came down
  });

  it("side droplets drift outward from the center one", () => {
    const ss = [newSplash(50, 12)];
    for (let t = 0; t < 5; t++) tickSplashes(ss);
    const [l, c, r] = ss[0]!.drops;
    expect(l!.x).toBeLessThan(c!.x);
    expect(r!.x).toBeGreaterThan(c!.x);
  });

  it("removes itself after its lifetime", () => {
    const ss = [newSplash(50, 12)];
    for (let t = 0; t <= SPLASH_TICKS; t++) tickSplashes(ss);
    expect(ss).toHaveLength(0);
  });
});
