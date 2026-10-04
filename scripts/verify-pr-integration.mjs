// The tank page's cross-window contract — deferred machine commits,
// client state pushes, owner/spectator persistence — needs a real
// browser. Set FINSICAL_CHROMIUM to a Chrome/Chromium binary, as for
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
             "verify:pr-integration needs Node.js 22+");
const browser = findBrowser();

// The production module is instrumented only inside the test bundle:
// the probe appends handles to module-scope internals without widening
// the shipped API.
const probe = `
window.__probe = {
  sim, audio, tankOwner, onBusMessage, tankSnapshot, tickSim, feedFish,
  applySoundConfig, applyLighting, applyEffects, setNames, setCrt, setPaused,
  toggleAutoFeed, openInfo, render, noteGlassTap, addMedicine, showAlert, alertOpen,
  machineId: () => machine.id, machineAsset: id => machineById(id).image,
  expireFocus: () => { focusId = sim.fish[0].id; focusAt = -Infinity; },
  focusId: () => focusId,
  configKeys: [LIGHTING_KEY, CRT_KEY, CRT_CFG_KEY, SOUND_KEY, EFFECTS_KEY,
    NAMES_KEY, AUTOFEED_KEY, CHANGE_KEY, MACHINE_KEY, SCOLD_KEY, HINTS_KEY, BOOT_KEY],
  watchStates: () => {
    const messages = [], c = new BroadcastChannel('finsical');
    c.onmessage = e => { if (e.data.op === 'state') messages.push(e.data); };
    window.__states = messages;
  },
  // The startup preference reads, and what each sanitizer makes of
  // nothing stored.
  startupPrefs: () => ({
    bootEnabled, scoldOn, hintsOn, paused, namesOn, autoFeed, waterChangeCfg,
    lighting, soundCfg, effects, crtCfg,
    defaults: { lighting: sanitizeLighting(null),
      soundCfg: loadSoundConfig(null), effects: sanitizeEffects(null),
      crtCfg: sanitizeCrtConfig(null), heater: sim.aquarium.heater.target },
  }),
};`;
const contents = await readFile(join(WEB, "main.ts"), "utf8");
const bundle = buildSync({
  stdin: { contents: contents + probe, resolveDir: WEB,
           sourcefile: "main.ts", loader: "ts" },
  bundle: true, format: "iife", write: false,
}).outputFiles[0].text;

