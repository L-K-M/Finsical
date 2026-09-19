import { TURN_TICKS } from "./sim.js";
import type { Fish } from "./sim.js";
import type { SpriteSheet } from "./data/azpack.js";

/* Which pose group + mirror a fish draws with. Sheets with an even
 * group count >= 4 carry the original's pose ring: opposite-facing
 * profiles at 0 and groups/2 with roll poses between, so a "turn"
 * steps the ring instead of mirroring.
 */
export function fishPose(sheet: SpriteSheet, f: Fish):
    { g: number; mir: 1 | -1 } {
  const ng = sheet.meta.groups;
  if (ng < 4 || ng % 2 !== 0) return { g: 0, mir: f.facing };
  if (f.state === "turn") {
    const from = f.turnFrom > 0 ? ng / 2 : 0;
    // stateTicks runs 1..TURN_TICKS-1 in the turn state — scale so the
    // last rendered pose lands exactly on the opposite profile.
    const step = Math.min(ng / 2,
      Math.round(f.stateTicks * (ng / 2) / (TURN_TICKS - 1)));
    return { g: (((from + f.turnDir * step) % ng) + ng) % ng, mir: -1 };
  }
  return { g: f.facing > 0 ? ng / 2 : 0, mir: -1 };
}
