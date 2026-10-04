// The tank's owner/spectator contract — a view-only copy changes its
// local view but persists nothing shared — needs a real browser and a
// real second page claiming the same origin's lease.
// Set FINSICAL_CHROMIUM to a Chrome/Chromium binary, as for verify-caustics.
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
             "verify:spectator needs Node.js 22+");
const browser = findBrowser();

// The production module is instrumented only inside the test bundle:
// the probe appends handles to module-scope internals without widening
// the shipped API.
const probe = `
window.__probe = {
  tankOwner, setNames, applySoundConfig, applyLighting, applyEffects,
  toggleAutoFeed, setPaused, showAlert, dropAllowed,
  configKeys: [LIGHTING_KEY, CRT_KEY, CRT_CFG_KEY, SOUND_KEY, EFFECTS_KEY,
    NAMES_KEY, AUTOFEED_KEY, CHANGE_KEY, MACHINE_KEY, SCOLD_KEY, HINTS_KEY,
    BOOT_KEY],
};`;
const contents = await readFile(join(WEB, "main.ts"), "utf8");
const bundle = buildSync({
  stdin: { contents: contents + probe, resolveDir: WEB,
           sourcefile: "main.ts", loader: "ts" },
  bundle: true, format: "iife", write: false,
}).outputFiles[0].text;

// Runs before bundle.js in every tank window. The first window seeds a
// quiet starting state (no boot parade, no welcome, CRT off); every
// window records which keys its own realm writes so a spectator's
// attempted persists are observable.
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

const types = { ".html": "text/html", ".css": "text/css",
  ".js": "text/javascript", ".png": "image/png", ".svg": "image/svg+xml" };
const indexHtml = (await readFile(join(WEB, "index.html"), "utf8"))
  .replace('<script src="bundle.js">',
           '<script src="fixture.js"></script><script src="bundle.js">');
assert.notEqual(indexHtml.indexOf("fixture.js"), -1,
                "index.html no longer loads bundle.js directly");
// Read once up front like the bundle: a missing install fails here,
// before Chrome spawns — an awaited read inside the handler would
// reject the request promise and crash the harness mid-cleanup.
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

