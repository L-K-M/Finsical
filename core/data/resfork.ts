/**
 * Classic Mac resource forks: the transfer encodings a fork travels
 * in, and its big-endian resource map.
 *
 * A fork can't cross a modern filesystem or download on its own, so it
 * arrives as an AppleDouble companion ("._name"), a MacBinary .bin or a
 * BinHex .hqx, peeled off here first. Then the map ("Inside Macintosh:
 * More Macintosh Toolbox", Resource Manager reference):
 *
 *   0x00   u32 data offset, u32 map offset, u32 data length, u32 map length
 *   map    16-byte header copy, 6 reserved bytes, u16 attributes, then
 *          u16 type list and u16 name list offsets, from the map
 *   types  u16 count - 1, then 8-byte entries: the type code, u16
 *          count - 1, u16 reference list offset from the type list
 *   refs   12-byte entries: i16 id, i16 name offset from the name list
 *          (-1: none), an attributes byte and a 24-bit data offset from
 *          the data offset, then 4 reserved bytes
 *   data   u32 length, then the payload
 *
 * Sounds ('snd ') and pictures (AquaZone's gravel BAPC and BADP, 'PICT')
 * both read through openFork. The 9003 packs carry a little-endian copy
 * of this map whose type list offset points past the count (sndbank.ts,
 * rsrc.ts); those readers stay separate until that difference has tests
 * of its own (FOLLOW-UPS.md).
 */

const u16be = (v: DataView, o: number): number => v.getUint16(o, false);
const i16be = (v: DataView, o: number): number => v.getInt16(o, false);
const u32be = (v: DataView, o: number): number => v.getUint32(o, false);

// ---- transfer encodings --------------------------------------------

function unwrapAppledouble(d: Uint8Array): Uint8Array {
  if (d.length < 26) return d;
  const v = new DataView(d.buffer, d.byteOffset, d.byteLength);
  const magic = u32be(v, 0);
  if (magic !== 0x00051607 && magic !== 0x00051600) return d;
  const n = u16be(v, 24);
  for (let i = 0; i < n; i++) {
    const o = 26 + i * 12;
    if (o + 12 > d.length) break;
    if (u32be(v, o) !== 2) continue; // entry id 2 = resource fork
    const off = u32be(v, o + 4), len = u32be(v, o + 8);
    if (off + len <= d.length) return d.subarray(off, off + len);
  }
  return d;
}

function unwrapMacbinary(d: Uint8Array): Uint8Array {
  // Fixed-zero header fields + a 1..63 name length keep a raw fork
  // (data offset 0x00000100 → name length 0) from matching.
  if (d.length < 128 || d[0] !== 0 || d[74] !== 0) return d;
  const nlen = d[1]!;
  if (nlen < 1 || nlen > 63) return d;
  const v = new DataView(d.buffer, d.byteOffset, d.byteLength);
  const dlen = u32be(v, 83), rlen = u32be(v, 87);
  if (!rlen) return d;
  const roff = 128 + Math.ceil(dlen / 128) * 128;
  if (roff + rlen > d.length) return d;
  return d.subarray(roff, roff + rlen);
}

const BINHEX_ALPHABET =
  '!"#$%&\'()*+,-012345689@ABCDEFGHIJKLMNPQRSTUVXYZ[`abcdefhijklmpqr';
const BINHEX_LUT = new Map<string, number>(
  [...BINHEX_ALPHABET].map((c, i) => [c, i]));

function binhexDecode(raw: Uint8Array): Uint8Array | null {
  // 6-bit packed text between ':' markers; 0x90 is the RLE marker.
  const text = new TextDecoder("latin1").decode(raw);
  const start = text.indexOf(":");
  if (start < 0) return null;
  const vals: number[] = [];
  for (let i = start + 1; i < text.length; i++) {
    const v = BINHEX_LUT.get(text[i]!);
    if (v !== undefined) vals.push(v);
    else if (text[i] === ":" && vals.length > 64) break;
  }
  const out: number[] = [];
  let i = 0;
  for (; i + 4 <= vals.length; i += 4) {
    const acc = vals[i]! << 18 | vals[i + 1]! << 12 |
                vals[i + 2]! << 6 | vals[i + 3]!;
    out.push(acc >> 16 & 0xFF, acc >> 8 & 0xFF, acc & 0xFF);
  }
  const tail = vals.length - i;
  if (tail) {
    let acc = 0;
    for (let j = 0; j < tail; j++) acc |= vals[i + j]! << (18 - j * 6);
    if (tail > 1) out.push(acc >> 16 & 0xFF);
    if (tail > 2) out.push(acc >> 8 & 0xFF);
  }
  // De-RLE: 0x90 0x00 = literal 0x90; 0x90 n = prior byte × n total.
  const d: number[] = [];
  for (i = 0; i < out.length; i++) {
    const b = out[i]!;
    if (b === 0x90 && i + 1 < out.length) {
      const n = out[++i]!;
      if (n === 0) { d.push(0x90); continue; }
      if (!d.length) return null;
      for (let k = 0; k < n - 1; k++) d.push(d[d.length - 1]!);
      continue;
    }
    d.push(b);
  }
  return new Uint8Array(d);
}

