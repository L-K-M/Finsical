/**
 * archive.org add-on import.
 *
 * The aquazonewithguppiesandaddons item packs each fish/gravel add-on as a
 * one-file zip inside a larger zip; aquazone-jpn-set holds the original
 * release's item library as loose pack files inside one big zip.
 * archive.org serves zip entries at /download/{item}/{outer}.zip/{inner}
 * and lists them on {outer}.zip/'s HTML page — all with
 * Access-Control-Allow-Origin: *, so this runs in the plain web shell
 * with no native bridge. Add-on identity is the entry URL (`inner` is
 * only a display name/species tag — basenames collide across folders).
 */
import { ownBytes } from "../core/data/bytes.js";
import { zipEntries, zipRead } from "../core/data/zip.js";
import { fshToSheets, isPack, packImages } from "../core/data/fsh.js";
import { decodeBmp, isBmp } from "../core/data/bmp.js";
import { AUDIO_FILE_EXT, fileSoundRecords } from "../core/data/snd.js";
import { bankSounds } from "../core/data/sndbank.js";
import { isLocalPack, metaGet, metaPut, packDelete, packGet, packPut }
  from "./store.js";
import { lruGet, lruSet } from "./lru.js";
import { pickDrawableSheet } from "../core/data/swimsheet.js";
import { TANK_SIZE } from "../core/tuning.js";
import type { SpriteSheet } from "../core/data/azpack.js";
import type { IndexedImage } from "../core/data/azpack.js";
import type { Bus, BusMsg } from "./bus.js";
import { isBackdropImage, isGravelImage, soundIcon } from "./render.js";
import { hasDecorFrames } from "../core/data/decor.js";
import { bindDialogKeys, mountList, mountPopup, mountWindow, pushButton,
         setButtonTitle } from "osmium-ui";

const BASE = "https://archive.org/download";
export const DEFAULT_ITEM = "aquazonewithguppiesandaddons";
const JPN_ITEM = "aquazone-jpn-set";
const JPN_ZIP = "AQUAZONE (JPN) SET.zip";
const JPN_ROOT = "AQUAZONE (JPN) SET/AQUAZONE ITEM/";
/** Non-retail bonus bundle inside the JPN set — carries the exclusive
 * たまちゃん/カメどん fish loose in subfolders and the Mac-only zip
 * (with its CD bonus track) nested a level deeper. */
const JPN_BONUS = `${JPN_ZIP}/AQUAZONE (JPN) SET/` +
  "AQUAZONE 非売品詰め合わせ.zip";
/** The main item's English library, a 7z that archive.org's archive
 * view lists and serves entry by entry, like a zip. */
const MISSING_7Z = "Missing addons Aquazone.7z";
const MISSING_ROOT = "Missing addons Aquazone/";

export interface Collection {
  section: string;
  /** Zip file inside the item. "a.zip/b.zip" is a nested zip-of-packs
   * (archive.org only serves one zip level), so its entries are
   * enumerated locally after fetching the collection zip. */
  outer: string;
  /** archive.org item — defaults to DEFAULT_ITEM. */
  item?: string;
  /** Loose-file mode: `outer` holds pack files (not inner zips) directly;
   * only entries under this inner path are listed, and each entry URL
   * serves the file itself. */
  prefix?: string;
  /** Loose-file mode: only entries matching this extension filter list —
   * keeps tank-set subfolders' stray .plt/.acc out of the tanks section.
   * Nested-zip mode: the leaf-entry filter (packs, audio, …). */
  exts?: RegExp;
  /** Nested-zip mode: matching entries also list when they sit inside
   * subdirectories of the collection zip (default is top-level only). */
  deep?: boolean;
  /** Nested-zip mode: entries matching this are themselves zips to
   * open; their `exts`-matching entries import too — the add-on sits
   * two archives deep, past what archive.org's zip view serves. */
  inside?: RegExp;
  /** Loose-file mode: the listing names entries under the wrong top
   * folder. Listed paths starting with `listed` are read (and fetched)
   * as starting with `stored`, before `prefix` is matched. */
  rename?: { listed: string; stored: string };
}

/** Outer archives that hold importable add-on packs. The JPN SET item
 * carries the original release's full item library as loose pack files
 * under AQUAZONE ITEM/ — the folders are the game's own categories. */
export const COLLECTIONS: Collection[] = [
  { section: "fish", outer: "addon and modded fish.zip" },
  { section: "gravel", outer: "gravel.zip" },
  { section: "plants", outer: "mekasia.zip/mekplants.zip" },
  { section: "accessories", outer: "mekasia.zip/mekaccs.zip" },
  { section: "plants", item: JPN_ITEM, outer: JPN_ZIP,
    prefix: JPN_ROOT + "水草/", exts: /\.plt$/i },
  { section: "accessories", item: JPN_ITEM, outer: JPN_ZIP,
    prefix: JPN_ROOT + "アクセサリー/", exts: /\.acc$/i },
  { section: "gravel", item: JPN_ITEM, outer: JPN_ZIP,
    prefix: JPN_ROOT + "底砂/", exts: /\.grv$/i },
  { section: "backgrounds", item: JPN_ITEM, outer: JPN_ZIP,
    prefix: JPN_ROOT + "背景/", exts: /\.bmp$/i },
  { section: "tanks", item: JPN_ITEM, outer: JPN_ZIP,
    prefix: JPN_ROOT + "水槽/", exts: /\.azn$/i },
  { section: "fish", item: JPN_ITEM, outer: JPN_ZIP,
    prefix: "AQUAZONE (JPN) SET/AQUAZONE 魚/", exts: /\.fsh$/i },
  // The non-retail bundle's fish sit in per-title subfolders; its Mac
  // archive (マッキンフィッシュ（MAC専用）.zip) holds the CD bonus track.
  { section: "fish", item: JPN_ITEM, outer: JPN_BONUS,
    exts: /\.fsh$/i, deep: true },
  // The Windows game's own sound effects. The 7z's listing drops the
  // first word of its top folder, and the listed URLs serve 0 bytes.
  { section: "sounds", outer: MISSING_7Z, prefix: MISSING_ROOT + "System/",
    exts: /\/AZ_WAVES\.REZ$/i,
    rename: { listed: "addons Aquazone/", stored: MISSING_ROOT } },
  { section: "sounds", item: JPN_ITEM, outer: JPN_BONUS,
    exts: AUDIO_FILE_EXT, deep: true, inside: /\.zip$/i },
];

const PACK_EXT = /\.(fsh|grv|plt|acc|azn|rez)$/i;
/** Loose collection entries: packs plus bare images (background BMPs). */
const DIRECT_EXT = /\.(fsh|grv|plt|acc|azn|rez|bmp)$/i;

/** A collection zip's HTML listing page URL. */
function pageUrl(item: string, outer: string): string {
  return `${BASE}/${item}/${encodeURIComponent(outer)}/`;
}

export interface Importable {
  section: string; inner: string; url: string;
  /** Sound record names this add-on contributed — persisted with the
   * install so uninstall can drop exactly these from the bank. */
  sounds?: string[];
  /** Plants/accessories only: how many copies "Add Again" put in the
   * tank. Absent means one — and every other section ignores it. */
  copies?: number;
}

/** "Add Again" is unbounded in-session; the persisted count caps so a
 * corrupt save or a bus-injected field can't spawn a floor full of
 * decor on relaunch. */
export const DECOR_COPIES_MAX = 16;

/** The single clamp for a decor copy *count* — persisted records and
 * per-call live counts both pass through it. Bounding the live tank
 * itself is decorCopyRoom's job below; this only bounds one number. */
export function clampDecorCopies(n: unknown): number {
  return Number.isInteger(n)
    ? Math.min(DECOR_COPIES_MAX, Math.max(1, n as number)) : 1;
}

/** Live slots left for one decor pack before the tank holds more
 * copies than a save could restore. addDecor() keys each copy by its
 * `src` verbatim, so filtering placed copies by `pack === src` counts
 * every earlier Add Again click. */
export function decorCopyRoom(decors: ReadonlyArray<{ pack: string }>,
                              src: string): number {
  return Math.max(0, DECOR_COPIES_MAX -
    decors.filter((d) => d.pack === src).length);
}

/** The persisted copy count, clamped to sanity (storage is untrusted). */
function decorCopies(it: Importable): number {
  return clampDecorCopies(it.copies);
}

/** Raw zip bytes, memoized by URL and persisted in IndexedDB — nested
 * collections share one parent download across all of their entry
 * URLs, and a cached zip survives restarts so restores and re-browses
 * never touch archive.org twice. Items are treated as immutable; an
 * uploader replacing a file serves stale bytes until LRU trims it —
 * accepted, since the worst case is dated sprite art. Bounded: outer
 * archives can run to tens of MB, and browsing several nested
 * collections would otherwise pin each one's bytes for the session.
 * An evicted URL refetches through IndexedDB, not the network. */
const ZIP_CACHE_CAP = 8;
/** Resolved-byte budget: entry count alone doesn't bound memory —
 * eight multi-ten-MB outers is the same leak in miniature. */
const ZIP_CACHE_BYTES = 96 << 20;
const zipCache = new Map<string, Promise<Uint8Array>>();
/** Promises still in flight — their slot is the download dedup key,
 * so eviction must skip them (a second caller would start a duplicate
 * multi-MB fetch otherwise). */
