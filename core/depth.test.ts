import { describe, expect, it } from "vitest";
import { decorDepth, drawOrder } from "./depth.js";

describe("decorDepth", () => {
  it("puts tall pieces at the back and short ones at the front", () => {
    const tall = decorDepth(180, 200, 0.5);
    const mid = decorDepth(80, 200, 0.5);
    const low = decorDepth(30, 200, 0.5);
    expect(tall).toBeLessThan(mid);
    expect(mid).toBeLessThan(low);
  });

  it("stays inside [0, 1] for any hash", () => {
    for (const h of [0, 10, 100, 400])
      for (const f of [-1, 0, 0.999, 2]) {
        const d = decorDepth(h, 200, f);
        expect(d).toBeGreaterThanOrEqual(0);
        expect(d).toBeLessThanOrEqual(1);
      }
  });
});

describe("drawOrder", () => {
  it("interleaves decor, fish and the mid layer back to front", () => {
    const o = drawOrder([0.8, 0.1], [0.5, 0.05], 0.3);
    expect(o).toEqual([
      { kind: "fish", i: 1 }, { kind: "decor", i: 1 }, { kind: "mid" },
      { kind: "fish", i: 0 }, { kind: "decor", i: 0 },
    ]);
  });

  it("draws a fish level with a plant in front of it", () => {
    expect(drawOrder([0.5], [0.5], 0.3)).toEqual([
      { kind: "mid" }, { kind: "decor", i: 0 }, { kind: "fish", i: 0 },
    ]);
  });
});
