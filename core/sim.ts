import { makeRng } from "./rng.js";
import { FISH_CAP, HUNGER_SEEK, QUALITY_SEEK } from "./tuning.js";
import { demoLight, DUSK_LIGHT } from "./light.js";
import { Aquarium } from "./aquarium/aquarium.js";
import type { Resident } from "./aquarium/aquarium.js";
import { hungerOf, newLife, stomachSize, vigorOf }
  from "./aquarium/life.js";
import type { FishLife } from "./aquarium/life.js";
import { DEFAULT_CARE } from "./data/species.js";
import type { SpeciesCare } from "./data/species.js";

export interface Tank {
  width: number;
  height: number;
}

export type FishState =
  "drift" | "seek" | "startle" | "turn" | "sleep" | "dead";

export interface Fish {
  /** Stable identity — overview display and removal target. */
  id: number;
  /** Add-on/pack this fish came from; "" for starter fish. */
  species: string;
  /** Install URL of the add-on that spawned this fish — the precise
   * identity when two packs share a species name. */
  pack?: string;
  /** The pack entry (zip member) inside `pack` this fish came from —
   * set for multi-entry add-ons so each fish rebinds to its own blob's
   * sheet after relaunch instead of the last entry's. */
  entry?: string;
  /** Renderer sheet index; undefined = no sheet bound. */
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
  /** 0 = full, 1 = starving: how empty the stomach is. The life model
   * (core/aquarium) keeps it in step with `life`. */
  hunger: number;
  /** Health, age, sickness: the original's physiology. Created with the
   * fish when not given. */
  life?: FishLife;
  /** A dead fish's drift (the original's dying animation): it rises
   * belly-up, floats for `deadTicks`, sinks, and rests on the gravel. */
  corpse?: "rise" | "float" | "sink" | "rest";
  deadTicks?: number;
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

/** Lifecycle transitions queued for the renderer/audio to react to;
 * the caller drains the array each tick. */
export interface SimEvent {
  type: "sick" | "dead" | "birth";
  fish: Fish;
}

export interface Food {
  x: number;
  y: number;
  eaten: boolean;
  /** ticks spent rotting on the gravel; then it breaks up into the water */
  settled: number;
  /** the rare golden pellet — a meal worth a victory roll */
  golden?: boolean;
}

export interface Bubble {
  x: number;
  y: number;
}

export const MARGIN = 16;
/** Top of the water; food enters a couple of pixels below it. */
export const SURFACE = 10;
/** Y where a dropped pellet appears (see dropFood). */
export const FOOD_ENTRY_Y = SURFACE + 2;
export const BOTTOM_PAD = 12;
/** Share of a big sprite's half-extent kept inside the glass; the rest
 * may pass behind the frame, the way fish reach a real tank's edge. */
const EDGE_KEEP = 0.8;

/** Smallest signed angle delta, wrapped to [−π, π). */
export function wrapAngle(d: number): number {
  return ((d + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) -
    Math.PI;
}
/** Past this hunger a fish that isn't looking for food still takes a
 * pellet that drifts within NOTICE_DIST of it. */
const HUNGER_SNACK = 0.1;
const NOTICE_DIST = 24;
const EAT_DIST = 6;
const FOOD_SINK = 0.35;
/** One pellet in fifty drops gold — a meal worth a victory roll. */
const GOLDEN_ODDS = 1 / 50;
/** Ticks a settled pellet takes to dissolve away (~45 s at 30 tps). */
export const FOOD_ROT_TICKS = 30 * 45;
/** Food units in a pellet. A fish's stomach holds 0.2 × its weight
 * (about its sprite size in px): a pellet nearly fills a small fish,
 * a big one takes a few. */
export const PELLET_UNITS = 3;
/** Weight of a fish whose sprite size isn't known yet. */
const DEFAULT_WEIGHT = 20;
/** Dissolved organics (mg/L) at which the water reads fully fouled:
 * uneaten food clouds it until the filter traps it. */
const MURK_ORGANICS = 5;
/** Corpse drift, px/tick: rising belly-up, then sinking. */
const CORPSE_RISE = 0.25;
const CORPSE_SINK = 0.5;
/** Longest a body floats at the surface before sinking, ticks (the
 * original: random(0x7fff) frames). */
const CORPSE_FLOAT_MAX = 0x7fff;
/** Sick fish keep to the bottom fifth of their range. */
const SICK_DEPTH = 0.8;
/** Uneaten pellets the tank holds before dropFood refuses: past it a
 * feed only adds waste. Even at the cap, six rotting pellets drain
 * quality ~7x faster than the filter recovers it, so sustained
 * overfeeding still fouls the tank without a water change. */
export const MAX_UNEATEN = 6;
/** Quality drained per tick per rotting pellet (~0.14 over a full rot). */
const WASTE_PER_TICK = 1 / 10000;
/** Filtration: recovers a fouled tank over ~7 min of clean water. */
const FILTER_PER_TICK = 1 / 12000;
/** Below this water quality fish start gasping: wander targets pull
 * toward the surface, all the way to just under it at quality 0. */
const GASP_QUALITY = 0.45;
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
export const BAND_HALF = 24;
/** Chance per decision of picking a new depth band. */
const BAND_SHIFT = 0.2;
/** Chance per decision a wander anchors on a schoolmate's
 * neighborhood instead of the open water. PR #154's longer strokes
 * dilute each anchor, so the pull is high enough to still read as a
 * school. */
const SCHOOL_PULL = 0.6;
/** Loose scatter around a schoolmate, px — grouping, not lockstep. */
const SCHOOL_RADIUS = 42;
/** Above this hunger a fish begs near the surface between meals. */
const BEG_HUNGER = 0.75;
/** The hovered pointer is noticed inside this radius. */
export const NOTICE_RADIUS = 80;
/** How many calm fish may gather at the pointer at once — the
 * original let a small crowd press the glass; a hard cap keeps a
 * full tank from emptying onto the cursor. */
const NOTICE_CAP = 4;
/** Extra standoff per watcher rank so a gathered crowd fans out
 * instead of stacking on one point. */
const NOTICE_STAGGER = 10;
/** Smallest half-size of a fish's pick box, in tank px (fishAt). */
const HIT_MIN = 8;
/** This close to the pointer a noticed fish just hovers nearby. */
const NOTICE_STANDOFF = 16;
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
/** Per tick, a bubble working loose from the gravel: one every ~8 s. */
const AMBIENT_BUBBLE = 0.004;
/** How far a bubble rises per tick. */
export const BUBBLE_RISE = 0.8;
/** One full day/night cycle in ticks (~13 min at 30 tps). */
export const DAY_TICKS = 24000;
/** Fish bed down below this light; wake again past the higher
 * threshold — the hysteresis keeps a fish on the dusk edge from
 * fluttering between states. Exported for the sleep test. */
export const SLEEP_LIGHT = DUSK_LIGHT;
export const WAKE_LIGHT = 0.6;
/** Two healthy, well-fed, grown fish of a species occasionally have a
 * fry — ~one birth per 10 min in a thriving tank. FRY_SCALE is the
 * juvenile minimum addFish clamps to, so a newborn reads visibly
 * smaller than its parents and grows up on its meals. */
const BIRTH_HUNGER = 0.3;
const BIRTH_SCALE = 0.9;
const BIRTH_CHANCE = 1 / 18000;
const FRY_SCALE = SPAWN_SCALE_MIN;

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
  /** Spawn a bubble at a point — the view emits these for decor
   * (plants oxygenating); the lifecycle (rise, surface pop) is the
   * same as a gravel bubble's. */
  spawnBubble(x: number, y: number): void {
    this.bubbles.push({ x, y });
  }
  tickCount = 0;
  /** 1 = clean, 0 = foul: the worse of oxygen and clarity, from the
   * aquarium model (refreshed by advanceLife). */
  waterQuality = 1;
  /** Water, equipment, food, medicine and fish physiology. */
  aquarium: Aquarium;
  /** A fish's species needs; the host maps packs to their FsTI. */
  careOf: (f: Fish) => SpeciesCare = () => DEFAULT_CARE;
  /** Lifecycle transitions since the last drain (sound/UI hooks). */
  readonly events: SimEvent[] = [];
  /** Pointer position in tank px while the tank is hovered — the
   * nearest calm fish notices it and drifts over. null when it
   * leaves. */
  notice: { x: number; y: number } | null = null;
  /** The senior calm fish watching the pointer — the first of up to
   * NOTICE_CAP watchers to join, kept while it stays in range.
   * Read-only view: tick() owns the picks. */
  get noticeFish(): Fish | null { return this._noticeFish[0] ?? null; }
  /** The watchers in join order — up to NOTICE_CAP calm fish gather
   * at the pointer, each holding its rank so the crowd fans out. */
  private _noticeFish: Fish[] = [];

  /** The same condition decide() uses to send a fish begging at the
   * surface: starving, and water clean enough to keep an appetite. */
  isBegging(f: Fish): boolean {
    // A starved corpse keeps its last hunger — it is not begging.
    return f.state !== "dead" && f.hunger > BEG_HUNGER &&
      this.waterQuality > QUALITY_SEEK;
  }

  /** True while any fish is begging — the dinner-bell predicate. */
  get anyBegging(): boolean {
    return this.fish.some((f) => this.isBegging(f));
  }
  private rand: () => number;
  private nextId = 0;
  /** Fish only bed down after the tank has seen daylight once — a
   * sim created or restored mid-night keeps its fish awake until
   * the first dawn rather than knocking them out on tick one. */
  private seenDay = false;

  constructor(tank: Tank, seed = 1) {
    this.tank = tank;
    this.rand = makeRng(seed);
    this.aquarium = new Aquarium(makeRng(seed ^ 0x5eed));
  }

  /** Advance the aquarium's clock by real seconds (at its speed) and
   * bring each fish's hunger and the water reading up to date. */
  advanceLife(realSeconds: number): void {
    const a = this.aquarium;
    a.lightOn = this.light > SLEEP_LIGHT;
    a.advance(realSeconds, this.residents());
    this.syncLife();
  }

  /** The fish as the aquarium model sees them. */
  residents(): Resident[] {
    return this.fish.map((f) => this.resident(f));
  }

  private resident(f: Fish): Resident {
    return { id: f.id, life: this.lifeOf(f), care: this.careOf(f),
             weight: this.weightOf(f) };
  }

  /** The original's weight: the geometric mean of the drawn body's
   * width and height, in px. */
  private weightOf(f: Fish): number {
    return f.halfW && f.halfH
      ? Math.max(1, Math.trunc(Math.sqrt(4 * f.halfW * f.halfH) * f.scale))
      : DEFAULT_WEIGHT;
  }

  private lifeOf(f: Fish): FishLife {
    if (!f.life) {
      const care = this.careOf(f);
      // A new fish arrives young: a little before adulthood. Its
      // stomach starts as full as its hunger says, so a fish from a
      // save that predates the life model keeps its appetite.
      const l = newLife(this.rand, care,
                        care.adultAge * (0.4 + this.rand() * 0.5));
      l.stomach = stomachSize(this.weightOf(f));
      l.ate = Math.round(l.stomach * (1 - Math.min(1, Math.max(0, f.hunger))));
      f.life = l;
    }
    return f.life;
  }

  /** Fish whose sickness has already fired a "sick" event — the life
   * model carries the disease; the flag just debounces the hook. */
  private sickSeen = new WeakSet<Fish>();

  /** Copy the life model's state onto what the swim code reads. */
  private syncLife(): void {
    for (const f of this.fish) {
      const l = this.lifeOf(f);
      if (l.dead) {
        if (f.state !== "dead") {
          this.setState(f, "dead");
          this.events.push({ type: "dead", fish: f });
          // A fish that died while the tank was out of sight (over an
          // hour of tank time ago) is found sinking to the gravel, like
          // the original's catch-up deaths; one dying now rises first.
          f.corpse ??= this.aquarium.minutes - l.dead.at > 60 ? "sink" : "rise";
        }
      } else {
        f.hunger = hungerOf(l);
        if (l.sick != null && !this.sickSeen.has(f)) {
          this.sickSeen.add(f);
          this.events.push({ type: "sick", fish: f });
        }
      }
    }
    const a = this.aquarium;
    const clarity = 1 - Math.min(1, a.organics() / MURK_ORGANICS);
    this.waterQuality = Math.max(0, Math.min(1 - a.oxygenDeficit(), clarity));
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

  /** Drop a food pellet at x (kept off the side glass); it sinks to the
   * gravel. Returns the pellet, so callers can mark where it went in —
   * or null when the tank already holds MAX_UNEATEN uneaten pellets. */
  dropFood(x: number): Food | null {
    if (this.food.filter((f) => !f.eaten).length >= MAX_UNEATEN)
      return null;
    const cx = Math.min(Math.max(x, MARGIN), this.tank.width - MARGIN);
    const pellet = { x: cx, y: FOOD_ENTRY_Y, eaten: false, settled: 0,
                     golden: this.rand() < GOLDEN_ODDS };
    this.food.push(pellet);
    return pellet;
  }

  /** Replace `fraction` of the water with tap water at `temp` °C (the
   * original's 1–90%), siphoning settled pellets off the gravel. */
  changeWater(fraction: number, temp: number): void {
    for (let i = this.food.length - 1; i >= 0; i--)
      if (this.food[i]!.settled > 0) this.food.splice(i, 1);
    this.aquarium.changeWater(fraction, temp, this.residents());
    this.syncLife();
  }

  /** Knock on the glass: startle fish near (x, y), strength fading
   * with distance like the original's 1 − dist/radius falloff. */
  tap(x: number, y: number): void {
    for (const f of this.fish) {
      if (f.state === "dead") continue; // the dead do not startle
      const dx = f.x - x, dy = f.y - y;
      if (dx * dx + dy * dy < STARTLE_RADIUS * STARTLE_RADIUS) {
        const d = Math.max(Math.hypot(dx, dy), 1);
        const k = 1 - d / STARTLE_RADIUS;
        if (k < MIN_STARTLE_STRENGTH) continue;
        this.startle(f, dx, dy, d, k, 0);
      }
    }
  }

  /** The fish whose body covers tank point (x, y): its drawn box at
   * its growth, at least HIT_MIN px each way (a small fish, or one
   * whose sheet isn't bound yet), the nearest centre where bodies
   * overlap. The hover tip and Get Info both pick with it. */
  fishAt(x: number, y: number): Fish | null {
    let best: Fish | null = null, bd = 1;
    for (const f of this.fish) {
      const d = Math.max(
        Math.abs(x - f.x) / Math.max(HIT_MIN, this.halfW(f)),
        Math.abs(y - f.y) / Math.max(HIT_MIN, this.halfH(f)));
      if (d <= bd) { bd = d; best = f; }
    }
    return best;
  }

  /** Light set from outside (the clock timer), or null for the sim's
   * own demo cycle. The caller reads the clock so the sim stays
   * tick-only and deterministic. */
  private lightOverride: number | null = null;
  setLight(v: number | null): void { this.lightOverride = v; }

  /** 0.3 = demo night, 1 = full daylight. */
  get light(): number {
    return this.lightOverride ??
      demoLight((this.tickCount % DAY_TICKS) / DAY_TICKS);
  }

  tick(): void {
    this.tickCount++;
    if (this.light >= WAKE_LIGHT) this.seenDay = true;
    // The hovered pointer is noticed by calm fish — only drifters
    // look up; seeking and startled fish have other business. A
    // watcher keeps watching while it stays in range (a roll to face
    // the pointer is part of watching), so the crowd is stable instead
    // of a new pick every tick re-drawing the members.
    const n = this.notice;
    const inRange = (f: Fish): boolean => !!n &&
      (f.x - n.x) ** 2 + (f.y - n.y) ** 2 < NOTICE_RADIUS * NOTICE_RADIUS;
    this._noticeFish = this._noticeFish.filter((f) =>
      this.fish.includes(f) && f.state !== "dead" && inRange(f) &&
      (f.state === "drift" || f.state === "turn"));
    if (n && this._noticeFish.length < NOTICE_CAP) {
      // Fill the open slots with the nearest drifters not already
      // watching — a small crowd presses the glass, like the original.
      const cand: { f: Fish; d: number }[] = [];
      for (const f of this.fish) {
        if (f.state !== "drift" || this._noticeFish.includes(f))
          continue;
        const d = (f.x - n.x) ** 2 + (f.y - n.y) ** 2;
        if (d < NOTICE_RADIUS * NOTICE_RADIUS) cand.push({ f, d });
      }
      cand.sort((a, b) => a.d - b.d);
      for (const c of cand) {
        if (this._noticeFish.length >= NOTICE_CAP) break;
        this._noticeFish.push(c.f);
      }
    }
    for (const f of this.fish) this.tickFish(f);
    this.maybeBirth();
    // Panic propagates: a freshly darting fish startles close
    // neighbors — fish-on-fish reaction on the same distance falloff.
    for (const a of this.fish) {
      if (a.state === "dead" || a.state !== "startle" || a.stateTicks > 4 ||
          a.panicHops >= MAX_PANIC_HOPS) continue;
      for (const b of this.fish) {
        if (b === a || b.state === "startle" || b.state === "dead") continue;
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
        // Uneaten, it breaks up into the water (the aquarium model
        // dissolves it into what clouds the water and feeds the filter).
        if (fd.settled >= FOOD_ROT_TICKS) {
          this.food.splice(i, 1);
          this.aquarium.spoil(PELLET_UNITS);
        }
      }
    }
    // Ambient: the odd bubble works loose from the gravel.
    if (this.rand() < AMBIENT_BUBBLE)
      this.bubbles.push({
        x: MARGIN + this.rand() * (this.tank.width - MARGIN * 2),
        y: this.tank.height - BOTTOM_PAD - 2,
      });
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i]!;
      b.y -= BUBBLE_RISE;
      if (b.y <= SURFACE) this.bubbles.splice(i, 1);
    }
  }

