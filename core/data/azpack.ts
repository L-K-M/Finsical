/**
 * .azpack bundle loader — the format emitted by tools/az/emit.py.
 *
 * A bundle directory holds manifest.json plus indexed-color PNG sheets
 * under sprites/ and images/. This module is environment-agnostic: the
 * caller supplies file bytes (fs in node, fetch in the browser shell).
 */

export interface SpriteSheetMeta {
  image: string;
  groups: number;
  framesPerGroup: number;
  cellW: number;
  cellH: number;
  /** [group, frame, w, h] per frame, in group-major emission order. */
  dims: [number, number, number, number][];
  /** Chunk name of the BMP the sheet's palette was borrowed from. */
  paletteSrc?: string | null;
}

export interface ChunkRecord {
  file: string;
  size: number;
  resId: number | null;
  sub: number | null;
  name?: string;
  image?: string;
  w?: number;
  h?: number;
  bad_image?: boolean;
  spriteError?: string;
  sprites?: SpriteSheetMeta;
}

export interface AzpackManifest {
  format: "azpack/1";
  tag: string;
  version: number;
  chunks: ChunkRecord[];
  names: { resId: number; name: string }[];
  /** WAV files decoded from 'snd ' resources (tools/az/snd.py). */
  sounds?: { name: string; file: string }[];
}

export interface IndexedImage {
  w: number;
  h: number;
  palette: [number, number, number][];
  idx: Uint8Array; // row-major palette indices
}

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const MAX_PNG_PIXELS = 1 << 26;
const MAX_PALETTE_ENTRIES = 256;

async function inflate(data: Uint8Array, expected: number): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate");
  const stream = new Blob([data]).stream().pipeThrough(ds);
  const reader = stream.getReader();
  const out = new Uint8Array(expected);
  let offset = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value.byteLength > expected - offset) {
        await reader.cancel();
        throw new Error("png: excess pixel data");
      }
      out.set(value, offset);
      offset += value.byteLength;
    }
  } finally { reader.releaseLock(); }
  if (offset !== expected) throw new Error("png: short pixel data");
  return out;
}

function unfilter(raw: Uint8Array, w: number, h: number, bpp: number): Uint8Array {
  const stride = w * bpp;
  const out = new Uint8Array(h * stride);
  let prev = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)] ?? 0;
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = out.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = (x >= bpp ? cur[x - bpp] : 0) ?? 0;
      const b = prev[x] ?? 0;
      const c = (x >= bpp ? prev[x - bpp] : 0) ?? 0;
      let v = row[x] ?? 0;
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      } else if (f !== 0) throw new Error(`png: bad filter ${f}`);
      cur[x] = v;
    }
    prev = cur;
  }
  return out;
}

/** Decode an 8-bit indexed (color type 3), non-interlaced PNG. */
export async function decodeIndexedPng(d: Uint8Array): Promise<IndexedImage> {
  if (d.length < 8 || !PNG_SIG.every((b, i) => d[i] === b))
    throw new Error("png: bad signature");
  let w = 0, h = 0;
  const palette: [number, number, number][] = [];
  const idat: Uint8Array[] = [];
  let p = 8;
  while (p + 12 <= d.length) {
    const len = new DataView(d.buffer, d.byteOffset + p).getUint32(0);
    const tag = String.fromCharCode(
      d[p + 4] ?? 0, d[p + 5] ?? 0, d[p + 6] ?? 0, d[p + 7] ?? 0);
    const body = d.subarray(p + 8, p + 8 + len);
    if (p + 12 + len > d.length) throw new Error("png: truncated chunk");
    if (tag === "IHDR") {
      if (len !== 13) throw new Error("png: bad IHDR length");
      const v = new DataView(d.buffer, d.byteOffset + p + 8);
      w = v.getUint32(0); h = v.getUint32(4);
      if (v.getUint8(8) !== 8 || v.getUint8(9) !== 3 ||
          v.getUint8(10) !== 0 || v.getUint8(11) !== 0 || v.getUint8(12) !== 0)
        throw new Error("png: need 8-bit indexed, non-interlaced, methods 0");
    } else if (tag === "PLTE") {
      if (len % 3 !== 0 || len > MAX_PALETTE_ENTRIES * 3)
        throw new Error("png: bad PLTE length");
      for (let i = 0; i + 2 < len; i += 3)
        palette.push([body[i] ?? 0, body[i + 1] ?? 0, body[i + 2] ?? 0]);
    } else if (tag === "IDAT") idat.push(body);
    else if (tag === "IEND") break;
    p += 12 + len;
  }
  if (!w || !h || !idat.length) throw new Error("png: missing IHDR/IDAT");
  if (!palette.length) throw new Error("png: missing PLTE");
  if (w * h > MAX_PNG_PIXELS) throw new Error("png: image too large");
  const zlen = idat.reduce((n, c) => n + c.length, 0);
  const z = new Uint8Array(zlen);
  let o = 0;
  for (const c of idat) { z.set(c, o); o += c.length; }
  const raw = await inflate(z, h * (w + 1));
  const idx = unfilter(raw, w, h, 1);
  for (let i = 0; i < idx.length; i++)
    if (idx[i]! >= palette.length) throw new Error(`png: palette index ${idx[i]} out of range (palette size ${palette.length})`);
  return { w, h, palette, idx };
}

