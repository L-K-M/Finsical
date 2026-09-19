import { describe, expect, it } from "vitest";
import { DAY_TICKS, FOOD_ROT_TICKS, Sim, TURN_TICKS } from "./sim.js";

// States a fish may be in when it's not seeking food.
const IDLE_STATES = ["drift", "turn"];

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
    expect(IDLE_STATES).toContain(f.state);
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
    expect(IDLE_STATES).toContain(f.state); // never seeks
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

  it("darts out of each decision — quadratic ramp capped at cruise", () => {
    const sim = new Sim({ width: 320, height: 200 }, 7);
    const f = sim.addFish({ x: 60, y: 100, cruise: 1.4 });
    // Pin a distant target so the whole tick is the acceleration stroke.
    f.tx = 300; f.ty = 100; f.phase = 0; f.latch = -1;
    const speeds = [f.speed];
    for (let i = 0; i < 10; i++) { sim.tick(); speeds.push(f.speed); }
    // Quadratic ramp: deltas grow early, then the cruise cap flattens it.
    expect(speeds[4]! - speeds[3]!).toBeGreaterThan(speeds[2]! - speeds[1]!);
    expect(Math.max(...speeds)).toBeLessThanOrEqual(1.4 + 1e-9);
    expect(speeds[10]).toBeCloseTo(1.4, 5);
  });

  it("latches the brake and glides into its destination", () => {
    const sim = new Sim({ width: 320, height: 200 }, 7);
    const f = sim.addFish({ x: 60, y: 100, cruise: 2 });
    f.tx = 90; f.ty = 100; f.phase = 10; f.latch = -1; // mid-dart, 30px out
    const braking: number[] = [];
    for (let i = 0; i < 20 && braking.length < 3; i++) {
      sim.tick();
      if (f.latch >= 0) braking.push(f.speed);
    }
    expect(braking.length).toBe(3);         // brake latch engaged
    expect(braking[2]!).toBeLessThan(braking[0]!); // quadratic decay
  });

  it("curves toward its target — steering, not snapping", () => {
    const sim = new Sim({ width: 320, height: 200 }, 7);
    const f = sim.addFish({ x: 160, y: 100, heading: 0 });
    f.tx = 40; f.ty = 160; f.phase = 0; f.latch = -1; // behind and below
    const h0 = f.heading;
    sim.tick();
    const turn = f.heading - h0;
    expect(turn).toBeGreaterThan(0);                 // rotating toward π
    expect(turn).toBeLessThanOrEqual(Math.PI / 20 + 1e-9); // rate-capped
    // and facing only flips once the heading passes vertical
    expect(f.facing).toBe(1);
  });

  it("re-decides when the movement budget expires", () => {
    const sim = new Sim({ width: 320, height: 200 }, 7);
    const f = sim.addFish({ x: 60, y: 100 });
    f.tx = 300; f.ty = 30; f.phase = 0; f.latch = -1;
    for (let i = 0; i < 40; i++) sim.tick();
    // After 32 ticks the phase must have wrapped — a new decision ran.
    expect(f.phase).toBeLessThan(32);
  });

  it("tap startle fades with distance and panic propagates", () => {
    const sim = new Sim({ width: 300, height: 200 }, 9);
    const close = sim.addFish({ x: 75, y: 100 });   // 15px from tap
    const near = sim.addFish({ x: 100, y: 100 });   // 40px — weaker dart
    const bystander = sim.addFish({ x: 125, y: 100 }); // outside tap radius
    sim.tap(60, 100);
    expect(close.state).toBe("startle");
    expect(close.speed).toBeGreaterThan(near.speed); // distance-scaled
    expect(bystander.state).toBe("drift");           // outside tap radius
    for (let i = 0; i < 10 && bystander.state !== "startle"; i++)
      sim.tick();
    expect(bystander.state).toBe("startle"); // panic propagated
    // Propagated darts are capped at half tap strength (3.5 * 0.5);
    // the bystander is outside the tap radius, so only propagation
    // could have startled it.
    expect(bystander.speed).toBeLessThanOrEqual(1.75);
  });

  it("caps panic propagation at two hops", () => {
    const sim = new Sim({ width: 400, height: 100 }, 5);
    // The tap radius (48px) directly startles the first two fish (hop 0);
    // every fish beyond that is one more hop, 24px apart (< PROP_RADIUS 32).
    sim.addFish({ x: 60, y: 46 });   // hop 0 (direct; off the tap
                                     // point so the dart direction
                                     // is well-defined)
    sim.addFish({ x: 84, y: 50 });   // hop 0 (direct — inside tap radius)
    sim.addFish({ x: 108, y: 50 });              // hop 1
    const hop2 = sim.addFish({ x: 132, y: 50 }); // hop 2 — last allowed
    const far = sim.addFish({ x: 156, y: 50 });  // hop 3 — beyond the cap
    sim.tap(60, 50);
    let everStartled = false;
    let waveReachedCap = false;
    for (let i = 0; i < 30 && !everStartled; i++) {
      sim.tick();
      everStartled = far.state === "startle";
      if (hop2.state === "startle") waveReachedCap = true;
    }
    expect(waveReachedCap).toBe(true); // wave must reach the last allowed hop
    expect(everStartled).toBe(false);
  });

  it("rolls through a turn when the destination is behind it", () => {
    const sim = new Sim({ width: 300, height: 100 }, 7);
    // At the right wall facing right — every wander target is behind.
    const f = sim.addFish({ x: 284, y: 50, facing: 1, heading: 0 });
    f.tx = 284; f.ty = 50; f.phase = 32; // decide fires on this tick
    sim.tick();
    expect(f.state).toBe("turn");
    const seen = new Set<number>();
    for (let i = 0; i < TURN_TICKS; i++) {
      sim.tick();
      seen.add(f.facing);
    }
    expect(f.state).toBe("drift");   // roll completed
    expect(seen.size).toBe(2);       // facing flipped at edge-on
    expect(f.facing).toBe(-1);       // ends facing the new way
  });

  it("rolls once toward food dropped behind it, then seeks", () => {
    const sim = new Sim({ width: 300, height: 100 }, 7);
    const f = sim.addFish({ x: 280, y: 50, facing: 1, heading: 0,
                            hunger: 0.9 });
    sim.dropFood(245); // behind the fish
    sim.tick();
    expect(f.state).toBe("turn");    // reversal rolls, doesn't snap
    const dir = f.turnDir;
    for (let i = 0; i < TURN_TICKS - 1; i++) {
      sim.tick();
      expect(f.state).toBe("turn");  // roll plays through, no churn
      expect(f.turnDir).toBe(dir);
    }
    sim.tick();
    expect(f.state).not.toBe("turn");
    expect(f.facing).toBe(-1);       // ends facing the food
  });

  it("seeks without rolling when food is ahead", () => {
    const sim = new Sim({ width: 300, height: 100 }, 11);
    const f = sim.addFish({ x: 50, y: 50, facing: 1, heading: 0,
                            hunger: 0.9 });
    sim.dropFood(200); // ahead of the fish
    sim.tick();
    expect(f.state).toBe("seek");
    expect(f.turnFrom).toBe(1); // untouched — no roll began
  });

  it("starts a roll without snapping heading when food is behind", () => {
    const sim = new Sim({ width: 300, height: 100 }, 11);
    const f = sim.addFish({ x: 200, y: 50, facing: 1, heading: 0,
                            hunger: 0.9 });
    sim.dropFood(50); // behind the fish
    sim.tick();
    expect(f.state).toBe("turn");
    expect(f.heading).toBe(0); // roll drifts on the old heading
  });
});
