/**
 * The tank's life support, as the original AquaZone ran it: water
 * chemistry, heater, filter, plants, food and waste, medicines, and
 * each fish's physiology, advanced in simulated minutes.
 *
 * Time: `speed` simulated seconds pass per real second (the original's
 * 0..100 speed setting, 1 by default), so at speed 1 a stomach empties
 * in 18 real hours and a fish lives for years. Every routine keeps its
 * own accumulated minutes and only resets them once it applies a whole
 * step, exactly as the original's per-object timestamps did. Long gaps
 * (a closed app, a hidden tab) are replayed like the original's
 * start-up catch-up: six simulated hours at a time, with the minimum
 * intervals waived, fish not chasing food, and medicines not acting on
 * fish.
 *
 * The engine knows nothing about sprites or the swim simulation: the
 * host passes the living (and dead) fish in as Residents.
 */
import type { SpeciesCare } from "../data/species.js";
import { dissolveRate, medicineById } from "./disease.js";
import {
  Cause, eat, lowerHealth, shock, startSickness, stepAge,
  stepHunger, stepSickness, stepWaterHealth, cure, randInt,
} from "./life.js";
import type { FishLife, LifeCtx, Step } from "./life.js";
import {
  addElement, ELEMENTS, mixIn, o2Saturation, sanitizeWater, setElement,
  setTemp, tapWater,
} from "./water.js";
import type { Element, Water } from "./water.js";

/** A fish as the engine sees it. */
export interface Resident {
  id: number;
  life: FishLife;
  care: SpeciesCare;
  /** Weight (≈ sprite size in px) — breathing and stomach scale by it. */
  weight: number;
}

export type AquariumEvent =
  | { kind: "died"; fish: number; cause: number }
  | { kind: "sick"; fish: number; disease: number }
  | { kind: "recovered"; fish: number; disease: number };

export interface Heater { watts: number; min: number; max: number; target: number }
export interface Filter { power: number; dirt: number }
export interface Dose { medicine: number; ml: number; clock: number }

/** A default tank: the original's sample 100-litre aquarium. */
export const TANK_LITRES = 100;
export const DEFAULT_HEATER: Heater = { watts: 50, min: 16, max: 36, target: 26.5 };
export const FILTER_POWER = 50;
/** Nutrients per food unit, mg (the original's standard flakes). */
const FLAKE: Partial<Record<Element, number>> = {
  protein: 0.15, calcium: 0.03, magnesium: 0.02, carbohydrate: 0.1,
  fat: 0.1, vitamin: 0.12,
};
/** Ammonia per unit of eaten food, released over time as waste. */
const WASTE_NH3 = 0.05;
/** Most minutes a dose banks toward a release (an hour: 72 ml of a
 * medicine). */
const MAX_DOSE_CLOCK = 60;
/** Catch-up chunk, simulated minutes (the original's 21600 s ÷ speed). */
const CATCH_UP_CHUNK = 360;
/** Live running visits every routine once per simulated minute; a gap
 * longer than this is replayed in catch-up chunks instead. */
const LIVE_LIMIT = 60;
export const MAX_SPEED = 100;

const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, v));

export class Aquarium {
  water: Water;
  heater: Heater = { ...DEFAULT_HEATER };
  filter: Filter = { power: FILTER_POWER, dirt: 0 };
  /** Uneaten food dissolving in the water, in units. */
  food = 0;
  /** Eaten food not yet broken down to ammonia, in units. */
  waste = 0;
  doses: Dose[] = [];
  /** Simulated seconds per real second, 0 (paused) … 100. */
  speed = 1;
  /** Total simulated minutes this tank has run. */
  minutes = 0;
  /** Total plant size (Σ width × height px / 1000) — plants add oxygen
   * and take up CO2 and nitrate in light, and breathe in the dark. */
  plantSize = 0;
  /** Whether the tank light is on; set by the host each advance. */
  lightOn = true;
  /** Undrained events for the host (fish died, fell sick, recovered). */
  readonly events: AquariumEvent[] = [];

  private rand: () => number;
  private carry = 0;
  private clocks = { filter: 0, food: 0, waste: 0 };

