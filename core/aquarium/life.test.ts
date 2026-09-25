import { describe, expect, it } from "vitest";
import { sanitizeLife } from "./life.js";

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
});
