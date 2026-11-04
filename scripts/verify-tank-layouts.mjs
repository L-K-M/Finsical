// AquaZone tank files (.azn) end to end in a real browser: a tank from
// archive.org's Tanks section brings its plants and accessories where
// its file lays them out, the Import Add-ons preview shows them, the
// pieces save, restore and leave with the tank, Add Again doesn't
// double them, and a tank dropped from the Finder does the same.
// archive.org is never contacted: CDP answers its URLs with a tank
// file this script builds, so no AquaZone art is involved. Set
// FINSICAL_CHROMIUM to a Chrome/Chromium binary, as for the other
// verify scripts.
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";
import { BROWSER_TIMEOUT_MS, findBrowser, removeTemp, startBrowser }
  from "./lib/browser.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const WEB = join(ROOT, "web");
assert.equal(typeof WebSocket, "function",
             "verify:tank-layouts needs Node.js 22+");
const browser = findBrowser();

// ---- a tank file, built here --------------------------------------------

// The resource-map pack builder the unit tests use.
const { buildPack } = await import("data:text/javascript;base64," +
  Buffer.from(buildSync({
    entryPoints: [join(ROOT, "core/data/rsrc.fixture.ts")], bundle: true,
    format: "esm", write: false,
  }).outputFiles[0].text).toString("base64"));

const le16 = (v) => [v & 255, (v >> 8) & 255];
const le32 = (v) => [v & 255, (v >> 8) & 255, (v >> 16) & 255, v >>> 24];
/** Palette: 0 white (the decor and gravel key), then sky blue, stones
 * brown, plant green, rock grey. */
const PALETTE = [[255, 255, 255], [30, 60, 200], [120, 80, 40],
                 [40, 160, 60], [128, 128, 128]];
const [WHITE, SKY, STONES, GREEN, GREY] = PALETTE.map((c) => [...c, 255]);
/** An 8-bit bottom-up BMP of w x h taking `index(x, y)`. */
function bmp(w, h, index) {
  const stride = (w + 3) & ~3, pxOff = 14 + 40 + 256 * 4;
  const out = [0x42, 0x4d, ...le32(pxOff + stride * h), 0, 0, 0, 0,
               ...le32(pxOff), ...le32(40), ...le32(w), ...le32(h),
               ...le16(1), ...le16(8), ...le32(0), ...le32(stride * h),
               ...le32(2835), ...le32(2835), ...le32(256), ...le32(0)];
  for (let i = 0; i < 256; i++) {
    const [r, g, b] = PALETTE[i] ?? [0, 0, 0];
    out.push(b, g, r, 0);
  }
  for (let y = h - 1; y >= 0; y--) {
    const row = new Array(stride).fill(0);
    for (let x = 0; x < w; x++) row[x] = index(x, y);
    out.push(...row);
  }
  return out;
}
/** Art keyed on its 1-px white border, `fill` inside. */
const art = (w, h, fill) => bmp(w, h, (x, y) =>
  x === 0 || y === 0 || x === w - 1 || y === h - 1 ? 0 : fill);
const pascal = (s) => [s.length, ...[...s].map((c) => c.charCodeAt(0))];
/** A placed plant: its species name, then its own box at the end. */
function plpi(name, { h, w, x, top, depth }) {
  const p = new Array(270).fill(0);
  pascal(name).forEach((b, i) => { p[i] = b; });
  [h, w, x, top, depth].forEach((v, i) => p.splice(260 + i * 2, 2, ...le16(v)));
  return p;
}
const aqua = (w, h) => [0, 0, 0, 0, 0, 0, 0, 0, ...le16(h), ...le16(w),
                        ...new Array(12).fill(0)];
const plti = (frames) => [0, 0, 0, 0, 0, 0, 0, 0, ...le16(frames), 0, 0, 0, 0];
const acci = ({ x, top, depth, frames }) =>
  [...le16(x), ...le16(top), ...le16(depth), 0, 0, 0, 0, ...le16(frames),
   0, 0, 0, 0];
/** A 640 x 480 tank: sky backdrop, a gravel strip, a reed planted
 * twice (once stretched), a plant of a species the file lacks, and a
 * three-frame rock. */
