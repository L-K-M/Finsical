// Tank > Arrange Decorations end to end: real pointer and key input on
// the tank page drags a plant along the floor, the move saves per copy,
// a restore puts each copy back, and arranging neither knocks nor feeds.
// Set FINSICAL_CHROMIUM to a Chrome/Chromium binary, as for
// verify-caustics.
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { constants as HTTP } from "node:http2";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";
import { BROWSER_TIMEOUT_MS, findBrowser, removeTemp, startBrowser }
  from "./lib/browser.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const WEB = join(ROOT, "web");
assert.equal(typeof WebSocket, "function",
             "verify:arrange needs Node.js 22+");
const browser = findBrowser();

// The production module is instrumented only inside the test bundle:
// the probe hands out module-scope internals without widening the
// shipped API. Decor goes in through handleImages, the function the
// add-on restore and live installs both call.
const probe = `
window.__probe = {
  handleImages, decors, installedAddons, tankSnapshot, setArrange, sim,
  ripples, tankToClient, pictureRect, SAVE_KEY, render, setPaused,
  removeAddon, showAlert,
  get arranging() { return arranging; },
  get holding() { return arrangeDrag !== null; },
  get cursor() { return canvas.style.cursor; },
};`;
const contents = await readFile(join(WEB, "main.ts"), "utf8");
const bundle = buildSync({
  stdin: { contents: contents + probe, resolveDir: WEB,
           sourcefile: "main.ts", loader: "ts" },
  bundle: true, format: "iife", write: false,
}).outputFiles[0].text;

// A quiet starting tank: no boot parade, no welcome, no CRT (its warp
// is covered by crt.test.ts), lit all day, and an empty floor.
const fixture = `
if (!localStorage.getItem('__fixture')) {
  localStorage.setItem('__fixture', '1');
  localStorage.setItem('finsical:machine', 'plus');
  localStorage.setItem('finsical:welcomed', 'declined');
  localStorage.setItem('finsical:starterSounds', '1');
  localStorage.setItem('finsical:boot', 'off');
  localStorage.setItem('finsical:crt', '0');
  localStorage.setItem('finsical:lighting',
    JSON.stringify({ mode: 'always', on: 8, off: 22, lamp: true }));
}
`;

const types = { ".html": "text/html", ".css": "text/css",
  ".js": "text/javascript", ".png": "image/png", ".svg": "image/svg+xml" };
const indexHtml = (await readFile(join(WEB, "index.html"), "utf8"))
  .replace('<script src="bundle.js">',
           '<script src="fixture.js"></script><script src="bundle.js">');
assert.notEqual(indexHtml.indexOf("fixture.js"), -1,
                "index.html no longer loads bundle.js directly");
const osmiumCss =
  await readFile(join(ROOT, "node_modules/osmium-ui/osmium.css"));
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  response.setHeader("Cache-Control", "no-store");
  if (pathname === "/bundle.js") {
    response.setHeader("Content-Type", "text/javascript");
    response.end(bundle); return;
  }
  if (pathname === "/fixture.js") {
    response.setHeader("Content-Type", "text/javascript");
    response.end(fixture); return;
  }
  if (pathname === "/osmium.css") {
    response.setHeader("Content-Type", "text/css");
    response.end(osmiumCss); return;
  }
  const file = resolve(WEB, "." + (pathname === "/" ? "/index.html" : pathname));
  if (!file.startsWith(WEB + "/")) {
    response.writeHead(HTTP.HTTP_STATUS_FORBIDDEN); response.end(); return;
  }
  try {
    const data = file.endsWith("index.html")
      ? indexHtml : await readFile(file);
    response.setHeader("Content-Type",
      types[extname(file)] ?? "application/octet-stream");
    response.end(data);
  } catch { response.writeHead(HTTP.HTTP_STATUS_NOT_FOUND); response.end(); }
});

// Decor art: a w x h image keyed on index 0 at the border, solid
// index 1 inside. In page code, since IndexedImage holds a Uint8Array.
const art = `((w, h) => {
  const idx = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) idx.fill(1, y * w + 1, y * w + w - 1);
  return [{ w, h, palette: [[0, 0, 0], [40, 160, 60]], idx }];
})`;
const PLANT = "https://example.invalid/verify/Reed.plt";
const ROCK = "https://example.invalid/verify/Rock.acc";
const OLD = "https://example.invalid/verify/Old.plt";

