/**
 * Tank-stats derivations for the optional stats window — pure functions
 * so vitest can pin the guidance rules without a DOM. Input is the
 * tank page's `state` bus payload (web/main.ts postState); feeding
 * thresholds come from core/tuning.ts, which the sim uses too, so the
 * advice tracks what the sim actually does.
 */
import { DUSK_LIGHT, hourLabel, sanitizeLighting } from "../core/light.js";
import { HUNGER_SEEK, QUALITY_SEEK } from "../core/tuning.js";
import { MEDICINES } from "../core/aquarium/disease.js";
import { diseaseName } from "./lifecopy.js";

export interface StatsFish {
  species?: string;
  hunger?: number; // 0 full .. 1 starving
  state?: string;
  health?: number;        // 0..100
  sick?: number | null;   // disease index
  dead?: number | null;   // cause of death
}

/** The tank page's aquariumState() payload: water per litre and the
 * equipment settings. */
export interface AquariumInput {
  litres?: number; temp?: number; pH?: number; gH?: number;
  o2?: number; co2?: number; nitrate?: number; ammonia?: number;
  chlorine?: number; organics?: number; oxygenSat?: number;
  heaterTarget?: number; heaterMin?: number; heaterMax?: number;
  filterDirt?: number; doses?: { id?: number; ml?: number }[];
  speed?: number; days?: number;
  change?: { fraction?: number; temp?: number };
}
export interface StatsInput {
  fish?: StatsFish[];
  waterQuality?: number; // 1 clean .. 0 foul
  food?: number;         // pellets in the water
  foodSettled?: number;  // pellets rotting on the gravel
  bubbles?: number;
  light?: number;        // 0.3 night .. 1 day
  lighting?: unknown;    // core/light.ts Lighting, validated here
  tickCount?: number;    // 30 ticks per second
  aquarium?: AquariumInput;
}

/** Water readings and equipment, ready to show; NaN-safe. */
export interface WaterStats {
  litres: number; temp: number; pH: number; gH: number; o2: number;
  oxygenPct: number; co2: number; nitrate: number; ammonia: number;
  chlorine: number; heaterTarget: number; heaterMin: number;
  heaterMax: number; filterDirt: number; speed: number; days: number;
  doses: { name: string; ml: number }[];
  change: { fraction: number; temp: number };
}

export interface TankStats {
  fishCount: number;
  /** Mean hunger across fish — null with an empty tank. */
  avgHunger: number | null;
  hungriest: { name: string; hunger: number } | null;
  seeking: number;
  startled: number;
  /** 0..100 */
  waterPct: number;
  food: number;
  foodSettled: number;
  bubbles: number;
  phase: "day" | "night";
  /** "Night (lights on at 08:00)" under the timer, else the phase. */
  lightLabel: string;
  uptimeMin: number;
  /** Ordered care hints — the most urgent first, capped at two. */
  advice: string[];
  /** Names and diseases of the sick fish, and the count of bodies. */
  sick: { name: string; disease: number }[];
  dead: number;
  water: WaterStats | null;
}

/** Hunger where "hungry" becomes "starving" for the worst-off fish. */
const HUNGER_STARVING = 0.85;
/** Avg hunger that warrants a feeding hint. */
const HUNGER_FEED = 0.55;

/** Number.isFinite, not ??: a NaN payload mustn't render "NaN%" and
 * silently pass the advice checks below. */
const fin = (v: number | undefined, d: number): number =>
  Number.isFinite(v) ? v! : d;

