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
  sprites?: SpriteSheetMeta;
}

export interface AzpackManifest {
  format: "azpack/1";
  tag: string;
  version: number;
  chunks: ChunkRecord[];
  names: { resId: number; name: string }[];
}

export interface IndexedImage {
  w: number;
  h: number;
  palette: [number, number, number][];
  idx: Uint8Array; // row-major palette indices
}

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate");
  const stream = new Blob([data]).stream().pipeThrough(ds);
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
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
      const v = new DataView(d.buffer, d.byteOffset + p + 8);
      w = v.getUint32(0); h = v.getUint32(4);
      if (v.getUint8(8) !== 8 || v.getUint8(9) !== 3 || v.getUint8(12) !== 0)
        throw new Error("png: need 8-bit indexed, non-interlaced");
    } else if (tag === "PLTE") {
      for (let i = 0; i + 2 < len; i += 3)
        palette.push([body[i] ?? 0, body[i + 1] ?? 0, body[i + 2] ?? 0]);
    } else if (tag === "IDAT") idat.push(body);
    else if (tag === "IEND") break;
    p += 12 + len;
  }
  if (!w || !h || !idat.length) throw new Error("png: missing IHDR/IDAT");
  if (!palette.length) throw new Error("png: missing PLTE");
  const zlen = idat.reduce((n, c) => n + c.length, 0);
  const z = new Uint8Array(zlen);
  let o = 0;
  for (const c of idat) { z.set(c, o); o += c.length; }
  const raw = await inflate(z);
  if (raw.length < h * (w + 1)) throw new Error("png: short pixel data");
  return { w, h, palette, idx: unfilter(raw, w, h, 1) };
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

/** Load a bundle from a path→bytes resolver (fs readFile or fetch). */
export async function loadAzpack(
  read: (path: string) => Promise<Uint8Array>,
): Promise<{ manifest: AzpackManifest; sheets: Map<string, SpriteSheet> }> {
  const manifest = JSON.parse(
    new TextDecoder().decode(await read("manifest.json")),
  ) as AzpackManifest;
  if (manifest.format !== "azpack/1")
    throw new Error(`bad pack format ${manifest.format}`);
  const sheets = new Map<string, SpriteSheet>();
  const images = new Map<string, IndexedImage>();
  for (const c of manifest.chunks) {
    if (!c.sprites) continue;
    let img = images.get(c.sprites.image);
    if (!img) {
      img = await decodeIndexedPng(await read(c.sprites.image));
      images.set(c.sprites.image, img);
    }
    sheets.set(c.file, new SpriteSheet(c.sprites, img));
  }
  return { manifest, sheets };
}
