// SPDX-License-Identifier: LGPL-2.1-or-later
/**
 * MACE 3:1 mono decoder, ported from FFmpeg libavcodec/mace.c
 * (Copyright (c) 2002 Laszlo Torok, adapted by Francois Revol) like
 * tools/az/mace.py; see THIRD_PARTY_NOTICES.md. Kept apart from snd.ts
 * so the LGPL code and tables stay in one file.
 */

// MACEtab2 and MACEtab4: the same big-endian u16s as tools/az/mace_tab.bin
// (128x4) and tools/az/mace_tab4.bin (128x2), base64 so the tables ship
// inside the JS bundle rather than as fetchable assets.
const MACE_TAB2_B64 =
  "ACUAdADOAUoAJwB5ANgBWgApAH8A4QFpACoAhADrAXkALACJAPUBiAAuAJABAAGaADAAlgELAawAMwCdARgBwQA1AKUBJQHWADcArAEyAeoAOgCzAT8B/wA8ALsBTQIWAD8AwwFcAi0AQgDNAWwCRwBFANYBfAJhAEgA3wGMAnsASwDpAZ4ClwBPAPQBsQK2AFIA/gHFAtUAVgEJAdgC9ABaARYB7wMYAF4BIgIEAzoAYgEvAhoDXgBmATwCMgOFAGsBSwJMA64AcAFZAmYD1wB1AWkCgQQDAHoBeQKeBDIAfwGKAr0EYwCFAZsC3ASUAIsBrgL8BMgAkQHBAx8FAACYAdUDQwU5AJ8B6gNoBXUApgIAA48FswCtAhcDtwXzALUCLgPhBjYAvQJIBA4GfwDFAmIEPQbKAM4CfQRtBxcA1wKZBJ8HZwDhArcE1Qe8AOsC1gULCBQA9gL3BUUIcQEBAxgFgQjRAQwDPAXACTUBGANhBgIJnwElA4cGRgoMATIDsAaOCoABPwPaBtkK9wFOBAYHKAt1AV0ENAd6C/kBbARkB88MggF8BJYIKA0QAY4EywiGDaYBnwUBCOYOQQGyBTsJTA7jAcUFdgm2D44B2QW1CiYQQAHvBfYKmhD6AgUGOgsTEbwCHAaBC5EShQI0BswMFRNZAk0HGgygFDcCZwdqDS8VHQKDB8ANxxYPAp8IGA5jFwoCvQh0DwgYEQLdCNUPtBkmAv4JOhBnGkQDIAmjESIbcANEChIR5xyrA2kKhBKyHfADkAr9E4kfSAO4C3oUZyCsA+ML/hVRIiMEDwyHFkUjqQQ+DRYXRCVBBG4NqxhMJugEoQ5HGWEopATWDuoahCp1BQ0PlRuzLFsFRxBGHO8uVQWDEQAeOjBmBcIRwx+UMpIGBBKOIPw00gZJE2IidTcuBpAUPyP/OaQG3BUnJZo8NwcqFhknST7oB3wXFSkJQbYH0RgdKt9EpggrGTAsx0e0CIgaUC7GSucI6ht9MN5OQAlPHLczDFG+Cbod/zVUVWUKKR9VN7RZMgqdILw6MV0uCxYiMTzJYVYLlSO4P4BlrwwZJVFCVmo5DKQm+0VMbvcNNCi4SGRz6w3LKopLn3kYDmgsb07+fn4PDS5rUoV//w+5MH5WNX//EG0yp1oNf/8RKDTqXhJ//xHtN0diRX//Erk5v2aof/8TjzxSazx//xRvPwRwBn//FVhB03UFf/8WTETDej5//xdLR9V/s3//GFVLCn//f/8Za05jf/9//xqNUeN//3//G71Vi3//f/8c+llcf/9//x5FXVl//3//H59hhH//f/8hCGXef/9//yKBamp//3//JAxvKX//f/8lp3Qff/9//w==";
