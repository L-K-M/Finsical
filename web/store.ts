/**
 * Persistent local cache (IndexedDB). Two stores:
 *  - "packs": raw add-on/zip bytes keyed by fetch URL. archive.org
 *    entries are immutable per URL, so entries never expire.
 *  - "meta": small JSON records (listing pages), timestamped — callers
 *    decide freshness and stale fallback. Also holds user-supplied data
 *    (imported 'snd ' WAVs) that must NOT be LRU-evicted like the
 *    packs cache.
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
        // Settle on commit — a request "success" can still abort at
        // commit time (quota), which must not read as a stored value.
        tx.oncomplete = () => res(rq.result ?? null); // get-miss → null
        rq.onerror = () => res(null);
        tx.onerror = tx.onabort = () => res(null);
      } catch { res(null); }
    });
  });
}

/** Strict rw for the snds path only: resolves null on a real miss but
 * REJECTS on a backend failure. There a failed read must not look like
 * "no record" — merging over an unknown baseline would overwrite the
 * store with only the incoming records. Cache paths (listings, packs)
 * keep the lenient rw(): a failed read there just falls back to
 * fetching. */
function rwStrict<T>(store: string, mode: IDBTransactionMode,
                     run: (s: IDBObjectStore) => IDBRequest<T>
): Promise<T | null> {
  return openDb().then((d) => {
    if (!d) throw new Error("IndexedDB unavailable");
    return new Promise<T | null>((res, rej) => {
      try {
        const tx = d.transaction(store, mode);
        const rq = run(tx.objectStore(store));
        tx.oncomplete = () => res(rq.result ?? null);
        const fail = () =>
          rej(rq.error ?? tx.error ?? new Error("IndexedDB error"));
        rq.onerror = fail;
        tx.onerror = tx.onabort = fail;
      } catch (e) { rej(e); }
    });
  });
}

/** Dropped packs persist under a `local:` key — the scheme is shared
 * by the store (trim exemption), the importer (decode path) and the
 * tank (mint/delete), so it lives here, defined once. */
export const LOCAL_PREFIX = "local:";
export function isLocalPack(url: string): boolean {
  return url.startsWith(LOCAL_PREFIX);
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
            const url = k.slice(STAT_PREFIX.length);
            // User-dropped packs (local:) are stored user data, not a
            // fetch cache — the only copy of the file lives here, so
            // they neither count against the budget nor ever evict.
            if (isLocalPack(url)) return;
            total += bytes;
            recs.push({ stat: k, url, at, bytes });
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
  // Pack bytes and their trim stat commit in one transaction — a stat
  // orphaned by mid-write teardown would leave the pack invisible to
  // the budget and unevictable. Still fire-and-forget for callers:
  // caching must never block or fail a fetch path.
  // openDb resolves null on every failure path today — catch anyway so
  // a future rejection can't break the never-fail contract.
  const put = openDb().catch(() => null).then((d) => {
    if (!d) return null;
    return new Promise<unknown>((res) => {
      try {
        const tx = d.transaction(["packs", "meta"], "readwrite");
        tx.objectStore("packs").put(data, url);
        tx.objectStore("meta").put(
          { bytes: data.byteLength, at: Date.now() }, STAT_PREFIX + url);
        tx.oncomplete = () => res(true);
        tx.onerror = tx.onabort = () => res(null);
      } catch { res(null); }
    });
  });
  void put.then((ok) => {
    if (ok == null) return; // put failed — nothing to trim
    void trimPacks().catch(() => {});
  });
  return put;
}
export function packDelete(url: string): Promise<unknown> {
  // Drop the bytes and their trim stat together — a lone stat would
  // make trimPacks() count bytes that no longer exist.
  return openDb().catch(() => null).then((d) => {
    if (!d) return null;
    return new Promise<unknown>((res) => {
      try {
        const tx = d.transaction(["packs", "meta"], "readwrite");
        tx.objectStore("packs").delete(url);
        tx.objectStore("meta").delete(STAT_PREFIX + url);
        tx.oncomplete = () => res(true);
        tx.onerror = tx.onabort = () => res(null);
      } catch { res(null); }
    });
  });
}
export function metaGet<T>(key: string): Promise<T | null> {
  return rw<T>("meta", "readonly", (s) => s.get(key));
}
export function metaPut(key: string, val: unknown): Promise<unknown> {
  return rw("meta", "readwrite", (s) => s.put(val, key));
}

