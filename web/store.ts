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
      req.onsuccess = () => res(req.result);
      req.onerror = () => res(null);
      req.onblocked = () => res(null);
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
        rq.onsuccess = () => res(rq.result);
        rq.onerror = () => res(null);
        tx.onerror = () => res(null);
      } catch { res(null); }
    });
  });
}

export function packGet(url: string): Promise<Uint8Array | null> {
  return rw<Uint8Array>("packs", "readonly", (s) => s.get(url));
}
export function packPut(url: string, data: Uint8Array): Promise<unknown> {
  return rw("packs", "readwrite", (s) => s.put(data, url));
}
export function metaGet<T>(key: string): Promise<T | null> {
  return rw<T>("meta", "readonly", (s) => s.get(key));
}
export function metaPut(key: string, val: unknown): Promise<unknown> {
  return rw("meta", "readwrite", (s) => s.put(val, key));
}
