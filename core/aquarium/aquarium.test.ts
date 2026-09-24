import { describe, expect, it } from "vitest";
import { makeRng } from "../rng.js";
import { DEFAULT_CARE } from "../data/species.js";
import type { SpeciesCare } from "../data/species.js";
import { Aquarium } from "./aquarium.js";
import type { Resident } from "./aquarium.js";
import { Cause, newLife } from "./life.js";
import { acidity, hardness, o2Saturation, tapWater } from "./water.js";

const DAY = 24 * 60;

/** Run live, an hour at a time: longer single steps are catch-up. */
function live(a: Aquarium, minutes: number, fish: Resident[]): void {
  for (let m = minutes; m > 0; m -= 60) a.advanceMinutes(Math.min(60, m), fish);
}

function resident(id: number, rand: () => number,
                  care: SpeciesCare = DEFAULT_CARE): Resident {
  const life = newLife(rand, care, care.adultAge);
  life.health = 80;
  life.vitality = life.vitalityBase = 50;
  life.stomach = 5;
  life.ate = 5;
  return { id, life, care, weight: 25 };
}

describe("water chemistry", () => {
  it("tap water is gH 4 and pH 7, saturated with oxygen", () => {
    const w = tapWater(100, 26);
    expect(w.gH).toBeCloseTo(4, 5);
    expect(w.pH).toBeCloseTo(7, 5);
    expect(w.o2 / 100).toBeCloseTo(7.99, 5);
    expect(w.chlorine / 100).toBeCloseTo(1.1, 5);
  });

  it("looks oxygen saturation up by temperature", () => {
    expect(o2Saturation(16)).toBeCloseTo(9.56);
    expect(o2Saturation(25)).toBeCloseTo(8.11);
    expect(o2Saturation(10)).toBeCloseTo(9.56);
    expect(o2Saturation(40)).toBeCloseTo(6.83);
  });

  it("softer water with more CO2 is more acidic", () => {
    expect(acidity(1, 30)).toBeLessThan(acidity(10, 30));
    expect(acidity(4, 50)).toBeLessThan(acidity(4, 4));
    expect(hardness(0, 0, 100)).toBe(0.1);
  });
});

describe("equipment", () => {
  it("the filter keeps the water aerated", () => {
    const a = new Aquarium(makeRng(1));
    a.water.o2 = 0;
    a.advanceMinutes(10, []);
    expect(a.oxygenDeficit()).toBe(0);
  });

  it("a clean filter breaks down no ammonia; a seasoned one does", () => {
    const clean = new Aquarium(makeRng(1));
    clean.water.ammonia = 100;
    clean.advanceMinutes(DAY, []);
    expect(clean.water.ammonia).toBeCloseTo(100);

    const seasoned = new Aquarium(makeRng(1));
    seasoned.filter.dirt = 40;
    seasoned.water.ammonia = 100;
    seasoned.advanceMinutes(DAY, []);
    // 40% dirt: 50 × 0.03 per day = 1.5 mg, as nitrate twice over.
    expect(seasoned.water.ammonia).toBeCloseTo(98.5, 1);
    expect(seasoned.water.nitrate).toBeCloseTo(3, 1);
    // Cleaning takes out 5 points at a time.
    seasoned.cleanFilter();
    expect(seasoned.filter.dirt).toBeLessThan(40);
  });

  it("the heater brings the water to its target at watts ÷ litres °C/h", () => {
    const a = new Aquarium(makeRng(1));
    a.water.temp = 20;
    a.setHeaterTarget(26);
    a.advanceMinutes(60, []);
    expect(a.water.temp).toBeCloseTo(20.5, 5);
    a.advanceMinutes(24 * 60, []);
    expect(a.water.temp).toBe(26);
  });

  it("chlorine gasses off in four lit days", () => {
    const a = new Aquarium(makeRng(1), tapWater(100, 26.5));
    a.advanceMinutes(2 * DAY, []);
    expect(a.water.chlorine / 100).toBeCloseTo(0.55, 2);
    a.advanceMinutes(2 * DAY, []);
    expect(a.water.chlorine).toBeCloseTo(0, 5);
  });
});