const zipPending = new WeakSet<Promise<Uint8Array>>();
/** Resolved byteLength per url, and its running total. */
const zipSize = new Map<string, number>();
let zipBytes = 0;
function zipEvict(url: string): void {
  zipBytes -= zipSize.get(url) ?? 0;
  zipSize.delete(url);
  zipCache.delete(url);
}
/** Note a resolved entry's size and trim the oldest resolved zips
 * while the byte budget is overshot. Pending entries stay. */
function zipWeigh(url: string, bytes: number): void {
  // Idempotent: a re-weighed url (refetch after eviction) replaces its
  // old count instead of double-adding.
  zipBytes -= zipSize.get(url) ?? 0;
  zipSize.set(url, bytes);
  zipBytes += bytes;
  for (const [k, v] of zipCache) {
    if (zipBytes <= ZIP_CACHE_BYTES) break;
    if (zipPending.has(v)) continue;
    zipEvict(k);
  }
}
/** Per-URL bytes on archive.org never change — safe to persist
 * forever. Other hosts (a dev server, a mutable mirror) keep only
 * their in-session memo so stale bytes can't wedge a dev loop. */
function immutableHost(u: string): boolean {
  try { return /(^|\.)archive\.org$/.test(new URL(u).hostname); }
  catch { return false; }
}
/** archive.org occasionally stalls mid-response. Without a timeout a
 * hung request pins its cache slot (and the caller's in-flight
 * install) forever — the panel's Try Again then no-ops against the
 * wedged entry. Aborting rejects like a network error, the cache
 * entry drops, and the retry starts a fresh request. */
const FETCH_TIMEOUT_MS = 30_000;
/** fetch + consume the body under a stall budget — any phase that
 * makes no progress for the limit aborts the request and rejects like
 * a network error. `kick` resets the clock: callers streaming a body
 * call it per chunk so a slow-but-healthy download always finishes —
 * only a true wedge dies. */
async function fetchTimed<T>(url: string,
                             read: (r: Response, kick: () => void)
                               => Promise<T>):
    Promise<T> {
  const ctl = new AbortController();
  let t = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  const kick = () => {
    clearTimeout(t);
    t = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  };
  try { return await read(await fetch(url, { signal: ctl.signal }), kick); }
  finally { clearTimeout(t); }
}
/** Body bytes via a reader so each arrived chunk can kick the stall
 * clock — `r.arrayBuffer()` would give no progress signal. */
async function readBody(r: Response, kick: () => void):
    Promise<Uint8Array> {
  const rd = r.body?.getReader();
  if (!rd) return new Uint8Array(await r.arrayBuffer());
  const chunks: Uint8Array[] = [];
  let len = 0;
  for (;;) {
    const { done, value } = await rd.read();
    if (done) break;
    chunks.push(value);
    len += value.length;
    kick();
  }
  const out = new Uint8Array(len);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}
function fetchZip(url: string): Promise<Uint8Array> {
  let p = lruGet(zipCache, url);
  if (!p) {
    const fresh = (async () => {
      const hit = immutableHost(url) ? await packGet(url) : null;
      // Weigh only while this promise still holds the slot — a count-
      // or byte-cap eviction (or a same-tick replacement) means these
      // bytes answer to nobody, and counting them would inflate
      // zipBytes with no eviction path to recover them. Invariant:
      // the lruSet below caches `fresh` itself — a stored wrapper
      // would silently disable weighing (and the byte cap with it).
      const ours = () => zipCache.get(url) === fresh;
      if (hit) { if (ours()) zipWeigh(url, hit.byteLength); return hit; }
      const d = await fetchTimed(url, async (r, kick) => {
        if (!r.ok) throw new Error(`${url}: ${r.status}`);
        return readBody(r, kick);
      });
      // archive.org answers a path its archive view can't find with an
      // empty 200. Persisted, that would stand in for the file forever.
      if (!d.length) throw new Error(`${url}: empty`);
      if (immutableHost(url)) void packPut(url, d).catch(() => {});
      if (ours()) zipWeigh(url, d.byteLength);
      return d;
    })();
    // onEvict routes count-cap trims through zipEvict too — every path
    // that drops an entry must keep zipSize/zipBytes honest.
    lruSet(zipCache, url, fresh, ZIP_CACHE_CAP,
           (v) => !zipPending.has(v), (k) => zipEvict(k));
    zipPending.add(fresh);
    // Delete only if still ours — a same-tick caller may have swapped in
    // a replacement promise before this one rejected.
    fresh.then(
      () => zipPending.delete(fresh),
      () => { zipPending.delete(fresh);
              if (zipCache.get(url) === fresh) zipEvict(url); });
    p = fresh;
  }
  return p;
}

/** A collection zip's HTML listing page, memoized and persisted with a
 * timestamp — several sections share one outer zip. Refetched once a
 * day; on failure the stale copy still serves (browse works offline). */
const pageCache = new Map<string, Promise<CachedPage>>();
const PAGE_TTL_MS = 24 * 3600 * 1000;
interface CachedPage { t: number; html: string }
async function listPage(item: string, outer: string): Promise<string> {
  const page = pageUrl(item, outer);
  // Memoized records keep their timestamp so the TTL is checked per
  // call — a long-lived session still refreshes listings once a day.
  const prev = pageCache.get(page);
  const rec = await prev?.catch(() => null) ?? null;
  if (rec && Date.now() - rec.t < PAGE_TTL_MS) return rec.html;
  // A same-tick caller may have swapped in its own refresh while we
  // awaited — ride it instead of double-fetching. Keep re-checking
  // after a rejecting sibling: another rider may have landed a
  // replacement while we waited on the failed one.
  for (let seen = prev; ;) {
    const cur = pageCache.get(page);
    if (!cur || cur === seen) break;
    seen = cur;
    const shared = await cur.catch(() => null);
    if (shared) return shared.html;
  }
  const p = (async (): Promise<CachedPage> => {
    const hit = immutableHost(page) ? await metaGet<CachedPage>(page)
                                    : null;
    if (hit && typeof hit.html === "string" &&
        Number.isFinite(hit.t) && Date.now() - hit.t < PAGE_TTL_MS)
      return hit;
    try {
      // Read through readBody, not r.text(): each chunk resets the
      // stall clock, so a big listing on a slow link isn't cut off.
      const fresh = await fetchTimed(page, async (r, kick) => {
        if (!r.ok) throw new Error(`${outer}: listing ${r.status}`);
        return { t: Date.now(),
                 html: new TextDecoder().decode(await readBody(r, kick)) };
      });
      if (immutableHost(page))
        void metaPut(page, fresh).catch(() => {});
      return fresh;
    } catch (e) {
      // Stale serve keeps offline browsing working. The memoized
      // record counts as fresh for a short window so an offline client
      // isn't refetching per section render — after that the TTL check
      // retries the fetch and self-heals.
      if (hit && typeof hit.html === "string")
        return { t: Date.now() - PAGE_TTL_MS + 30_000, html: hit.html };
      throw e;
    }
  })();
  pageCache.set(page, p);
  p.catch(() => { if (pageCache.get(page) === p) pageCache.delete(page); });
  return (await p).html;
}

/** List one collection's add-ons. Three outer layouts: a zip whose HTML
 * page exposes inner pack zips; a nested zip ("a.zip/b.zip", enumerated
 * locally — subdirectories and one zip-in-zip level when `deep`/`inside`
 * allow); or a zip holding loose pack files directly (`prefix` set —
 * each entry is served raw by zip view). */
