import { makeRng } from "./rng.js";

export interface Tank {
  width: number;
  height: number;
}

export interface Fish {
  x: number;
  y: number;
  /** facing: +1 right, -1 left */
  facing: 1 | -1;
  /** pixels per tick */
  speed: number;
}

/** Fixed-step aquarium simulation. Advance with `tick()` — one step per call. */
export class Sim {
  readonly tank: Tank;
  readonly fish: Fish[] = [];
  tickCount = 0;
  private rand: () => number;

  constructor(tank: Tank, seed = 1) {
    this.tank = tank;
    this.rand = makeRng(seed);
  }

  addFish(fish: Fish): void {
    this.fish.push(fish);
  }

  tick(): void {
    this.tickCount++;
    for (const f of this.fish) {
      // Occasional speed wobble keeps drift from looking mechanical.
      if (this.rand() < 0.02) f.speed = 0.4 + this.rand() * 1.2;
      f.x += f.speed * f.facing;
      const margin = 16;
      if (f.x < margin) {
        f.x = margin;
        f.facing = 1;
      } else if (f.x > this.tank.width - margin) {
        f.x = this.tank.width - margin;
        f.facing = -1;
      }
    }
  }
}
