// Tank lighting: the fast demo day/night cycle the sim runs on, and an
// optional light timer that follows the Mac's clock, like AquaZone's
// "Lovely Light" timer (lights on and off at set hours of real time).
// Pure functions of a time value: the sim stays tick-only, and the
// tank page reads the clock and passes the result in.

/** How the tank is lit. "demo" is the sim's own fast cycle (a day
 * every ~13 minutes); "timer" follows the clock between `on` and
 * `off`; "always" keeps the lights on. */
export type LightMode = "demo" | "timer" | "always";
export const LIGHT_MODES: readonly LightMode[] = ["demo", "timer", "always"];

export interface Lighting {
  mode: LightMode;
  /** Timer hours, 0..23 local time. Kept in every mode so switching
   * back to the timer restores them. Equal hours keep the lights on. */
  on: number;
  off: number;
}

/** The fast demo cycle stays the default; following the Mac's clock
 * is opt-in. */
export const LIGHTING_DEFAULTS: Lighting = { mode: "demo", on: 8, off: 22 };

export const MINUTES_PER_DAY = 24 * 60;
/** Darkest the demo night gets (1 = full daylight). */
export const DEMO_NIGHT_LIGHT = 0.3;
/** Darkest a timer night gets. People watch a desk toy in the evening,
 * so clock nights stay brighter than the demo's. */
export const CLOCK_NIGHT_LIGHT = 0.45;
/** Timer lights fade over half an hour after each switch time. */
const CLOCK_RAMP_MIN = 30;

// The demo cycle is the timer's curve on a virtual 24-hour clock: on
// at 06:00, off at 18:00, two-hour ramps. That gives night about 47%
// of the cycle (light below 0.5) and ramps of about 8%, and the cycle
// starts at 10:00 so a new tank opens in daylight.
const DEMO_ON_MIN = 6 * 60;
const DEMO_OFF_MIN = 18 * 60;
const DEMO_RAMP_MIN = 120;
const DEMO_START_MIN = 10 * 60;

const mod = (a: number, n: number): number => ((a % n) + n) % n;
const smoothstep = (x: number): number => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

/** Where `minutes` falls relative to a schedule: `level` 0 (night) ..
 * 1 (day), plus the ramp in progress, if any. Assumes both day and
 * night outlast one ramp, which whole-hour timers and the demo meet. */
interface Phase { level: number; ramp: { rising: boolean; p: number } | null }
function phaseAt(minutes: number, onMin: number, offMin: number,
                 rampMin: number): Phase {
  const sinceOn = mod(minutes - onMin, MINUTES_PER_DAY);
  const dayLen = mod(offMin - onMin, MINUTES_PER_DAY) || MINUTES_PER_DAY;
  if (dayLen === MINUTES_PER_DAY) return { level: 1, ramp: null };
  if (sinceOn < dayLen) {
    const p = sinceOn / rampMin;
    return { level: smoothstep(p), ramp: p < 1 ? { rising: true, p } : null };
  }
  const p = (sinceOn - dayLen) / rampMin;
  return { level: 1 - smoothstep(p),
           ramp: p < 1 ? { rising: false, p } : null };
}

/** Minutes on the demo's virtual clock at a point in its cycle,
 * `cycle` 0..1 (tickCount / DAY_TICKS, wrapped). */
function demoMinutes(cycle: number): number {
  return mod(DEMO_START_MIN + cycle * MINUTES_PER_DAY, MINUTES_PER_DAY);
}

/** Demo-cycle light, 0.3 night .. 1 day, at `cycle` 0..1. */
export function demoLight(cycle: number): number {
  const { level } = phaseAt(demoMinutes(cycle), DEMO_ON_MIN, DEMO_OFF_MIN,
                            DEMO_RAMP_MIN);
  return DEMO_NIGHT_LIGHT + (1 - DEMO_NIGHT_LIGHT) * level;
}

/** Clock-driven light, 0.45 night .. 1 day, at `minutes` past local
 * midnight. Null in demo mode, which the sim's tick cycle drives. */
export function lightAt(minutes: number, s: Lighting): number | null {
  if (s.mode === "demo") return null;
  if (s.mode === "always") return 1;
  const { level } = phaseAt(minutes, s.on * 60, s.off * 60, CLOCK_RAMP_MIN);
  return CLOCK_NIGHT_LIGHT + (1 - CLOCK_NIGHT_LIGHT) * level;
}

export interface Tint { r: number; g: number; b: number; a: number }
/** Strongest dawn or dusk tint, at the middle of a ramp. */
const TINT_ALPHA = 0.3;
const DAWN = { r: 255, g: 180, b: 90 };
const DUSK = { r: 255, g: 110, b: 40 };
function rampTint(ph: Phase): Tint | null {
  if (!ph.ramp) return null;
  const a = TINT_ALPHA * Math.sin(Math.PI * Math.min(1, ph.ramp.p));
  return { ...(ph.ramp.rising ? DAWN : DUSK), a };
}

/** Warm dawn or dusk tint while the lights ramp, null otherwise.
 * `minutes` is local clock time; in demo mode pass `cycle` instead. */
export function twilightTint(s: Lighting, minutes: number,
                             cycle: number): Tint | null {
  if (s.mode === "always") return null;
  if (s.mode === "demo")
    return rampTint(phaseAt(demoMinutes(cycle), DEMO_ON_MIN, DEMO_OFF_MIN,
                            DEMO_RAMP_MIN));
  return rampTint(phaseAt(minutes, s.on * 60, s.off * 60, CLOCK_RAMP_MIN));
}

/** A new moon to count lunations from (2000-01-06 18:14 UTC). */
const NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14);
const SYNODIC_MS = 29.530588853 * 24 * 3600 * 1000;

/** Moon phase at `ms` (epoch milliseconds): 0 new, 0.5 full, from the
 * mean synodic month. Good to about a day, plenty for a moonbeam. */
export function moonPhase(ms: number): number {
  return mod(ms - NEW_MOON_MS, SYNODIC_MS) / SYNODIC_MS;
}

/** Fraction of the moon's disc that is lit, 0 new .. 1 full. */
export function moonIllumination(ms: number): number {
  return (1 - Math.cos(2 * Math.PI * moonPhase(ms))) / 2;
}

/** "08:00" for hour 8. */
export function hourLabel(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

const isHour = (v: unknown): v is number =>
  Number.isInteger(v) && (v as number) >= 0 && (v as number) < 24;

/** Validate stored or posted lighting, field by field, onto `base`. */
export function sanitizeLighting(
  raw: unknown, base: Lighting = LIGHTING_DEFAULTS): Lighting {
  const r = (raw && typeof raw === "object" ? raw : {}) as
    Record<string, unknown>;
  return {
    mode: LIGHT_MODES.includes(r.mode as LightMode)
      ? r.mode as LightMode : base.mode,
    on: isHour(r.on) ? r.on : base.on,
    off: isHour(r.off) ? r.off : base.off,
  };
}
