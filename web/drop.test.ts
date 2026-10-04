import { describe, expect, it, vi } from "vitest";
import { decodeBmp } from "../core/data/bmp.js";
import { fshToSheets } from "../core/data/fsh.js";
import { buildPict, rect } from "../core/data/pict.fixture.js";
import { buildRsrc, wrapAppledouble, wrapBinhex, wrapMacbinary }
  from "../core/data/resfork.fixture.js";
const NO_FORK = new Uint8Array(0);
import { decodeDroppedPack, dropSection, isRefusedPicture, sortClientDrop }
  from "./drop.js";
import type { DroppedPack } from "./drop.js";
import { buildBmp8, buildChunkPack, cat, PAL, u16le, u32le }
  from "../core/data/fsh.fixture.js";

// The real decoders, wrapped so a test can make one call throw.
vi.mock("../core/data/bmp.js", async (importOriginal) => {
  const m = await importOriginal<typeof import("../core/data/bmp.js")>();
  return { ...m, decodeBmp: vi.fn(m.decodeBmp) };
});
vi.mock("../core/data/fsh.js", async (importOriginal) => {
  const m = await importOriginal<typeof import("../core/data/fsh.js")>();
  return { ...m, fshToSheets: vi.fn(m.fshToSheets) };
});

/** 8-bit BMP with real pixel rows — packImages decodes it. */
function buildBmpImage(w: number, h: number): Uint8Array {
  const hdr = buildBmp8(PAL);
  const stride = ((w * 8 + 31) >> 5) * 4;
  const out = cat(hdr, new Uint8Array(stride * h).fill(1));
  const v = new DataView(out.buffer);
  v.setUint32(2, out.length, true);
  v.setInt32(18, w, true);
  v.setInt32(22, h, true);
  return out;
}

/** One-frame, one-group sprite chunk over a w×h single-color frame. */
function spriteChunk(w: number, h: number, color: number): Uint8Array {
  const px = new Uint8Array(w * h).fill(color);
  const stream = cat(u16le(-w), new Uint8Array([px[0]!]));
  return cat(
    u16le(1), u16le(1), u32le(0),
    u16le(w), u16le(h), u16le(0), u32le(stream.length),
    stream,
  );
}

const packA = buildChunkPack(buildBmp8(PAL), spriteChunk(4, 4, 1));
const packB = buildChunkPack(buildBmp8(PAL), spriteChunk(6, 3, 2));

/** A multi-file drop, each file decoded on its own and in order, the
 * skipped ones (null) left out. */
function decodeEach(entries: [string, Uint8Array][]): DroppedPack[] {
  return entries.map(([name, data]) => decodeDroppedPack(name, data))
    .filter((p): p is DroppedPack => p !== null);
}

