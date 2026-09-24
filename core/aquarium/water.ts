/**
 * Water chemistry, reimplemented from the original AquaZone engine
 * (Mac 1.7.9 routine names, Windows AQUAZONE.DLL arithmetic; see
 * docs/ORIGINAL-SIM.md for the full derivation).
 *
 * Like the original, every dissolved substance is held as a TANK TOTAL
 * in mg; what a fish or the user sees is the concentration, total /
 * litres. Temperature (°C), pH and gH (°dH) are stored as-is. All
 * writes go through the setters below, which apply the original clamps
 * and the knock-on recalculations: calcium or magnesium change gH, gH
 * or CO2 change pH, and warmer water holds less oxygen.
 */

export interface Water {
  litres: number;
  temp: number;
  pH: number;
  gH: number;
  o2: number;
  co2: number;
  /** Nitric acid (nitrate) — what the filter turns ammonia into. */
  nitrate: number;
  ammonia: number;
  chlorine: number;
  calcium: number;
  magnesium: number;
  protein: number;
  carbohydrate: number;
  fat: number;
  vitamin: number;
}

/** The substances held as tank totals, in the original record order. */
export const ELEMENTS = [
  "o2", "co2", "nitrate", "ammonia", "chlorine", "calcium", "magnesium",
  "protein", "carbohydrate", "fat", "vitamin",
] as const;
export type Element = typeof ELEMENTS[number];

/** Per-litre ceilings (mg/L) the setters clamp to; O2 is capped by
 * saturation instead. */
const CEILING: Record<Exclude<Element, "o2">, number> = {
  co2: 100, nitrate: 100, ammonia: 10, chlorine: 20, calcium: 300,
  magnesium: 300, protein: 100, carbohydrate: 100, fat: 100, vitamin: 100,
};

const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, v));

/** Round half away from zero, the original's float-to-int helper. */
export function roundAway(v: number): number {
  return v < 0 ? -Math.floor(-v + 0.5) : Math.floor(v + 0.5);
}

// Oxygen saturation, mg/L × 100, for 16..37 °C (Lookup_O2_Table).
const O2_TABLE = [
  956, 937, 918, 901, 884, 868, 853, 838, 825, 811, 799,
  786, 775, 764, 753, 742, 732, 722, 713, 704, 694, 683,
];

/** How much oxygen (mg/L) water of this temperature holds. */
export function o2Saturation(temp: number): number {
  const i = temp < 16 ? 0 : temp > 36 ? 21 : roundAway(temp - 16);
  return O2_TABLE[Math.min(21, Math.max(0, i))]! * 0.01;
}

/** gH from the calcium + magnesium totals (Calculate_GH). */
export function hardness(calcium: number, magnesium: number,
                         litres: number): number {
  return clamp((calcium + magnesium) / 13 / litres, 0.1, 20);
}

// pH as a function of hardness and dissolved CO2 (Calculate_PH): a
// bilinear lookup, rows by gH, columns by CO2 mg/L, both × 100.
const GH_BOUNDS = [10, 50, 100, 200, 300, 400, 500, 700, 1000, 1500, 2000, 2100];
const CO2_BOUNDS = [10000, 5000, 3000, 2000, 1500, 1000, 800, 600, 400, 200, 100, 50, 10];
// A flat short[11][12]: row r, column c is PH_TABLE[r * 12 + c]. The
// original reads one past a row's end at very low CO2, landing on the
// next row's first entry; indexing the flat array keeps that quirk.
const PH_TABLE = [
  501, 502, 510, 530, 540, 560, 570, 580, 600, 630, 660, 690,
  530, 560, 580, 600, 610, 630, 640, 650, 670, 700, 730, 760,
  560, 590, 610, 630, 640, 660, 670, 680, 700, 730, 760, 790,
  590, 620, 640, 660, 670, 690, 700, 710, 730, 760, 790, 820,
  610, 640, 660, 680, 690, 710, 720, 730, 750, 780, 800, 840,
  620, 650, 670, 690, 700, 720, 730, 740, 760, 790, 820, 850,
  630, 660, 680, 700, 710, 730, 740, 750, 770, 800, 830, 850,
  640, 670, 700, 710, 730, 740, 750, 770, 780, 810, 840, 851,
  660, 690, 710, 730, 740, 760, 770, 780, 800, 830, 851, 851,
  680, 710, 730, 750, 760, 780, 790, 800, 820, 850, 850, 851,
  690, 720, 740, 760, 770, 790, 800, 810, 830, 851, 851, 851,
];
const phAt = (r: number, c: number): number =>
  PH_TABLE[Math.min(r * 12 + c, PH_TABLE.length - 1)]!;

