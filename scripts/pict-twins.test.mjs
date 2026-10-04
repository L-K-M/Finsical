// tools/az/pict.py is the command line's twin of core/data/pict.ts, and
// must read every picture the same way: the same pixels, palette and
// error message. Both decode the same synthesized pictures here, and
// fuzzed copies of a few, the Python side in one python3 process.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { decodePict, PictError } from "../core/data/pict.ts";
import { buildPict, rect } from "../core/data/pict.fixture.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
// CI always has python3; a contributor without it skips this file.
const python = spawnSync("python3", ["--version"]).status === 0;

/** Base64 pictures in on stdin, one per line; a JSON line out for each:
 * the image (its index bytes hashed) or the PictError's message. */
const PY = `
import base64, hashlib, json, sys
sys.path.insert(0, ${JSON.stringify(root)})
from tools.az.pict import PictError, decode_pict
for line in sys.stdin:
    try:
        w, h, pal, idx = decode_pict(base64.b64decode(line))
        print(json.dumps({"w": w, "h": h, "pal": [list(p) for p in pal],
                          "idx": hashlib.sha256(bytes(idx)).hexdigest()}))
    except PictError as e:
        print(json.dumps({"error": str(e)}))
`;

function ours(d) {
  try {
    const img = decodePict(d);
    return { w: img.w, h: img.h, pal: img.palette.map((p) => [...p]),
             idx: createHash("sha256").update(img.idx).digest("hex") };
  } catch (e) {
    if (!(e instanceof PictError)) throw e;
    return { error: e.message };
  }
}

function theirs(pictures) {
  const out = execFileSync("python3", ["-c", PY], {
    input: pictures.map((d) => Buffer.from(d).toString("base64")).join("\n"),
    maxBuffer: 64 << 20, timeout: 120_000, encoding: "utf8",
  });
  return out.trim().split("\n").map((l) => JSON.parse(l));
}

// ---- the pictures --------------------------------------------------------

const be16 = (v) => [(v >> 8) & 255, v & 255];
const rectBytes = (r) => [...be16(r.top), ...be16(r.left), ...be16(r.bottom),
                          ...be16(r.right)];
/** Deterministic noise, its low bits mixed with its high ones. */
function noise(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return (s ^ s >>> 16) >>> 0;
  };
}
const grid = (w, h, f) =>
  Array.from({ length: w * h }, (_, i) => f(i % w, Math.floor(i / w)));
const CLUT = [[255, 255, 255], [200, 40, 40], [40, 160, 60], [30, 60, 200],
              [0, 0, 0], [250, 200, 0], [120, 0, 120], [0, 120, 120]];
/** A Clip opcode with an inversion-point region. */
function clip(box, rows) {
  const data = rows.flatMap(({ y, xs }) =>
    [...be16(y), ...xs.flatMap(be16), ...be16(0x7fff)]);
  const body = [...rectBytes(box), ...data,
                ...(rows.length ? be16(0x7fff) : [])];
  return { kind: "raw", bytes: [0x00, 0x01, ...be16(2 + body.length), ...body] };
}

const pictures = [];
const add = (spec) => pictures.push(buildPict(spec));

for (const depth of [1, 2, 4, 8])
  for (const packed of [true, false])
    for (const w of [7, 64, 300]) {
      const n = Math.min(1 << depth, CLUT.length);
      add({ frame: rect(0, 0, 3, w), ops: [
        { kind: "indexed", depth, packed, w, h: 3, clut: CLUT.slice(0, n),
          px: grid(w, 3, (x, y) => (x * 3 + y) % n) }] });
    }
add({ frame: rect(0, 0, 2, 9), ops: [{ kind: "indexed", depth: 4, w: 9, h: 2,
  clut: CLUT, device: true, px: grid(9, 2, (x) => x % 8) }] });
