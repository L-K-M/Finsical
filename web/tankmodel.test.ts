import { describe, expect, it } from "vitest";
import { capRefusal, entryStem, partName } from "./tankmodel.js";

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

  it("names each entry of a multi-pack add-on by its pack", () => {
    expect(partName("angels", "angel.fsh", 2)).toBe("angel");
    expect(partName("angels", "blackangel.fsh", 2)).toBe("blackangel");
  });
});

describe("capRefusal", () => {
  it("takes an install that fits", () => {
    expect(capRefusal(10, 1, 12)).toBeNull();
    expect(capRefusal(10, 2, 12)).toBeNull();
  });

  it("takes anything that adds no fish, even over the cap", () => {
    expect(capRefusal(12, 0, 12)).toBeNull();
    expect(capRefusal(14, 0, 12)).toBeNull();
  });

  it("refuses a full tank", () => {
    expect(capRefusal(12, 1, 12)).toMatch(/^The tank is full: 12 fish/);
    // A healed pre-cap roster can sit above the cap.
    expect(capRefusal(14, 1, 12)).toMatch(/^The tank is full/);
  });

  it("refuses a multi-pack add-on whole when only some would fit", () => {
    expect(capRefusal(11, 2, 12)).toBe(
      "This add-on brings 2 fish, and the tank has room for 1 more. " +
      "Release some from Tank Overview first.");
  });
});
