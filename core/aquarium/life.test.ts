import { describe, expect, it } from "vitest";
import { Cause, sanitizeLife } from "./life.js";

describe("sanitizeLife", () => {
  it("keeps a valid record and clamps the rest", () => {
    const l = sanitizeLife({ health: 140, age: 5, ate: 9, stomach: 4,
                             sick: { disease: 2, amount: 300 },
                             dead: null, clock: { hunger: -3 } });
    expect(l).toMatchObject({ health: 100, age: 5, ate: 4, stomach: 4,
                              sick: { disease: 2, amount: 100 }, dead: null,
                              clock: { hunger: 0 } });
  });

  it("drops what isn't a life", () => {
    expect(sanitizeLife(null)).toBeUndefined();
    expect(sanitizeLife({ health: "ok", age: 1 })).toBeUndefined();
    expect(sanitizeLife({ health: 50, age: 1, sick: { disease: 99 } })!.sick)
      .toBeNull();
  });

  it("keeps a corrupt dead record dead instead of reviving it", () => {
    const dead = (cause: unknown) =>
      sanitizeLife({ health: 0, age: 1, dead: { cause } });
    expect(dead(99)!.dead).toMatchObject({ cause: Cause.oldAge });
    expect(dead(undefined)!.dead).toMatchObject({ cause: Cause.oldAge });
    expect(dead(12)!.dead).toEqual({ cause: 12, at: 0 });
    expect(sanitizeLife({ health: 50, age: 1 })!.dead).toBeNull();
    expect(sanitizeLife({ health: 50, age: 1, dead: null })!.dead).toBeNull();
  });
});
