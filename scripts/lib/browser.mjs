// Headless Chrome plumbing shared by the verify:* scripts. Importing it
// has no side effects, so each script's own Node.js version check still
// runs before any browser lookup.
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { rmSync } from "node:fs";

/** Browser lookup, startup and per-call CDP deadline. */
export const BROWSER_TIMEOUT_MS = 30_000;
const SHUTDOWN_TIMEOUT_MS = 5_000;
const CLEANUP_RETRIES = 5;
const CLEANUP_RETRY_MS = 100;

/** The Chrome/Chromium binary: FINSICAL_CHROMIUM, else the first known
 * name that runs. */
export function findBrowser() {
  const candidates = process.env.FINSICAL_CHROMIUM
    ? [process.env.FINSICAL_CHROMIUM]
    : ["google-chrome", "chromium", "chromium-browser",
       "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"];
  const browser = candidates.find((candidate) => {
    try {
      execFileSync(candidate, ["--version"], {
        timeout: BROWSER_TIMEOUT_MS, stdio: ["ignore", "pipe", "pipe"],
      });
      return true;
    } catch { return false; }
  });
  assert.ok(browser, "Install Chrome/Chromium or set FINSICAL_CHROMIUM");
  return browser;
}

/**
 * Spawns headless Chrome with remote debugging on profileDir.
 * connect(onEvent) waits for the DevTools endpoint and returns
 * call(method, params, sessionId); CDP events go to onEvent.
 * close() shuts the browser down; await it in the caller's finally.
 */
export function startBrowser(browser, profileDir) {
  const child = spawn(browser, [
    "--headless", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
    "--remote-debugging-port=0", "--user-data-dir=" + profileDir,
    "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });
  // Listen in the spawn's tick: a spawn error or early exit must not go
  // unhandled before the caller reaches connect().
  const endpoint = new Promise((resolve, reject) => {
    let logs = "";
    const timer = setTimeout(() => reject(new Error("Browser startup timed out")),
                             BROWSER_TIMEOUT_MS);
    child.on("error", reject);
    child.once("exit", () => {
      clearTimeout(timer);
      reject(new Error("Browser exited before startup: " + logs));
    });
    child.stderr.on("data", (data) => {
      logs += data;
      const url = logs.match(/DevTools listening on (ws:\/\/\S+)/);
      if (!url) return;
      clearTimeout(timer);
      resolve(url[1]);
    });
  });
  endpoint.catch(() => {}); // connect() rethrows it
  let socket;

  async function connect(onEvent) {
    socket = new WebSocket(await endpoint);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", reject, { once: true });
    });
    const waiting = new Map();
    let serial = 0;
    socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(data);
      if (message.method) { onEvent(message); return; }
      const waiter = waiting.get(message.id);
      if (!waiter) return;
      waiting.delete(message.id);
      clearTimeout(waiter.timer);
      if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
      else waiter.resolve(message.result);
    });
    return (method, params = {}, sessionId) => new Promise((resolve, reject) => {
      const id = ++serial;
      const timer = setTimeout(() => {
        waiting.delete(id);
        reject(new Error(method + " timed out"));
      }, BROWSER_TIMEOUT_MS);
      waiting.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }

  async function close() {
    if (child.exitCode === null) {
      const exited = new Promise((resolve) => child.once("exit", resolve));
      // A hard kill leaves Chrome's children writing the profile while
      // cleanup removes it. Ask the browser to close its whole process tree.
      if (socket?.readyState === WebSocket.OPEN)
        socket.send(JSON.stringify({ id: 0, method: "Browser.close" }));
      else child.kill("SIGTERM");
      const timer = setTimeout(() => child.kill("SIGKILL"), SHUTDOWN_TIMEOUT_MS);
      await exited;
      clearTimeout(timer);
    }
    socket?.close();
  }

  return { connect, close };
}

/** Removes a temp dir, retrying transient failures such as ENOTEMPTY. */
export function removeTemp(dir) {
  rmSync(dir, { recursive: true, force: true,
                maxRetries: CLEANUP_RETRIES, retryDelay: CLEANUP_RETRY_MS });
}
