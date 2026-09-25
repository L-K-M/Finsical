import { describe, expect, it } from "vitest";
import { CLOCK_NIGHT_LIGHT, DEMO_NIGHT_LIGHT, demoLight, hourLabel,
         LIGHTING_DEFAULTS,
         lightAt, moonIllumination, moonPhase, nightFloor, sanitizeLighting,
         twilightTint } from "./light.js";
import type { Lighting } from "./light.js";

const timer: Lighting = { mode: "timer", on: 8, off: 22, lamp: true };
const at = (h: number, m = 0): number => h * 60 + m;
const mid = (CLOCK_NIGHT_LIGHT + 1) / 2;

describe("lightAt", () => {
  it("is full daylight at noon and the night floor at 03:00", () => {
    expect(lightAt(at(12), timer)).toBe(1);
    expect(lightAt(at(3), timer)).toBe(CLOCK_NIGHT_LIGHT);
  });

  it("keeps clock nights bright enough to watch", () => {
    for (let m = 0; m < 24 * 60; m++)
      expect(lightAt(m, timer)!).toBeGreaterThanOrEqual(0.45);
  });

  it("ramps over the half hour after each switch time", () => {
    expect(lightAt(at(8), timer)).toBeCloseTo(CLOCK_NIGHT_LIGHT);
    expect(lightAt(at(8, 15), timer)).toBeCloseTo(mid);
    expect(lightAt(at(8, 30), timer)).toBe(1);
    expect(lightAt(at(22), timer)).toBeCloseTo(1);
    expect(lightAt(at(22, 15), timer)).toBeCloseTo(mid);
    expect(lightAt(at(22, 30), timer)).toBe(CLOCK_NIGHT_LIGHT);
    // Smooth: no minute-to-minute jump anywhere, midnight included.
    for (let m = 0; m < 24 * 60; m++)
      expect(Math.abs(lightAt(m, timer)! - lightAt(m + 1, timer)!))
        .toBeLessThan(0.03);
  });

  it("wraps an overnight schedule past midnight", () => {
    const night: Lighting = { mode: "timer", on: 20, off: 6, lamp: true };
    expect(lightAt(at(23), night)).toBe(1);
    expect(lightAt(at(2), night)).toBe(1);
    expect(lightAt(at(12), night)).toBe(CLOCK_NIGHT_LIGHT);
    expect(lightAt(at(6, 15), night)).toBeCloseTo(mid);
  });

  it("keeps the lights on in 'always' and for equal switch times", () => {
    const always: Lighting = { ...timer, mode: "always" };
    const same: Lighting = { mode: "timer", on: 9, off: 9, lamp: true };
    for (const h of [0, 3, 8, 12, 22])
      for (const s of [always, same]) expect(lightAt(at(h), s)).toBe(1);
  });

  it("leaves demo mode to the sim's cycle", () => {
    expect(lightAt(at(12), { ...timer, mode: "demo" })).toBeNull();
  });
});

describe("lamp", () => {
  it("holds every mode at the demo night floor while off", () => {
    for (const mode of ["demo", "timer", "always"] as const)
      expect(lightAt(at(12), { ...timer, mode, lamp: false }))
        .toBe(DEMO_NIGHT_LIGHT);
    expect(twilightTint({ ...timer, lamp: false }, at(8, 15), 0)).toBeNull();
    expect(sanitizeLighting({ lamp: false }).lamp).toBe(false);
    expect(sanitizeLighting({ lamp: "off" }).lamp).toBe(true);
  });
});

describe("nightFloor", () => {
  it("is the timer's brighter floor only while the timer lights the tank", () => {
    expect(nightFloor(timer)).toBe(CLOCK_NIGHT_LIGHT);
    expect(nightFloor({ ...timer, mode: "demo" })).toBe(DEMO_NIGHT_LIGHT);
    expect(nightFloor({ ...timer, lamp: false })).toBe(DEMO_NIGHT_LIGHT);
  });
});

describe("demoLight", () => {
  it("opens in daylight and spans 0.3..1 periodically", () => {
    expect(demoLight(0)).toBe(1);
    expect(demoLight(0.25)).toBe(demoLight(1.25));
    let min = 1;
    for (let i = 0; i < 1000; i++) min = Math.min(min, demoLight(i / 1000));
    expect(min).toBeCloseTo(0.3);
  });
});

describe("twilightTint", () => {
  it("warms the timer's ramps and nothing else", () => {
    expect(twilightTint(timer, at(12), 0)).toBeNull();
    expect(twilightTint(timer, at(3), 0)).toBeNull();
    const dawn = twilightTint(timer, at(8, 15), 0)!;
    const dusk = twilightTint(timer, at(22, 15), 0)!;
    expect(dawn.a).toBeGreaterThan(0.1);
    expect(dusk.a).toBeCloseTo(dawn.a);
    expect(dusk.g).toBeLessThan(dawn.g); // dusk is redder
    expect(twilightTint({ ...timer, mode: "always" }, at(8, 15), 0))
      .toBeNull();
  });

  it("follows the demo cycle's ramps in demo mode", () => {
    const demo: Lighting = { ...timer, mode: "demo" };
    expect(twilightTint(demo, 0, 0)).toBeNull(); // 10:00, full day
    // 9/24 of the cycle is 19:00 on its virtual clock, mid dusk.
    expect(twilightTint(demo, 0, 9 / 24)!.a).toBeGreaterThan(0.1);
  });
});

describe("moon", () => {
  const newMoon = Date.UTC(2000, 0, 6, 18, 14);
  const day = 24 * 3600 * 1000;
  const month = 29.530588853 * day;
  it("is dark at the reference new moon and full half a month later", () => {
    expect(moonPhase(newMoon)).toBeCloseTo(0, 5);
    expect(moonPhase(newMoon + month / 2)).toBeCloseTo(0.5, 5);
    expect(moonIllumination(newMoon)).toBeCloseTo(0, 5);
    expect(moonIllumination(newMoon + month / 2)).toBeCloseTo(1, 5);
    expect(moonIllumination(newMoon + month)).toBeCloseTo(0, 5);
  });

  it("is half lit at the quarters, years later too", () => {
    const later = newMoon + 300 * month;
    expect(moonIllumination(later + month / 4)).toBeCloseTo(0.5, 5);
    expect(moonIllumination(later - month / 4)).toBeCloseTo(0.5, 5);
  });
});

describe("sanitizeLighting", () => {
  it("falls back field by field", () => {
    expect(sanitizeLighting(null)).toEqual(LIGHTING_DEFAULTS);
    expect(sanitizeLighting({ mode: "timer", on: 7, off: 24 }))
      .toEqual({ mode: "timer", on: 7, off: 22, lamp: true });
    expect(sanitizeLighting({ mode: "disco", on: 7.5, off: "22" }))
      .toEqual(LIGHTING_DEFAULTS);
    expect(sanitizeLighting({ off: 23 }, timer)).toEqual({ ...timer, off: 23 });
  });

  it("formats hours as clock times", () => {
    expect(hourLabel(8)).toBe("08:00");
    expect(hourLabel(22)).toBe("22:00");
  });

  it("clamps out-of-range hours instead of printing nonsense", () => {
    expect(hourLabel(8.5)).toBe("08:00");
    expect(hourLabel(NaN)).toBe("00:00");
    expect(hourLabel(25)).toBe("23:00");
    expect(hourLabel(-3)).toBe("00:00");
  });
});
