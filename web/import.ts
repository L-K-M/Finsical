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
import { zipEntries, zipRead } from "../core/data/zip.js";
import { fshToSheets, isPack, packImages } from "../core/data/fsh.js";
import { decodeBmp, isBmp } from "../core/data/bmp.js";
import { metaGet, metaPut, packGet, packPut } from "./store.js";
import type { SpriteSheet } from "../core/data/azpack.js";
import type { IndexedImage } from "../core/data/azpack.js";
import type { Bus, BusMsg } from "./bus.js";

const BASE = "https://archive.org/download";
export const DEFAULT_ITEM = "aquazonewithguppiesandaddons";
const JPN_ITEM = "aquazone-jpn-set";
const JPN_ZIP = "AQUAZONE (JPN) SET.zip";
const JPN_ROOT = "AQUAZONE (JPN) SET/AQUAZONE ITEM/";

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
   * keeps tank-set subfolders' stray .plt/.acc out of the tanks section. */
  exts?: RegExp;
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
];

const PACK_EXT = /\.(fsh|grv|plt|acc|azn|rez)$/i;
/** Loose collection entries: packs plus bare images (background BMPs). */
const DIRECT_EXT = /\.(fsh|grv|plt|acc|azn|rez|bmp)$/i;

/** A collection zip's HTML listing page URL. */
function pageUrl(item: string, outer: string): string {
  return `${BASE}/${item}/${encodeURIComponent(outer)}/`;
}

export interface Importable { section: string; inner: string; url: string }

/** Raw zip bytes, memoized by URL and persisted in IndexedDB — nested
 * collections share one parent download across all of their entry
 * URLs, and a cached zip survives restarts so restores and re-browses
 * never touch archive.org twice. Items are treated as immutable; an
 * uploader replacing a file serves stale bytes until LRU trims it —
 * accepted, since the worst case is dated sprite art. */
const zipCache = new Map<string, Promise<Uint8Array>>();
/** Per-URL bytes on archive.org never change — safe to persist
 * forever. Other hosts (a dev server, a mutable mirror) keep only
 * their in-session memo so stale bytes can't wedge a dev loop. */