async function listCollection(col: Collection): Promise<Importable[]> {
  const item = col.item ?? DEFAULT_ITEM;
  const { outer } = col;
  if (outer.includes("/")) {
    // Nested collection zip: no HTML listing exists, so enumerate its own
    // entries. Each entry is addressed as "{zip url}#{entry name}"; a
    // leaf inside a nested zip adds another fragment.
    const zipUrl =
      `${BASE}/${item}/${outer.split("/").map(encodeURIComponent).join("/")}`;
    const z = await fetchZip(zipUrl);
    const exts = col.exts ?? PACK_EXT;
    const stem = (n: string) =>
      n.replace(/\.[^.]+$/, "").split("/").pop()!;
    const out: Importable[] = [];
    // `inner` feeds names/labels — deep listings can repeat a basename
    // across subdirs, so collisions qualify with the path, then a count.
    const used = new Set<string>();
    const push = (entry: string, url: string): void => {
      const base = stem(entry);
      if (!base) return;
      // A colliding basename prefers the extension-stripped full path;
      // flat names have no path to fall back on, so count up.
      const full = entry.replace(/\.[^.]+$/, "");
      let inner = base;
      if (used.has(inner) && full !== base && !used.has(full))
        inner = full;
      for (let n = 2; used.has(inner); n++) inner = `${base} (${n})`;
      used.add(inner);
      out.push({ section: "", inner, url });
    };
    for (const e of zipEntries(z)) {
      if (e.name.endsWith("/")) continue; // directory entry
      if (exts.test(e.name) && (col.deep || !e.name.includes("/"))) {
        push(e.name, `${zipUrl}#${fragEncode(e.name)}`);
        continue;
      }
      if (!col.inside?.test(e.name)) continue;
      let iz: Uint8Array;
      try { iz = await zipRead(z, e); }
      catch { continue; } // unreadable nested archive — skip it
      let leaves: ReturnType<typeof zipEntries>;
      try { leaves = zipEntries(iz); }
      catch { continue; } // matched the .zip filter but isn't one
      for (const leaf of leaves) {
        if (leaf.name.endsWith("/") || !exts.test(leaf.name)) continue;
        push(leaf.name,
             `${zipUrl}#${fragEncode(e.name)}#${fragEncode(leaf.name)}`);
      }
    }
    return out;
  }
  const html = await listPage(item, outer);
  // Listing hrefs percent-encode the whole inner path (even its slashes
  // land as %2F inside one segment) — compare decoded, keep the original
  // href as the fetch URL.
  const hrefPref = `/download/${item}/${outer}/`;
  const seen = new Set<string>();
  const out: Importable[] = [];
  for (const m of html.matchAll(/href="([^"]+)"/g)) {
    // Resolve against the page URL so page-relative hrefs still land.
    let u: URL;
    try { u = new URL(m[1]!, pageUrl(item, outer)); }
    catch { continue; } // malformed href — not an entry link
    // Entry links live on archive.org or its node mirrors (iaNNNN…).
    if (u.host !== "archive.org" && !u.host.endsWith(".archive.org"))
      continue;
    let path: string;
    try { path = decodeURIComponent(u.pathname); }
    catch { continue; } // malformed escape — not an entry link
    if (!path.startsWith(hrefPref)) continue;
    let rel = path.slice(hrefPref.length);
    let url = u.href;
    if (col.rename && rel.startsWith(col.rename.listed)) {
      rel = col.rename.stored + rel.slice(col.rename.listed.length);
      url = `${BASE}/${item}/${encodeURIComponent(outer)}/` +
        encodeURIComponent(rel);
    }
    if (col.prefix !== undefined) {
      // Loose pack files inside the collection zip, listed at any depth.
      // `inner` is the entry's basename (minus extension) for display.
      if (!rel.startsWith(col.prefix) ||
          !(col.exts ?? DIRECT_EXT).test(rel)) continue;
      const inner = rel.slice(col.prefix.length)
        .replace(/\.[^.]+$/, "").split("/").pop()!;
      if (!inner || seen.has(url)) continue;
      seen.add(url);
      out.push({ section: "", inner, url });
    } else {
      // Inner pack zips, one level deep.
      if (!/\.zip$/i.test(rel) || rel.includes("/")) continue;
      const inner = rel.replace(/\.zip$/i, "");
      if (!inner || rel === outer || seen.has(url)) continue;
      seen.add(url);
      out.push({ section: "", inner, url });
    }
  }
  return out;
}

interface RawBlob { name: string; data: Uint8Array }

/** Minimal encoding for a zip-entry name inside a URL fragment: only
 * `#` and `%` are escaped, so a name without either keeps its raw
 * spelling and stays identical to URLs stored before encoding was
 * added (the URL doubles as the add-on's persisted identity). */
