/**
 * Tank-stats derivations for the optional stats window — pure functions
 * so vitest can pin the guidance rules without a DOM. Input is the
 * tank page's `state` bus payload (web/main.ts postState); feeding
 * thresholds come from core/tuning.ts, which the sim uses too, so the
 * advice tracks what the sim actually does.
 */
import { DUSK_LIGHT, hourLabel, sanitizeLighting } from "../core/light.js";
import { HUNGER_SEEK, QUALITY_SEEK } from "../core/tuning.js";

export interface StatsFish {
  species?: string;
  hunger?: number; // 0 full .. 1 starving
  state?: string;
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
}

/** Hunger where "hungry" becomes "starving" for the worst-off fish. */
const HUNGER_STARVING = 0.85;
/** Avg hunger that warrants a feeding hint. */
const HUNGER_FEED = 0.55;

/** Number.isFinite, not ??: a NaN payload mustn't render "NaN%" and
 * silently pass the advice checks below. */
const fin = (v: number | undefined, d: number): number =>
  Number.isFinite(v) ? v! : d;

export function deriveStats(s: StatsInput): TankStats {
  const fish = (s.fish ?? []).filter((f): f is StatsFish => !!f);
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
  if (!st.fishCount) {
    out.push("No fish yet — add some from the Add-ons importer.");
    return out;
  }
  if (water < QUALITY_SEEK) {
    out.push("Water is foul — fish won't eat until it clears. " +
             "Stop feeding and let the filter catch up.");
  }
  // Foul water already says "stop feeding" — the portion-size hint
  // would contradict it, so it only runs once water is recovering.
  if (st.foodSettled > 0 && water >= QUALITY_SEEK && water < 0.7) {
    out.push("Uneaten food is rotting on the gravel — " +
             "feed a little less at a time.");
  }
  if (water >= QUALITY_SEEK) {
    if (st.avgHunger !== null && st.avgHunger >= HUNGER_FEED) {
      out.push("Fish are hungry — drop food near the surface " +
               "(press F or click high in the tank).");
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
