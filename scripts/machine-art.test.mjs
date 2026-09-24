import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { MACHINES } from "../web/machines.ts";

// The machine renders arrive as flat JPEGs on white and get keyed to
// alpha by hand. Keying that leaves the outermost anti-aliased pixels
// opaque keeps them mixed with the white backdrop, and over a dark
// desktop the case grows a hard light outline. This test composites
// each asset over black and fails when the silhouette's outermost
// pixels are brighter than the case just inside them.

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const COLOR_TYPE_RGBA = 6;

/** Decode an 8-bit, non-interlaced RGBA PNG — the only kind the
 * machine assets use. */
function decodeRgbaPng(buf) {
  if (!buf.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error("not a PNG");
  let width = 0, height = 0;
  const idat = [];
  for (let off = 8; off < buf.length;) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("latin1", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const [depth, colorType, , , interlace] = data.subarray(8);
      if (depth !== 8 || colorType !== COLOR_TYPE_RGBA || interlace !== 0)
        throw new Error(`unsupported PNG: depth ${depth}, ` +
          `color type ${colorType}, interlace ${interlace}`);
    } else if (type === "IDAT") {
      idat.push(data);
    }
    off += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  if (!width || !height || raw.length !== height * (width * 4 + 1))
    throw new Error(`corrupt PNG: ${width}x${height}, ${raw.length} bytes`);
  const stride = width * 4;
  const px = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const row = y * stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= 4 ? px[row + i - 4] : 0;
      const b = y > 0 ? px[row - stride + i] : 0;
      const c = i >= 4 && y > 0 ? px[row - stride + i - 4] : 0;
      let pred = 0;
      if (filter === 1) pred = a;
      else if (filter === 2) pred = b;
      else if (filter === 3) pred = (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      px[row + i] = (raw[src + i] + pred) & 0xff;
    }
  }
  return { width, height, px };
}

// Alpha below this is see-through — the native shell's mask flood fill
// (loadMaskImage in macos/Finsical.swift) uses the same cut.
const SOLID_ALPHA = 250;
// How much brighter than the brightest case pixel 2-3 px in (within
// 2 px along the outline) an outermost pixel may render over black.
const FRINGE_MARGIN = 24;
// Share of outermost pixels allowed over that margin: cleanly keyed
// renders stay under 3% (edge-on highlights), a white fringe hits 35%+.
const MAX_FRINGE_SHARE = 0.05;

/** Rim profile of the art composited over black: which of the
 * outermost opaque pixels outshine the case just inside them. */
function fringeShare({ width, height, px }) {
  const n = width * height;
  // Taxicab depth into the art from the edge-connected see-through
  // region: 0 outside, 1 for the outermost opaque pixels, up to 3.
  const MAX_DEPTH = 3;
  const depth = new Int8Array(n).fill(-1);
  let queue = [];
  const seed = (i) => {
    if (depth[i] === -1 && px[i * 4 + 3] < SOLID_ALPHA) {
      depth[i] = 0;
      queue.push(i);
    }
  };
  for (let x = 0; x < width; x++) { seed(x); seed((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { seed(y * width); seed(y * width + width - 1); }
  const neighbours = (i) => {
    const x = i % width, out = [];
    if (x > 0) out.push(i - 1);
    if (x < width - 1) out.push(i + 1);
    if (i >= width) out.push(i - width);
    if (i < n - width) out.push(i + width);
    return out;
  };
  // Flood the see-through region first; it can wind anywhere.
  while (queue.length) {
    const next = [];
    for (const i of queue)
      for (const j of neighbours(i)) {
        if (depth[j] !== -1 || px[j * 4 + 3] >= SOLID_ALPHA) continue;
        depth[j] = 0;
        next.push(j);
      }
    queue = next;
  }
  let frontier = [];
  for (let i = 0; i < n; i++) if (depth[i] === 0) frontier.push(i);
  for (let d = 1; d <= MAX_DEPTH; d++) {
    const next = [];
    for (const i of frontier)
      for (const j of neighbours(i))
        if (depth[j] === -1 && px[j * 4 + 3] >= SOLID_ALPHA) {
          depth[j] = d;
          next.push(j);
        }
    frontier = next;
  }

  const overBlack = (i) =>
    (px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2]) / 3 * px[i * 4 + 3] / 255;
  let rim = 0, fringe = 0;
  for (let i = 0; i < n; i++) {
    if (depth[i] !== 1) continue;
    const x = i % width, y = (i - x) / width;
    let inner = -1;
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue;
        const j = yy * width + xx;
        if (depth[j] === 2 || depth[j] === 3) inner = Math.max(inner, overBlack(j));
      }
    if (inner < 0) continue;
    rim++;
    if (overBlack(i) > inner + FRINGE_MARGIN) fringe++;
  }
  if (rim === 0) throw new Error("no opaque rim: the art has no see-through edge");
  return fringe / rim;
}

describe("machine art", () => {
  for (const m of MACHINES) {
    if (!m.image) continue;
    it(`${m.id}: no light fringe around the silhouette`, () => {
      const img = decodeRgbaPng(readFileSync(new URL(`../web/${m.image}`, import.meta.url)));
      const share = fringeShare(img);
      expect(share, `fringe share ${(share * 100).toFixed(1)}%`)
        .toBeLessThan(MAX_FRINGE_SHARE);
    });
  }
});