function immutableHost(u: string): boolean {
  try { return /(^|\.)archive\.org$/.test(new URL(u).hostname); }
  catch { return false; }
}
function fetchZip(url: string): Promise<Uint8Array> {
  let p = zipCache.get(url);
  if (!p) {
    p = (async () => {
      const hit = immutableHost(url) ? await packGet(url) : null;
      if (hit) return hit;
      const r = await fetch(url);
      if (!r.ok) throw new Error(`${url}: ${r.status}`);
      const d = new Uint8Array(await r.arrayBuffer());
      if (immutableHost(url)) void packPut(url, d).catch(() => {});
      return d;
    })();
    zipCache.set(url, p);
    p.catch(() => zipCache.delete(url));
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
  const rec = await pageCache.get(page)?.catch(() => null);
  if (rec && Date.now() - rec.t < PAGE_TTL_MS) return rec.html;
  const p = (async (): Promise<CachedPage> => {
    const hit = immutableHost(page) ? await metaGet<CachedPage>(page)
                                    : null;
    if (hit && typeof hit.html === "string" &&
        Number.isFinite(hit.t) && Date.now() - hit.t < PAGE_TTL_MS)
      return hit;
    try {
      const r = await fetch(page);
      if (!r.ok) throw new Error(`${outer}: listing ${r.status}`);
      const fresh = { t: Date.now(), html: await r.text() };
      if (immutableHost(page))
        void metaPut(page, fresh).catch(() => {});
      return fresh;
    } catch (e) {
      // Stale serve keeps offline browsing working; t=0 marks it
      // expired so the next call retries the fetch and self-heals.
      if (hit && typeof hit.html === "string")
        return { t: 0, html: hit.html };
      throw e;
    }
  })();
  pageCache.set(page, p);
  p.catch(() => pageCache.delete(page));
  return (await p).html;
}

/** List one collection's add-ons. Three outer layouts: a zip whose HTML
 * page exposes inner pack zips; a nested zip-of-packs ("a.zip/b.zip",
 * enumerated locally); or a zip holding loose pack files directly
 * (`prefix` set — each entry is served raw by zip view). */
async function listCollection(col: Collection): Promise<Importable[]> {
  const item = col.item ?? DEFAULT_ITEM;
  const { outer } = col;
  if (outer.includes("/")) {
    // Nested collection zip: no HTML listing exists, so enumerate its own
    // entries. Each pack entry is addressed as "{zip url}#{entry name}".
    const zipUrl =
      `${BASE}/${item}/${outer.split("/").map(encodeURIComponent).join("/")}`;
    const z = await fetchZip(zipUrl);
    const out: Importable[] = [];
    for (const e of zipEntries(z)) {
      if (!PACK_EXT.test(e.name) || e.name.includes("/")) continue;
      const name = e.name.replace(/\.[^.]+$/, "");
      if (name) out.push({ section: "", inner: name,
                          url: `${zipUrl}#${e.name}` });
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
    const rel = path.slice(hrefPref.length);
    const url = u.href;
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

/** Fetch an add-on zip and return every pack entry inside. A URL fragment
 * ("{zip}#{entry}") addresses one pack directly inside a nested collection
 * zip — archive.org can't serve entries two zips deep. */
async function fetchInnerPacks(url: string): Promise<Uint8Array[]> {
  const i = url.indexOf("#");
  const zipUrl = i === -1 ? url : url.slice(0, i);
  const entry = i === -1 ? undefined : url.slice(i + 1);
  if (entry === undefined && !/\.zip$/i.test(zipUrl)) {
    // Loose file inside a collection zip — the URL serves the pack or
    // image itself; no container to open. Persisted like zip bytes.
    const hit = immutableHost(zipUrl) ? await packGet(zipUrl) : null;
    if (hit) return [hit];
    const r = await fetch(zipUrl);
    if (!r.ok) throw new Error(`${zipUrl}: ${r.status}`);
    const d = new Uint8Array(await r.arrayBuffer());
    if (immutableHost(zipUrl)) void packPut(zipUrl, d).catch(() => {});
    return [d];
  }
  const z = await fetchZip(zipUrl);
  const packs: Uint8Array[] = [];
  for (const e of zipEntries(z)) {
    if (entry !== undefined ? e.name !== entry : !PACK_EXT.test(e.name))
      continue;
    const d = await zipRead(z, e);
    if (isPack(d)) packs.push(d);
  }
  if (entry !== undefined && !packs.length)
    throw new Error(`${url}: entry missing or not a pack`);
  return packs;
}

export interface PackResult {
  sheets: Map<string, SpriteSheet>;
  images: Map<string, IndexedImage>;
}

/** Download + decode one add-on (inner zip of a collection zip). Returns
 * one result per pack entry — multi-fish zips keep species separate so
 * the caller can pick each one's best sheet. */
export async function importAddon(url: string): Promise<PackResult[]> {
  const blobs = await fetchInnerPacks(url);
  const out: PackResult[] = [];
  for (const p of blobs) {
    if (isPack(p)) {
      out.push({ sheets: fshToSheets(p), images: packImages(p) });
    } else if (isBmp(p)) {
      const img = decodeBmp(p);
      if (img) out.push({ sheets: new Map(), images: new Map([[url, img]]) });
    }
  }
  return out;
}

/** Fetch the listing pages of all collections, grouped by section in
 * COLLECTIONS order. Never rejects: a failed section just comes back
 * empty. */
export async function listAddons(): Promise<Importable[]> {
  // First collection index per section — items group under it.
  const rank = new Map<string, number>();
  COLLECTIONS.forEach((c, i) => {
    if (!rank.has(c.section)) rank.set(c.section, i);
  });
  const lists = await Promise.all(COLLECTIONS.map(async (col) => {
    try {
      const items = await listCollection(col);
      for (const it of items) it.section = col.section;
      return items;
    } catch (e) {
      console.warn(`archive.org listing failed for ${col.outer}:`, e);
      return [];
    }
  }));
  return lists.flat().sort((a, b) =>
    (rank.get(a.section) ?? 0) - (rank.get(b.section) ?? 0));
}

// ---- import panel --------------------------------------------------------

export interface ImportHandlers {
  /** `name` is the display/species label; `url` is the add-on identity.
   * `live` = user-initiated install; false on launch-time restore, which
   * must not spawn fish (the saved roster already holds them). */
  onSheets(sheets: Map<string, SpriteSheet>, name: string, url: string,
           section: string, live: boolean): void;
  onImages(images: Iterable<IndexedImage>, src: string, section: string): void;
  /** Fired once per successful install — lets the caller record which
   * add-ons went into the tank so they can be restored later. */
  onInstall?(it: Importable): void;
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

// Packs are immutable per URL — memoize so re-visits skip the download.
// Module-level so the tank page's remote-install path shares the cache.
const packCache = new Map<string, Promise<PackResult[]>>();
export function fetchAddon(url: string): Promise<PackResult[]> {
  let p = packCache.get(url);
  if (!p) {
    p = importAddon(url);
    packCache.set(url, p);
    p.catch(() => packCache.delete(url)); // failed fetches stay retryable
  }
  return p;
}

export interface PanelOptions {
  /** Mount point — renders the card inline (panel window) instead of
   * inside a modal overlay. */
  host?: HTMLElement;
  /** Set on the panel page: installs are posted to the tank page, which
   * owns the sim; results come back through notify(). */
  remote?: Bus;
}

/** Afterglow-style add-on browser: card grid -> detail w/ live preview. */
export function mountImportPanel(h: ImportHandlers, opts?: PanelOptions):
    { open(): void; close(): void; readonly isOpen: boolean;
      restore(list: Importable[]): Promise<void>;
      notify(m: BusMsg): void } {
  const remote = opts?.remote;
  const installed = new Set<string>(); // add-on urls, not display names
  const thumbs = new Map<string, HTMLCanvasElement>();
  const fetchPack = fetchAddon;
  // Open detail view — remote install acks update its status line.
  let detailRef: { url: string; act: HTMLButtonElement;
                   status: HTMLElement } | null = null;

  const ov = opts?.host ? null : el("div", "ov");
  ov?.setAttribute("role", "dialog");
  ov?.setAttribute("aria-modal", "true");
  ov?.setAttribute("aria-label", "Import add-ons");
  if (ov) ov.style.display = "none";
  const card = el("div", "card");
  (ov ?? (opts!.host!)).appendChild(card);

  const hd = el("div", "hd");
  const titles = el("div", "titles");
  titles.appendChild(el("div", "title", "Internet Archive"));
  titles.appendChild(el("div", "sub", "Aquazone add-ons"));
  hd.appendChild(titles);
  const close = ov ? el("button", "x", "✕") : null;
  if (close) {
    close.title = "Close";
    hd.appendChild(close);
  }
  card.appendChild(hd);

  const body = el("div", "body");
  card.appendChild(body);
  const browse = el("div", "browse");
  const detail = el("div", "detail");
  detail.style.display = "none";
  body.appendChild(browse);
  body.appendChild(detail);

  const ft = el("div", "ft");
  const donate = el("a", "", "♥ Support the Internet Archive");
  donate.href = DONATE_URL;
  donate.target = "_blank";
  donate.rel = "noopener";
  ft.appendChild(donate);
  card.appendChild(ft);
  if (ov) document.body.appendChild(ov);

  function paintThumb(tile: Element, th: HTMLCanvasElement): void {
    if (tile.querySelector(".tthumb")) return;
    const copy = el("canvas", "tthumb");
    copy.width = th.width; copy.height = th.height;
    copy.getContext("2d")!.drawImage(th, 0, 0);
    tile.insertBefore(copy, tile.firstChild);
  }

  // Tile thumbs fetch lazily: when a tile scrolls into view its pack is
  // downloaded through the same memoized path as the detail view, decoded
  // via h.preview, and painted back. Bounded concurrency keeps the fetch
  // trickle polite to archive.org; failures leave a name-only tile.
  const byUrl = new Map<string, Importable>();
  const thumbQueued = new Set<string>();
  const thumbQueue: Importable[] = [];
  let thumbRunning = 0;
  const THUMB_PAR = 3;

  // Thumbnails persist across launches in localStorage so the browse grid
  // doesn't re-download every pack each run. Best-effort: storage
  // failures (private mode, quota) fall back to the fetch path.
  const THUMB_PREFIX = "finsical:thumb:";
  const thumbKey = (it: Importable): string => THUMB_PREFIX + it.url;
  // One-time sweep of pre-URL keys ("section:name" — no scheme in them).
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith(THUMB_PREFIX) && !k.includes("://"))
        localStorage.removeItem(k);
    }
  } catch { /* storage unavailable */ }
  function storeThumb(it: Importable, cv: HTMLCanvasElement): void {
    const data = cv.toDataURL("image/png");
    try {
      localStorage.setItem(thumbKey(it), data);
    } catch {
      try {
        for (const k of Object.keys(localStorage))
          if (k.startsWith(THUMB_PREFIX)) localStorage.removeItem(k);
        localStorage.setItem(thumbKey(it), data);
      } catch { /* cache skipped */ }
    }
  }
  // Returns true when a stored thumb was found (paint happens async).
  function loadStoredThumb(it: Importable): boolean {
    let url: string | null = null;
    try { url = localStorage.getItem(thumbKey(it)); }
    catch { /* storage unavailable */ }
    if (!url) return false;
    thumbQueued.add(it.url);
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement("canvas");
      cv.width = img.naturalWidth; cv.height = img.naturalHeight;
      cv.getContext("2d")!.drawImage(img, 0, 0);
      thumbs.set(it.url, cv);
      thumbQueued.delete(it.url);
      const t =
        browse.querySelector(`[data-url="${CSS.escape(it.url)}"]`);
      if (t) paintThumb(t, cv);
    };
    img.onerror = () => {
      try { localStorage.removeItem(thumbKey(it)); } catch { /* ignore */ }
      thumbQueued.delete(it.url);
      if (!thumbQueue.some((q) => q.url === it.url))
        thumbQueue.push(it); // corrupt entry — fall through to a real fetch
      pumpThumbs();
    };
    img.src = url;
    return true;
  }

  function pumpThumbs(): void {
    while (thumbRunning < THUMB_PAR && thumbQueue.length) {
      const it = thumbQueue.shift()!;
      thumbRunning++;
      void fetchPack(it.url).then((rs) => {
        const usable = rs.filter((r) => r.sheets.size || r.images.size);
        const pv = usable.length ? h.preview(usable) : null;
        if (!pv) return;
        thumbs.set(it.url, pv);
        storeThumb(it, pv);
        const t =
          browse.querySelector(`[data-url="${CSS.escape(it.url)}"]`);
        if (t) paintThumb(t, pv);
      }).catch((e) => {
        console.warn(`add-on thumb failed for ${it.inner}:`, e);
      })
        .finally(() => { thumbRunning--; pumpThumbs(); });
    }
  }

  function wantThumb(it: Importable): void {
    if (thumbs.has(it.url) || thumbQueued.has(it.url)) return;
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

  function showBrowse(): void {
    detail.style.display = "none";
    detailRef = null;
    browse.style.display = "";
    // Detail fetches populate thumbs lazily — back-fill tiles on return.
    for (const [url, th] of thumbs) {
      const t = browse.querySelector(`[data-url="${CSS.escape(url)}"]`);
      if (t) paintThumb(t, th);
    }
  }

  // Shared fetch→dispatch→mark-installed core for applyAddon (manual
  // install) and restore (re-import on launch); only the onInstall
  // side effect differs. `live` marks user installs vs restores.
  function applyPack(it: Importable, rs: PackResult[], live: boolean): void {
    const usable = rs.filter((r) => r.sheets.size || r.images.size);
    if (!usable.length) throw new Error("no pack inside");
    for (const r of usable) {
      if (r.sheets.size)
        h.onSheets(r.sheets, it.inner, it.url, it.section, live);
      if (r.images.size) h.onImages(r.images.values(), it.url, it.section);
    }
    installed.add(it.url);
    browse.querySelector(`[data-url="${CSS.escape(it.url)}"]`)
      ?.classList.add("done");
    const pv = h.preview(usable);
    if (pv) { thumbs.set(it.url, pv); storeThumb(it, pv); }
  }

  function applyAddon(it: Importable, rs: PackResult[],
                      again: boolean): void {
    // Remote mode (panel window): the tank page owns the sim — send the
    // request there and flip the UI when its ack comes back via notify().
    // Note: the tank page re-fetches the pack itself — this page's
    // preview download lives in a separate JS context and can't be
    // shared (WKWebView's URL cache usually covers the second fetch).
    if (remote) {
      remote.post({ op: "install", item: it, again });
      return;
    }
    // A launch-time restore may have installed it while the detail fetch
    // was in flight — honor the label the user actually clicked.
    if (!again && installed.has(it.url)) return;
    applyPack(it, rs, true);
    h.onInstall?.(it);
  }

  function showDetail(it: Importable): void {
    browse.style.display = "none";
    detail.style.display = "";
    detail.textContent = "";
    const back = el("button", "back", "‹ All add-ons");
    back.addEventListener("click", showBrowse);
    detail.appendChild(back);
    detail.appendChild(el("div", "dname", it.inner));
    detail.appendChild(el("div", "dmeta", `${it.section} · archive.org`));
    const pvBox = el("div", "pv");
    detail.appendChild(pvBox);
    const status = el("div", "dstatus", "Fetching add-on…");
    detail.appendChild(status);
    const act = el("button", "dact");
    act.style.display = "none";
    detail.appendChild(act);
    detailRef = { url: it.url, act, status };

    void fetchPack(it.url).then((rs) => {
      const usable = rs.filter((r) => r.sheets.size || r.images.size);
      if (!usable.length) throw new Error("no pack inside");
      const pv = h.preview(usable);
      if (pv) { pvBox.appendChild(pv); thumbs.set(it.url, pv); }
      const kinds = [...new Set(usable.map((r) =>
        r.sheets.size ? "fish" : "scenery"))].join(" + ");
      status.textContent =
        `${usable.length} pack${usable.length > 1 ? "s" : ""} · ${kinds}`;
      act.style.display = "";
      let again = installed.has(it.url);
      act.textContent = again ? "Add again" : "Add to tank";
      act.addEventListener("click", () => {
        try {
          applyAddon(it, usable, again);
          again = true; // later clicks on this button mean "add again"
          // Local installs are synchronous; remote ones flip on the ack.
          if (remote) {
            act.disabled = true;
            act.dataset.pending = "1";
            act.textContent = "Adding…";
            // The relay can drop the message if the tank page is
            // mid-reload — recover the button if no ack comes back.
            setTimeout(() => {
              if (act.dataset.pending === "1" && detailRef?.act === act) {
                delete act.dataset.pending;
                act.disabled = false;
                act.textContent = "Retry";
                detailRef.status.textContent =
                  "No response from the tank page — try again";
              }
            }, 15_000);
          } else act.textContent = "In tank ✓ — add again?";
        } catch (e) { status.textContent = String(e); }
      });
    }).catch((e) => {
      status.textContent = `Couldn't load: ${e instanceof Error ? e.message : e}`;
      const retry = el("button", "dact", "Retry");
      retry.addEventListener("click", () => showDetail(it));
      detail.appendChild(retry);
    });
  }

  function buildBrowse(items: Importable[]): void {
    browse.textContent = "";
    byUrl.clear();
    // Drop still-pending items from the previous view; in-flight fetches
    // complete anyway and their results stay memoized in packCache.
    thumbQueue.length = 0;
    thumbQueued.clear();
    io?.disconnect();
    let section = "";
    let grid: HTMLElement | null = null;
    for (const it of items) {
      byUrl.set(it.url, it);
      if (it.section !== section) {
        section = it.section;
        browse.appendChild(el("div", "sec",
          `${section} · ${items.filter((x) => x.section === section).length}`));
        grid = el("div", "grid");
        browse.appendChild(grid);
      }
      const t = el("button", "tile");
      t.dataset.url = it.url;
      if (installed.has(it.url)) t.classList.add("done");
      const th = thumbs.get(it.url);
      if (th) paintThumb(t, th);
      t.appendChild(el("span", "tname", it.inner));
      t.appendChild(el("span", "tick", "✓"));
      t.addEventListener("click", () => showDetail(it));
      grid!.appendChild(t);
      // No IntersectionObserver: trickle-fetch every thumb instead.
      if (io) io.observe(t); else wantThumb(it);
    }
  }

  function loadListing(): void {
    browse.textContent = "";
    browse.appendChild(el("div", "dstatus", "Fetching archive.org listing…"));
    void listAddons().then((items) => {
      if (!items.length) throw new Error("empty listing");
      buildBrowse(items);
    }).catch((e) => {
      console.warn("add-on listing failed:", e);
      browse.textContent = "";
      browse.appendChild(el("div", "dstatus",
        "Couldn't reach archive.org."));
      const retry = el("button", "dact", "Retry");
      retry.addEventListener("click", loadListing);
      browse.appendChild(retry);
    });
  }

  if (ov && close) {
    close.addEventListener("click", () => { ov.style.display = "none"; });
    ov.addEventListener("pointerdown", (e) => {
      if (e.target === ov) ov.style.display = "none";
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && ov.style.display !== "none") {
        ov.style.display = "none";
        e.preventDefault();
      }
    });
  }

  let loaded = false;
  return {
    open() {
      if (ov) { ov.style.display = "flex"; close!.focus(); }
      if (!loaded) { loaded = true; loadListing(); }
      showBrowse();
    },
    close() { if (ov) ov.style.display = "none"; },
    get isOpen() { return ov ? ov.style.display !== "none" : true; },
    // Remote-mode replies from the tank page and state pushes land here.
    notify(m: BusMsg): void {
      const ackUrl = m.url;
      if (m.op === "installed" && typeof ackUrl === "string") {
        installed.add(ackUrl);
        browse.querySelector(`[data-url="${CSS.escape(ackUrl)}"]`)
          ?.classList.add("done");
        if (detailRef?.url === ackUrl) {
          delete detailRef.act.dataset.pending;
          detailRef.act.disabled = false;
          detailRef.act.textContent = "In tank ✓ — add again?";
          detailRef.status.textContent = "";
        }
      } else if (m.op === "installFailed" && typeof ackUrl === "string") {
        if (detailRef?.url === ackUrl) {
          delete detailRef.act.dataset.pending;
          detailRef.act.disabled = false;
          detailRef.act.textContent = "Retry";
          detailRef.status.textContent = `Install failed: ${m.error}`;
        }
      } else if (m.op === "state" && Array.isArray(m.addons)) {
        // Tank's add-on list — sync install badges (covers restores that
        // finished before this panel opened, and removals).
        const live = new Set(
          (m.addons as { url?: unknown }[])
            .map((a) => a.url)
            .filter((x): x is string => typeof x === "string"));
        for (const url of installed) {
          if (live.has(url)) continue;
          installed.delete(url);
          browse.querySelector(`[data-url="${CSS.escape(url)}"]`)
            ?.classList.remove("done");
        }
        for (const url of live) {
          if (installed.has(url)) continue;
          installed.add(url);
          browse.querySelector(`[data-url="${CSS.escape(url)}"]`)
            ?.classList.add("done");
        }
      }
    },
    // Re-install saved add-ons in order (restores fish sheets and the
    // gravel backdrop). Sequential so slot/backdrop assignment matches
    // the original install order; failures skip that add-on. Shares
    // applyPack's dispatch so the two install paths can't diverge;
    // skips onInstall so restores don't re-record, and skips add-ons
    // already installed while the chain was in flight.
    restore(list: Importable[]): Promise<void> {
      if (remote) return Promise.resolve(); // the tank page owns the sim
      let p: Promise<void> = Promise.resolve();
      for (const it of list) {
        p = p.then(() => {
          if (installed.has(it.url)) return;
          return fetchPack(it.url)
            .then((rs) => {
              if (!installed.has(it.url)) applyPack(it, rs, false);
            })
            .catch((e) =>
              console.warn(`add-on restore failed for ${it.inner}:`, e));
        });
      }
      return p;
    },
  };
}
