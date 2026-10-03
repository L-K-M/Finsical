import { describe, expect, it } from "vitest";
import { acceptsTankIntent } from "./bus.js";

const MUTATIONS = ["renameFish", "removeFish", "removeAddon",
                   "useAddon", "emptyTank"];

describe("acceptsTankIntent", () => {
  it("rejects missing and stale mutation tokens", () => {
    for (const op of MUTATIONS) {
      expect(acceptsTankIntent({ op }, "new")).toBe(false);
      expect(acceptsTankIntent({ op, boot: "old" }, "new")).toBe(false);
    }
  });

  it("accepts current mutations and non-mutating bus traffic", () => {
    for (const op of MUTATIONS)
      expect(acceptsTankIntent({ op, boot: "current" }, "current"))
        .toBe(true);
    expect(acceptsTankIntent({ op: "hello" }, "current")).toBe(true);
    expect(acceptsTankIntent({ op: "focusFish", id: 1 }, "current"))
      .toBe(true);
  });
});
