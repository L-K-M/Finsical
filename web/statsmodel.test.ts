import { describe, expect, it } from "vitest";
import { deriveStats, hungerLabel, trend, uptime } from "./statsmodel.js";

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
    expect(s.advice.length).toBeLessThanOrEqual(2);
  });

  it("counts night phase and bubbles", () => {
    const s = deriveStats({ ...base, light: 0.3, bubbles: 4 });
    expect(s.phase).toBe("night");
    expect(s.bubbles).toBe(4);
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
  });
});