export const fragEncode = (name: string): string =>
  name.replace(/%/g, "%25").replace(/#/g, "%23");
/** Inverse of fragEncode: %23 decodes first so an escaped %25
 * can't decode into a fake %23 escape. */
export const fragDecode = (frag: string): string =>
  frag.replace(/%23/g, "#").replace(/%25/g, "%");

/** Fetch an add-on's raw file bytes. URL fragments chain: "{zip}#{entry}"
 * addresses one entry inside a nested collection zip, and a fragment
 * that is itself a zip entry descends another level ("{zip}#{a.zip}
 * #{dir/file.mp3}") — archive.org can't serve entries that deep. */
async function fetchInnerBlobs(url: string): Promise<RawBlob[]> {
  const [zipUrl, ...frags] = url.split("#");
  if (!frags.length && !/\.zip$/i.test(zipUrl!)) {
    // Loose file inside a collection zip — the URL serves the pack or
    // image itself; no container to open. fetchZip already memoizes,
    // dedupes concurrent calls, and persists bytes on immutable hosts.
    const name = zipUrl!.split("/").pop() ?? zipUrl!;
    let decoded = name;
    try { decoded = decodeURIComponent(name); } catch { /* keep raw */ }
    return [{ name: decoded, data: await fetchZip(zipUrl!) }];
  }
  let z = await fetchZip(zipUrl!);
  for (let i = 0; i < frags.length; i++) {
    // Fragments are fragEncode'd at listing time; raw match first
    // keeps URLs stored before encoding (and a literal %23 name)
    // working.
    const frag = frags[i]!;
    const decoded = fragDecode(frag);
    const e = zipEntries(z)
      .find((x) => x.name === frag || x.name === decoded);
    if (!e) throw new Error(`${url}: entry missing`);
    const d = await zipRead(z, e);
    if (i === frags.length - 1) return [{ name: e.name, data: d }];
    z = d; // this fragment addressed another zip — descend into it
  }
  // No fragments: every pack entry in the zip (multi-fish inner zips).
  const packs: RawBlob[] = [];
  for (const e of zipEntries(z)) {
    if (!PACK_EXT.test(e.name)) continue;
    const d = await zipRead(z, e);
    if (isPack(d)) packs.push({ name: e.name, data: d });
  }
  return packs;
}

export interface PackResult {
  sheets: Map<string, SpriteSheet>;
  images: Map<string, IndexedImage>;
  /** Sound records — `wav` is the encoded payload (literal WAV for
   * 'snd ' decodes, the compressed stream for audio files). */
  sounds: { name: string; wav: Uint8Array }[];
}

/** Which decoded packs would actually put something in the tank.
 * Each section counts only the art its renderer accepts: fish needs a
 * drawable sheet, gravel a strip-shaped image, backgrounds and tanks a
 * scene-sized image, plants and accessories decor art. Sheets only
 * render for fish, fish-pack portraits aren't scenery, and sections
 * with no image consumer count nothing visual — sounds still count
 * everywhere. */
export function usablePacks(rs: PackResult[], section: string):
    PackResult[] {
  return rs.filter((r) => {
    const images = [...r.images.values()];
    const usable =
        section === "fish"
          ? pickDrawableSheet(r.sheets.values()) !== null
        : section === "gravel"
          ? images.some((i) => isGravelImage(i, TANK_SIZE.width))
        : section === "backgrounds" || section === "tanks"
          ? images.some((i) => isBackdropImage(i, TANK_SIZE))
        : section === "plants" || section === "accessories"
          ? hasDecorFrames(images)
        : false;
    return usable || r.sounds.length > 0;
  });
}

/** Why an add-on came back with nothing usable — names the actual
 * missing piece instead of a generic "no pack inside". */
export function usableProblem(section: string): string {
  return section === "fish" ? "no drawable fish inside"
       : section === "gravel" ? "no gravel art inside"
       : "no pack inside";
}

/** Record names the leaving add-ons exclusively own — a name still
 * claimed by a surviving add-on stays in the bank (same-name records
 * overwrite each other in the store, so the survivor's copy is the
 * one that's actually there). */
export function orphanedSounds(gone: Importable[],
                               rest: Importable[]): string[] {
  const keep = new Set(rest.flatMap((a) => a.sounds ?? []));
  return [...new Set(gone.flatMap((a) => a.sounds ?? []))]
    .filter((n) => !keep.has(n));
}

/** How a finished install is recorded: "install" (a user's install)
 * adds the add-on when it is missing; "refresh" (a launch restore) only
 * updates an existing record, so an add-on removed while its restore
 * was still downloading stays removed. */
export type RecordMode = "install" | "refresh";

/** Record `it` in the saved add-on list with the sound names its
 * install put in the bank (merged into any names already recorded, so
 * uninstall knows what to drop). Returns whether the add-on is on the
 * list afterwards. Mutates `list`. */
export function recordAddon(list: Importable[], it: Importable,
                            soundNames: string[], mode: RecordMode): boolean {
  const rec = list.find((a) => a.url === it.url);
  if (!rec) {
    if (mode === "refresh") return false;
    // A bus-sent item could carry a copies field — a fresh record
    // always starts at one; re-installs grow it below.
    const clean = { ...it };
    delete clean.copies;
    list.push(soundNames.length
      ? { ...clean, sounds: [...new Set(soundNames)] } : clean);
    return true;
  }
  // Add Again on a decor pack persists one more copy; scenery and
  // fish records carry no count.
  if (mode === "install" &&
      (it.section === "plants" || it.section === "accessories"))
    rec.copies = Math.min(DECOR_COPIES_MAX, (decorCopies(rec)) + 1);
  if (soundNames.length)
    rec.sounds = [...new Set([...(rec.sounds ?? []), ...soundNames])];
  return true;
}

/** Whether `it` is still on the saved add-on `list`. A restore asks
 * right before applying a pack: an add-on removed since the restore
 * was queued (Remove, Empty Tank) must not come back. */
export function isListed(list: Importable[], it: Importable): boolean {
  return list.some((a) => a.url === it.url);
}

/** The listing qualifies colliding leaf names ("sub/dup", "dup (2)");
 * an audio-file record takes its name from the basename stem, so it
 * must carry the same qualification — otherwise installing the sibling
 * stem separately overwrites this record in the bank/store. Only the
 * record matching the unqualified leaf stem is renamed: 'snd ' fork
 * records and differently-stemmed audio keep their own names. */
export function qualifySoundItemName(
    recs: { name: string; wav: Uint8Array }[], inner: string):
    { name: string; wav: Uint8Array }[] {
  const stem = inner.split("/").pop()!
    .replace(/\.(zip|wav|mp3|aiff?|m4a|ogg|flac)$/i, "")
    .replace(/ \(\d+\)$/, "");
  return recs.map((s) =>
    s.name === stem && s.name !== inner ? { ...s, name: inner } : s);
}

/** Download + decode one add-on (inner zip of a collection zip). Returns
 * one result per pack entry — multi-fish zips keep species separate so
 * the caller can pick each one's best sheet. Sound-bearing entries
 * (audio files, 'snd ' resource forks) come back as sound records. */
export async function importAddon(url: string): Promise<PackResult[]> {
  // Dropped packs persist as raw bytes under a `local:` key — nothing
  // to download; decode them like any other pack blob.
  if (isLocalPack(url)) {
    const d = await packGet(url);
    if (!d) throw new Error(`${url}: stored pack missing`);
    if (!isPack(d)) throw new Error(`${url}: stored data is not a pack`);
    // Same shape as the remote isPack branch: a pack blob yields no
    // sound records — dropped loose audio already persisted via
    // handleSounds/sndsPut at drop time.
    return [{ sheets: fshToSheets(d), images: packImages(d),
              sounds: [] }];
  }
  const blobs = await fetchInnerBlobs(url);
  const out: PackResult[] = [];
  for (const b of blobs) {
    if (isPack(b.data)) {
      const sheets = fshToSheets(b.data), images = packImages(b.data);
      // A sound bank (AZ_WAVES.REZ) has WAVs and no art. A pack with
      // art brings no sounds: one kind of content per add-on.
      const sounds = sheets.size || images.size ? [] : bankSounds(b.data);
      out.push({ sheets, images, sounds });
    } else if (isBmp(b.data)) {
      const img = decodeBmp(b.data);
      if (img) out.push({ sheets: new Map(), sounds: [],
                         images: new Map([[url, img]]) });
    } else {
      const sounds = fileSoundRecords(b.name, b.data);
      if (sounds.length)
        out.push({ sheets: new Map(), images: new Map(), sounds });
    }
  }
  return out;
}

/** Display order of sections — first collection index per section. */
const SECTION_RANK = new Map<string, number>();
COLLECTIONS.forEach((c, i) => {
  if (!SECTION_RANK.has(c.section)) SECTION_RANK.set(c.section, i);
});

/** Fetch the listing pages of all collections (or those `only`
 * accepts), grouped by section in COLLECTIONS order. Never rejects: a
 * failed section just comes back empty. `onItems` fires per resolved
 * collection so a caller can show rows without waiting on the slowest
 * one. */
export async function listAddons(
    only: (c: Collection) => boolean = () => true,
    onItems?: (items: Importable[]) => void,
): Promise<Importable[]> {
  const cols = COLLECTIONS.filter(only);
  const lists = await Promise.all(cols.map(async (col) => {
    let items: Importable[] = [];
    try {
      items = await listCollection(col);
      for (const it of items) it.section = col.section;
    } catch (e) {
      console.warn(`archive.org listing failed for ${col.outer}:`, e);
      items = [];
    }
    // Outside the fetch try: a throwing UI callback must not
    // masquerade as a fetch failure or drop the collection's items.
    // But it still needs its own guard — an escape here would reject
    // Promise.all and void every other collection's results.
    if (items.length) {
      const warn = (cbErr: unknown) =>
        console.warn(`onItems callback failed for ${col.outer}:`, cbErr);
      try {
        const r: unknown = onItems?.(items);
        // A thenable return isn't awaited, but a rejection must still
        // not escape as an unhandled promise failure. Duck-typed:
        // instanceof Promise misses cross-realm and custom thenables.
        if (r && typeof (r as PromiseLike<unknown>).then === "function")
          Promise.resolve(r).catch(warn);
      } catch (cbErr) {
        warn(cbErr);
      }
    }
    return items;
  }));
  return lists.flat().sort((a, b) =>
    (SECTION_RANK.get(a.section) ?? 0) - (SECTION_RANK.get(b.section) ?? 0));
}

// ---- import panel --------------------------------------------------------

export interface ImportHandlers {
  /** `name` is the display/species label; `url` is the add-on identity.
   * `live` = user-initiated install; false on launch-time restore, which
   * must not spawn fish (the saved roster already holds them). */
  onSheets(sheets: Map<string, SpriteSheet>, name: string, url: string,
           section: string, live: boolean): void;
  /** `live` as for onSheets: a restore must not change the choice of
   * scenery on display. `count` is the persisted decor copy count —
   * 1 on a live install, `copies` on restore. */
  onImages(images: Iterable<IndexedImage>, src: string, section: string,
           live: boolean, count?: number): void;
  /** Sound records from a sound-bearing add-on — audio files and
   * 'snd ' resource forks alike arrive pre-flattened to {name, wav}.
   * `live` marks user installs vs restores (a restore must not play). */
  onSounds?(recs: { name: string; wav: Uint8Array }[],
            live: boolean): void;
  /** Fired once per successful install — lets the caller record which
   * add-ons went into the tank so they can be restored later.
   * `soundNames` are the record names (post-dedup) the install put in
   * the sound bank — uninstall needs them for provenance. */
  onInstall?(it: Importable, soundNames: string[]): void;
  /** Fired after a launch restore re-applies an add-on, with the sound
   * names it put back: refreshes the saved record's provenance (legacy
   * installs heal after one launch) without re-recording an add-on the
   * user removed while its restore was downloading. */
  onRestore?(it: Importable, soundNames: string[]): void;
  /** Why the tank can't take this add-on right now (e.g. it is full),
   * or null. Asked before a local install; the Import Add-ons window
   * gets the same answer from the tank page as an installFailed. */
  refuse?(it: Importable): string | null;
  /** Render decoded packs to a preview canvas; null = nothing to show. */
  preview(rs: PackResult[]): HTMLCanvasElement | null;
}

const DONATE_URL = "https://archive.org/donate";

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, cls: string, text = "",
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

/** MIME for a sound record's encoded bytes — magic-sniffed since the
 * record stem carries no extension ("" = let the element sniff). */
function audioType(d: Uint8Array): string {
  const s = (o: number, ...b: number[]) =>
    b.every((x, i) => d[o + i] === x);
  if (s(0, 0x52, 0x49, 0x46, 0x46)) return "audio/wav";   // RIFF
  if (s(0, 0x49, 0x44, 0x33) || s(0, 0xFF) && (d[1]! & 0xE0) === 0xE0)
    return "audio/mpeg";                                 // ID3 / frame sync
  if (s(0, 0x46, 0x4F, 0x52, 0x4D)) return "audio/aiff"; // FORM
  if (s(0, 0x4F, 0x67, 0x67, 0x53)) return "audio/ogg";  // OggS
  if (s(0, 0x66, 0x4C, 0x61, 0x43)) return "audio/flac"; // fLaC
  return "";
}

// Packs are immutable per URL — memoize so re-visits skip the download.
// Module-level so the tank page's remote-install path shares the cache.
// Bounded: a PackResult pins the decoded sheets and images — the
// expensive part of a pack, and the reason the render-side WeakMaps
// (swimCanvas, sheetScales) could never collect. Scrolling the whole
// catalog would otherwise keep every decoded pack in memory; an
// evicted URL re-derives from the zip cache/IndexedDB on revisit.
const PACK_CACHE_CAP = 16;
const packCache = new Map<string, Promise<PackResult[]>>();
/** Same in-flight pinning as zipPending: the map slot is the dedup
 * key, so an evicted pending fetch would double-download. */
const packPending = new WeakSet<Promise<PackResult[]>>();
/** The sound preview's live Blob URL — one at a time, revoked when the
 * detail pane rebuilds. */
let sndObjUrl: string | null = null;
export function fetchAddon(url: string): Promise<PackResult[]> {
  let p = lruGet(packCache, url);
  if (!p) {
    const fresh = importAddon(url);
    lruSet(packCache, url, fresh, PACK_CACHE_CAP,
           (v) => !packPending.has(v));
    packPending.add(fresh);
    // Failed fetches stay retryable; only evict if the entry is still
    // this promise (a rider may have replaced it already).
    fresh.then(
      () => packPending.delete(fresh),
      () => { packPending.delete(fresh);
              if (packCache.get(url) === fresh) packCache.delete(url); });
    p = fresh;
  }
  return p;
}

export interface PanelOptions {
  /** Mount point — the browser fills this element (the Import Add-ons
   * window's content) instead of opening its own window over the
   * tank. */
  host?: HTMLElement;
  /** Set on the Import Add-ons page: installs are posted to the tank
   * page, which owns the sim; results come back through notify(). */
  remote?: Bus;
}

/** Section names as the Show: pop-up lists them. */
const SECTION_TITLES: Record<string, string> = {
  fish: "Fish", gravel: "Gravel", plants: "Plants",
  accessories: "Accessories", backgrounds: "Backgrounds", tanks: "Tanks",
  sounds: "Sounds",
};
const KIND_NAMES: Record<string, string> = {
  fish: "Fish", gravel: "Gravel", plants: "Plant",
  accessories: "Accessory", backgrounds: "Background", tanks: "Tank",
  sounds: "Sound",
};
const SECTION_KEY = "finsical:addonSection";
/** List rows: 31px for a 38 x 28 thumbnail, and a white rule. */
const ROW_H = 32;
const MINI_W = 38, MINI_H = 28;
/** The overlay window's size over the tank, when there's room. */
const OVERLAY_W = 560, OVERLAY_H = 400;
/** Height of the native tank window's drag strip, kept clear. */
const TOP_CLEAR = 24;
/** Below this viewport width the overlay stacks the details under the
 * list and drops the preview. */
const NARROW_W = 480;
/** Detail-column height the preview must leave for the name, kind, a
 * two-line status and the Play button. */
const TEXT_ROOM = 99;
/** A preview well shorter than this isn't worth showing. */
const MIN_PREVIEW_H = 48;

/** A thumbnail shrunk (never enlarged) into the list's 38 x 28 box,
 * nearest-neighbor so the pixel art stays crisp. */
function miniThumb(src: HTMLCanvasElement): HTMLCanvasElement {
  const s = Math.min(1, MINI_W / src.width, MINI_H / src.height);
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.round(src.width * s));
  cv.height = Math.max(1, Math.round(src.height * s));
  const c = cv.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  c.drawImage(src, 0, 0, cv.width, cv.height);
  return cv;
}