const temp = mkdtempSync(join(tmpdir(), "finsical-arrange-"));
const errors = [], failures = [], passed = [];
let chrome;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function test(name, run) {
  try { await run(); passed.push(name); console.log("PASS: " + name); }
  catch (error) {
    failures.push(name + ": " + error.message);
    console.log("FAIL: " + failures.at(-1));
  }
}
try {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  chrome = startBrowser(browser, join(temp, "profile"));
  const call = await chrome.connect((message) => {
    if (message.method !== "Runtime.exceptionThrown") return;
    const d = message.params.exceptionDetails;
    errors.push(d.exception?.description ?? d.text);
  });
  const { targetId } = await call("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await call("Target.attachToTarget",
    { targetId, flatten: true });
  await call("Runtime.enable", {}, sessionId);
  await call("Emulation.setDeviceMetricsOverride", {
    width: 1000, height: 760, deviceScaleFactor: 1, mobile: false,
  }, sessionId);
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
    await waitFor("!!(window.__probe && document.querySelector('#shell image'))");
  };
  /** Client px of decor copy `i`'s centre, `dy` tank px above its foot. */
  const decorClient = (i, dy = 4) => evalJs(`(() => {
    const p = __probe, d = p.decors[${i}], f = d.frames[0];
    const y = 200 - 6 - Math.min(${dy}, f.height - 2);
    return p.tankToClient(d.x, y, p.pictureRect());
  })()`);
  /** Client px per tank px, from the picture's box. */
  const scale = () => evalJs(`(() => {
    const p = __probe;
    return p.tankToClient(1, 0, p.pictureRect()).x -
           p.tankToClient(0, 0, p.pictureRect()).x;
  })()`);
  const mouse = (type, { x, y }, buttons = 0) =>
    call("Input.dispatchMouseEvent", {
      type, x, y, button: type === "mouseMoved" && !buttons ? "none" : "left",
      buttons, clickCount: type === "mouseMoved" ? 0 : 1,
    }, sessionId);
  /** Press at `from`, move to `to` in steps, and maybe release. */
  const drag = async (from, to, release = true) => {
    await mouse("mouseMoved", from);
    await mouse("mousePressed", from, 1);
    for (let k = 1; k <= 5; k++)
      await mouse("mouseMoved", { x: from.x + (to.x - from.x) * k / 5,
                                  y: from.y + (to.y - from.y) * k / 5 }, 1);
    if (release) await mouse("mouseReleased", to);
  };
  const key = async (k, code) => {
    for (const type of ["keyDown", "keyUp"])
      await call("Input.dispatchKeyEvent", {
        type, key: k, code, windowsVirtualKeyCode: k === "Escape" ? 27 : 0,
      }, sessionId);
  };
  const savedPlaces = (u) => evalJs(`(() => {
    const t = JSON.parse(localStorage.getItem(__probe.SAVE_KEY) ?? 'null');
    return t?.addons?.find(a => a.url === ${JSON.stringify(u)})?.places
      ?? null;
  })()`);
  const xs = () => evalJs("__probe.decors.map(d => d.x)");

  await load();

  await test("an empty floor refuses to arrange and says why", async () => {
    assert.equal(await evalJs("__probe.setArrange(true)"), false);
    assert.equal(await evalJs("__probe.arranging"), false);
    // dropSay() writes on the next frame, so a live region speaks.
    await waitFor(
      "/nothing to arrange/.test(document.getElementById('dropmsg').textContent)");
  });

  await test("a save from before positions keeps its even layout",
    async () => {
      // Eight 40 px copies tiled the 320 px floor edge to edge.
      await evalJs(`(() => {
        const p = __probe;
        p.installedAddons.push({ section: 'plants', inner: 'Old',
          url: ${JSON.stringify(OLD)}, copies: 8 });
        p.handleImages(${art}(80, 60), ${JSON.stringify(OLD)}, 'plants',
                       false, 8, undefined);
      })()`);
      assert.deepEqual(await evalJs("__probe.decors.map(d => d.frames[0].width)"),
                       Array(8).fill(40));
      assert.deepEqual(await xs(), [20, 60, 100, 140, 180, 220, 260, 300]);
      await evalJs(`__probe.removeAddon(${JSON.stringify(OLD)})`);
      assert.equal(await evalJs("__probe.decors.length"), 0);
    });

  await test("a restore puts each copy where the save left it", async () => {
    await evalJs(`(() => {
      const p = __probe;
      p.installedAddons.push({ section: 'plants', inner: 'Reed',
        url: ${JSON.stringify(PLANT)}, copies: 3, places: [60, 'bad', 250] });
      p.handleImages(${art}(40, 120), ${JSON.stringify(PLANT)}, 'plants',
                     false, 3, p.installedAddons.at(-1).places);
    })()`);
    const [a, b, c] = await xs();
    assert.equal(a, 60);
    assert.equal(c, 250);
    // The bad entry's copy went into the widest gap, between the two.
    assert.ok(b > 60 && b < 250, `copy 1 at ${b}`);
  });

  await test("a live add takes the widest gap and moves nothing", async () => {
    const before = await xs();
    await evalJs(`(() => {
      const p = __probe;
      p.installedAddons.push({ section: 'accessories', inner: 'Rock',
        url: ${JSON.stringify(ROCK)} });
      p.handleImages(${art}(30, 30), ${JSON.stringify(ROCK)},
                     'accessories', true);
    })()`);
    const after = await xs();
    assert.deepEqual(after.slice(0, 3), before);
    assert.equal(after.length, 4);
    const w = await evalJs("__probe.decors.map(d => d.frames[0].width)");
    // No overlap with any piece already on the floor.
    for (let i = 0; i < 3; i++)
      assert.ok(Math.abs(after[3] - after[i]) >= (w[3] + w[i]) / 2,
                `rock at ${after[3]} overlaps copy ${i} at ${after[i]}`);
  });

  await test("dragging outside Arrange knocks and moves nothing", async () => {
    const before = await xs();
    const ripples = await evalJs("__probe.ripples.length");
    const from = await decorClient(0);
    await drag(from, { x: from.x + 40, y: from.y });
    assert.deepEqual(await xs(), before);
    assert.ok(await evalJs("__probe.ripples.length") > ripples,
              "a press in the water should still knock");
  });

  await test("the menu toggle turns arranging on", async () => {
    assert.equal(await evalJs("__probe.setArrange(true)"), true);
    assert.equal(await evalJs("__probe.arranging"), true);
    const from = await decorClient(0);
    await mouse("mouseMoved", from);
    assert.equal(await evalJs("__probe.cursor"), "grab");
  });

  await test("a drag moves one piece sideways and saves it", async () => {
    const before = await xs();
    const food = await evalJs("__probe.sim.food.length");
    const ripples = await evalJs("__probe.ripples.length");
    const s = await scale();
    const from = await decorClient(0);
    await drag(from, { x: from.x + 50 * s, y: from.y - 20 * s });
    const after = await xs();
    assert.ok(Math.abs(after[0] - (before[0] + 50)) <= 1,
              `moved from ${before[0]} to ${after[0]}, wanted +50`);
    assert.deepEqual(after.slice(1), before.slice(1));
    assert.equal(await evalJs("__probe.holding"), false);
    assert.equal(await evalJs("__probe.sim.food.length"), food);
    assert.equal(await evalJs("__probe.ripples.length"), ripples,
                 "arranging must not knock");
    const places = await savedPlaces(PLANT);
    assert.deepEqual(places, after.slice(0, 3));
  });

  await test("the sim's cover follows the piece", async () => {
    const [cover, left] = await evalJs(`(() => {
      const p = __probe, d = p.decors[0], w = d.frames[0].width;
      return [p.sim.cover[0].x0, Math.round(d.x - w / 2)];
    })()`);
    assert.equal(cover, left);
  });

  await test("a press on empty water or the air does nothing", async () => {
    const food = await evalJs("__probe.sim.food.length");
    const ripples = await evalJs("__probe.ripples.length");
    const before = await xs();
    for (const ty of [80, 6]) {
      const p = await evalJs(
        `__probe.tankToClient(5, ${ty}, __probe.pictureRect())`);
      await mouse("mousePressed", p, 1);
      await mouse("mouseReleased", p);
    }
    assert.deepEqual(await xs(), before);
    assert.equal(await evalJs("__probe.sim.food.length"), food);
    assert.equal(await evalJs("__probe.ripples.length"), ripples);
  });

  await test("an alert opening mid-drag puts the piece back", async () => {
    const before = await xs();
    const saved = await savedPlaces(PLANT);
    const s = await scale();
    const from = await decorClient(1);
    await drag(from, { x: from.x + 30 * s, y: from.y }, false);
    assert.notDeepEqual(await xs(), before);
    await evalJs(`window.__alert = __probe.showAlert({ icon: 'note',
      text: 'mid-drag', buttons: [{ title: 'OK' }] })`);
    try {
      await mouse("mouseMoved", { x: from.x + 40 * s, y: from.y }, 1);
      await mouse("mouseReleased", { x: from.x + 40 * s, y: from.y });
      assert.equal(await evalJs("__probe.holding"), false);
      assert.deepEqual(await xs(), before);
      assert.deepEqual(await savedPlaces(PLANT), saved);
    } finally {
      await evalJs("window.__alert.close(); delete window.__alert");
    }
  });

  await test("Escape puts a piece in hand back, then ends arranging",
    async () => {
      const before = await xs();
      const saved = await savedPlaces(PLANT);
      const s = await scale();
      const from = await decorClient(2);
      await drag(from, { x: from.x - 60 * s, y: from.y }, false);
      assert.equal(await evalJs("__probe.holding"), true);
      assert.notDeepEqual(await xs(), before);
      await key("Escape", "Escape");
      assert.equal(await evalJs("__probe.holding"), false);
      assert.deepEqual(await xs(), before);
      await mouse("mouseReleased", from);
      assert.deepEqual(await xs(), before);
      assert.deepEqual(await savedPlaces(PLANT), saved);
      assert.equal(await evalJs("__probe.arranging"), true);
      await key("Escape", "Escape");
      assert.equal(await evalJs("__probe.arranging"), false);
    });

  await test("the saved layout comes back after a reload", async () => {
    const saved = await savedPlaces(PLANT);
    const rock = await savedPlaces(ROCK);
    assert.equal(saved.length, 3);
    assert.equal(rock.length, 1);
    await load();
    // The page's own restore would fetch the packs; replay it the way
    // applyPack does, from the reloaded save's records.
    await evalJs(`(() => {
      const p = __probe;
      for (const it of p.installedAddons) {
        const [w, h] = it.url === ${JSON.stringify(PLANT)} ? [40, 120]
          : [30, 30];
        p.handleImages(${art}(w, h), it.url, it.section, false,
                       it.copies ?? 1, it.places);
      }
    })()`);
    assert.deepEqual(await xs(), [...saved, ...rock]);
  });

  await test("arranging works paused, and a picture leaves the marquees out",
    async () => {
      await evalJs("__probe.setPaused(true)");
      assert.equal(await evalJs("__probe.setArrange(true)"), true);
      const before = await xs();
      const s = await scale();
      const from = await decorClient(3);
      await drag(from, { x: from.x - 30 * s, y: from.y });
      const after = await xs();
      assert.ok(Math.abs(after[3] - (before[3] - 30)) <= 1,
                `paused drag moved ${before[3]} to ${after[3]}`);
      // Frozen sim: two renders differ only by what arranging adds.
      // Pixels along copy 0's top edge, where its marquee runs.
      const shots = await evalJs(`(() => {
        const p = __probe, d = p.decors[0], f = d.frames[0];
        const x = Math.round(d.x - f.width / 2) + 2;
        const y = 200 - 6 - f.height;
        const c = document.getElementById('tank').getContext('2d');
        const now = new Date();
        const shot = (target) => {
          p.render(now, target);
          return [...c.getImageData(x, y, 8, 1).data].join();
        };
        const on = [shot('screen'), shot('picture')];
        p.setArrange(false);
        const off = [shot('screen'), shot('picture')];
        return { on, off };
      })()`);
      assert.notEqual(shots.on[0], shots.off[0],
                      "the screen should show the marquee");
      assert.equal(shots.on[1], shots.off[1],
                   "a picture must not show the marquee");
      await evalJs("__probe.setPaused(false)");
    });

  assert.deepEqual(errors, [], "page errors");
  assert.deepEqual(failures, [], failures.join("\n"));
  assert.equal(passed.length, 13, "Missing checks");
  console.log(`${passed.length} live arrange scenarios passed`);
} finally {
  await chrome?.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  removeTemp(temp);
}
