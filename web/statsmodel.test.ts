import { describe, expect, it } from "vitest";
import { deriveStats, hungerLabel, trend, uptime } from "./statsmodel.js";
import { DAY_TICKS, Sim } from "../core/sim.js";

const base = {
  fish: [
    { species: "Guppy", hunger: 0.2, state: "drift" },
    { species: "Angel", hunger: 0.6, state: "seek" },
  ],
  waterQuality: 0.9, food: 0, foodSettled: 0, bubbles: 0,
  light: 1, tickCount: 30 * 60 * 90, // 90 min
};

describe("deriveStats", () => {
  it("averages hunger across fish and finds the hungriest", () => {
    const s = deriveStats(base);
    expect(s.fishCount).toBe(2);
    expect(s.avgHunger).toBeCloseTo(0.4);
    expect(s.hungriest).toEqual({ name: "Angel", hunger: 0.6 });
    expect(s.seeking).toBe(1);
    expect(s.waterPct).toBe(90);
    expect(s.phase).toBe("day");
    expect(s.uptimeMin).toBe(90);
  });

  it("handles an empty tank", () => {
    const s = deriveStats({ ...base, fish: [] });
    expect(s.avgHunger).toBeNull();
    expect(s.hungriest).toBeNull();
    expect(s.advice[0]).toMatch(/No fish/);
  });

  it("tolerates missing fields", () => {
    const s = deriveStats({});
    expect(s.fishCount).toBe(0);
    expect(s.waterPct).toBe(100);
    expect(s.food).toBe(0);
  });

  it("warns about foul water before hunger advice", () => {
    const s = deriveStats({ ...base, waterQuality: 0.2 });
    expect(s.advice[0]).toMatch(/foul/);
    expect(s.advice[0]).toMatch(/won't eat/);
  });

  it("suppresses feeding advice while water is foul", () => {
    const s = deriveStats({
      ...base, waterQuality: 0.2,
      fish: [{ species: "Guppy", hunger: 0.9, state: "drift" }],
    });
    expect(s.advice.join(" ")).not.toMatch(/hungry|starving/);
  });

  it("flags rotting food as an overfeeding hint", () => {
    const s = deriveStats({ ...base, waterQuality: 0.6, foodSettled: 2 });
    expect(s.advice.some((a) => /rotting/.test(a))).toBe(true);
  });

  it("doesn't contradict itself when foul water sank the food", () => {
    // Below QUALITY_SEEK the advice is already "stop feeding" — the
    // portion-size hint must not stack a "feed a little less" beside it.
    const s = deriveStats({ ...base, waterQuality: 0.2, foodSettled: 2 });
    expect(s.advice.join(" ")).toMatch(/Stop feeding/);
    expect(s.advice.join(" ")).not.toMatch(/rotting/);
  });

  it("advises feeding when the tank is hungry", () => {
    const s = deriveStats({
      ...base,
      fish: [{ hunger: 0.7, state: "seek" }, { hunger: 0.5, state: "drift" }],
    });
    expect(s.advice[0]).toMatch(/hungry/);
  });

  it("names a starving fish even when the average is fine", () => {
    const s = deriveStats({
      ...base,
      fish: [{ species: "Betta", hunger: 0.95, state: "drift" },
             { hunger: 0.1, state: "drift" }],
    });
    expect(s.advice[0]).toMatch(/Betta.*starving/);
  });

  it("reports healthy when nothing needs doing", () => {
    expect(deriveStats(base).advice[0]).toMatch(/healthy/);
  });

  it("caps advice at two lines, most urgent first", () => {
    const s = deriveStats({ ...base, waterQuality: 0.2, foodSettled: 3 });
    expect(s.advice[0]).toMatch(/foul/); // most urgent first
    expect(s.advice.length).toBeLessThanOrEqual(2);
  });

  it("counts night phase and bubbles", () => {
    const s = deriveStats({ ...base, light: 0.3, bubbles: 4 });
    expect(s.phase).toBe("night");
    expect(s.bubbles).toBe(4);
  });

  it("reads night for a real share of the demo cycle", () => {
    const sim = new Sim({ width: 100, height: 100 }, 1);
    let night = 0;
    for (let i = 0; i < DAY_TICKS; i++) {
      sim.tick();
      if (deriveStats({ ...base, light: sim.light }).phase === "night")
        night++;
    }
    expect(night / DAY_TICKS).toBeGreaterThanOrEqual(0.3);
  });

  it("names the next switch under the light timer", () => {
    const timer = { mode: "timer", on: 8, off: 22 };
    expect(deriveStats({ ...base, light: 0.45, lighting: timer }).lightLabel)
      .toBe("Night (lights on at 08:00)");
    expect(deriveStats({ ...base, light: 1, lighting: timer }).lightLabel)
      .toBe("Day (lights off at 22:00)");
    for (const lighting of [undefined, { ...timer, mode: "demo" },
                            { ...timer, mode: "always" },
                            { ...timer, on: 9, off: 9 }])
      expect(deriveStats({ ...base, light: 0.3, lighting }).lightLabel)
        .toBe("Night");
  });
});

describe("labels", () => {
  it("uptime", () => {
    expect(uptime(0)).toBe("0m");
    expect(uptime(59)).toBe("59m");
    expect(uptime(90)).toBe("1h 30m");
  });
  it("hungerLabel", () => {
    expect(hungerLabel(0.1)).toBe("full");
    expect(hungerLabel(0.5)).toBe("peckish");
    expect(hungerLabel(0.9)).toBe("hungry");
  });
  it("trend", () => {
    expect(trend(null, 0.5)).toBe("→");
    expect(trend(0.5, 0.51)).toBe("→"); // dead zone
    expect(trend(0.5, 0.6)).toBe("↑");
    expect(trend(0.5, 0.4)).toBe("↓");
    expect(trend(0.5, NaN)).toBe("→"); // malformed sample reads steady
  });

  it("treats NaN waterQuality as missing", () => {
    const s = deriveStats({ ...base, waterQuality: NaN });
    expect(s.waterPct).toBe(100);
    expect(s.advice.join()).not.toMatch(/foul|rotting/);
  });

  it("treats NaN light as day", () => {
    expect(deriveStats({ ...base, light: NaN }).phase).toBe("day");
  });

  it("treats NaN counters as zero", () => {
    const s = deriveStats({ ...base, foodSettled: NaN, bubbles: NaN,
                            tickCount: NaN });
    expect(s.foodSettled).toBe(0);
    expect(s.bubbles).toBe(0);
    expect(s.uptimeMin).toBe(0);
    // A NaN must not silently suppress the rotting-food hint — zero
    // genuinely means none settled, so this just mustn't read "NaN".
  });
});
