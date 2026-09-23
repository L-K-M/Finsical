import { describe, expect, it } from "vitest";
import { pickSwimSheet } from "./swimsheet.js";
import type { SpriteSheet } from "./azpack.js";

function sheet(groups: number, cellW: number, cellH: number): SpriteSheet {
  return { meta: { groups, framesPerGroup: 8, cellW, cellH } } as SpriteSheet;
}

describe("pickSwimSheet", () => {
  it("picks the adult ring over the shared fry ring", () => {
    // clownfish.fsh / comet.fsh: the adult family first, then the baby
    // family, whose 9x31 ring several unrelated species share.
    const adult = sheet(8, 50, 100);
    const pack = [adult, sheet(6, 50, 100), sheet(2, 50, 100),
                  sheet(2, 50, 100), sheet(8, 9, 31), sheet(6, 20, 31),
                  sheet(2, 10, 25), sheet(2, 10, 32)];
    expect(pickSwimSheet(pack)).toBe(adult);
  });

  it("finds the adult when the baby family comes first", () => {
    // DS01.rez (disc addon): baby family, then the adult one.
    const adult = sheet(8, 180, 176);
    const pack = [sheet(8, 40, 48), sheet(6, 40, 48), sheet(2, 40, 48),
                  sheet(2, 40, 48), adult, sheet(2, 180, 176),
                  sheet(6, 180, 176), sheet(2, 180, 176)];
    expect(pickSwimSheet(pack)).toBe(adult);
  });

  it("prefers more pose groups over a bigger cell", () => {
    // Angels: the 2-group dying sheet is a little larger than the ring.
    const ring = sheet(8, 173, 126);
    expect(pickSwimSheet([sheet(2, 180, 122), ring, sheet(6, 165, 138)]))
      .toBe(ring);
  });

  it("keeps pack order among equal rings", () => {
    // GP*.REZ strain sets: many equal adult rings; the first is the
    // pack's own.
    const first = sheet(8, 94, 130);
    expect(pickSwimSheet([sheet(8, 30, 40), first, sheet(8, 94, 130)]))
      .toBe(first);
  });

  it("returns null for a pack without sheets", () => {
    expect(pickSwimSheet([])).toBeNull();
  });
});
