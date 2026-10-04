// Real Canvas 2D checks. Set FINSICAL_CHROMIUM to a Chrome/Chromium binary.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildSync } from "esbuild";
import { findBrowser } from "./lib/browser.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const BROWSER_TIMEOUT_MS = 30_000;
const browser = findBrowser();

const fixture = String.raw`
const W = 320, H = 200, FLOOR_Y = 180;
const failures = [], passed = [];
function check(ok, message) { if (!ok) throw new Error(message); }
function test(name, run) {
  try { run(); passed.push(name); }
  catch (error) { failures.push(name + ': ' + error.message); }
}
function canvas(w = W, h = H) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  cv.getContext('2d').imageSmoothingEnabled = false;
  return cv;
}
function pixels(cv) {
  return cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
}
function equal(a, b) { return a.length === b.length && a.every((v, i) => v === b[i]); }
function material(alpha = [255], rgb = [64, 64, 64]) {
  const cv = canvas(40, 20), ctx = cv.getContext('2d');
  const data = ctx.createImageData(cv.width, cv.height);
  for (let i = 0; i < cv.width * cv.height; i++)
    data.data.set([...rgb, alpha[i % alpha.length]], i * 4);
  ctx.putImageData(data, 0, 0);
  return cv;
}
const at = (x, y) => (ctx, source) => ctx.drawImage(source, x, y);
function render(source, paint = at(0, FLOOR_Y), light = 1,
                tick = 0, motion = 'animated', nightFloor = 0.3, bounds) {
  const cv = canvas(), ctx = cv.getContext('2d');
  Lighting.drawCausticSurface(ctx, source, paint, light, tick, motion, nightFloor, bounds);
  return cv;
}

test('shafts leave lower open water outside their beams untouched', () => {
  const cv = canvas(), ctx = cv.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  Lighting.drawLight(ctx, 1, 0, 'animated');
  const data = pixels(cv);
  for (let y = 120; y < H; y++) {
    for (let x = 0; x < 40; x++) {
      const i = (y * W + x) * 4;
      check(data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0,
        'open water glows at ' + x + ',' + y);
    }
  }
});
test('opaque black receivers stay black', () => {
  const data = pixels(render(material([255], [0, 0, 0])));
  for (let i = 0; i < data.length; i += 4)
    check(data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0,
      'black lifted at pixel ' + i / 4);
});
test('receiver alpha and clear gaps survive exactly', () => {
  const source = material([0, 64, 128, 255]);
  const actual = pixels(render(source, at(20, FLOOR_Y)));
  const expected = canvas(); at(20, FLOOR_Y)(expected.getContext('2d'), source);
  const alpha = pixels(expected);
  for (let i = 3; i < actual.length; i += 4)
    check(actual[i] === alpha[i], 'alpha changed at pixel ' + (i - 3) / 4);
});
test('caustics brighten midtones without a white wash', () => {
  const data = pixels(render(material()));
  let brightest = 64;
  for (let y = FLOOR_Y; y < H; y++) {
    for (let x = 0; x < 40; x++) {
      const r = data[(y * W + x) * 4];
      check(r >= 64 && r < 90, 'unexpected receiver brightness ' + r);
      brightest = Math.max(brightest, r);
    }
  }
  check(brightest > 64, 'receivers are not illuminated');
});
test('projection stays in tank coordinates when a receiver moves', () => {
  const full = canvas(), ctx = full.getContext('2d');
  ctx.fillStyle = '#404040'; ctx.fillRect(0, 0, W, H);
  const field = pixels(render(full, at(0, 0)));
  const moved = pixels(render(material(), at(50, FLOOR_Y), 1, 0, 'animated', 0.3,
    { x: 50, y: FLOOR_Y, w: 40, h: 20 }));
  for (let y = FLOOR_Y; y < H; y++) {
    for (let x = 50; x < 90; x++) {
      const i = (y * W + x) * 4;
      check(equal(moved.slice(i, i + 4), field.slice(i, i + 4)),
        'projection moved with the receiver at ' + x + ',' + y);
    }
  }
});
test('swayed bands retain their alpha footprint', () => {
  const source = material([0, 64, 128, 255]);
  const sway = (ctx, image) => {
    ctx.drawImage(image, 0, 0, 40, 10, 20, FLOOR_Y, 40, 10);
    ctx.drawImage(image, 0, 10, 40, 10, 30, FLOOR_Y + 10, 40, 10);
  };
  const actual = pixels(render(source, sway, 1, 0, 'animated', 0.3,
    { x: 20, y: FLOOR_Y, w: 50, h: 20 }));
  const expected = canvas(); sway(expected.getContext('2d'), source);
  const alpha = pixels(expected);
  for (let i = 3; i < actual.length; i += 4)
    check(actual[i] === alpha[i], 'sway mask diverged at pixel ' + (i - 3) / 4);
});
test('reduced motion freezes caustics while animated motion changes them', () => {
  const source = material();
  check(equal(pixels(render(source, at(0, FLOOR_Y), 1, 0, 'still')),
              pixels(render(source, at(0, FLOOR_Y), 1, 100, 'still'))),
    'reduced-motion caustics move');
  check(!equal(pixels(render(source, at(0, FLOOR_Y), 1, 0)),
               pixels(render(source, at(0, FLOOR_Y), 1, 100))),
    'animated caustics do not move');
});
test('demo and timer nights leave receivers unmodified', () => {
  const source = material([0, 64, 128, 255]);
  const expected = canvas(); at(0, FLOOR_Y)(expected.getContext('2d'), source);
  for (const floor of [0.3, 0.45])
    check(equal(pixels(render(source, at(0, FLOOR_Y), floor, 0, 'animated', floor)),
                pixels(expected)), 'night altered the receiver at floor ' + floor);
});
test('daylight changes invalidate the light field at the same tick', () => {
  const source = material();
  const day = pixels(render(source));
  const dusk = pixels(render(source, at(0, FLOOR_Y), 0.65));
  check(!equal(day, dusk), 'daylight strength is stale');
  for (let y = FLOOR_Y; y < H; y++)
    for (let x = 0; x < 40; x++)
      check(day[(y * W + x) * 4] >= dusk[(y * W + x) * 4], 'dusk is brighter');
});
test('successive receivers do not retain earlier masks', () => {
  render(material(), at(0, FLOOR_Y));
  const data = pixels(render(material(), at(100, FLOOR_Y)));
  for (let y = FLOOR_Y; y < H; y++)
    for (let x = 0; x < 40; x++)
      check(data[(y * W + x) * 4 + 3] === 0, 'previous receiver remains');
});
test('immutable art is cached without per-frame pixel readbacks', () => {
  const source = material([0, 64, 128, 255]);
  const original = pixels(source).slice();
  const proto = CanvasRenderingContext2D.prototype;
  const read = proto.getImageData;
  let reads = 0;
  proto.getImageData = function(...args) { reads++; return read.apply(this, args); };
  try {
    render(source);
    const warmReads = reads;
    for (let tick = 1; tick <= 5; tick++) render(source, at(0, FLOOR_Y), 1, tick);
    check(reads === warmReads, 'pixels are read back every frame');
  } finally { proto.getImageData = read; }
  check(equal(original, pixels(source)), 'source art was modified');
});
test('receiver lighting is bounded to its projected area', () => {
  const proto = CanvasRenderingContext2D.prototype, draw = proto.drawImage;
  let shadedPixels = 0;
  proto.drawImage = function(image, ...args) {
    if (this.globalCompositeOperation === 'soft-light') {
      const w = args.length === 8 ? args[6] : image.width;
      const h = args.length === 8 ? args[7] : image.height;
      shadedPixels += w * h;
    }
    return draw.call(this, image, ...args);
  };
  try {
    render(material(), at(0, FLOOR_Y), 1, 0, 'animated', 0.3,
      { x: 0, y: FLOOR_Y, w: 40, h: 20 });
  } finally { proto.drawImage = draw; }
  check(shadedPixels > 0 && shadedPixels <= 40 * 20,
    'shaded ' + shadedPixels + ' pixels for an 800-pixel receiver');
});
test('cropped receivers at tank edges keep their clipped alpha footprint', () => {
  const source = material([0, 64, 128, 255]);
  for (const [x, y] of [[-10, 170], [300, 190], [400, FLOOR_Y]]) {
    const actual = pixels(render(source, at(x, y), 1, 0, 'animated', 0.3,
      { x, y, w: source.width, h: source.height }));
    const expected = canvas(); at(x, y)(expected.getContext('2d'), source);
    const alpha = pixels(expected);
    for (let i = 3; i < actual.length; i += 4)
      check(actual[i] === alpha[i], 'clipped alpha changed at ' + x + ',' + y);
  }
});
document.body.textContent = '';
const result = document.createElement('pre'); result.id = 'results';
result.textContent = JSON.stringify({ passed, failures });
document.body.appendChild(result);
`;

