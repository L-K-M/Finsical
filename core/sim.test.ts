import { describe, expect, it } from "vitest";
import { Sim } from "./sim.js";

describe("Sim", () => {
  it("is deterministic for a given seed", () => {
    const a = new Sim({ width: 320, height: 200 }, 42);
    const b = new Sim({ width: 320, height: 200 }, 42);
    a.addFish({ x: 100, y: 100, facing: 1, speed: 1 });
    b.addFish({ x: 100, y: 100, facing: 1, speed: 1 });
    for (let i = 0; i < 500; i++) {
      a.tick();
      b.tick();
    }
    expect(a.fish[0]).toEqual(b.fish[0]);
  });

  it("keeps fish inside the tank", () => {
    const sim = new Sim({ width: 320, height: 200 }, 7);
    sim.addFish({ x: 160, y: 100, facing: 1, speed: 2 });
    for (let i = 0; i < 5000; i++) sim.tick();
    const f = sim.fish[0]!;
    expect(f.x).toBeGreaterThanOrEqual(0);
    expect(f.x).toBeLessThanOrEqual(320);
  });

  it("turns around at the walls", () => {
    const sim = new Sim({ width: 100, height: 100 }, 3);
    sim.addFish({ x: 90, y: 50, facing: 1, speed: 1 });
    for (let i = 0; i < 60; i++) sim.tick();
    expect(sim.fish[0]!.facing).toBe(-1);
  });
});