// User-imported 'snd ' sets, WAV-wrapped, keyed under one record.
// Stored as structured-cloned bytes — no base64 overhead — and merged
// by resource name so a second dropped fork extends rather than
// replaces. Not part of the pack LRU: this is user data, not cache.
const SNDS_KEY = "snds";
// Generous ceiling — a full 25-sound original set is ~2MB. Without a
// cap, repeated drops of large forks pin unbounded permanent storage.
const SNDS_CAP = 64 * 1024 * 1024;
export interface StoredSnd { name: string; wav: Uint8Array }
export function sndsGet(): Promise<StoredSnd[] | null> {
  return metaGet<StoredSnd[]>(SNDS_KEY);
}
// Merge stored records with incoming ones under the byte cap. Incoming
// records are budgeted first so a fresh drop isn't evicted by stale
// stored ones; an incoming record always replaces its stored namesake.
export function capSnds(cur: StoredSnd[] | null, records: StoredSnd[],
                        cap = SNDS_CAP): { out: StoredSnd[];
                                           dropped: number } {
  const m = new Map((cur ?? []).map((r) => [r.name, r]));
  for (const r of records) m.set(r.name, r);
  let used = 0;
  const fresh = new Map(records.map((r) => [r.name, r]));
  const out = [...fresh.values()]
    .concat([...m.values()].filter((r) => !fresh.has(r.name)))
    // Only budget what's kept — an oversized record is skipped, not
    // allowed to starve smaller records behind it.
    .filter((r) => used + r.wav.byteLength <= cap &&
                  (used += r.wav.byteLength, true));
  return { out, dropped: m.size - out.length };
}

// Strict get/put for the merge chain: a failed read rejects instead
// of reporting an empty baseline, and a failed write rejects instead
// of silently reporting success. Launch-time restore keeps the lenient
// sndsGet() — a miss there just means nothing to play this session.
function sndsGetStrict(): Promise<StoredSnd[] | null> {
  return rwStrict<StoredSnd[]>("meta", "readonly", (s) => s.get(SNDS_KEY));
}
function sndsPut(out: StoredSnd[]): Promise<boolean> {
  return rwStrict("meta", "readwrite", (s) => s.put(out, SNDS_KEY))
    .then(() => true); // rq.result is the key — resolve an explicit boolean
}

/** Read-modify-write of the snds record, factored for tests. `get`
 * resolves null on a real miss and must reject on a backend failure;
 * `put` rejects or resolves falsy on a failed write. Either failure
 * propagates — a failed read never overwrites the store, and callers
 * can't report a save that did not happen. */
export async function sndsMergeInto(
    get: () => Promise<StoredSnd[] | null>,
    put: (out: StoredSnd[]) => Promise<unknown>,
    records: StoredSnd[]): Promise<unknown> {
  const cur = await get();
  const { out, dropped } = capSnds(cur, records);
  if (dropped)
    console.warn(`snd store over ${SNDS_CAP >> 20}MB cap; dropped`,
                 dropped, "records");
  const ok = await put(out);
  if (!ok) throw new Error("snd store write failed");
  return ok;
}

// Serialize merges: read-modify-write means two overlapping calls can
// lose records when both read the same baseline before either writes.
let sndsChain: Promise<unknown> = Promise.resolve();
export function sndsMerge(records: StoredSnd[]): Promise<unknown> {
  const run = sndsChain.then(() =>
    sndsMergeInto(sndsGetStrict, sndsPut, records));
  sndsChain = run.catch(() => {}); // a failed merge mustn't poison the chain
  return run;
}

/** Drop records by name — add-on uninstall. Serialized with merges so a
 * removal can't be overwritten by a merge that read the old baseline. */
export function sndsRemove(names: Iterable<string>): Promise<unknown> {
  const drop = new Set(names);
  if (!drop.size) return Promise.resolve(null);
  const run = sndsChain.then(() => sndsGetStrict().then((cur) => {
    if (!cur?.length) return null;
    const out = cur.filter((r) => !drop.has(r.name));
    return out.length === cur.length ? null : sndsPut(out);
  }));
  sndsChain = run.catch(() => {});
  return run;
}
