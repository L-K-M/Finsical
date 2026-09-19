import { makeRng } from "./rng.js";

export interface Tank {
  width: number;
  height: number;
}

export type FishState = "drift" | "seek" | "startle";

export interface Fish {
  x: number;
  y: number;
  /** facing: +1 right, -1 left */
  facing: 1 | -1;
  /** pixels per tick */
  speed: number;
  vy: number;
  /** 0 = full, 1 = starving */
  hunger: number;
  state: FishState;
  stateTicks: number;
}

export interface Food {
  x: number;
  y: number;
  eaten: boolean;
  /** ticks spent rotting on the gravel — fouls the water while it lasts */
  settled: number;
}

export interface Bubble {
  x: number;
  y: number;
}

const MARGIN = 16;
const SURFACE = 10;
export const BOTTOM_PAD = 12;
const HUNGER_PER_TICK = 1 / (30 * 120); // starving after ~2 min
const HUNGER_SEEK = 0.4;
const EAT_DIST = 6;
const FOOD_SINK = 0.35;
/** Ticks a settled pellet takes to dissolve away (~45 s at 30 tps). */
export const FOOD_ROT_TICKS = 30 * 45;
/** Quality drained per tick per rotting pellet (~0.2 over a full rot). */
const WASTE_PER_TICK = 1 / 6000;
/** Filtration: recovers a fouled tank over ~7 min of clean water. */
const FILTER_PER_TICK = 1 / 12000;
/** Below this fish lose their appetite and stop seeking food. */
const QUALITY_SEEK = 0.3;
const STARTLE_RADIUS = 48;
const STARTLE_TICKS = 30;
const BUBBLE_CHANCE = 0.004;
/** One full day/night cycle in ticks (~13 min at 30 tps). */
export const DAY_TICKS = 24000;

/** Fixed-step aquarium simulation. Advance with `tick()` — one step per call. */
export class Sim {
  readonly tank: Tank;
  readonly fish: Fish[] = [];
  readonly food: Food[] = [];
  readonly bubbles: Bubble[] = [];
  tickCount = 0;
  /** 1 = clean, 0 = foul. Rotted food fouls it; filtration recovers it. */
  waterQuality = 1;
  private rand: () => number;

  constructor(tank: Tank, seed = 1) {
    this.tank = tank;
    this.rand = makeRng(seed);
  }

  addFish(fish: Partial<Fish> & { x: number; y: number }): Fish {
    const f: Fish = {
      facing: 1, speed: 1, vy: 0, hunger: 0.2,
      state: "drift", stateTicks: 0, ...fish,
    };
    this.fish.push(f);
    return f;
  }

  /** Drop a food pellet at x; it sinks to the gravel. */
  dropFood(x: number): void {
    const cx = Math.min(Math.max(x, MARGIN), this.tank.width - MARGIN);
    this.food.push({ x: cx, y: SURFACE + 2, eaten: false, settled: 0 });
  }

  /** Knock on the glass: startle fish near (x, y). */
  tap(x: number, y: number): void {
    for (const f of this.fish) {
      const dx = f.x - x, dy = f.y - y;
      if (dx * dx + dy * dy < STARTLE_RADIUS * STARTLE_RADIUS) {
        f.state = "startle";
        f.stateTicks = 0;
        const d = Math.max(Math.hypot(dx, dy), 1);
        f.facing = dx >= 0 ? 1 : -1;
        f.speed = 3.5;
        f.vy = (dy / d) * 2.5;
      }
    }
  }

  /** 0.15 = night, 1 = full daylight. */
  get light(): number {
    const t = (this.tickCount % DAY_TICKS) / DAY_TICKS;
    return 0.15 + 0.85 * Math.max(0, Math.sin(t * Math.PI));
  }

  tick(): void {
    this.tickCount++;
    for (const f of this.fish) this.tickFish(f);
    for (let i = this.food.length - 1; i >= 0; i--) {
      const fd = this.food[i]!;
      if (fd.eaten) { this.food.splice(i, 1); continue; }
      if (fd.y < this.tank.height - BOTTOM_PAD) {
        fd.y += FOOD_SINK;
      } else {
        fd.settled++;
        this.waterQuality -= WASTE_PER_TICK;
        if (fd.settled >= FOOD_ROT_TICKS) this.food.splice(i, 1);
      }
    }
    this.waterQuality =
      Math.min(1, Math.max(0, this.waterQuality + FILTER_PER_TICK));
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i]!;
      b.y -= 0.8;
      if (b.y <= SURFACE) this.bubbles.splice(i, 1);
    }
  }

  private tickFish(f: Fish): void {
    f.stateTicks++;
    f.hunger = Math.min(1, f.hunger + HUNGER_PER_TICK);
    // Foul water makes fish sluggish; panic (startle) ignores it.
    const vigor = 0.5 + 0.5 * this.waterQuality;

    if (f.state === "startle") {
      f.x += f.speed * f.facing;
      f.y += f.vy;
      f.speed *= 0.94;
      f.vy *= 0.94;
      if (f.stateTicks > STARTLE_TICKS) this.setState(f, "drift");
    } else {
      const target =
          (f.hunger > HUNGER_SEEK && this.waterQuality > QUALITY_SEEK)
            ? this.nearestFood(f) : null;
      if (target) {
        this.setState(f, "seek");
        const dx = target.x - f.x, dy = target.y - f.y;
        const d = Math.max(Math.hypot(dx, dy), 1);
        f.facing = dx >= 0 ? 1 : -1;
        f.x += (dx / d) * Math.min(2.2, f.speed + 1) * vigor;
        f.y += (dy / d) * Math.min(2.2, f.speed + 1) * vigor;
        if (d < EAT_DIST) {
          target.eaten = true;
          f.hunger = 0;
          this.setState(f, "drift");
        }
      } else {
        this.setState(f, "drift");
        if (this.rand() < 0.02) f.speed = 0.4 + this.rand() * 1.2;
        if (this.rand() < 0.03) f.vy = (this.rand() - 0.5) * 1.4;
        if (this.rand() < 0.004) f.facing = -f.facing as 1 | -1;
        f.vy *= 0.97;
        f.x += f.speed * f.facing * vigor;
        f.y += f.vy * vigor;
      }
    }

    const maxY = this.tank.height - BOTTOM_PAD;
    if (f.x < MARGIN) { f.x = MARGIN; f.facing = 1; }
    if (f.x > this.tank.width - MARGIN) { f.x = this.tank.width - MARGIN; f.facing = -1; }
    f.y = Math.min(Math.max(f.y, SURFACE + MARGIN), maxY);

    // Fish gasp in foul water — bubbles come up to twice as often.
    if (this.rand() < BUBBLE_CHANCE * (2 - this.waterQuality)) {
      this.bubbles.push({ x: f.x + f.facing * 6, y: f.y - 3 });
    }
  }

  private setState(f: Fish, s: FishState): void {
    if (f.state !== s) {
      f.state = s;
      f.stateTicks = 0;
    }
  }

  private nearestFood(f: Fish): Food | null {
    let best: Food | null = null;
    let bd = Infinity;
    for (const fd of this.food) {
      if (fd.eaten) continue;
      const d = (fd.x - f.x) ** 2 + (fd.y - f.y) ** 2;
      if (d < bd) { bd = d; best = fd; }
    }
    return best;
  }
}
