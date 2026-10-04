import { describe, expect, it, vi } from "vitest";
import { decodeBmp } from "../core/data/bmp.js";
import { decodeDroppedPack, dropSection } from "./drop.js";
import type { DroppedPack } from "./drop.js";
import { buildBmp8, buildChunkPack, cat, PAL, u16le, u32le }
  from "../core/data/fsh.fixture.js";

// The real decoder, wrapped so one test can make a call throw.
vi.mock("../core/data/bmp.js", async (importOriginal) => {
  const m = await importOriginal<typeof import("../core/data/bmp.js")>();
  return { ...m, decodeBmp: vi.fn(m.decodeBmp) };
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
