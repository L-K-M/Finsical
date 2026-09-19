import { describe, expect, it } from "vitest";
import { DAY_TICKS, FOOD_ROT_TICKS, Sim } from "./sim.js";

describe("Sim", () => {
  it("is deterministic for a given seed", () => {
    const a = new Sim({ width: 320, height: 200 }, 42);
    const b = new Sim({ width: 320, height: 200 }, 42);
    a.addFish({ x: 100, y: 100 });
    b.addFish({ x: 100, y: 100 });
    a.dropFood(150);
    b.dropFood(150);
    for (let i = 0; i < 500; i++) {
      a.tick();
      b.tick();
    }
    expect(a.fish[0]).toEqual(b.fish[0]);
    expect(a.food).toEqual(b.food);
  });

  it("keeps fish inside the tank", () => {
    const sim = new Sim({ width: 320, height: 200 }, 7);
    sim.addFish({ x: 160, y: 100, speed: 2 });
    for (let i = 0; i < 5000; i++) sim.tick();
    const f = sim.fish[0]!;
    expect(f.x).toBeGreaterThanOrEqual(16);
    expect(f.x).toBeLessThanOrEqual(304);
    expect(f.y).toBeGreaterThanOrEqual(26); // SURFACE + MARGIN
    expect(f.y).toBeLessThanOrEqual(188); // height - BOTTOM_PAD
  });

  it("turns around at the walls", () => {
    const sim = new Sim({ width: 100, height: 100 }, 3);
    sim.addFish({ x: 76, y: 50, facing: 1, speed: 2 });
    for (let i = 0; i < 25; i++) sim.tick();
    expect(sim.fish[0]!.facing).toBe(-1);
  });

  it("sinks food to the gravel", () => {
    const sim = new Sim({ width: 200, height: 100 }, 1);
    sim.dropFood(50);
    for (let i = 0; i < 500; i++) sim.tick();
    // rests at the gravel line (may overshoot the exact bound by < FOOD_SINK)
    expect(sim.food[0]!.y).toBeGreaterThanOrEqual(100 - 12);
    expect(sim.food[0]!.y).toBeLessThan(100 - 12 + 0.4);
  });

  it("hungry fish seeks and eats food", () => {
    const sim = new Sim({ width: 200, height: 100 }, 5);
    const f = sim.addFish({ x: 40, y: 50, hunger: 0.9 });
    sim.dropFood(120);
    for (let i = 0; i < 2000 && sim.food.length; i++) sim.tick();
    expect(sim.food.length).toBe(0);
    expect(f.hunger).toBeLessThan(0.2);
  });

  it("full fish ignores food", () => {
    const sim = new Sim({ width: 200, height: 100 }, 5);
    const f = sim.addFish({ x: 40, y: 50, hunger: 0 });
    sim.dropFood(60);
    for (let i = 0; i < 200; i++) sim.tick();
    expect(f.state).toBe("drift");
    expect(sim.food.length).toBe(1);
  });

  it("tap startles nearby fish only", () => {
    const sim = new Sim({ width: 300, height: 200 }, 9);
    const near = sim.addFish({ x: 100, y: 100 });
    const far = sim.addFish({ x: 280, y: 180 });
    sim.tap(90, 100);
    expect(near.state).toBe("startle");
    expect(far.state).toBe("drift");
    for (let i = 0; i < 60; i++) sim.tick();
    expect(near.state).toBe("drift"); // calms down
  });

  it("uneaten food rots on the gravel, fouling then losing the pellet", () => {
    const sim = new Sim({ width: 200, height: 100 }, 1);
    sim.dropFood(50);
    let minQ = 1;
    for (let i = 0; i < FOOD_ROT_TICKS + 600; i++) {
      sim.tick();
      minQ = Math.min(minQ, sim.waterQuality);
    }
    expect(sim.food.length).toBe(0); // fully dissolved
    expect(minQ).toBeLessThan(1);    // rotting drained quality
    // filtration already recovering by the time the pellet is gone
    expect(sim.waterQuality).toBeGreaterThan(minQ);
  });

  it("filtration recovers water quality toward 1", () => {
    const sim = new Sim({ width: 100, height: 100 }, 1);
    sim.waterQuality = 0.2;
    for (let i = 0; i < 1200; i++) sim.tick();
    expect(sim.waterQuality).toBeCloseTo(0.3, 5); // +1/12000 per tick
    sim.waterQuality = 1;
    sim.tick();
    expect(sim.waterQuality).toBeLessThanOrEqual(1); // clamped
  });

  it("keeps quality >= 0 under heavy rot", () => {
    const sim = new Sim({ width: 300, height: 100 }, 1);
    for (let i = 0; i < 8; i++) sim.dropFood(20 + i * 30);
    for (let i = 0; i < FOOD_ROT_TICKS + 600; i++) sim.tick();
    expect(sim.waterQuality).toBeGreaterThanOrEqual(0);
  });

  it("fish lose their appetite in foul water", () => {
    const sim = new Sim({ width: 200, height: 100 }, 5);
    const f = sim.addFish({ x: 40, y: 50, hunger: 0.9 });
    sim.waterQuality = 0.1; // below QUALITY_SEEK even after filtration drift
    sim.dropFood(120);
    for (let i = 0; i < 600; i++) sim.tick();
    expect(f.state).toBe("drift"); // never seeks despite hunger
    expect(sim.food.length).toBe(1);
  });

  it("fish move slower in foul water", () => {
    const clean = new Sim({ width: 300, height: 200 }, 11);
    const foul = new Sim({ width: 300, height: 200 }, 11);
    clean.addFish({ x: 150, y: 100, speed: 1 });
    foul.addFish({ x: 150, y: 100, speed: 1 });
    let dc = 0, df = 0;
    let pc = { x: 150, y: 100 }, pf = { x: 150, y: 100 };
    for (let i = 0; i < 1000; i++) {
      clean.tick(); foul.tick();
      foul.waterQuality = 0; // pin low — filtration would creep it up
      const c = clean.fish[0]!, f = foul.fish[0]!;
      dc += Math.hypot(c.x - pc.x, c.y - pc.y);
      df += Math.hypot(f.x - pf.x, f.y - pf.y);
      pc = { x: c.x, y: c.y }; pf = { x: f.x, y: f.y };
    }
    expect(df).toBeLessThan(dc * 0.7); // vigor 0.5 vs 1.0
  });

  it("day/night light oscillates in [0,1]", () => {
    const sim = new Sim({ width: 100, height: 100 }, 1);
    let min = 1, max = 0;
    for (let i = 0; i < DAY_TICKS; i++) {
      sim.tick();
      min = Math.min(min, sim.light);
      max = Math.max(max, sim.light);
    }
    expect(min).toBeGreaterThanOrEqual(0.15);
    expect(max).toBeLessThanOrEqual(1);
    expect(max - min).toBeGreaterThan(0.5);
  });
});