/** The aquarium payload with every number checked. */
export function deriveWater(a: AquariumInput | undefined): WaterStats | null {
  if (!a || typeof a !== "object") return null;
  const n = (v: unknown, d = 0): number =>
    typeof v === "number" && Number.isFinite(v) ? v : d;
  const doses = Array.isArray(a.doses) ? a.doses : [];
  return {
    litres: n(a.litres, 100), temp: n(a.temp), pH: n(a.pH, 7), gH: n(a.gH),
    o2: n(a.o2), oxygenPct: Math.round(n(a.oxygenSat, 1) * 100),
    co2: n(a.co2), nitrate: n(a.nitrate), ammonia: n(a.ammonia),
    chlorine: n(a.chlorine), heaterTarget: n(a.heaterTarget, 26.5),
    heaterMin: n(a.heaterMin, 16), heaterMax: n(a.heaterMax, 36),
    filterDirt: Math.min(100, Math.max(0, n(a.filterDirt))),
    speed: n(a.speed, 1), days: Math.max(0, n(a.days)),
    doses: doses.flatMap((d) => {
      const m = MEDICINES.find((x) => x.id === d?.id);
      return m ? [{ name: m.name, ml: Math.round(n(d.ml)) }] : [];
    }),
    change: { fraction: n(a.change?.fraction, 0.2), temp: n(a.change?.temp, 26.5) },
  };
}

/** Medicines that cure a disease, by name. */
export function curesFor(disease: number): string[] {
  return MEDICINES.filter((m) => m.kind === 1 && (m.cures >> disease & 1))
    .map((m) => m.name);
}

export function deriveStats(s: StatsInput): TankStats {
  const all = (s.fish ?? []).filter((f): f is StatsFish => !!f);
  const isDead = (f: StatsFish): boolean => typeof f.dead === "number";
  // Care is about the living: a body neither hungers nor swims.
  const fish = all.filter((f) => !isDead(f));
  const hungries = fish
    .filter((f): f is StatsFish & { hunger: number } =>
      Number.isFinite(f.hunger))
    .map((f) => ({ name: f.species || "Fish", hunger: f.hunger! }));
  const avgHunger = hungries.length
    ? hungries.reduce((a, f) => a + f.hunger, 0) / hungries.length
    : null;
  const worst = hungries.length
    ? hungries.reduce((a, f) => (f.hunger > a.hunger ? f : a))
    : null;
  const water = Math.min(1, Math.max(0, fin(s.waterQuality, 1)));
  const light = fin(s.light, 1);
  const phase = light > DUSK_LIGHT ? "day" : "night";
  const stats: TankStats = {
    fishCount: fish.length,
    avgHunger,
    hungriest: worst,
    seeking: fish.filter((f) => f.state === "seek").length,
    startled: fish.filter((f) => f.state === "startle").length,
    waterPct: Math.round(water * 100),
    food: fin(s.food, 0),
    foodSettled: fin(s.foodSettled, 0),
    bubbles: fin(s.bubbles, 0),
    phase,
    lightLabel: lightLabel(phase, s.lighting),
    uptimeMin: Math.floor(fin(s.tickCount, 0) / 30 / 60),
    advice: [],
    sick: fish.filter((f) => typeof f.sick === "number")
      .map((f) => ({ name: f.species || "Fish", disease: f.sick! })),
    dead: all.filter(isDead).length,
    water: deriveWater(s.aquarium),
  };
  stats.advice = advice(stats, water);
  return stats;
}

function lightLabel(phase: "day" | "night", raw: unknown): string {
  const name = phase === "day" ? "Day" : "Night";
  const l = sanitizeLighting(raw);
  if (!l.lamp) return `${name} (lamp off)`;
  // Equal hours keep the lights on, so there's no switch to announce.
  if (l.mode !== "timer" || l.on === l.off) return name;
  return phase === "day" ? `${name} (lights off at ${hourLabel(l.off)})`
    : `${name} (lights on at ${hourLabel(l.on)})`;
}

