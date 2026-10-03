import { describe, expect, it } from "vitest";
import { Cause, newLife, rescaleStomach, sanitizeLife, stepAge,
         shock, stomachSize, susceptibleTo } from "./life.js";
import { makeRng } from "../rng.js";
import { DEFAULT_CARE } from "../data/species.js";
import type { SpeciesCare } from "../data/species.js";

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
  it("is 0.2 × weight, truncated, and never dips as a fish grows", () => {
    expect(stomachSize(25)).toBe(5);
    expect(stomachSize(40)).toBe(8);
    expect(stomachSize(4)).toBe(2);     // 0.8 truncates to 0, floored
    expect(stomachSize(5)).toBe(2);     // and the floor is a real floor
    for (let w = 1; w < 40; w++)
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

  it("nothing survives outside its stomach, however it got there", () => {
    const life = newLife(makeRng(4), DEFAULT_CARE, 0);
    life.stomach = 5; life.ate = 9;      // a corrupt save or a rounding slip
    rescaleStomach(life, 25);             // same stomach size
    expect(life.ate).toBeLessThanOrEqual(life.stomach);
    life.ate = -3;                        // the mirror case
    rescaleStomach(life, 25);
    expect(life.ate).toBe(0);
  });

  it("ageing a fish into a bigger sprite keeps its meal", () => {
    const rand = makeRng(6);
    const life = newLife(rand, DEFAULT_CARE, 0);
    const ctx = { rand, care: DEFAULT_CARE, weight: 10,          // stomach 2
                  events: { died: () => {}, sick: () => {}, recovered: () => {} } };
    life.stomach = 2; life.ate = 1;
    stepAge(life, 11, false, { ...ctx, weight: 50 });             // stomach 10
    expect(life.stomach).toBe(10);
    // The share it held survived the resize rather than reading empty.
    expect(life.ate / life.stomach).toBeCloseTo(0.5, 1);
  });
});

describe("shock", () => {
  /** A temperature jump past the species' rate of change, which is
   * what hands out White Spot 40% of the time. */
  const shockTemp = (care: SpeciesCare, seed: number) => {
    const rand = makeRng(seed);
    const life = newLife(rand, care, care.adultAge);
    const ctx = { rand, care, weight: 25,
                  events: { died: () => {}, sick: () => {}, recovered: () => {} } };
    return { life, step: shock(life, "temp", care.tolerance.temp.rateOfChange + 1, ctx) };
  };

  it("gives a susceptible species White Spot", () => {
    const { life, step } = shockTemp(DEFAULT_CARE, 3);
    expect(step).toBe("applied");
    expect(life.sick?.disease).toBe(0);
  });

  it("never gives White Spot to a species that does not catch it", () => {
    const meka: SpeciesCare = { ...DEFAULT_CARE, susceptible: [405, 406, 407] };
    for (let seed = 1; seed <= 40; seed++) {
      const { life } = shockTemp(meka, seed);
      expect(life.sick).toBeNull();
    }
    expect(susceptibleTo(meka, 0)).toBe(false);
    expect(susceptibleTo(meka, 5)).toBe(true);
    // A species with no list of its own falls back to the stock five.
    const plain: SpeciesCare = { ...DEFAULT_CARE, susceptible: [] };
    expect(susceptibleTo(plain, 0)).toBe(true);
    expect(susceptibleTo(plain, 7)).toBe(false);
  });

  it("a species immune to White Spot takes the shock as health loss", () => {
    // Deliberate trade-off, and now pinned: an immune species cannot be
    // sickened by the shock, so the same 40% roll falls through to the
    // damage branch every time. Immunity is not armour.
    const meka: SpeciesCare = { ...DEFAULT_CARE, susceptible: [405, 406, 407] };
    const { life, step } = shockTemp(meka, 3);
    expect(step).toBe("applied");       // the shock lands either way
    expect(life.sick).toBeNull();       // as damage, not as sickness
    expect(life.health).toBeLessThan(100);
  });
});
