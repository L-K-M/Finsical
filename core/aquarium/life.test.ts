import { describe, expect, it } from "vitest";
import { Cause, newLife, rescaleStomach, sanitizeLife, stomachSize } from "./life.js";
import { makeRng } from "../rng.js";
import { DEFAULT_CARE } from "../data/species.js";

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

describe("stomach size", () => {
  it("never dips below a pellet below the first step", () => {
    // 0.2 × weight, floored at 2. A weight-5 fish used to read 1 —
    // under PELLET_UNITS (3), so it could never finish a pellet.
    expect(stomachSize(4)).toBe(2);
    expect(stomachSize(5)).toBe(2);
    expect(stomachSize(9)).toBe(2);
    expect(stomachSize(10)).toBe(2);
    expect(stomachSize(25)).toBe(5);
    // Monotonic in weight across the small band.
    for (let w = 1; w < 12; w++)
      expect(stomachSize(w + 1)).toBeGreaterThanOrEqual(stomachSize(w));
  });

  it("keeps the eaten share across a rescale, up and down", () => {
    const life = newLife(makeRng(2), DEFAULT_CARE, 0);
    life.stomach = 4; life.ate = 3;      // three quarters full
    rescaleStomach(life, 60);             // a big fish
    expect(life.stomach).toBe(12);
    expect(life.ate / life.stomach).toBeCloseTo(0.75, 1);
    rescaleStomach(life, 20);             // and a small one
    expect(life.stomach).toBe(4);
    expect(life.ate / life.stomach).toBeCloseTo(0.75, 1);
  });

  it("an empty stomach stays empty, not NaN", () => {
    const life = newLife(makeRng(3), DEFAULT_CARE, 0);
    life.stomach = 0; life.ate = 0;
    rescaleStomach(life, 30);
    expect(life.stomach).toBe(6);
    expect(life.ate).toBe(0);
  });
});