  constructor(rand: () => number, water?: Water) {
    this.rand = rand;
    // A new tank starts with aged tap water: chlorine already gassed off.
    this.water = water ?? tapWater(TANK_LITRES, DEFAULT_HEATER.target, true);
  }

  /** Advance by real seconds at the current speed. */
  advance(realSeconds: number, fish: readonly Resident[]): void {
    if (!Number.isFinite(realSeconds) || realSeconds <= 0 || this.speed <= 0)
      return;
    this.carry += realSeconds * this.speed / 60;
    this.runPending(fish);
  }

  /** Advance by simulated minutes (tests, and the host's catch-up). */
  advanceMinutes(minutes: number, fish: readonly Resident[]): void {
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    this.carry += minutes;
    this.runPending(fish);
  }

  private runPending(fish: readonly Resident[]): void {
    while (this.carry > LIVE_LIMIT) {
      const m = Math.min(CATCH_UP_CHUNK, Math.floor(this.carry));
      this.carry -= m;
      this.visit(m, fish, true);
    }
    while (this.carry >= 1) {
      this.carry -= 1;
      this.visit(1, fish, false);
    }
  }

  /** One pass over every routine, `m` more minutes accumulated. */
  private visit(m: number, fish: readonly Resident[], catchUp: boolean): void {
    this.minutes += m;
    const w = this.water;
    // Chlorine gasses off: 1.1 mg/L over 4 days lit, 7 dark.
    setElement(w, "chlorine", w.chlorine -
      m * 1.1 * w.litres / (this.lightOn ? 5760 : 10080));
    this.stepHeater(m);
    this.clocks.filter += m;
    if (this.stepFilter(this.clocks.filter, catchUp) === "applied")
      this.clocks.filter = 0;
    this.stepPlants(m);
    for (const r of fish) this.stepFish(r, m, fish, catchUp);
    this.clocks.food += m;
    if (this.stepFood(this.clocks.food) === "applied") this.clocks.food = 0;
    this.clocks.waste += m;
    if (this.stepWaste(this.clocks.waste) === "applied") this.clocks.waste = 0;
    for (const d of [...this.doses]) {
      d.clock += m;
      if (this.stepDose(d, fish, catchUp) === "applied") d.clock = 0;
    }
  }

  /** Sim_Temp: a thermostat that heats or cools toward the target at
   * watts ÷ litres degrees per hour. */
  private stepHeater(m: number): void {
    const w = this.water, h = this.heater;
    if (w.temp === h.target) return;
    const d = m / 60 * h.watts / w.litres;
    const t = w.temp < h.target
      ? Math.min(h.target, w.temp + d) : Math.max(h.target, w.temp - d);
    setTemp(w, t);
  }

  /** Sim_Filter: the filter aerates the water, traps dissolved food
   * (clogging as it does) and, once it has some dirt in it, its
   * bacteria turn ammonia into nitrate. A spotless filter does not
   * break down ammonia at all. */
  private stepFilter(m: number, catchUp: boolean): Step {
    if (m < 10 && !catchUp) return "wait";
    const w = this.water, f = this.filter, dirt = f.dirt;
    const eff = dirt < 10 ? dirt * 0.0005
      : dirt < 50 ? dirt * 0.00075 : (100 - dirt) * 0.0005;
    const nh3 = Math.min(m * f.power / 1440 * eff, w.ammonia);
    const k = m / 1440 * f.power * 8e-5 * (100 - dirt);
    let trapped = 0;
    for (const e of ["protein", "carbohydrate", "fat", "vitamin"] as const)
      trapped -= addElement(w, e, -w[e] * k);
    f.dirt = clamp(dirt + 0.1 * nh3 + 0.15 * trapped, 0, 100);
    setElement(w, "ammonia", w.ammonia - nh3);
    addElement(w, "nitrate", 2 * nh3);
    // Aeration: 2 mg of oxygen per minute per unit of power.
    addElement(w, "o2", m * f.power * 2);
    return "applied";
  }