  private tickFish(f: Fish): void {
    f.stateTicks++;
    f.phase++;
    // A corpse ignores hunger, panic and the sleep clock: the original's
    // dying drift rides up belly-up, floats, sinks, and rests.
    if (f.state === "dead") { this.tickCorpse(f); return; }
    // A weakened fish swims slower (the original: 1% per health point
    // below its species' sickness threshold); panic ignores it.
    const vigor = f.life ? vigorOf(f.life, this.careOf(f)) : 1;

    // Night falls: any unpanicked fish beds down. A sleeping fish
    // wakes at dawn; a knock on the glass wakes it instantly (the
    // startle branch runs its course, then it beds back down while
    // it's still dark).
    // A hungry fish gets up for food dropped at night rather than
    // starve until dawn with pellets rotting under its nose. The bar
    // matches the awake snack rule: at snack hunger it must smell the
    // pellet (within NOTICE_DIST), at seek hunger any pellet wakes it.
    const near = this.nearestFood(f);
    const peckish = near !== null &&
      this.waterQuality > QUALITY_SEEK &&
      (f.hunger > HUNGER_SEEK ||
       (f.hunger > HUNGER_SNACK &&
        Math.hypot(near.x - f.x, near.y - f.y) < NOTICE_DIST));
    if (f.state === "sleep") {
      if (this.light >= WAKE_LIGHT || peckish) {
        this.setState(f, "drift");
        this.decide(f);
        this.maybeTurn(f); // like the startle exit: roll, don't pitch over
      }
    } else if (f.state !== "startle" && this.seenDay &&
               this.light < SLEEP_LIGHT && !peckish) {
      this.setState(f, "sleep");
    }

    if (f.state === "sleep") {
      // Settle onto the gravel and idle in place: a weak stroke keeps
      // the tail wafting without wandering; food is ignored. The
      // settle is bidirectional — a fish startled below the resting
      // line mid-night rises back to it.
      const floor = this.tank.height - BOTTOM_PAD - 4;
      f.y += Math.max(-0.4, Math.min(0.4, floor - f.y));
      f.speed = Math.max(f.speed * 0.98, f.cruise * 0.04);
      // Level out: a fish that bedded down mid-climb or mid-dive
      // would otherwise rest tilted (up to pitch()'s 45° clamp).
      const level = wrapAngle((f.facing > 0 ? 0 : Math.PI) - f.heading);
      f.heading = wrapAngle(f.heading +
        Math.min(TURN_RATE, Math.max(-TURN_RATE, level)));
      f.vy = 0;
    } else if (f.state === "startle") {
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
        // A forced roll (the golden pellet's) can leave a freshly
        // decided target behind the new facing — mirror it across the
        // fish rather than pitch against the clamp swimming away.
        if ((f.x - f.tx) * f.facing > TURN_SLACK) {
          const { x0, x1 } = this.room(f);
          f.tx = Math.min(x1, Math.max(x0, 2 * f.x - f.tx));
        }
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
      const rank = this._noticeFish.indexOf(f);
      const n = rank >= 0 ? this.notice : null;
      const nd = n ? Math.hypot(n.x - f.x, n.y - f.y) : Infinity;
      // A big fish stops with its nose, not its middle, by the
      // pointer; later arrivals stop a step farther out so a gathered
      // crowd reads as a loose arc, not a stack. The clamp keeps a
      // large fish's hold point inside the notice radius — outside it
      // the watcher would drop out of range, drift back in, and
      // flap between watching and wandering.
      // The cap is per-rank: a lower rank's ceiling sits one stagger
      // inside the next rank's, so capped watchers still fan out
      // instead of collapsing onto the same ring. The floor is
      // rank-staggered for the same reason — a flat floor would
      // collapse every floored rank onto one ring after a retune.
      const cap = Math.max(
        NOTICE_STANDOFF + Math.max(0, rank) * NOTICE_STAGGER,
        NOTICE_RADIUS - 4 -
          (NOTICE_CAP - 1 - Math.max(0, rank)) * NOTICE_STAGGER);
      const standoff = Math.min(cap,
        NOTICE_STANDOFF + this.halfW(f) +
        Math.max(0, rank) * NOTICE_STAGGER);
      // A fish watching the pointer from inside the standoff holds
      // there instead of re-deciding.
      if (!food && !turning && nd > standoff &&
          (f.phase >= MOVE_TICKS || dist < 4)) {
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
      // Curiosity: the fish that noticed the pointer drifts toward it
      // — hunger (food, above) outranks it, and inside the standoff
      // it just hovers there. The guard measures fish-to-pointer, not
      // fish-to-target: a fresh decide() re-rolls tx/ty, so `dist`
      // alone would re-pin a hovering fish to the cursor forever.
      // The watcher is picked before this tick's food check, so a fish
      // that just found a pellet is still it: without `!food` a pointer
      // behind it rolls it away from the pellet, every time it re-aims.
      if (n && !food && nd > standoff) {
        // Aim just short of the pointer, on the fish's side of it, and
        // roll to face it: steering alone can't reverse, so a pointer
        // behind the fish would pin it at the pitch limit.
        const k = standoff * 0.5 / nd;
        f.tx = n.x + (f.x - n.x) * k;
        f.ty = n.y + (f.y - n.y) * k;
        dist = Math.hypot(f.tx - f.x, f.ty - f.y);
        if (!turning) turning = this.maybeTurn(f);
      }

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
        // A seeking fish must still outswim the sinking pellet. The
        // floor is pre-vigor — dividing by vigor would cancel the
        // slowdown a weakened fish is meant to suffer (the vx/vy
        // multiply below restores it).
        const floor = food
          ? Math.min(f.cruise,
                     Math.max(f.cruise * 0.15, FOOD_SINK * 1.5))
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
          // It eats until full; what it can't finish breaks up.
          this.aquarium.spoil(this.aquarium.feed(this.resident(f), PELLET_UNITS));
          f.hunger = hungerOf(this.lifeOf(f));
          // A gulped pellet lets a little air loose — one bubble rises
          // from the meal and pops at the surface on its own clock.
          this.bubbles.push({ x: food.x, y: food.y });
          // A meal puts a little size on — asymptotic toward adult.
          f.scale += (MAX_SCALE - f.scale) * GROWTH;
          // The stomach grows with the fish, or an adult keeps a
          // juvenile appetite; preserve fill across the rescale.
          const life = this.lifeOf(f);
          const stomach = stomachSize(this.weightOf(f));
          if (stomach !== life.stomach && life.stomach > 0) {
            life.ate = Math.round(life.ate / life.stomach * stomach);
            life.stomach = stomach;
          }
          this.setState(f, "drift");
          this.decide(f);
          if (food.golden) {
            // A golden meal earns a victory roll whether or not the
            // next destination lies behind.
            this.startTurn(f, this.rand() < 0.5 ? 1 : -1);
          } else {
            // The next destination may lie behind: roll to it now rather
            // than pitching against the clamp until the next decision.
            this.maybeTurn(f);
          }
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
      // fish backwards. Drift re-decides early below and rolls toward
      // its new target; seek rolls when it re-aims at the pellet.
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

  /** A dead fish rolls belly-up and rises to the surface, floats there
   * a while, then sinks and comes to rest on the gravel, where it stays
   * until it is taken out (Do_Dieing_Event). */
  private tickCorpse(f: Fish): void {
    // A corpse isn't bound by the fish's living depth band: it floats
    // just under the surface and finally rests on the gravel
    // (Do_Dieing_Event), so use tank-wide bounds with a body margin.
    const y0 = SURFACE + this.halfH(f);
    const y1 = this.tank.height - this.halfH(f);
    f.speed = 0;
    f.vy = 0;
    f.heading = f.facing > 0 ? 0 : Math.PI;
    switch (f.corpse ?? "rise") {
      case "rise":
        f.y = Math.max(y0, f.y - CORPSE_RISE);
        f.x = Math.min(this.tank.width, Math.max(0,
          f.x + (this.rand() - 0.5) * 0.4));
        if (f.y <= y0) {
          f.corpse = "float";
          f.deadTicks = Math.floor(this.rand() * CORPSE_FLOAT_MAX);
        } else f.corpse = "rise";
        break;
      case "float":
        f.deadTicks = (f.deadTicks ?? 0) - 1;
        if (f.deadTicks <= 0) f.corpse = "sink";
        break;
      case "sink":
        f.y = Math.min(y1, f.y + CORPSE_SINK);
        if (f.y >= y1) f.corpse = "rest";
        break;
      case "rest":
        break;
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
    // A starving fish begs where the food lands — while the water is
    // still clean enough to keep an appetite (the seek gate).
    const begging = this.isBegging(f);
    if (begging) f.bandY = Math.min(f.bandY, y0 + BAND_HALF);
    // Gasping: foul water shrinks the usable depth toward the surface,
    // so fish hang just under it until filtration recovers. A little
    // gasp-scaled slack from the id keeps a gasping school off one
    // exact row without re-rolling (and flickering) every decision.
    const gasp =
      Math.max(0, (GASP_QUALITY - this.waterQuality) / GASP_QUALITY);
    const ceiling = y1 - gasp * (y1 - y0) + gasp * (f.id % 9);
    f.ty = Math.min(ceiling,
      Math.max(y0, f.bandY + (this.rand() - 0.5) * 2 * BAND_HALF));
    // Schooling: a same-species wander sometimes anchors on a
    // schoolmate's neighborhood — loose grouping, not lockstep. Starter
    // fish share species "" but take sprite sheets round-robin, so they
    // look like different species: they don't school.
    // A begging fish stays under the surface rather than follow a mate.
    if (f.species && !begging && this.rand() < SCHOOL_PULL) {
      const mates = this.fish.filter(
        (m) => m !== f && m.species === f.species && m.state !== "dead");
      if (mates.length) {
        const m = mates[(this.rand() * mates.length) | 0]!;
        f.tx = Math.min(x1, Math.max(x0,
          m.x + (this.rand() - 0.5) * 2 * SCHOOL_RADIUS));
        // Half the x-spread vertically — schools sit flat in a band,
        // under the surface while they gasp.
        f.ty = Math.min(ceiling, Math.max(y0,
          m.y + (this.rand() - 0.5) * SCHOOL_RADIUS));
      }
    }
    // A sick fish keeps to the bottom of its range (Calc_New_Dest_Vert).
    if (f.life?.sick)
      f.ty = y0 + (y1 - y0) * (SICK_DEPTH + this.rand() * (1 - SICK_DEPTH));
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
      // Both half-rings reach the opposite profile; pick randomly.
      this.startTurn(f, this.rand() < 0.5 ? 1 : -1);
      return true;
    }
    return false;
  }

  /** Enter the roll-through-edge-on turn: resets the roll clock and
   * remembers the entry profile so the mid-roll flip can fire once. */
  private startTurn(f: Fish, dir: 1 | -1): void {
    this.setState(f, "turn");
    f.turnFrom = f.facing;
    f.turnDir = dir;
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

  /** A thriving pair occasionally produces a fry — the original's
   * quiet reward for a well-kept tank. One roll per eligible species
   * per tick keeps a crowded healthy tank from baby-booming. */
  private maybeBirth(): void {
    if (this.fish.length >= FISH_CAP) return;
    const seen = new Set<string>();
    const parents = new Map<string, Fish>();
    for (const f of this.fish) {
      if (!f.species || f.state === "dead" || f.life?.sick != null ||
          f.hunger > BIRTH_HUNGER ||
          f.scale < BIRTH_SCALE) continue;
      if (seen.has(f.species)) parents.set(f.species, f);
      seen.add(f.species);
    }
    for (const [species, parent] of parents) {
      if (this.rand() >= BIRTH_CHANCE) continue;
      const fry = this.addFish({
        species, x: parent.x,
        y: Math.min(parent.y + 10, this.tank.height - BOTTOM_PAD - 4),
        facing: parent.facing, heading: parent.heading,
        cruise: parent.cruise, hunger: 0.3, scale: FRY_SCALE,
        ...(parent.sheetIdx !== undefined ? { sheetIdx: parent.sheetIdx } : {}),
        ...(parent.pack !== undefined ? { pack: parent.pack } : {}),
      });
      this.events.push({ type: "birth", fish: fry });
      return; // at most one birth per tick
    }
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
