import { describe, expect, it } from "vitest";
import { cellShade, stripShades, THERMO_CELLS, THERMO_H, THERMO_W,
         thermoTip } from "./thermometer.js";

describe("cellShade", () => {
  it("greens the cell at the water's temperature", () => {
    expect(cellShade(26, 26)).toBe("green");
    expect(cellShade(26, 26.9)).toBe("green");
    expect(cellShade(26, 27)).toBe("green");
    expect(cellShade(26, 25.1)).toBe("green");
  });

  it("shades a cell tan when the water is a little colder", () => {
    expect(cellShade(28, 26.5)).toBe("tan");
    expect(cellShade(28, 27)).toBe("tan");
  });

  it("shades a cell blue when the water is a little warmer", () => {
    expect(cellShade(24, 25.5)).toBe("blue");
    expect(cellShade(24, 26)).toBe("blue");
  });

  it("leaves cells far from the reading dark", () => {
    expect(cellShade(30, 26)).toBe("dark");
    expect(cellShade(18, 26)).toBe("dark");
    expect(cellShade(26, NaN)).toBe("dark");
  });
});

describe("stripShades", () => {
  it("has exactly one green cell anywhere on the scale", () => {
    for (let t = 17.05; t <= 35; t += 0.1) {
      const green = stripShades(t).filter((s) => s === "green");
      expect(green, `at ${t.toFixed(2)} °C`).toHaveLength(1);
    }
  });

  it("shades the cell above tan while the water is just under it", () => {
    const s = stripShades(26.5);
    const i = THERMO_CELLS.indexOf(26);
    expect(s[i]).toBe("green");
    expect(s[i - 1]).toBe("tan"); // 28, above
    expect(s[i + 1]).toBe("dark"); // 24 is 2.5° off
  });

  it("shows only an end cell for water just off the scale", () => {
    expect(stripShades(16.5).filter((s) => s !== "dark")).toEqual(["tan"]);
    expect(stripShades(35.5).filter((s) => s !== "dark")).toEqual(["blue"]);
    // Further off, as at the heater's 16 °C floor, nothing lights.
    expect(stripShades(16).every((s) => s === "dark")).toBe(true);
  });
});

describe("the strip", () => {
  it("is a narrow strip, taller than wide, that fits the tank's glass",
     () => {
    expect(THERMO_W).toBe(11);
    expect(THERMO_H).toBe(THERMO_CELLS.length * 6 + 1);
    expect(THERMO_H).toBeLessThan(200 / 3);
  });
});

describe("thermoTip", () => {
  it("gives the water's temperature", () => {
    expect(thermoTip(26.4, 26.5)).toBe("Water 26.4 °C");
  });

  it("adds the heater's setting while the water is still getting there",
     () => {
    expect(thermoTip(22, 26.5))
      .toBe("Water 22.0 °C, heater set to 26.5 °C");
  });
});
