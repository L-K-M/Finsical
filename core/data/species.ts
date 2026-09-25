/**
 * A species' care needs from its AquaZone `FsTI` record.
 *
 * Every fish pack carries one FsTI per species (210 bytes, little-endian
 * on the Windows packs). Values are stored in thousandths, the way the
 * original engine read them (int32 × 0.001). Offsets come from the
 * record dump built into the Windows AQUAZONE.DLL and were checked
 * against the angelfish, neon tetra, clown loach, zebra danio and black
 * molly packs.
 *
 *   +0x00 i16 breedAge (days), babyType, eggType, birthrate, livingChance
 *   +0x0a u32 eggOutTime
 *   +0x0e 8 × {i32 idealMax, idealMin, liveMax, liveMin; i16 rateOfChange}
 *         in WATER_TOLERANCES order
 *   +0x9e i16 unhealthyValRes: the health below which a fish can fall sick
 *   +0xbe u32 adultStart, +0xc4 u32 lifeSpan (AquaZone minutes)
 *
 * The diseases a species can catch come from its `SuS#` list (u16
 * count, u16 disease ids); packs without one use the five common ones.
 */
import { packResources } from "./rsrc.js";

/** The parameters FsTI rates, in record order. "mineral" is Ca + Mg. */
export const WATER_TOLERANCES = [
  "temp", "pH", "gH", "CO2", "nitrate", "ammonia", "chlorine", "mineral",
] as const;
export type ToleranceKey = typeof WATER_TOLERANCES[number];

/** Ideal band (full health) inside a survivable band; outside that a
 * fish dies. `rateOfChange` is how fast the value may move before the
 * change itself hurts (per original time unit, see core/aquarium). */
export interface Tolerance {
  idealMin: number;
  idealMax: number;
  liveMin: number;
  liveMax: number;
  rateOfChange: number;
}

export interface SpeciesCare {
  tolerance: Record<ToleranceKey, Tolerance>;
  /** Days until a fish may breed. */
  breedAge: number;
  /** Health (0..100) below which damage can make the fish sick, and
   * below which it swims slower. */
  unhealthy: number;
  /** Age (minutes) at which a youngster is grown, and the natural span
   * of its life; past the span it weakens and dies of old age. */
  adultAge: number;
  lifeSpan: number;
  /** Disease ids (400…) the species can catch. */
  susceptible: number[];
}

/** The five common diseases every stock species catches (White Spot,
 * Tailrot, Bellworm, Chilodonella, Water Mold). */
export const DEFAULT_SUSCEPTIBLE: readonly number[] = [400, 401, 402, 403, 404];

const MINUTES_PER_DAY = 24 * 60;

/** Care needs for fish without a species record (the stand-in fish):
 * a hardy community tropical, close to the stock packs' values. */
export const DEFAULT_CARE: SpeciesCare = {
  tolerance: {
    temp: { idealMin: 22, idealMax: 28, liveMin: 19, liveMax: 32, rateOfChange: 4 },
    pH: { idealMin: 6, idealMax: 7.5, liveMin: 4, liveMax: 9.5, rateOfChange: 1 },
    gH: { idealMin: 3.5, idealMax: 15, liveMin: 0, liveMax: 20, rateOfChange: 2 },
    CO2: { idealMin: 0, idealMax: 65, liveMin: 0, liveMax: 70, rateOfChange: 5 },
    nitrate: { idealMin: 0, idealMax: 8, liveMin: 0, liveMax: 40, rateOfChange: 5 },
    ammonia: { idealMin: 0, idealMax: 2, liveMin: 0, liveMax: 20, rateOfChange: 1 },
    chlorine: { idealMin: 0, idealMax: 0.1, liveMin: 0, liveMax: 2, rateOfChange: 1 },
    mineral: { idealMin: 0, idealMax: 1000, liveMin: 0, liveMax: 1000, rateOfChange: 1000 },
  },
  breedAge: 180,
  unhealthy: 25,
  adultAge: 120 * MINUTES_PER_DAY,
  lifeSpan: 730 * MINUTES_PER_DAY,
  susceptible: [...DEFAULT_SUSCEPTIBLE],
};

const FSTI_SIZE = 0xc8;
const TOL_BASE = 0x0e;
const TOL_SIZE = 18;

/** Parse one FsTI payload; null when it is too short to hold the
 * tolerance table or a band is inverted (not a real record). */
