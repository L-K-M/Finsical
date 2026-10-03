import { describe, expect, it } from "vitest";
import { plantAreaOf } from "./plants.js";

describe("plantAreaOf", () => {
  it("sums drawn area over plant-kind decor only", () => {
    // Two plants (40×100 and 20×50) and one accessory of the same size
    // as the first: the accessory stands in the tank but does not
    // photosynthesise.
    expect(plantAreaOf([
      { plant: true, width: 40, height: 100 },
      { plant: false, width: 40, height: 100 },
      { plant: true, width: 20, height: 50 },
    ])).toBe(5000);
  });

  it("is zero for an empty tank or accessories alone", () => {
    expect(plantAreaOf([])).toBe(0);
    expect(plantAreaOf([{ plant: false, width: 80, height: 60 }])).toBe(0);
  });
});
