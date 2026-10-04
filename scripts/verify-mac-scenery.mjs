// AquaZone's Mac scenery end to end in a real browser: PICT backdrops
// and gravel forks from the main item's 7z install, draw, persist,
// restore offline from the cache, switch with Use and leave with
// Remove; dropped Mac pictures do the same through the tank and the
// Import Add-ons window. archive.org is never contacted: CDP answers
// its URLs with pictures this script builds, so no AquaZone art is
// involved. Set FINSICAL_CHROMIUM to a Chrome/Chromium binary, as for
// the other verify scripts.
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
             "verify:mac-scenery needs Node.js 22+");
const browser = findBrowser();

// ---- pictures, built here ---------------------------------------------

const be16 = (v) => [(v >> 8) & 255, v & 255];
const be32 = (v) => [v >>> 24, (v >> 16) & 255, (v >> 8) & 255, v & 255];

/** An 8-bit PICT (version 2, one PackBitsRect, literal rows) of w x h
 * whose rows take `rowColor(y)`, an index into the white/red/green/blue
 * table. `file` adds a data-fork file's 512-byte header. */
function pict(w, h, rowColor, file = false) {
  const clut = [[255, 255, 255], [200, 40, 40], [40, 160, 60], [30, 60, 200]];
  const out = [...be16(0), 0, 0, 0, 0, ...be16(h), ...be16(w),
               0x00, 0x11, 0x02, 0xff, 0x0c, 0x00, ...new Array(24).fill(0)];
  out.push(0x00, 0x98, ...be16(w | 0x8000), 0, 0, 0, 0, ...be16(h), ...be16(w),
           0, 0, 0, 0, 0, 0, 0, 0, ...be32(72 << 16), ...be32(72 << 16),
           0, 0, 0, 8, 0, 1, 0, 8, ...new Array(12).fill(0),
           ...be32(0), 0x80, 0x00, ...be16(clut.length - 1),
           ...clut.flatMap(([r, g, b], i) =>
             [...be16(i), ...be16(r * 257), ...be16(g * 257), ...be16(b * 257)]),
           0, 0, 0, 0, ...be16(h), ...be16(w), 0, 0, 0, 0, ...be16(h), ...be16(w),
           0, 0);
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x += 128) {
      const n = Math.min(128, w - x);
      row.push(n - 1, ...new Array(n).fill(rowColor(y)));
    }
    out.push(...(w > 250 ? be16(row.length) : [row.length]), ...row);
  }
  if (out.length & 1) out.push(0);
  out.push(0x00, 0xff);
  return Uint8Array.from([...(file ? new Array(512).fill(0) : []), ...out]);
}

/** A resource fork holding `types`: { 'BAPC': [[id, bytes]] }. */
function fork(types) {
  const data = [], refs = [], list = [];
  const entries = Object.entries(types);
  let refOff = 2 + 8 * entries.length;
  for (const [type, items] of entries) {
    list.push(...[...type].map((c) => c.charCodeAt(0)),
              ...be16(items.length - 1), ...be16(refOff));
    for (const [id, body] of items) {
      refs.push(...be16(id), 0xff, 0xff, 0, ...be32(data.length).slice(1), 0, 0, 0, 0);
      data.push(...be32(body.length), ...body);
      refOff += 12;
    }
  }
  const typeList = [...be16(entries.length - 1), ...list, ...refs];
  const map = [...new Array(24).fill(0), ...be16(28), ...be16(28 + typeList.length),
               ...typeList];
  return Uint8Array.from([...be32(256), ...be32(256 + data.length),
                          ...be32(data.length), ...be32(map.length),
                          ...new Array(240).fill(0), ...data, ...map]);
}

/** An AppleDouble companion carrying `rsrc` as its resource fork. */
function appleDouble(rsrc) {
  return Uint8Array.from([...be32(0x00051607), ...be32(0x00020000),
                          ...new Array(16).fill(0), ...be16(1),
                          ...be32(2), ...be32(38), ...be32(rsrc.length), ...rsrc]);
}

// Backdrops: one red, one blue. The gravel strip is white (the sky the
// tank keys out) over green, its catalog picture all blue.
const RED_BACKDROP = pict(320, 200, () => 1, true);
const BLUE_BACKDROP = pict(320, 200, () => 3, true);
const GRAVEL = appleDouble(fork({
  Grvl: [[4020, [0, 53, 0, 52, 0, 0, 0, 0]]],
  BADP: [[4020, pict(64, 48, () => 3)]],
  BAPC: [[4020, pict(400, 60, (y) => y < 20 ? 0 : 2)]],
}));

const ITEM = "https://archive.org/download/aquazonewithguppiesandaddons";
const FOLDER = "Missing addons Aquazone/Spare interesting things/" +
  "Misc Macintosh files/";