describe("fish", () => {
  it("empties its stomach in 18 hours, then slowly starves", () => {
    const a = new Aquarium(makeRng(2));
    const r = resident(1, makeRng(3));
    live(a, 18 * 60 + 61, [r]);
    expect(r.life.ate).toBe(0);
    const before = r.life.health;
    live(a, 3 * DAY, [r]);
    expect(r.life.health).toBeLessThan(before);
    a.advanceMinutes(60 * DAY, [r]);
    expect(r.life.dead?.cause).toBe(Cause.starvation);
    expect(a.events.some((e) => e.kind === "died" && e.fish === 1)).toBe(true);
  });

  it("heals in ideal water and suffers outside it", () => {
    const a = new Aquarium(makeRng(4));
    const r = resident(1, makeRng(5));
    // A point in ~13 hours at this vitality, before its stomach
    // empties at 18.
    live(a, 17 * 60, [r]);
    expect(r.life.health).toBeGreaterThan(80);

    const b = new Aquarium(makeRng(4));
    const s = resident(1, makeRng(5));
    b.setHeaterTarget(34); // past the stand-in species' 32 °C limit
    b.water.temp = 34;
    live(b, DAY, [s]);
    expect(s.life.health).toBeLessThan(80);
  });

  it("a sudden temperature drop shocks the fish", () => {
    const a = new Aquarium(makeRng(6));
    const fish = Array.from({ length: 20 }, (_, i) => resident(i, makeRng(i)));
    a.water.temp = 34;
    a.changeWater(0.9, 16, fish);
    // Either White Spot (40%) or a health hit, for every fish.
    for (const r of fish)
      expect(r.life.sick !== null || r.life.health < 80).toBe(true);
  });

  it("weakened fish fall sick, and a matching medicine cures them", () => {
    const rand = makeRng(7);
    const a = new Aquarium(rand);
    const r = resident(1, rand);
    r.life.health = 20;
    r.life.sick = { disease: 0, amount: 5 }; // White Spot
    a.addMedicine(1100, 300);                // Green Remedy
    live(a, 8 * 60, [r]);
    expect(r.life.sick).toBeNull();
    expect(a.events).toContainEqual({ kind: "recovered", fish: 1, disease: 0 });
  });

  it("a medicine that doesn't match leaves the disease alone", () => {
    const rand = makeRng(7);
    const a = new Aquarium(rand);
    const r = resident(1, rand);
    r.life.sick = { disease: 3, amount: 5 }; // Chilodonella
    a.addMedicine(1200, 300);                // Methylene Blue: not this one
    live(a, 4 * 60, [r]);
    expect(r.life.sick?.amount).toBe(5);
  });

  it("sickness spreads to the weakest healthy fish", () => {
    const rand = makeRng(8);
    const a = new Aquarium(rand);
    const sick = resident(1, rand), weak = resident(2, rand),
          strong = resident(3, rand);
    sick.life.sick = { disease: 0, amount: 18 };
    weak.life.health = 40;
    strong.life.health = 95;
    for (const r of [sick, weak, strong]) r.life.ate = 5;
    a.advanceMinutes(10 * DAY, [sick, weak, strong]);
    expect(weak.life.sick?.disease).toBe(0);
  });

  it("a dead fish decays into ammonia", () => {
    const a = new Aquarium(makeRng(9));
    const r = resident(1, makeRng(9));
    r.life.dead = { cause: Cause.oldAge, at: 0 };
    a.advanceMinutes(DAY, [r]);
    expect(a.water.ammonia).toBeGreaterThan(0);
  });
});

describe("water change", () => {
  it("dilutes what builds up and brings in chlorine", () => {
    const a = new Aquarium(makeRng(10));
    a.water.nitrate = 2000;
    a.food = 10;
    a.addMedicine(900, 100);
    a.changeWater(0.5, 26, []);
    expect(a.water.nitrate).toBeCloseTo(1000);
    expect(a.water.chlorine / 100).toBeCloseTo(0.55);
    expect(a.food).toBe(5);
    expect(a.doses[0]?.ml).toBe(50);
  });

  it("a chlorine remover neutralises it", () => {
    const a = new Aquarium(makeRng(11), tapWater(100, 26.5));
    a.addMedicine(1000, 5);
    a.advanceMinutes(60, []);
    expect(a.water.chlorine).toBe(0);
  });
});

describe("time", () => {
  it("runs at `speed` simulated seconds per real second", () => {
    const a = new Aquarium(makeRng(12));
    a.advance(600, []);
    expect(a.minutes).toBe(10);
    a.setSpeed(10);
    a.advance(60, []);
    expect(a.minutes).toBe(20);
    a.setSpeed(0);
    a.advance(600, []);
    expect(a.minutes).toBe(20);
  });

  it("catches a long absence up in six-hour steps", () => {
    const a = new Aquarium(makeRng(13));
    const r = resident(1, makeRng(13));
    a.advanceMinutes(30 * DAY, [r]);
    expect(a.minutes).toBe(30 * DAY);
    // It aged the whole time, however far it got before starving.
    expect(r.life.age - DEFAULT_CARE.adultAge)
      .toBe(r.life.dead ? r.life.dead.at : 30 * DAY);
  });

  it("survives a save and restore", () => {
    const a = new Aquarium(makeRng(14));
    a.water.nitrate = 123;
    a.filter.dirt = 17;
    a.addMedicine(1100, 40);
    a.setSpeed(2.5);
    const b = Aquarium.fromJSON(JSON.parse(JSON.stringify(a)), makeRng(1));
    expect(b.water.nitrate).toBe(123);
    expect(b.filter.dirt).toBe(17);
    expect(b.doses).toEqual([{ medicine: 1100, ml: 40, clock: 0 }]);
    expect(b.speed).toBe(2.5);
  });

  it("rejects garbage in a save", () => {
    const b = Aquarium.fromJSON({ water: { temp: "hot", litres: -4 },
                                  speed: 1e9, doses: [{ medicine: 1 }] },
                                makeRng(1));
    expect(b.water.litres).toBe(100);
    expect(b.water.temp).toBe(26.5);
    expect(b.speed).toBe(100);
    expect(b.doses).toEqual([]);
  });
});
