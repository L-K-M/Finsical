/**
 * Classic Mac 'snd ' extraction for the browser — port of
 * tools/az/{rsrc,snd,mace}.py so a dropped AQUAZONE resource fork (raw
 * .rsrc, AppleDouble, MacBinary .bin, or BinHex .hqx) decodes in-app.
 *
 * Output is raw PCM: unsigned u8 (width 1) or little-endian s16
 * (width 2) — the caller turns it into an AudioBuffer; the Python side
 * emits the same bytes wrapped in WAV.
 */

import { mace3Decode } from "./mace.js";

export { mace3Decode };

export interface DecodedSnd {
  name: string;
  rateHz: number;
  /** u8 unsigned when width=1, s16-LE when width=2. */
  pcm: Uint8Array;
  width: 1 | 2;
}

class SndError extends Error {}

const u16be = (v: DataView, o: number): number => v.getUint16(o, false);
const i16be = (v: DataView, o: number): number => v.getInt16(o, false);
const u32be = (v: DataView, o: number): number => v.getUint32(o, false);

// ---- transfer encodings --------------------------------------------
// Resource forks can't survive a modern filesystem/download unwrapped,
// so AppleDouble, MacBinary and BinHex are peeled off before parsing.

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

// ---- resource fork ---------------------------------------------------

interface SndRes { id: number; name: string | null; data: Uint8Array }

const macDec = (() => {
  try { return new TextDecoder("macintosh"); }
  catch { return new TextDecoder("latin1"); }
})();

/** Yield 'snd ' resources from a (possibly wrapped) resource fork. */
function sndResources(d: Uint8Array): SndRes[] {
  const r = unwrapContainer(d);
  const v = new DataView(r.buffer, r.byteOffset, r.byteLength);
  if (r.length < 16) return [];
  const dOff = u32be(v, 0), mOff = u32be(v, 4);
  if (mOff + 28 > r.length) return [];
  const tOff = u16be(v, mOff + 24), nOff = u16be(v, mOff + 26);
  const tbase = mOff + tOff, nbase = mOff + nOff;
  if (tbase + 2 > r.length) return [];
  const ntypes = u16be(v, tbase) + 1;
  const out: SndRes[] = [];
  for (let i = 0; i < ntypes; i++) {
    const e = tbase + 2 + i * 8;
    if (e + 8 > r.length) break;
    if (v.getUint8(e) !== 0x73 || v.getUint8(e + 1) !== 0x6E ||
        v.getUint8(e + 2) !== 0x64 || v.getUint8(e + 3) !== 0x20)
      continue; // 'snd '
    const cnt = u16be(v, e + 4) + 1;
    const rbase = tbase + u16be(v, e + 6);
    for (let j = 0; j < cnt; j++) {
      const rr = rbase + j * 12;
      if (rr + 12 > r.length) break;
      const id = i16be(v, rr);
      const noff = i16be(v, rr + 2);
      const dd = u32be(v, rr + 4) & 0xFFFFFF; // +4: attr byte + 24-bit data offset
      const doff = dOff + dd;
      if (doff + 4 > r.length) continue;
      const sz = u32be(v, doff);
      if (doff + 4 + sz > r.length) continue;
      let name: string | null = null;
      // Only -1 is the nameless sentinel; other negatives would index
      // before the name list and throw out of the per-resource catch.
      if (noff >= 0) {
        const p = nbase + noff;
        if (p + 1 <= r.length && p + 1 + v.getUint8(p) <= r.length)
          name = macDec.decode(r.subarray(p + 1, p + 1 + v.getUint8(p)));
      }
      out.push({ id, name, data: r.subarray(doff + 4, doff + 4 + sz) });
    }
  }
  return out;
}

// ---- 'snd ' resource --------------------------------------------------

