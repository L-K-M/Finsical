import { makeRng } from "./rng.js";
import { HUNGER_SEEK, QUALITY_SEEK } from "./tuning.js";

export interface Tank {
  width: number;
  height: number;
}

export type FishState = "drift" | "seek" | "startle" | "turn";

export interface Fish {
  /** Stable identity — overview display and removal target. */
  id: number;
  /** Add-on/pack this fish came from; "" for starter fish. */
  species: string;
  /** Install URL of the add-on that spawned this fish — the precise
   * identity when two packs share a species name. */
  pack?: string;
  /** Renderer sheet index; undefined = round-robin assignment. */
  sheetIdx?: number;
  x: number;
  y: number;
  /** facing: +1 right, -1 left. Only a roll (turn) or a startle changes
   * it; steering keeps `heading` on the facing side. */
  facing: 1 | -1;
  /**
   * Swim heading in radians (screen coords: 0 = right, +y is down).
   * The original drives fish by a continuous heading; ours does too.
   */
  heading: number;
  /** Ticks since the current movement decision began (stroke phase). */
  phase: number;
  /** Strokes spent on the current destination beyond the first. */
  strokes: number;
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
  /** Render scale — juveniles spawn small, meals grow toward adult. */
  scale: number;
  /** 0 = full, 1 = starving */
  hunger: number;
  state: FishState;
  stateTicks: number;
  /** Ticks the current startle lasts; weak scares are brief flinches. */
  startleLen: number;
  /** Hops this panic wave has traveled from the tapped fish — caps
   * how far a startle cascade can spread. */
  panicHops: number;
  /** Half the drawn sprite's width and height at growth scale 1,
   * reported by the renderer once a sheet binds (runtime only, never
   * saved); the sim scales them by `scale`. Big adults keep their
   * bodies inside the glass by these; unset means a sprite small
   * enough for the fixed margins. */
  halfW?: number;
  halfH?: number;
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
/** Share of a big sprite's half-extent kept inside the glass; the rest
 * may pass behind the frame, the way fish reach a real tank's edge. */
const EDGE_KEEP = 0.8;

/** Smallest signed angle delta, wrapped to [−π, π). */
export function wrapAngle(d: number): number {
  return ((d + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) -
    Math.PI;
}
/** Hunger rise per tick — a fish starves after ~20 min unfed (~1.5 day
 * cycles), keeping Aquazone's once-a-day feeding rhythm. */
const HUNGER_PER_TICK = 1 / (30 * 1200);
/** Past this hunger a fish that isn't looking for food still takes a
 * pellet that drifts within NOTICE_DIST of it. */
const HUNGER_SNACK = 0.1;
const NOTICE_DIST = 24;
const EAT_DIST = 6;
const FOOD_SINK = 0.35;
/** Ticks a settled pellet takes to dissolve away (~45 s at 30 tps). */
export const FOOD_ROT_TICKS = 30 * 45;
/** Quality drained per tick per rotting pellet (~0.2 over a full rot). */
const WASTE_PER_TICK = 1 / 6000;
/** Filtration: recovers a fouled tank over ~7 min of clean water. */
const FILTER_PER_TICK = 1 / 12000;
const STARTLE_RADIUS = 48;
/** Length of a full-strength startle; weaker ones last down to half. */
const STARTLE_TICKS = 30;
/** Dart speed cap, px/tick: what a point-blank tap produces. */
const STARTLE_MAX_SPEED = 3.5;
/** Speed kept when a startled fish bounces off a side wall. */
const STARTLE_BOUNCE = 0.6;
/** Reactions weaker than this read as frozen fish — trims the
 * effective radius to ~95% of STARTLE_RADIUS (taps) and ~90% of
 * PROP_RADIUS (propagated panic, whose strength is halved first). */
const MIN_STARTLE_STRENGTH = 0.05;
/** How close a darting fish must pass to startle a neighbor. */
const PROP_RADIUS = 32;
/** Hops a panic wave may travel from the fish that was tapped. */
const MAX_PANIC_HOPS = 2;
/**
 * Movement budget per decision. The original runs 60 ticks/s and re-decides
 * every 64 ticks (~1.07 s); halved here for our 30 tps clock.
 */
const MOVE_TICKS = 32;
/**
 * Extra strokes a fish may spend on a far destination before picking a
 * new one. Wander targets are often two or three strokes away; cutting
 * each move short after one stroke made fish re-aim (and so roll)
 * about once a second.
 */
const MAX_STROKES = 3;
/** Stroke ramp divisor: speed = cruise·(phase+1)²/64 while accelerating. */
const RAMP_DIV = 64;
/** Per-tick speed kept while a new stroke's ramp is still below it:
 * the fish glides into the next stroke instead of stopping dead. */
const GLIDE = 0.93;
/** Brake decay divisor: speed = peak − (phase−latch)²·peak/128. */
const BRAKE_DIV = 128;
/** Approach radius around the destination where the brake latches. */
const BRAKE_DIST = 24;
/** Heading steer rate, rad/tick — a 180° reversal takes ~19 ticks. */
const TURN_RATE = Math.PI / 20;
/** Steepest heading off the facing axis (105 degrees): a little past
 * straight up or down, so a fish can close on a pellet it is just
 * overshooting without rolling. Anything steeper needs a roll. */
const MAX_PITCH = Math.PI * 7 / 12;
/** How far behind the fish a target may sit and still be reached by
 * pitching over rather than rolling: about the turning circle at
 * cruise, so diving onto a pellet right below never rolls. */
const TURN_SLACK = 12;
/** Chance a new destination drawn behind the fish is mirrored ahead
 * of it instead: about 70% of moves carry on the way the fish faces,
 * so it rolls every few seconds rather than on most decisions. */
const AHEAD_BIAS = 0.4;
/** A mirrored target closer than this to the fish is no move at all
 * (the mirror clamped onto a wall the fish is already at), so the
 * original draw behind it stands. */
const MIRROR_MIN = 4;
/** Half-height of a fish's preferred depth band. */
const BAND_HALF = 24;
/** Chance per decision of picking a new depth band. */
const BAND_SHIFT = 0.2;
/** Chance per decision a wander anchors on a schoolmate's
 * neighborhood instead of the open water. */
const SCHOOL_PULL = 0.35;
/** Loose scatter around a schoolmate, px — grouping, not lockstep. */
const SCHOOL_RADIUS = 42;
/**
 * Roll duration. The original's turn steps half the 32-pose ring
 * (~16 poses at 60 tps ≈ 0.27 s); ~10 ticks here at 30 tps.
 */
export const TURN_TICKS = 10;
/** Juveniles spawn at 0.70–0.95 of adult size. Adult (1) is the art
 * scale the renderer draws a species at, so growth never makes a fish
 * bigger than its own art. */
const SPAWN_SCALE_MIN = 0.7;
const SPAWN_SCALE_RANGE = 0.25;
/** Each meal closes this share of the gap to adult size — asymptotic:
 * ~90% of the way after ~37 meals. */
const GROWTH = 0.06;
const MAX_SCALE = 1;
const BUBBLE_CHANCE = 0.004;
/** One full day/night cycle in ticks (~13 min at 30 tps). */
export const DAY_TICKS = 24000;

/** Pitch off the facing axis, limited to MAX_PITCH either way. */
function clampPitch(p: number): number {
  return Math.max(-MAX_PITCH, Math.min(MAX_PITCH, p));
}

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
  private nextId = 0;

  constructor(tank: Tank, seed = 1) {
    this.tank = tank;
    this.rand = makeRng(seed);
  }

  addFish(fish: Partial<Fish> & { x: number; y: number }): Fish {
    const f: Fish = {
      id: this.nextId, species: "",
      facing: 1, heading: 0, phase: 0, latch: -1, peak: 0, cruise: 1,
      speed: 1, vy: 0, tx: 0, ty: 0, turnDir: 1, turnFrom: 1,
      strokes: 0, bandY: 0, scale: 1, hunger: 0.2,
      state: "drift", stateTicks: 0, startleLen: STARTLE_TICKS,
      panicHops: 0, ...fish,
    };
    // Steering keeps heading on the facing side. A fish given only a
    // facing, or saved mid-roll, would otherwise start swimming
    // backwards; mirror its heading round instead.
    if (Math.cos(f.heading) * f.facing < 0)
      f.heading = wrapAngle(Math.PI - f.heading);
    // A spread of {id: undefined} would poison the counter with NaN.
    if (!Number.isFinite(f.id)) f.id = this.nextId;
    // Loaded fish carry their saved id — never reissue it.
    this.nextId = Math.max(this.nextId, f.id + 1);
    // Each target field defaults on its own: a caller giving only tx
    // must not leave ty at the 0 default (the surface).
    if (!Number.isFinite(fish.tx)) f.tx = f.x;
    if (!Number.isFinite(fish.ty)) f.ty = f.y;
    if (!Number.isFinite(fish.bandY)) f.bandY = f.y;
    // Saved/restored fish keep their size; new fish spawn as juveniles
    // of varying size so a school doesn't read as clones.
    if (fish.scale === undefined)
      f.scale = SPAWN_SCALE_MIN + this.rand() * SPAWN_SCALE_RANGE;
    else if (!Number.isFinite(f.scale) || f.scale <= 0)
      f.scale = 1; // 0/NaN/negative from a bad save mustn't render invisible
    else
      // Bad saves shouldn't render invisible or dwarf the tank.
      f.scale = Math.min(Math.max(f.scale, SPAWN_SCALE_MIN), MAX_SCALE);
    this.fish.push(f);
    return f;
  }

  /** Remove a fish by id (tank overview). Returns false if not found. */
  removeFish(id: number): boolean {
    const i = this.fish.findIndex((f) => f.id === id);
    if (i < 0) return false;
    this.fish.splice(i, 1);
    return true;
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
        if (k < MIN_STARTLE_STRENGTH) continue;
        this.startle(f, dx, dy, d, k, 0);
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
        if (k < MIN_STARTLE_STRENGTH) continue;
        this.startle(b, dx, dy, d, k, a.panicHops + 1);
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
      if (f.stateTicks > f.startleLen) {
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
        // Facing already flipped mid-roll; head for the target on that
        // side. The roll bled off most of the speed, and the new stroke
        // builds it back from there.
        const axis = f.facing > 0 ? 0 : Math.PI;
        f.heading = wrapAngle(axis + clampPitch(
          wrapAngle(Math.atan2(f.ty - f.y, f.tx - f.x) - axis)));
        this.setState(f, "drift");
        f.phase = 0;
        f.latch = -1;
      }
    } else {
      const food = this.foodFor(f);
      let turning = false;
      if (food) {
        // Seeking carries the current speed on rather than restarting
        // the stroke ramp from wherever the wander stroke left it.
        if (f.state !== "seek") this.resumeStroke(f);
        this.setState(f, "seek");
        f.tx = food.x; f.ty = food.y;
        turning = this.maybeTurn(f);
      } else if (f.state === "seek") {
        // The pellet is gone: eaten by another fish, rotted, or the
        // water turned. Give up on it and wander off.
        this.setState(f, "drift");
        this.decide(f);
        turning = this.maybeTurn(f);
      }
      let dist = Math.hypot(f.tx - f.x, f.ty - f.y);
      if (!food && !turning && (f.phase >= MOVE_TICKS || dist < 4)) {
        if (dist >= BRAKE_DIST && f.strokes < MAX_STROKES) {
          f.strokes++;
          f.phase = 0;
          f.latch = -1;
        } else {
          this.decide(f);
          dist = Math.hypot(f.tx - f.x, f.ty - f.y);
        }
        turning = this.maybeTurn(f);
      }
      // A brake latched on an earlier target, or on a pellet that has
      // since sunk away, would leave the fish crawling after the food.
      if (food && f.latch >= 0 && dist > BRAKE_DIST) this.resumeStroke(f);

      // Steer the continuous heading toward the destination; the fish
      // curves instead of snapping around. A fish that just entered a
      // turn keeps its old heading untouched — the roll drifts on it.
      // Steering works in pitch off the facing axis, clamped to
      // MAX_PITCH, so the heading never swings round to the other side:
      // facing changes only by rolling, never as a one-frame mirror.
      const axis = f.facing > 0 ? 0 : Math.PI;
      const cur = clampPitch(wrapAngle(f.heading - axis));
      const want = turning ? cur : clampPitch(
        wrapAngle(Math.atan2(f.ty - f.y, f.tx - f.x) - axis));
      f.heading = wrapAngle(axis + cur +
        Math.min(TURN_RATE, Math.max(-TURN_RATE, want - cur)));

      // Stroke pulse — the original's "fin push": quadratic acceleration
      // out of the decision, then quadratic braking once the destination
      // region is reached (dart-and-glide, not linear cruise). A new
      // stroke glides on the speed it still carries until the ramp
      // catches up, so fish never stop dead between strokes.
      if (f.latch < 0) {
        if (dist < BRAKE_DIST) { f.latch = f.phase; f.peak = f.speed; }
        else f.speed = Math.max(f.speed * GLIDE, Math.min(f.cruise,
                                f.cruise * (f.phase + 1) ** 2 / RAMP_DIV));
      } else {
        const g = f.phase - f.latch;
        // A seeking fish must still outswim the sinking pellet.
        const floor = food
          ? Math.min(f.cruise,
                     Math.max(f.cruise * 0.15, FOOD_SINK * 1.5 / vigor))
          : f.cruise * 0.15;
        f.speed = Math.max(floor, f.peak - g * g * f.peak / BRAKE_DIV);
      }

      const vx = Math.cos(f.heading) * f.speed * vigor;
      const vy = Math.sin(f.heading) * f.speed * vigor;
      f.x += vx;
      f.y += vy;
      f.vy = vy;

      if (food) {
        const d = Math.max(Math.hypot(food.x - f.x, food.y - f.y), 1);
        // A big fish can't sink to a settled pellet's depth or press
        // its centre against the side glass; it eats what comes within
        // reach of its body. EDGE_KEEP matches room()'s floor clamp, so
        // the reach spans the depth gap, and the pellet's distance
        // outside room()'s sides is added to span the wall gap (at a
        // corner the two gaps sum to more than their hypotenuse).
        const { x0, x1 } = this.room(f);
        const wallGap = Math.max(0, x0 - food.x, food.x - x1);
        if (d < Math.max(EAT_DIST, this.halfH(f) * EDGE_KEEP) + wallGap) {
          food.eaten = true;
          f.hunger = 0;
          // A meal puts a little size on — asymptotic toward adult.
          f.scale += (MAX_SCALE - f.scale) * GROWTH;
          this.setState(f, "drift");
          this.decide(f);
          // The next destination may lie behind: roll to it now rather
          // than pitching against the clamp until the next decision.
          this.maybeTurn(f);
        }
      }
    }

    const { x0, x1, y0, y1 } = this.room(f);
    let hit = false;
    // Direction back into the tank from a side wall the fish reached.
    const away = f.x < x0 ? 1 : f.x > x1 ? -1 : 0;
    if (away) {
      f.x = away > 0 ? x0 : x1; hit = true;
      if (f.state === "startle") {
        // A startle rebuilds its heading from facing every tick, so
        // bounce the facing itself or the fish stays pressed there.
        if (f.facing !== away) {
          f.facing = away;
          f.speed *= STARTLE_BOUNCE;
        }
      } else if (f.state === "turn") {
        // Glance off the wall instead of keeping a heading into it.
        if (Math.cos(f.heading) * away < 0)
          f.heading = wrapAngle(Math.PI - f.heading);
      }
      // Drift and seek keep their heading: mirroring it would swim the
      // fish backwards. The early decision below rolls it around.
    }
    if (f.y < y0) {
      f.y = y0; hit = true;
      if (Math.sin(f.heading) < 0) f.heading = -f.heading;
      if (f.vy < 0 && f.state === "startle") f.vy = -f.vy;
    }
    if (f.y > y1) {
      f.y = y1; hit = true;
      if (Math.sin(f.heading) > 0) f.heading = -f.heading;
      if (f.vy > 0 && f.state === "startle") f.vy = -f.vy;
    }
    // A hard clamp means the movement ran out of room — decide early.
    // Not while seeking: phase is also the brake's clock, and a fish
    // waiting under the surface for a pellet would stall.
    if (hit && f.state === "drift") {
      f.phase = Math.max(f.phase, MOVE_TICKS);
      f.strokes = MAX_STROKES;
    }

    // Fish gasp in foul water — bubbles come up to twice as often.
    // Bubbles leave from the mouth, not the middle of a big body.
    if (this.rand() < BUBBLE_CHANCE * (2 - this.waterQuality)) {
      this.bubbles.push({
        x: f.x + f.facing * Math.max(6, this.halfW(f) - 3), y: f.y - 3 });
    }
  }