/** A loaded sprite sheet: grid of cellW×cellH frames, groups per row. */
export class SpriteSheet {
  constructor(
    public meta: SpriteSheetMeta,
    public img: IndexedImage,
  ) {}

  /** Copy one frame's pixels into a fresh IndexedImage (row-major). */
  frame(group: number, frameIdx: number): IndexedImage {
    const { cellW: cw, cellH: ch, framesPerGroup: nf, groups: ng } = this.meta;
    if (group < 0 || group >= ng || frameIdx < 0 || frameIdx >= nf)
      throw new RangeError(`frame ${group},${frameIdx} out of ${ng}x${nf}`);
    const dim = this.meta.dims[group * nf + frameIdx];
    if (!dim) throw new RangeError(`dims[${group * nf + frameIdx}] missing for frame ${group},${frameIdx}`);
    const fw = dim[2], fh = dim[3];
    if (!Number.isInteger(fw) || !Number.isInteger(fh) || fw < 0 || fh < 0)
      throw new RangeError(`frame ${group},${frameIdx} has invalid dims ${fw}x${fh}`);
    if (fw > cw || fh > ch)
      throw new RangeError(`frame ${group},${frameIdx} dims ${fw}x${fh} exceed cell ${cw}x${ch}`);
    if (group * ch + fh > this.img.h || frameIdx * cw + fw > this.img.w)
      throw new RangeError(`frame ${group},${frameIdx} exceeds sheet bounds ${this.img.w}x${this.img.h}`);
    const idx = new Uint8Array(fw * fh);
    for (let y = 0; y < fh; y++) {
      const src = (group * ch + y) * this.img.w + frameIdx * cw;
      idx.set(this.img.idx.subarray(src, src + fw), y * fw);
    }
    return { w: fw, h: fh, palette: this.img.palette, idx };
  }
}

/**
 * Validate sheet metadata from an untrusted manifest. emit.py writes dims
 * as a prefix of the group-major grid (a corrupt stream truncates late
 * cells), so entries must be ordered and complete but may be fewer than
 * groups*framesPerGroup; frame() reports absent cells at use time.
 */
function checkSheetMeta(s: SpriteSheetMeta, img: IndexedImage, file: string): void {
  const bad = (what: string) => new Error(`manifest: ${file}: ${what}`);
  const { groups, framesPerGroup, cellW, cellH, dims } = s;
  if (!Number.isInteger(groups) || groups < 1) throw bad("bad groups");
  if (!Number.isInteger(framesPerGroup) || framesPerGroup < 1)
    throw bad("bad framesPerGroup");
  if (!Number.isInteger(cellW) || cellW < 1 ||
      !Number.isInteger(cellH) || cellH < 1) throw bad("bad cell size");
  if (!Array.isArray(dims) || dims.length < 1 ||
      dims.length > groups * framesPerGroup)
    throw bad(`dims length ${Array.isArray(dims) ? dims.length : "not an array"} not in 1..${groups * framesPerGroup}`);
  for (let i = 0; i < dims.length; i++) {
    const d = dims[i];
    if (!Array.isArray(d) || d.length !== 4 ||
        d[0] !== Math.floor(i / framesPerGroup) || d[1] !== i % framesPerGroup ||
        !Number.isInteger(d[2]) || !Number.isInteger(d[3]) ||
        d[2] < 1 || d[3] < 1 || d[2] > cellW || d[3] > cellH)
      throw bad(`bad dims[${i}]`);
  }
  if (framesPerGroup * cellW > img.w || groups * cellH > img.h)
    throw bad("sheet grid exceeds image bounds");
}

/** Load a bundle from a path→bytes resolver (fs readFile or fetch). */
export async function loadAzpack(
  read: (path: string) => Promise<Uint8Array>,
): Promise<{ manifest: AzpackManifest; sheets: Map<string, SpriteSheet> }> {
  const manifest = JSON.parse(
    new TextDecoder().decode(await read("manifest.json")),
  ) as AzpackManifest;
  if (!manifest || manifest.format !== "azpack/1")
    throw new Error(`bad pack format ${manifest?.format ?? JSON.stringify(manifest)}`);
  if (!Array.isArray(manifest.chunks))
    throw new Error("manifest: missing chunks array");
  const sheets = new Map<string, SpriteSheet>();
  const images = new Map<string, IndexedImage>();
  for (const c of manifest.chunks) {
    if (!c.sprites) continue;
    const imagePath = c.sprites.image;
    if (typeof imagePath !== "string" || imagePath.includes("..") || imagePath.startsWith("/"))
      throw new Error(`manifest: unsafe image path ${String(imagePath)}`);
    let img = images.get(imagePath);
    if (!img) {
      img = await decodeIndexedPng(await read(imagePath));
      images.set(imagePath, img);
    }
    checkSheetMeta(c.sprites, img, c.file);
    sheets.set(c.file, new SpriteSheet(c.sprites, img));
  }
  return { manifest, sheets };
}
