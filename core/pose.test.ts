import { describe, expect, it } from "vitest";
import { fishPose } from "./pose.js";
import { TURN_TICKS } from "./sim.js";
import type { Fish } from "./sim.js";
import type { SpriteSheet } from "./data/azpack.js";

function sheet(groups: number): SpriteSheet {
  return { meta: { groups, framesPerGroup: 4 } } as SpriteSheet;
}
function fish(p: Partial<Fish>): Fish {
  return { facing: 1, state: "drift", turnFrom: 1, turnDir: 1,
           stateTicks: 0, ...p } as Fish;
}

describe("fishPose", () => {
  it("draws opposite profiles for each facing on ring sheets", () => {
    expect(fishPose(sheet(8), fish({ facing: 1 }))).toEqual({ g: 4, mir: -1 });
    expect(fishPose(sheet(8), fish({ facing: -1 }))).toEqual({ g: 0, mir: -1 });
  });

  it("lands on the opposite profile at the end of a turn", () => {
    for (const turnDir of [1, -1] as const) {
      expect(fishPose(sheet(8), fish({
        state: "turn", turnFrom: 1, turnDir,
        stateTicks: TURN_TICKS - 1,
      })).g).toBe(0);
    }
  });

  it("wraps the ring when stepping backwards past group 0", () => {
    expect(fishPose(sheet(8), fish({
      state: "turn", turnFrom: -1, turnDir: -1, stateTicks: TURN_TICKS - 1,
    })).g).toBe(4);
  });

  it("falls back to mirrored group 0 without a pose ring", () => {
    for (const ng of [2, 3, 5]) {
      expect(fishPose(sheet(ng), fish({ facing: -1 })))
        .toEqual({ g: 0, mir: -1 });
      expect(fishPose(sheet(ng), fish({ facing: 1 })))
        .toEqual({ g: 0, mir: 1 });
    }
  });

  it("clamps the step at a half-ring past the last turn tick", () => {
    expect(fishPose(sheet(8), fish({
      state: "turn", turnFrom: 1, turnDir: 1, stateTicks: TURN_TICKS,
    })).g).toBe(0);
  });
});
