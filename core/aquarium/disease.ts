/**
 * The original's disease and medicine tables (SicI and DrgI records in
 * AQUAZONE.REZ and the Mac add-on medicines), as data. Names are the
 * common names of the ailments; medicines are named for what they do.
 */
import type { Element } from "./water.js";

export interface Disease {
  id: number;
  name: string;
  /** Sickness gained per visit: trunc(growth × minutes / 12960). */
  growth: number;
  /** Sickness a fish starts with, and the % its resistance drops. */
  severity: number;
  /** Chance out of 500, each time the sickness grows, of infecting the
   * weakest healthy fish. */
  contagion: number;
}

/** Index = disease id − 400, the bit a medicine's cure mask uses. */
export const DISEASES: readonly Disease[] = [
  { id: 400, name: "White Spot", growth: 35, severity: 18, contagion: 65 },
  { id: 401, name: "Tailrot", growth: 9, severity: 17, contagion: 35 },
  { id: 402, name: "Bellworm", growth: 10, severity: 3, contagion: 15 },
  { id: 403, name: "Chilodonella", growth: 13, severity: 2, contagion: 7 },
  { id: 404, name: "Water Mold", growth: 8, severity: 5, contagion: 18 },
  { id: 405, name: "Red Rust", growth: 35, severity: 18, contagion: 0 },
  { id: 406, name: "Red Rust B", growth: 32, severity: 5, contagion: 42 },
  { id: 407, name: "ARDS", growth: 1, severity: 1, contagion: 50 },
];

export function diseaseIndex(id: number): number {
  return DISEASES.findIndex((d) => d.id === id);
}

/** 1 = medicine (acts on fish and water), 2 = water treatment. */
export type MedicineKind = 1 | 2;

export interface Medicine {
  id: number;
  name: string;
  kind: MedicineKind;
  /** Bit i cures DISEASES[i]. */
  cures: number;
  /** Potency against disease and, in excess, against the fish. */
  strength: number;
  /** Change per dissolved ml, mg (tank totals). */
  perMl: Partial<Record<Element, number>>;
  /** Cloud colour of a fresh dose, #rrggbb. */
  color: string;
  /** A sensible dose per 10 litres, from the label, ml. */
  dosePer10L: number;
}

/** The medicine cabinet: the original's four base remedies and the
 * three water treatments and one remedy of its Mac add-on packs. */
export const MEDICINES: readonly Medicine[] = [
  { id: 900, name: "Water Conditioner", kind: 2, cures: 0, strength: 0,
    perMl: { nitrate: 0.08, ammonia: 0.05, calcium: -0.5, magnesium: -0.08 },
    color: "#7d6eff", dosePer10L: 8 },
  { id: 1000, name: "Chlorine Remover", kind: 2, cures: 0, strength: 0,
    perMl: { o2: -5, ammonia: 2.5, chlorine: -70 },
    color: "#27e7ff", dosePer10L: 5 },
  // The original patches this remedy's oxygen cost from −5 to −0.05
  // per ml when it loads the record.
  { id: 1100, name: "Green Remedy", kind: 1, cures: 0b11111, strength: 6,
    perMl: { o2: -0.05 }, color: "#29ff97", dosePer10L: 30 },
  { id: 1200, name: "Methylene Blue", kind: 1, cures: 0b10011,
    strength: 5, perMl: { o2: -4.5 }, color: "#003e56", dosePer10L: 30 },
  { id: 1400, name: "Hardness Minus", kind: 2, cures: 0, strength: 0,
    perMl: { calcium: -1, magnesium: -1 }, color: "#040f08",
    dosePer10L: 5 },
  { id: 1500, name: "pH Up", kind: 2, cures: 0, strength: 0,
    perMl: { co2: -0.4, calcium: 1, magnesium: 1 }, color: "#02f6fe",
    dosePer10L: 5 },
  { id: 1600, name: "pH Down", kind: 2, cures: 0, strength: 0,
    perMl: { co2: 0.4, calcium: -1, magnesium: -1 }, color: "#02f6fe",
    dosePer10L: 5 },
  { id: 2500, name: "Rust Remedy", kind: 1, cures: 0b1100000, strength: 5,
    perMl: { co2: 0.02, chlorine: 0.08, magnesium: 0.15 },
    color: "#035048", dosePer10L: 30 },
];

export function medicineById(id: number): Medicine | undefined {
  return MEDICINES.find((m) => m.id === id);
}

/** ml a medicine dissolves per simulated minute. */
export function dissolveRate(kind: MedicineKind): number {
  return kind === 1 ? 1.2 : 0.2;
}
