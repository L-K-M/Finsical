import { TURN_TICKS, wrapAngle } from "./sim.js";
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

/** Pitch of the heading off the facing's horizontal axis — the
 * screen-plane tilt the original applies when fish climb or dive.
 * Assumes heading = atan2(vy, vx) in screen space (y grows downward);
 * a y-up convention would invert the tilt sign.
 * During a turn the pose ring already encodes orientation, and facing
 * flips mid-roll — pitching then would invert the sprite. */
export function pitch(f: Fish): number {
  if (f.state === "turn") return 0;
  const p = wrapAngle(f.heading - (f.facing > 0 ? 0 : Math.PI));
  // Clamp the tilt at ±45°: bounds heading/facing mismatches (e.g. a
  // startle dart) and caps genuinely steep climb/dive angles.
  return Math.max(-Math.PI / 4, Math.min(Math.PI / 4, p));
}
