import { describe, expect, it } from "vitest";
import { explode, Is3Error, is3Members, isIs3, MAX_MEMBER_BYTES,
         readIs3Member } from "./is3.js";
import { buildIs3, implode } from "./is3.fixture.js";

const ascii = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));
const cat = (...parts: Uint8Array[]) =>
  Uint8Array.from(parts.flatMap((p) => [...p]));
/** A pack's start: the AquaZone pack magic, then varied bytes. */
const PACK = cat(Uint8Array.of(0, 1, 0, 0),
                 ...[0, 1, 2].map(() => Uint8Array.from({ length: 256 },
                                                        (_, i) => i)));

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0);
}

describe("explode", () => {
  it("decodes blast's documented example", () => {
    // The example zlib's contrib/blast gives for the format: raw
    // literals, 4 distance bits, a match and the end code. The round
    // trips below share this reader's conventions; this one comes from
    // outside it.
    expect(explode(Uint8Array.of(0x00, 0x04, 0x82, 0x24, 0x25, 0x8f, 0x80,
                                 0x7f), 13)).toEqual(ascii("AIAIAIAIAIAIA"));
  });

  it("round-trips each form", () => {
    // Raw and coded literals, every distance width, overlapping copies
    // ("ab" over and over) and a length 2 match, whose distance takes 2
    // low bits.
    const data = cat(PACK, ascii("ab".repeat(300)),
                     ascii("xyzxyq".repeat(50)), ascii("aa"));
    for (const coded of [false, true])
      for (const low of [4, 5, 6])
        expect(explode(implode(data, coded, low), data.length))
          .toEqual(data);
  });

  it("reads an empty member as its end code alone", () => {
    expect(explode(implode(new Uint8Array(0)), 0)).toEqual(new Uint8Array(0));
  });

  it("refuses what isn't imploded", () => {
    for (const head of [[], [0], [2, 6], [0, 3], [0, 7]])
      expect(() => explode(Uint8Array.from([...head, ...new Array(8).fill(0)]),
                           8)).toThrow(Is3Error);
  });

  it("holds a stream to its member's size", () => {
    const packed = implode(PACK);
    for (const size of [PACK.length - 1, PACK.length + 1])
      expect(() => explode(packed, size)).toThrow(Is3Error);
  });

  it("refuses a distance before the start", () => {
    // Raw literals, 6 distance bits, then a match first thing: its flag,
    // length code 0 (3 bytes) and distance code 0 (the two shortest
    // codes, 00, sent inverted), six zero bits: distance 1, with
    // nothing to copy from yet.
    expect(() => explode(Uint8Array.of(0x00, 0x06, 0x1f, 0x00), 3))
      .toThrow(/before its start/);
  });

  it("throws only Is3Error on damage", () => {
    const data = cat(PACK, ascii("ab".repeat(100)));
    const packed = implode(data, true);
    for (let n = 0; n < packed.length; n++)
      expect(() => explode(packed.subarray(0, n), data.length))
        .toThrow(Is3Error);
    const rnd = lcg(9);
    for (let k = 0; k < 500; k++) {
      const d = packed.slice();
      for (let f = 0, flips = 1 + rnd() % 3; f < flips; f++)
        d[rnd() % d.length] = rnd() & 0xff;
      try { expect(explode(d, data.length).length).toBe(data.length); }
      catch (e) { expect(e).toBeInstanceOf(Is3Error); }
    }
  });
});

describe("is3Members and readIs3Member", () => {
  const wall = cat(ascii("BM"), new Uint8Array(60));

  it("lists and reads stored and imploded members", () => {
    const d = buildIs3([[0, "Eden.azn", PACK, false],
                        [1, "Wall.bmp", wall, true],
                        [0, "Anchor rock.acc", PACK.slice().reverse(), false]],
                       ["Items", "Backgrounds"]);
    expect(isIs3(d)).toBe(true);
    const ms = is3Members(d);
    expect(ms.map((m) => [m.path, m.size, m.stored])).toEqual([
      ["Items/Eden.azn", PACK.length, false],
      ["Backgrounds/Wall.bmp", 62, true],
      ["Items/Anchor rock.acc", PACK.length, false]]);
    expect(ms.map((m) => readIs3Member(d, m)))
      .toEqual([PACK, wall, PACK.slice().reverse()]);
  });

  it("refuses what it can't read", () => {
    const good = buildIs3([[0, "Eden.azn", PACK, false]]);
    expect(isIs3(ascii("PK\x03\x04"))).toBe(false);
    expect(() => is3Members(cat(ascii("PK\x03\x04"), new Uint8Array(60))))
      .toThrow(Is3Error);
    const v = new DataView(good.buffer);
    const filepos = v.getUint32(51, true);
    // A member split across volumes, and one past the end.
    const split = good.slice();
    split[filepos + 26] = 1;
    const past = good.slice();
    new DataView(past.buffer).setUint32(filepos + 11, good.length, true);
    for (const bad of [split, past])
      expect(() => is3Members(bad)).toThrow(Is3Error);
    // A member too big to allocate: listed, but not read.
    const huge = good.slice();
    new DataView(huge.buffer).setUint32(filepos + 3, MAX_MEMBER_BYTES + 1,
                                        true);
    const m = is3Members(huge)[0]!;
    expect(() => readIs3Member(huge, m)).toThrow(/over the cap/);
    expect(() => explode(implode(new Uint8Array(0)), MAX_MEMBER_BYTES + 1))
      .toThrow(/over the cap/);
  });

  it("throws only Is3Error on damage", () => {
    const good = buildIs3([[0, "Eden.azn", PACK, false],
                           [0, "Wall.bmp", wall, true]]);
    const readAll = (d: Uint8Array): void => {
      try { for (const m of is3Members(d)) readIs3Member(d, m); }
      catch (e) { expect(e).toBeInstanceOf(Is3Error); }
    };
    for (let n = 0; n < good.length; n++) readAll(good.subarray(0, n));
    const rnd = lcg(3);
    for (let k = 0; k < 500; k++) {
      const d = good.slice();
      for (let f = 0, flips = 1 + rnd() % 3; f < flips; f++)
        d[rnd() % d.length] = rnd() & 0xff;
      readAll(d);
    }
  });
});