const MACE_TAB4_B64 =
  "AEAA2ABDAOIARgDsAEoA9gBNAQEAUAEMAFQBGABYASYAXAEzAGABQQBkAU4AaAFeAG0BbQByAX4AdwGPAHwBoACCAbIAiAHGAI4B2wCUAe8AmwIHAKICHQCpAjQAsAJOALkCaQDBAoQAyQKhANICvwDcAt8A5gL/APADIQD7A0YBBgNsARIDkgEeA7sBKwPlATgEEQFGBEEBVQRyAWQEpAF0BNkBhAURAZYFSgGoBYcBuwXGAc4GCAHjBk0B+QaUAg8G4AInBy4CQAeBAlkH1wJ0CDECkAiOAq4I8ALMCVUC7AnAAw0KLwMwCqQDVQseA3sLnQOiDCADzAyrA/gNPQQlDdMEVA5yBIYPFgS5D8ME8BB4BSgRMwVjEfcFoRLGBeETmwYkFHwGahVlBrMWWgcAF1oHUBhlB6MZegf7Gp0IVhvOCLUdDAkZHlcJgB+yCe0hHQpfIpYK1SQiC1ElvwvSJ24MWikyDOcrCA16LPQOFC70DrUxDA9dMz4QDDWHEMQ36xGDOmkSSz0FExw/vhP3QpYU20WPFclIqhbCS+kXxk9MGNZS1RnyVogbGlplHFBebR2TYqQe5WcMIEZrpSG3cHIjOHV4JMt6tSZvf/8oJn//KfF//yvQf/8txX//L9B//zHyf/80LH//NoF//zjwf/87en//PiJ//0Dnf/8=";

function tableRows(b64: string, ncols: number): number[][] {
  const bin = atob(b64);
  if (bin.length !== 128 * ncols * 2)
    throw new Error(
      `mace table: expected ${128 * ncols * 2} bytes, got ${bin.length}`);
  const rows: number[][] = [];
  for (let i = 0; i < 128; i++) {
    const row: number[] = [];
    for (let j = 0; j < ncols; j++)
      row.push((bin.charCodeAt((i * ncols + j) * 2) << 8) |
               bin.charCodeAt((i * ncols + j) * 2 + 1));
    rows.push(row);
  }
  return rows;
}

const MACE_TAB1 = [-13, 8, 76, 222, 222, 76, 8, -13];
const MACE_TAB2 = tableRows(MACE_TAB2_B64, 4);
const MACE_TAB3 = [-18, 140, 140, -18];
const MACE_TAB4 = tableRows(MACE_TAB4_B64, 2);

// FFmpeg's tabs[]: index step table, coefficient rows and stride for the
// three codes of each byte, low bits first. The middle code is 2 bits
// wide and uses its own pair of tables.
const TABS: readonly { tab1: number[]; tab2: number[][]; stride: number }[] = [
  { tab1: MACE_TAB1, tab2: MACE_TAB2, stride: 4 },
  { tab1: MACE_TAB3, tab2: MACE_TAB4, stride: 2 },
  { tab1: MACE_TAB1, tab2: MACE_TAB2, stride: 4 },
];

// Wrap to int16_t, as FFmpeg's ChannelData fields do.
const wrap16 = (n: number): number => (n << 16) >> 16;
// FFmpeg's mace_broken_clip_int16 quirk; asymmetry is reference behavior.
const clip16 = (n: number): number =>
  n > 32767 ? 32767 : (n < -32768 ? -32767 : n);
// FFmpeg's QT_8S_2_16S.
const toS16 = (cur: number): number =>
  ((cur & 0xFF00) | ((cur >> 8) & 0xFF)) - (cur & 0x8000 ? 0x10000 : 0);

/** MACE 3:1 mono -> s16-LE bytes (6 samples per 2-byte packet). */
export function mace3Decode(data: Uint8Array, npackets: number): Uint8Array {
  if (data.length < npackets * 2)
    throw new Error(
      `MACE3: need ${npackets} packets (${npackets * 2} bytes), ` +
      `got ${data.length}`);
  let index = 0, level = 0;
  const out = new Uint8Array(npackets * 6 * 2);
  let o = 0;
  for (let j = 0; j < npackets; j++) {
    for (let k = 0; k < 2; k++) {
      const pkt = data[j * 2 + k]!;
      const vals = [pkt & 7, (pkt >> 3) & 3, pkt >> 5];
      for (let l = 0; l < 3; l++) {
        const { tab1, tab2, stride } = TABS[l]!;
        const val = vals[l]!;
        const row = tab2[(index & 0x7F0) >> 4]!;
        let cur = val < stride ? row[val]! : -1 - row[2 * stride - val - 1]!;
        index = wrap16(index + tab1[val]! - (index >> 5));
        if (index < 0) index = 0;
        cur = clip16(cur + level);
        level = cur - (cur >> 3);
        const s = toS16(cur);
        out[o++] = s & 0xFF;
        out[o++] = (s >> 8) & 0xFF;
      }
    }
  }
  return out;
}
