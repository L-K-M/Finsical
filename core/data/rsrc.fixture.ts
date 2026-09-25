/** Shared test builder for resource-map packs (see rsrc.ts). */

export interface Res { type: string; id: number; name?: string;
                       payload: number[] }

/** A pack with the given resources and a well-formed map. `refSize`
 * other than 12 imitates the third-party packs whose refs don't line
 * up with the standard layout. */
export function buildPack(
    res: Res[], opts: { kind?: string; refSize?: number } = {}):
    Uint8Array {
  const refSize = opts.refSize ?? 12;
  const bytes: number[] = new Array(0x100).fill(0);
  const put32 = (o: number, v: number) => {
    for (let i = 0; i < 4; i++) bytes[o + i] = (v >>> (8 * i)) & 0xff;
  };
  const put16 = (o: number, v: number) => {
    bytes[o] = v & 0xff; bytes[o + 1] = (v >> 8) & 0xff;
  };
  put32(0, 0x100);
  if (opts.kind)
    for (let i = 0; i < 4; i++) bytes[0x10 + i] = opts.kind.charCodeAt(3 - i);
  const offsets: number[] = [];
  for (const r of res) {
    offsets.push(bytes.length - 0x100);
    const len = bytes.length;
    bytes.length += 4;
    put32(len, r.payload.length);
    bytes.push(...r.payload);
  }
  const m = bytes.length;
  put32(4, m);
  const types = [...new Set(res.map((r) => r.type))];
  const typeList = m + 30;
  const refBase = typeList + types.length * 8;
  bytes.length = refBase + res.length * refSize;
  bytes.fill(0, m);
  put16(m + 28, types.length - 1);
  const names: number[] = [];
  let ref = refBase;
  types.forEach((t, ti) => {
    const mine = res.map((r, i) => ({ r, i })).filter((x) => x.r.type === t);
    const e = typeList + ti * 8;
    for (let i = 0; i < 4; i++) bytes[e + i] = t.charCodeAt(3 - i);
    put16(e + 4, mine.length - 1);
    put16(e + 6, ref - typeList);
    for (const { r, i } of mine) {
      put16(ref, r.id);
      if (r.name === undefined) put16(ref + 2, 0xffff);
      else {
        put16(ref + 2, names.length);
        names.push(r.name.length, ...[...r.name].map((c) => c.charCodeAt(0)));
      }
      put32(ref + 4, offsets[i]!);
      ref += refSize;
    }
  });
  put16(m + 26, bytes.length - m);
  bytes.push(...names);
  return Uint8Array.from(bytes);
}
