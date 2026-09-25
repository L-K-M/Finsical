import { describe, expect, it } from "vitest";
import { cleanFishName, fishLabel, NAME_MAX } from "./fishname.js";

describe("cleanFishName", () => {
  it("trims and folds whitespace", () => {
    expect(cleanFishName("  Mr   Bubbles \n")).toBe("Mr Bubbles");
  });

  it("clears on empty, blank or non-string input", () => {
    expect(cleanFishName("")).toBeUndefined();
    expect(cleanFishName("   ")).toBeUndefined();
    expect(cleanFishName(42)).toBeUndefined();
    expect(cleanFishName(null)).toBeUndefined();
  });

  it("drops control characters", () => {
    expect(cleanFishName("Fin\u0000n\u0007y")).toBe("Finny");
  });

  it("cuts to NAME_MAX code points without splitting a pair", () => {
    const long = "a".repeat(NAME_MAX + 10);
    expect(cleanFishName(long)).toHaveLength(NAME_MAX);
    const fish = "\u{1F41F}".repeat(NAME_MAX + 1);
    expect(Array.from(cleanFishName(fish)!)).toHaveLength(NAME_MAX);
  });
});

describe("fishLabel", () => {
  it("prefers the name, then the species, then Fish", () => {
    expect(fishLabel({ name: "Wanda", species: "Guppy" })).toBe("Wanda");
    expect(fishLabel({ species: "Guppy" })).toBe("Guppy");
    expect(fishLabel({ species: "" })).toBe("Fish");
  });

  it("ignores fields that aren't strings", () => {
    expect(fishLabel({ name: 7, species: "Guppy" })).toBe("Guppy");
    expect(fishLabel({ name: null, species: {} })).toBe("Fish");
  });
});
