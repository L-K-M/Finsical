import { describe, expect, it } from "vitest";
import { TANK_ART_PIXELS_MAX, TANK_ITEMS_MAX, tankLayout } from "./azn.js";
import { buildPack, type Res } from "./rsrc.fixture.js";

const PAL: [number, number, number][] =
  [[0, 0, 0], [255, 0, 0], [0, 0, 255], [0, 255, 0]];

/** 8-bit uncompressed BMP fixture (see bmp.test.ts), pixels all `fill`. */
function bmp(w: number, h: number, fill = 1): number[] {
  const stride = ((w * 8 + 31) >> 5) * 4;
  const pxOff = 14 + 40 + 256 * 4;
  const out = new Uint8Array(pxOff + h * stride);
  const v = new DataView(out.buffer);
  out[0] = 0x42; out[1] = 0x4d;             // "BM"
  v.setUint32(2, out.length, true);
  v.setUint32(10, pxOff, true);
  v.setUint32(14, 40, true);                // BITMAPINFOHEADER
  v.setInt32(18, w, true);
  v.setInt32(22, h, true);
  v.setUint16(26, 1, true);
  v.setUint16(28, 8, true);
  v.setUint32(34, h * stride, true);
  v.setUint32(46, PAL.length, true);
  PAL.forEach(([r, g, b], i) => out.set([b, g, r, 0], 14 + 40 + i * 4));
  out.fill(fill, pxOff);
  return [...out];
}

const put16 = (p: number[], o: number, v: number) => {
  p[o] = v & 0xff; p[o + 1] = (v >> 8) & 0xff;
};

/** AQUA record: u16@8 height, u16@10 width. */
function aqua(h: number, w: number): number[] {
  const p: number[] = new Array(12).fill(0);
  put16(p, 8, h); put16(p, 10, w);
  return p;
}

/** PlTI record: u16@8 frame count. */
function plti(frames: number): number[] {
  const p: number[] = new Array(10).fill(0);
  put16(p, 8, frames);
  return p;
}

/** PlPI record: Pascal species name @0, box fields at 260..269. */
function plpi(sp: string, h: number, w: number, x: number, top: number,
              depth: number): number[] {
  const p: number[] = new Array(270).fill(0);
  p[0] = sp.length;
  for (let i = 0; i < sp.length; i++) p[1 + i] = sp.charCodeAt(i);
  put16(p, 260, h); put16(p, 262, w); put16(p, 264, x);
  put16(p, 266, top); put16(p, 268, depth);
  return p;
}

/** AccI record: u16@0 x, @2 top, @4 depth, @10 frame count. */
function acci(x: number, top: number, depth: number, frames: number):
    number[] {
  const p: number[] = new Array(12).fill(0);
  put16(p, 0, x); put16(p, 2, top); put16(p, 4, depth);
  put16(p, 10, frames);
  return p;
}

