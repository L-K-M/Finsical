import { describe, expect, it } from "vitest";
import { hasMacPictures, macPictures } from "./macpics.js";
import { buildPict, rect } from "./pict.fixture.js";
import { buildRsrc, wrapAppledouble, wrapBinhex, wrapMacbinary }
  from "./resfork.fixture.js";

type Entry = [number, string | null, number, Uint8Array];

const CLUT: [number, number, number][] = [[255, 255, 255], [90, 60, 30]];
/** A w x h picture: white rows over brown ones, like a gravel strip. */
const pict = (w: number, h: number, file = false) => buildPict({
  file, frame: rect(0, 0, h, w),
  ops: [{ kind: "indexed", depth: 8, w, h, clut: CLUT,
          px: Array.from({ length: w * h }, (_, i) => i < w * 2 ? 0 : 1) }],
});
const GRVL = Uint8Array.of(0, 0x35, 0, 0x34, 0, 0, 0, 0);

/** A Mac gravel add-on's fork, as the 7z's "._" companions carry it. */
const gravelFork = () => buildRsrc(new Map<string, Entry[]>([
  ["Grvl", [[4020, null, 0, GRVL]]],
  ["BADP", [[4020, null, 0, pict(64, 48)]]],
  ["BAPC", [[4020, null, 0, pict(400, 60)]]],
]));

const sizes = (m: ReturnType<typeof macPictures>) =>
  m && [...m.images].map(([k, v]) => [k, v.w, v.h]);

describe("macPictures", () => {
  it("reads a data-fork PICT file past its 512-byte header", () => {
    const m = macPictures(pict(320, 200, true));
    expect(m?.gravel).toBe(false);
    expect(sizes(m)).toEqual([["PICT", 320, 200]]);
    expect(m?.failed).toEqual([]);
  });

  it("reads a gravel add-on's strip and catalog picture", () => {
    const m = macPictures(gravelFork());
    expect(m?.gravel).toBe(true);
    expect(sizes(m)).toEqual([["BAPC 4020", 400, 60],
                              ["BADP 4020", 64, 48]]);
  });

  it("reads the fork in every wrapping it travels in", () => {
    for (const d of [wrapAppledouble(gravelFork()),
                     wrapMacbinary(gravelFork()),
                     wrapBinhex(gravelFork())])
      expect(sizes(macPictures(d))?.map((x) => x[0]))
        .toEqual(["BAPC 4020", "BADP 4020"]);
  });

  it("reads 'PICT' resources of any other fork as pictures", () => {
    const fork = buildRsrc(new Map<string, Entry[]>([
      ["PICT", [[128, "Back", 0, pict(320, 240)], [129, null, 0, pict(8, 8)]]],
      ["snd ", [[1, "tap", 0, Uint8Array.of(1, 2, 3)]]],
    ]));
    const m = macPictures(fork);
    expect(m?.gravel).toBe(false);
    expect(sizes(m)).toEqual([["PICT 128", 320, 240], ["PICT 129", 8, 8]]);
  });

  it("lists pictures that won't decode, and keeps the rest", () => {
    const fork = buildRsrc(new Map<string, Entry[]>([
      ["BAPC", [[4020, null, 0, Uint8Array.of(1, 2, 3)]]],
      ["BADP", [[4020, null, 0, pict(64, 48)]]],
    ]));
    const m = macPictures(fork);
    expect(sizes(m)).toEqual([["BADP 4020", 64, 48]]);
    expect(m?.failed).toEqual(["BAPC 4020: not a QuickDraw picture"]);
  });

  it("decodes at most 16 pictures from one file", () => {
    const fork = buildRsrc(new Map<string, Entry[]>([
      ["PICT", Array.from({ length: 20 }, (_, i): Entry =>
        [i, null, 0, pict(4, 4)])]]));
    expect(macPictures(fork)?.images.size).toBe(16);
  });

  it("finds nothing in files that carry no pictures", () => {
    const sounds = buildRsrc(new Map<string, Entry[]>([
      ["snd ", [[1, "tap", 0, Uint8Array.of(1, 2, 3)]]]]));
    for (const d of [new Uint8Array(0), Uint8Array.of(1, 2, 3), sounds,
                     new Uint8Array(4096)])
      expect(macPictures(d)).toBeNull();
  });

  it("says why a PICT file won't decode", () => {
    const qt = buildPict({ frame: rect(0, 0, 2, 2), file: true, ops: [
      { kind: "raw", bytes: [0x82, 0x00, 0, 0, 0, 2, 1, 2] }] });
    const m = macPictures(qt);
    expect(m?.images.size).toBe(0);
    expect(m?.failed).toEqual(
      ["PICT: picture is QuickTime-compressed, which Finsical can't read"]);
  });
});

describe("hasMacPictures", () => {
  it("knows PICT files and forks with picture resources without decoding",
     () => {
    expect(hasMacPictures(pict(4, 4, true))).toBe(true);
    expect(hasMacPictures(wrapAppledouble(gravelFork()))).toBe(true);
    // A broken picture is still a picture: the drop says so.
    expect(hasMacPictures(buildRsrc(new Map<string, Entry[]>([
      ["PICT", [[1, null, 0, Uint8Array.of(9)]]]])))).toBe(true);
  });

  it("refuses files without pictures", () => {
    expect(hasMacPictures(buildRsrc(new Map<string, Entry[]>([
      ["snd ", [[1, null, 0, Uint8Array.of(9)]]]])))).toBe(false);
    expect(hasMacPictures(Uint8Array.of(0x42, 0x4d, 0, 0))).toBe(false);
  });
});