  /**
   * Pick a new destination and reset the stroke. Wander targets stay in
   * the fish's depth band; occasionally the band itself migrates, like
   * the original's per-tick swim-bound jitter.
   */
  private decide(f: Fish): void {
    const { x0, x1, y0, y1 } = this.room(f);
    if (this.rand() < BAND_SHIFT) f.bandY = y0 + this.rand() * (y1 - y0);
    f.tx = x0 + this.rand() * (x1 - x0);
    if ((f.tx - f.x) * f.facing < 0 && this.rand() < AHEAD_BIAS) {
      const mx = Math.min(x1, Math.max(x0, 2 * f.x - f.tx));
      if (Math.abs(mx - f.x) > MIRROR_MIN) f.tx = mx;
    }
    f.ty = Math.min(
      y1, Math.max(y0, f.bandY + (this.rand() - 0.5) * 2 * BAND_HALF));
    // Schooling: a same-species wander sometimes anchors on a
    // schoolmate's neighborhood — loose grouping, not lockstep.
    if (this.rand() < SCHOOL_PULL) {
      const mates = this.fish.filter(
        (m) => m !== f && m.species === f.species);
      if (mates.length) {
        const m = mates[(this.rand() * mates.length) | 0]!;
        f.tx = Math.min(x1, Math.max(x0,
          m.x + (this.rand() - 0.5) * 2 * SCHOOL_RADIUS));
        // Half the x-spread vertically — schools sit flat in a band.
        f.ty = Math.min(y1, Math.max(y0,
          m.y + (this.rand() - 0.5) * SCHOOL_RADIUS));
      }
    }
    f.phase = 0;
    f.latch = -1;
    f.strokes = 0;
  }