add({ frame: rect(0, 0, 2, 9), ops: [{ kind: "indexed", depth: 4, w: 9, h: 2,
  clut: CLUT, values: [7, 6, 5, 4, 3, 2, 1, 0], px: grid(9, 2, (x) => x % 8) }] });
add({ version: 1, frame: rect(0, 0, 3, 70), ops: [{ kind: "mono", w: 70, h: 3,
  px: grid(70, 3, (x, y) => (x + y) % 3 ? 1 : 0) }] });
add({ version: 1, frame: rect(0, 0, 2, 7), ops: [{ kind: "mono", packed: false,
  w: 7, h: 2, px: grid(7, 2, (x) => x & 1) }] });
add({ frame: rect(0, 0, 2, 16), ops: [{ kind: "mono", w: 16, h: 2,
  px: grid(16, 2, (x) => x % 3 ? 0 : 1) }] });
for (const [depth, packTypes] of [[16, [0, 1, 3]], [32, [0, 1, 2, 4]]])
  for (const packType of packTypes)
    for (const w of [3, 40, 260]) {
      const r = noise(depth * 1000 + packType * 100 + w);
      add({ frame: rect(0, 0, 2, w), ops: [{ kind: "direct", depth, packType,
        w, h: 2, px: grid(w, 2, () => r() & 0xffffff) }] });
    }
add({ frame: rect(0, 0, 2, 12), ops: [{ kind: "direct", depth: 32, packType: 4,
  cmpCount: 4, w: 12, h: 2, px: grid(12, 2, (x, y) => x * 20 << 16 | y * 90 << 8 | 77) }] });
// Past 65,536 colors the median cut works on bins.
{
  const r = noise(5);
  add({ frame: rect(0, 0, 240, 300), ops: [{ kind: "direct", depth: 32,
    packType: 4, w: 300, h: 240, px: grid(300, 240, () => r() & 0xffffff) }] });
}
add({ frame: rect(0, 0, 8, 8), ops: [{ kind: "indexed", depth: 8, w: 4, h: 4,
  clut: CLUT, px: grid(4, 4, (x, y) => (x + y) % 8), dst: rect(0, 0, 8, 8) }] });
add({ frame: rect(10, 20, 30, 50), ops: [{ kind: "indexed", depth: 8, w: 4,
  h: 4, clut: CLUT, px: grid(4, 4, (x, y) => (x * y) % 8),
  bounds: rect(10, 20, 14, 24), dst: rect(12, 25, 20, 45) }] });
add({ frame: rect(0, 0, 4, 4), ops: [{ kind: "indexed", depth: 8, w: 4, h: 4,
  clut: CLUT, px: grid(4, 4, () => 1), rgn: { box: rect(0, 0, 4, 4), rows: [
    { y: 0, xs: [0, 2] }, { y: 2, xs: [1, 3] }, { y: 4, xs: [0, 2, 1, 3] }] } }] });
add({ frame: rect(0, 0, 4, 6), ops: [
  clip(rect(0, 0, 4, 6), [{ y: 1, xs: [1, 5] }, { y: 3, xs: [1, 5] }]),
  { kind: "direct", depth: 32, packType: 4, w: 6, h: 4,
    px: grid(6, 4, (x, y) => x * 40 << 16 | y * 60) }] });
add({ frame: rect(0, 0, 2, 4), ops: [
  { kind: "raw", bytes: [0x00, 0xa0, 0x00, 0x82] },
  { kind: "raw", bytes: [0x00, 0xa1, 0x00, 0x64, ...be16(3), 1, 2, 3] },
  { kind: "raw", bytes: [0x00, 0x30, ...rectBytes(rect(0, 0, 2, 4))] },
  { kind: "raw", bytes: [0x00, 0x2c, ...be16(7), 0, 3, 4, 0x41, 0x42, 0x43, 0x44] },
  { kind: "raw", bytes: [0x00, 0x12, 0x00, 0x02, ...new Array(8).fill(0x55),
                         ...be16(0xffff), ...be16(0), ...be16(0)] },
  { kind: "raw", bytes: [0x02, 0x00, 1, 2, 3, 4] },
  { kind: "raw", bytes: [0x81, 0x00, 0, 0, 0, 2, 9, 9] },
  { kind: "indexed", depth: 8, w: 4, h: 2, clut: CLUT, px: grid(4, 2, (x) => x) },
] });
add({ frame: rect(0, 0, 2, 2), ops: [
  { kind: "raw", bytes: [0x82, 0x00, 0, 0, 0, 2, 1, 2] }] });
