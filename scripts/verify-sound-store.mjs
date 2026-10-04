// Two real browser windows must not overwrite each other's sound edits.
// Set FINSICAL_CHROMIUM to a Chrome/Chromium binary, as for verify-caustics.
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";
import { BROWSER_TIMEOUT_MS, findBrowser, removeTemp, startBrowser }
  from "./lib/browser.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
assert.equal(typeof WebSocket, "function", "verify:sound-store needs Node.js 22+");
const browser = findBrowser();

// Each iframe loads its own module instance and database connection.
// One page's promise chain cannot serialize the other page's edits.
const worker = String.raw`
const side = new URLSearchParams(location.search).get('side');
window.addEventListener('message', async ({ data }) => {
  try {
    let result;
    const record = (name, bytes = 2) => ({ name, wav: new ArrayBuffer(bytes) });
    if (data.op === 'merge') await Store.sndsMerge([record(data.name, data.bytes)]);
    else if (data.op === 'remove') await Store.sndsRemove([data.name]);
    else if (data.op === 'get')
      result = (await Store.sndsGet() ?? []).map(r => ({ name: r.name, bytes: r.wav.byteLength }));
    else if (data.op === 'abort') {
      const put = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function(...args) {
        const request = put.apply(this, args);
        this.transaction.abort();
        return request;
      };
      try {
        await Store.sndsMerge([record('must-not-commit')]);
        result = false;
      } catch { result = true; }
      finally { IDBObjectStore.prototype.put = put; }
    }
    parent.postMessage({ id: data.id, result }, '*');
  } catch (error) {
    parent.postMessage({ id: data.id, error: String(error) }, '*');
  }
});
Store.sndsMerge([]).then(() => parent.postMessage({ ready: side }, '*'),
  error => parent.postMessage({ ready: side, error: String(error) }, '*'));
`;

const fixture = String.raw`
const frames = [...document.querySelectorAll('iframe')];
const pending = new Map(), ready = new Set(), failures = [], passed = [];
let serial = 0;
function call(side, args) {
  return new Promise((resolve, reject) => {
    const id = ++serial;
    pending.set(id, { resolve, reject });
    frames[side].contentWindow.postMessage({ ...args, id }, '*');
    // A frame that crashed or dropped the reply would otherwise pend
    // forever and surface as the bare 30s "no report" timeout.
    setTimeout(() => {
      if (pending.delete(id))
        reject(new Error('no reply to ' + JSON.stringify(args)));
    }, 10_000);
  });
}
function check(ok, message) { if (!ok) throw new Error(message); }
async function test(name, run) {
  try { await run(); passed.push(name); }
  catch (error) { failures.push(name + ': ' + error.message); }
}
function finish() {
  document.getElementById('results').textContent = JSON.stringify({ passed, failures });
  window.storeResult = { passed, failures };
}
async function run() {
  if (failures.length) { finish(); return; }
  await test('concurrent merges keep every record', async () => {
    for (let i = 0; i < 10; i++)
      await Promise.all([0, 1].map(side => call(side, {
        op: 'merge', name: 'probe-' + side + '-' + i,
      })));
    const records = await call(0, { op: 'get' });
    check(records.length === 20, 'expected 20 records, got ' + records.length);
  });
  await test('a removal and unrelated addition both commit', async () => {
    await Promise.all([
      call(0, { op: 'remove', name: 'probe-0-0' }),
      call(1, { op: 'merge', name: 'extra' }),
    ]);
    const records = await call(0, { op: 'get' });
    check(!records.some(r => r.name === 'probe-0-0'), 'removed record returned');
    check(records.some(r => r.name === 'extra'), 'new record was lost');
  });
  await test('same-name additions replace the record', async () => {
    await call(1, { op: 'merge', name: 'extra', bytes: 3 });
    const records = await call(0, { op: 'get' });
    check(records.filter(r => r.name === 'extra').length === 1, 'duplicate name');
    check(records.find(r => r.name === 'extra').bytes === 3, 'old bytes retained');
  });
  await test('an aborted write rejects and preserves the bank', async () => {
    const before = await call(0, { op: 'get' });
    check(await call(0, { op: 'abort' }), 'aborted write reported success');
    check(JSON.stringify(await call(1, { op: 'get' })) === JSON.stringify(before),
      'abort changed stored records');
    await call(0, { op: 'merge', name: 'after-abort' });
    check((await call(1, { op: 'get' })).some(r => r.name === 'after-abort'),
      'abort poisoned subsequent writes');
  });
  finish();
}
window.addEventListener('message', ({ data }) => {
  if (data.ready !== undefined) {
    ready.add(data.ready);
    if (data.error) failures.push('Worker ' + data.ready + ' startup: ' + data.error);
    if (ready.size === frames.length) void run();
    return;
  }
  const waiter = pending.get(data.id);
  if (!waiter) return;
  pending.delete(data.id);
  if (data.error) waiter.reject(new Error(data.error));
  else waiter.resolve(data.result);
});
`;

const temp = mkdtempSync(join(tmpdir(), "finsical-sound-store-"));
const bundle = buildSync({
  entryPoints: [join(ROOT, "web/store.ts")], bundle: true,
  format: "iife", globalName: "Store", write: false,
}).outputFiles[0].text;
const server = createServer((request, response) => {
  response.setHeader("Content-Type", "text/html");
  response.end(request.url.startsWith("/worker.html")
    ? `<!doctype html><script>${bundle}</script><script>${worker}</script>`
    : `<!doctype html><body><pre id="results"></pre>` +
      `<iframe src="worker.html?side=0"></iframe>` +
      `<iframe src="worker.html?side=1"></iframe><script>${fixture}</script>`);
});
let chrome;
try {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  chrome = startBrowser(browser, join(temp, "profile"));
  const call = await chrome.connect(() => {});
  const { targetId } = await call("Target.createTarget", {
    url: `http://127.0.0.1:${server.address().port}/`,
  });
  const { sessionId } = await call("Target.attachToTarget", { targetId, flatten: true });
  const deadline = Date.now() + BROWSER_TIMEOUT_MS;
  let report;
  // Real time: virtual-time dump-dom can finish before IndexedDB's I/O.
  while (!report && Date.now() < deadline) {
    try {
      const { result } = await call("Runtime.evaluate", {
        expression: "window.storeResult || null", returnByValue: true,
      }, sessionId);
      report = result.value;
    } catch (error) {
      // A first poll can race navigation; application and other CDP errors fail.
      if (!/Cannot find (?:default execution )?context|Execution context was destroyed/i
          .test(error.message)) throw error;
    }
    if (!report) await new Promise((resolve) => setTimeout(resolve, 25));
  }
  assert.ok(report, "Browser fixture did not return results");
  for (const name of report.passed) console.log("PASS: " + name);
  assert.equal(report.failures.length, 0, report.failures.join("\n"));
  assert.equal(report.passed.length, 4, "Missing checks");
} finally {
  await chrome?.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  removeTemp(temp);
}
