/**
 * Classic Mac 'snd ' extraction for the browser — port of
 * tools/az/{snd,mace}.py so a dropped AQUAZONE resource fork (raw
 * .rsrc, AppleDouble, MacBinary .bin, or BinHex .hqx) decodes in-app.
 * resfork.ts unwraps the fork and reads its map.
 *
 * Output is raw PCM: unsigned u8 (width 1) or little-endian s16
 * (width 2) — the caller turns it into an AudioBuffer; the Python side
 * emits the same bytes wrapped in WAV.
 */

import { isPack } from "./fsh.js";
import { mace3Decode } from "./mace.js";
import { openFork } from "./resfork.js";
import { bankSounds, MAX_FILE_SOUNDS } from "./sndbank.js";

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
  for (const r of openFork(data)?.resources("snd ", MAX_FILE_SOUNDS) ?? []) {
    try {
      const { rateHz, pcm, width } = parseSnd(r.data);
      out.push({ name: r.name ?? `snd_${r.id & 0xFFFF}`,
                 rateHz, pcm, width });
    } catch { /* undecodable entry — keep the rest */ }
  }
  return out;
}

/** Extensions decodeAudioData handles natively — a plain audio file
 * imports as a named record with the encoded bytes carried verbatim
 * (`wav` is "the encoded payload", not always literal WAV). */
export const AUDIO_FILE_EXT = /\.(wav|mp3|aiff?|m4a|ogg|flac)$/i;

/** Sound records for one file: audio files pass their bytes through
 * for decodeAudioData, a 9003 sound bank (the Windows game's
 * AZ_WAVES.REZ) gives its WAVs, and anything else is tried as a
 * (possibly wrapped) resource fork. [] when the file carries none. */
export function fileSoundRecords(name: string, data: Uint8Array):
    { name: string; wav: Uint8Array }[] {
  const base = name.split("/").pop()!;
  // "._x.mp3" is a macOS AppleDouble companion, not raw audio — let it
  // fall through to the fork path (or [] when it holds no 'snd ').
  if (!base.startsWith("._") && AUDIO_FILE_EXT.test(base))
    return [{ name: base.replace(/\.[^.]+$/, ""), wav: data }];
  // A fork whose data starts at 64 KB opens with the bytes a pack
  // does, so an empty bank falls through to the fork path.
  const bank = isPack(data) ? bankSounds(data) : [];
  if (bank.length) return bank;
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
  // Next suffix to try per base name: each duplicate resumes where the
  // last one stopped, so n copies of one name cost O(n), not O(n²).
  const next = new Map<string, number>();
  for (const r of recs) {
    let n = r.name, i = next.get(r.name) ?? 2;
    while (seen.has(n)) n = `${r.name} (${i++})`;
    if (n !== r.name) next.set(r.name, i);
    r.name = n;
    seen.add(n);
  }
}
