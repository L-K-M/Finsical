import { describe, expect, it } from "vitest";
import { plantSizeOf } from "./plants.js";

describe("plantSizeOf", () => {
  it("sums width × height ÷ 1000 over plant-kind decor only", () => {
    // Two plants (40×100 and 20×50) and one accessory of the same size
    // as the first: the accessory stands in the tank but does not
    // photosynthesise.
    expect(plantSizeOf([
      { plant: true, width: 40, height: 100 },
      { plant: false, width: 40, height: 100 },
      { plant: true, width: 20, height: 50 },
    ])).toBeCloseTo(5, 10);
  });

  it("is zero for an empty tank or accessories alone", () => {
    expect(plantSizeOf([])).toBe(0);
    expect(plantSizeOf([{ plant: false, width: 80, height: 60 }])).toBe(0);
  });
});
