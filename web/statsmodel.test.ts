import { describe, expect, it } from "vitest";
import { curesFor, deriveStats, deriveWater, hungerLabel, SPARK_H, SPARK_SLOT_MS, SPARK_W,
         sparkColumns, sparkRow, summaryText, trend, uptime } from "./statsmodel.js";
import { DAY_TICKS, Sim } from "../core/sim.js";
import { HUNGER_SEEK } from "../core/tuning.js";

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
    // "peckish" starts where the sim's fish start looking for food.
    expect(hungerLabel(HUNGER_SEEK - 0.01)).toBe("full");
    expect(hungerLabel(HUNGER_SEEK)).toBe("peckish");
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

describe("sparkline", () => {
  it("keeps a full-scale line off the frame's top edge", () => {
    // Row 0 sits under the 1 px border: 100% water vanished into it.
    expect(sparkRow(1)).toBe(1);
    expect(sparkRow(0)).toBe(SPARK_H - 2);
    expect(sparkRow(7)).toBe(1); // clamped
  });

  it("lays samples out by time, not by push", () => {
    const now = 100_000;
    // Two pushes in one slot (another window said hello) draw one
    // column, the later one; a column holds until the next sample.
    const cols = sparkColumns([
      { t: now - 10_500, v: 0.2 }, { t: now - 10_100, v: 0.4 },
      { t: now, v: 0.5 },
    ], now);
    expect(cols).toHaveLength(SPARK_W);
    const first = SPARK_W - 1 - Math.floor(10_000 / SPARK_SLOT_MS);
    expect(cols[first - 1]).toBeUndefined(); // before the first sample
    expect(cols[first]).toBe(0.4);
    expect(cols[first + 1]).toBe(0.4);
    expect(cols[SPARK_W - 1]).toBe(0.5);
  });

  it("shows a missing sample as a gap", () => {
    const now = 100_000;
    const cols = sparkColumns([
      { t: now - 2 * SPARK_SLOT_MS, v: 0.5 },
      { t: now - SPARK_SLOT_MS, v: null }, { t: now, v: 0.5 },
    ], now);
    expect(cols[SPARK_W - 2]).toBeNull();
  });
});

describe("care from the life model", () => {
  const water = { litres: 100, temp: 26, pH: 7, gH: 4, o2: 8, oxygenSat: 1,
                  co2: 15, nitrate: 0, ammonia: 0, chlorine: 0,
                  filterDirt: 10, speed: 1, days: 3 };

  it("reads the water, checking every number", () => {
    const w = deriveWater({ ...water, pH: NaN, doses: [{ id: 1100, ml: 30.4 },
                                                       { id: 1 }] })!;
    expect(w.pH).toBe(7);
    expect(w.doses).toEqual([{ name: "Green Remedy", ml: 30 }]);
    expect(deriveWater(undefined)).toBeNull();
  });

  it("puts the dead first, then the sick with their cure", () => {
    const s = deriveStats({ ...base, aquarium: water, fish: [
      { species: "Guppy", hunger: 0.2, state: "drift", sick: 3 },
      { species: "Angel", hunger: 0, state: "dead", dead: 12 },
    ] });
    expect(s.fishCount).toBe(1);
    expect(s.dead).toBe(1);
    expect(s.advice[0]).toMatch(/dead fish/);
    expect(s.advice[1]).toBe(
      "Guppy has Chilodonella — treat the tank with Green Remedy.");
  });

  it("warns about chlorine, ammonia, nitrate and a clogged filter", () => {
    const hint = (a: object): string =>
      deriveStats({ ...base, aquarium: { ...water, ...a } }).advice[0]!;
    expect(hint({ chlorine: 1.1 })).toMatch(/chlorine/);
    expect(hint({ ammonia: 2 })).toMatch(/Ammonia/);
    expect(hint({ nitrate: 30 })).toMatch(/Nitrate/);
    expect(hint({ filterDirt: 90 })).toMatch(/clogging/);
  });

  it("knows which medicines cure what", () => {
    expect(curesFor(0)).toEqual(["Green Remedy", "Methylene Blue"]);
    expect(curesFor(5)).toEqual(["Rust Remedy"]);
    expect(curesFor(7)).toEqual([]);
  });
});

describe("summaryText", () => {
  it("compresses the window rows into a few plain-text lines", () => {
    const text = summaryText(deriveStats({
      ...base, food: 3, foodSettled: 1, waterQuality: 0.5,
    }));
    const lines = text.split("\n");
    expect(lines[0]).toBe(
      "Tank Stats — 2 fish, 1 seeking food; water 50%; " +
      "avg hunger 40%; up 1h 30m");
    expect(lines[1]).toBe("Hungriest: Angel — peckish");
    expect(lines[2]).toBe("Food: 3 pellets, 1 rotting · Light: Day");
    expect(lines[3]).toMatch(/^Care: /);
  });

  it("handles an empty tank", () => {
    const text = summaryText(deriveStats({ fish: [], tickCount: 0 }));
    expect(text.split("\n")[0]).toContain("0 fish");
    expect(text).toContain("no hunger data");
    expect(text).toContain("Hungriest: —");
  });
});
