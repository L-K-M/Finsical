/** Shared test builders for classic Mac resource forks (resfork.ts):
 * a big-endian fork, and the AppleDouble, MacBinary and BinHex
 * wrappings it travels in. */

/** A resource fork: {type: [[id, name|null, attr, data]]}. Names are
 * written as UTF-8, so keep them ASCII where Mac Roman matters. */
export function buildRsrc(types: Map<string, [number, string | null, number, Uint8Array][]>): Uint8Array {
  const dataArea: number[] = [];
  const dataOffsets: [string, number, string | null, number, number][] = [];
  for (const [tid, entries] of types) {
    for (const [rid, name, attr, blob] of entries) {
      dataOffsets.push([tid, rid, name, attr, dataArea.length]);
      dataArea.push(blob.length >>> 24 & 0xFF, blob.length >>> 16 & 0xFF,
                    blob.length >>> 8 & 0xFF, blob.length & 0xFF);
      for (const b of blob) dataArea.push(b);
    }
  }
  const typeList: number[] = [0, types.size - 1];
  const refLists: number[] = [];
  const nameList: number[] = [];
  const nameOffsets = new Map<string, number>();
  const refBase = 2 + 8 * types.size;
  const macEnc = new TextEncoder();
  for (const [tid, entries] of types) {
    for (let i = 0; i < 4; i++) typeList.push(tid.charCodeAt(i)!);
    typeList.push(entries.length - 1 >>> 8 & 0xFF, (entries.length - 1) & 0xFF);
    const ro = refBase + refLists.length;
    typeList.push(ro >>> 8 & 0xFF, ro & 0xFF);
    for (const [, rid, name, attr, doff] of
         dataOffsets.filter((e) => e[0] === tid)) {
      let noff = -1;
      if (name !== null) {
        noff = nameOffsets.get(name) ?? -1;
        if (noff === -1) {
          noff = nameList.length;
          const enc = macEnc.encode(name);
          nameList.push(enc.length);
          for (const b of enc) nameList.push(b);
          nameOffsets.set(name, noff);
        }
      }
      refLists.push(rid >>> 8 & 0xFF, rid & 0xFF);
      refLists.push(noff >>> 8 & 0xFF, noff & 0xFF);
      refLists.push(attr, doff >>> 16 & 0xFF, doff >>> 8 & 0xFF, doff & 0xFF);
      refLists.push(0, 0, 0, 0);
    }
  }
  typeList.push(...refLists);
  const mapBody = [...new Array(22).fill(0),
                   0, 0, 0, 28,
                   (28 + typeList.length) >>> 8 & 0xFF,
                   (28 + typeList.length) & 0xFF,
                   ...typeList, ...nameList];
  const dataOff = 256, mapOff = dataOff + dataArea.length;
  const out = new Uint8Array(mapOff + mapBody.length);
  const v = new DataView(out.buffer);
  v.setUint32(0, dataOff); v.setUint32(4, mapOff);
  v.setUint32(8, dataArea.length); v.setUint32(12, mapBody.length);
  out.set(Uint8Array.from(dataArea), dataOff);
  out.set(Uint8Array.from(mapBody), mapOff);
  return out;
}

export const wrapAppledouble = (rsrc: Uint8Array): Uint8Array => {
  const out = new Uint8Array(26 + 12 + rsrc.length);
  const v = new DataView(out.buffer);
  v.setUint32(0, 0x00051607); v.setUint32(4, 0x00020000);
  v.setUint16(24, 1);
  v.setUint32(26, 2); v.setUint32(30, 38); v.setUint32(34, rsrc.length);
  out.set(rsrc, 38);
  return out;
};

export const wrapMacbinary = (rsrc: Uint8Array, data = new Uint8Array(0),
                       name = "file"): Uint8Array => {
  const pad = (128 - (data.length % 128)) % 128;
  const out = new Uint8Array(128 + data.length + pad + rsrc.length);
  const v = new DataView(out.buffer);
  const nb = new TextEncoder().encode(name);
  out[1] = nb.length; out.set(nb, 2);
  out.set([0x41, 0x50, 0x50, 0x4C], 65);   // 'APPL'
  out.set([0x39, 0x30, 0x30, 0x33], 69);   // '9003'
  v.setUint32(83, data.length); v.setUint32(87, rsrc.length);
  out.set(data, 128); out.set(rsrc, 128 + data.length + pad);
  return out;
};

export const wrapBinhex = (rsrc: Uint8Array, data = new Uint8Array(0),
                    name = "file"): Uint8Array => {
  const nb = new TextEncoder().encode(name);
  const head = new Uint8Array(1 + nb.length + 1 + 18 + 2);
  head[0] = nb.length; head.set(nb, 1);
  head.set([0x41, 0x50, 0x50, 0x4C, 0x39, 0x30, 0x30, 0x33],
           2 + nb.length);
  const hv = new DataView(head.buffer);
  hv.setUint32(1 + nb.length + 1 + 10, data.length);
  hv.setUint32(1 + nb.length + 1 + 14, rsrc.length);
  const body = new Uint8Array(head.length + data.length + 2 +
                              rsrc.length + 2);
  body.set(head); body.set(data, head.length);
  body.set(rsrc, head.length + data.length + 2);
  // RLE: 0x90 literal + runs of 4+.
  const rle: number[] = [];
  for (let i = 0; i < body.length;) {
    const b = body[i]!;
    let run = 1;
    while (i + run < body.length && body[i + run] === b && run < 255) run++;
    if (b === 0x90) { rle.push(0x90, 0); i += 1; }
    else if (run >= 4) { rle.push(b, 0x90, run); i += run; }
    else { for (let k = 0; k < run; k++) rle.push(b); i += run; }
  }
  const enc: number[] = [];
  for (let i = 0; i < rle.length; i += 3) {
    const c = rle.slice(i, i + 3);
    const acc = (c[0]! << 16) | ((c[1] ?? 0) << 8) | (c[2] ?? 0);
    const n = c.length === 3 ? 4 : c.length + 1;
    for (const s of [18, 12, 6, 0].slice(0, n))
      enc.push(BINHEX_ALPHABET.charCodeAt(acc >>> s & 63));
  }
  const pre = new TextEncoder().encode(
    "(This file must be converted with BinHex 4.0)\r\n:");
  const out = new Uint8Array(pre.length + enc.length + 1);
  out.set(pre); out.set(Uint8Array.from(enc), pre.length);
  out[out.length - 1] = 0x3A;
  return out;
};
const BINHEX_ALPHABET =
  '!"#$%&\'()*+,-012345689@ABCDEFGHIJKLMNPQRSTUVXYZ[`abcdefhijklmpqr';
