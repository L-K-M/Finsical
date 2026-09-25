import { describe, expect, it } from "vitest";
import { BAND_HALF, BOTTOM_PAD, DAY_TICKS, FOOD_ROT_TICKS, MARGIN,
         MAX_UNEATEN, NOTICE_RADIUS, PELLET_UNITS, Sim, SLEEP_LIGHT,
         SURFACE,
         TURN_TICKS, WAKE_LIGHT } from "./sim.js";
import { FISH_CAP, HUNGER_SEEK, QUALITY_SEEK, SPAWN_HUNGER }
  from "./tuning.js";
import { CLOCK_NIGHT_LIGHT } from "./light.js";
import { pitch } from "./pose.js";

// States a fish may be in when it's not seeking food.
const IDLE_STATES = ["drift", "turn"];
const GASP_SLACK = 8; // per-fish id offset at full gasp (see sim.ts)
const TRANSIT = 8;    // ~1 tick of upward travel while converging

/** Mean distance between two fish of the given species over ticks
 * 2000-6000 (after the wander settles), from opposite corners. */
function pairDistance(seed: number, a: string, b: string): number {
  const sim = new Sim({ width: 320, height: 200 }, seed);
  sim.addFish({ x: 60, y: 60, species: a });
  sim.addFish({ x: 260, y: 160, species: b });
  let sum = 0, n = 0;
  for (let i = 0; i < 6000; i++) {
    sim.tick();
    if (i < 2000) continue;
    const [p, q] = sim.fish;
    sum += Math.hypot(p!.x - q!.x, p!.y - q!.y);
    n++;
  }
  return sum / n;
}

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

  it("defaults each missing or non-finite target field on its own", () => {
    const sim = new Sim({ width: 320, height: 200 });
    const plain = sim.addFish({ x: 50, y: 60 });
    expect([plain.tx, plain.ty, plain.bandY]).toEqual([50, 60, 60]);
    // A caller giving only tx must not leave ty at 0 (the surface).
    const onlyTx = sim.addFish({ x: 50, y: 60, tx: 100 });
    expect([onlyTx.tx, onlyTx.ty]).toEqual([100, 60]);
    const bad = sim.addFish({ x: 50, y: 60, tx: NaN, ty: 5, bandY: NaN });
    expect([bad.tx, bad.ty, bad.bandY]).toEqual([50, 5, 60]);
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

  it("keeps a big fish's body inside the glass", () => {
    // An adult ryukin at the tank's art scale: 100 x 67.
    const sim = new Sim({ width: 320, height: 200 }, 7);
    sim.addFish({ x: 160, y: 100, speed: 2, scale: 1, halfW: 50, halfH: 33 });
    for (let i = 0; i < 5000; i++) {
      sim.tick();
      const f = sim.fish[0]!;
      expect(f.x).toBeGreaterThanOrEqual(40);    // 0.8 * halfW
      expect(f.x).toBeLessThanOrEqual(280);
      expect(f.y).toBeGreaterThanOrEqual(36.4);  // SURFACE + 0.8 * halfH
      expect(f.y).toBeLessThanOrEqual(173.6);    // height - 0.8 * halfH
    }
  });

  it("lets a big fish eat a settled pellet it can't sink to", () => {
    // A ryukin (67 tall), and a discus as tall as the height cap lets
    // a fish get: its floor clamp sits farthest above the gravel.
    for (const halfH of [33, 45, 60]) {
      const sim = new Sim({ width: 320, height: 200 }, 5);
      const f = sim.addFish({ x: 60, y: 120, hunger: 0, scale: 1,
                              halfW: 50, halfH });
      const pellet = sim.dropFood(200)!;
      // Sated until the pellet has settled on the gravel.
      let wait = 0;
      while (!sim.food[0]?.settled && ++wait < 5000) sim.tick();
      expect(wait, `halfH ${halfH}: pellet settled`).toBeLessThan(5000);
      f.hunger = 1;
      for (let i = 0; i < 3000 && !pellet.eaten; i++) sim.tick();
      expect(pellet.eaten, `halfH ${halfH}`).toBe(true);
      expect(f.hunger, `halfH ${halfH}`).toBeLessThan(1);
    }
  });

  it("lets a wide fish eat a pellet against the side glass", () => {
    // Its centre keeps 0.8 halfW off the glass, farther than a pellet
    // dropped at the wall; the reach has to span that gap too.
    for (const drop of [0, 320]) {
      const sim = new Sim({ width: 320, height: 200 }, 5);
      sim.addFish({ x: 160, y: 100, hunger: 1, scale: 1,
                    halfW: 90, halfH: 30 });
      const pellet = sim.dropFood(drop)!;
      for (let i = 0; i < 3000 && !pellet.eaten; i++) sim.tick();
      expect(pellet.eaten, `drop at ${drop}`).toBe(true);
    }
  });

  it("blows bubbles from a big fish's mouth", () => {
    const sim = new Sim({ width: 320, height: 200 }, 11);
    const f = sim.addFish({ x: 160, y: 100, scale: 1, halfW: 40, halfH: 20 });
    for (let i = 0; i < 4000 && !sim.bubbles.length; i++) {
      sim.tick();
      if (sim.bubbles.length) {
        expect(Math.abs(sim.bubbles[0]!.x - f.x)).toBeGreaterThanOrEqual(36);
      }
    }
    expect(sim.bubbles.length).toBeGreaterThan(0);
  });

  it("turns around at the walls", () => {
    const sim = new Sim({ width: 100, height: 100 }, 3);
    sim.addFish({ x: 76, y: 50, facing: 1, speed: 2 });
    for (let i = 0; i < 25; i++) sim.tick();
    expect(sim.fish[0]!.facing).toBe(-1);
  });

  it("drops food off the side glass and says where it went in", () => {
    const sim = new Sim({ width: 320, height: 200 });
    const pellet = sim.dropFood(2)!;
    expect(pellet).toBe(sim.food[0]);
    expect(pellet.x).toBeGreaterThan(2); // clamped away from the wall
    expect(sim.dropFood(160)!.x).toBe(160);
  });

  it("sinks food to the gravel", () => {
    const sim = new Sim({ width: 200, height: 100 }, 1);
    sim.dropFood(50);
    for (let i = 0; i < 500; i++) sim.tick();
    // rests at the gravel line (may overshoot the exact bound by < FOOD_SINK)
    expect(sim.food[0]!.y).toBeGreaterThanOrEqual(100 - 12);
    expect(sim.food[0]!.y).toBeLessThan(100 - 12 + 0.4);
  });

  it("a full stomach empties over 18 hours of tank time", () => {
    const sim = new Sim({ width: 200, height: 100 }, 5);
    const f = sim.addFish({ x: 40, y: 50, hunger: 0 });
    sim.advanceLife(60);                 // one minute at speed 1
    const l = f.life!;
    l.ate = l.stomach = 5;
    sim.advanceLife(60 * 60);
    expect(f.hunger).toBeLessThan(0.3);
    for (let h = 0; h < 18; h++) sim.advanceLife(60 * 60);
    expect(f.hunger).toBe(1);
  });

  it("drops a golden pellet about one time in fifty", () => {
    const sim = new Sim({ width: 320, height: 200 }, 9);
    let gold = 0;
    for (let i = 0; i < 500; i++) {
      sim.food.length = 0; // keep the tank clear; only the flag matters
      if (sim.dropFood(160)!.golden) gold++;
    }
    expect(gold).toBeGreaterThan(2);
    expect(gold).toBeLessThan(30);
  });

  it("a golden meal earns a victory roll", () => {
    const sim = new Sim({ width: 200, height: 100 }, 5);
    const f = sim.addFish({ x: 40, y: 50, hunger: 0.9 });
    const pellet = sim.dropFood(120)!;
    pellet.golden = true;
    for (let i = 0; i < 2000 && sim.food.length; i++) sim.tick();
    expect(sim.food.length).toBe(0);
    // Eaten, then rolling — the roll runs its TURN_TICKS course and
    // the fish comes out the other side facing the other way.
    expect(f.state).toBe("turn");
    const from = f.facing;
    let exited = -1;
    for (let i = 0; i < TURN_TICKS + 2; i++) {
      sim.tick();
      if (f.state !== "turn") { exited = i; break; }
    }
    expect(exited).toBeGreaterThanOrEqual(0); // the roll ran its course
    expect(f.facing).toBe((-from) as 1 | -1); // and flipped the profile
    // The fresh destination sits ahead of the new facing, not a
    // target the roll left behind it.
    expect((f.x - f.tx) * f.facing).toBeLessThanOrEqual(12);
  });

  it("hungry fish seeks and eats food", () => {
    const sim = new Sim({ width: 200, height: 100 }, 5);
    const f = sim.addFish({ x: 40, y: 50, hunger: 0.9 });
    sim.dropFood(120);
    for (let i = 0; i < 2000 && sim.food.length; i++) sim.tick();
    expect(sim.food.length).toBe(0);
    // A pellet nearly fills a small fish's stomach.
    expect(f.hunger).toBeLessThan(0.5);
  });

  it("puffs a bubble where a fish gulps a pellet", () => {
    // The gulp bubble marks the meal — it should appear at the
    // pellet's position the tick it's eaten, not just anywhere.
    const sim = new Sim({ width: 200, height: 100 }, 5);
    sim.addFish({ x: 40, y: 50, hunger: 0.9 });
    const fd = sim.dropFood(120)!;
    sim.bubbles.length = 0; // ambient spawns would muddy the position check
    let puff: { x: number; y: number } | undefined;
    for (let i = 0; i < 2000 && !fd.eaten; i++) {
      // Identity, not index: a same-tick pop would shift the array and
      // hide a bubble born at the eat.
      const before = new Set(sim.bubbles);
      sim.tick();
      // Only bubbles born on the eat tick count — an ambient drifter
      // passing the pellet mustn't satisfy the check.
      if (fd.eaten)
        puff = sim.bubbles.find(
          (b) => !before.has(b) &&
                 Math.abs(b.x - fd.x) < 2 && Math.abs(b.y - fd.y) < 2);
    }
    expect(puff).toBeDefined();
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

  it("uneaten food rots on the gravel and breaks up into the water", () => {
    const sim = new Sim({ width: 200, height: 100 }, 1);
    sim.fish.length = 0;
    for (let i = 0; i < 20; i++) sim.dropFood(20 + i * 8);
    for (let i = 0; i < FOOD_ROT_TICKS + 600; i++) sim.tick();
    expect(sim.food.length).toBe(0);
    // The uneaten cap refused all but MAX_UNEATEN of the 20 drops.
    expect(sim.aquarium.food).toBe(MAX_UNEATEN * PELLET_UNITS);
    // Dissolving over a few hours clouds the water...
    sim.advanceLife(3 * 3600);
    const cloudy = sim.waterQuality;
    expect(cloudy).toBeLessThan(1);
    // ...until the filter has trapped it.
    for (let d = 0; d < 20; d++) sim.advanceLife(24 * 3600);
    expect(sim.waterQuality).toBeGreaterThan(cloudy);
  });

  it("keeps quality >= 0 under heavy rot", () => {
    const sim = new Sim({ width: 300, height: 100 }, 1);
    for (let i = 0; i < 8; i++) sim.dropFood(20 + i * 30);
    for (let i = 0; i < FOOD_ROT_TICKS + 600; i++) sim.tick();
    expect(sim.waterQuality).toBeGreaterThanOrEqual(0);
  });

  it("refuses pellets past the uneaten cap, and eating frees a slot",
      () => {
    const sim = new Sim({ width: 320, height: 200 }, 1);
    for (let i = 0; i < MAX_UNEATEN; i++)
      expect(sim.dropFood(30 + i * 40)).not.toBeNull();
    expect(sim.dropFood(160)).toBeNull();
    expect(sim.food).toHaveLength(MAX_UNEATEN);
    sim.food[0]!.eaten = true; // eaten this tick frees a slot at once
    expect(sim.dropFood(160)).not.toBeNull();
  });

  it("a feeding spree can't foul the water fast", () => {
    const sim = new Sim({ width: 320, height: 200 }, 1);
    for (let i = 0; i < 20; i++) sim.dropFood(20 + i * 15);
    for (let i = 0; i < 30 * 60; i++) sim.tick(); // a minute of rot
    expect(sim.waterQuality).toBeGreaterThanOrEqual(0.25);
  });

  it("one scatter feeds most of a hungry school", () => {
    const sim = new Sim({ width: 320, height: 200 }, 5);
    for (let i = 0; i < 5; i++)
      sim.addFish({ x: 40 + i * 60, y: 100, hunger: 1 });
    for (let i = 0; i < 5; i++) sim.dropFood(40 + i * 60);
    for (let i = 0; i < 1200; i++) sim.tick();
    // Eaten pellets reset hunger to 0; unfed fish sit near 1.
    expect(sim.fish.filter((f) => f.hunger < 0.5).length)
      .toBeGreaterThanOrEqual(3);
  });

  it("a starving fish begs near the surface", () => {
    const sim = new Sim({ width: 200, height: 200 }, 5);
    const f = sim.addFish({ x: 100, y: 170, hunger: 0.95 });
    for (let i = 0; i < 600; i++) sim.tick();
    // Every decide clamps the depth band to just under the surface.
    expect(f.bandY).toBeLessThanOrEqual(SURFACE + MARGIN + BAND_HALF);
    // and the fish actually lives up there
    expect(f.y).toBeLessThan(90);
  });

  it("the nearest calm fish drifts toward the hovered pointer", () => {
    const sim = new Sim({ width: 320, height: 200 }, 7);
    const near = sim.addFish({ x: 40, y: 60 });
    sim.addFish({ x: 280, y: 170 }); // outside the notice radius
    sim.notice = { x: 80, y: 80 }; // inside notice radius of `near`
    sim.tick();
    // Curiosity picks the close fish, never the far one — asserting
    // identity, not where a free fish happened to wander.
    expect(sim.noticeFish).toBe(near);
    for (let i = 0; i < 500; i++) sim.tick();
    expect(Math.hypot(near.x - 80, near.y - 80)).toBeLessThan(60);
  });

  it("one fish keeps watching the pointer", () => {
    const sim = new Sim({ width: 320, height: 200 }, 7);
    sim.notice = { x: 160, y: 100 };
    const a = sim.addFish({ x: 130, y: 100, hunger: 0 });
    const b = sim.addFish({ x: 200, y: 100, hunger: 0 });
    sim.tick();
    expect(sim.noticeFish).toBe(a);
    // b drifts closer than a; the watcher stays a (while it stays in
    // range) instead of the pick flipping and pulling b over too.
    b.x = 165; b.y = 100;
    for (let i = 0; i < 60; i++) {
      sim.tick();
      expect(sim.noticeFish).toBe(a);
    }
  });

  it("the watcher turns to face a pointer behind it and holds there", () => {
    const sim = new Sim({ width: 320, height: 200 }, 7);
    // Facing left with the pointer 60 px behind it.
    const f = sim.addFish({ x: 140, y: 100, facing: -1, heading: Math.PI,
                            hunger: 0 });
    sim.notice = { x: 200, y: 100 };
    let reached = -1, strayed = 0, backwards = 0;
    for (let i = 0; i < 900; i++) {
      sim.tick();
      const d = Math.hypot(f.x - 200, f.y - 100);
      if (reached < 0 && d < 24) reached = i;
      if (reached >= 0 && d > 40) strayed++;
      // Heading more than 90 degrees off the way it faces: steering
      // held against the pitch limit instead of rolling round. Chasing
      // the pointer itself did that for 170-240 of these ticks.
      const off = Math.abs(Math.atan2(Math.sin(f.heading),
                                      Math.cos(f.heading) * f.facing));
      if (off > Math.PI / 2 + 0.05) backwards++;
    }
    expect(reached).toBeGreaterThanOrEqual(0);
    expect(reached).toBeLessThan(120);
    expect(strayed).toBe(0);
    expect(backwards).toBeLessThan(60);
  });

  it("a small crowd gathers at the pointer, fanned out", () => {
    const sim = new Sim({ width: 320, height: 200 }, 7);
    const a = sim.addFish({ x: 130, y: 100, hunger: 0 });
    const b = sim.addFish({ x: 200, y: 110, hunger: 0 });
    const c = sim.addFish({ x: 150, y: 150, hunger: 0 });
    sim.notice = { x: 160, y: 100 };
    for (let i = 0; i < 400; i++) sim.tick();
    // All three calm fish converged on the pointer.
    for (const f of [a, b, c])
      expect(Math.hypot(f.x - 160, f.y - 100)).toBeLessThan(70);
    // Rank-staggered standoff fans the crowd — each watcher holds its
    // own ring, so no two sit on the same standoff distance.
    const da = Math.hypot(a.x - 160, a.y - 100);
    const db = Math.hypot(b.x - 160, b.y - 100);
    const dc = Math.hypot(c.x - 160, c.y - 100);
    expect(Math.abs(db - da)).toBeGreaterThan(2);
    expect(Math.abs(dc - db)).toBeGreaterThan(2);
    expect(Math.abs(dc - da)).toBeGreaterThan(2);
  });

  it("oversized watchers clamp inside the radius without stacking", () => {
    // Fish this big blow past the standoff clamp; the per-rank cap
    // must still give each watcher its own ring.
    const sim = new Sim({ width: 320, height: 200 }, 7);
    const a = sim.addFish({ x: 130, y: 100, hunger: 0, halfW: 80 });
    const b = sim.addFish({ x: 200, y: 110, hunger: 0, halfW: 80 });
    const c = sim.addFish({ x: 150, y: 150, hunger: 0, halfW: 80 });
    sim.notice = { x: 160, y: 100 };
    for (let i = 0; i < 400; i++) sim.tick();
    const ds = [a, b, c].map((f) => Math.hypot(f.x - 160, f.y - 100));
    for (const d of ds) expect(d).toBeLessThan(NOTICE_RADIUS);
    expect(Math.abs(ds[1]! - ds[0]!)).toBeGreaterThan(2);
    expect(Math.abs(ds[2]! - ds[1]!)).toBeGreaterThan(2);
    expect(Math.abs(ds[2]! - ds[0]!)).toBeGreaterThan(2);
  });

  it("hunger outranks curiosity", () => {
    const sim = new Sim({ width: 320, height: 200 }, 7);
    const f = sim.addFish({ x: 60, y: 60, hunger: 0.9 });
    sim.notice = { x: 60, y: 60 };   // fish sits on the pointer
    sim.dropFood(300);               // but food is across the tank
    for (let i = 0; i < 10; i++) sim.tick();
    // It goes for the pellet rather than hovering by the pointer.
    expect(f.state).toBe("seek");
    expect(f.tx).toBe(300);
  });

  it("a watcher that finds food doesn't roll back toward the pointer", () => {
    const sim = new Sim({ width: 320, height: 200 }, 7);
    // Facing right, a pellet ahead and the pointer behind it: the tick
    // it spots the food it is still the pointer's watcher.
    const f = sim.addFish({ x: 160, y: 100, facing: 1, heading: 0,
                            hunger: 0.9 });
    sim.notice = { x: 120, y: 100 };
    const fd = sim.dropFood(250)!;
    let rolled = false;
    for (let i = 0; i < 300 && !fd.eaten; i++) {
      sim.tick();
      // Once the pellet is eaten, rolling toward a new target is fine.
      rolled ||= f.state === "turn" && !fd.eaten;
    }
    // Before the fix it rolled back and forth 171 times in 2000 ticks
    // and never reached the pellet; alone it eats it by tick 112.
    expect(rolled).toBe(false);
    expect(fd.eaten).toBe(true);
  });

  it("a water change dilutes the water and siphons settled food", () => {
    const sim = new Sim({ width: 200, height: 100 }, 1);
    sim.fish.length = 0;
    sim.dropFood(50);
    for (let i = 0; i < 400; i++) sim.tick(); // pellet settles
    expect(sim.food[0]!.settled).toBeGreaterThan(0);
    sim.aquarium.water.protein = 400;         // 4 mg/L of organics
    sim.changeWater(0.5, 26);
    expect(sim.aquarium.water.protein).toBeCloseTo(200);
    expect(sim.waterQuality).toBeCloseTo(0.6, 5);
    expect(sim.food.length).toBe(0);          // siphoned
  });

  it("finds the fish whose body covers a point", () => {
    const sim = new Sim({ width: 320, height: 200 }, 7);
    // A big adult: 35 px from its centre is still on its body, well
    // past the fixed 18-22 px radius the hover and Get Info used.
    const big = sim.addFish({ x: 100, y: 100, scale: 1,
                              halfW: 40, halfH: 20 });
    expect(sim.fishAt(135, 110)).toBe(big);
    expect(sim.fishAt(145, 100)).toBeNull();
    // Growth shrinks the body: at half size 35 px is off it.
    big.scale = 0.5;
    expect(sim.fishAt(135, 100)).toBeNull();
    // A fish with no sheet bound yet still gets a small target.
    const small = sim.addFish({ x: 250, y: 60 });
    expect(sim.fishAt(256, 55)).toBe(small);
    expect(sim.fishAt(262, 60)).toBeNull();
  });

  it("picks the nearer body where two overlap", () => {
    const sim = new Sim({ width: 320, height: 200 }, 7);
    const a = sim.addFish({ x: 100, y: 100, scale: 1, halfW: 30, halfH: 15 });
    const b = sim.addFish({ x: 120, y: 100, scale: 1, halfW: 30, halfH: 15 });
    expect(sim.fishAt(105, 100)).toBe(a);
    expect(sim.fishAt(118, 100)).toBe(b);
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

  it("a weakened fish swims slower", () => {
    const well = new Sim({ width: 300, height: 200 }, 11);
    const weak = new Sim({ width: 300, height: 200 }, 11);
    well.addFish({ x: 150, y: 100, speed: 1 });
    weak.addFish({ x: 150, y: 100, speed: 1 });
    well.advanceLife(1);
    weak.advanceLife(1);
    well.fish[0]!.life!.health = 90;
    // Health 1 is 24 below the stand-in species' threshold of 25.
    weak.fish[0]!.life!.health = 1;
    let dc = 0, df = 0;
    let pc = { x: 150, y: 100 }, pf = { x: 150, y: 100 };
    for (let i = 0; i < 1000; i++) {
      well.tick(); weak.tick();
      const c = well.fish[0]!, f = weak.fish[0]!;
      dc += Math.hypot(c.x - pc.x, c.y - pc.y);
      df += Math.hypot(f.x - pf.x, f.y - pf.y);
      pc = { x: c.x, y: c.y }; pf = { x: f.x, y: f.y };
    }
    expect(df).toBeLessThan(dc * 0.9);
  });

  it("a dead fish rises, floats, then sinks to the gravel and stays", () => {
    const sim = new Sim({ width: 300, height: 200 }, 3);
    const f = sim.addFish({ x: 150, y: 120 });
    sim.advanceLife(1);
    f.life!.dead = { cause: 12, at: 0 };
    sim.advanceLife(60);
    expect(f.state).toBe("dead");
    let top = f.y;
    // The rise runs to just under the surface whatever band the fish
    // lived in — bound the wait, then confirm it reached the top.
    for (let i = 0; i < 2000 && f.corpse !== "float"; i++)
      { sim.tick(); top = Math.min(top, f.y); }
    expect(f.corpse).toBe("float");
    expect(top).toBeLessThan(40);
    f.deadTicks = 1; // skip the rest of the float
    for (let i = 0; i < 1000; i++) sim.tick();
    expect(f.corpse).toBe("rest");
    expect(f.y).toBeGreaterThan(170);
    sim.tap(f.x, f.y);
    expect(f.state).toBe("dead");
  });

  it("a sick fish keeps to the bottom of the tank", () => {
    const sim = new Sim({ width: 300, height: 200 }, 4);
    const f = sim.addFish({ x: 150, y: 50, hunger: 0 });
    sim.advanceLife(1);
    f.life!.sick = { disease: 0, amount: 20 };
    let low = 0;
    for (let i = 0; i < 3000; i++) { sim.tick(); if (i > 1500 && f.y > 140) low++; }
    expect(low).toBeGreaterThan(1200);
  });

  it("ambient bubbles rise from the gravel on their own", () => {
    const sim = new Sim({ width: 320, height: 200 }, 13);
    sim.fish.length = 0;    // isolate ambient spawning from fish-blown bubbles
    sim.bubbles.length = 0;
    let seen = 0;
    for (let i = 0; i < 3000; i++) {
      sim.tick();
      seen = Math.max(seen, sim.bubbles.length);
      for (const b of sim.bubbles) expect(b.y).toBeLessThan(200 - 10);
    }
    expect(seen).toBeGreaterThan(0); // ~12 expected at p=0.004/tick
  });

  it("fish hang near the surface when the water turns foul", () => {
    const sim = new Sim({ width: 320, height: 200 }, 7);
    const f = sim.addFish({ x: 160, y: 150 });
    for (let i = 0; i < 1500; i++) {
      sim.waterQuality = 0; // pinned — filtration would creep it up
      sim.tick();
    }
    // Full-gasp ceiling is SURFACE + MARGIN + slack; bound by that +
    // transit tolerance, not an id-specific pixel row.
    expect(f.y).toBeLessThanOrEqual(SURFACE + MARGIN + GASP_SLACK + TRANSIT);
    let maxY = 0;
    for (let i = 0; i < 500; i++) {
      sim.waterQuality = 0;
      sim.tick();
      maxY = Math.max(maxY, f.y);
    }
    // max over 500 ticks tolerates a few px of bob past the ceiling
    expect(maxY).toBeLessThanOrEqual(SURFACE + MARGIN + GASP_SLACK + TRANSIT + 4);
  });

  it("day/night light oscillates in [0.3, 1]", () => {
    const sim = new Sim({ width: 100, height: 100 }, 1);
    let min = 1, max = 0;
    for (let i = 0; i < DAY_TICKS; i++) {
      sim.tick();
      min = Math.min(min, sim.light);
      max = Math.max(max, sim.light);
    }
    expect(min).toBeCloseTo(0.3);
    expect(max).toBeCloseTo(1);
  });

  // The old curve was one hump per cycle: night was 18% of it and a
  // fresh tank opened at the darkest moment.
  it("opens in daylight and gives night about half the cycle", () => {
    const sim = new Sim({ width: 100, height: 100 }, 1);
    expect(sim.light).toBeGreaterThanOrEqual(0.85);
    let night = 0, maxStep = 0, prev = sim.light;
    for (let i = 0; i < DAY_TICKS; i++) {
      sim.tick();
      if (sim.light < 0.5) night++;
      maxStep = Math.max(maxStep, Math.abs(sim.light - prev));
      prev = sim.light;
    }
    expect(night / DAY_TICKS).toBeGreaterThanOrEqual(0.4);
    expect(night / DAY_TICKS).toBeLessThanOrEqual(0.5);
    expect(maxStep).toBeLessThan(0.001); // smooth ramps, no wrap cusp
    expect(sim.light).toBe(new Sim({ width: 100, height: 100 }, 1).light);
  });

  it("reports an externally set light until it is cleared", () => {
    const sim = new Sim({ width: 100, height: 100 }, 1);
    const cycle = sim.light;
    sim.setLight(0.45);
    expect(sim.light).toBe(0.45);
    sim.setLight(null);
    expect(sim.light).toBe(cycle);
  });

  it("fish bed down for the night and wake at dawn", () => {
    const sim = new Sim({ width: 320, height: 200 }, 7);
    const f = sim.addFish({ x: 160, y: 60, cruise: 1.4 });
    // Fish only sleep after the tank has seen daylight; a fresh demo
    // cycle opens at 10:00, so this loop is a guard, not a wait.
    for (let i = 0; i < DAY_TICKS && sim.light < WAKE_LIGHT; i++)
      sim.tick();
    // Tick until dark, then let the fish settle — it sinks at
    // ≤0.4 px/tick, so give it room to reach the bed.
    for (let i = 0; i < DAY_TICKS && sim.light >= SLEEP_LIGHT; i++)
      sim.tick();
    for (let i = 0; i < 600; i++) sim.tick();
    expect(f.state).toBe("sleep");
    // It idles on the gravel, not mid-water — and stays put
    // horizontally (no all-night drift toward a wall).
    expect(f.y).toBeGreaterThan(200 - BOTTOM_PAD - 12);
    const x0 = f.x;
    for (let i = 0; i < 300; i++) sim.tick();
    expect(f.x).toBe(x0);
    // Dawn sends it wandering again.
    for (let i = 0; i < DAY_TICKS && sim.light < WAKE_LIGHT; i++)
      sim.tick();
    for (let i = 0; i < 60; i++) sim.tick();
    expect(f.state).not.toBe("sleep");
  });

  it("sleeps through a light-timer night and gets up for food", () => {
    // Timer nights hold exactly CLOCK_NIGHT_LIGHT; a strict
    // `light < SLEEP_LIGHT` at 0.45 never fired there.
    expect(SLEEP_LIGHT).toBeGreaterThan(CLOCK_NIGHT_LIGHT);
    const sim = new Sim({ width: 320, height: 200 }, 7);
    const f = sim.addFish({ x: 160, y: 60, cruise: 1.4 });
    sim.setLight(1);
    sim.tick(); // the tank has seen daylight
    sim.setLight(CLOCK_NIGHT_LIGHT);
    for (let i = 0; i < 600; i++) sim.tick();
    expect(f.state).toBe("sleep");
    // Rests level on the gravel, whatever its heading at bedtime.
    expect(Math.abs(pitch(f))).toBeLessThan(1e-9);
    // A hungry fish wakes for a pellet, eats, then beds back down.
    f.hunger = 0.6;
    sim.dropFood(160);
    let ate = false;
    for (let i = 0; i < 3000 && !ate; i++) { sim.tick(); ate = f.hunger < 0.1; }
    expect(ate).toBe(true);
    for (let i = 0; i < 100; i++) sim.tick();
    expect(f.state).toBe("sleep");
  });

  it("a big fish sleeps inside its room, not in the gravel", () => {
    const sim = new Sim({ width: 320, height: 200 }, 7);
    // Half-height 30: room() keeps its centre 24 px (0.8 of that) off
    // the floor, above the sleep line 4 px over the gravel.
    const f = sim.addFish({ x: 160, y: 60, cruise: 1.4, scale: 1,
                            halfW: 40, halfH: 30 });
    const bed = 200 - 30 * 0.8;
    sim.setLight(1);
    sim.tick(); // the tank has seen daylight
    sim.setLight(CLOCK_NIGHT_LIGHT);
    for (let i = 0; i < 900; i++) {
      sim.tick();
      expect(f.y).toBeLessThanOrEqual(bed);
    }
    expect(f.state).toBe("sleep");
    expect(f.y).toBeCloseTo(bed, 9);
  });

  it("darts out of each decision — quadratic ramp capped at cruise", () => {
    const sim = new Sim({ width: 320, height: 200 }, 7);
    const f = sim.addFish({ x: 60, y: 100, cruise: 1.4, speed: 0 });
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
    expect(f.facing).toBe(1);
    // Steering never carries the heading round to the other side; only
    // a roll turns the fish to face the target.
    for (let i = 0; i < 40 && f.state === "drift"; i++) {
      sim.tick();
      if (f.state === "drift") {
        expect(f.facing).toBe(1);
        expect(Math.abs(f.heading))
          .toBeLessThanOrEqual(Math.PI * 7 / 12 + 1e-9); // MAX_PITCH
      }
    }
    expect(f.state).toBe("turn");
  });

  it("strokes on toward a far target, then re-decides", () => {
    const sim = new Sim({ width: 320, height: 200 }, 7);
    const f = sim.addFish({ x: 60, y: 100 });
    f.tx = 300; f.ty = 30; f.phase = 0; f.latch = -1;
    for (let i = 0; i < 40; i++) sim.tick();
    // After 32 ticks the phase wrapped: a new stroke, same destination.
    expect(f.phase).toBeLessThan(32);
    expect(f.strokes).toBe(1);
    expect(f.tx).toBe(300);
    // Out of strokes before arriving (~130 ticks at cruise 1 for ~250
    // px), the fish picks a new destination.
    for (let i = 0; i < 100; i++) sim.tick();
    expect(f.tx).not.toBe(300);
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

  it("same-species fish drift closer than strangers", () => {
    // Every seed, not one lucky one: across seeds 1-30 the gap is
    // 21-69 px. A 10 px floor fails weakened schooling while tuning
    // noise still passes.
    for (let seed = 1; seed <= 6; seed++) {
      expect(pairDistance(seed, "a", "b") - pairDistance(seed, "a", "a"))
        .toBeGreaterThan(10);
    }
  });

  it("starter fish (species \"\") don't school", () => {
    // Without schooling they sit as far apart as strangers: per seed
    // the difference is noise (about -12 to 21 px); schooling starters
    // would sit 27-60 px closer on every seed.
    let gap = 0;
    for (let seed = 1; seed <= 6; seed++)
      gap += pairDistance(seed, "a", "b") - pairDistance(seed, "", "");
    expect(gap / 6).toBeLessThan(15);
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

  it("never mirrors a wall-side target back onto the fish", () => {
    // At the right wall facing right, the ahead mirror of any target
    // clamps to the wall, where the fish already is; every draw there
    // lies behind it, so the target must stay short of the wall.
    for (let seed = 1; seed <= 40; seed++) {
      const sim = new Sim({ width: 300, height: 100 }, seed);
      const f = sim.addFish({ x: 284, y: 50, facing: 1, heading: 0 });
      f.tx = 284; f.ty = 50; f.phase = 32; // decide fires on this tick
      sim.tick();
      expect(f.tx).toBeLessThan(284);
    }
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

  it("assigns unique ids that never reuse a loaded fish's id", () => {
    const sim = new Sim({ width: 300, height: 100 }, 7);
    const a = sim.addFish({ x: 10, y: 10 });
    const b = sim.addFish({ x: 20, y: 20 });
    expect(new Set([a.id, b.id]).size).toBe(2);
    // A restored fish carries its saved id; the next spawn must skip past.
    const c = sim.addFish({ x: 30, y: 30, id: 42 });
    const d = sim.addFish({ x: 40, y: 40 });
    expect(c.id).toBe(42);
    expect(d.id).toBe(43);
  });

  it("restores a saved fish without spawning extras", () => {
    const sim = new Sim({ width: 300, height: 100 }, 7);
    const r = sim.addFish({ id: 9, species: "packB", x: 5, y: 5,
                            sheetIdx: 1 });
    expect(r.id).toBe(9);
    expect(r.species).toBe("packB");
    expect(r.sheetIdx).toBe(1);
    expect(sim.fish.length).toBe(1);
    expect(sim.addFish({ x: 1, y: 1 }).id).toBe(10);
  });

  it("survives an explicitly undefined id", () => {
    const sim = new Sim({ width: 300, height: 100 }, 7);
    const a = sim.addFish({ x: 1, y: 1,
                            id: undefined as unknown as number });
    const b = sim.addFish({ x: 2, y: 2 });
    expect(Number.isFinite(a.id)).toBe(true);
    expect(a.id).not.toBe(b.id);
    expect(sim.removeFish(a.id)).toBe(true);
  });

  it("spawns juveniles of varying size", () => {
    const sim = new Sim({ width: 300, height: 100 }, 7);
    const sizes = new Set<number>();
    for (let i = 0; i < 8; i++)
      sizes.add(sim.addFish({ x: 50, y: 50 }).scale);
    for (const s of sizes) {
      expect(s).toBeGreaterThanOrEqual(0.7);
      expect(s).toBeLessThan(0.95 + 1e-9);
    }
    expect(sizes.size).toBeGreaterThan(1); // a school isn't clones
  });

  it("keeps a restored fish's size", () => {
    const sim = new Sim({ width: 300, height: 100 }, 7);
    expect(sim.addFish({ x: 50, y: 50, scale: 0.9 }).scale).toBe(0.9);
  });

  it("sanitizes a corrupt saved scale", () => {
    const sim = new Sim({ width: 300, height: 100 }, 7);
    expect(sim.addFish({ x: 50, y: 50, scale: 0 }).scale).toBe(1);
    expect(sim.addFish({ x: 50, y: 50, scale: -2 }).scale).toBe(1);
    expect(sim.addFish({ x: 50, y: 50, scale: NaN }).scale).toBe(1);
    expect(sim.addFish({ x: 50, y: 50, scale: Infinity }).scale).toBe(1);
    expect(sim.addFish({ x: 50, y: 50, scale: 9 }).scale).toBe(1);
    expect(sim.addFish({ x: 50, y: 50, scale: 1e-9 }).scale).toBe(0.7);
  });

  it("grows toward adult size as it eats, never past it", () => {
    const sim = new Sim({ width: 300, height: 100 }, 5);
    const f = sim.addFish({ x: 40, y: 50, hunger: 0.9, scale: 0.7 });
    for (let meal = 0; meal < 40; meal++) {
      sim.dropFood(120);
      for (let i = 0; i < 2000 && sim.food.length; i++) sim.tick();
      f.hunger = 0.9;         // stay hungry for the next pellet
      sim.waterQuality = 1;   // rot between meals mustn't dull appetite
    }
    expect(f.scale).toBeGreaterThan(0.95); // past the juvenile range
    expect(f.scale).toBeLessThanOrEqual(1);
  });

  it("scales a fish's body extents by its growth", () => {
    const sim = new Sim({ width: 320, height: 200 }, 3);
    // The renderer reports the sheet's extents at growth 1; a juvenile
    // at half size keeps only half as much body inside the glass.
    const adult = sim.addFish({ x: 160, y: 20, scale: 1,
                                halfW: 20, halfH: 50 });
    const young = sim.addFish({ x: 160, y: 20, scale: 0.7,
                                halfW: 20, halfH: 50 });
    sim.tick();
    // EDGE_KEEP holds 80% of the half-height below the surface (y 10).
    expect(adult.y).toBeCloseTo(10 + 50 * 0.8);
    expect(young.y).toBeCloseTo(10 + 50 * 0.7 * 0.8);
  });

  it("removes a fish by id", () => {
    const sim = new Sim({ width: 300, height: 100 }, 7);
    const a = sim.addFish({ x: 10, y: 10 });
    const b = sim.addFish({ x: 20, y: 20 });
    expect(sim.removeFish(a.id)).toBe(true);
    expect(sim.fish).toEqual([b]);
    expect(sim.removeFish(a.id)).toBe(false); // already gone
    expect(sim.removeFish(999)).toBe(false);  // never existed
    // ids stay unique across removal
    const c = sim.addFish({ x: 30, y: 30 });
    expect(c.id).not.toBe(a.id);
  });

  it("keeps chasing a sinking pellet instead of crawling after it", () => {
    const sim = new Sim({ width: 320, height: 200 }, 42);
    sim.addFish({ x: 60, y: 120, cruise: 1.4, hunger: 0.9 });
    sim.dropFood(200);
    const fd = sim.food[0]!;
    for (let i = 0; i < 300 && !fd.eaten; i++) sim.tick();
    expect(fd.eaten).toBe(true);
    expect(fd.settled).toBe(0); // caught mid-water, not off the gravel
  });

  it("drops a wander brake when food appears far away", () => {
    const sim = new Sim({ width: 320, height: 200 }, 7);
    const f = sim.addFish({ x: 60, y: 100, cruise: 1.4, hunger: 0.9,
                            speed: 1.2, phase: 12, latch: 8, peak: 1.4 });
    f.tx = 70; f.ty = 100; // braking into a wander target
    sim.dropFood(260);     // ~200 px ahead
    let top = 0;
    for (let i = 0; i < 20; i++) { sim.tick(); top = Math.max(top, f.speed); }
    expect(top).toBeGreaterThanOrEqual(0.9 * 1.4);
  });

  it("swims calmly: few rolls and no one-tick stops", () => {
    const sim = new Sim({ width: 320, height: 200 }, 3);
    for (let i = 0; i < 6; i++) {
      const facing = i % 2 ? -1 : 1;
      sim.addFish({ x: 50 + i * 40, y: 40 + i * 25, facing,
                    heading: facing > 0 ? 0 : Math.PI,
                    cruise: 1.1 + i * 0.14, hunger: 0 });
    }
    let rolls = 0, halts = 0;
    const minutes = 10;
    for (let t = 0; t < 30 * 60 * minutes; t++) {
      const prev = sim.fish.map((f) => ({ state: f.state, speed: f.speed }));
      sim.tick();
      sim.fish.forEach((f, i) => {
        const p = prev[i]!;
        if (f.state === "turn" && p.state !== "turn") rolls++;
        if ((f.state === "drift" || f.state === "seek") &&
            p.state !== "startle" && p.speed - f.speed > 0.35 * f.cruise)
          halts++;
      });
    }
    expect(rolls / (6 * minutes)).toBeLessThan(18);
    expect(halts).toBe(0);
  });

  it("changes facing only by rolling, even around feeding", () => {
    let pops = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const sim = new Sim({ width: 320, height: 200 }, seed);
      for (let i = 0; i < 6; i++) {
        const facing = (seed + i) % 2 ? -1 : 1;
        sim.addFish({ x: 40 + i * 45, y: 40 + ((seed * 37 + i * 53) % 130),
                      facing, heading: facing > 0 ? 0 : Math.PI,
                      cruise: 1.1 + i * 0.14, hunger: 0.9 });
      }
      for (let t = 0; t < 1200; t++) {
        if (t % 600 === 0)
          for (let k = 0; k < 4; k++)
            sim.dropFood(30 + ((seed * 71 + k * 83) % 260));
        const prev =
          sim.fish.map((f) => ({ state: f.state, facing: f.facing }));
        sim.tick();
        sim.fish.forEach((f, i) => {
          const p = prev[i]!;
          const calm = (s: string) => s === "drift" || s === "seek";
          if (calm(p.state) && calm(f.state) && p.facing !== f.facing) pops++;
        });
      }
    }
    expect(pops).toBe(0);
  });

  it("eats a pellet just below without rolling for it", () => {
    const sim = new Sim({ width: 320, height: 200 }, 7);
    const f = sim.addFish({ x: 160.5, y: 40, facing: 1, heading: 0,
                            hunger: 0.9 });
    sim.food.push({ x: 160, y: 100, eaten: false, settled: 0 });
    const fd = sim.food[0]!;
    for (let i = 0; i < 200 && !fd.eaten; i++) {
      sim.tick();
      expect(f.state).not.toBe("turn");
    }
    expect(fd.eaten).toBe(true);
  });

  it("a peckish fish snaps up a pellet drifting past it", () => {
    const sim = new Sim({ width: 320, height: 200 }, 7);
    const f = sim.addFish({ x: 100, y: 100, facing: 1, heading: 0,
                            speed: 1, hunger: 0.2 }); // below HUNGER_SEEK
    f.tx = 220; f.ty = 100;
    sim.food.push({ x: 130, y: 96, eaten: false, settled: 0 });
    const fd = sim.food[0]!;
    for (let i = 0; i < 90 && !fd.eaten; i++) sim.tick();
    expect(fd.eaten).toBe(true);
    expect(f.hunger).toBeLessThan(0.1);
  });

  it("a weak startle never slows a fish below cruise", () => {
    const sim = new Sim({ width: 300, height: 200 }, 9);
    const fish = [10, 20, 30, 40, 45].map((d, i) =>
      sim.addFish({ x: 150 + d, y: 100, cruise: 1.1 + i * 0.15,
                    speed: 0.3 + i * 0.3 }));
    sim.tap(150, 100);
    for (const f of fish) {
      expect(f.state).toBe("startle");
      expect(f.speed).toBeGreaterThanOrEqual(f.cruise);
      expect(f.speed).toBeLessThanOrEqual(3.5);
    }
  });

  it("a fish startled into the glass bounces off it", () => {
    const sim = new Sim({ width: 300, height: 200 }, 9);
    const f = sim.addFish({ x: 22, y: 100, cruise: 1.5 });
    sim.tap(36, 100); // scares it toward the left wall
    expect(f.state).toBe("startle");
    let touched = false;
    for (let i = 0; i < 12; i++) {
      sim.tick();
      touched ||= f.x <= MARGIN;
    }
    expect(touched).toBe(true);
    expect(f.x).toBeGreaterThan(MARGIN + 5);
  });

  it("stops seeking when the water turns foul", () => {
    const sim = new Sim({ width: 300, height: 100 }, 11);
    const f = sim.addFish({ x: 50, y: 50, facing: 1, heading: 0,
                            hunger: 0.9 });
    sim.dropFood(200);
    sim.tick();
    expect(f.state).toBe("seek");
    // Just under the appetite threshold.
    sim.waterQuality = Math.max(0, QUALITY_SEEK - 0.05);
    sim.tick();
    expect(f.state).not.toBe("seek");
  });

  it("refuses food at exactly QUALITY_SEEK, not one step above", () => {
    // statsmodel.ts's advice gates mirror this edge — at the boundary
    // the fish won't take a pellet, so the advice can't invite one.
    const sim = new Sim({ width: 300, height: 100 }, 11);
    const f = sim.addFish({ x: 50, y: 50, facing: 1, heading: 0,
                          hunger: 0.9 });
    sim.dropFood(200);
    sim.waterQuality = QUALITY_SEEK;
    sim.tick();
    expect(f.state).not.toBe("seek");
    expect(sim.isBegging(f)).toBe(false);
    sim.waterQuality = QUALITY_SEEK + 0.01;
    sim.tick();
    expect(f.state).toBe("seek");
  });

  it("stops seeking once another fish ate the pellet", () => {
    const sim = new Sim({ width: 320, height: 200 }, 7);
    // b ticks first, so it sets off for the pellet before a eats it.
    const b = sim.addFish({ x: 300, y: 180, facing: -1, hunger: 0.9 });
    const a = sim.addFish({ x: 150, y: 60, hunger: 0.9 });
    sim.food.push({ x: 152, y: 60, eaten: false, settled: 0 });
    const fd = sim.food[0]!;
    sim.tick(); // a is within EAT_DIST; b starts toward it
    expect(fd.eaten).toBe(true);
    expect(b.state).toBe("seek");
    expect(a.state).not.toBe("seek");
    sim.tick();
    expect(b.state).not.toBe("seek");
  });

  it("spawns at SPAWN_HUNGER when the caller doesn't say", () => {
    const sim = new Sim({ width: 320, height: 200 }, 3);
    // Just past the seek threshold — a fresh fish takes the first
    // pellets it's offered instead of ignoring them for minutes.
    expect(sim.addFish({ x: 50, y: 50 }).hunger).toBe(SPAWN_HUNGER);
    expect(sim.addFish({ x: 50, y: 50, hunger: 0 }).hunger).toBe(0);
  });

  it("refuses a spawn at FISH_CAP, but restores still land", () => {
    const sim = new Sim({ width: 320, height: 200 }, 3);
    for (let i = 0; i < FISH_CAP; i++) sim.addFish({ x: 50, y: 50 });
    expect(sim.addFish({ x: 50, y: 50 }, "enforce")).toBeNull();
    expect(sim.fish).toHaveLength(FISH_CAP);
    // A saved roster keeps every pet — the cap governs spawns, not
    // restoring what was already in the tank.
    expect(sim.addFish({ x: 50, y: 50 })).toBeTruthy();
    expect(sim.addFish({ x: 50, y: 50 }, "bypass")).toBeTruthy();
    expect(sim.fish).toHaveLength(FISH_CAP + 2);
  });
});

describe("deaths out of sight", () => {
  it("a fish that died during catch-up sinks rather than rising", () => {
    const sim = new Sim({ width: 300, height: 200 }, 6);
    const f = sim.addFish({ x: 150, y: 100 });
    sim.advanceLife(1);
    f.life!.ate = 0;
    f.life!.health = 1;
    sim.advanceLife(40 * 24 * 3600); // starves while the app is closed
    expect(f.state).toBe("dead");
    expect(f.corpse).toBe("sink");
  });
});

describe("lifecycle", () => {
  it("the dead do not startle", () => {
    const sim = new Sim({ width: 320, height: 200 }, 7);
    const f = sim.addFish({ x: 160, y: 100, state: "dead" });
    sim.tap(160, 100);
    expect(f.state).not.toBe("startle");
  });

  it("a thriving pair occasionally has a fry", () => {
    const sim = new Sim({ width: 320, height: 200 }, 42);
    sim.addFish({ x: 100, y: 100, species: "guppy", hunger: 0.1,
                  scale: 1, pack: "p" });
    sim.addFish({ x: 120, y: 110, species: "guppy", hunger: 0.1,
                  scale: 1, pack: "p" });
    // The window is 10x the mean roll period: a shifted rand() stream
    // (any feature change consuming draws) can't flake this test.
    let fry = 0;
    for (let i = 0; i < 180000 && !fry; i++) {
      // Keep the parents thriving: birth rolls are per-tick.
      for (const f of sim.fish) f.hunger = 0.1;
      sim.tick();
      fry = sim.events.filter((e) => e.type === "birth").length;
      sim.events.length = 0;
    }
    expect(fry).toBe(1);
    expect(sim.fish.length).toBe(3);
    const baby = sim.fish[2]!;
    expect(baby.species).toBe("guppy");
    expect(baby.scale).toBeLessThan(1); // visibly a juvenile
    expect(baby.pack).toBe("p");
  });

  it("no births in a full tank", () => {
    const sim = new Sim({ width: 320, height: 200 }, 42);
    for (let i = 0; i < 24; i++)
      sim.addFish({ x: 50 + i, y: 100, species: "guppy", hunger: 0.1,
                    scale: 1 });
    for (let i = 0; i < 2000; i++) {
      for (const f of sim.fish) f.hunger = 0.1;
      sim.tick();
    }
    expect(sim.fish.length).toBe(24);
    expect(sim.events.every((e) => e.type !== "birth")).toBe(true);
  });

});

describe("B-57 drift steering", () => {
  it("doesn't step the drift stroke on the tick a turn begins", () => {
    const sim = new Sim({ width: 320, height: 200 }, 11);
    const f = sim.addFish({ x: 200, y: 100, facing: 1, hunger: 1 });
    // The pellet lands behind the fish: the seek must roll first.
    sim.dropFood(60);
    let entered = false;
    for (let i = 0; i < 60 && !entered; i++) {
      const px = f.x, py = f.y;
      sim.tick();
      if (f.state === "turn") {
        entered = true;
        expect(f.x).toBe(px);
        expect(f.y).toBe(py);
      }
    }
    expect(entered).toBe(true);
    // The roll completes within a few turn windows — a guard that
    // trapped the fish in "turn" would fail here — and the meal lands,
    // which only happens once seeking has resumed.
    for (let i = 0; i < TURN_TICKS * 6 && f.state === "turn"; i++)
      sim.tick();
    expect(f.state).not.toBe("turn");
    const pellet = sim.food[0]!;
    expect(pellet).toBeDefined(); // the dropped pellet
    expect(pellet.eaten).toBe(false); // and not eaten mid-roll
    for (let i = 0; i < 400 && !pellet.eaten; i++) sim.tick();
    expect(pellet.eaten).toBe(true);
  });

  it("eats a pellet beyond its room by sliding along the wall", () => {
    // halfW 50 keeps this fish's centre at x >= 40; a pellet dropped at
    // MARGIN (16) sits outside its room, but the eat reach spans the
    // gap — the seeker must still get the meal, not press forever.
    const sim = new Sim({ width: 320, height: 200 }, 3);
    const f = sim.addFish({ x: 60, y: 150, facing: -1, hunger: 1,
                            halfW: 50, halfH: 30, scale: 1 });
    sim.dropFood(16);
    const pellet = sim.food[0]!;
    for (let i = 0; i < 400 && !pellet.eaten; i++) sim.tick();
    expect(pellet.eaten).toBe(true);
  });
});

describe("B-58 hunger and vigor", () => {
  it("brakes a weakened seeker — the floor is pre-vigor", () => {
    // A latched brake past its decay lands on the floor; a fish whose
    // vigor is down (ill or worn by foul water) must cross that floor
    // proportionally instead of having the division cancel it out.
    const step = (health: number): number => {
      const sim = new Sim({ width: 320, height: 200 }, 5);
      const f = sim.addFish({ x: 100, y: 100, hunger: 1, facing: 1,
                              state: "seek", latch: 0, peak: 1,
                              phase: 30, speed: 0.6 });
      sim.advanceLife(1);
      f.life!.health = health;
      sim.food.push({ x: 108, y: 100, eaten: false, settled: 1 });
      sim.tick();
      return Math.hypot(f.x - 100, f.y - 100);
    };
    const well = step(90);
    const weak = step(1);
    expect(weak).toBeLessThan(well * 0.9);
    // The pin that separates old from new: a weakened seeker must end
    // up slower than the pellet sinks (FOOD_SINK * 1.5 = 0.525 px).
    // The old /vigor floor cancelled the penalty and gave 0.525.
    expect(weak).toBeLessThan(0.525);
  });

  it("wakes a sleeper for a pellet inside NOTICE_DIST at snack hunger", () => {
    const sim = new Sim({ width: 320, height: 200 }, 4);
    sim.setLight(0); // night
    const f = sim.addFish({ x: 100, y: 184, hunger: HUNGER_SEEK - 0.01,
                            state: "sleep" });
    sim.dropFood(115); // sinks to the gravel 15 px from the sleeper
    let woke = false;
    for (let i = 0; i < 700 && !woke; i++) {
      // Pin hunger just under HUNGER_SEEK so the wake can only come
      // through the snack-smell path, never the any-pellet seek path.
      f.hunger = HUNGER_SEEK - 0.01;
      sim.tick();
      woke = f.state !== "sleep";
    }
    expect(woke).toBe(true);
    expect(f.hunger).toBeLessThan(HUNGER_SEEK);
  });

  it("keeps a snack-hungry sleeper down for a distant pellet", () => {
    const sim = new Sim({ width: 320, height: 200 }, 4);
    sim.setLight(0);
    const f = sim.addFish({ x: 100, y: 184, hunger: 0.2,
                            state: "sleep" });
    sim.dropFood(300); // 200 px away — too far to smell at 0.2
    for (let i = 0; i < 600; i++) {
      sim.tick();
      expect(f.state).toBe("sleep");
    }
  });
});
