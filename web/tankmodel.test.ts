import { describe, expect, it } from "vitest";
import { entryStem, partName } from "./tankmodel.js";

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