  /** Sim_Plant: photosynthesis in light, respiration in the dark. */
  private stepPlants(m: number): void {
    if (this.plantSize <= 0) return;
    const w = this.water, s = m * this.plantSize / 1440, lit = this.lightOn;
    addElement(w, "o2", (lit ? 1 : -1) * s * 0.1);
    if (lit) addElement(w, "nitrate", -s * 0.025);
    addElement(w, "co2", (lit ? -1 : 1) * s * 0.01);
  }

  /** Sim_Food: uneaten food dissolves, a unit per 10 minutes. */
  private stepFood(m: number): Step {
    // Nothing to dissolve: don't bank the time, or the next spoiled
    // pellet would dissolve all at once.
    if (this.food < 1) return "applied";
    const n = Math.min(Math.trunc(m / 10), Math.floor(this.food));
    if (n < 1) return "wait";
    for (const [e, v] of Object.entries(FLAKE) as [Element, number][])
      addElement(this.water, e, n * v);
    this.food -= n;
    return "applied";
  }

  /** Sim_Shit: eaten food comes back as ammonia, a unit per 6 minutes.
   * (The original measured this from when the waste first appeared,
   * which made the release speed up with age; this is its intended
   * linear rate.) */
  private stepWaste(m: number): Step {
    const n = Math.min(Math.trunc(m / 6), Math.floor(this.waste));
    if (n < 1) return this.waste < 1 ? "applied" : "wait";
    addElement(this.water, "ammonia", n * WASTE_NH3);
    this.waste -= n;
    return "applied";
  }

  private stepFish(r: Resident, m: number, all: readonly Resident[],
                   catchUp: boolean): void {
    const l = r.life, ctx = this.ctx(r);
    // Breathing (and, for a body left in the tank, decay) never stops.
    this.breathe(r, m, ctx);
    if (l.dead) return;
    const c = l.clock;
    const run = (k: "hunger" | "age" | "health" | "sick",
                 s: (e: number) => Step): void => {
      if (l.dead) return;
      c[k] += m;
      if (s(c[k]) !== "wait") c[k] = 0;
    };
    run("hunger", (e) => stepHunger(l, e, catchUp, ctx));
    run("age", (e) => stepAge(l, e, catchUp, ctx));
    run("health", (e) => stepWaterHealth(l, e, this.water, catchUp, ctx));
    run("sick", (e) => stepSickness(l, m, e, catchUp, ctx,
                                    (idx) => this.spread(idx, all)));
  }

  /** Sim_Fish_In_Out: oxygen in, CO2 out, faster in warm water; a dead
   * fish releases ammonia instead. Without oxygen a fish suffocates in
   * under an hour. */
  private breathe(r: Resident, m: number, ctx: LifeCtx): void {
    const w = this.water, W = r.weight;
    if (r.life.dead) {
      addElement(w, "ammonia", m * W * 0.096 * 0.05 / 1440);
      return;
    }
    if (w.o2 > 0)
      addElement(w, "o2",
        -m * ((w.temp * 0.0076 + 0.00496) / 60) * W * 0.096 / w.litres);
    // 60 a minute: the original hit once per (minute-long) visit, which
    // a six-hour catch-up step must not turn into one hit.
    else lowerHealth(r.life, 60 * m, Cause.oxygen, ctx);
    addElement(w, "co2", m * ((w.temp * 0.0076 + 0.0496) / 60) * W * 0.096 / 20);
  }

  /** Spread_Disease: the weakest living healthy fish catches it. */
  private spread(idx: number, all: readonly Resident[]): void {
    let target: Resident | null = null;
    for (const r of all) {
      if (r.life.dead || r.life.sick) continue;
      if (!target || r.life.health < target.life.health) target = r;
    }
    if (target) startSickness(target.life, idx, this.ctx(target));
  }