const TANK_FILE = buildPack([
  { type: "AQUA", id: 400, payload: aqua(640, 480) },
  { type: "BAPC", id: 4011, payload: bmp(640, 480, () => 1) },
  { type: "BAPC", id: 4020, payload: bmp(640, 128, (x, y) => y < 20 ? 0 : 2) },
  { type: "PlTI", id: 200, name: "Reed", payload: plti(1) },
  { type: "PLPC", id: 200, payload: art(40, 200, 3) },
  { type: "PlPI", id: 9001,
    payload: plpi("Reed", { h: 200, w: 40, x: 100, top: 280, depth: 100 }) },
  { type: "PlPI", id: 9002,
    payload: plpi("Reed", { h: 100, w: 80, x: 400, top: 380, depth: 300 }) },
  { type: "PlPI", id: 9003,
    payload: plpi("Ghost", { h: 50, w: 50, x: 10, top: 430, depth: 50 }) },
  { type: "AccI", id: 300, name: "Rock",
    payload: acci({ x: 250, top: 420, depth: 400, frames: 3 }) },
  ...[300, 301, 302].map((id) => ({ type: "ACPC", id,
                                    payload: art(60, 60, 4) })),
]);
/** Where the tank's three pieces stand in Finsical's 320 x 200 tank:
 * the file's 640 x 480 maps at half size, so each piece's centre and
 * size halve; the unknown species stays out. */
const PIECES = [
  { x: 60, w: 20, h: 100, depth: 0.25, plant: true, frames: 1 },
  { x: 220, w: 40, h: 50, depth: 0.75, plant: true, frames: 1 },
  { x: 140, w: 30, h: 30, depth: 1, plant: false, frames: 3 },
];

const JPN = "https://archive.org/download/aquazone-jpn-set/" +
  "AQUAZONE%20(JPN)%20SET.zip/";
const TANK_URL = JPN + encodeURIComponent(
  "AQUAZONE (JPN) SET/AQUAZONE ITEM/水槽/Test Tank.azn");
const ARCHIVE = new Map([[TANK_URL, TANK_FILE]]);
const item = { section: "tanks", inner: "Test Tank", url: TANK_URL };

// ---- the tank page, instrumented --------------------------------------

const probe = `
let settled = false;
const openAudio = audio.open.bind(audio);
audio.open = (...args) => { settled = true; return openAudio(...args); };
window.__probe = {
  onBusMessage, boot, settled: () => settled, SAVE_KEY, saveTank,
  importAddon, previewOf,
  backdrop: () => backdropSrc,
  record: (url) => installedAddons.find((a) => a.url === url) ?? null,
  pieces: (url) => decors.filter((d) => d.pack === url).map((d) => ({
    x: d.x, w: d.frames[0].width, h: d.frames[0].height, depth: d.depth,
    plant: d.plant, frames: d.frames.length })),
  move: (url, i, x) => {
    decors.filter((d) => d.pack === url)[i].x = x;
    syncCover();
    saveTank();
  },
  plantArea: () => sim.plantArea,
};`;
const contents = await readFile(join(WEB, "main.ts"), "utf8");
const bundle = buildSync({
  stdin: { contents: contents + probe, resolveDir: WEB,
           sourcefile: "main.ts", loader: "ts" },
  bundle: true, format: "iife", write: false,
}).outputFiles[0].text;

const fixture = `
if (!localStorage.getItem('__fixture')) {
  localStorage.setItem('__fixture', '1');
  localStorage.setItem('finsical:machine', 'plus');
  localStorage.setItem('finsical:welcomed', 'declined');
  localStorage.setItem('finsical:starterSounds', '1');
  localStorage.setItem('finsical:boot', 'off');
  localStorage.setItem('finsical:crt', '0');
}
// A save from before layouts: its records carry no places. Stripped
// here, before the page loads, so no save of the last page can put
// them back.
if (localStorage.getItem('__stripPlaces')) {
  localStorage.removeItem('__stripPlaces');
  const t = JSON.parse(localStorage.getItem('finsical:tank'));
  for (const a of t.addons) delete a.places;
  localStorage.setItem('finsical:tank', JSON.stringify(t));
}`;
const indexHtml = (await readFile(join(WEB, "index.html"), "utf8"))
  .replace('<script src="bundle.js">',
           '<script src="fixture.js"></script><script src="bundle.js">');
