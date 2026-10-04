// AquaZone's Mac scenery end to end in a real browser: PICT backdrops
// and gravel forks from the main item's 7z install, draw, persist,
// restore offline from the cache, switch with Use and leave with
// Remove; dropped Mac pictures do the same through the tank and the
// Import Add-ons window, and the bundles tools/azpack.py makes of them
// show in the tank. archive.org is never contacted: CDP answers its
// URLs with pictures this script builds, so no AquaZone art is
// involved. Set FINSICAL_CHROMIUM to a Chrome/Chromium binary, as for
// the other verify scripts; the azpack step needs python3.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
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
 * table. `file` adds a data-fork file's 512-byte header, which an app
 * fills as it likes: this one starts with text. */
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
  const header = [..."Finsical test PICT"].map((c) => c.charCodeAt(0));
  return Uint8Array.from([
    ...(file ? [...header, ...new Array(512 - header.length).fill(0)] : []),
    ...out]);
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
// tank keys out) over green. Its catalog picture is all blue, at
// AquaZone's 373 by 209: the size of a backdrop, which it must never
// become.
const RED_BACKDROP = pict(320, 200, () => 1, true);
const BLUE_BACKDROP = pict(320, 200, () => 3, true);
const GRAVEL = appleDouble(fork({
  Grvl: [[4020, [0, 53, 0, 52, 0, 0, 0, 0]]],
  BADP: [[4020, pict(373, 209, () => 3)]],
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
  onBusMessage, boot, packPut, recordInstall, settled: () => settled,
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
// The .azpack the tank loads from pack/ at launch: none, unless a
// scenario puts an azpack.py bundle there.
let packDir = null;
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  response.setHeader("Cache-Control", "no-store");
  const send = (type, body) => {
    response.setHeader("Content-Type", type); response.end(body);
  };
  if (pathname.startsWith("/pack/")) {
    const file = packDir && resolve(packDir, "." + pathname.slice(5));
    try {
      if (!file?.startsWith(packDir + "/")) throw new Error("outside");
      return send("application/octet-stream", await readFile(file));
    } catch { response.writeHead(404); response.end(); return; }
  }
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
  /** A page at `path`; `browserContextId` gives it a profile of its own. */
  const openPage = async (path, browserContextId) => {
    const { targetId } = await call("Target.createTarget", {
      url: "about:blank", ...browserContextId ? { browserContextId } : {} });
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
  /** The bytes stored under `key`, 0 when none; opening no database a
   * page hasn't made itself. */
  const stored = (key, sessionId) => evalJs(`(async () => {
    const dbs = await indexedDB.databases();
    if (!dbs.some((d) => d.name === 'finsical')) return 0;
    return new Promise((done, fail) => {
      const open = indexedDB.open('finsical');
      open.onerror = () => fail(open.error);
      open.onsuccess = () => {
        try {
          const get = open.result.transaction('packs').objectStore('packs')
            .get(${JSON.stringify(key)});
          get.onsuccess = () => { done(get.result ? get.result.byteLength : 0);
                                  open.result.close(); };
          get.onerror = () => fail(get.error);
        } catch (error) { fail(error); }
      };
    });
  })()`, sessionId);
  /** Wait until `key` holds `want` bytes: deletes land asynchronously. */
  const waitStored = async (key, sessionId, want) => {
    const deadline = Date.now() + BROWSER_TIMEOUT_MS;
    while (await stored(key, sessionId) !== want) {
      if (Date.now() > deadline)
        throw new Error(`timed out waiting for ${key} to hold ${want} bytes`);
      await sleep(25);
    }
  };
  /** Store bytes as the Import Add-ons window does, then ask the tank
   * to put them in; `then` runs in the same task, before the tank has
   * read them back. */
  const putAndAsk = (url, bytes, inner, sessionId, then = "",
                     section = "backgrounds") => evalJs(`
    __probe.packPut(${JSON.stringify(url)},
                    new Uint8Array(${JSON.stringify(bytes)})).then(() => {
      __probe.onBusMessage({ op: 'installDropped', url: ${JSON.stringify(url)},
                             section: ${JSON.stringify(section)},
                             inner: ${JSON.stringify(inner)} });
      ${then}
    })`, sessionId);

  const tank = await openPage("/");
  await waitFor("!!window.__probe && __probe.settled()", tank);
  const RED = [200, 40, 40, 255], BLUE = [30, 60, 200, 255];
  const GREEN = [40, 160, 60, 255], CLEAR = [0, 0, 0, 0];

  /** The Import Add-ons window, once the tank's state push says it is
   * connected. */
  const openWindow = async (browserContextId) => {
    const page = await openPage("/addons.html", browserContextId);
    await waitFor("document.readyState === 'complete'", page);
    if (browserContextId) return page;
    await evalJs(`window.__state = false;
      new BroadcastChannel('finsical').onmessage = (e) => {
        if (e.data?.op === 'state') window.__state = true; };`, page);
    await waitFor("window.__state", page);
    return page;
  };
  /** Bytes stored under `key` as the app stores them, last touched at
   * `at` (ms). */
  const seedStored = (key, bytes, at, sessionId) => evalJs(`
    new Promise((done, fail) => {
      const open = indexedDB.open('finsical');
      open.onerror = () => fail(open.error);
      open.onsuccess = () => {
        const tx = open.result.transaction(['packs', 'meta'], 'readwrite');
        tx.objectStore('packs').put(new Uint8Array(${JSON.stringify(bytes)}),
                                    ${JSON.stringify(key)});
        tx.objectStore('meta').put({ bytes: ${bytes.length}, at: ${at} },
                                   'packstat:' + ${JSON.stringify(key)});
        tx.oncomplete = () => { open.result.close(); done(true); };
        tx.onerror = () => fail(tx.error);
      };
    })`, sessionId);
  /** Wrap IndexedDB's put in a page: `body` runs after each put with
   * `key`, `value`, the request `rq` and the store `os` in scope, and
   * may return a value to store instead (checked before the put). */
  const hookPut = (sessionId, { swap = "", after = "" }) => evalJs(`(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      const os = this;
      ${swap}
      const rq = put.call(this, value, key);
      ${after}
      return rq;
    };
  })()`, sessionId);

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
    try {
      await reload(tank);
      const back = await evalJs("__probe.scenery()", tank);
      assert.deepEqual([back.backdrop, back.gravel],
                       [items.moss.url, items.sand.url]);
      assert.deepEqual(await evalJs("__probe.backdropPixel()", tank), RED);
      // Nothing reached archive.org: listing pages aside, every request
      // since the reload was refused, and the art still came back.
      assert.ok(fetched.slice(before).every((f) => f.offline));
    } finally { offline = false; } // a failure mustn't cut off the rest
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
      await waitStored("local:Reef.pct", tank, 0);
      await waitStored("local:._Pebbles", tank, 0);
    });

  await test("a picture the tank can't use earns the drop's note", async () => {
    await drop([["Tiny.pct", [...pict(40, 30, () => 1, true)]]], tank);
    await waitFor(`__probe.dropText().includes("can't use that picture")`, tank);
    assert.ok(!(await evalJs("__probe.addons()", tank)).includes("local:Tiny.pct"));
  });

  await test("the Import Add-ons window's drop puts a picture in the tank",
    async () => {
      const window2 = await openWindow();
      await drop([["Wall.pict", [...BLUE_BACKDROP]]], window2);
      await waitFor(`__probe.addons().includes('local:Wall.pict')`, tank);
      assert.equal((await evalJs("__probe.scenery()", tank)).backdrop,
                   "local:Wall.pict");
      await mutate("removeAddon", "local:Wall.pict", tank);
      await waitFor(`!__probe.addons().includes('local:Wall.pict')`, tank);
    });

  await test("the Import Add-ons window stores nothing with no tank running",
    async () => {
      const { browserContextId } = await call("Target.createBrowserContext");
      const lone = await openWindow(browserContextId);
      await drop([["Wall.pict", [...BLUE_BACKDROP]]], lone);
      await waitFor(`document.body.textContent.includes(
        "The tank isn't running")`, lone);
      assert.equal(await stored("local:Wall.pict", lone), 0);
    });

  await test("a picture of another kind under the same name replaces it",
    async () => {
      // An extensionless Mac file can be a gravel one day and a
      // backdrop the next.
      await drop([["Ocean", [...GRAVEL]]], tank);
      await waitFor(`__probe.scenery().gravel === 'local:Ocean'`, tank);
      await drop([["Ocean", [...BLUE_BACKDROP]]], tank);
      await waitFor(`__probe.scenery().backdrop === 'local:Ocean'`, tank);
      const ocean = async () => (await evalJs("__probe.records()", tank))
        .filter((r) => r.url === "local:Ocean").map((r) => r.section);
      assert.deepEqual(await ocean(), ["backgrounds"]);
      assert.notEqual((await evalJs("__probe.scenery()", tank)).gravel,
                      "local:Ocean");
      await reload(tank);
      const back = await evalJs("__probe.scenery()", tank);
      assert.deepEqual([back.backdrop === "local:Ocean",
                        back.gravel === "local:Ocean"], [true, false]);
      await mutate("removeAddon", "local:Ocean", tank);
      await waitFor(`!__probe.addons().includes('local:Ocean')`, tank);
    });

  await test("a window drop of another kind under the same name replaces it",
    async () => {
      await putAndAsk("local:Tide", [...BLUE_BACKDROP], "Tide", tank);
      await waitFor(`__probe.scenery().backdrop === 'local:Tide'`, tank);
      await putAndAsk("local:Tide", [...GRAVEL], "Tide", tank, "", "gravel");
      await waitFor(`__probe.scenery().gravel === 'local:Tide'`, tank);
      assert.deepEqual((await evalJs("__probe.records()", tank))
        .filter((r) => r.url === "local:Tide").map((r) => r.section),
                       ["gravel"]);
      assert.notEqual((await evalJs("__probe.scenery()", tank)).backdrop,
                      "local:Tide");
      await mutate("removeAddon", "local:Tide", tank);
      await waitFor(`!__probe.addons().includes('local:Tide')`, tank);
    });

  await test("two requests for one name keep the bytes the second reads",
    async () => {
      // The first fails (backdrop bytes asked in as gravel); its cleanup
      // must leave the bytes to the second, already queued.
      await putAndAsk("local:Twin", [...BLUE_BACKDROP], "Twin", tank,
        "__probe.onBusMessage({ op: 'installDropped', url: 'local:Twin', " +
        "section: 'backgrounds', inner: 'Twin' });", "gravel");
      await waitFor(`__probe.addons().includes('local:Twin')`, tank);
      await sleep(300); // the failed request's cleanup has run by now
      assert.equal(await stored("local:Twin", tank), BLUE_BACKDROP.length);
      await mutate("removeAddon", "local:Twin", tank);
      await waitFor(`!__probe.addons().includes('local:Twin')`, tank);
    });

  await test("a Remove of a record made while the tank reads wins", async () => {
    // The add-on appears and is removed while the request's read is in
    // flight: the Remove deleted the bytes it read.
    await putAndAsk("local:Late", [...BLUE_BACKDROP], "Late", tank,
      "__probe.recordInstall({ section: 'backgrounds', inner: 'Late', " +
      "url: 'local:Late' }); __probe.onBusMessage({ op: 'removeAddon', " +
      "url: 'local:Late', boot: __probe.boot });");
    await waitStored("local:Late", tank, 0);
    await sleep(100); // the request settles after its read
    assert.ok(!(await evalJs("__probe.addons()", tank)).includes("local:Late"));
  });

  await test("a Remove while the tank reads a re-drop wins", async () => {
    await putAndAsk("local:Shell", [...BLUE_BACKDROP], "Shell", tank);
    await waitFor(`__probe.addons().includes('local:Shell')`, tank);
    await putAndAsk("local:Shell", [...RED_BACKDROP], "Shell", tank,
      "__probe.onBusMessage({ op: 'removeAddon', url: 'local:Shell', " +
      "boot: __probe.boot });");
    await waitStored("local:Shell", tank, 0);
    await sleep(100); // the request settles after its read
    assert.ok(!(await evalJs("__probe.addons()", tank)).includes("local:Shell"));
  });

  await test("the Import Add-ons window says how its drop went", async () => {
    const window3 = await openWindow();
    // Bad.pict's stored bytes turn to junk, so the tank can't add it.
    await hookPut(window3, { swap:
      "if (key === 'local:Bad.pict') value = new Uint8Array([1, 2, 3]);" });
    await drop([["Wall3.pict", [...BLUE_BACKDROP]],
                ["Bad.pict", [...RED_BACKDROP]]], window3);
    await waitFor(`document.body.textContent.includes("Added Wall3") &&
                   document.body.textContent.includes("Couldn't add Bad")`,
                  window3);
    await waitStored("local:Bad.pict", tank, 0);
    await mutate("removeAddon", "local:Wall3.pict", tank);
    await waitFor(`!__probe.addons().includes('local:Wall3.pict')`, tank);
  });

  await test("the Import Add-ons window names every problem with a drop",
    async () => {
      const window4 = await openWindow();
      // Full.pict's write fails, as on a full disk.
      await hookPut(window4, { after:
        "if (key === 'local:Full.pict') os.transaction.abort();" });
      await drop([["Tiny.pct", [...pict(40, 30, () => 1, true)]],
                  ["Full.pict", [...BLUE_BACKDROP]]], window4);
      await waitFor(`document.body.textContent.includes(
                       "can't use that picture") &&
                     document.body.textContent.includes("Couldn't save")`,
                    window4);
    });

  await test("a Remove while the tank stores its own drop wins", async () => {
    await drop([["Racer.pct", [...BLUE_BACKDROP]]], tank);
    await waitFor(`__probe.addons().includes('local:Racer.pct')`, tank);
    // The Remove lands right after the re-drop's write is asked for.
    await evalJs("window.__race = true", tank);
    await hookPut(tank, { after: `
      if (key === 'local:Racer.pct' && window.__race) {
        window.__race = false;
        queueMicrotask(() => __probe.onBusMessage({ op: 'removeAddon',
          url: 'local:Racer.pct', boot: __probe.boot }));
      }` });
    await drop([["Racer.pct", [...RED_BACKDROP]]], tank);
    await waitStored("local:Racer.pct", tank, 0);
    await sleep(200); // the drop settles after its write
    assert.ok(!(await evalJs("__probe.addons()", tank)).includes("local:Racer.pct"));
  });

  await test("files no add-on owns leave the store at launch", async () => {
    const hourAgo = Date.now() - 3_600_000;
    await seedStored("local:Orphan.pct", [...BLUE_BACKDROP], hourAgo, tank);
    // A window drop on its way: stored moments ago, not yet asked in.
    await seedStored("local:Fresh.pct", [...BLUE_BACKDROP], Date.now(), tank);
    await drop([["Kept.pct", [...RED_BACKDROP]]], tank);
    await waitFor(`__probe.addons().includes('local:Kept.pct')`, tank);
    await reload(tank);
    await waitStored("local:Orphan.pct", tank, 0);
    assert.equal(await stored("local:Fresh.pct", tank), BLUE_BACKDROP.length);
    assert.equal(await stored("local:Kept.pct", tank), RED_BACKDROP.length);
    await mutate("removeAddon", "local:Kept.pct", tank);
    await waitFor(`!__probe.addons().includes('local:Kept.pct')`, tank);
  });

  await test("the tank keeps no bytes from a window drop it doesn't add",
    async () => {
      await putAndAsk("local:Junk", [1, 2, 3], "Junk", tank);
      await putAndAsk("local:Nameless", [...BLUE_BACKDROP], "", tank);
      // Last: Empty Tank lands while the tank reads the bytes.
      await putAndAsk("local:Gone", [...BLUE_BACKDROP], "Gone", tank,
        "__probe.onBusMessage({ op: 'emptyTank', boot: __probe.boot });");
      for (const key of ["local:Junk", "local:Nameless", "local:Gone"])
        await waitStored(key, tank, 0);
      assert.deepEqual(await evalJs("__probe.addons()", tank), []);
    });

  await test("azpack.py's bundles of the same files show in the tank",
    async () => {
      const cli = join(temp, "cli");
      mkdirSync(cli);
      writeFileSync(join(cli, "Reef.pct"), RED_BACKDROP);
      writeFileSync(join(cli, "._Pebbles"), GRAVEL);
      execFileSync("python3", [join(ROOT, "tools", "azpack.py"),
                               join(cli, "Reef.pct"), join(cli, "._Pebbles"),
                               "-o", join(cli, "out")]);
      // A profile of its own, which the other scenarios' add-ons don't
      // restore into.
      const { browserContextId } = await call("Target.createBrowserContext");
      packDir = join(cli, "out", "Reef");
      const page = await openPage("/", browserContextId);
      await waitFor("!!window.__probe && __probe.settled()", page);
      assert.deepEqual(await evalJs("__probe.backdropPixel()", page), RED);
      packDir = join(cli, "out", "Pebbles");
      await reload(page);
      assert.deepEqual(await evalJs("__probe.gravelPixels()", page),
                       [CLEAR, GREEN]);
      // The fork's catalog picture, backdrop-sized, didn't become one.
      assert.strictEqual(await evalJs("__probe.backdropPixel()", page), null);
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