  /** Re-arm the stroke ramp at the fish's current speed, so it keeps
   * accelerating from there instead of dropping to the ramp's start. */
  private resumeStroke(f: Fish): void {
    f.latch = -1;
    f.phase = Math.max(0,
      Math.ceil(Math.sqrt(f.speed / f.cruise * RAMP_DIV)) - 1);
  }

  /** Scare a fish into a dart away from the scare, strength k in (0, 1].
   * A scare only ever speeds a fish up: even a faint one reads as a
   * flinch past its cruise, never as slowing down. The cap stops
   * repeated taps from compounding. */
  private startle(f: Fish, dx: number, dy: number, d: number, k: number,
                  hops: number): void {
    f.state = "startle";
    f.stateTicks = 0;
    f.startleLen = Math.round(STARTLE_TICKS * (0.5 + 0.5 * k));
    f.panicHops = hops;
    f.facing = dx >= 0 ? 1 : -1;
    f.speed = Math.min(STARTLE_MAX_SPEED,
                       Math.max(f.speed, f.cruise * (1 + 1.5 * k)));
    f.vy = (dy / d) * 2.5 * k;
  }

  /** A target behind the fish needs a reversal — the original plays
   * the roll-through-edge-on turn rather than steering through it.
   * A near-vertical target only slightly behind just pitches over.
   * Returns whether the roll began. */
  private maybeTurn(f: Fish): boolean {
    const back = (f.x - f.tx) * f.facing;
    if (back <= 0) return false;
    const want = Math.atan2(f.ty - f.y, f.tx - f.x);
    if (back > TURN_SLACK ||
        Math.abs(wrapAngle(want - (f.facing > 0 ? 0 : Math.PI))) > MAX_PITCH) {
      this.setState(f, "turn");
      f.turnFrom = f.facing;
      // Both half-rings reach the opposite profile; pick randomly.
      f.turnDir = this.rand() < 0.5 ? 1 : -1;
      return true;
    }
    return false;
  }