const entry = (name) => `${ITEM}/Missing%20addons%20Aquazone.7z/` +
  encodeURIComponent(FOLDER + name);
const ARCHIVE = new Map([
  [entry("ë€"), RED_BACKDROP],
  [entry("青のグラデーション"), BLUE_BACKDROP],
  [entry("._星砂- star sand"), GRAVEL],
]);
const items = {
  moss: { section: "backgrounds", inner: "苔", url: entry("ë€") },
  blue: { section: "backgrounds", inner: "青のグラデーション",
          url: entry("青のグラデーション") },
  sand: { section: "gravel", inner: "星砂- star sand",
          url: entry("._星砂- star sand") },
};

// ---- the tank page, instrumented --------------------------------------

const probe = `
// The launch chain ends by opening the audio and, in the same step,
// putting the chosen scenery back: the restore has settled after that.
let settled = false;
const openAudio = audio.open.bind(audio);
audio.open = (...args) => { settled = true; return openAudio(...args); };
window.__probe = {
  onBusMessage, boot, settled: () => settled,
  addons: () => installedAddons.map(a => a.url),
  records: () => installedAddons,
  scenery: () => ({ backdrop: backdropSrc, gravel: gravelSrc,
                    choice: { ...sceneryChoice } }),
  // The fitted art the tank blits: a backdrop pixel, and the gravel's
  // top and bottom rows (transparent sky, then stones).
  backdropPixel: () => backdropCv && [...backdropCv.getContext('2d')
    .getImageData(10, 10, 1, 1).data],
  gravelPixels: () => {
    if (!gravelCv) return null;
    const c = gravelCv.getContext('2d');
    return [[...c.getImageData(5, 0, 1, 1).data],
            [...c.getImageData(5, gravelCv.height - 1, 1, 1).data]];
  },
  dropText: () => document.getElementById('dropmsg').textContent,
};`;
const contents = await readFile(join(WEB, "main.ts"), "utf8");
const bundle = buildSync({
  stdin: { contents: contents + probe, resolveDir: WEB,
           sourcefile: "main.ts", loader: "ts" },
  bundle: true, format: "iife", write: false,
}).outputFiles[0].text;
const addonsBundle = buildSync({
  entryPoints: [join(WEB, "addons.ts")], bundle: true, format: "iife",
  write: false,
}).outputFiles[0].text;

const fixture = `
if (!localStorage.getItem('__fixture')) {
  localStorage.setItem('__fixture', '1');
  localStorage.setItem('finsical:machine', 'plus');
  localStorage.setItem('finsical:welcomed', 'declined');
  localStorage.setItem('finsical:starterSounds', '1');
  localStorage.setItem('finsical:boot', 'off');
  localStorage.setItem('finsical:crt', '0');
}`;
const indexHtml = (await readFile(join(WEB, "index.html"), "utf8"))
  .replace('<script src="bundle.js">',
           '<script src="fixture.js"></script><script src="bundle.js">');
assert.notEqual(indexHtml.indexOf("fixture.js"), -1,
                "index.html no longer loads bundle.js directly");

const types = { ".html": "text/html", ".css": "text/css",
  ".js": "text/javascript", ".png": "image/png", ".svg": "image/svg+xml" };
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  response.setHeader("Cache-Control", "no-store");
  const send = (type, body) => {
    response.setHeader("Content-Type", type); response.end(body);
  };
  if (pathname === "/bundle.js") return send("text/javascript", bundle);
  if (pathname === "/addons.js") return send("text/javascript", addonsBundle);
  if (pathname === "/fixture.js") return send("text/javascript", fixture);
  if (pathname === "/osmium.css")
    return send("text/css", await readFile(
      join(ROOT, "node_modules/osmium-ui/osmium.css")));
  const file = resolve(WEB, "." + (pathname === "/" ? "/index.html" : pathname));
  if (!file.startsWith(WEB + "/")) { response.writeHead(403); response.end(); return; }
  try {
    send(types[extname(file)] ?? "application/octet-stream",
         file.endsWith("index.html") ? indexHtml : await readFile(file));
  } catch { response.writeHead(404); response.end(); }
});

// ---- the run ------------------------------------------------------------