const temp = mkdtempSync(join(tmpdir(), "finsical-spectator-"));
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
        // A poll can race navigation; application and other errors fail.
        if (!/Cannot find (?:default execution )?context|Execution context was destroyed/i
            .test(error.message)) throw error;
      }
      if (Date.now() > deadline)
        throw new Error("timed out waiting for: " + expression);
      await sleep(25);
    }
  };
  const openPage = async () => {
    const { targetId } = await call("Target.createTarget", {
      url: "about:blank",
    });
    const { sessionId } = await call("Target.attachToTarget",
      { targetId, flatten: true });
    await call("Runtime.enable", {}, sessionId);
    await call("Emulation.setDeviceMetricsOverride", {
      width: 1000, height: 760, deviceScaleFactor: 1, mobile: false,
    }, sessionId);
    await call("Page.navigate", { url }, sessionId);
    return { targetId, sessionId };
  };
  // A synthetic file drag: DataTransfer with a file reports "Files",
  // which is all the tank's cue and drop listeners ask for.
  const dragWithFile = `(() => {
    const dt = new DataTransfer();
    dt.items.add(new File([1], 'x.fsh'));
    window.dispatchEvent(new DragEvent('dragenter',
      { dataTransfer: dt }));
    return document.body.classList.contains('dragging');
  })()`;

  const owner = await openPage();
  await waitFor(
    "!!(window.__probe && document.querySelector('#shell image'))",
    owner.sessionId);

  await test("the owning tab persists preference changes", async () => {
    assert.equal(await evalJs("__probe.tankOwner", owner.sessionId), true);
    const writes = await evalJs(`(() => {
      __writes.length = 0;
      __probe.setNames(true);
      __probe.setNames(false);
      return __writes.filter(k => __probe.configKeys.includes(k));
    })()`, owner.sessionId);
    assert.ok(writes.includes("finsical:names"),
              "owner preference write never reached storage");
  });

  await test("the owning tab shows the drop cue for dragged files",
    async () => {
      const [allowed, cue] = await evalJs(`(() => {
        const d = __probe.dropAllowed();
        const dt = new DataTransfer();
        dt.items.add(new File([1], 'x.fsh'));
        window.dispatchEvent(new DragEvent('dragenter',
          { dataTransfer: dt }));
        return [d, document.body.classList.contains('dragging')];
      })()`, owner.sessionId);
      assert.equal(allowed, true);
      assert.equal(cue, true);
      await evalJs(`(() => {
        const dt = new DataTransfer();
        dt.items.add(new File([1], 'x.fsh'));
        window.dispatchEvent(new DragEvent('dragleave',
          { dataTransfer: dt }));
      })()`, owner.sessionId);
    });

  await test("a modal stands the owner's cue down and lets it back up",
    async () => {
      const [underModal, afterClose] = await evalJs(`(() => {
        const alert = __probe.showAlert({
          icon: 'note', text: 'checking', buttons: [{ label: 'OK' }],
        });
        const dt = new DataTransfer();
        dt.items.add(new File([1], 'x.fsh'));
        window.dispatchEvent(new DragEvent('dragenter',
          { dataTransfer: dt }));
        const under = [__probe.dropAllowed(),
          document.body.classList.contains('dragging')];
        alert.close();
        // dragover re-evaluates: the cue must follow a modal that
        // closed mid-drag rather than staying stood down.
        window.dispatchEvent(new DragEvent('dragover',
          { dataTransfer: dt }));
        const after = [__probe.dropAllowed(),
          document.body.classList.contains('dragging')];
        window.dispatchEvent(new DragEvent('dragleave',
          { dataTransfer: dt }));
        return [under, after];
      })()`, owner.sessionId);
      assert.deepEqual(underModal, [false, false]);
      assert.deepEqual(afterClose, [true, true]);
    });

  await test("a refused drop clears the cue before another drag", async () => {
    const result = await evalJs(`(() => {
      const dt = new DataTransfer();
      dt.items.add(new File([1], 'x.fsh'));
      window.dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt }));
      const alert = __probe.showAlert({ icon: 'note', text: 'Drop blocked',
        buttons: [{ title: 'OK' }] });
      window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt,
        cancelable: true }));
      const refusedCue = document.body.classList.contains('dragging');
      alert.close();
      window.dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt }));
      const nextCue = document.body.classList.contains('dragging');
      window.dispatchEvent(new DragEvent('dragleave', { dataTransfer: dt }));
      return [refusedCue, nextCue,
        document.body.classList.contains('dragging')];
    })()`, owner.sessionId);
    assert.deepEqual(result, [false, true, false]);
  });

  await test("closing a stacked alert restores typing and the opener", async () => {
    try {
      const result = await evalJs(`(() => {
        const opener = document.createElement('button');
        document.body.append(opener); opener.focus();
        const bottom = __probe.showAlert({ icon: 'note', text: 'Name',
          field: { value: 'abcdef', label: 'Name' },
          buttons: [{ title: 'OK', default: true }] });
        const field = document.querySelector('.alertfield');
        field.setSelectionRange(2, 4);
        const top = __probe.showAlert({ icon: 'note', text: 'Progress',
          buttons: [{ title: 'OK', default: true }] });
        window.__focusCheck = { bottom, top, field, opener };
        top.close();
        return { focused: document.activeElement === field,
          selection: [field.selectionStart, field.selectionEnd] };
      })()`, owner.sessionId);
      assert.deepEqual(result, { focused: true, selection: [2, 4] });
      await call("Input.insertText", { text: "X" }, owner.sessionId);
      assert.equal(await evalJs("__focusCheck.field.value", owner.sessionId),
                   "abXef", "typing should resume without another click");
      assert.equal(await evalJs(`(() => {
        __focusCheck.bottom.close();
        return document.activeElement === __focusCheck.opener;
      })()`, owner.sessionId), true);
    } finally {
      await evalJs(`(() => {
        const check = window.__focusCheck;
        if (!check) return;
        check.top.close(); check.bottom.close(); check.opener.remove();
        delete window.__focusCheck;
      })()`, owner.sessionId);
    }
  });

  const spectator = await openPage();
  try {
    await waitFor("!!window.__probe", spectator.sessionId);
    assert.equal(
      await evalJs("__probe.tankOwner", spectator.sessionId), false);
    // Dismiss the view-only notice, then exercise local controls.
    await evalJs(`(() => {
      const b = [...document.querySelectorAll('button')]
        .find(b => b.textContent.trim() === 'OK');
      if (b) b.click();
      return !!b;
    })()`, spectator.sessionId);
    await sleep(100);

    await test("the spectator does not persist local control changes",
      async () => {
        const writes = await evalJs(`(() => {
          __writes.length = 0;
          __probe.setNames(true);
          __probe.applySoundConfig({ muted: true });
          __probe.applyLighting({ lamp: false });
          __probe.applyEffects({ snail: false });
          __probe.toggleAutoFeed();
          return __writes.filter(k => __probe.configKeys.includes(k));
        })()`, spectator.sessionId);
        assert.deepEqual(writes, []);
      });

    await test("the spectator shows no drop cue for dragged files",
      async () => {
        assert.equal(
          await evalJs("__probe.dropAllowed()", spectator.sessionId),
          false);
        assert.equal(await evalJs(dragWithFile, spectator.sessionId),
                     false);
      });
  } finally {
    await call("Target.closeTarget", { targetId: spectator.targetId })
      .catch(() => {});
  }

  assert.deepEqual(errors, [], "page errors");
  assert.deepEqual(failures, [], failures.join("\n"));
  assert.equal(passed.length, 7, "Missing checks");
  console.log(`${passed.length} live spectator scenarios passed`);
} finally {
  await chrome?.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  removeTemp(temp);
}