add({ frame: rect(0, 0, 10, 9000), ops: [] });
add({ frame: rect(0, 0, 0, 0), ops: [] });
add({ frame: rect(0, 0, 1, 2), ops: [
  { kind: "raw", bytes: new Array(2 * 140_000).fill(0) },
  { kind: "indexed", depth: 8, w: 2, h: 1, px: [1, 2], clut: CLUT }] });

// Data-fork files, their header empty or not, and fuzzed seeds.
const seeds = [
  buildPict({ file: true, frame: rect(0, 0, 2, 4), ops: [{ kind: "indexed",
    depth: 8, w: 4, h: 2, clut: CLUT, px: grid(4, 2, (x, y) => x + y) }] }),
  buildPict({ frame: rect(0, 0, 4, 9), ops: [
    { kind: "raw", bytes: [0x00, 0xa1, 0, 0, ...be16(3), 1, 2, 3] },
    { kind: "indexed", depth: 4, w: 9, h: 2, clut: CLUT,
      px: grid(9, 2, (x) => x % 4) },
    { kind: "direct", depth: 32, packType: 4, w: 9, h: 2, bounds: rect(2, 0, 4, 9),
      px: grid(9, 2, (x, y) => (x + 9 * y) * 0x0a0b0c),
      rgn: { box: rect(2, 0, 4, 9), rows: [{ y: 2, xs: [1, 8] }, { y: 4, xs: [1, 8] }] } },
  ] }),
  buildPict({ version: 1, frame: rect(0, 0, 3, 70), ops: [{ kind: "mono", w: 70,
    h: 3, px: grid(70, 3, (x) => x % 5 ? 1 : 0) }] }),
  buildPict({ frame: rect(0, 0, 2, 12), ops: [{ kind: "direct", depth: 16,
    packType: 3, w: 12, h: 2, px: grid(12, 2, (x) => x < 6 ? 0xff0000 : 0x0000ff) }] }),
];
{
  const named = seeds[0].slice();
  named.set([..."Photoshop PICT"].map((c) => c.charCodeAt(0)));
  pictures.push(...seeds, named);
}
for (const seed of seeds.slice(1, 3))
  for (let n = 0; n < seed.length; n++) pictures.push(seed.subarray(0, n));
{
  const r = noise(11);
  for (const seed of seeds)
    for (let k = 0; k < 400; k++) {
      const d = seed.slice();
      const flips = 1 + r() % 4;
      for (let f = 0; f < flips; f++) d[r() % d.length] = r() & 0xff;
      pictures.push(d);
    }
}

describe.skipIf(!python && !process.env.CI)("the Python PICT decoder", () => {
  it("reads every picture as core/data/pict.ts does", () => {
    const want = pictures.map(ours);
    const got = theirs(pictures);
    expect(got.length).toBe(want.length);
    const differ = want.findIndex((w, i) =>
      JSON.stringify(w) !== JSON.stringify(got[i]));
    expect(differ === -1 ? null : { picture: differ, ts: want[differ],
                                    python: got[differ] }).toBeNull();
    // The cases reach both outcomes, and the errors past the header.
    expect(want.filter((w) => !w.error).length).toBeGreaterThan(400);
    expect(new Set(want.map((w) => w.error).filter(Boolean)).size)
      .toBeGreaterThan(8);
  }, 180_000);
});