const temp = mkdtempSync(join(tmpdir(), "finsical-mac-scenery-"));
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
  // archive.org through CDP: served from ARCHIVE, or refused while
  // offline. Every answer is counted.
  let offline = false;
  const fetched = [];
  let call;
  const onEvent = (message) => {
    if (message.method === "Runtime.exceptionThrown") {
      const d = message.params.exceptionDetails;
      errors.push(d.exception?.description ?? d.text);
      return;
    }
    if (message.method !== "Fetch.requestPaused") return;
    const { requestId, request } = message.params;
    fetched.push({ url: request.url, offline });
    const body = ARCHIVE.get(request.url);
    const answer = offline
      ? call("Fetch.failRequest",
             { requestId, errorReason: "InternetDisconnected" },
             message.sessionId)
      : call("Fetch.fulfillRequest", {
          requestId, responseCode: body ? 200 : 404,
          responseHeaders: [{ name: "Access-Control-Allow-Origin", value: "*" },
                            { name: "Content-Type",
                              value: "application/octet-stream" }],
          body: Buffer.from(body ?? []).toString("base64"),
        }, message.sessionId);
    answer.catch((error) => errors.push("fetch answer: " + error.message));
  };
  call = await chrome.connect(onEvent);

  const evalJs = async (expression, sessionId) => {
    const { result, exceptionDetails } = await call("Runtime.evaluate", {
      expression, returnByValue: true, awaitPromise: true,
    }, sessionId);
    if (exceptionDetails)
      throw new Error(exceptionDetails.exception?.description ??
                      exceptionDetails.text);
    return result.value;
  };
  const waitFor = async (expression, sessionId) => {
    const deadline = Date.now() + BROWSER_TIMEOUT_MS;
    for (;;) {
      try { if (await evalJs(expression, sessionId)) return; }
      catch (error) {
        if (!/Cannot find (?:default execution )?context|Execution context was destroyed/i
            .test(error.message)) throw error;
      }
      if (Date.now() > deadline)
        throw new Error("timed out waiting for: " + expression);
      await sleep(25);
    }
  };
  const openPage = async (path) => {
    const { targetId } = await call("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await call("Target.attachToTarget",
      { targetId, flatten: true });
    await call("Runtime.enable", {}, sessionId);
    await call("Fetch.enable", { patterns: [
      { urlPattern: "https://archive.org/*" },
      { urlPattern: "https://*.archive.org/*" }] }, sessionId);
    await call("Page.navigate", { url: url + path }, sessionId);
    return sessionId;
  };
  const reload = async (sessionId) => {
    await call("Page.reload", {}, sessionId);
    await sleep(100);
    await waitFor("!!window.__probe && __probe.settled()", sessionId);
  };
  /** Install as the Import Add-ons window asks the tank to. */
  const install = (item, sessionId) => evalJs(
    `__probe.onBusMessage({ op: 'install', item: ${JSON.stringify(item)},
                            again: false })`, sessionId);
  const mutate = (op, u, sessionId) => evalJs(
    `__probe.onBusMessage({ op: '${op}', url: ${JSON.stringify(u)},
                            boot: __probe.boot })`, sessionId);
  /** Drop files on the page's window, as the Finder would. */
  const drop = (files, sessionId) => evalJs(`(() => {
    const dt = new DataTransfer();
    for (const [name, bytes] of ${JSON.stringify(files)})
      dt.items.add(new File([new Uint8Array(bytes)], name));
    window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt,
      bubbles: true, cancelable: true }));
  })()`, sessionId);
  const stored = (key, sessionId) => evalJs(`new Promise((done) => {
    const open = indexedDB.open('finsical');
    open.onsuccess = () => {
      const get = open.result.transaction('packs').objectStore('packs')
        .get(${JSON.stringify(key)});
      get.onsuccess = () => { done(get.result ? get.result.byteLength : 0);
                              open.result.close(); };
    };
  })`, sessionId);

  const tank = await openPage("/");
  await waitFor("!!window.__probe && __probe.settled()", tank);
  const RED = [200, 40, 40, 255], BLUE = [30, 60, 200, 255];
  const GREEN = [40, 160, 60, 255], CLEAR = [0, 0, 0, 0];

  await test("a PICT backdrop and a gravel fork install from the 7z", async () => {
    await install(items.moss, tank);
    await install(items.sand, tank);
    await waitFor(`__probe.addons().length === 2`, tank);
    const s = await evalJs("__probe.scenery()", tank);
    assert.equal(s.backdrop, items.moss.url);
    assert.equal(s.gravel, items.sand.url);
    assert.deepEqual(await evalJs("__probe.backdropPixel()", tank), RED);
    // White sky keyed out over the stones.
    assert.deepEqual(await evalJs("__probe.gravelPixels()", tank), [CLEAR, GREEN]);
    assert.deepEqual((await evalJs("__probe.records()", tank)).map((r) => r.inner),
                     ["苔", "星砂- star sand"]);
  });

  await test("both come back after a reload, offline, from the cache", async () => {
    offline = true;
    const before = fetched.length;
    await reload(tank);
    const back = await evalJs("__probe.scenery()", tank);
    assert.deepEqual([back.backdrop, back.gravel],
                     [items.moss.url, items.sand.url]);
    assert.deepEqual(await evalJs("__probe.backdropPixel()", tank), RED);
    // Nothing reached archive.org: listing pages aside, every request
    // since the reload was refused, and the art still came back.
    assert.ok(fetched.slice(before).every((f) => f.offline));
    offline = false;
  });

  await test("Use switches between installed backdrops and the choice persists",
    async () => {
      await install(items.blue, tank);
      await waitFor(`__probe.scenery().backdrop === ${JSON.stringify(items.blue.url)}`,
                    tank);
      assert.deepEqual(await evalJs("__probe.backdropPixel()", tank), BLUE);
      await mutate("useAddon", items.moss.url, tank);
      assert.equal((await evalJs("__probe.scenery()", tank)).backdrop,
                   items.moss.url);
      await reload(tank);
      // The restore shows each backdrop as it lands, then puts the
      // chosen one back once the last add-on is in.
      assert.equal((await evalJs("__probe.scenery()", tank)).backdrop,
                   items.moss.url);
      assert.deepEqual(await evalJs("__probe.backdropPixel()", tank), RED);
    });

  await test("Remove takes the scenery and its record away for good", async () => {
    await mutate("removeAddon", items.moss.url, tank);
    await mutate("removeAddon", items.sand.url, tank);
    const s = await evalJs("__probe.scenery()", tank);
    assert.equal(s.backdrop, items.blue.url); // the newest survivor
    assert.equal(s.gravel, "");
    assert.ok(!JSON.stringify(s.choice).includes(items.moss.url));
    assert.ok(!JSON.stringify(s.choice).includes(items.sand.url));
    await reload(tank);
    assert.deepEqual(await evalJs("__probe.addons()", tank), [items.blue.url]);
    assert.equal((await evalJs("__probe.scenery()", tank)).gravel, "");
  });

  await test("a dropped PICT file and gravel fork stay, and leave with Remove",
    async () => {
      await drop([["Reef.pct", [...RED_BACKDROP]],
                  ["._Pebbles", [...GRAVEL]]], tank);
      await waitFor(`__probe.addons().includes('local:Reef.pct') &&
                     __probe.addons().includes('local:._Pebbles')`, tank);
      const s = await evalJs("__probe.scenery()", tank);
      assert.deepEqual([s.backdrop, s.gravel],
                       ["local:Reef.pct", "local:._Pebbles"]);
      const recs = await evalJs("__probe.records()", tank);
      assert.deepEqual(recs.filter((r) => r.url.startsWith("local:"))
                         .map((r) => [r.section, r.inner]),
                       [["backgrounds", "Reef"], ["gravel", "Pebbles"]]);
      assert.equal(await stored("local:Reef.pct", tank), RED_BACKDROP.length);
      await reload(tank);
      const back = await evalJs("__probe.scenery()", tank);
      assert.deepEqual([back.backdrop, back.gravel],
                       ["local:Reef.pct", "local:._Pebbles"]);
      await mutate("removeAddon", "local:Reef.pct", tank);
      await mutate("removeAddon", "local:._Pebbles", tank);
      await waitFor(`!__probe.addons().some(u => u.startsWith('local:'))`, tank);
      await sleep(200);
      assert.equal(await stored("local:Reef.pct", tank), 0);
      assert.equal(await stored("local:._Pebbles", tank), 0);
    });

  await test("a picture the tank can't use earns the drop's note", async () => {
    await drop([["Tiny.pct", [...pict(40, 30, () => 1, true)]]], tank);
    await waitFor(`__probe.dropText().includes("can't use that picture")`, tank);
    assert.ok(!(await evalJs("__probe.addons()", tank)).includes("local:Tiny.pct"));
  });

  await test("the Import Add-ons window's drop puts a picture in the tank",
    async () => {
      const window2 = await openPage("/addons.html");
      // The window waits for a state push before it calls the tank
      // connected.
      await waitFor("document.readyState === 'complete'", window2);
      await sleep(1500);
      await drop([["Wall.pict", [...BLUE_BACKDROP]]], window2);
      await waitFor(`__probe.addons().includes('local:Wall.pict')`, tank);
      assert.equal((await evalJs("__probe.scenery()", tank)).backdrop,
                   "local:Wall.pict");
      await mutate("removeAddon", "local:Wall.pict", tank);
      await waitFor(`!__probe.addons().includes('local:Wall.pict')`, tank);
    });
} finally {
  await chrome?.close();
  server.close();
  removeTemp(temp);
}

if (errors.length) failures.push("page exceptions: " + errors.join(" | "));
if (failures.length) {
  console.error(`${failures.length} failed:\n` + failures.join("\n"));
  process.exit(1);
}
console.log(`${passed.length} Mac scenery scenarios passed`);
