/**
 * InstallShield 3 archives: the data.z cabinets (signature 13 5D 65 8C)
 * the AquaZone US discs keep their Windows items in, and the PKWARE DCL
 * Implode compression their members use. The TypeScript twin of
 * tools/az/is3.py, which says more about the layout.
 *
 * Input is untrusted: every read is bounds-checked, a member's size is
 * capped before anything is allocated, and failures throw Is3Error
 * only.
 */

/** Why an archive or a member didn't read: the only error thrown. */
export class Is3Error extends Error {}

export interface Is3Member {
  /** "dir/name", the directory table's name before the file's. */
  path: string;
  size: number;
  packed: number;
  offset: number;
  /** Stored as it is, not imploded. */
  stored: boolean;
}

const SIGNATURE = [0x13, 0x5d, 0x65, 0x8c];
// Header offsets: the file count, the directory table's offset and
// count, and the file table's offset.
const H_FILES = 12, H_DIRPOS = 41, H_DIRS = 49, H_FILEPOS = 51;
const HEADER = 55;
/** A file entry: the fields before its name. */
const ENTRY = 30;
/** Attribute bit for a member stored as it is, not imploded. */
const STORED = 0x10;
/** Largest member read: the cabinets' biggest is 1.2 MB, and a crafted
 * size must not ask for gigabytes. */
export const MAX_MEMBER_BYTES = 64 << 20;

export const isIs3 = (d: Uint8Array): boolean =>
  SIGNATURE.every((b, i) => d[i] === b);

function u16(d: Uint8Array, o: number): number {
  if (o + 2 > d.length) throw new Is3Error("archive is truncated");
  return d[o]! | d[o + 1]! << 8;
}
function u32(d: Uint8Array, o: number): number {
  return (u16(d, o) | u16(d, o + 2) << 16) >>> 0;
}
const cp1252 = new TextDecoder("windows-1252");
function text(d: Uint8Array, o: number, n: number): string {
  if (o + n > d.length) throw new Is3Error("archive is truncated");
  return cp1252.decode(d.subarray(o, o + n));
}

/** The archive's files, in table order. */
export function is3Members(d: Uint8Array): Is3Member[] {
  if (!isIs3(d) || d.length < HEADER)
    throw new Is3Error("not an InstallShield 3 archive");
  const nfiles = u16(d, H_FILES), ndirs = u16(d, H_DIRS);
  const dirs: string[] = [];
  let p = u32(d, H_DIRPOS);
  for (let i = 0; i < ndirs; i++) {
    const seg = u16(d, p + 2), n = u16(d, p + 4);
    if (seg < 6 + n) throw new Is3Error("bad directory entry");
    dirs.push(text(d, p + 6, n));
    p += seg;
  }
  const out: Is3Member[] = [];
  p = u32(d, H_FILEPOS);
  for (let i = 0; i < nfiles; i++) {
    if (p + ENTRY > d.length) throw new Is3Error("archive is truncated");
    const di = u16(d, p + 1), size = u32(d, p + 3), packed = u32(d, p + 7);
    const offset = u32(d, p + 11), seg = u16(d, p + 23);
    const attr = d[p + 25]!, split = d[p + 26]!, n = d[p + 29]!;
    if (seg < ENTRY + n) throw new Is3Error("bad file entry");
    const dir = dirs[di];
    if (dir === undefined)
      throw new Is3Error("file entry names a missing directory");
    if (split) throw new Is3Error("member is split across volumes");
    if (offset + packed > d.length)
      throw new Is3Error("member data runs past the end");
    const name = text(d, p + ENTRY, n);
    out.push({ path: dir ? `${dir}/${name}` : name, size, packed, offset,
               stored: (attr & STORED) !== 0 });
    p += seg;
  }
  return out;
}

/** A member's bytes, exploded unless it is stored. */
export function readIs3Member(d: Uint8Array, m: Is3Member): Uint8Array {
  if (m.size > MAX_MEMBER_BYTES)
    throw new Is3Error(`${m.path}: ${m.size} bytes is over the cap`);
  const data = d.subarray(m.offset, m.offset + m.packed);
  if (!m.stored) return explode(data, m.size);
  if (data.length !== m.size)
    throw new Is3Error(`${m.path}: stored size doesn't match`);
  return data.slice();
}

// ---- PKWARE DCL Implode ---------------------------------------------
//
// As zlib's contrib/blast documents the format: a byte saying whether
// literals are coded (1) or raw (0), a byte giving the distance's low
// bits (4 to 6), then tokens, read a bit at a time from each byte's low
// bit up. A 0 bit starts a literal, a 1 a match: a length, then a
// distance back into what came out. Length 519 ends the stream. The
// three codes are fixed canonical Huffman codes, sent with every bit
// inverted, most significant first; their code lengths are as deark's
// fmtutil-lzh.c (MIT) packs them, two to a byte, high nibble first.

