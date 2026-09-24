/**
 * The resource map at the end of a 9003inc pack (.fsh/.acc/.med/.REZ…).
 *
 * The chunk directory that packChunks() walks is only half the format:
 * the u32 at offset 4 points at a little-endian port of a classic Mac
 * resource map, which names each chunk with a four-letter type and an
 * id. AquaZone reads everything by (type, id) — species tolerances are
 * `FsTI`, medicines `DrgI`, diseases `SicI` — so the simulation data
 * can only be found through this map.
 *
 * Layout (offsets from the map start `m = u32@4`):
 *   m+26 u16  name-list offset (from m)
 *   m+28 u16  type count - 1
 *   m+30      type entries, 8 bytes each:
 *             tag[4] stored byte-reversed ('IsTF' is FsTI),
 *             u16 ref count - 1, u16 ref-list offset (from m+30)
 *   refs      12 bytes each: u16 id, u16 name offset (0xFFFF: none;
 *             a Pascal string at m + nameList + offset),
 *             u32 data offset (low 24 bits, from 0x100) pointing at a
 *             u32 length and the payload.
 *
 * A few third-party packs wrote other entry sizes (a "Version 2.0"
 * 10-byte type entry, 78-byte refs). Their type counts still add up
 * to the chunk count in type order, so when refs don't land on chunk
 * boundaries types are assigned to chunks sequentially instead.
 */
import { packChunks } from "./fsh.js";

export interface PackResource {
  type: string;
  id: number;
  name: string | null;
  payload: Uint8Array;
}

const DATA_BASE = 0x100;

function u16(d: Uint8Array, o: number): number {
  return (d[o] ?? 0) | ((d[o + 1] ?? 0) << 8);
}
function u32(d: Uint8Array, o: number): number {
  return (u16(d, o) | (u16(d, o + 2) << 16)) >>> 0;
}

function tagAt(d: Uint8Array, o: number): string {
  return String.fromCharCode(d[o + 3]!, d[o + 2]!, d[o + 1]!, d[o]!);
}

function pascal(d: Uint8Array, o: number): string | null {
  const n = d[o];
  if (n === undefined || o + 1 + n > d.length) return null;
  let s = "";
  for (let i = 0; i < n; i++) s += String.fromCharCode(d[o + 1 + i]!);
  return s;
}

/**
 * Every resource in the pack, in map order. Returns [] for data with no
 * readable map; never throws.
 */
export function packResources(d: Uint8Array): PackResource[] {
  const m = u32(d, 4);
  if (m < DATA_BASE || m + 30 > d.length) return [];
  const nameList = m + u16(d, m + 26);
  const typeCount = u16(d, m + 28) + 1;
  if (m + 30 + typeCount * 8 > d.length) return [];

  const chunks = packChunks(d);
  const byPos = new Map(chunks.map((c) => [c.pos, c]));
  const types: { tag: string; count: number; refs: number }[] = [];
  for (let i = 0; i < typeCount; i++) {
    const e = m + 30 + i * 8;
    types.push({ tag: tagAt(d, e), count: u16(d, e + 4) + 1,
                 refs: m + 30 + u16(d, e + 6) });
  }

  const out: PackResource[] = [];
  let mapped = true;
  for (const t of types) {
    for (let j = 0; j < t.count && mapped; j++) {
      const r = t.refs + j * 12;
      if (r + 12 > d.length) { mapped = false; break; }
      const noff = u16(d, r + 2);
      const chunk = byPos.get(DATA_BASE + (u32(d, r + 4) & 0xffffff) + 4);
      if (!chunk) { mapped = false; break; }
      out.push({
        type: t.tag, id: u16(d, r),
        name: noff === 0xffff ? null : pascal(d, nameList + noff),
        payload: chunk.payload,
      });
    }
    if (!mapped) break;
  }
  if (mapped) return out;

  // Nonstandard map: fall back to type order when the counts add up.
  const total = types.reduce((a, t) => a + t.count, 0);
  if (total !== chunks.length) return [];
  const seq: PackResource[] = [];
  let k = 0;
  for (const t of types)
    for (let j = 0; j < t.count; j++)
      seq.push({ type: t.tag, id: -1, name: null, payload: chunks[k++]!.payload });
  return seq;
}

/** The pack's kind tag from its header (AqDr medicine, AqFd food, …),
 * or null when it carries none. */
export function packKind(d: Uint8Array): string | null {
  if (d.length < 0x14 || u32(d, 0x10) === 0) return null;
  return tagAt(d, 0x10);
}