  /** Sim_Drug: a dose dissolves at 1.2 ml a minute (medicines) or
   * 0.2 ml (water treatments). A medicine acts once a release is strong
   * enough for the tank (strength × ml ÷ litres ≥ 1): it cures matching
   * diseases 89% of the time, and past 5 it poisons the fish. */
  private stepDose(d: Dose, fish: readonly Resident[], catchUp: boolean): Step {
    const med = medicineById(d.medicine);
    if (!med || d.ml <= 0) {
      this.doses.splice(this.doses.indexOf(d), 1);
      return "applied";
    }
    // A dose too weak for the tank waits to act; cap what it banks so a
    // top-up can't release the backlog at once as an overdose.
    d.clock = Math.min(d.clock, MAX_DOSE_CLOCK);
    const n = Math.min(Math.floor(d.clock * dissolveRate(med.kind)), d.ml);
    if (n < 1) return "wait";
    // Medicines don't act on fish during catch-up; the original kept
    // them undissolved until the next live visit, which then released
    // the whole dose at once as an overdose. Here the dose dissolves
    // into the water, without its effect on the fish.
    if (med.kind === 1 && !catchUp) {
      if (d.clock < 10) return "wait";
      const c = Math.min(med.strength, 10) * n / this.water.litres;
      if (c < 1) return "wait";
      for (const r of fish) this.dose(r, med.cures, c);
    }
    for (const e of ELEMENTS) {
      const v = med.perMl[e];
      if (v) addElement(this.water, e, n * v);
    }
    d.ml -= n;
    if (d.ml < 1) this.doses.splice(this.doses.indexOf(d), 1);
    return "applied";
  }

  /** Effect_Drug_To_Fish. */
  private dose(r: Resident, cures: number, strength: number): void {
    const l = r.life, ctx = this.ctx(r);
    if (l.dead) return;
    // As the original's Effect_Drug_To_Fish: past 5 the concentration
    // is rescaled to the poison dose and that value also drives the cure
    // and the harm to fish it doesn't cure.
    let c = strength;
    if (c > 5) {
      c = (c - 5) * 20;
      if (lowerHealth(l, c, Cause.drug, ctx) === "died") return;
    }
    if (l.sick && (cures >> l.sick.disease & 1)) {
      if (randInt(this.rand, 1, 100) < 90) {
        l.sick.amount -= Math.trunc(c);
        if (l.sick.amount <= 0) cure(l, ctx);
      }
    } else lowerHealth(l, c, Cause.drug, ctx);
  }

  private ctx(r: Resident): LifeCtx {
    return {
      care: r.care, rand: this.rand, weight: r.weight,
      events: {
        died: (cause) => {
          if (r.life.dead) r.life.dead.at = this.minutes;
          this.events.push({ kind: "died", fish: r.id, cause });
        },
        sick: (disease) => this.events.push({ kind: "sick", fish: r.id, disease }),
        recovered: (disease) =>
          this.events.push({ kind: "recovered", fish: r.id, disease }),
      },
    };
  }

  // ---- things the keeper does ------------------------------------------

  /** A fish eats `units` of food; returns what it leaves. What it eats
   * becomes waste. */
  feed(r: Resident, units: number): number {
    const left = eat(r.life, units);
    this.waste += units - left;
    return left;
  }

  /** Food nobody ate joins what is dissolving in the water. */
  spoil(units: number): void {
    if (units > 0) this.food += units;
  }

  /** Put `ml` of a medicine in the tank. */
  addMedicine(id: number, ml: number): boolean {
    if (!medicineById(id) || !(ml > 0)) return false;
    const d = this.doses.find((x) => x.medicine === id);
    if (d) { d.ml += ml; d.clock = 0; }
    else this.doses.push({ medicine: id, ml, clock: 0 });
    return true;
  }

  /** Replace `fraction` (1–90%) of the water with tap water at `temp`.
   * Fresh tap water carries chlorine; fish feel sudden jumps. Food,
   * waste and undissolved medicine go out with the old water. */
  changeWater(fraction: number, temp: number, fish: readonly Resident[]): void {
    const f = clamp(fraction, 0.01, 0.9);
    const w = this.water;
    const t = clamp(temp, this.heater.min, this.heater.max);
    const d = mixIn(w, tapWater(w.litres, t), f);
    setTemp(w, clamp(w.temp, this.heater.min, this.heater.max));
    const L = w.litres;
    for (const r of fish) {
      const ctx = this.ctx(r), l = r.life;
      const steps: [Parameters<typeof shock>[1], number][] = [
        ["temp", d.temp], ["chlorine", d.chlorine / L],
        ["ammonia", d.ammonia / L], ["nitrate", d.nitrate / L],
        ["CO2", d.co2 / L], ["pH", d.pH],
        ["mineral", (d.calcium + d.magnesium) / L], ["gH", d.gH],
      ];
      for (const [k, v] of steps) if (shock(l, k, v, ctx) === "died") break;
    }
    const keep = 1 - f;
    this.food = Math.round(this.food * keep);
    this.waste = Math.round(this.waste * keep);
    for (const dose of this.doses) dose.ml = Math.trunc(dose.ml * keep);
    this.doses = this.doses.filter((x) => x.ml >= 1);
  }

