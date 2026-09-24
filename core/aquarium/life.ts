/**
 * A fish's physiology, reimplemented from the original engine: health,
 * hunger, age, water tolerance, sickness and death.
 *
 * Every routine takes `minutes`: the simulated minutes that have
 * accumulated for that aspect of the fish. Like the original, a routine
 * that finds nothing whole to apply yet returns "wait" and the caller
 * keeps accumulating; that is what lets the original's integer health
 * steps add up over hours (see Aquarium).
 */
import { DISEASES, diseaseIndex } from "./disease.js";
import { DEFAULT_CARE, WATER_TOLERANCES } from "../data/species.js";
import type { SpeciesCare, ToleranceKey } from "../data/species.js";
import type { Water } from "./water.js";

/** Causes of death, in the original's STR# 7100 order (1-based). */
export const CAUSES = [
  "", "Water temperature", "Bad pH level", "Bad gH level", "Bad CO2 level",
  "Nitrate poisoning", "Ammonia poisoning", "Chlorine poisoning",
  "Mineral poisoning", "Lack of oxygen", "Old age", "Drug poisoning",
  "Starvation", "Disease",
] as const;
export const Cause = {
  oxygen: 9, oldAge: 10, drug: 11, starvation: 12, disease: 13,
} as const;

export interface FishLife {
  /** 0 (dead) .. 100. */
  health: number;
  /** Scales every health change: loss × (1.2 − v/99), gain × (1 + v/99).
   * Rises with age to its prime, then falls. */
  vitality: number;
  /** Inherited vitality the age curve builds on (0..99). */
  vitalityBase: number;
  /** A second inherited trait that sickness wears down (1..99). */
  resilience: number;
  /** Age in simulated minutes. */
  age: number;
  /** Food units in the stomach, and its size. */
  ate: number;
  stomach: number;
  sick: { disease: number; amount: number } | null;
  dead: { cause: number; at: number } | null;
  /** Simulated minutes each routine has accumulated toward its next
   * whole step. */
  clock: { hunger: number; age: number; health: number; sick: number };
}

/** What happened: applied (reset the clock), wait (keep accumulating),
 * or the fish died. */
export type Step = "applied" | "wait" | "died";

export interface LifeEvents {
  died(cause: number): void;
  sick(disease: number): void;
  recovered(disease: number): void;
}

export interface LifeCtx {
  care: SpeciesCare;
  rand: () => number;
  events: LifeEvents;
  /** The original's weight: about the geometric mean of the sprite's
   * width and height in pixels. It sizes the stomach and breathing. */
  weight: number;
}

const trunc = Math.trunc;
/** An integer in [lo, hi], like the original's Get_Random_Num. */
export function randInt(rand: () => number, lo: number, hi: number): number {
  return lo + Math.floor(rand() * (hi - lo + 1));
}

export function newLife(rand: () => number, care: SpeciesCare,
                        age: number): FishLife {
  const vitalityBase = randInt(rand, 0, 99);
  return {
    health: randInt(rand, 60, 100),
    vitalityBase,
    vitality: vitalityAt(vitalityBase, age, care),
    resilience: randInt(rand, 1, 99),
    age: Math.max(0, age),
    ate: 0, stomach: 2,
    sick: null, dead: null,
    clock: { hunger: 0, age: 0, health: 0, sick: 0 },
  };
}

/** Vitality over a lifetime (Set_Fish_Character): the inherited base
 * plus up to 30 by the prime of life (0.8 × span), then minus 40 by
 * the end of it. */
export function vitalityAt(base: number, age: number, care: SpeciesCare): number {
  const prime = trunc(care.lifeSpan * 0.8);
  if (age <= prime)
    return Math.min(99, base + trunc(age / prime * 30));
  return Math.max(1, base + 30 -
    trunc((age - prime) / (care.lifeSpan - prime) * 40));
}

