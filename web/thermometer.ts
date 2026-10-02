/**
 * The liquid-crystal thermometer real tanks wear on the front glass,
 * one of Finsical's own extras (Effects > Thermometer strip). Each
 * cell is printed with a temperature and turns green when the water is
 * at it, tan when the water is a little colder and blue when it is a
 * little warmer, so a glance tells how warm the tank is without
 * opening Tank Stats. The shading rule is pure, so vitest pins it; the
 * strip is drawn once per look and cached.
 */

/** The printed temperatures, °C, warmest at the top: the heater's
 * 16-36 °C range, in the 2° steps a real strip uses. */
export const THERMO_CELLS: readonly number[] =
  [34, 32, 30, 28, 26, 24, 22, 20, 18];

export type CellShade = "dark" | "green" | "tan" | "blue";

/**
 * How the cell printed `v` shows water at `temp` °C. Each cell owns the
 * 2° band just around its number, and the bands tile the scale, so at
 * most one cell is green: green for `v` - 1 < temp <= `v` + 1, tan in
 * the degree below that (the water is a little colder), blue in the
 * degree above it (a little warmer), dark beyond. Water just off the
 * scale shows only the end cell, tan or blue; further off, nothing.
 */
export function cellShade(v: number, temp: number): CellShade {
  if (!Number.isFinite(temp)) return "dark";
  const d = temp - v;
  if (d > -1 && d <= 1) return "green";
  if (d > -2 && d <= -1) return "tan";
  if (d > 1 && d <= 2) return "blue";
  return "dark";
}

/** Every cell's shade, top to bottom. */
export function stripShades(temp: number): CellShade[] {
  return THERMO_CELLS.map((v) => cellShade(v, temp));
}

/** The reading the strip's hover tip gives: the water, and the heater's
 * setting when the water hasn't reached it yet. */
export function thermoTip(water: number, heater: number): string {
  const w = `Water ${water.toFixed(1)} °C`;
  return Math.abs(water - heater) >= 0.5
    ? `${w}, heater set to ${heater.toFixed(1)} °C` : w;
}

// ---- the strip ----------------------------------------------------------

/** 3x5 digits, as the cells print them. */
const DIGITS: Record<string, readonly string[]> = {
  "0": ["###", "#.#", "#.#", "#.#", "###"],
  "1": [".#.", "##.", ".#.", ".#.", "###"],
  "2": ["###", "..#", "###", "#..", "###"],
  "3": ["###", "..#", "###", "..#", "###"],
  "4": ["#.#", "#.#", "###", "..#", "..#"],
  "5": ["###", "#..", "###", "..#", "###"],
  "6": ["###", "#..", "###", "#.#", "###"],
  "7": ["###", "..#", "..#", "..#", "..#"],
  "8": ["###", "#.#", "###", "#.#", "###"],
  "9": ["###", "#.#", "###", "..#", "###"],
};

/** A cell's face and its printing, per shade: as on a real strip, the
 * number itself lights up on the dark film, its cell faintly tinted. */
const INK: Record<CellShade, { face: string; print: string }> = {
  dark: { face: "#17120e", print: "#4c4136" },
  green: { face: "#10301a", print: "#4ee27a" },
  tan: { face: "#33240f", print: "#e7ad4f" },
  blue: { face: "#122444", print: "#62a2ff" },
};

/** Cell face size and the strip's edge, px. */
const CELL_W = 9, CELL_H = 5, EDGE = 1;
/** The strip's size, px: one face per cell, a 1 px line between. */
export const THERMO_W = CELL_W + 2 * EDGE;
export const THERMO_H = THERMO_CELLS.length * (CELL_H + 1) - 1 + 2 * EDGE;

const strips = new Map<string, HTMLCanvasElement>();

/** The strip as it looks with the water at `temp`, cached by look. */
export function thermoCanvas(temp: number): HTMLCanvasElement {
  const shades = stripShades(temp);
  const key = shades.join(",");
  let cv = strips.get(key);
  if (cv) return cv;
  cv = document.createElement("canvas");
  cv.width = THERMO_W; cv.height = THERMO_H;
  const c = cv.getContext("2d")!;
  c.fillStyle = "#0b0907"; // the plastic strip
  c.fillRect(0, 0, THERMO_W, THERMO_H);
  shades.forEach((shade, i) => {
    const x0 = EDGE, y0 = EDGE + i * (CELL_H + 1);
    c.fillStyle = INK[shade].face;
    c.fillRect(x0, y0, CELL_W, CELL_H);
    c.fillStyle = INK[shade].print;
    const text = String(THERMO_CELLS[i]);
    [...text].forEach((ch, k) => {
      const rows = DIGITS[ch]!;
      rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++)
          if (row[x] === "#") c.fillRect(x0 + 1 + k * 4 + x, y0 + y, 1, 1);
      });
    });
  });
  strips.set(key, cv);
  return cv;
}
