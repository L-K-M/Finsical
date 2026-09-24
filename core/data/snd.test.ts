import { describe, expect, it } from "vitest";
import { ownBytes } from "./bytes.js";
import { fileSoundRecords, hasSounds, mace3Decode, parseSnd,
         qualifySoundNames, soundsFromRsrc, unwrapContainer, wavBytes }
  from "./snd.js";

const sha256 = async (d: Uint8Array): Promise<string> =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", ownBytes(d)))]
    .map((b) => b.toString(16).padStart(2, "0")).join("");

// --- fixtures (mirror tools/tests) -----------------------------------

function sndFmt1U8(pcm: Uint8Array, rate = 22254.5454): Uint8Array {
  const hdr = new Uint8Array(22);
  const v = new DataView(hdr.buffer);
  v.setUint32(4, pcm.length);             // stdSH length
  v.setUint32(8, Math.round(rate * 65536));
  v.setUint8(20, 0); v.setUint8(21, 60);  // encode, baseFrequency
  const head = new Uint8Array(16 + 4);    // fmt1 head w/ pad
  const hv = new DataView(head.buffer);
  hv.setUint16(0, 1); hv.setUint16(2, 1); // fmt, numDataTypes
  hv.setUint32(4, 5); hv.setUint16(8, 0xA0); // data-type entry (6B)
  hv.setUint16(10, 1);                    // ncmds
  hv.setUint16(12, 0x8050); hv.setUint16(14, 0);
  hv.setUint32(16, 20);                   // bufferCmd -> hoff
  const out = new Uint8Array(head.length + hdr.length + pcm.length);
  out.set(head); out.set(hdr, head.length); out.set(pcm, head.length + hdr.length);
  return out;
}

function sndFmt2U8(pcm: Uint8Array, rate = 11127.2727): Uint8Array {
  const hdr = new Uint8Array(22);
  const v = new DataView(hdr.buffer);
  v.setUint32(4, 1);                      // fmt2: channels at +4
  v.setUint32(8, Math.round(rate * 65536));
  v.setUint8(20, 0); v.setUint8(21, 60);
  const body = new Uint8Array(14);
  const bv = new DataView(body.buffer);
  bv.setUint16(0, 2); bv.setUint16(4, 1);
  bv.setUint16(6, 0x8050); bv.setUint32(10, 14);
  const out = new Uint8Array(body.length + hdr.length + pcm.length);
  out.set(body); out.set(hdr, body.length); out.set(pcm, body.length + hdr.length);
  return out;
}

function sndFmt2Extsh(pcm: Uint8Array, nframes = pcm.length,
                      rate = 11127.2727, size = 8): Uint8Array {
  const hdr = new Uint8Array(64);
  const v = new DataView(hdr.buffer);
  v.setUint32(4, 1);                      // numChannels
  v.setUint32(8, Math.round(rate * 65536));
  v.setUint8(20, 0xFF); v.setUint8(21, 60);
  v.setUint32(22, nframes);
  v.setUint16(48, size);
  const body = new Uint8Array(14);
  const bv = new DataView(body.buffer);
  bv.setUint16(0, 2); bv.setUint16(4, 1);
  bv.setUint16(6, 0x8050); bv.setUint32(10, 14);
  const out = new Uint8Array(body.length + hdr.length + pcm.length);
  out.set(body); out.set(hdr, body.length); out.set(pcm, body.length + hdr.length);
  return out;
}

function sndFmt1Mace(frames: Uint8Array, nframes: number,
                     rate = 22254.5454, comp = 3): Uint8Array {
  const hdr = new Uint8Array(64);
  const v = new DataView(hdr.buffer);
  v.setUint32(4, 1);
  v.setUint32(8, Math.round(rate * 65536));
  v.setUint8(20, 0xFE); v.setUint8(21, 60);
  v.setUint32(22, nframes);
  v.setUint8(26, 0x40); v.setUint8(27, 0x0C); v.setUint8(28, 0xAD);
  v.setUint8(29, 0xDD); v.setUint8(30, 0x17); v.setUint8(31, 0x3E);
  v.setUint8(32, 0xAB); v.setUint8(33, 0x36); v.setUint8(34, 0x7A);
  v.setUint8(35, 0x0F);
  v.setInt16(56, comp);                   // compID
  const head = new Uint8Array(20);
  const hv = new DataView(head.buffer);
  hv.setUint16(0, 1); hv.setUint16(2, 1); // fmt, numDataTypes
  hv.setUint32(4, 5); hv.setUint16(8, 0x3A0); // data-type entry (6B)
  hv.setUint16(10, 1);                    // ncmds
  hv.setUint16(12, 0x8051); hv.setUint16(14, 0);
  hv.setUint32(16, 20);                   // bufferCmd -> hoff
  const out = new Uint8Array(head.length + hdr.length + frames.length);
  out.set(head); out.set(hdr, head.length); out.set(frames, head.length + hdr.length);
  return out;
}