/** The add-on browser, laid out like the Chooser: a Show: pop-up of
 * sections, the section's add-ons in a list, the selected one's
 * preview beside it, and Add to Tank as the default button. */
/** The browser's split of its content box (w x h) in whole pixels —
 * percentages in CSS would put the bitmap text on fractions of a pixel
 * and blur it. The list takes 46% of the width; the preview 55% of the
 * detail column's height (top 40, bottom 50), but never the room the
 * text under it needs; null when what's left isn't worth a well. */
export function browserGeometry(w: number, h: number):
    { listW: number; previewH: number | null } {
  const dh = h - 90;
  const ph = Math.min(Math.floor(dh * 0.55), dh - TEXT_ROOM);
  return { listW: Math.floor(w * 0.46),
           previewH: ph < MIN_PREVIEW_H ? null : ph };
}

/** A failed add-on download as one short line for the status area (the
 * full error, with its URL, goes to the console). */
export function loadProblem(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  const http = /: (\d{3})$/.exec(msg);
  if (http) return `archive.org answered with error ${http[1]}.`;
  if (msg === "no pack inside")
    return "The download has no add-on in it.";
  if (msg.endsWith(": empty"))
    return "archive.org sent an empty file. Try again later.";
  if (msg.endsWith(": entry missing"))
    return "The download is missing the add-on's file.";
  if (/abort/i.test(msg))
    return "The download took too long — try again.";
  return "Check the connection and try again.";
}

/** True when a failure could be a transient download hiccup — HTTP
 * statuses, short/empty bodies and network/timeout errors. Decode and
 * validation failures recur identically on retry, so the panel must
 * not offer Try Again for them. */
export function transientFailure(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /: \d{3}$/.test(msg) || /: (empty|entry missing)$/.test(msg) ||
         /abort|failed to fetch|networkerror|load failed|timeout/i.test(msg);
}

/** One user-facing line for a failed install: archive.org fetch
 * errors go through loadProblem; errors the tank raised itself
 * (cancelled installs, decode failures, refusals) already read as
 * plain prose and pass through. */
export function installProblem(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  return transientFailure(msg) || msg === "no pack inside"
    ? loadProblem(msg)
    : msg;
}