// Runs before bundle.js in every tank window. The first window seeds a
// quiet starting state; every window records which preferences its own
// realm writes so a spectator's edits are observable.
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
const put = Storage.prototype.setItem;
window.__writes = [];
Storage.prototype.setItem = function(key, value) {
  window.__writes.push(key); return put.call(this, key, value);
};
`;

// Delayed asset transport: a held pathname stalls its HTTP response
// (a real in-flight image request) until released, which is what makes
// a pending machine commit observable instead of instant.
const holds = new Map();
function holdAsset(pathname) {
  const entry = {};
  entry.started = new Promise((resolve) => (entry.notify = resolve));
  entry.gate = new Promise((resolve) => (entry.release = resolve));
  entry.releaseNow = () => { holds.delete(pathname); entry.release(); };
  holds.set(pathname, entry);
  return entry;
}

const types = { ".html": "text/html", ".css": "text/css",
  ".js": "text/javascript", ".png": "image/png", ".svg": "image/svg+xml" };
const indexHtml = (await readFile(join(WEB, "index.html"), "utf8"))
  .replace('<script src="bundle.js">',
           '<script src="fixture.js"></script><script src="bundle.js">');
assert.notEqual(indexHtml.indexOf("fixture.js"), -1,
                "index.html no longer loads bundle.js directly");
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  const held = holds.get(pathname);
  if (held) { held.notify(); await held.gate; }
  // no-store keeps heuristic caching out; repeat image URLs still
  // resolve from the renderer's memory cache, so tests hold only
  // assets that were never fetched before.
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
    response.end(await readFile(
      join(ROOT, "node_modules/osmium-ui/osmium.css"))); return;
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

const temp = mkdtempSync(join(tmpdir(), "finsical-pr-integration-"));
const errors = [], failures = [], passed = [];
let chrome;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function timed(promise, what) {
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(what + " timed out")),
                       BROWSER_TIMEOUT_MS);
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}
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
  // about:blank first so emulation applies before the bundle's
  // module-level matchMedia reads, then navigate.
  const openPage = async (reduceMotion) => {
    const { targetId } = await call("Target.createTarget", {
      url: "about:blank",
    });
    const { sessionId } = await call("Target.attachToTarget",
      { targetId, flatten: true });
    await call("Runtime.enable", {}, sessionId);
    // Tab creation has no window-position options in full Chrome.
    await call("Emulation.setDeviceMetricsOverride", {
      width: 1000, height: 760, deviceScaleFactor: 1, mobile: false,
    }, sessionId);
    if (reduceMotion)
      await call("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "reduce" }],
      }, sessionId);
    await call("Page.navigate", { url }, sessionId);
    return { targetId, sessionId };
  };

  const { sessionId } = await openPage(true);
  await waitFor(
    "!!(window.__probe && document.querySelector('#shell image'))",
    sessionId);
  assert.equal(await evalJs("__probe.tankOwner", sessionId), true);
  await evalJs("__probe.setPaused(true)", sessionId);

  await test("frontmost alerts own Return and Escape", async () => {
    const result = await evalJs(`(async () => {
      const events = [];
      const bottom = __probe.showAlert({ icon: 'note', text: 'Bottom',
        buttons: [{ title: 'Bottom', default: true, cancel: true,
          action: a => { events.push('bottom'); a.close(); } }] });
      const top = __probe.showAlert({ icon: 'note', text: 'Top',
        buttons: [{ title: 'Top', default: true, cancel: true,
          action: a => { events.push('top'); a.close(); } }] });
      document.activeElement.dispatchEvent(new KeyboardEvent('keydown',
        { key: 'Enter', bubbles: true, cancelable: true }));
      await new Promise(r => setTimeout(r, 180)); // the button flashes first
      const uncovered = bottom.isOpen && !top.isOpen;
      document.activeElement.dispatchEvent(new KeyboardEvent('keydown',
        { key: 'Escape', bubbles: true, cancelable: true }));
      await new Promise(r => setTimeout(r, 180));
      const result = { events, uncovered, open: __probe.alertOpen() };
      top.close(); bottom.close(); return result;
    })()`, sessionId);
    assert.deepEqual(result, { events: ['top', 'bottom'], uncovered: true, open: false });
  });

  await test("closing a background alert preserves front control focus", async () => {
    const stayed = await evalJs(`(() => {
      const spec = { icon: 'note', text: 'Focus',
        buttons: [{ title: 'OK', default: true, cancel: true }] };
      const bottom = __probe.showAlert(spec), top = __probe.showAlert(spec);
      const scrims = document.querySelectorAll('.alertscrim');
      const button = scrims[scrims.length - 1].querySelector('button');
      button.focus(); bottom.close();
      const stayed = document.activeElement === button;
      top.close(); return stayed;
    })()`, sessionId);
    assert.equal(stayed, true);
  });

  await test("a return to the displayed machine cancels delayed replacement art",
    async () => {
      const asset = await evalJs("__probe.machineAsset('aquarium')", sessionId);
      const held = holdAsset("/" + asset);
      try {
        await evalJs("__probe.onBusMessage({ op: 'machine', id: 'aquarium' })",
                     sessionId);
        await timed(held.started, "aquarium asset request");
        assert.equal(await evalJs("__probe.machineId()", sessionId), "plus");
        await evalJs("__probe.onBusMessage({ op: 'machine', id: 'plus' })",
                     sessionId);
        held.releaseNow();
        await sleep(350);
        assert.equal(await evalJs("__probe.machineId()", sessionId), "plus");
      } finally { held.releaseNow(); }
    });

  await evalJs("__probe.onBusMessage({ op: 'machine', id: 'plus' })",
               sessionId);
  await sleep(250);
  await test("committed machine geometry is acknowledged to client windows",
    async () => {
      // A case whose art was never fetched: the renderer answers a
      // repeat image URL from its memory cache without any request,
      // so only a fresh asset can be held in flight.
      const asset = await evalJs("__probe.machineAsset('performa')", sessionId);
      const held = holdAsset("/" + asset);
      try {
        await evalJs(
          "__probe.watchStates();" +
          "__probe.onBusMessage({ op: 'machine', id: 'performa' })",
          sessionId);
        await timed(held.started, "performa asset request");
        await sleep(1100);
        await evalJs("__states.length = 0", sessionId);
        held.releaseNow();
        await waitFor("__probe.machineId() === 'performa'", sessionId);
        await sleep(400);
        assert.ok(await evalJs(
          "__states.some(m => m.machine.id === 'performa')", sessionId),
          "no client state acknowledged committed geometry");
      } finally { held.releaseNow(); }
    });

  await test("the scold remains non-modal and respects reduced motion",
    async () => {
      await evalJs("for (let i = 0; i < 6; i++) __probe.noteGlassTap()",
                   sessionId);
      const scold = await evalJs(`(() => {
        const b = document.getElementById('scold-banner');
        return { role: b.getAttribute('role'), text: b.textContent,
          anim: getComputedStyle(b).animationName,
          scrims: document.querySelectorAll('.alertscrim').length };
      })()`, sessionId);
      assert.equal(scold.role, "status");
      assert.match(scold.text, /frightens/);
      assert.equal(scold.anim, "none");
      assert.equal(scold.scrims, 0);
    });

  await test("manual feeding refuses at six pellets and never promises a pour",
    async () => {
      const result = await evalJs(`(() => {
        __probe.setPaused(false);
        __probe.sim.food.length = 0;
        for (let i = 0; i < 6; i++) __probe.sim.dropFood(100);
        let pours = 0;
        const original = __probe.audio.feed;
        __probe.audio.feed = () => pours++;
        __probe.feedFish();
        __probe.audio.feed = original;
        __probe.setPaused(true);
        return { count: __probe.sim.uneatenCount(), pours };
      })()`, sessionId);
      assert.deepEqual(result, { count: 6, pours: 0 });
    });

  await test("paused frames erase an expired spotlight", async () => {
    await evalJs("__probe.expireFocus()", sessionId);
    await waitFor("__probe.focusId() === null", sessionId);
  });

  await test("saved fish and runtime-only glass marks keep distinct lifetimes",
    async () => {
      const snapshot = await evalJs(`(() => {
        const f = __probe.sim.fish[0]; f.pack = 'u';
        f.entry = 'two/blackangel.fsh';
        f.life.dead = { cause: 10, at: 0 }; f.state = 'dead';
        __probe.sim.restPrints.push({ x: 80, y: 90, n: 1 });
        return __probe.tankSnapshot();
      })()`, sessionId);
      assert.equal(snapshot.fish[0].entry, "two/blackangel.fsh");
      assert.ok(snapshot.fish[0].life.dead);
      assert.equal("restPrints" in snapshot, false);
    });

  await test("the spectator does not persist local control changes",
    async () => {
      const spectator = await openPage(false);
      try {
        await waitFor("!!window.__probe", spectator.sessionId);
        assert.equal(
          await evalJs("__probe.tankOwner", spectator.sessionId), false);
        await evalJs(`(() => {
          const b = [...document.querySelectorAll('button')]
            .find(b => b.textContent.trim() === 'OK');
          if (b) b.click();
          return !!b;
        })()`, spectator.sessionId);
        await sleep(100);
        const writes = await evalJs(`(() => {
          __writes.length = 0;
          __probe.setNames(true);
          __probe.applySoundConfig({ muted: true });
          __probe.applyLighting({ lamp: false });
          __probe.applyEffects({ cat: false });
          __probe.toggleAutoFeed();
          return __writes.filter(k => __probe.configKeys.includes(k));
        })()`, spectator.sessionId);
        assert.deepEqual(writes, []);
      } finally {
        await call("Target.closeTarget", { targetId: spectator.targetId })
          .catch(() => {});
      }
    });

  await test("startup reads saved preferences, defaults unreadable or corrupt ones",
    async () => {
      // Page-local storage faults, installed before fixture.js and the
      // bundle run: the shared profile and the owner page stay intact.
      const junk = {
        "finsical:lighting": "{bad", "finsical:sound": "[",
        "finsical:effects": "nope", "finsical:crt-cfg": '{"a":',
        "finsical:waterChange": "{{", "finsical:boot": "OFF",
        "finsical:scoldSign": "0", "finsical:hints": "1",
        "finsical:paused": "true", "finsical:names": "on",
        "finsical:autofeed": "yes",
      };
      // Valid, non-default values: what a returning user saved.
      const saved = {
        "finsical:lighting": '{"mode":"timer","on":7,"off":21,"lamp":false}',
        "finsical:sound": '{"volume":0.25,"muted":true,"v":2}',
        "finsical:effects": '{"cat":false,"smudges":true}',
        "finsical:crt-cfg": '{"scanlines":0.9,"mask":"slot"}',
        "finsical:waterChange": '{"fraction":0.5,"temp":40}',
        "finsical:boot": "off", "finsical:scoldSign": "off",
        "finsical:hints": "on", "finsical:paused": "1",
        "finsical:names": "1", "finsical:autofeed": "1",
      };
      const fallback = (defaults) => ({
        bootEnabled: true, scoldOn: true, hintsOn: false, paused: false,
        namesOn: false, autoFeed: false,
        waterChangeCfg: { fraction: 0.2, temp: defaults.heater },
        lighting: defaults.lighting, soundCfg: defaults.soundCfg,
        effects: defaults.effects, crtCfg: defaults.crtCfg,
      });
      const faults = {
        saved: [`key => (${JSON.stringify(saved)})[key] ?? null`,
          (defaults) => ({
            bootEnabled: false, scoldOn: false, hintsOn: true, paused: true,
            namesOn: true, autoFeed: true,
            // The temperature clamps to the heater's 36 °C ceiling.
            waterChangeCfg: { fraction: 0.5, temp: 36 },
            lighting: { mode: "timer", on: 7, off: 21, lamp: false },
            soundCfg: { ...defaults.soundCfg, volume: 0.25, muted: true },
            effects: { ...defaults.effects, cat: false, smudges: true },
            crtCfg: { ...defaults.crtCfg, scanlines: 0.9, mask: "slot" },
          })],
        // Every read throws, as where storage is blocked. The seed flag
        // and the tank lease stay readable, so this page spectates
        // rather than taking the tank from the owner page.
        unreadable: [`key => {
          if (key === '__fixture' || key === 'finsical:tank-owner')
            return null;
          throw new DOMException('blocked', 'SecurityError');
        }`, fallback],
        // Corrupt JSON, and flag strings that are neither on nor off.
        corrupt: [`key => (${JSON.stringify(junk)})[key] ?? null`, fallback],
      };
      for (const [fault, [read, expected]] of Object.entries(faults)) {
        const page = await openPage(false);
        try {
          await waitFor("!!window.__probe", page.sessionId);
          const seen = errors.length;
          await call("Page.enable", {}, page.sessionId);
          await call("Page.addScriptToEvaluateOnNewDocument", { source: `(() => {
            window.__fault = ${JSON.stringify(fault)};
            const get = Storage.prototype.getItem, fault = ${read};
            Storage.prototype.getItem = function (key) {
              return fault(key) ?? get.call(this, key);
            };
          })();` }, page.sessionId);
          await call("Page.navigate", { url }, page.sessionId);
          await waitFor(`window.__fault === ${JSON.stringify(fault)} && ` +
                        "!!window.__probe", page.sessionId);
          const { defaults, ...prefs } =
            await evalJs("__probe.startupPrefs()", page.sessionId);
          assert.deepEqual(prefs, expected(defaults), fault);
          assert.deepEqual(errors.slice(seen), [], fault + " page errors");
        } finally {
          await call("Target.closeTarget", { targetId: page.targetId })
            .catch(() => {});
        }
      }
    });

  assert.deepEqual(errors, [], "page errors");
  assert.deepEqual(failures, [], failures.join("\n"));
  assert.equal(passed.length, 10, "Missing checks");
  console.log(`${passed.length} live integration scenarios passed`);
} finally {
  await chrome?.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  removeTemp(temp);
}
