/**
 * Persistent local cache (IndexedDB). Two stores:
 *  - "packs": raw add-on/zip bytes keyed by fetch URL. archive.org
 *    entries are immutable per URL, so entries never expire.
 *  - "meta": small JSON records (listing pages), timestamped — callers
 *    decide freshness and stale fallback.
 * Both app webviews share one origin, so a pack fetched for the
 * panel's preview is already local when the tank page installs it —
 * and launch-time restores of installed add-ons go fully offline.
 * Every call degrades to null/no-op when IDB is unavailable
 * (private mode, old WKWebView) — callers always keep a fetch path.
 */

const DB_NAME = "finsical";
const DB_VER = 1;

let dbPromise: Promise<IDBDatabase | null> | null = null;
function openDb(): Promise<IDBDatabase | null> {
  if (!dbPromise) {
    dbPromise = new Promise((res) => {
      if (typeof indexedDB === "undefined") { res(null); return; }
      let req: IDBOpenDBRequest;
      try { req = indexedDB.open(DB_NAME, DB_VER); }
      catch { res(null); return; }
      req.onupgradeneeded = () => {
        req.result.createObjectStore("packs");
        req.result.createObjectStore("meta");
      };
      req.onsuccess = () => {
        res(req.result);
        // Best-effort: an unpersisted origin can be evicted wholesale
        // under storage pressure, silently wiping the offline cache.
        try { void navigator.storage?.persist()?.catch(() => {}); }
        catch { /* unsupported */ }
      };
      req.onerror = () => res(null);
      // A blocking tab's older version can clear any moment — don't
      // memoize this null or the cache stays off for the session.
      req.onblocked = () => {
        dbPromise = null; res(null);
        // The promise already settled; if the blocker clears and this
        // superseded request still succeeds, close — don't leak — it.
        req.onsuccess = () => {
          try { req.result.close(); } catch { /* already closed */ }
        };
      };
    });
  }
  return dbPromise;
}

function rw<T>(store: string, mode: IDBTransactionMode,
               run: (s: IDBObjectStore) => IDBRequest<T>
): Promise<T | null> {
  return openDb().then((d) => {
    if (!d) return null;
    return new Promise<T | null>((res) => {
      try {
        const tx = d.transaction(store, mode);
        const rq = run(tx.objectStore(store));
        rq.onsuccess = () => res(rq.result ?? null); // get-miss → null
        rq.onerror = () => res(null);
        tx.onerror = () => res(null);
      } catch { res(null); }
    });
  });
}

export function packGet(url: string): Promise<Uint8Array | null> {
  const got = rw<Uint8Array>("packs", "readonly", (s) => s.get(url));
  // Refresh the stat's age on hit so eviction is least-recently-used
  // rather than first-in — also backfills entries that lack one.
  void got.then((d) => {
    if (!d) return;
    rw("meta", "readwrite", (s) =>
      s.put({ bytes: d.byteLength, at: Date.now() }, STAT_PREFIX + url))
      .catch(() => {}); // cache touches never surface errors
  });
  return got;
}

/** Rough ceiling for the byte cache — unbounded puts could push the
 * origin over quota, after which every write fails silently. Each
 * pack's size/age is recorded in "meta" as packstat:{url} →
 * {bytes, at} so trimming can evict oldest-first across sessions. */
const PACK_BUDGET = 150 * 1024 * 1024;
const STAT_PREFIX = "packstat:";

async function trimPacks(): Promise<void> {
  const d = await openDb();
  if (!d) return;
  try {
    await new Promise<void>((res) => {
      const tx = d.transaction(["meta", "packs"], "readwrite");
      tx.oncomplete = tx.onerror = tx.onabort = () => res();
      const meta = tx.objectStore("meta");
      const packs = tx.objectStore("packs");
      // Range-bound to stat keys — an unscoped getAll would
      // deserialize every cached listing page on each pack save.
      const range = IDBKeyRange.bound(STAT_PREFIX, STAT_PREFIX + "\uffff");
      const vals = meta.getAll(range);
      vals.onsuccess = () => {
        const keys = meta.getAllKeys(range);
        keys.onsuccess = () => {
          // getAll/getAllKeys both return in key order — index-aligned.
          let total = 0;
          const recs: { stat: IDBValidKey; url: string; at: number;
                        bytes: number }[] = [];
          keys.result.forEach((k, i) => {
            if (typeof k !== "string" || !k.startsWith(STAT_PREFIX))
              return;
            const v = vals.result[i] as
              { bytes?: unknown; at?: unknown } | undefined;
            const bytes = typeof v?.bytes === "number" ? v.bytes : 0;
            const at = typeof v?.at === "number" ? v.at : 0;
            total += bytes;
            recs.push({ stat: k, url: k.slice(STAT_PREFIX.length),
                        at, bytes });
          });
          recs.sort((a, b) => a.at - b.at); // oldest evicts first
          for (const r of recs) {
            if (total <= PACK_BUDGET) break;
            packs.delete(r.url);
            meta.delete(r.stat);
            total -= r.bytes;
          }
        };
      };
    });
  } catch { /* trimming is best-effort */ }
}

export function packPut(url: string, data: Uint8Array): Promise<unknown> {
  const put = rw("packs", "readwrite", (s) => s.put(data, url));
  // Record size/age then enforce the budget — all fire-and-forget;
  // caching must never block or fail a fetch path.
  void put.then((ok) => {
    if (ok == null) return; // put failed — don't log phantom bytes
    void rw("meta", "readwrite", (s) =>
      s.put({ bytes: data.byteLength, at: Date.now() },
            STAT_PREFIX + url))
      .then(() => trimPacks())
      .catch(() => {});
  });
  return put;
}
export function metaGet<T>(key: string): Promise<T | null> {
  return rw<T>("meta", "readonly", (s) => s.get(key));
}
export function metaPut(key: string, val: unknown): Promise<unknown> {
  return rw("meta", "readwrite", (s) => s.put(val, key));
}
