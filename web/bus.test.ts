import { describe, expect, it } from "vitest";
import { acceptsTankIntent, TANK_MUTATION_OPS } from "./bus.js";

// Derived from the list it tests so a new mutation op can't leave the
// coverage quietly behind.
const MUTATIONS = [...TANK_MUTATION_OPS];

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
    // A stale window stays read-only, not dead: non-mutations still
    // pass — a boot-less hello is how a fresh client learns the boot.
    expect(acceptsTankIntent({ op: "hello", boot: "old" }, "new"))
      .toBe(true);
    expect(acceptsTankIntent({ op: "focusFish", id: 1, boot: "old" },
                             "new")).toBe(true);
  });
});