  /** Half the body's drawn width and height at its current growth. */
  private halfW(f: Fish): number { return (f.halfW ?? 0) * f.scale; }
  private halfH(f: Fish): number { return (f.halfH ?? 0) * f.scale; }

  /** Where a fish's centre may go: MARGIN from the walls for small
   * sprites, most of the body's half-extent for big ones. */
  private room(f: Fish): { x0: number; x1: number; y0: number; y1: number } {
    const { width: w, height: h } = this.tank;
    const kx = this.halfW(f) * EDGE_KEEP, ky = this.halfH(f) * EDGE_KEEP;
    const x0 = Math.min(Math.max(MARGIN, kx), w / 2);
    const y0 = Math.min(SURFACE + Math.max(MARGIN, ky), h / 2);
    return { x0, x1: w - x0, y0,
             y1: Math.max(y0, h - Math.max(BOTTOM_PAD, ky)) };
  }

  private setState(f: Fish, s: FishState): void {
    if (f.state !== s) {
      f.state = s;
      f.stateTicks = 0;
    }
  }

  /** The pellet this fish goes for this tick, if any. */
  private foodFor(f: Fish): Food | null {
    if (f.hunger <= HUNGER_SNACK || this.waterQuality <= QUALITY_SEEK)
      return null;
    const food = this.nearestFood(f);
    if (!food || f.hunger > HUNGER_SEEK) return food;
    const dx = food.x - f.x, dy = food.y - f.y;
    return dx * dx + dy * dy < NOTICE_DIST * NOTICE_DIST ? food : null;
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