const hex = (s: string): Uint8Array =>
  Uint8Array.from(s.match(/../g)!, (h) => parseInt(h, 16));
const LIT_LENGTHS = hex(
  "bcccccccc87cc7ccccccccccccdccccc4a8caca87789767876777787788cb79b" +
  "c676657886b967667b66679899b8b9c8c566656665b756556a55558788abbccc" +
  "ddddddddddddddddddddddddddddddddddddddddddddddddcccccccccccccccc" +
  "ccccccccccccccccccccccccccccccccdcdddcdddcddddcdddcccddddddddddd");
const LEN_LENGTHS = hex("2333444555566677");
const DIST_LENGTHS = hex(
  "2445555666666666666666777777777777777777777777778888888888888888");
/** Match lengths by length code: a base, and the extra bits after it. */
const LEN_BASE = [3, 2, 4, 5, 6, 7, 8, 9, 10, 12, 16, 24, 40, 72, 136, 264];
const LEN_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8];
const END = 519;

const nibbles = (packed: Uint8Array, n: number): number[] =>
  Array.from({ length: n }, (_, i) =>
    i % 2 ? packed[i >> 1]! & 15 : packed[i >> 1]! >> 4);

/** The next `width` bits of the stream, in reading order from bit 0,
 * index `table`: a symbol << 4 | its code's length, or 0 where no code
 * starts. Codes are canonical: shorter first, by symbol within a
 * length. */
interface Decoder { width: number; table: Uint16Array }

function decoder(lengths: number[]): Decoder {
  const width = Math.max(...lengths);
  const table = new Uint16Array(1 << width);
  let code = 0;
  for (let length = 1; length <= width; length++) {
    lengths.forEach((n, sym) => {
      if (n !== length) return;
      // Sent inverted, most significant bit first: as read from bit 0
      // up, that is the code's bits reversed, flipped.
      let sent = 0;
      for (let k = 0; k < length; k++)
        sent |= ((code >> (length - 1 - k) & 1) ^ 1) << k;
      for (let at = sent; at < table.length; at += 1 << length)
        table[at] = sym << 4 | length;
      code++;
    });
    code <<= 1;
  }
  return { width, table };
}

const LIT = decoder(nibbles(LIT_LENGTHS, 256));
const LEN = decoder(nibbles(LEN_LENGTHS, 16));
const DIST = decoder(nibbles(DIST_LENGTHS, 64));

/** Decompress a DCL Implode stream to exactly `size` bytes. Throws
 * Is3Error for a stream that is malformed, truncated, or doesn't come
 * to `size` bytes at its end code. */
export function explode(src: Uint8Array, size: number): Uint8Array {
  if (src.length < 2) throw new Is3Error("imploded data is truncated");
  const coded = src[0]!, low = src[1]!;
  if (coded > 1 || low < 4 || low > 6)
    throw new Is3Error("not DCL imploded data");
  if (size > MAX_MEMBER_BYTES)
    throw new Is3Error(`${size} bytes is over the cap`);
  const out = new Uint8Array(size);
  let n = 0;          // bytes out
  let buf = 0, cnt = 0, pos = 2;  // bits not yet used, how many, next byte
  const fill = (k: number): void => {
    while (cnt < k && pos < src.length) {
      buf |= src[pos++]! << cnt;
      cnt += 8;
    }
  };
  const bits = (k: number): number => {
    fill(k);
    if (cnt < k) throw new Is3Error("imploded data is truncated");
    const v = buf & (1 << k) - 1;
    buf >>>= k;
    cnt -= k;
    return v;
  };
  const decode = ({ width, table }: Decoder): number => {
    fill(width);
    const hit = table[buf & (1 << width) - 1]!;
    const len = hit & 15;
    if (!hit || len > cnt)
      throw new Is3Error("imploded data is truncated or corrupt");
    buf >>>= len;
    cnt -= len;
    return hit >> 4;
  };
  for (;;) {
    if (!bits(1)) {
      if (n === size)
        throw new Is3Error("imploded data is longer than its member");
      out[n++] = coded ? decode(LIT) : bits(8);
      continue;
    }
    const sym = decode(LEN);
    const length = LEN_BASE[sym]! + bits(LEN_EXTRA[sym]!);
    if (length === END) break;
    const extra = length === 2 ? 2 : low;
    const dist = (decode(DIST) << extra) + bits(extra) + 1;
    if (dist > n)
      throw new Is3Error("imploded data reaches back before its start");
    if (n + length > size)
      throw new Is3Error("imploded data is longer than its member");
    // Byte by byte: the copy may overlap what it writes.
    for (let i = 0; i < length; i++, n++) out[n] = out[n - dist]!;
  }
  if (n !== size) throw new Is3Error("imploded data is shorter than its member");
  return out;
}