function advice(st: TankStats, water: number): string[] {
  const out: string[] = [];
  if (st.dead) {
    out.push(`${st.dead > 1 ? `${st.dead} dead fish are` : "A dead fish is"} ` +
             "fouling the water — remove it in Tank Overview.");
  }
  if (!st.fishCount) {
    if (!st.dead) out.push("No fish yet — add some from the Add-ons importer.");
    return out;
  }
  for (const f of st.sick.slice(0, 1)) {
    const cures = curesFor(f.disease);
    out.push(`${f.name} has ${diseaseName(f.disease)} — ` +
      (cures.length ? `treat the tank with ${cures.join(" or ")}.`
                    : "no medicine is known to cure it."));
  }
  const w = st.water;
  if (w) {
    if (w.chlorine > 0.1)
      out.push("There is chlorine in the water — add Chlorine Remover, " +
               "or let it gas off over a few days.");
    if (w.ammonia > 1)
      out.push("Ammonia is building up — change some water. A filter " +
               "breaks it down once it has some dirt in it.");
    if (w.nitrate > 20)
      out.push("Nitrate is high — change some water.");
    if (w.filterDirt > 80)
      out.push("The filter is clogging — clean it, a little at a time.");
  }
  if (water < QUALITY_SEEK) {
    out.push("Water is foul — fish won't eat until it clears. " +
             "Stop feeding and change some water, or let the filter " +
             "catch up.");
  }
  // Foul water already says "stop feeding" — the portion-size hint
  // would contradict it, so it only runs once water is recovering.
  if (st.foodSettled > 0 && water >= QUALITY_SEEK && water < 0.7) {
    out.push("Uneaten food is rotting on the gravel — " +
             "feed a little less at a time.");
  }
  if (water >= QUALITY_SEEK) {
    if (st.avgHunger !== null && st.avgHunger >= HUNGER_FEED) {
      out.push("Fish are hungry — press F, or click above the " +
               "waterline to drop food.");
    } else if (st.hungriest && st.hungriest.hunger >= HUNGER_STARVING) {
      out.push(`${st.hungriest.name} is starving — feed soon.`);
    }
  }
  if (!out.length) out.push("The tank is healthy — nothing needed.");
  return out.slice(0, 2);
}

/** "1h 23m" / "45m" — matches the panel overview's uptime format. */
export function uptime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/** Compact hunger label — same bands as the overview's. */
export function hungerLabel(h: number): string {
  // "peckish" means the fish is looking for food.
  if (h < HUNGER_SEEK) return "full";
  if (h < 0.66) return "peckish";
  return "hungry";
}

/** Trend arrow from a pair of samples, oldest-first; |delta| below
 * the dead zone reads as steady. */
export function trend(prev: number | null, cur: number,
                      deadZone = 0.02): string {
  if (prev === null || !Number.isFinite(prev) ||
      !Number.isFinite(cur)) return "→";
  const d = cur - prev;
  if (Math.abs(d) < deadZone) return "→";
  return d > 0 ? "↑" : "↓";
}

/** Sparkline size in pixels, and the time one column covers: 44
 * columns of 2 s span the ~90 s history the trend arrows use. */
export const SPARK_W = 44;
export const SPARK_H = 14;
export const SPARK_SLOT_MS = 2_000;

/** One value per sparkline column, oldest on the left: the latest
 * sample by the end of the column's time slot, held until the next.
 * Columns are time, not pushes: every open client window adds pushes,
 * so a column per push stretched and squeezed with the window count.
 * undefined is before the first sample, null a missing one. */
export function sparkColumns(
    series: readonly { t: number; v: number | null }[],
    now: number): (number | null | undefined)[] {
  const start = now - SPARK_W * SPARK_SLOT_MS;
  const cols: (number | null | undefined)[] = [];
  let j = 0;
  let cur: number | null | undefined;
  for (let i = 0; i < SPARK_W; i++) {
    const end = start + (i + 1) * SPARK_SLOT_MS;
    while (j < series.length && series[j]!.t <= end) cur = series[j++]!.v;
    cols.push(cur);
  }
  return cols;
}

/** The canvas row for a 0..1 value, in rows 1..SPARK_H-2: row 0 sits
 * under the frame's 1 px border, where a full-scale line vanished. */
export function sparkRow(v: number): number {
  return 1 + Math.round((1 - Math.min(1, Math.max(0, v))) * (SPARK_H - 3));
}
