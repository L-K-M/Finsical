/**
 * Minimal ZIP reader — enough for archive.org add-on packs, which are
 * single-file zips (one .fsh/.grv inside). Handles the central directory
 * and stored/deflated entries; no multi-disk, encryption, or ZIP64.
 * Environment-agnostic: deflate goes through DecompressionStream, which
 * exists in both node >= 18 and WebKit.
 */

export interface ZipEntry {
  name: string;
  /** compression method: 0 = stored, 8 = deflated. */
  method: number;
  csize: number;
  usize: number;
  /** offset of this entry's local file header. */
  lhOff: number;
}

const EOCD = 0x06054b50, CDIR = 0x02014b50, LFH = 0x04034b50;
const EOCD_LEN = 22, MAX_EOCD_SCAN = 65536 + EOCD_LEN;

function u16(v: DataView, o: number): number { return v.getUint16(o, true); }
function u32(v: DataView, o: number): number { return v.getUint32(o, true); }

/** Parse the central directory. Throws on missing/invalid EOCD. */
export function zipEntries(d: Uint8Array): ZipEntry[] {
  const v = new DataView(d.buffer, d.byteOffset, d.byteLength);
  let eocd = -1;
  for (let i = d.length - EOCD_LEN; i >= Math.max(0, d.length - MAX_EOCD_SCAN); i--) {
    if (u32(v, i) === EOCD) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("zip: no end-of-central-directory record");
  if (u16(v, eocd + 4) !== 0 || u16(v, eocd + 6) !== 0)
    throw new Error("zip: multi-disk archives unsupported");
  const count = u16(v, eocd + 10);
  const cdOff = u32(v, eocd + 16);
  const out: ZipEntry[] = [];
  const dec = new TextDecoder();
  let p = cdOff;
  for (let i = 0; i < count; i++) {
    if (p + 46 > d.length || u32(v, p) !== CDIR)
      throw new Error("zip: truncated central directory");
    if (u16(v, p + 8) & 1)
      throw new Error("zip: encrypted entries unsupported");
    const nlen = u16(v, p + 28), elen = u16(v, p + 30), clen = u16(v, p + 32);
    if (p + 46 + nlen + elen + clen > eocd)
      throw new Error("zip: truncated central directory");
    out.push({
      name: dec.decode(d.subarray(p + 46, p + 46 + nlen)),
      method: u16(v, p + 10),
      csize: u32(v, p + 20),
      usize: u32(v, p + 24),
      lhOff: u32(v, p + 42),
    });
    p += 46 + nlen + elen + clen;
  }
  return out;
}

const MAX_ENTRY = 1 << 27; // 128MB — remote input, cap inflate expansion

/** Extract one entry. Returns the decompressed bytes. */
export async function zipRead(d: Uint8Array, e: ZipEntry, maxBytes = MAX_ENTRY): Promise<Uint8Array> {
  const v = new DataView(d.buffer, d.byteOffset, d.byteLength);
  if (e.lhOff + 30 > d.length || u32(v, e.lhOff) !== LFH)
    throw new Error(`zip ${e.name}: bad local header`);
  const nlen = u16(v, e.lhOff + 26), elen = u16(v, e.lhOff + 28);
  const data = d.subarray(e.lhOff + 30 + nlen + elen,
                          e.lhOff + 30 + nlen + elen + e.csize);
  if (data.length !== e.csize)
    throw new Error(`zip ${e.name}: truncated entry data`);
  if (e.method === 0) return new Uint8Array(data);
  if (e.method !== 8)
    throw new Error(`zip ${e.name}: unsupported method ${e.method}`);
  if (e.usize > maxBytes)
    throw new Error(`zip ${e.name}: entry too large (${e.usize} bytes)`);
  const ds = new DecompressionStream("deflate-raw");
  const stream = new Blob([data]).stream().pipeThrough(ds);
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error(`zip ${e.name}: inflate exceeded ${maxBytes} bytes`);
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.byteLength; }
  if (out.length !== e.usize)
    throw new Error(`zip ${e.name}: expected ${e.usize} bytes, got ${out.length}`);
  return out;
}