assert.notEqual(indexHtml.indexOf("fixture.js"), -1,
                "index.html no longer loads bundle.js directly");
const osmiumCss =
  await readFile(join(ROOT, "node_modules/osmium-ui/osmium.css"));
const types = { ".html": "text/html", ".css": "text/css",
  ".js": "text/javascript", ".png": "image/png", ".svg": "image/svg+xml" };
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  response.setHeader("Cache-Control", "no-store");
  const send = (type, body) => {
    response.setHeader("Content-Type", type); response.end(body);
  };
  if (pathname === "/bundle.js") return send("text/javascript", bundle);
  if (pathname === "/fixture.js") return send("text/javascript", fixture);
  if (pathname === "/osmium.css") return send("text/css", osmiumCss);
  const file = resolve(WEB, "." + (pathname === "/" ? "/index.html" : pathname));
  if (!file.startsWith(WEB + "/")) { response.writeHead(403); response.end(); return; }
  try {
    send(types[extname(file)] ?? "application/octet-stream",
         file.endsWith("index.html") ? indexHtml : await readFile(file));
  } catch { response.writeHead(404); response.end(); }
});

// ---- the run ------------------------------------------------------------

const temp = mkdtempSync(join(tmpdir(), "finsical-tank-layouts-"));
const errors = [], failures = [], passed = [];
let chrome;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function test(name, run) {
  try { await run(); passed.push(name); console.log("PASS: " + name); }
  catch (error) {
    failures.push(name + ": " + error.message);
    console.log("FAIL: " + failures.at(-1));
  }
}