describe("decodeDroppedPack", () => {
  it("decodes every pack in a multi-file drop, in order", () => {
    const packs = decodeEach([
      ["NeonTetra.fsh", packA],
      ["Guppy.fsh", packB],
    ]);
    expect(packs.map((p) => p.name)).toEqual(["NeonTetra", "Guppy"]);
    expect(packs[0]!.sheets.size).toBe(1);
    expect(packs[1]!.sheets.size).toBe(1);
  });

  it("strips the extension for the display name", () => {
    const packs = decodeEach([["a/b/ANGEL.REZ", packA]]);
    expect(packs[0]!.name).toBe("a/b/ANGEL");
  });

  it("keeps a dotted folder name when the file has no extension", () => {
    // Only the file's own extension goes, as dropSection reads it.
    const packs = decodeEach([["backup.v2/Guppy", packA]]);
    expect(packs[0]!.name).toBe("backup.v2/Guppy");
  });

  it("skips a corrupt pack without losing the rest of the drop", () => {
    // Truncated mid-directory: isPack still sees the magic, decoding
    // must not take the healthy sibling down with it.
    const truncated = packA.slice(0, 0x120);
    const packs = decodeEach([
      ["corrupt.fsh", truncated],
      ["Guppy.fsh", packB],
    ]);
    expect(packs.map((p) => p.name)).toEqual(["Guppy"]);
    expect(decodeDroppedPack("corrupt.fsh", truncated)).toBeNull();
  });

  it("skips a pack whose decode throws and keeps the rest", () => {
    vi.mocked(fshToSheets).mockImplementationOnce(() => {
      throw new RangeError("offset is out of bounds");
    });
    const packs = decodeEach([["Bad.fsh", packA], ["Guppy.fsh", packB]]);
    expect(packs.map((p) => p.name)).toEqual(["Guppy"]);
  });

  it("skips non-pack files and pack containers with no sprites", () => {
    const empty = buildChunkPack(buildBmp8(PAL));
    const packs = decodeEach([
      ["notes.txt", new Uint8Array([1, 2, 3])],
      ["empty.fsh", empty],
      ["Guppy.fsh", packB],
    ]);
    expect(packs.map((p) => p.name)).toEqual(["Guppy"]);
  });

  it("classifies by extension: fish add no scenery, scenery no fish", () => {
    const art = buildBmpImage(8, 4);
    const [fish, gravel, tank, rez] = decodeEach([
      ["Guppy.fsh", buildChunkPack(art, spriteChunk(4, 4, 1))],
      ["Sand.grv", buildChunkPack(art)],
      ["Reef.azn", buildChunkPack(art, spriteChunk(4, 4, 1))],
      ["ANGEL.REZ", buildChunkPack(art, spriteChunk(4, 4, 1))],
    ]);
    expect([fish!.section, fish!.sheets.size, fish!.images.size])
      .toEqual(["fish", 1, 0]);
    expect([gravel!.section, gravel!.sheets.size, gravel!.images.size])
      .toEqual(["gravel", 0, 1]);
    expect([tank!.section, tank!.sheets.size, tank!.images.size])
      .toEqual(["tanks", 0, 1]);
    expect([rez!.section, rez!.sheets.size, rez!.images.size])
      .toEqual(["tanks", 1, 1]);
  });

  it("maps every pack extension to its section", () => {
    expect(["a.GRV", "b.plt", "c.acc", "d.azn", "e.rez", "f.fsh", "g"]
      .map(dropSection)).toEqual(["gravel", "plants", "accessories",
      "tanks", "tanks", "fish", "fish"]);
  });

  it("maps a .bmp picture to the backgrounds", () => {
    expect(["x.bmp", "Y.BMP"].map(dropSection))
      .toEqual(["backgrounds", "backgrounds"]);
  });
});

describe("decodeDroppedPack with pictures", () => {
  it("skips a picture whose decode throws and keeps the rest", () => {
    // decodeBmp allocates from header-controlled dimensions; a throw
    // there must cost only that file, as a throwing pack does.
    const boom = (): never => {
      throw new RangeError("Array buffer allocation failed");
    };
    vi.mocked(decodeBmp).mockImplementationOnce(boom);
    const got = decodeEach([
      ["Broken.bmp", buildBmpImage(640, 480)],
      ["Fine.bmp", buildBmpImage(320, 200)],
    ]);
    expect(got.map((p) => p.name)).toEqual(["Fine"]);
    vi.mocked(decodeBmp).mockImplementationOnce(boom);
    expect(decodeDroppedPack("Broken.bmp", buildBmpImage(640, 480)))
      .toBeNull();
  });

  it("takes a 256-color BMP as a backdrop, by its content", () => {
    const [pic, bare] = decodeEach([
      ["MyBackdrop.bmp", buildBmpImage(640, 480)],
      // A classic Mac file can carry no extension at all.
      ["Reef", buildBmpImage(160, 100)],
    ]);
    expect([pic!.name, pic!.section, pic!.sheets.size])
      .toEqual(["MyBackdrop", "backgrounds", 0]);
    expect([...pic!.images.keys()]).toEqual(["MyBackdrop.bmp"]);
    expect([...pic!.images.values()].map((i) => [i.w, i.h]))
      .toEqual([[640, 480]]);
    expect([bare!.name, bare!.section, bare!.images.size])
      .toEqual(["Reef", "backgrounds", 1]);
  });

  it("skips pictures the tank can't show", () => {
    const deep = buildBmpImage(640, 480);
    new DataView(deep.buffer).setUint16(28, 24, true); // 24-bit
    expect(decodeEach([
      ["Photo.bmp", deep],
      ["Tiny.bmp", buildBmpImage(64, 40)],
      ["Narrow.bmp", buildBmpImage(159, 100)],
      ["Low.bmp", buildBmpImage(160, 99)],
    ])).toEqual([]);
  });
});