/** Lower_Fish_Health: `amount` is the original's damage scale (20 per
 * health point at vitality 20). Below the species' sickness threshold
 * each hit has a 1 in 5 chance of starting a disease. */
export function lowerHealth(l: FishLife, amount: number, cause: number,
                            ctx: LifeCtx): Step {
  if (amount <= 0 || l.dead) return "wait";
  const next = l.health - trunc(amount / 20 * (1.2 - l.vitality / 99));
  if (next <= 0) {
    kill(l, cause, ctx);
    return "died";
  }
  if (next === l.health) return "wait";
  l.health = Math.min(100, next);
  if (l.health < ctx.care.unhealthy && !l.sick &&
      randInt(ctx.rand, 1, 5) === 1)
    startSickness(l, pickDisease(ctx), ctx);
  return "applied";
}

/** Raise_Fish_Health: half as effective while sick. */
export function raiseHealth(l: FishLife, amount: number): Step {
  if (amount <= 0 || l.dead) return "wait";
  let a = amount / 20;
  if (l.sick) a *= 0.5;
  a *= 1 + l.vitality / 99;
  if (l.health >= 100) return "applied";
  if (a < 1) return "wait";
  const n = Math.min(100, l.health + trunc(a));
  if (n === l.health) return "wait";
  l.health = n;
  return "applied";
}

export function kill(l: FishLife, cause: number, ctx: LifeCtx, at = 0): void {
  if (l.dead) return;
  l.health = 0;
  l.dead = { cause, at };
  ctx.events.died(cause);
}

/** Pick_Random_Sickness: one of the species' diseases, as a table
 * index (−1 when the species lists none the table knows). */
export function pickDisease(ctx: LifeCtx): number {
  const ids = ctx.care.susceptible.length
    ? ctx.care.susceptible : DEFAULT_CARE.susceptible;
  return diseaseIndex(ids[randInt(ctx.rand, 0, ids.length - 1)]!);
}

/** Start_New_Fish_Sick: the disease knocks the fish's vitality and
 * resilience down by its severity %, and starts at that much sickness. */
export function startSickness(l: FishLife, idx: number, ctx: LifeCtx): void {
  const d = DISEASES[idx];
  if (!d || l.sick || l.dead) return;
  l.vitality -= trunc(l.vitality * d.severity / 100);
  l.resilience = Math.max(1, l.resilience -
    trunc(l.resilience * d.severity / 100));
  l.sick = { disease: idx, amount: d.severity };
  ctx.events.sick(idx);
}

/** Cure_Sick_Fish: part of the lost resilience comes back. */
export function cure(l: FishLife, ctx: LifeCtx): void {
  if (!l.sick) return;
  const d = DISEASES[l.sick.disease]!;
  l.resilience = Math.min(99, l.resilience +
    trunc(l.resilience * d.severity / 100));
  const idx = l.sick.disease;
  l.sick = null;
  ctx.events.recovered(idx);
}

/** Stomach size, 0.2 × weight (Calc_Stomach_Size). */
export function stomachSize(weight: number): number {
  const s = trunc(weight * 0.2);
  return s < 1 ? 2 : s;
}

/** 0 full … 1 empty. */
export function hungerOf(l: FishLife): number {
  return l.stomach > 0 ? 1 - l.ate / l.stomach : 1;
}

/** Eat_Until_Full: returns the food units left over. A full meal gives
 * back a little health. */
export function eat(l: FishLife, units: number): number {
  if (l.dead) return units;
  const eaten = Math.max(0, Math.min(units, l.stomach - l.ate));
  l.ate += eaten;
  if (eaten > 0) raiseHealth(l, 30 * eaten / l.stomach);
  return units - eaten;
}

/** Sim_Fish_Hungry (runs once more than an hour has built up): the
 * stomach empties over 18 hours; an empty fish starves slowly. */