function unwrapBinhex(d: Uint8Array): Uint8Array {
  // Cheap gate: BinHex is text — a preamble line or a ':' first byte.
  const head = new TextDecoder("latin1").decode(d.subarray(0, 8192));
  if (!head.includes("This file must be converted with BinHex")) {
    const t = head.trimStart();
    if (!t.startsWith(":")) return d;
  }
  const dec = binhexDecode(d);
  if (!dec || dec.length < 22) return d;
  const nlen = dec[0]!;
  // nlen + version byte + 20-byte header tail must fit before reads.
  if (nlen < 1 || nlen > 63 || dec.length < nlen + 22 ||
      dec[1 + nlen] !== 0) return d;
  const v = new DataView(dec.buffer, dec.byteOffset, dec.byteLength);
  // name + version + type(4) + creator(4) + flags(2) + dlen(4) + rlen(4)
  const dlen = u32be(v, 1 + nlen + 1 + 10), rlen = u32be(v, 1 + nlen + 1 + 14);
  const off = 1 + nlen + 1 + 18 + 2; // + header CRC
  if (off + dlen + 2 + rlen > dec.length) return d;
  return rlen ? dec.subarray(off + dlen + 2, off + dlen + 2 + rlen) : d;
}

/** Peel transfer encodings; loops until stable (a .bin can hold an
 * AppleDouble file). Each unwrap returns its input when it can't peel,
 * so identity is the stable-point test. */
export function unwrapContainer(d: Uint8Array): Uint8Array {
  for (let i = 0; i < 4; i++) {
    const out = unwrapBinhex(unwrapMacbinary(unwrapAppledouble(d)));
    if (out === d) return out;
    d = out;
  }
  return d;
}

// ---- resource map ----------------------------------------------------

export interface ForkResource {
  id: number;
  name: string | null;
  data: Uint8Array;
}

/** A resource fork whose map has been found. */
export interface Fork {
  /** Resources of one four-character type, in map order, at most
   * `max` of them. Only the map's first entry for the type is read (a
   * map lists each type once; a second is crafted), and a payload
   * yields once however many references share it. References and
   * payloads that run past the end are skipped. */
  resources(type: string, max: number): ForkResource[];
}

/** Resource names are Mac Roman. */
const macDec = (() => {
  try { return new TextDecoder("macintosh"); }
  catch { return new TextDecoder("latin1"); }
})();

/** The resource map of a (possibly wrapped) resource fork, or null
 * when `d` has none that can be read. Never throws. */
export function openFork(d: Uint8Array): Fork | null {
  const r = unwrapContainer(d);
  const v = new DataView(r.buffer, r.byteOffset, r.byteLength);
  if (r.length < 16) return null;
  const dOff = u32be(v, 0), mOff = u32be(v, 4);
  if (mOff + 28 > r.length) return null;
  const tOff = u16be(v, mOff + 24), nOff = u16be(v, mOff + 26);
  const tbase = mOff + tOff, nbase = mOff + nOff;
  if (tbase + 2 > r.length) return null;
  const ntypes = u16be(v, tbase) + 1;
  return { resources(type: string, max: number): ForkResource[] {
    if (type.length !== 4) throw new Error(`type code "${type}" isn't 4 characters`);
    const code = [...type].map((c) => c.charCodeAt(0));
    for (let i = 0; i < ntypes; i++) {
      const e = tbase + 2 + i * 8;
      if (e + 8 > r.length) break;
      if (!code.every((b, k) => v.getUint8(e + k) === b)) continue;
      const out: ForkResource[] = [];
      const cnt = u16be(v, e + 4) + 1;
      const rbase = tbase + u16be(v, e + 6);
      // As in bankSounds: one record per payload, and a capped count.
      const seen = new Set<number>();
      for (let j = 0; j < cnt && out.length < max; j++) {
        const rr = rbase + j * 12;
        if (rr + 12 > r.length) break;
        const id = i16be(v, rr);
        const noff = i16be(v, rr + 2);
        const dd = u32be(v, rr + 4) & 0xFFFFFF; // +4: attr byte + 24-bit data offset
        const doff = dOff + dd;
        if (seen.has(doff)) continue;
        seen.add(doff);
        if (doff + 4 > r.length) continue;
        const sz = u32be(v, doff);
        if (doff + 4 + sz > r.length) continue;
        let name: string | null = null;
        // Only -1 is the nameless sentinel; other negatives would index
        // before the name list.
        if (noff >= 0) {
          const p = nbase + noff;
          if (p + 1 <= r.length && p + 1 + v.getUint8(p) <= r.length)
            name = macDec.decode(r.subarray(p + 1, p + 1 + v.getUint8(p)));
        }
        out.push({ id, name, data: r.subarray(doff + 4, doff + 4 + sz) });
      }
      return out;
    }
    return [];
  } };
}
