// Test fixtures: byte builders for the 9003 pack container and a
// minimal 8-bit BMP, since the repo ships no game data. Shared by
// core/data/fsh.test.ts and web/drop.test.ts. Nothing here imports
// bmp.js, which drop.test.ts mocks.

export const PAL: [number, number, number][] =
  [[0, 0, 0], [255, 0, 0], [0, 0, 255], [0, 255, 0]];

export function u32le(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n, true);
  return b;
}
export function u16le(n: number): Uint8Array {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, n, true);
  return b;
}
export const cat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
};

/** Minimal 8-bit BMP — only the palette region needs to be valid. */
export function buildBmp8(pal: [number, number, number][]): Uint8Array {
  const pxOff = 14 + 40 + 256 * 4;
  const hdr = new Uint8Array(pxOff);
  hdr[0] = 0x42; hdr[1] = 0x4d;                    // "BM"
  const v = new DataView(hdr.buffer);
  v.setUint32(2, pxOff + 4, true);                 // size
  v.setUint32(10, pxOff, true);                    // pixel offset
  v.setUint32(14, 40, true);                       // BITMAPINFOHEADER
  v.setUint16(26, 1, true);                        // planes
  v.setUint16(28, 8, true);                        // bpp
  v.setUint32(46, pal.length, true);               // colors used
  pal.forEach(([r, g, b], i) => {
    hdr.set([b, g, r, 0], 14 + 40 + i * 4);        // BGRA
  });
  return hdr;
}

/** A pack container holding `chunks` in order, without a resource map
 * (rsrc.fixture.ts's buildPack builds one with a map). */
export function buildChunkPack(...chunks: Uint8Array[]): Uint8Array {
  const body: Uint8Array[] = [new Uint8Array(0x100)];
  for (const pl of chunks) body.push(u32le(pl.length), pl);
  const dirOff = body.reduce((n, p) => n + p.length, 0);
  const hdr = cat(u32le(0x00000100), u32le(dirOff), u32le(dirOff - 0x100), u32le(0x104));
  const out = cat(...body, hdr); // trailer: 16B header copy
  out.set(hdr, 0);
  return out;
}