export function parseFsti(p: Uint8Array): SpeciesCare | null {
  if (p.length < FSTI_SIZE) return null;
  const v = new DataView(p.buffer, p.byteOffset, p.byteLength);
  const tolerance = {} as Record<ToleranceKey, Tolerance>;
  for (let i = 0; i < WATER_TOLERANCES.length; i++) {
    const o = TOL_BASE + i * TOL_SIZE;
    const t: Tolerance = {
      idealMax: v.getInt32(o, true) / 1000,
      idealMin: v.getInt32(o + 4, true) / 1000,
      liveMax: v.getInt32(o + 8, true) / 1000,
      liveMin: v.getInt32(o + 12, true) / 1000,
      rateOfChange: v.getInt16(o + 16, true),
    };
    if (t.idealMin > t.idealMax || t.liveMin > t.liveMax) return null;
    tolerance[WATER_TOLERANCES[i]!] = t;
  }
  const adultAge = v.getUint32(0xbe, true), raw = v.getUint32(0xc4, true);
  // A zero span, or an adult age past it, would make every fish ancient
  // at birth: fall back to the stand-in's, never beyond the span.
  const lifeSpan = raw >= 2 ? raw : DEFAULT_CARE.lifeSpan;
  return {
    // A negative breedAge is as corrupt as a bad lifeSpan — fall back
    // like the neighbors rather than clamp to breed-at-birth.
    tolerance, breedAge: v.getInt16(0, true) >= 0
      ? v.getInt16(0, true) : DEFAULT_CARE.breedAge,
    unhealthy: Math.min(100, Math.max(0, v.getInt16(0x9e, true))),
    adultAge: adultAge > 0 && adultAge < lifeSpan ? adultAge
      : Math.min(DEFAULT_CARE.adultAge, lifeSpan - 1),
    lifeSpan,
    susceptible: [...DEFAULT_SUSCEPTIBLE],
  };
}

/** A SuS# payload: u16 count, then that many u16 disease ids. */
export function parseSusceptibility(p: Uint8Array): number[] | null {
  if (p.length < 2) return null;
  const v = new DataView(p.buffer, p.byteOffset, p.byteLength);
  const n = v.getUint16(0, true);
  if (n < 1 || 2 + n * 2 > p.length) return null;
  const ids: number[] = [];
  for (let i = 0; i < n; i++) ids.push(v.getUint16(2 + i * 2, true));
  return ids;
}

/** The first valid FsTI in a pack, with its SuS# list, or null. */
export function packSpeciesCare(d: Uint8Array): SpeciesCare | null {
  const res = packResources(d);
  for (const r of res) {
    if (r.type !== "FsTI") continue;
    const s = parseFsti(r.payload);
    if (!s) continue;
    const sus = res.find((x) => x.type === "SuS#");
    const ids = sus ? parseSusceptibility(sus.payload) : null;
    if (ids) s.susceptible = ids;
    return s;
  }
  return null;
}

/** A saved SpeciesCare, validated; null when any part is off (the fish
 * then fall back to DEFAULT_CARE until their pack restores). */
export function sanitizeCare(raw: unknown): SpeciesCare | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const fin = (v: unknown): v is number =>
    typeof v === "number" && Number.isFinite(v);
  const tol = (o.tolerance ?? {}) as Record<string, unknown>;
  const tolerance = {} as Record<ToleranceKey, Tolerance>;
  for (const k of WATER_TOLERANCES) {
    const t = (tol[k] ?? {}) as Record<string, unknown>;
    const { idealMin, idealMax, liveMin, liveMax, rateOfChange } = t;
    if (!fin(idealMin) || !fin(idealMax) || !fin(liveMin) || !fin(liveMax) ||
        !fin(rateOfChange) || idealMin > idealMax || liveMin > liveMax)
      return null;
    tolerance[k] = { idealMin, idealMax, liveMin, liveMax, rateOfChange };
  }
  const { breedAge, unhealthy, adultAge, lifeSpan, susceptible } = o;
  if (!fin(breedAge) || breedAge < 0 || !fin(unhealthy) || !fin(adultAge) ||
      !fin(lifeSpan) || !(adultAge > 0) || !(adultAge < lifeSpan) ||
      !Array.isArray(susceptible))
    return null;
  const ids = susceptible.filter((x): x is number => Number.isInteger(x));
  return {
    tolerance, breedAge, unhealthy: Math.min(100, Math.max(0, unhealthy)),
    adultAge, lifeSpan, susceptible: ids.length ? ids : [...DEFAULT_SUSCEPTIBLE],
  };
}
