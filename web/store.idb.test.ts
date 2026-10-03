import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A small in-memory IndexedDB: enough of open/transaction/objectStore
// for store.ts, with a way to close a connection under it the way a
// browser does when site data is cleared or WebKit's storage process
// is lost.
function fakeIdb() {
  const stores = new Map<string, Map<unknown, unknown>>(
    [["packs", new Map()], ["meta", new Map()]]);
  let opens = 0;
  let failOpens = 0;
  let prevented = 0;
  let current: FakeDb | null = null;
  class FakeDb {
    closed = false;
    onclose: (() => void) | null = null;
    onversionchange: (() => void) | null = null;
    close(): void { this.closed = true; }
    transaction(_names: string | string[], _mode: string) {
      if (this.closed)
        throw new DOMException("The database connection is closing.",
                               "InvalidStateError");
      const tx = {
        oncomplete: null as (() => void) | null,
        onerror: null as (() => void) | null,
        onabort: null as (() => void) | null,
        objectStore(n: string) {
          const s = stores.get(n)!;
          const req = (fn: () => unknown) => {
            const r = { result: undefined as unknown,
                        onsuccess: null as (() => void) | null,
                        onerror: null as (() => void) | null };
            queueMicrotask(() => {
              r.result = fn();
              r.onsuccess?.();
              queueMicrotask(() => tx.oncomplete?.());
            });
            return r;
          };
          return {
            get: (k: unknown) => req(() => s.get(k)),
            put: (v: unknown, k: unknown) => req(() => (s.set(k, v), k)),
            delete: (k: unknown) => req(() => { s.delete(k); }),
            getAll: () => req(() => []),
            getAllKeys: () => req(() => []),
          };
        },
      };
      return tx;
    }
  }
  const api = {
    open() {
      opens++;
      const r = { result: null as FakeDb | null,
                  onsuccess: null as (() => void) | null,
                  onerror: null as ((e: Event) => void) | null,
                  onupgradeneeded: null, onblocked: null };
      queueMicrotask(() => {
        if (failOpens > 0) {
          failOpens--;
          const e = new Event("error", { cancelable: true });
          r.onerror?.(e);
          prevented += e.defaultPrevented ? 1 : 0;
          return;
        }
        current = new FakeDb();
        r.result = current;
        r.onsuccess?.();
      });
      return r;
    },
  };
  return {
    api,
    opens: () => opens,
    /** The browser closes the connection, announcing it or not. */
    lose(announce: boolean): void {
      current!.closed = true;
      if (announce) current!.onclose?.();
    },
    upgradeElsewhere(): void { current!.onversionchange?.(); },
    /** The next `n` opens fail, as while a storage process restarts. */
    failNextOpens(n: number): void { failOpens = n; },
    /** Failed opens whose error the store handled (preventDefault). */
    prevented: () => prevented,
    isClosed: () => current!.closed,
  };
}

describe("store.ts after the browser closes its connection", () => {
  let idb: ReturnType<typeof fakeIdb>;
  beforeEach(() => {
    vi.resetModules(); // a fresh module, so a fresh cached connection
    idb = fakeIdb();
    vi.stubGlobal("indexedDB", idb.api);
    vi.stubGlobal("IDBKeyRange", { bound: () => null });
  });
  afterEach(() => vi.unstubAllGlobals());

  for (const announce of [true, false]) {
    it(`reopens it ${announce ? "on its close event" : "when it closed silently"}`,
       async () => {
      const store = await import("./store.js");
      await store.packPut("local:a.fsh", new Uint8Array([1, 2, 3]));
      expect(await store.packGet("local:a.fsh")).toEqual(
        new Uint8Array([1, 2, 3]));
      idb.lose(announce);
      // The stored bytes are still there to read, writes still land,
      // and the strict sound path still merges.
      expect(await store.packGet("local:a.fsh")).toEqual(
        new Uint8Array([1, 2, 3]));
      expect(await store.packPut("local:b.fsh", new Uint8Array([4])))
        .toBe(true);
      await expect(store.sndsMerge([{ name: "x", wav: new Uint8Array(1) }]))
        .resolves.toBeTruthy();
      // The write landed through the reopened connection, not a stale one.
      expect(await store.sndsGet())
        .toEqual([{ name: "x", wav: new Uint8Array(1) }]);
      expect(idb.opens()).toBe(2);
    });
  }

  it("tries again after an open that failed", async () => {
    const store = await import("./store.js");
    await store.packPut("local:a.fsh", new Uint8Array([1]));
    // The connection goes and the first reopen fails too: that null
    // mustn't stick, or the cache stays off for the session.
    idb.lose(false);
    idb.failNextOpens(1);
    expect(await store.packGet("local:a.fsh")).toBeNull();
    expect(await store.packGet("local:a.fsh")).toEqual(new Uint8Array([1]));
    expect(idb.opens()).toBe(3);
    expect(idb.prevented()).toBe(1);
  });

  it("closes for a newer version opening elsewhere, then reopens", async () => {
    const store = await import("./store.js");
    await store.metaPut("k", 1);
    idb.upgradeElsewhere();
    expect(idb.isClosed()).toBe(true);
    expect(await store.metaGet("k")).toBe(1);
    expect(idb.opens()).toBe(2);
  });
});