describe("tankLayout", () => {
  it("reads the tank size and plants of two species in order", () => {
    const d = buildPack([
      { type: "AQUA", id: 128, payload: aqua(300, 400) },
      { type: "PlTI", id: 500, name: "Java Fern", payload: plti(1) },
      { type: "PLPC", id: 500, payload: bmp(4, 4) },
      { type: "PlTI", id: 510, name: "Anubias", payload: plti(2) },
      { type: "PLPC", id: 510, payload: bmp(6, 6, 2) },
      { type: "PLPC", id: 511, payload: bmp(6, 6, 3) },
      { type: "PlPI", id: 1, payload: plpi("Java Fern", 20, 30, 5, 6, 100) },
      { type: "PlPI", id: 2, payload: plpi("Anubias", 40, 50, 7, 8, 200) },
      { type: "PlPI", id: 3, payload: plpi("Java Fern", 21, 31, 9, 10, 400) },
      // unknown species name: the plant is skipped entirely
      { type: "PlPI", id: 4, payload: plpi("NoSuch", 20, 20, 0, 0, 0) },
    ]);
    const t = tankLayout(d)!;
    expect(t.width).toBe(400);
    expect(t.height).toBe(300);
    expect(t.items.map((i) => [i.kind, i.name])).toEqual([
      ["plant", "Java Fern"], ["plant", "Anubias"], ["plant", "Java Fern"],
    ]);
    const [a, b, c] = t.items;
    // The PlPI tail fields land exactly where stored: h@260, w@262,
    // x@264, top@266; plants keep their stored box, not the frame size.
    expect([a!.x, a!.top, a!.w, a!.h]).toEqual([5, 6, 30, 20]);
    expect([b!.x, b!.top, b!.w, b!.h]).toEqual([7, 8, 50, 40]);
    expect(b!.frames.length).toBe(2);
    expect([b!.frames[0]!.w, b!.frames[0]!.h]).toEqual([6, 6]);
    expect(b!.frames[1]!.idx[0]).toBe(3);
    // depth 0..400 normalizes to 0..1
    expect(a!.depth).toBeCloseTo(0.25);
    expect(b!.depth).toBeCloseTo(0.5);
    expect(c!.depth).toBe(1);
    // Two plants of one species share the decoded frame objects.
    expect(c!.frames[0]).toBe(a!.frames[0]);
  });

  it("clamps a stored depth past TANK_DEPTH_MAX to 1", () => {
    const d = buildPack([
      { type: "AQUA", id: 1, payload: aqua(300, 400) },
      { type: "PlTI", id: 500, name: "Fern", payload: plti(1) },
      { type: "PLPC", id: 500, payload: bmp(4, 4) },
      { type: "PlPI", id: 1, payload: plpi("Fern", 20, 30, 5, 6, 500) },
    ]);
    expect(tankLayout(d)!.items[0]!.depth).toBe(1);
  });

  it("reads a placed accessory and its animation frames", () => {
    const d = buildPack([
      { type: "AQUA", id: 1, payload: aqua(300, 400) },
      { type: "AccI", id: 700, name: "Coral", payload: acci(11, 22, 160, 3) },
      { type: "ACPC", id: 700, payload: bmp(8, 9) },
      { type: "ACPC", id: 701, payload: bmp(8, 9, 2) },
      { type: "ACPC", id: 702, payload: bmp(8, 9, 3) },
      // An AccI without a map name yields a null item name.
      { type: "AccI", id: 710, payload: acci(1, 2, 0, 1) },
      { type: "ACPC", id: 710, payload: bmp(5, 5) },
    ]);
    const [it, anon] = tankLayout(d)!.items;
    expect(it!.kind).toBe("accessory");
    expect(it!.name).toBe("Coral");
    expect([it!.x, it!.top, it!.w, it!.h]).toEqual([11, 22, 8, 9]);
    expect(it!.depth).toBeCloseTo(0.4);
    expect(it!.frames.length).toBe(3);
    expect(it!.frames[2]!.idx[0]).toBe(3);
    expect(anon!.name).toBeNull();
  });

  it("keeps only the frames before a gap or a size change", () => {
    const d = buildPack([
      { type: "AQUA", id: 1, payload: aqua(300, 400) },
      { type: "AccI", id: 700, payload: acci(1, 2, 0, 3) },
      { type: "ACPC", id: 700, payload: bmp(8, 8) },
      // ACPC 701 absent: the run stops after the first frame.
      { type: "AccI", id: 710, payload: acci(3, 4, 0, 3) },
      { type: "ACPC", id: 710, payload: bmp(8, 8) },
      { type: "ACPC", id: 711, payload: bmp(6, 8) }, // size differs
      { type: "ACPC", id: 712, payload: bmp(8, 8) },
    ]);
    const [gap, resized] = tankLayout(d)!.items;
    expect(gap!.frames.length).toBe(1);
    expect(resized!.frames.length).toBe(1);
  });

  it("treats a PlTI frame count of 0 as 1", () => {
    const d = buildPack([
      { type: "AQUA", id: 1, payload: aqua(300, 400) },
      { type: "PlTI", id: 500, name: "Fern", payload: plti(0) },
      { type: "PLPC", id: 500, payload: bmp(4, 4) },
      { type: "PlPI", id: 1, payload: plpi("Fern", 20, 30, 0, 0, 0) },
    ]);
    expect(tankLayout(d)!.items[0]!.frames.length).toBe(1);
  });

  it("skips records too short to hold their fields", () => {
    const d = buildPack([
      { type: "AQUA", id: 1, payload: aqua(300, 400) },
      { type: "PlPI", id: 1, payload: new Array(269).fill(0) },
      { type: "AccI", id: 700, payload: new Array(11).fill(1) },
    ]);
    expect(tankLayout(d)!.items).toEqual([]);
  });

  it("lists all plants before accessories, each in resource order", () => {
    const d = buildPack([
      // The AccI precedes the PlPI records in the map on purpose.
      { type: "AccI", id: 700, payload: acci(1, 2, 0, 1) },
      { type: "ACPC", id: 700, payload: bmp(8, 8) },
      { type: "AQUA", id: 1, payload: aqua(300, 400) },
      { type: "PlTI", id: 500, name: "Fern", payload: plti(1) },
      { type: "PLPC", id: 500, payload: bmp(4, 4) },
      { type: "PlPI", id: 9, payload: plpi("Fern", 10, 10, 9, 0, 0) },
      { type: "PlPI", id: 1, payload: plpi("Fern", 10, 10, 1, 0, 0) },
    ]);
    const t = tankLayout(d)!;
    expect(t.items.map((i) => i.kind))
      .toEqual(["plant", "plant", "accessory"]);
    // Map order, not id order.
    expect([t.items[0]!.x, t.items[1]!.x]).toEqual([9, 1]);
  });

  it("stops at TANK_ITEMS_MAX items", () => {
    const res: Res[] = [
      { type: "AQUA", id: 1, payload: aqua(300, 400) },
      { type: "PlTI", id: 500, name: "Fern", payload: plti(1) },
      { type: "PLPC", id: 500, payload: bmp(4, 4) },
    ];
    for (let i = 0; i < TANK_ITEMS_MAX + 10; i++)
      res.push({ type: "PlPI", id: i + 1,
                 payload: plpi("Fern", 10, 10, i, 0, 0) });
    expect(tankLayout(buildPack(res))!.items.length).toBe(TANK_ITEMS_MAX);
  });

  it("returns null when the data is not a tank", () => {
    // Not a 9003inc pack at all.
    expect(tankLayout(new Uint8Array(0x200))).toBeNull();
    // A pack without an AQUA record.
    expect(tankLayout(buildPack([
      { type: "PlTI", id: 500, name: "Fern", payload: plti(1) },
    ]))).toBeNull();
    // AQUA with a zero size.
    expect(tankLayout(buildPack([
      { type: "AQUA", id: 1, payload: aqua(0, 400) },
    ]))).toBeNull();
  });
});

