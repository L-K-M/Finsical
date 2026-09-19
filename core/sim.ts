import { makeRng } from "./rng.js";

export interface Tank {
  width: number;
  height: number;
}

export type FishState = "drift" | "seek" | "startle" | "turn";

export interface Fish {
  x: number;
  y: number;
  /** facing: +1 right, -1 left — derived from `heading` each tick. */
  facing: 1 | -1;
  /**
   * Swim heading in radians (screen coords: 0 = right, +y is down).
   * The original drives fish by a continuous heading; ours does too.
   */
  heading: number;
  /** Ticks since the current movement decision began (stroke phase). */
  phase: number;
  /** Tick at which the brake latched; -1 while still accelerating. */
  latch: number;
  /** Speed the fish carried when the brake latched. */
  peak: number;
  /** Cruise speed ceiling, px/tick. */
  cruise: number;
  /** pixels per tick — the stroke-pulse output */
  speed: number;
  /** vertical velocity, kept in sync with heading·speed */
  vy: number;
  /** Wander destination. */
  tx: number;
  ty: number;
  /** Roll direction around the pose ring during a turn (+1/−1). */
  turnDir: 1 | -1;
  /** Facing the fish entered the turn with — the roll's start pose. */
  turnFrom: 1 | -1;
  /** Preferred depth band the fish wanders around. */
  bandY: number;
  /** 0 = full, 1 = starving */
  hunger: number;
  state: FishState;
  stateTicks: number;
  /** Hops this panic wave has traveled from the tapped fish — caps
   * how far a startle cascade can spread. */
  panicHops: number;
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

/** Smallest signed angle delta, wrapped to [−π, π). */
export function wrapAngle(d: number): number {
  return ((d + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) -
    Math.PI;
}
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
/** How close a darting fish must pass to startle a neighbor. */
const PROP_RADIUS = 32;
/** Hops a panic wave may travel from the fish that was tapped. */
const MAX_PANIC_HOPS = 2;
/**
 * Movement budget per decision. The original runs 60 ticks/s and re-decides
 * every 64 ticks (~1.07 s); halved here for our 30 tps clock.
 */
const MOVE_TICKS = 32;
/** Stroke ramp divisor: speed = cruise·(phase+1)²/64 while accelerating. */
const RAMP_DIV = 64;
/** Brake decay divisor: speed = peak − (phase−latch)²·peak/128. */
const BRAKE_DIV = 128;
/** Approach radius around the destination where the brake latches. */
const BRAKE_DIST = 24;
/** Heading steer rate, rad/tick — a 180° reversal takes ~19 ticks. */
const TURN_RATE = Math.PI / 20;
/** Half-height of a fish's preferred depth band. */
const BAND_HALF = 24;
/** Chance per decision of picking a new depth band. */
const BAND_SHIFT = 0.2;
/**
 * Roll duration. The original's turn steps half the 32-pose ring
 * (~16 poses at 60 tps ≈ 0.27 s); ~10 ticks here at 30 tps.
 */
export const TURN_TICKS = 10;
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
      facing: 1, heading: 0, phase: 0, latch: -1, peak: 0, cruise: 1,
      speed: 1, vy: 0, tx: 0, ty: 0, turnDir: 1, turnFrom: 1,
      bandY: 0, hunger: 0.2,
      state: "drift", stateTicks: 0, panicHops: 0, ...fish,
    };
    if (!fish.tx && !fish.ty) { f.tx = f.x; f.ty = f.y; }
    if (!fish.bandY) f.bandY = f.y;
    this.fish.push(f);
    return f;
  }

  /** Drop a food pellet at x; it sinks to the gravel. */
  dropFood(x: number): void {
    const cx = Math.min(Math.max(x, MARGIN), this.tank.width - MARGIN);
    this.food.push({ x: cx, y: SURFACE + 2, eaten: false, settled: 0 });
  }

  /** Knock on the glass: startle fish near (x, y), strength fading
   * with distance like the original's 1 − dist/radius falloff. */
  tap(x: number, y: number): void {
    for (const f of this.fish) {
      const dx = f.x - x, dy = f.y - y;
      if (dx * dx + dy * dy < STARTLE_RADIUS * STARTLE_RADIUS) {
        const d = Math.max(Math.hypot(dx, dy), 1);
        const k = 1 - d / STARTLE_RADIUS;
        if (k < 0.05) continue; // sub-threshold reactions read as frozen fish
        f.state = "startle";
        f.stateTicks = 0;
        f.panicHops = 0;
        f.facing = dx >= 0 ? 1 : -1;
        f.speed = 3.5 * k;
        f.vy = (dy / d) * 2.5 * k;
      }
    }
  }

  /** 0.3 = night, 1 = full daylight. */
  get light(): number {
    const t = (this.tickCount % DAY_TICKS) / DAY_TICKS;
    return 0.3 + 0.7 * Math.max(0, Math.sin(t * Math.PI));
  }

  tick(): void {
    this.tickCount++;
    for (const f of this.fish) this.tickFish(f);
    // Panic propagates: a freshly darting fish startles close
    // neighbors — fish-on-fish reaction on the same distance falloff.
    for (const a of this.fish) {
      if (a.state !== "startle" || a.stateTicks > 4 ||
          a.panicHops >= MAX_PANIC_HOPS) continue;
      for (const b of this.fish) {
        if (b === a || b.state === "startle") continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        if (dx * dx + dy * dy >= PROP_RADIUS * PROP_RADIUS) continue;
        const d = Math.max(Math.hypot(dx, dy), 1);
        const k = 0.5 * (1 - d / PROP_RADIUS);
        if (k < 0.05) continue; // sub-threshold reactions read as frozen fish
        b.state = "startle";
        b.stateTicks = 0;
        b.panicHops = a.panicHops + 1;
        b.facing = dx >= 0 ? 1 : -1;
        b.speed = 3.5 * k;
        b.vy = (dy / d) * 2.5 * k;
      }
    }
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
    f.phase++;
    f.hunger = Math.min(1, f.hunger + HUNGER_PER_TICK);
    // Foul water makes fish sluggish; panic (startle) ignores it.
    const vigor = 0.5 + 0.5 * this.waterQuality;

    if (f.state === "startle") {
      f.x += f.speed * f.facing;
      f.y += f.vy;
      f.speed *= 0.94;
      f.vy *= 0.94;
      f.heading = Math.atan2(f.vy, f.speed * f.facing);
      if (f.stateTicks > STARTLE_TICKS) {
        this.setState(f, "drift");
        this.decide(f);
        this.maybeTurn(f);
      }
    } else if (f.state === "turn") {
      // Barrel roll through the pose ring: the fish drifts on its old
      // heading while the renderer steps pose groups toward the
      // opposite profile. Facing flips as the roll passes edge-on.
      const vx = Math.cos(f.heading) * f.speed * vigor;
      const vy = Math.sin(f.heading) * f.speed * vigor;
      f.x += vx;
      f.y += vy;
      f.vy = vy;
      f.speed *= 0.88;
      if (f.stateTicks >= TURN_TICKS >> 1 && f.facing === f.turnFrom) {
        f.facing = (-f.facing) as 1 | -1;
      }
      if (f.stateTicks >= TURN_TICKS) {
        f.heading = wrapAngle(Math.atan2(f.ty - f.y, f.tx - f.x));
        f.facing = Math.cos(f.heading) >= 0 ? 1 : -1;
        this.setState(f, "drift");
        // The new movement starts at rest — the pulse rebuilds.
        f.phase = 0;
        f.latch = -1;
        f.speed = f.cruise * 0.15;
      }
    } else {
      const food =
          (f.hunger > HUNGER_SEEK && this.waterQuality > QUALITY_SEEK)
            ? this.nearestFood(f) : null;
      let turning = false;
      if (food) {
        this.setState(f, "seek");
        f.tx = food.x; f.ty = food.y;
        turning = this.maybeTurn(f);
      }
      let dist = Math.hypot(f.tx - f.x, f.ty - f.y);
      if (!food && (f.phase >= MOVE_TICKS || dist < 4)) {
        this.decide(f);
        dist = Math.hypot(f.tx - f.x, f.ty - f.y);
        turning = this.maybeTurn(f);
      }

      // Steer the continuous heading toward the destination; the fish
      // curves instead of snapping around. A fish that just entered a
      // turn keeps its old heading untouched — the roll drifts on it.
      const want = turning ? f.heading
                           : Math.atan2(f.ty - f.y, f.tx - f.x);
      const turn = wrapAngle(want - f.heading);
      f.heading = wrapAngle(f.heading +
        Math.min(TURN_RATE, Math.max(-TURN_RATE, turn)));

      // Stroke pulse — the original's "fin push": quadratic acceleration
      // out of the decision, then quadratic braking once the destination
      // region is reached (dart-and-glide, not linear cruise).
      if (f.latch < 0) {
        if (dist < BRAKE_DIST) { f.latch = f.phase; f.peak = f.speed; }
        else f.speed = Math.min(f.cruise,
                                f.cruise * (f.phase + 1) ** 2 / RAMP_DIV);
      } else {
        const g = f.phase - f.latch;
        f.speed = Math.max(f.cruise * 0.15,
                           f.peak - g * g * f.peak / BRAKE_DIV);
      }

      const vx = Math.cos(f.heading) * f.speed * vigor;
      const vy = Math.sin(f.heading) * f.speed * vigor;
      f.x += vx;
      f.y += vy;
      f.vy = vy;
      f.facing = Math.cos(f.heading) >= 0 ? 1 : -1;

      if (food) {
        const d = Math.max(Math.hypot(food.x - f.x, food.y - f.y), 1);
        if (d < EAT_DIST) {
          food.eaten = true;
          f.hunger = 0;
          this.setState(f, "drift");
          this.decide(f);
        }
      }
    }

    const maxY = this.tank.height - BOTTOM_PAD;
    let hit = false;
    if (f.x < MARGIN) {
      f.x = MARGIN; hit = true;
      // Glance off the wall instead of keeping a heading into it.
      if (Math.cos(f.heading) < 0) f.heading = wrapAngle(Math.PI - f.heading);
    }
    if (f.x > this.tank.width - MARGIN) {
      f.x = this.tank.width - MARGIN; hit = true;
      if (Math.cos(f.heading) > 0) f.heading = wrapAngle(Math.PI - f.heading);
    }
    if (f.y < SURFACE + MARGIN) {
      f.y = SURFACE + MARGIN; hit = true;
      if (Math.sin(f.heading) < 0) f.heading = -f.heading;
    }
    if (f.y > maxY) {
      f.y = maxY; hit = true;
      if (Math.sin(f.heading) > 0) f.heading = -f.heading;
    }
    // A hard clamp means the movement ran out of room — decide early.
    if (hit && f.state !== "startle") f.phase = Math.max(f.phase, MOVE_TICKS);

    // Fish gasp in foul water — bubbles come up to twice as often.
    if (this.rand() < BUBBLE_CHANCE * (2 - this.waterQuality)) {
      this.bubbles.push({ x: f.x + f.facing * 6, y: f.y - 3 });
    }
  }

  /**
   * Pick a new destination and reset the stroke. Wander targets stay in
   * the fish's depth band; occasionally the band itself migrates, like
   * the original's per-tick swim-bound jitter.
   */
  private decide(f: Fish): void {
    const maxY = this.tank.height - BOTTOM_PAD;
    if (this.rand() < BAND_SHIFT) {
      f.bandY = SURFACE + MARGIN +
                this.rand() * (maxY - SURFACE - MARGIN);
    }
    f.tx = MARGIN + this.rand() * (this.tank.width - MARGIN * 2);
    f.ty = Math.min(
      maxY,
      Math.max(SURFACE + MARGIN,
               f.bandY + (this.rand() - 0.5) * 2 * BAND_HALF));
    f.phase = 0;
    f.latch = -1;
    // Rest speed — the pulse rebuilds it from here.
    f.speed = f.cruise * 0.15;
  }

  /** A target behind the fish needs a reversal — the original plays
   * the roll-through-edge-on turn rather than steering through it.
   * A dead-vertical target (cos≈0) just pitches over.
   * Returns whether the roll began. */
  private maybeTurn(f: Fish): boolean {
    const want = Math.atan2(f.ty - f.y, f.tx - f.x);
    if (Math.cos(want) * f.facing < -1e-6) {
      this.setState(f, "turn");
      f.turnFrom = f.facing;
      // Both half-rings reach the opposite profile; pick randomly.
      f.turnDir = this.rand() < 0.5 ? 1 : -1;
      return true;
    }
    return false;
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
