import { describe, expect, it } from "vitest";
import { decodeDroppedPacks, dropSection } from "./drop.js";

const PAL: [number, number, number][] =
  [[0, 0, 0], [255, 0, 0], [0, 0, 255], [0, 255, 0]];

function u32le(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n, true);
  return b;
}
function u16le(n: number): Uint8Array {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, n, true);
  return b;
}
const cat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
};

/** Minimal 8-bit BMP — only the palette region needs to be valid. */
function buildBmp8(pal: [number, number, number][]): Uint8Array {
  const pxOff = 14 + 40 + 256 * 4;
  const hdr = new Uint8Array(pxOff);
  hdr[0] = 0x42; hdr[1] = 0x4d; // "BM"
  const v = new DataView(hdr.buffer);
  v.setUint32(2, pxOff + 4, true);
  v.setUint32(10, pxOff, true);
  v.setUint32(14, 40, true);
  v.setUint16(26, 1, true);
  v.setUint16(28, 8, true);
  v.setUint32(46, pal.length, true);
  pal.forEach(([r, g, b], i) => hdr.set([b, g, r, 0], 14 + 40 + i * 4));
  return hdr;
}

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

function buildPack(...chunks: Uint8Array[]): Uint8Array {
  const body: Uint8Array[] = [new Uint8Array(0x100)];
  for (const pl of chunks) body.push(u32le(pl.length), pl);
  const dirOff = body.reduce((n, p) => n + p.length, 0);
  const hdr = cat(u32le(0x00000100), u32le(dirOff),
                  u32le(dirOff - 0x100), u32le(0x104));
  const out = cat(...body);
  const full = cat(out, hdr);
  full.set(hdr, 0);
  return full;
}

const packA = buildPack(buildBmp8(PAL), spriteChunk(4, 4, 1));
const packB = buildPack(buildBmp8(PAL), spriteChunk(6, 3, 2));

describe("decodeDroppedPacks", () => {
  it("decodes every pack in a multi-file drop, in order", () => {
    const packs = decodeDroppedPacks([
      ["NeonTetra.fsh", packA],
      ["Guppy.fsh", packB],
    ]);
    expect(packs.map((p) => p.name)).toEqual(["NeonTetra", "Guppy"]);
    expect(packs[0]!.sheets.size).toBe(1);
    expect(packs[1]!.sheets.size).toBe(1);
  });

  it("strips the extension for the display name", () => {
    const packs = decodeDroppedPacks([["a/b/ANGEL.REZ", packA]]);
    expect(packs[0]!.name).toBe("a/b/ANGEL");
  });

  it("keeps a dotted folder name when the file has no extension", () => {
    // Only the file's own extension goes, as dropSection reads it.
    const packs = decodeDroppedPacks([["backup.v2/Guppy", packA]]);
    expect(packs[0]!.name).toBe("backup.v2/Guppy");
  });

  it("skips a corrupt pack without losing the rest of the drop", () => {
    // Truncated mid-directory: isPack still sees the magic, decoding
    // must not take the healthy sibling down with it.
    const truncated = packA.slice(0, 0x120);
    const packs = decodeDroppedPacks([
      ["corrupt.fsh", truncated],
      ["Guppy.fsh", packB],
    ]);
    expect(packs.map((p) => p.name)).toEqual(["Guppy"]);
  });

  it("skips non-pack files and pack containers with no sprites", () => {
    const empty = buildPack(buildBmp8(PAL));
    const packs = decodeDroppedPacks([
      ["notes.txt", new Uint8Array([1, 2, 3])],
      ["empty.fsh", empty],
      ["Guppy.fsh", packB],
    ]);
    expect(packs.map((p) => p.name)).toEqual(["Guppy"]);
  });

  it("classifies by extension: fish add no scenery, scenery no fish", () => {
    const art = buildBmpImage(8, 4);
    const [fish, gravel, tank, rez] = decodeDroppedPacks([
      ["Guppy.fsh", buildPack(art, spriteChunk(4, 4, 1))],
      ["Sand.grv", buildPack(art)],
      ["Reef.azn", buildPack(art, spriteChunk(4, 4, 1))],
      ["ANGEL.REZ", buildPack(art, spriteChunk(4, 4, 1))],
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
});