export function mountImportPanel(h: ImportHandlers, opts?: PanelOptions):
    { open(): void; close(): void; readonly isOpen: boolean;
      /** Resolves to the add-ons that failed to restore. */
      restore(list: Importable[],
              wanted: (it: Importable) => boolean): Promise<Importable[]>;
      notify(m: BusMsg): void } {
  const remote = opts?.remote;
  const installed = new Set<string>(); // add-on urls, not display names
  const thumbs = new Map<string, HTMLCanvasElement>();
  const fetchPack = fetchAddon;
  // The add-on on show — remote install acks update its status line.
  let detailRef: { url: string; status: HTMLElement } | null = null;

  // Over the tank (browser, touch) the browser opens as its own
  // Osmium window in a layer over the page; in the Import Add-ons
  // window it fills the window's content.
  const ov = opts?.host ? null : el("div", "ov");
  let card: HTMLElement;
  if (ov) {
    ov.style.display = "none";
    const win = el("div", "iwin");
    win.setAttribute("role", "dialog");
    win.setAttribute("aria-label", "Import add-ons");
    ov.appendChild(win);
    document.body.appendChild(ov);
    card = mountWindow(win, {
      title: "Import Add-ons",
      onClose: () => close(),
      onDrag: (e) => dragOverlay(win, e),
    }).content;
  } else {
    card = opts!.host!;
  }
  card.classList.add("imp");

  const head = el("div", "ihead");
  const showLabel = el("label", "osm-popup-title ishow", "Show:");
  const popBtn = el("button", "osm-popup ipop");
  popBtn.type = "button";
  popBtn.id = "imp-show";
  showLabel.htmlFor = popBtn.id;
  const filter = el("input", "ifilter");
  filter.placeholder = "Filter";
  filter.setAttribute("aria-label", "Filter the add-on list");
  filter.autocomplete = "off";
  filter.spellcheck = false;
  const count = el("div", "icount");
  count.setAttribute("aria-live", "polite");
  head.append(showLabel, popBtn, filter, count);

  const listHost = el("div", "ilist");
  const detail = el("div", "idetail");
  const pvBox = el("div", "osm-well ipreview");
  pvBox.setAttribute("aria-hidden", "true");
  const dname = el("div", "iname");
  const dmeta = el("div", "imeta");
  const status = el("div", "istatus");
  status.setAttribute("aria-live", "polite");
  const play = el("button", "osm-button iplay", "Play");
  play.type = "button";
  play.hidden = true;
  // The narrow layout makes room for Play beside the name while it
  // shows.
  const showPlay = (on: boolean) => {
    play.hidden = !on;
    card.classList.toggle("isound", on);
  };
  detail.append(pvBox, dname, dmeta, status, play);

  const foot = el("div", "ifoot");
  const credit = el("div", "icredit",
                    "Add-ons come from the Internet Archive.");
  const donate = el("button", "osm-button idonate", "Donate…");
  donate.type = "button";
  const add = el("button", "osm-button osm-default iadd", "Add to Tank");
  add.type = "button";
  add.disabled = true;
  foot.append(el("div", "osm-separator"), credit, donate, add);
  card.append(head, listHost, detail, foot);

  // ---- layout ---------------------------------------------------------
  // See browserGeometry; a narrow overlay stacks the details under the
  // list instead (app.css .inarrow).
  function layout(): void {
    const narrow = !!ov && window.innerWidth < NARROW_W;
    card.classList.toggle("inarrow", narrow);
    if (narrow) {
      listHost.style.width = detail.style.left = pvBox.style.height = "";
      return;
    }
    const g = browserGeometry(card.clientWidth, card.clientHeight);
    listHost.style.width = `${g.listW}px`;
    detail.style.left = `${g.listW + 24}px`; // list's 12px margin, then 12
    pvBox.hidden = g.previewH === null;
    pvBox.style.height = `${g.previewH ?? 0}px`;
  }
  new ResizeObserver(layout).observe(card);

  // ---- the default button ---------------------------------------------
  // One button carries the browser's next step: add the shown add-on,
  // add it again, or retry whatever failed.
  let addAction: (() => void) | null = null;
  // A double-click on a row whose detail is still fetching: the add
  // fires as soon as the fetch lands and offers an action.
  let dblAdd = false;
  function setAdd(title: string, action: (() => void) | null): void {
    addAction = action;
    add.disabled = !action;
    setButtonTitle(add, title);
  }
  pushButton(add, () => addAction?.());
  bindDialogKeys(add, null, { ok: () => addAction?.() });
  pushButton(donate, () => {
    window.open(DONATE_URL, "_blank", "noopener");
  });

  // ---- sound preview ------------------------------------------------------
  const audio = new Audio();
  const stopSound = () => {
    audio.pause();
    setButtonTitle(play, "Play");
  };
  audio.addEventListener("ended", stopSound);
  // The Import Add-ons window hides on close instead of unloading, and
  // close() only handles the overlay: without this a preview
  // would keep playing with no window left to stop it from.
  if (!ov) document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopSound();
  });
  pushButton(play, () => {
    if (!audio.paused) { stopSound(); return; }
    void audio.play().then(() => setButtonTitle(play, "Stop"),
                           () => setButtonTitle(play, "Play"));
  });
  function releaseSound(): void {
    stopSound();
    audio.removeAttribute("src");
    if (sndObjUrl) { URL.revokeObjectURL(sndObjUrl); sndObjUrl = null; }
  }

  // ---- sections and the list ----------------------------------------------
  let all: Importable[] = [];
  let sections: string[] = [];
  let section = "";
  let rows: Importable[] = [];
  // A user's own section pick survives later listing merges — only an
  // untouched view follows the saved section as collections land.
  let picked = false;
  const byUrl = new Map<string, Importable>();
  const popup = mountPopup(popBtn, {
    items: ["Fish"], selected: 0, label: "Show",
    onChange: (i) => { picked = true; showSection(sections[i]!); },
  });
  function setShowEnabled(on: boolean): void {
    popBtn.disabled = !on;
    filter.disabled = !on;
    showLabel.classList.toggle("osm-disabled", !on);
  }
  setShowEnabled(false);

  const list = mountList(listHost, {
    rowHeight: ROW_H,
    label: "Add-ons",
    onSelect: (i) => {
      const it = rows[i];
      if (it) showDetail(it); else clearDetail();
    },
    // Chooser convention: double-click installs the add-on. While its
    // detail is still fetching there's no action yet — queue the add
    // and fire it when the fetch lands and offers one.
    onOpen: (i) => {
      const it = rows[i];
      if (!it || detailRef?.url !== it.url) return;
      if (addAction) addAction();
      else dblAdd = true;
    },
  });

  function rowFor(it: Importable): HTMLElement {
    const r = el("div", "irow");
    r.dataset.url = it.url;
    r.dataset.name = it.inner;
    const box = el("span", "ithumb");
    r.append(box, el("span", "irowname", it.inner),
             el("span", "icheck", "✓"));
    r.classList.toggle("done", installed.has(it.url));
    const th = it.section === "sounds" ? soundIcon() : thumbs.get(it.url);
    if (th) paintThumb(r, th);
    return r;
  }

  function rowOf(url: string): HTMLElement | undefined {
    return list.rows.find((r) => r.dataset.url === url);
  }

  function showSection(sec: string): void {
    section = sec;
    try { localStorage.setItem(SECTION_KEY, sec); } catch { /* unavailable */ }
    applyFilter();
  }

  /** Rebuild the list for the current section under the filter text —
   * substring, case-insensitive, on the add-on's display name. The
   * query survives a section switch so "guppy" can be tried in each. */
  function applyFilter(): void {
    const q = filter.value.trim().toLowerCase();
    const pool = all.filter((x) => x.section === section);
    rows = q ? pool.filter((x) => x.inner.toLowerCase().includes(q))
             : pool;
    // Drop still-pending thumbs from the previous listing; in-flight
    // fetches complete anyway and their results stay memoized.
    thumbQueue.length = 0;
    thumbQueued.clear();
    io?.disconnect();
    list.setRows(rows.map(rowFor));
    for (const r of list.rows) {
      const it = byUrl.get(r.dataset.url ?? "");
      // Sounds show their icon: there's no art to download for them.
      if (!it || it.section === "sounds") continue;
      if (io) io.observe(r); else wantThumb(it);
    }
    count.textContent = q
      ? `${rows.length} of ${pool.length}`
      : `${rows.length} add-on${rows.length === 1 ? "" : "s"}`;
    clearDetail();
  }

  filter.addEventListener("input", applyFilter);
  filter.addEventListener("keydown", (e) => {
    // Escape clears the field; consuming it keeps the panel open.
    // isComposing: an IME-cancel Escape must not wipe the filter.
    // Safari reports composition keydowns with isComposing false and
    // keyCode 229 — the canonical IME guard checks both.
    if (!(e.isComposing || e.keyCode === 229) &&
        e.key === "Escape" && filter.value) {
      filter.value = "";
      applyFilter();
      e.preventDefault();
      e.stopPropagation();
    }
  });

  // ---- detail ---------------------------------------------------------------
  // The preview on show, kept to re-place it when the well resizes.
  let shownPreview: HTMLCanvasElement | null = null;
  // A remote install awaiting the tank's ack: `retry` repeats it,
  // `more` adds another copy once it landed.
  let pending: { ref: object; retry: () => void; more: () => void } | null =
    null;
  // Sets the default button for the add-on on show from its install
  // state; null until its pack has loaded.
  let offer: (() => void) | null = null;
  new ResizeObserver(() => {
    if (shownPreview) placePreview(shownPreview);
  }).observe(pvBox);

  function clearDetail(): void {
    releaseSound();
    detailRef = null;
    pending = null; // its ack still marks the row, not the pane
    offer = null;
    shownPreview = null;
    pvBox.textContent = "";
    dname.textContent = "";
    dmeta.textContent = "";
    showPlay(false);
    status.textContent = section === "sounds"
      ? "AZ_WAVES holds the game's own sound effects. You can also drop " +
        "your copy's .rsrc, .bin, .hqx or .REZ file on the tank or this " +
        "window. Plain audio works too: .wav, .mp3, .aiff, .m4a, .ogg " +
        "or .flac."
      : all.length ? "Select an add-on to preview it." : "";
    if (all.length) setAdd("Add to Tank", null);
  }

  /** Show a preview canvas in the well: scaled by a whole factor to
   * fill it, or shrunk to fit, on whole-pixel offsets. */
  function placePreview(pv: HTMLCanvasElement): void {
    shownPreview = pv;
    pvBox.textContent = "";
    const bw = pvBox.clientWidth - 8, bh = pvBox.clientHeight - 8;
    if (bw < 1 || bh < 1) return; // hidden: placed once it has a size
    let src = pv;
    let s = Math.floor(Math.min(bw / pv.width, bh / pv.height, 4));
    if (s < 1) { src = scaled(pv, Math.min(bw / pv.width, bh / pv.height)); s = 1; }
    const cv = el("canvas", "");
    cv.width = src.width; cv.height = src.height;
    cv.getContext("2d")!.drawImage(src, 0, 0);
    cv.style.width = `${src.width * s}px`;
    cv.style.height = `${src.height * s}px`;
    cv.style.left = `${Math.floor((pvBox.clientWidth - 2 - src.width * s) / 2)}px`;
    cv.style.top = `${Math.floor((pvBox.clientHeight - 2 - src.height * s) / 2)}px`;
    pvBox.appendChild(cv);
  }
  function scaled(src: HTMLCanvasElement, f: number): HTMLCanvasElement {
    const cv = document.createElement("canvas");
    cv.width = Math.max(1, Math.floor(src.width * f));
    cv.height = Math.max(1, Math.floor(src.height * f));
    const c = cv.getContext("2d")!;
    c.imageSmoothingEnabled = false;
    c.drawImage(src, 0, 0, cv.width, cv.height);
    return cv;
  }

  function showDetail(it: Importable): void {
    // The previous preview's Blob URL pins its bytes — release it now
    // that the pane is rebuilt.
    releaseSound();
    pending = null;
    offer = null;
    dblAdd = false;
    shownPreview = null;
    pvBox.textContent = "";
    dname.textContent = it.inner;
    dmeta.textContent =
      `${KIND_NAMES[it.section] ?? it.section} · archive.org`;
    status.textContent = "Fetching add-on…";
    showPlay(false);
    setAdd(installed.has(it.url) ? "Add Again" : "Add to Tank", null);
    const ref = { url: it.url, status };
    detailRef = ref;

    void fetchPack(it.url).then((rs) => {
      const usable = usablePacks(rs, it.section);
      if (!usable.length) throw new Error(usableProblem(it.section));
      const pv = h.preview(usable);
      // Cache the thumb even if the selection moved on while the fetch
      // was in flight; only the pane waits on it being current.
      if (pv) { thumbs.set(it.url, pv); storeThumb(it, pv); }
      const r = rowOf(it.url);
      if (r && pv) paintThumb(r, pv);
      // A stale resolve must not create a Blob URL (it would orphan on
      // the next assignment) or touch the pane: the ref object
      // identifies this showing.
      if (detailRef !== ref) return;
      const snds = usable.flatMap((x) => x.sounds);
      if (pv) placePreview(pv);
      else if (snds.length) placePreview(soundIcon());
      if (snds.length) {
        // Sound add-ons preview with a real player — the payload is
        // already-decoded WAV or a browser-decodable encoded stream.
        sndObjUrl = URL.createObjectURL(
          new Blob([ownBytes(snds[0]!.wav)],
                   { type: audioType(snds[0]!.wav) }));
        audio.src = sndObjUrl;
        showPlay(true);
        setButtonTitle(play, "Play");
      }
      const kinds = [...new Set(usable.map((x) =>
        x.sheets.size ? "fish" : x.sounds.length ? "sound" : "scenery"))]
        .join(" + ");
      status.textContent = installed.has(it.url)
        ? "Already in the tank."
        : `${usable.length} pack${usable.length > 1 ? "s" : ""}, ${kinds}.`;
      // `again` travels with the label the user reads: both install
      // paths drop a first add of something already in the tank, which
      // is what "Add to Tank" promises.
      const addIt = (again: boolean) => {
        const refusal = remote ? null : h.refuse?.(it) ?? null;
        if (refusal) {
          status.textContent = refusal;
          return;
        }
        try {
          applyAddon(it, usable, again);
        } catch (e) {
          status.textContent = String(e);
          return;
        }
        // Local installs are synchronous; remote ones flip on the ack.
        if (!remote) {
          status.textContent = "Added to the tank.";
          setAdd("Add Again", () => addIt(true));
          return;
        }
        setAdd("Adding…", null);
        // The relay can drop the message if the tank page is
        // mid-reload — recover the button if no ack comes back.
        const p = { ref, retry: () => addIt(again), more: () => addIt(true) };
        pending = p;
        setTimeout(() => {
          if (pending !== p || detailRef !== ref) return;
          pending = null;
          setAdd("Try Again", p.retry);
          status.textContent = "No response from the tank — try again.";
        }, 15_000);
      };
      // Offered again whenever the add-on's install state changes under
      // the pane (a launch-time restore, another window's install).
      offer = () => {
        const again = installed.has(it.url);
        setAdd(again ? "Add Again" : "Add to Tank", () => addIt(again));
      };
      offer();
      // The row was double-clicked while the detail fetched — the
      // offered action is what that click meant.
      if (dblAdd) { dblAdd = false; addAction?.(); }
    }).catch((e) => {
      if (detailRef !== ref) return;
      dblAdd = false;
      console.warn(`add-on ${it.inner} failed to load:`, e);
      // installProblem, not loadProblem: a deterministic failure keeps
      // the tank's own message instead of "try again" beside a disabled
      // Try Again button.
      status.textContent = `Couldn't load it. ${installProblem(e)}`;
      // A decode or validation failure recurs identically — retrying
      // only repeats the same dead end, so the button stays off.
      setAdd("Try Again", transientFailure(e) ? () => showDetail(it)
                                              : null);
    });
  }

  // ---- in-page window dragging (the overlay) --------------------------------
  function dragOverlay(win: HTMLElement, e: PointerEvent): void {
    e.preventDefault();
    const r = win.getBoundingClientRect();
    const dx = e.clientX - r.left, dy = e.clientY - r.top;
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      const x = Math.round(Math.min(window.innerWidth - 40,
                                    Math.max(40 - r.width, ev.clientX - dx)));
      const y = Math.round(Math.min(window.innerHeight - 20,
                                    Math.max(TOP_CLEAR, ev.clientY - dy)));
      win.style.left = `${x}px`;
      win.style.top = `${y}px`;
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }
  // Centered on whole pixels, clear of the native shell's 22px drag
  // strip along the top edge.
  function placeOverlay(): void {
    const win = ov!.firstElementChild as HTMLElement;
    const w = Math.min(OVERLAY_W, window.innerWidth - 16);
    const hh = Math.min(OVERLAY_H, window.innerHeight - TOP_CLEAR - 8);
    win.style.width = `${w}px`;
    win.style.height = `${hh}px`;
    win.style.left = `${Math.floor((window.innerWidth - w) / 2)}px`;
    win.style.top =
      `${Math.max(TOP_CLEAR, Math.floor((window.innerHeight - hh) / 2))}px`;
  }

  function paintThumb(row: Element, th: HTMLCanvasElement): void {
    const box = row.querySelector(".ithumb");
    if (!box || box.firstChild) return;
    const cv = miniThumb(th);
    cv.style.left = `${Math.floor((MINI_W - cv.width) / 2)}px`;
    cv.style.top = `${Math.floor((MINI_H - cv.height) / 2)}px`;
    box.appendChild(cv);
  }

  // Row thumbs fetch lazily: when a row scrolls into view its pack is
  // downloaded through the same memoized path as the detail view,
  // decoded via h.preview, and painted back. Bounded concurrency keeps
  // the fetch trickle polite to archive.org; failures leave a
  // name-only row.
  const thumbQueued = new Set<string>();
  const thumbQueue: Importable[] = [];
  // URLs whose fetch already started: queued/queued-set only cover the
  // wait, so without this a second wantThumb mid-fetch re-queues a
  // duplicate that burns one of the THUMB_PAR slots.
  const thumbFetching = new Set<string>();
  let thumbRunning = 0;
  const THUMB_PAR = 3;

  // Thumbnails persist across launches as PNG bytes in the IndexedDB
  // pack cache so the add-on list doesn't re-download every pack each
  // run. The "thumb2:{url}" keys ride the same LRU budget as pack bytes
  // (they're derived data — eviction just re-fetches). Kept out of
  // localStorage deliberately: that quota also holds the tank save,
  // and a full thumb set could starve it. Best-effort: storage
  // failures (private mode, quota) fall back to the fetch path.
  // "thumb2:" since previews show each species' adult swim ring: older
  // "thumb:" entries can hold the shared fry art, and the LRU trims them.
  const THUMB_PREFIX = "thumb2:";
  const thumbKey = (it: Importable): string => THUMB_PREFIX + it.url;
  // The retired localStorage thumbs predate that too: drop them rather
  // than migrate stale art into the cache.
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith("finsical:thumb:")) localStorage.removeItem(k);
    }
  } catch { /* storage unavailable */ }
  // Stored thumbs only ever feed <=96px tiles — cap them so thumb churn
  // in the shared LRU budget can't crowd out installed pack bytes.
  const THUMB_MAX = 256;
  function storeThumb(it: Importable, cv: HTMLCanvasElement): void {
    if (!immutableHost(it.url)) return; // mutable source — never cache
    let src = cv;
    const s = Math.min(1, THUMB_MAX / Math.max(cv.width, cv.height));
    if (s < 1) {
      src = document.createElement("canvas");
      src.width = Math.max(1, Math.round(cv.width * s));
      src.height = Math.max(1, Math.round(cv.height * s));
      src.getContext("2d")!.drawImage(cv, 0, 0, src.width, src.height);
    }
    src.toBlob((b) => {
      if (!b) return;
      void b.arrayBuffer()
        .then((ab) => packPut(thumbKey(it), new Uint8Array(ab)))
        .catch(() => { /* cache skipped */ });
    }, "image/png");
  }
  function storedThumbPainted(it: Importable): void {
    const t = rowOf(it.url);
    const th = thumbs.get(it.url);
    if (t && th) paintThumb(t, th);
  }
  // Starts an async cache read; true when a fetch can be skipped for now.
  function loadStoredThumb(it: Importable): boolean {
    if (!immutableHost(it.url)) return false;
    thumbQueued.add(it.url);
    void packGet(thumbKey(it)).then((bytes) => {
      if (!bytes) {
        thumbQueued.delete(it.url);
        if (!thumbQueue.some((q) => q.url === it.url))
          thumbQueue.push(it);
        pumpThumbs();
        return;
      }
      const blob = new Blob([ownBytes(bytes)], { type: "image/png" });
      const done = (bmp: CanvasImageSource, w: number, h: number) => {
        const cv = document.createElement("canvas");
        cv.width = w; cv.height = h;
        cv.getContext("2d")!.drawImage(bmp, 0, 0);
        thumbs.set(it.url, cv);
        thumbQueued.delete(it.url);
        storedThumbPainted(it);
      };
      if (typeof createImageBitmap === "function") {
        createImageBitmap(blob).then(
          (bmp) => { done(bmp, bmp.width, bmp.height); bmp.close(); },
          () => decodeViaImage(blob));
      } else decodeViaImage(blob);
      function decodeViaImage(b: Blob): void {
        const obj = URL.createObjectURL(b);
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(obj);
          done(img, img.naturalWidth, img.naturalHeight);
        };
        img.onerror = () => {
          URL.revokeObjectURL(obj);
          thumbQueued.delete(it.url);
          // Corrupt entry — evict it, then fall through to a real fetch.
          void packDelete(thumbKey(it)).catch(() => {});
          if (!thumbQueue.some((q) => q.url === it.url))
            thumbQueue.push(it);
          pumpThumbs();
        };
        img.src = obj;
      }
    }).catch(() => {
      thumbQueued.delete(it.url);
      if (!thumbQueue.some((q) => q.url === it.url)) thumbQueue.push(it);
      pumpThumbs();
    });
    return true;
  }

  function pumpThumbs(): void {
    while (thumbRunning < THUMB_PAR && thumbQueue.length) {
      const it = thumbQueue.shift()!;
      thumbRunning++;
      thumbFetching.add(it.url);
      void fetchPack(it.url).then((rs) => {
        const usable = usablePacks(rs, it.section);
        const pv = usable.length ? h.preview(usable) : null;
        if (!pv) return;
        thumbs.set(it.url, pv);
        storeThumb(it, pv);
        const t = rowOf(it.url);
        if (t) paintThumb(t, pv);
      }).catch((e) => {
        console.warn(`add-on thumb failed for ${it.inner}:`, e);
      })
        .finally(() => {
          thumbRunning--;
          thumbFetching.delete(it.url);
          pumpThumbs();
        });
    }
  }

  function wantThumb(it: Importable): void {
    if (thumbs.has(it.url) || thumbQueued.has(it.url) ||
        thumbFetching.has(it.url)) return;
    if (loadStoredThumb(it)) return;
    thumbQueued.add(it.url);
    thumbQueue.push(it);
    pumpThumbs();
  }

  const io: IntersectionObserver | null =
    "IntersectionObserver" in window
      ? new IntersectionObserver((ents, obs) => {
        for (const en of ents) {
          if (!en.isIntersecting) continue;
          obs.unobserve(en.target);
          const it =
            byUrl.get((en.target as HTMLElement).dataset.url ?? "");
          if (it) wantThumb(it);
        }
      })
      : null;

  // Shared fetch→dispatch→mark-installed core for applyAddon (manual
  // install) and restore (re-import on launch); only the onInstall
  // side effect differs. `live` marks user installs vs restores.
  function applyPack(it: Importable, rs: PackResult[],
                     live: boolean): string[] {
    const usable = usablePacks(rs, it.section);
    if (!usable.length) throw new Error(usableProblem(it.section));
    const soundNames: string[] = [];
    for (const r of usable) {
      if (r.sheets.size)
        h.onSheets(r.sheets, it.inner, it.url, it.section, live);
      if (r.images.size)
        h.onImages(r.images.values(), it.url, it.section, live,
                   live ? 1 : decorCopies(it));
      if (r.sounds.length) {
        const recs = qualifySoundItemName(r.sounds, it.inner);
        // The handler may rename colliding records in place — read the
        // names after it ran so uninstall drops what was stored.
        h.onSounds?.(recs, live);
        for (const s of recs) soundNames.push(s.name);
      }
    }
    markInstalled(it.url, true);
    const pv = h.preview(usable);
    if (pv) { thumbs.set(it.url, pv); storeThumb(it, pv); }
    return soundNames;
  }

  function markInstalled(url: string, on: boolean): void {
    if (on) installed.add(url); else installed.delete(url);
    rowOf(url)?.classList.toggle("done", on);
    if (detailRef?.url !== url) return;
    // A state push can report the install before (or instead of) its
    // ack: settle the pending add the same way.
    if (on && pending?.ref === detailRef) ackInstalled();
    else if (!pending) offer?.();
  }
  function ackInstalled(): void {
    const p = pending!;
    pending = null;
    detailRef!.status.textContent = "Added to the tank.";
    setAdd("Add Again", p.more);
  }

  function applyAddon(it: Importable, rs: PackResult[],
                      again: boolean): void {
    // Remote mode (Import Add-ons window): the tank page owns the sim —
    // send the request there and flip the UI when its ack comes back
    // via notify(). The tank page re-reads the pack in its own JS
    // context — decoded objects can't cross the bus, but both webviews
    // share the IndexedDB pack cache so the second read stays local.
    if (remote) {
      remote.post({ op: "install", item: it, again });
      return;
    }
    // A launch-time restore may have installed it while the detail fetch
    // was in flight — honor the label the user actually clicked.
    if (!again && installed.has(it.url)) return;
    const soundNames = applyPack(it, rs, true);
    h.onInstall?.(it, soundNames);
  }

  function savedSection(): string | null {
    try { return localStorage.getItem(SECTION_KEY); }
    catch { return null; } // storage unavailable
  }

  // Invalidates a previous loadListing attempt still in flight — its
  // late collections must not merge into the retried listing.
  let listingGen = 0;

  /** Merge one collection's items into the listing as it resolves —
   * rows appear per section instead of all at once when the slowest
   * collection lands. */
  function mergeListing(gen: number, items: Importable[]): void {
    if (gen !== listingGen) return;
    all.push(...items);
    for (const it of items) byUrl.set(it.url, it);
    all.sort((a, b) => (SECTION_RANK.get(a.section) ?? 0) -
                       (SECTION_RANK.get(b.section) ?? 0));
    const secs = [...new Set(all.map((x) => x.section))];
    if (secs.join("\0") !== sections.join("\0")) {
      sections = secs;
      popup.setItems(sections.map((s) => SECTION_TITLES[s] ?? s),
                     Math.max(0, sections.indexOf(section)));
    }
    setShowEnabled(true);
    if (!picked) {
      const sv = savedSection();
      // Land on the saved section once it arrives; until then the
      // first available section has something to show.
      showSection(sv && sections.includes(sv) ? sv : sections[0]!);
    } else if (sections.includes(section)) {
      applyFilter(); // new rows may join the viewed section
    }
    // A section whose collection is still in flight reads as fetching;
    // an empty *filtered* view of an arrived section is not fetching.
    list.setEmpty(all.some((x) => x.section === section)
      ? "" : "Fetching the archive.org listing…");
  }

  function loadListing(): void {
    all = [];
    sections = [];
    section = "";
    rows = [];
    byUrl.clear();
    picked = false;
    list.setRows([]);
    list.setEmpty("Fetching the archive.org listing…");
    count.textContent = "";
    status.textContent = "";
    setAdd("Add to Tank", null);
    setShowEnabled(false);
    const gen = ++listingGen;
    void listAddons(undefined, (items) => mergeListing(gen, items))
      .then((items) => {
      if (gen !== listingGen) return;
      if (!items.length) throw new Error("empty listing");
      // Re-anchor `all` to the final COLLECTIONS-ordered list before
      // re-rendering — mergeListing appended in network-arrival
      // order, which made within-section row order timing-dependent.
      all = items;
      // A user's own pick outranks the saved section.
      if (!picked) {
        const sv = savedSection();
        const start = sv && sections.includes(sv) ? sv : sections[0]!;
        popup.setItems(sections.map((s) => SECTION_TITLES[s] ?? s),
                       sections.indexOf(start));
        showSection(start);
      } else applyFilter();
      // A viewable section always has items (sections are built from
      // `all`); empty at this point means its collection failed —
      // unless a filter hid the rows, which is not a fetch failure.
      list.setEmpty(all.some((x) => x.section === section)
        ? "" : "Couldn't load this section.");
    }).catch((e) => {
      console.warn("add-on listing failed:", e);
      list.setEmpty("Couldn't reach archive.org.");
      status.textContent = "Check the connection and try again.";
      setAdd("Try Again", loadListing);
    });
  }

  function close(): void {
    if (!ov || ov.style.display === "none") return;
    ov.style.display = "none";
    // Pause only: the pane still shows the sound and its Play button,
    // which must work after a reopen. The Blob URL goes when the pane
    // is rebuilt.
    stopSound();
  }
  if (ov) {
    ov.addEventListener("pointerdown", (e) => {
      if (e.target === ov) close();
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && ov.style.display !== "none" &&
          !e.defaultPrevented) {
        close();
        e.preventDefault();
      }
    });
    window.addEventListener("resize", () => {
      if (ov.style.display !== "none") placeOverlay();
    });
  }

  let loaded = false;
  return {
    open() {
      if (ov) {
        ov.style.display = "block";
        placeOverlay();
      }
      listHost.focus({ preventScroll: true });
      if (!loaded) { loaded = true; loadListing(); }
    },
    close,
    get isOpen() { return ov ? ov.style.display !== "none" : true; },
    // Remote-mode replies from the tank page and state pushes land here.
    notify(m: BusMsg): void {
      const ackUrl = m.url;
      if (m.op === "installed" && typeof ackUrl === "string") {
        markInstalled(ackUrl, true); // settles the pending add
      } else if (m.op === "installFailed" && typeof ackUrl === "string") {
        if (detailRef?.url === ackUrl && pending?.ref === detailRef) {
          const p = pending;
          pending = null;
          detailRef.status.textContent = `Couldn't add it: ${m.error}`;
          setAdd("Try Again", p.retry);
        }
      } else if (m.op === "state" && Array.isArray(m.addons)) {
        // Tank's add-on list — sync install marks (covers restores that
        // finished before this window opened, and removals).
        const live = new Set(
          (m.addons as { url?: unknown }[])
            .map((a) => a.url)
            .filter((x): x is string => typeof x === "string"));
        for (const url of [...installed])
          if (!live.has(url)) markInstalled(url, false);
        for (const url of live)
          if (!installed.has(url)) markInstalled(url, true);
      }
    },
    // Re-install saved add-ons in order (restores fish sheets and the
    // gravel backdrop). Sequential so slot/backdrop assignment matches
    // the original install order; failures skip that add-on. Shares
    // applyPack's dispatch so the two install paths can't diverge;
    // fires onRestore to refresh sound provenance, which never re-adds.
    // Skips add-ons already installed while the chain was in flight, or
    // no longer `wanted` when their turn comes, and resolves with the
    // ones that failed, so the caller can retry them.
    restore(list: Importable[],
            wanted: (it: Importable) => boolean): Promise<Importable[]> {
      if (remote) return Promise.resolve([]); // the tank page owns the sim
      const failed: Importable[] = [];
      // Warm fetches a few at a time: packCache dedupes by URL, so the
      // serial chain below awaits work already running instead of
      // starting each download as the previous pack applies. Four
      // concurrent fetches hide most of restore's latency without a
      // thundering herd against archive.org (or a decode burst on the
      // main thread) at the moment of maximum contention. Errors
      // surface through the chain's own catch, so the warm-up
      // promise's rejection only needs swallowing.
      const RESTORE_FETCH_CAP = 4;
      const warm = list.filter((it) => !installed.has(it.url) && wanted(it));
      let wi = 0, active = 0;
      const pump = (): void => {
        while (wi < warm.length && active < RESTORE_FETCH_CAP) {
          const it = warm[wi++]!;
          // Re-check both gates: installed can change while the pump
          // idles between settles (a manual import landing mid-restore).
          if (installed.has(it.url) || !wanted(it)) continue;
          active++;
          // The trailing catch covers a throwing re-pump (a wanted
          // predicate throwing inside .finally) — the warm-up path can
          // never produce an unhandled rejection.
          void fetchPack(it.url).catch(() => {})
            .finally(() => { active--; pump(); })
            .catch(() => {});
        }
      };
      pump();
      let p: Promise<void> = Promise.resolve();
      for (const it of list) {
        p = p.then(() => {
          if (installed.has(it.url) || !wanted(it)) return;
          return fetchPack(it.url)
            .then((rs) => {
              // Asked again: it may have been removed during the fetch.
              if (installed.has(it.url) || !wanted(it)) return;
              // Restores refresh the saved record's sound provenance —
              // legacy installs recorded before it existed heal after
              // one launch, so uninstall can drop their records too.
              // applyPack must run unconditionally — inside the ?.()
              // call a missing onRestore would skip the whole restore.
              const names = applyPack(it, rs, false);
              h.onRestore?.(it, names);
            })
            .catch((e) => {
              failed.push(it);
              console.warn(`add-on restore failed for ${it.inner}:`, e);
            });
        });
      }
      return p.then(() => failed);
    },
  };
}