/** Parse one 'snd ' resource body → PCM or throw SndError. */
export function parseSnd(blob: Uint8Array):
    { rateHz: number; pcm: Uint8Array; width: 1 | 2 } {
  if (blob.length < 14) throw new SndError("snd resource too short");
  const v = new DataView(blob.buffer, blob.byteOffset, blob.byteLength);
  const fmt = u16be(v, 0);
  let p: number;
  if (fmt === 1) p = 4 + u16be(v, 2) * 6;
  else if (fmt === 2) p = 4;
  else throw new SndError(`unsupported snd format ${fmt}`);
  if (p + 2 > blob.length) throw new SndError("truncated snd header");
  const ncmd = u16be(v, p);
  if (p + 2 + ncmd * 8 > blob.length)
    throw new SndError("truncated command list");
  p += 2;
  let hoff = -1;
  for (let i = 0; i < ncmd; i++) {
    const cmd = u16be(v, p + i * 8), p2 = u32be(v, p + i * 8 + 4);
    if ((cmd & 0x7FFF) === 0x50 || (cmd & 0x7FFF) === 0x51)
      hoff = p2; // soundCmd / bufferCmd
  }
  if (hoff < 0 || hoff + 22 > blob.length)
    throw new SndError("no buffer command");

  // encode sits at +20 for stdSH/cmpSH/extSH alike.
  const enc = v.getUint8(hoff + 20);
  const rateHz = Math.floor(u32be(v, hoff + 8) / 65536);
  if (enc === 0) {
    // fmt1: u32 sample byte count at +4; fmt2: samples run to EOF.
    const ln = fmt === 1 ? u32be(v, hoff + 4) : blob.length - hoff - 22;
    const pcm = blob.subarray(hoff + 22, hoff + 22 + ln);
    if (pcm.length < ln) throw new SndError("truncated samples");
    return { rateHz, pcm: new Uint8Array(pcm), width: 1 };
  }
  if (enc === 0xFE) {
    // cmpSH: mono only; numFrames at +22 counts 2-byte MACE packets.
    if (blob.length < hoff + 64)
      throw new SndError("truncated cmpSH header");
    if (i16be(v, hoff + 6) !== 1)
      throw new SndError(`unsupported channel count ${i16be(v, hoff + 6)}`);
    const npackets = u32be(v, hoff + 22);
    const comp = i16be(v, hoff + 56);
    if (comp !== 3) throw new SndError(`unsupported compression ${comp}`);
    const data = blob.subarray(hoff + 64, hoff + 64 + npackets * 2);
    if (data.length < npackets * 2)
      throw new SndError(
        `truncated samples: need ${npackets * 2} bytes for ` +
        `${npackets} packets, got ${data.length}`);
    return { rateHz, pcm: mace3Decode(data, npackets), width: 2 };
  }
  if (enc === 0xFF) {
    // extSH: u32 channels at +4, u32 numFrames at +22, u16 sampleSize
    // at +48; data follows the 64-byte header.
    if (blob.length < hoff + 64)
      throw new SndError("truncated extSH header");
    const nch = u32be(v, hoff + 4);
    if (nch !== 1) throw new SndError(`unsupported channel count ${nch}`);
    const nframes = u32be(v, hoff + 22);
    const size = u16be(v, hoff + 48);
    if (size === 8) {
      const pcm = blob.subarray(hoff + 64, hoff + 64 + nframes);
      if (pcm.length < nframes)
        throw new SndError(
          `truncated samples: need ${nframes} bytes, got ${pcm.length}`);
      return { rateHz, pcm: new Uint8Array(pcm), width: 1 };
    }
    if (size === 16) {
      const want = nframes * 2;
      const data = blob.subarray(hoff + 64, hoff + 64 + want);
      if (data.length < want)
        throw new SndError(
          `truncated samples: need ${want} bytes, got ${data.length}`);
      // Mac s16 is big-endian; output little-endian like the WAV path.
      const pcm = new Uint8Array(want);
      for (let i = 0; i < want; i += 2) {
        pcm[i] = data[i + 1]!;
        pcm[i + 1] = data[i]!;
      }
      return { rateHz, pcm, width: 2 };
    }
    throw new SndError(`unsupported sample size ${size}`);
  }
  throw new SndError(`unsupported encode ${enc}`);
}

/** Wrap decoded PCM in a canonical 44-byte WAV — the same bytes
 * tools/az/snd.py's wave.open emits, so browser and CLI outputs match. */
export function wavBytes(s: { rateHz: number; pcm: Uint8Array;
                              width: 1 | 2 }): Uint8Array {
  const n = s.pcm.length;
  const out = new Uint8Array(44 + n);
  const v = new DataView(out.buffer);
  out.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
  v.setUint32(4, 36 + n, true);
  out.set([0x57, 0x41, 0x56, 0x45], 8); // "WAVE"
  out.set([0x66, 0x6D, 0x74, 0x20], 12); // "fmt "
  v.setUint32(16, 16, true); // fmt chunk size
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, s.rateHz, true);
  v.setUint32(28, s.rateHz * s.width, true); // byte rate
  v.setUint16(32, s.width, true); // block align
  v.setUint16(34, s.width * 8, true); // bits per sample
  out.set([0x64, 0x61, 0x74, 0x61], 36); // "data"
  v.setUint32(40, n, true);
  out.set(s.pcm, 44);
  return out;
}

/** Decode every 'snd ' resource in a (possibly wrapped) fork. Skips
 * undecodable resources so one bad entry doesn't sink the rest. */
export function soundsFromRsrc(data: Uint8Array): DecodedSnd[] {
  const out: DecodedSnd[] = [];
  for (const r of sndResources(data)) {
    try {
      const { rateHz, pcm, width } = parseSnd(r.data);
      out.push({ name: r.name ?? `snd_${r.id & 0xFFFF}`,
                 rateHz, pcm, width });
    } catch { /* undecodable entry — keep the rest */ }
  }
  return out;
}

export function hasSounds(data: Uint8Array): boolean {
  try { return sndResources(data).length > 0; }
  catch { return false; }
}

/** Extensions decodeAudioData handles natively — a plain audio file
 * imports as a named record with the encoded bytes carried verbatim
 * (`wav` is "the encoded payload", not always literal WAV). */
export const AUDIO_FILE_EXT = /\.(wav|mp3|aiff?|m4a|ogg|flac)$/i;

/** Sound records for one file: audio files pass their bytes through
 * for decodeAudioData; anything else is tried as a (possibly wrapped)
 * resource fork. [] when the file carries neither. */
export function fileSoundRecords(name: string, data: Uint8Array):
    { name: string; wav: Uint8Array }[] {
  const base = name.split("/").pop()!;
  // "._x.mp3" is a macOS AppleDouble companion, not raw audio — let it
  // fall through to the fork path (or [] when it holds no 'snd ').
  if (!base.startsWith("._") && AUDIO_FILE_EXT.test(base))
    return [{ name: base.replace(/\.[^.]+$/, ""), wav: data }];
  try {
    return soundsFromRsrc(data)
      .map((s) => ({ name: s.name, wav: wavBytes(s) }));
  } catch { return []; } // not a resource fork
}

/** Records key by name in the sound bank and the persisted store —
 * qualify same-stem records inside one batch ("a.mp3" + "a.wav") so
 * the later one doesn't silently overwrite the earlier. In-place. */
export function qualifySoundNames(
    recs: { name: string; wav: Uint8Array }[]): void {
  const seen = new Set<string>();
  for (const r of recs) {
    let n = r.name, i = 2;
    while (seen.has(n)) n = `${r.name} (${i++})`;
    r.name = n;
    seen.add(n);
  }
}