  /** Clean_Filter: each cleaning takes out 5 points of dirt. Scrub it
   * spotless and the ammonia-eating bacteria go with it. */
  cleanFilter(): void {
    this.filter.dirt = Math.max(0, this.filter.dirt - 5);
    this.clocks.filter = 0;
  }

  setHeaterTarget(t: number): void {
    if (Number.isFinite(t))
      this.heater.target = clamp(t, this.heater.min, this.heater.max);
  }

  setSpeed(s: number): void {
    if (Number.isFinite(s)) this.speed = clamp(Math.round(s * 10) / 10, 0, MAX_SPEED);
  }

  /** 0 = saturated with oxygen … 1 = none. */
  oxygenDeficit(): number {
    const sat = o2Saturation(this.water.temp) * this.water.litres;
    return sat > 0 ? clamp(1 - this.water.o2 / sat, 0, 1) : 0;
  }

  /** Dissolved organics (protein, carbohydrate, fat, vitamin), mg/L —
   * what clouds the water when food goes uneaten. */
  organics(): number {
    const w = this.water;
    return (w.protein + w.carbohydrate + w.fat + w.vitamin) / w.litres;
  }

  // ---- persistence ------------------------------------------------------

  toJSON(): SavedAquarium {
    return {
      water: { ...this.water }, target: this.heater.target,
      dirt: this.filter.dirt, food: this.food, waste: this.waste,
      doses: this.doses.map((d) => ({ ...d })), speed: this.speed,
      minutes: this.minutes, clocks: { ...this.clocks },
    };
  }

  /** Restore from a save; untrusted values fall back to defaults. */
  static fromJSON(raw: unknown, rand: () => number): Aquarium {
    const a = new Aquarium(rand);
    const o = (raw && typeof raw === "object" ? raw : {}) as
      Partial<Record<keyof SavedAquarium, unknown>>;
    const num = (v: unknown, lo: number, hi: number, d: number): number =>
      typeof v === "number" && Number.isFinite(v) ? clamp(v, lo, hi) : d;
    a.water = sanitizeWater(o.water, a.water);
    a.setHeaterTarget(num(o.target, 0, 100, DEFAULT_HEATER.target));
    a.filter.dirt = num(o.dirt, 0, 100, 0);
    a.food = num(o.food, 0, 1e6, 0);
    a.waste = num(o.waste, 0, 1e6, 0);
    a.setSpeed(num(o.speed, 0, MAX_SPEED, 1));
    a.minutes = num(o.minutes, 0, Number.MAX_SAFE_INTEGER, 0);
    const c = (o.clocks ?? {}) as Partial<Record<string, unknown>>;
    for (const k of ["filter", "food", "waste"] as const)
      a.clocks[k] = num(c[k], 0, 1e6, 0);
    if (Array.isArray(o.doses))
      for (const d of o.doses as unknown[]) {
        const x = (d ?? {}) as Partial<Dose>;
        if (typeof x.medicine === "number" && medicineById(x.medicine) &&
            a.addMedicine(x.medicine, num(x.ml, 0, 1e5, 0))) {
          const dose = a.doses.find((y) => y.medicine === x.medicine)!;
          dose.clock = num(x.clock, 0, MAX_DOSE_CLOCK, 0);
        }
      }
    return a;
  }
}

export interface SavedAquarium {
  water: Water;
  target: number;
  dirt: number;
  food: number;
  waste: number;
  doses: Dose[];
  speed: number;
  minutes: number;
  clocks: { filter: number; food: number; waste: number };
}