type Entry = [number, string | null, number, Uint8Array];
const CLUT: [number, number, number][] = [[255, 255, 255], [40, 80, 160]];
/** A w x h PICT: a data-fork file when `file`, else a bare payload. */
const pict = (w: number, h: number, file = false) => buildPict({
  file, frame: rect(0, 0, h, w),
  ops: [{ kind: "indexed", depth: 8, w, h, clut: CLUT,
          px: Array.from({ length: w * h }, (_, i) => i < w ? 0 : 1) }],
});
/** A gravel add-on's fork: its strip, catalog picture and Grvl. */
const gravelFork = (stripW = 500, stripH = 60) => buildRsrc(
  new Map<string, Entry[]>([
    ["Grvl", [[4020, null, 0, Uint8Array.of(0, 53, 0, 52, 0, 0, 0, 0)]]],
    ["BADP", [[4020, null, 0, pict(320, 240)]]],
    ["BAPC", [[4020, null, 0, pict(stripW, stripH)]]],
  ]));
const dims = (p: DroppedPack) =>
  [...p.images.values()].map((i) => [i.w, i.h]);

describe("decodeDroppedPack with Mac pictures", () => {
  it("takes a PICT file as a backdrop by its content, extension or not",
     () => {
    const got = decodeEach([["Reef.pct", pict(320, 240, true)],
                            ["Astral Hill", pict(640, 480, true)]]);
    expect(got.map((p) => [p.name, p.section, dims(p)])).toEqual([
      ["Reef", "backgrounds", [[320, 240]]],
      ["Astral Hill", "backgrounds", [[640, 480]]],
    ]);
  });

  it("names a picture after its file name when that is all extension",
     () => {
    // An empty name fails the tank's install checks after the Import
    // Add-ons window has stored the bytes.
    expect(decodeEach([[".pct", pict(320, 240, true)],
                       [".bmp", buildBmpImage(320, 240)]])
      .map((p) => p.name)).toEqual([".pct", ".bmp"]);
  });

  it("takes a PICT file wrapped in MacBinary as a backdrop", () => {
    const got = decodeEach([["Reef.bin", wrapMacbinary(NO_FORK,
                                                       pict(320, 240, true))]]);
    expect(got.map((p) => [p.name, p.section, dims(p)]))
      .toEqual([["Reef", "backgrounds", [[320, 240]]]]);
    // Too small to show: still a picture, so the drop says why.
    expect(isRefusedPicture(wrapMacbinary(NO_FORK, pict(40, 30, true))))
      .toBe(true);
  });

  it("takes a gravel add-on's fork as its gravel strip", () => {
    const p = decodeDroppedPack("._星砂- star sand",
                                wrapAppledouble(gravelFork()));
    // The catalog picture stays out: it is no backdrop.
    expect(p && [p.name, p.section, dims(p)])
      .toEqual(["星砂- star sand", "gravel", [[500, 60]]]);
  });

  it("reads picture resources from every fork wrapping", () => {
    const fork = buildRsrc(new Map<string, Entry[]>([
      ["PICT", [[128, null, 0, pict(320, 240)]]]]));
    for (const [name, d] of [["Back.rsrc", fork],
                             ["Back.bin", wrapMacbinary(fork)],
                             ["Back.hqx", wrapBinhex(fork)]] as const) {
      const p = decodeDroppedPack(name, d);
      expect(p && [p.name, p.section, dims(p)])
        .toEqual(["Back", "backgrounds", [[320, 240]]]);
    }
  });

  it("skips Mac pictures the tank can't show", () => {
    const quickTime = buildPict({ frame: rect(0, 0, 2, 2), file: true, ops: [
      { kind: "raw", bytes: [0x82, 0x00, 0, 0, 0, 2, 1, 2] }] });
    expect(decodeEach([
      ["Tiny.pct", pict(64, 40, true)],
      ["Movie.pct", quickTime],
      ["._Short", wrapAppledouble(gravelFork(150, 30))],
    ])).toEqual([]);
  });
});