export function stepHunger(l: FishLife, minutes: number, catchUp: boolean,
                           ctx: LifeCtx): Step {
  if (minutes <= 60 && !catchUp) return "wait";
  if (l.ate >= 1) {
    const dec = trunc(minutes * l.stomach / 1080);
    if (dec < 1) return "wait";
    l.ate = Math.max(0, l.ate - dec);
    return "applied";
  }
  const loss = minutes / 720 * 100;
  return loss > 5 ? lowerHealth(l, loss, Cause.starvation, ctx) : "wait";
}

/** The water as a fish rates it, in WATER_TOLERANCES order. */
export function waterReadings(w: Water): Record<ToleranceKey, number> {
  const L = w.litres;
  return {
    temp: w.temp, pH: w.pH, gH: w.gH, CO2: w.co2 / L,
    nitrate: w.nitrate / L, ammonia: w.ammonia / L, chlorine: w.chlorine / L,
    // The original truncates the mineral total to 16 bits first.
    mineral: ((trunc(w.calcium + w.magnesium) << 16) >> 16) / L,
  };
}

/** Whether every reading is inside the species' ideal band. */
export function allIdeal(care: SpeciesCare,
                         r: Record<ToleranceKey, number>): boolean {
  return WATER_TOLERANCES.every((k) =>
    r[k] >= care.tolerance[k].idealMin && r[k] <= care.tolerance[k].idealMax);
}

/** Sim_Fish_Health (once more than an hour has built up): ideal water
 * slowly heals; each reading outside the ideal band hurts in proportion
 * to how far it has gone toward the edge of survival, and past it.
 *
 * In the original, a reading that was still ideal also restarted the
 * shared clock, so a single bad reading never built up enough time to
 * hurt unless it was far past survivable. Here the clock restarts only
 * when damage lands, giving the per-time rate the formula describes
 * (about a health point per ten hours at the edge of survival). */
export function stepWaterHealth(l: FishLife, minutes: number, w: Water,
                                catchUp: boolean, ctx: LifeCtx): Step {
  if (minutes <= 60 && !catchUp) return "wait";
  const r = waterReadings(w);
  if (allIdeal(ctx.care, r)) return raiseHealth(l, minutes / 600 * 10);
  let changed = false;
  for (let i = 0; i < WATER_TOLERANCES.length; i++) {
    const k = WATER_TOLERANCES[i]!, t = ctx.care.tolerance[k], x = r[k];
    if (x >= t.idealMin && x <= t.idealMax && x >= t.liveMin && x < t.liveMax)
      continue;
    const pct = x <= t.idealMax
      ? (t.idealMin - t.liveMin > 0 ? (t.idealMin - x) * 100 / (t.idealMin - t.liveMin) : 0)
      : (t.liveMax - t.idealMax > 0 ? (x - t.idealMax) * 100 / (t.liveMax - t.idealMax) : 0);
    const dmg = minutes / 2160 * pct;
    if (dmg < 1) continue;
    const s = lowerHealth(l, Math.min(dmg, 100), i + 1, ctx);
    if (s === "died") return s;
    if (s === "applied") changed = true;
  }
  return changed ? "applied" : "wait";
}

/** Set_*_Rofc_To_Health: a reading that jumps by more than the
 * species' rate of change shocks the fish. A temperature shock gives it
 * White Spot 40% of the time instead. */
export function shock(l: FishLife, k: ToleranceKey, delta: number,
                      ctx: LifeCtx): Step {
  if (l.dead) return "wait";
  const roc = Math.max(1, ctx.care.tolerance[k].rateOfChange);
  const d = Math.abs(delta);
  if (d <= roc) return "wait";
  if (k === "temp" && randInt(ctx.rand, 1, 100) <= 40 && !l.sick) {
    startSickness(l, 0, ctx);
    return "applied";
  }
  return lowerHealth(l, d / roc * 250, WATER_TOLERANCES.indexOf(k) + 1, ctx);
}

/** Sim_Fish_Grow (every 11 minutes): ageing, the vitality curve, and
 * old age once the species' life span has passed. */
