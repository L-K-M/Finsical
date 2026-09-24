import { describe, expect, it } from "vitest";
import { entryStem, migrateParts, partName } from "./tankmodel.js";

describe("entryStem", () => {
  it("drops the folder and the extension", () => {
    expect(entryStem("angels/blackangel.fsh")).toBe("blackangel");
    expect(entryStem("angel.fsh")).toBe("angel");
    expect(entryStem("Aquazone.REZ")).toBe("Aquazone");
  });

  it("keeps a name that is all extension", () => {
    expect(entryStem(".fsh")).toBe(".fsh");
  });
});

describe("partName", () => {
  it("keeps the listing name for a single-pack add-on", () => {
    expect(partName("banggai", "banggai.fsh", 1)).toBe("banggai");
  });

  it("names each part of a multi-pack add-on by its pack", () => {
    expect(partName("angels", "angel.fsh", 2)).toBe("angel");
    expect(partName("angels", "blackangel.fsh", 2)).toBe("blackangel");
  });
});

describe("migrateParts", () => {
  it("gives legacy fish the parts in id order", () => {
    const m = migrateParts([8, 7], ["angel.fsh", "blackangel.fsh"]);
    expect(m.get(7)).toBe("angel.fsh");
    expect(m.get(8)).toBe("blackangel.fsh");
  });

  it("cycles through the parts for Add Again copies", () => {
    const m = migrateParts([1, 2, 3], ["a", "b"]);
    expect([...m.entries()].sort()).toEqual([[1, "a"], [2, "b"], [3, "a"]]);
  });

  it("assigns nothing for an add-on with no parts loaded", () => {
    expect(migrateParts([1, 2], []).size).toBe(0);
  });
});