try {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}`;
  chrome = startBrowser(browser, join(temp, "profile"));
  let call;
  const onEvent = (message) => {
    if (message.method === "Runtime.exceptionThrown") {
      const d = message.params.exceptionDetails;
      errors.push(d.exception?.description ?? d.text);
      return;
    }
    if (message.method !== "Fetch.requestPaused") return;
    const { requestId, request } = message.params;
    const body = ARCHIVE.get(request.url);
    call("Fetch.fulfillRequest", {
      requestId, responseCode: body ? 200 : 404,
      responseHeaders: [{ name: "Access-Control-Allow-Origin", value: "*" },
                        { name: "Content-Type",
                          value: "application/octet-stream" }],
      body: Buffer.from(body ?? []).toString("base64"),
    }, message.sessionId)
      .catch((error) => errors.push("fetch answer: " + error.message));
  };
  call = await chrome.connect(onEvent);
  const { targetId } = await call("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await call("Target.attachToTarget",
    { targetId, flatten: true });
  await call("Runtime.enable", {}, sessionId);
  await call("Fetch.enable", { patterns: [
    { urlPattern: "https://archive.org/*" },
    { urlPattern: "https://*.archive.org/*" }] }, sessionId);
  const evalJs = async (expression) => {
    const { result, exceptionDetails } = await call("Runtime.evaluate", {
      expression, returnByValue: true, awaitPromise: true,
    }, sessionId);
    if (exceptionDetails)
      throw new Error(exceptionDetails.exception?.description ??
                      exceptionDetails.text);
    return result.value;
  };
  const waitFor = async (expression) => {
    const deadline = Date.now() + BROWSER_TIMEOUT_MS;
    for (;;) {
      try { if (await evalJs(expression)) return; }
      catch (error) {
        if (!/Cannot find (?:default execution )?context|Execution context was destroyed/i
            .test(error.message)) throw error;
      }
      if (Date.now() > deadline)
        throw new Error("timed out waiting for: " + expression);
      await sleep(25);
    }
  };
  const load = async () => {
    await call("Page.navigate", { url }, sessionId);
    await sleep(100);
    await waitFor("!!window.__probe && __probe.settled()");
  };
  const install = (again) => evalJs(
    `__probe.onBusMessage({ op: 'install', item: ${JSON.stringify(item)},
                            again: ${again} })`);
  const pieces = (u = TANK_URL) => evalJs(`__probe.pieces(${JSON.stringify(u)})`);
  const savedPlaces = (u = TANK_URL) => evalJs(`(() => {
    const t = JSON.parse(localStorage.getItem(__probe.SAVE_KEY) ?? 'null');
    return t?.addons?.find((a) => a.url === ${JSON.stringify(u)})?.places
      ?? null;
  })()`);
  const xs = async (u) => (await pieces(u)).map((p) => p.x);

  await load();

  await test("a tank from archive.org brings its pieces where it puts them",
    async () => {
      await install(false);
      await waitFor(`__probe.pieces(${JSON.stringify(TANK_URL)}).length === 3`);
      assert.deepEqual(await pieces(), PIECES);
      assert.equal(await evalJs("__probe.backdrop()"), TANK_URL);
      // The two reeds photosynthesise; the rock doesn't.
      assert.equal(await evalJs("__probe.plantArea()"), 20 * 100 + 40 * 50);
    });

  await test("the Import Add-ons preview shows the tank as laid out",
    async () => {
      const px = await evalJs(`(async () => {
        const pv = __probe.previewOf(
          await __probe.importAddon(${JSON.stringify(TANK_URL)}));
        const c = pv.getContext('2d');
        const at = (x, y) => [...c.getImageData(x, y, 1, 1).data];
        return { size: [pv.width, pv.height],
                 sky: at(5, 5), stones: at(5, 470), gravelKey: at(5, 360),
                 reed: at(120, 380), stretched: at(440, 430),
                 rock: at(280, 450), ghost: at(30, 450) };
      })()`);
      assert.deepEqual(px.size, [640, 480]);
      assert.deepEqual(px.sky, SKY);
      assert.deepEqual(px.stones, STONES);
      assert.deepEqual(px.gravelKey, SKY, "the gravel's white keys out");
      assert.deepEqual(px.reed, GREEN);
      assert.deepEqual(px.stretched, GREEN);
      assert.deepEqual(px.rock, GREY);
      assert.deepEqual(px.ghost, STONES, "an unknown species draws nothing");
    });

  await test("Add Again keeps one set of the tank's pieces", async () => {
    await install(true);
    await sleep(300);
    assert.equal((await pieces()).length, 3);
  });

  await test("the pieces save and come back where they stood", async () => {
    await evalJs("__probe.saveTank()");
    assert.deepEqual(await savedPlaces(), PIECES.map((p) => p.x));
    await evalJs(`__probe.move(${JSON.stringify(TANK_URL)}, 1, 270)`);
    await load();
    await waitFor(`__probe.pieces(${JSON.stringify(TANK_URL)}).length === 3`);
    assert.deepEqual(await xs(), [60, 270, 140]);
  });

  await test("a tank saved before layouts gets its file's layout", async () => {
    // The fixture strips the key the tank saves under.
    assert.equal(await evalJs("__probe.SAVE_KEY"), "finsical:tank");
    await evalJs("localStorage.setItem('__stripPlaces', '1')");
    await load();
    await waitFor(`__probe.pieces(${JSON.stringify(TANK_URL)}).length === 3`);
    // The moved reed is back where the file puts it.
    assert.deepEqual(await pieces(), PIECES);
  });

  await test("removing the tank takes its pieces out", async () => {
    await evalJs(`__probe.onBusMessage({ op: 'removeAddon',
      url: ${JSON.stringify(TANK_URL)}, boot: __probe.boot })`);
    await waitFor(`!__probe.record(${JSON.stringify(TANK_URL)})`);
    assert.deepEqual(await pieces(), []);
  });

  await test("a tank dropped from the Finder does the same and comes back",
    async () => {
      const local = "local:Test Tank.azn";
      await evalJs(`(() => {
        const dt = new DataTransfer();
        dt.items.add(new File([new Uint8Array(${JSON.stringify([...TANK_FILE])})],
                              'Test Tank.azn'));
        window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt,
          bubbles: true, cancelable: true }));
      })()`);
      await waitFor(`!!__probe.record(${JSON.stringify(local)})`);
      assert.deepEqual(await pieces(local), PIECES);
      await evalJs("__probe.saveTank()");
      await load();
      await waitFor(`__probe.pieces(${JSON.stringify(local)}).length === 3`);
      assert.deepEqual(await pieces(local), PIECES);
    });

  assert.deepEqual(errors, [], "page errors");
  assert.deepEqual(failures, [], failures.join("\n"));
  assert.equal(passed.length, 7, "Missing checks");
  console.log(`${passed.length} tank layout scenarios passed`);
} finally {
  await chrome?.close();
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
  removeTemp(temp);
}