describe("tankLayout art budget", () => {
  /** A small BMP whose header claims w x h: the budget reads the
   * claim before anything decodes. */
  function claiming(w: number, h: number): number[] {
    const p = bmp(4, 4, 2);
    const v = new DataView(Uint8Array.from(p).buffer);
    v.setInt32(18, w, true);
    v.setInt32(22, h, true);
    return [...new Uint8Array(v.buffer)];
  }

  it("skips art past the budget and keeps the rest of the tank", () => {
    const huge = Math.ceil(Math.sqrt(TANK_ART_PIXELS_MAX)) + 1;
    const d = buildPack([
      { type: "AQUA", id: 400, payload: aqua(480, 640) },
      { type: "AccI", id: 200, payload: acci(10, 400, 100, 1) },
      { type: "ACPC", id: 200, payload: claiming(huge, huge) },
      { type: "AccI", id: 300, payload: acci(50, 470, 200, 1) },
      { type: "ACPC", id: 300, payload: bmp(10, 10, 3) },
    ]);
    const items = tankLayout(d)!.items;
    expect(items.map((it) => it.x)).toEqual([50]);
  });

  it("counts a top-down frame's negative height by its size", () => {
    const huge = Math.ceil(Math.sqrt(TANK_ART_PIXELS_MAX)) + 1;
    const d = buildPack([
      { type: "AQUA", id: 400, payload: aqua(480, 640) },
      { type: "AccI", id: 200, payload: acci(10, 400, 100, 1) },
      { type: "ACPC", id: 200, payload: claiming(huge, -huge) },
    ]);
    // A count, not the items: a failing diff of a 16-megapixel frame
    // would swamp the report.
    expect(tankLayout(d)!.items.length).toBe(0);
  });
});
