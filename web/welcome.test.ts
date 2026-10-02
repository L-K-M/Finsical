import { describe, expect, it } from "vitest";
import { listNames } from "./welcome.js";

describe("listNames", () => {
  it("formats failed starter items without Array.at", () => {
    const descriptor =
      Object.getOwnPropertyDescriptor(Array.prototype, "at")!;
    Object.defineProperty(Array.prototype, "at", { ...descriptor,
      value: undefined });
    try {
      expect(listNames(["fish", "sounds"])).toBe("fish and sounds");
      expect(listNames(["fish", "plants", "sounds"]))
        .toBe("fish, plants and sounds");
    } finally {
      Object.defineProperty(Array.prototype, "at", descriptor);
    }
  });
});
