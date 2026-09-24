import { describe, expect, it } from "vitest";
import { bodySize, pickSwimSheet } from "./swimsheet.js";
import { SpriteSheet } from "./azpack.js";

function sheet(groups: number, cellW: number, cellH: number): SpriteSheet {
  // Metadata only: pickSwimSheet never reads pixels.
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

/** A 2-group, 2-frame sheet of blank cellW x cellH cells; `paint`
 * marks opaque pixels at cell-local (x, y) in one group's frame. */
function paintable(cellW: number, cellH: number, dims = 4) {
  const idx = new Uint8Array(cellW * 2 * cellH * 2);
  const pal = [[0, 0, 0], [255, 255, 255]] as [number, number, number][];
  const sh = new SpriteSheet({
    image: "t.png", groups: 2, framesPerGroup: 2, cellW, cellH,
    dims: Array.from({ length: dims }, (_, i) =>
      [(i / 2) | 0, i % 2, cellW, cellH] as [number, number, number, number]),
  }, { w: cellW * 2, h: cellH * 2, palette: pal, idx });
  const paint = (g: number, f: number, x: number, y: number) => {
    idx[(g * cellH + y) * cellW * 2 + f * cellW + x] = 1;
  };
  return { sh, paint };
}

describe("bodySize", () => {
  it("measures the opaque art, not the padded cell", () => {
    // Frames hold the fish on its side: rows run along its length.
    const { sh, paint } = paintable(20, 30);
    paint(1, 0, 5, 4);   // one frame spans x 5..9 and y 4..20
    paint(1, 0, 9, 20);
    paint(1, 1, 7, 25);  // the other swings the tail further
    paint(0, 0, 0, 0);   // another pose group doesn't count
    expect(bodySize(sh, 1)).toEqual({ length: 22, height: 5 });
  });

  it("skips a truncated pack's missing cell", () => {
    const { sh, paint } = paintable(20, 30, 3); // group 1 frame 1 absent
    paint(1, 0, 2, 3);
    expect(bodySize(sh, 1)).toEqual({ length: 1, height: 1 });
  });

  it("falls back to the cell when nothing is painted", () => {
    expect(bodySize(paintable(20, 30).sh, 0))
      .toEqual({ length: 30, height: 20 });
  });
});