describe("isRefusedPicture", () => {
  it("calls BMPs, PICT files and AquaZone picture forks pictures", () => {
    expect(isRefusedPicture(buildBmpImage(64, 40))).toBe(true);
    expect(isRefusedPicture(pict(64, 40, true))).toBe(true);
    expect(isRefusedPicture(wrapAppledouble(gravelFork(150, 30)))).toBe(true);
  });

  it("lets a fork with only small 'PICT's pass quietly", () => {
    // The "._" companion of a Photoshop file: a preview, no art.
    const preview = wrapAppledouble(buildRsrc(new Map<string, Entry[]>([
      ["PICT", [[256, null, 0, pict(96, 72)]]]])));
    expect(decodeDroppedPack("._Astral Hill", preview)).toBeNull();
    expect(isRefusedPicture(preview)).toBe(false);
    expect(isRefusedPicture(Uint8Array.of(1, 2, 3))).toBe(false);
  });
});

describe("sortClientDrop", () => {
  /** A playable 'snd ': format 2, one bufferCmd, 8-bit samples. */
  const snd = (pcm: number[]): Uint8Array => {
    const out = new Uint8Array(14 + 22 + pcm.length);
    const v = new DataView(out.buffer);
    v.setUint16(0, 2); v.setUint16(4, 1);
    v.setUint16(6, 0x8050); v.setUint32(10, 14);
    v.setUint32(14 + 4, 1);
    v.setUint32(14 + 8, 11025 * 65536);
    out.set(pcm, 36);
    return out;
  };

  it("sorts pictures from sounds, and counts the refused pictures", () => {
    const both = wrapAppledouble(buildRsrc(new Map<string, Entry[]>([
      ["Grvl", [[4020, null, 0, Uint8Array.of(0, 53, 0, 52, 0, 0, 0, 0)]]],
      ["BAPC", [[4020, null, 0, pict(500, 60)]]],
      ["snd ", [[1, "crunch", 0, snd([128, 140])]]],
    ])));
    const got = sortClientDrop([
      { name: "Reef.pct", data: pict(320, 240, true) },
      { name: "Wall.bmp", data: buildBmpImage(320, 200) },
      { name: "._Pebbles", data: both },
      { name: "Tiny.pct", data: pict(10, 10, true) },
      { name: "Ding.wav", data: Uint8Array.of(0x52, 0x49, 0x46, 0x46) },
      { name: "Guppy.fsh", data: packA },
    ]);
    expect(got.pictures.map((x) => [x.name, x.pack.section, x.pack.name]))
      .toEqual([["Reef.pct", "backgrounds", "Reef"],
                ["Wall.bmp", "backgrounds", "Wall"],
                ["._Pebbles", "gravel", "Pebbles"]]);
    // The fork's sound still imports; the pack waits for the tank.
    expect(got.sounds.map((r) => r.name)).toEqual(["crunch", "Ding"]);
    expect(got.refused).toBe(1);
  });

  it("takes no sounds from a picture file, whatever its name", () => {
    // As on the tank: a PICT or BMP is a picture, even named like audio.
    const got = sortClientDrop([
      { name: "Reef.wav", data: pict(320, 240, true) },
      { name: "Wall.mp3", data: buildBmpImage(320, 200) },
    ]);
    expect(got.pictures.map((x) => x.name)).toEqual(["Reef.wav", "Wall.mp3"]);
    expect(got.sounds).toEqual([]);
  });

  it("keeps the last of the pictures that share a name", () => {
    // One name is one stored file: on the tank too, the last one wins.
    const got = sortClientDrop([
      { name: "Ocean", data: pict(320, 240, true) },
      { name: "Ocean", data: pict(640, 480, true) },
    ]);
    expect(got.pictures.map((x) => [...x.pack.images.values()]
      .map((i) => [i.w, i.h]))).toEqual([[[640, 480]]]);
  });
});
