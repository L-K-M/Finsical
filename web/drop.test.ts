import { describe, expect, it } from "vitest";
import { decodeDroppedPacks } from "./drop.js";

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

  it("skips non-pack files and pack containers with no sprites", () => {
    const empty = buildPack(buildBmp8(PAL));
    const packs = decodeDroppedPacks([
      ["notes.txt", new Uint8Array([1, 2, 3])],
      ["empty.fsh", empty],
      ["Guppy.fsh", packB],
    ]);
    expect(packs.map((p) => p.name)).toEqual(["Guppy"]);
  });
});