export function stepAge(l: FishLife, minutes: number, catchUp: boolean,
                        ctx: LifeCtx): Step {
  if (minutes < 11 && !catchUp) return "wait";
  l.age += minutes;
  if (l.age > ctx.care.lifeSpan &&
      lowerHealth(l, trunc(minutes * 100 / 600), Cause.oldAge, ctx) === "died")
    return "died";
  if (!l.dead) l.vitality = vitalityAt(l.vitalityBase, l.age, ctx.care);
  l.stomach = stomachSize(ctx.weight);
  l.ate = Math.min(l.ate, l.stomach);
  return "applied";
}

/** Sim_Fish_Sick (once six hours have built up): the sickness grows,
 * may spread, and wears the fish's health down. Only medicine cures. */
export function stepSickness(l: FishLife, minutes: number, catchUp: boolean,
                             ctx: LifeCtx, spread: (idx: number) => void): Step {
  if (!l.sick || l.dead) return "applied";
  if (minutes < 360 && !catchUp) return "wait";
  if (l.sick.amount < 1) {
    cure(l, ctx);
    return "applied";
  }
  const d = DISEASES[l.sick.disease]!;
  const grow = trunc(d.growth * minutes / 12960);
  if (grow !== 0) {
    const before = l.sick.amount;
    l.sick.amount = Math.min(100, Math.max(0, l.sick.amount + grow));
    if (l.sick.amount > before && d.contagion > 0 &&
        randInt(ctx.rand, 1, 500) <= d.contagion)
      spread(l.sick.disease);
  }
  return lowerHealth(l, minutes * l.sick.amount / 1440, Cause.disease, ctx);
}

/** Speed factor (Update_Speed_By_Age): below the sickness threshold a
 * fish loses 1% of its speed per missing health point. */
export function vigorOf(l: FishLife, care: SpeciesCare): number {
  if (l.dead) return 0;
  return l.health < care.unhealthy ? 1 - (care.unhealthy - l.health) / 100 : 1;
}

/** A saved FishLife, validated; undefined when it isn't one (the fish
 * then gets a fresh life). */
export function sanitizeLife(raw: unknown): FishLife | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const num = (v: unknown, lo: number, hi: number): number | null =>
    typeof v === "number" && Number.isFinite(v)
      ? Math.min(hi, Math.max(lo, v)) : null;
  const health = num(o.health, 0, 100), age = num(o.age, 0, 1e9);
  if (health === null || age === null) return undefined;
  const c = (o.clock ?? {}) as Record<string, unknown>;
  const sick = o.sick as Record<string, unknown> | null | undefined;
  const dead = o.dead as Record<string, unknown> | null | undefined;
  // Ids index tables: out of range means corrupt, not "nearest".
  const id = (v: unknown, n: number, lo: number): number | null =>
    Number.isInteger(v) && (v as number) >= lo && (v as number) < n
      ? v as number : null;
  const disease = id(sick?.disease, DISEASES.length, 0);
  const cause = id(dead?.cause, CAUSES.length, 1);
  const stomach = num(o.stomach, 1, 1000) ?? 2;
  return {
    health, age,
    vitality: num(o.vitality, 0, 99) ?? 50,
    vitalityBase: num(o.vitalityBase, 0, 99) ?? 50,
    resilience: num(o.resilience, 1, 99) ?? 50,
    stomach, ate: num(o.ate, 0, stomach) ?? 0,
    sick: disease === null ? null
      : { disease, amount: num(sick?.amount, 0, 100) ?? 1 },
    dead: cause === null ? null
      : { cause, at: num(dead?.at, 0, Number.MAX_SAFE_INTEGER) ?? 0 },
    clock: {
      hunger: num(c.hunger, 0, 1e6) ?? 0, age: num(c.age, 0, 1e6) ?? 0,
      health: num(c.health, 0, 1e6) ?? 0, sick: num(c.sick, 0, 1e6) ?? 0,
    },
  };
}
