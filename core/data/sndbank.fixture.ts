// Test fixtures: synthesized sound banks, since the repo ships no game
// data. Shared by core/data/sndbank.test.ts and web/import-bank.test.ts.

/** A minimal RIFF/WAVE body: the bank stores these verbatim. */
export function wav(tag: number): Uint8Array {
  const b = new Uint8Array(16);
  b.set([0x52, 0x49, 0x46, 0x46], 0);     // RIFF
  b.set([0x57, 0x41, 0x56, 0x45], 8);     // WAVE
  b[15] = tag;
  return b;
}

export interface Res { id: number; body: Uint8Array; name?: string }

/** A 9003 pack laid out like System/AZ_WAVES.REZ: length-prefixed
 * payloads from 0x100, then the little-endian resource map. */
export function buildBank(types: { tag: string; res: Res[] }[]): Uint8Array {
  const data: number[] = [];
  const offs = new Map<Res, number>();
  for (const t of types)
    for (const r of t.res) {
      offs.set(r, data.length);
      const n = r.body.length;
      data.push(n & 0xff, n >> 8 & 0xff, n >> 16 & 0xff, n >>> 24);
      data.push(...r.body);
    }
  const names: number[] = [];
  const nameOff = new Map<Res, number>();
  for (const t of types)
    for (const r of t.res)
      if (r.name !== undefined) {
        nameOff.set(r, names.length);
        names.push(r.name.length, ...[...r.name].map((c) => c.charCodeAt(0)));
      }
  const nres = types.reduce((n, t) => n + t.res.length, 0);
  const typeList = 30, typesLen = types.length * 8;
  const mapLen = typeList + typesLen + nres * 12 + names.length;
  const mapOff = 0x100 + data.length;
  const out = new Uint8Array(mapOff + mapLen);
  const v = new DataView(out.buffer);
  const header = [0x100, mapOff, data.length, mapLen];
  header.forEach((x, i) => v.setUint32(i * 4, x, true));
  out.set(data, 0x100);
  header.forEach((x, i) => v.setUint32(mapOff + i * 4, x, true));
  v.setUint16(mapOff + 24, typeList, true);
  v.setUint16(mapOff + 26, typeList + typesLen + nres * 12, true);
  v.setUint16(mapOff + 28, types.length - 1, true);
  let ref = typesLen;
  types.forEach((t, i) => {
    const e = mapOff + typeList + i * 8;
    out.set([...t.tag].reverse().map((c) => c.charCodeAt(0)), e);
    v.setUint16(e + 4, t.res.length - 1, true);
    v.setUint16(e + 6, ref, true);
    t.res.forEach((r, j) => {
      const p = mapOff + typeList + ref + j * 12;
      v.setInt16(p, r.id, true);
      v.setInt16(p + 2, nameOff.get(r) ?? -1, true);
      v.setUint32(p + 4, offs.get(r)!, true);
    });
    ref += t.res.length * 12;
  });
  out.set(names, mapOff + typeList + typesLen + nres * 12);
  return out;
}