/** pH from hardness (°dH) and CO2 (mg/L). */
export function acidity(gH: number, co2PerLitre: number): number {
  const g = gH * 100;
  let r = 11, fr = 0;
  for (let i = 0; i < 11; i++) {
    if (GH_BOUNDS[i]! <= g && g < GH_BOUNDS[i + 1]!) {
      r = i;
      fr = (g - GH_BOUNDS[i]!) / (GH_BOUNDS[i + 1]! - GH_BOUNDS[i]!);
      break;
    }
  }
  const v = Math.trunc(co2PerLitre * 100);
  let c = 12, fc = 0;
  for (let i = 0; i < 12; i++) {
    if (CO2_BOUNDS[i]! >= v && v > CO2_BOUNDS[i + 1]!) {
      c = i;
      fc = (CO2_BOUNDS[i]! - v) / (CO2_BOUNDS[i]! - CO2_BOUNDS[i + 1]!);
      break;
    }
  }
  const row = (rr: number): number => {
    const a = phAt(rr, c);
    return a + (phAt(rr, c + 1) - a) * fc;
  };
  // Rows past the table (gH beyond its last bound) read the last row.
  const r0 = Math.min(r, 10), r1 = Math.min(r + 1, 10);
  const v0 = row(r0);
  return clamp((v0 + (row(r1) - v0) * fr) * 0.01, 5, 9);
}

/** Per-litre concentration of an element (mg/L). */
export function perLitre(w: Water, e: Element): number {
  return w[e] / w.litres;
}

/** Set an element's tank total, with the original clamp and knock-on
 * effects. Returns the change actually applied. */
export function setElement(w: Water, e: Element, total: number): number {
  const old = w[e];
  const hi = e === "o2" ? o2Saturation(w.temp) : CEILING[e];
  w[e] = clamp(total, 0, hi * w.litres);
  if (e === "calcium" || e === "magnesium") {
    w.gH = hardness(w.calcium, w.magnesium, w.litres);
    w.pH = acidity(w.gH, w.co2 / w.litres);
  } else if (e === "co2") {
    w.pH = acidity(w.gH, w.co2 / w.litres);
  }
  return w[e] - old;
}

/** Add to an element's total; returns the change actually applied. */
export function addElement(w: Water, e: Element, delta: number): number {
  return delta === 0 ? 0 : setElement(w, e, w[e] + delta);
}

/** Set the temperature. Warmer water drives out oxygen above its new
 * saturation (Set_Temp_To_O2). */
export function setTemp(w: Water, t: number): void {
  w.temp = t;
  const cap = o2Saturation(t) * w.litres;
  if (w.o2 > cap) w.o2 = cap;
}

/** Fresh tap water at `temp` (Calc_Defalt_Water_Info): saturated with
 * oxygen, 15 mg/L CO2, 1.1 mg/L chlorine, 42 mg/L calcium and 10 mg/L
 * magnesium, which works out to gH 4 and pH 7. `aged` leaves the
 * chlorine out — water that has stood long enough to gas it off. */
export function tapWater(litres: number, temp: number, aged = false): Water {
  const w: Water = {
    litres, temp, pH: 7, gH: 4,
    o2: o2Saturation(temp) * litres, co2: 15 * litres, nitrate: 0,
    ammonia: 0, chlorine: aged ? 0 : 1.1 * litres, calcium: 42 * litres,
    magnesium: 10 * litres, protein: 0, carbohydrate: 0, fat: 0, vitamin: 0,
  };
  w.gH = hardness(w.calcium, w.magnesium, litres);
  w.pH = acidity(w.gH, w.co2 / litres);
  return w;
}

/**
 * Replace `fraction` of the tank with `fresh` water (Mix_Water_Facter):
 * each total keeps (1 - f) of itself and gains the matching share of
 * the new water; temperature mixes by volume. Returns the changes, for
 * the fish's rate-of-change shock.
 */
export function mixIn(w: Water, fresh: Water, fraction: number):
    { temp: number; pH: number; gH: number } & Record<Element, number> {
  const f = clamp(fraction, 0, 1);
  const before = { temp: w.temp, pH: w.pH, gH: w.gH };
  setTemp(w, w.temp * (1 - f) + fresh.temp * f);
  const changes = {} as Record<Element, number>;
  for (const e of ELEMENTS) {
    const share = fresh[e] / fresh.litres * w.litres * f;
    const old = w[e];
    const hi = e === "o2" ? o2Saturation(w.temp) : CEILING[e];
    w[e] = clamp(old * (1 - f) + share, 0, hi * w.litres);
    changes[e] = w[e] - old;
  }
  w.gH = hardness(w.calcium, w.magnesium, w.litres);
  w.pH = acidity(w.gH, w.co2 / w.litres);
  return { ...changes, temp: w.temp - before.temp, pH: w.pH - before.pH,
           gH: w.gH - before.gH };
}

/** A saved water record, validated: untrusted numbers fall back to the
 * value in `base`. */
export function sanitizeWater(raw: unknown, base: Water): Water {
  const o = (raw && typeof raw === "object" ? raw : {}) as
    Record<string, unknown>;
  const w = { ...base };
  for (const k of Object.keys(base) as (keyof Water)[]) {
    const v = o[k];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) w[k] = v;
  }
  if (w.litres <= 0) w.litres = base.litres;
  for (const e of ELEMENTS) setElement(w, e, w[e]);
  setTemp(w, clamp(w.temp, 0, 45));
  w.gH = hardness(w.calcium, w.magnesium, w.litres);
  w.pH = acidity(w.gH, w.co2 / w.litres);
  return w;
}