/** Minimal resource fork builder: {type: [[id, name|null, attr, data]]}. */
function buildRsrc(types: Map<string, [number, string | null, number, Uint8Array][]>): Uint8Array {
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

const wrapAppledouble = (rsrc: Uint8Array): Uint8Array => {
  const out = new Uint8Array(26 + 12 + rsrc.length);
  const v = new DataView(out.buffer);
  v.setUint32(0, 0x00051607); v.setUint32(4, 0x00020000);
  v.setUint16(24, 1);
  v.setUint32(26, 2); v.setUint32(30, 38); v.setUint32(34, rsrc.length);
  out.set(rsrc, 38);
  return out;
};

const wrapMacbinary = (rsrc: Uint8Array, data = new Uint8Array(0),
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

const wrapBinhex = (rsrc: Uint8Array, data = new Uint8Array(0),
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

// --- tests ------------------------------------------------------------

describe("parseSnd", () => {
  it("decodes fmt1 u8", () => {
    const pcm = Uint8Array.from({ length: 200 }, (_, i) => i);
    const r = parseSnd(sndFmt1U8(pcm));
    expect([...r.pcm]).toEqual([...pcm]);
    expect(r.width).toBe(1);
    expect(r.rateHz).toBe(22254);
  });

  it("decodes fmt2 u8", () => {
    const pcm = Uint8Array.from({ length: 64 }, (_, i) => i);
    const r = parseSnd(sndFmt2U8(pcm));
    expect([...r.pcm]).toEqual([...pcm]);
    expect(r.rateHz).toBe(11127);
  });

  it("decodes extsh u8", () => {
    const pcm = Uint8Array.from({ length: 200 }, (_, i) => i);
    const r = parseSnd(sndFmt2Extsh(pcm));
    expect([...r.pcm]).toEqual([...pcm]);
    expect(r.width).toBe(1);
    expect(r.rateHz).toBe(11127);
  });

  it("byteswaps extsh s16", () => {
    const be = Uint8Array.from([0x12, 0x34, 0xFF, 0x00, 0x80, 0x00,
                                0x7F, 0xFF]);
    const r = parseSnd(sndFmt2Extsh(be, be.length / 2, 11127, 16));
    expect(r.width).toBe(2);
    expect([...r.pcm]).toEqual([0x34, 0x12, 0x00, 0xFF, 0x00, 0x80,
                               0xFF, 0x7F]);
  });

  it("rejects truncated extsh data", () => {
    expect(() => parseSnd(sndFmt2Extsh(Uint8Array.from([0x80, 0x80]), 4)))
      .toThrow(/truncated/);
  });

  it("rejects unknown encode", () => {
    const blob = sndFmt2U8(new Uint8Array(8).fill(0x80));
    blob[14 + 20] = 0x42;
    expect(() => parseSnd(blob)).toThrow(/unsupported encode/);
  });

  it("rejects bad format", () => {
    const blob = sndFmt2U8(new Uint8Array(8).fill(0x80));
    blob[0] = 0; blob[1] = 7;
    expect(() => parseSnd(blob)).toThrow(/unsupported snd format/);
  });

  it("rejects too-short blobs with SndError, not RangeError", () => {
    expect(() => parseSnd(Uint8Array.of(0, 1))).toThrow(/too short/);
    expect(() => parseSnd(Uint8Array.of(0, 1, 0))).toThrow(/too short/);
  });

  it("rejects overlong command lists with SndError, not RangeError", () => {
    const blob = sndFmt2U8(new Uint8Array(8).fill(0x80));
    blob[4] = 0xFF; blob[5] = 0xFF; // ncmds = 65535
    expect(() => parseSnd(blob)).toThrow(/truncated command list/);
    const tiny = sndFmt1U8(new Uint8Array(4));
    tiny[2] = 0xFF; tiny[3] = 0xFF; // numDataTypes pushes p past EOF
    expect(() => parseSnd(tiny)).toThrow(/truncated snd header/);
  });

  it("decodes a cmpSH (0xFE) MACE 3:1 resource", async () => {
    // Same fixture and hash as tools/tests/test_snd.py.
    const r = parseSnd(sndFmt1Mace(new Uint8Array(20).fill(0x24), 10));
    expect(r.width).toBe(2);
    expect(r.rateHz).toBe(22254);
    expect(r.pcm).toHaveLength(10 * 6 * 2);
    expect(await sha256(r.pcm))
      .toBe("0e7832566fa0a88c9a6fc29b927df72d93d3ce0f72d5c4a9af808b60b1bfa398");
  });
});

describe("mace3Decode", () => {
  // 0x39 0xF1 repeated: the golden-vector input of tools/tests/test_snd.py.
  const repeat39F1 = (npackets: number): Uint8Array => {
    const data = new Uint8Array(npackets * 2).fill(0x39);
    for (let i = 0; i < data.length; i += 2) data[i + 1] = 0xF1;
    return data;
  };

  // Same generator as lcg_bytes in tools/tests/test_snd.py.
  const lcgBytes = (n: number, seed = 1): Uint8Array => {
    const out = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      seed = (Math.imul(seed, 1103515245) + 12345) & 0x7FFFFFFF;
      out[i] = (seed >> 16) & 0xFF;
    }
    return out;
  };

  const mean = (pcm: Uint8Array): number => {
    const v = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
    let sum = 0;
    for (let i = 0; i < pcm.length; i += 2) sum += v.getInt16(i, true);
    return sum / (pcm.length / 2);
  };

  it("pins the FFmpeg decode with a golden hash", async () => {
    // Hash from a line-by-line port of FFmpeg's mace.c with its
    // per-position tables; same vector as tools/tests/test_snd.py.
    const out = mace3Decode(repeat39F1(100), 100);
    expect(await sha256(out))
      .toBe("b0a200e1b12b8b030724fd034cfb19c104e8131fbb3c7429d0bc337707cb9a5f");
  });

  it("matches the Python decoder on a pseudo-random stream", async () => {
    const out = mace3Decode(lcgBytes(2000), 1000);
    expect(await sha256(out))
      .toBe("c56379769c0e49253d408696f7b47b76040cefd65cd0409837e843ef8dc763b0");
  });

  it("has no DC drift", () => {
    // The middle 2-bit code must use MACEtab3/4, which can go negative;
    // with the 3-bit tables the level rails near +32767.
    expect(Math.abs(mean(mace3Decode(repeat39F1(2000), 2000))))
      .toBeLessThan(2000);
  });

  it("rejects truncated packet data", () => {
    expect(() => mace3Decode(new Uint8Array(10), 10)).toThrow(/MACE3/);
  });
});

describe("wavBytes", () => {
  it("wraps pcm in a canonical PCM WAV header", () => {
    const pcm = Uint8Array.from({ length: 100 }, (_, i) => i);
    const w = wavBytes({ rateHz: 22254, pcm, width: 1 });
    const v = new DataView(w.buffer);
    expect(w).toHaveLength(44 + 100);
    expect(String.fromCharCode(...w.subarray(0, 4))).toBe("RIFF");
    expect(v.getUint32(4, true)).toBe(36 + 100);
    expect(String.fromCharCode(...w.subarray(8, 12))).toBe("WAVE");
    expect(v.getUint16(20, true)).toBe(1);      // PCM
    expect(v.getUint16(22, true)).toBe(1);      // mono
    expect(v.getUint32(24, true)).toBe(22254);  // sample rate
    expect(v.getUint32(28, true)).toBe(22254);  // byte rate (u8 mono)
    expect(v.getUint16(34, true)).toBe(8);      // bits
    expect(String.fromCharCode(...w.subarray(36, 40))).toBe("data");
    expect(v.getUint32(40, true)).toBe(100);
    expect([...w.subarray(44)]).toEqual([...pcm]);
  });

  it("scales byte rate and block align for s16", () => {
    const w = wavBytes({ rateHz: 11127,
                         pcm: new Uint8Array(40), width: 2 });
    const v = new DataView(w.buffer);
    expect(v.getUint32(28, true)).toBe(11127 * 2);
    expect(v.getUint16(32, true)).toBe(2);
    expect(v.getUint16(34, true)).toBe(16);
  });

  it("matches tools/az/snd.py WAV output byte-for-byte", async () => {
    // Cross-implementation pin: this exact fixture run through
    // snd_to_wav hashes to the value below — the Python side asserts
    // the same digest in tools/tests/test_snd.py.
    const blob = sndFmt1U8(Uint8Array.from({ length: 32 }, (_, i) => i));
    const w = wavBytes(parseSnd(blob));
    expect(await sha256(w)).toBe(
      "01ddc79b9d927f99301a6861d7840c14813b127ad37feebe0bcc6f59eb7de008");
  });
});

describe("soundsFromRsrc", () => {
  const snd = sndFmt1U8(new Uint8Array(32).fill(0x80));

  it("decodes a named resource from a bare fork", () => {
    const fork = buildRsrc(new Map([["snd ", [[7, "Drop", 0, snd]]]]));
    const out = soundsFromRsrc(fork);
    expect(out).toHaveLength(1);
    expect(out[0]!.name).toBe("Drop");
    expect(out[0]!.width).toBe(1);
    expect(out[0]!.pcm).toHaveLength(32);
  });

  it("unwraps appledouble, macbinary and binhex", () => {
    const fork = buildRsrc(new Map([["snd ", [[7, "aqua", 0, snd]]]]));
    for (const wrap of [wrapAppledouble, wrapMacbinary,
                        (r: Uint8Array) => wrapBinhex(r)]) {
      const out = soundsFromRsrc(wrap(fork));
      expect(out).toHaveLength(1);
      expect(out[0]!.name).toBe("aqua");
    }
  });

  it("peels nested containers", () => {
    const fork = buildRsrc(new Map([["snd ", [[9, "SIDE", 0, snd]]]]));
    const nested = wrapBinhex(wrapMacbinary(wrapAppledouble(fork)));
    expect(unwrapContainer(nested)).toEqual(fork);
    expect(soundsFromRsrc(nested)[0]!.name).toBe("SIDE");
  });

  it("skips undecodable resources", () => {
    const good = sndFmt1U8(new Uint8Array(8).fill(0x80));
    const bad = Uint8Array.from([0, 99, ...new Array(20).fill(0)]);
    const fork = buildRsrc(new Map([["snd ", [[1, "ok", 0, good],
                                              [2, "bad", 0, bad]]]]));
    const out = soundsFromRsrc(fork);
    expect(out).toHaveLength(1);
    expect(out[0]!.name).toBe("ok");
  });

  it("names unnamed resources by id", () => {
    const fork = buildRsrc(new Map([["snd ", [[0x1234, null, 0, snd]]]]));
    expect(soundsFromRsrc(fork)[0]!.name).toBe("snd_4660");
  });

  it("treats corrupt negative name offsets as nameless", () => {
    // nameOffset 0x8000 must decode nameless — not index before the
    // name list and throw RangeError out of the whole fork's walk.
    const fork = buildRsrc(new Map([["snd ", [[1, "tap", 0, snd]]]]));
    const dv = new DataView(fork.buffer, fork.byteOffset, fork.byteLength);
    const noffPos = dv.getUint32(4) + 28 + 2 + 8 + 2; // ref entry + noff
    dv.setInt16(noffPos, -32768);
    const out = soundsFromRsrc(fork);
    expect(out).toHaveLength(1);
    expect(out[0]!.name).toBe("snd_1");
  });

  it("hasSounds gates on 'snd ' presence", () => {
    expect(hasSounds(buildRsrc(new Map([["snd ", [[1, null, 0, snd]]]]))))
      .toBe(true);
    expect(hasSounds(buildRsrc(new Map([["PICT", [[1, null, 0, snd]]]]))))
      .toBe(false);
    expect(hasSounds(new Uint8Array([1, 2, 3]))).toBe(false);
  });

  it("rejects truncated binhex headers without throwing", () => {
    // A long name pushes the header tail past what a truncated stream
    // decoded — bounds-guarded, not an index crash.
    const fork = buildRsrc(new Map([["snd ", [[1, "x", 0, snd]]]]));
    const hqx = wrapBinhex(fork, new Uint8Array(0), "x".repeat(30));
    const cut = hqx.subarray(0, 60);
    expect(() => unwrapContainer(cut)).not.toThrow();
    expect(unwrapContainer(cut)).toEqual(cut);
  });
});

describe("fileSoundRecords", () => {
  it("reads a fork whose data starts at 64 KB, which looks like a pack",
     () => {
    // Bytes 00 01 00 00 up front read as a 9003 pack's 0x100.
    const fork = buildRsrc(new Map([["snd ", [[7, "Drop", 0,
      sndFmt1U8(new Uint8Array(32).fill(0x80))]]]]));
    const v = new DataView(fork.buffer);
    const dataLen = v.getUint32(8), mapLen = v.getUint32(12);
    const moved = new Uint8Array(0x10000 + dataLen + mapLen);
    const mv = new DataView(moved.buffer);
    mv.setUint32(0, 0x10000); mv.setUint32(4, 0x10000 + dataLen);
    mv.setUint32(8, dataLen); mv.setUint32(12, mapLen);
    moved.set(fork.subarray(256, 256 + dataLen), 0x10000);
    moved.set(fork.subarray(256 + dataLen), 0x10000 + dataLen);
    expect(fileSoundRecords("AQUAZONE.rsrc", moved).map((r) => r.name))
      .toEqual(["Drop"]);
  });

  const pcm = new Uint8Array(64).fill(0x80);
  const snd = sndFmt1U8(pcm);
  const fork = buildRsrc(new Map([["snd ", [[1, "tap", 0, snd]]]]));

  it("passes audio files through under their stem name", () => {
    const mp3 = new Uint8Array([0xFF, 0xFB, 0x92, 0x44]);
    expect(fileSoundRecords("Macinfish.mp3", mp3))
      .toEqual([{ name: "Macinfish", wav: mp3 }]);
    expect(fileSoundRecords("bloop.WAV", pcm)[0]!.name).toBe("bloop");
  });

  it("decodes resource forks to WAV records", () => {
    const recs = fileSoundRecords("AQUAZONE.rsrc", fork);
    expect(recs).toHaveLength(1);
    expect(recs[0]!.name).toBe("tap");
    expect(recs[0]!.wav.slice(0, 4))
      .toEqual(new Uint8Array([0x52, 0x49, 0x46, 0x46])); // "RIFF"
  });

  it("routes ._ AppleDouble companions to the fork path", () => {
    // A Finder zip's ._song.mp3 isn't audio — it mustn't pass through
    // as an undecodable record.
    expect(fileSoundRecords("._song.mp3", new Uint8Array([1, 2, 3])))
      .toEqual([]);
  });

  it("returns [] for files that carry no sound", () => {
    expect(fileSoundRecords("notes.txt", new Uint8Array([1, 2, 3])))
      .toEqual([]);
    // A pack file is not a fork — returns nothing rather than throwing.
    expect(fileSoundRecords("fish.fsh", new Uint8Array(300)))
      .toEqual([]);
  });
});

describe("qualifySoundNames", () => {
  const rec = (name: string) => ({ name, wav: new Uint8Array(4) });

  it("qualifies same-stem records in one batch", () => {
    // Records key by name in the bank and store — an unqualified
    // duplicate would silently overwrite.
    const recs = [rec("a"), rec("a"), rec("b"), rec("a")];
    qualifySoundNames(recs);
    expect(recs.map((r) => r.name))
      .toEqual(["a", "a (2)", "b", "a (3)"]);
  });

  it("leaves unique names alone", () => {
    const recs = [rec("x"), rec("y")];
    qualifySoundNames(recs);
    expect(recs.map((r) => r.name)).toEqual(["x", "y"]);
  });
});