const temp = mkdtempSync(join(tmpdir(), "finsical-caustics-"));
try {
  const bundle = buildSync({
    entryPoints: [join(ROOT, "web/water.ts")], bundle: true,
    format: "iife", globalName: "Lighting", write: false,
  }).outputFiles[0].text;
  const page = join(temp, "caustics.html");
  writeFileSync(page, `<!doctype html><body><script>${bundle}</script>` +
    `<script>${fixture}</script></body>`);
  const dom = execFileSync(browser, [
    "--headless", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
    "--user-data-dir=" + join(temp, "profile"),
    "--dump-dom", pathToFileURL(page).href,
  ], { timeout: BROWSER_TIMEOUT_MS, maxBuffer: 2 * 1024 * 1024,
       stdio: ["ignore", "pipe", "pipe"] }).toString();
  const result = dom.match(/<pre id="results">([^<]+)<\/pre>/);
  assert.ok(result, "Browser fixture did not return results\n" + dom);
  const report = JSON.parse(result[1].replaceAll("&gt;", ">").replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&"));
  assert.ok(report.passed.length + report.failures.length > 0, "No Canvas checks ran");
  for (const name of report.passed) console.log("PASS: " + name);
  assert.equal(report.failures.length, 0, report.failures.join("\n"));
} finally { rmSync(temp, { recursive: true, force: true }); }
