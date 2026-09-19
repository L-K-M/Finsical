/**
 * archive.org add-on import.
 *
 * The aquazonewithguppiesandaddons item packs each fish/gravel add-on as a
 * one-file zip inside a larger zip. archive.org serves inner entries at
 * /download/{item}/{outer}.zip/{inner} and lists them on {outer}.zip/'s
 * HTML page — all with Access-Control-Allow-Origin: *, so this runs in the
 * plain web shell with no native bridge.
 */
import { zipEntries, zipRead } from "../core/data/zip.js";
import { fshToSheets, isPack, packImages } from "../core/data/fsh.js";
import type { SpriteSheet } from "../core/data/azpack.js";
import type { IndexedImage } from "../core/data/azpack.js";
import type { Bus, BusMsg } from "./bus.js";

const BASE = "https://archive.org/download";
export const DEFAULT_ITEM = "aquazonewithguppiesandaddons";
/** Outer zips in that item that hold importable add-on packs. A path with
 * "/" is a nested zip-of-packs (archive.org only serves one zip level), so
 * its entries are enumerated locally after fetching the collection zip. */
export const COLLECTIONS: [section: string, outer: string][] = [
  ["fish", "addon and modded fish.zip"],
  ["gravel", "gravel.zip"],
  ["plants", "mekasia.zip/mekplants.zip"],
  ["accessories", "mekasia.zip/mekaccs.zip"],
];

const PACK_EXT = /\.(fsh|grv|plt|acc|azn|rez)$/i;

export interface Importable { section: string; inner: string; url: string }

/** Raw zip bytes, memoized by URL — nested collections share one parent
 * download across all of their entry URLs. */
const zipCache = new Map<string, Promise<Uint8Array>>();
function fetchZip(url: string): Promise<Uint8Array> {
  let p = zipCache.get(url);
  if (!p) {
    p = fetch(url).then(async (r) => {
      if (!r.ok) throw new Error(`${url}: ${r.status}`);
      return new Uint8Array(await r.arrayBuffer());
    });
    zipCache.set(url, p);
    p.catch(() => zipCache.delete(url));
  }
  return p;
}

/** List inner .zip entries of an outer zip via its HTML listing page. */
async function listCollection(item: string, outer: string):
    Promise<Importable[]> {
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
  const page = `${BASE}/${item}/${encodeURIComponent(outer)}/`;
  const r = await fetch(page);
  if (!r.ok) throw new Error(`${outer}: listing ${r.status}`);
  const html = await r.text();
  const prefix = `/download/${item}/${encodeURIComponent(outer)}/`;
  const out: Importable[] = [];
  for (const m of html.matchAll(/href="([^"]+\.zip)"/g)) {
    const href = new URL(m[1]!, page).pathname; // absolute, root- or page-relative
    if (!href.startsWith(prefix)) continue;
    const inner = decodeURIComponent(href.slice(prefix.length));
    if (!inner || inner.includes("/")) continue;
    const name = inner.replace(/\.zip$/i, "");
    if (!name || inner === outer) continue;
    out.push({ section: "", inner: name,
               url: `https://archive.org${href}` });
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
  const packs = await fetchInnerPacks(url);
  return packs.map((p) => ({
    sheets: fshToSheets(p),
    images: packImages(p),
  }));
}

/** Fetch the listing pages of all collections. Never rejects: a failed
 * section just comes back empty. */
export async function listAddons(item = DEFAULT_ITEM):
    Promise<{ section: string; inner: string; url: string }[]> {
  const lists = await Promise.all(COLLECTIONS.map(async ([section, outer]) => {
    try {
      const items = await listCollection(item, outer);
      for (const it of items) it.section = section;
      return items;
    } catch (e) {
      console.warn(`archive.org listing failed for ${outer}:`, e);
      return [];
    }
  }));
  return lists.flat();
}

// ---- import panel --------------------------------------------------------

export interface ImportHandlers {
  /** `live` = user-initiated install; false on launch-time restore, which
   * must not spawn fish (the saved roster already holds them). */
  onSheets(sheets: Map<string, SpriteSheet>, name: string,
           section: string, live: boolean): void;
  onImages(images: Iterable<IndexedImage>, name: string, section: string): void;
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
  const installed = new Set<string>();
  const thumbs = new Map<string, HTMLCanvasElement>();
  const fetchPack = fetchAddon;
  // Open detail view — remote install acks update its status line.
  let detailRef: { inner: string; act: HTMLButtonElement;
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

  // Tile thumbs fetch lazily: when a tile scrolls into view its inner zip is
  // downloaded through the same memoized path as the detail view, decoded
  // via h.preview, and painted back. Bounded concurrency keeps the fetch
  // trickle polite to archive.org; failures leave a name-only tile.
  const byInner = new Map<string, Importable>();
  const thumbQueued = new Set<string>();
  const thumbQueue: Importable[] = [];
  let thumbRunning = 0;
  const THUMB_PAR = 3;

  // Thumbnails persist across launches in localStorage so the browse grid
  // doesn't re-download every inner zip each run. Best-effort: storage
  // failures (private mode, quota) fall back to the fetch path.
  const THUMB_PREFIX = "finsical:thumb:";
  const thumbKey = (it: Importable): string =>
    THUMB_PREFIX + it.section + ":" + it.inner;
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
    thumbQueued.add(it.inner);
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement("canvas");
      cv.width = img.naturalWidth; cv.height = img.naturalHeight;
      cv.getContext("2d")!.drawImage(img, 0, 0);
      thumbs.set(it.inner, cv);
      thumbQueued.delete(it.inner);
      const t =
        browse.querySelector(`[data-inner="${CSS.escape(it.inner)}"]`);
      if (t) paintThumb(t, cv);
    };
    img.onerror = () => {
      try { localStorage.removeItem(thumbKey(it)); } catch { /* ignore */ }
      thumbQueued.delete(it.inner);
      if (!thumbQueue.some((q) => q.inner === it.inner))
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
        thumbs.set(it.inner, pv);
        storeThumb(it, pv);
        const t =
          browse.querySelector(`[data-inner="${CSS.escape(it.inner)}"]`);
        if (t) paintThumb(t, pv);
      }).catch((e) => {
        console.warn(`add-on thumb failed for ${it.inner}:`, e);
      })
        .finally(() => { thumbRunning--; pumpThumbs(); });
    }
  }

  function wantThumb(it: Importable): void {
    if (thumbs.has(it.inner) || thumbQueued.has(it.inner)) return;
    if (loadStoredThumb(it)) return;
    thumbQueued.add(it.inner);
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
            byInner.get((en.target as HTMLElement).dataset.inner ?? "");
          if (it) wantThumb(it);
        }
      })
      : null;

  function showBrowse(): void {
    detail.style.display = "none";
    detailRef = null;
    browse.style.display = "";
    // Detail fetches populate thumbs lazily — back-fill tiles on return.
    for (const [inner, th] of thumbs) {
      const t = browse.querySelector(`[data-inner="${CSS.escape(inner)}"]`);
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
      if (r.sheets.size) h.onSheets(r.sheets, it.inner, it.section, live);
      if (r.images.size) h.onImages(r.images.values(), it.inner, it.section);
    }
    installed.add(it.inner);
    browse.querySelector(`[data-inner="${CSS.escape(it.inner)}"]`)
      ?.classList.add("done");
    const pv = h.preview(usable);
    if (pv) { thumbs.set(it.inner, pv); storeThumb(it, pv); }
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
    if (!again && installed.has(it.inner)) return;
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
    detailRef = { inner: it.inner, act, status };

    void fetchPack(it.url).then((rs) => {
      const usable = rs.filter((r) => r.sheets.size || r.images.size);
      if (!usable.length) throw new Error("no pack inside");
      const pv = h.preview(usable);
      if (pv) { pvBox.appendChild(pv); thumbs.set(it.inner, pv); }
      const kinds = [...new Set(usable.map((r) =>
        r.sheets.size ? "fish" : "scenery"))].join(" + ");
      status.textContent =
        `${usable.length} pack${usable.length > 1 ? "s" : ""} · ${kinds}`;
      act.style.display = "";
      let again = installed.has(it.inner);
      act.textContent = again ? "Add again" : "Add to tank";
      act.addEventListener("click", () => {
        try {
          applyAddon(it, usable, again);
          again = true; // later clicks on this button mean "add again"
          // Local installs are synchronous; remote ones flip on the ack.
          if (remote) {
            act.disabled = true;
            act.textContent = "Adding…";
            // The relay can drop the message if the tank page is
            // mid-reload — recover the button if no ack comes back.
            setTimeout(() => {
              if (act.disabled && act.textContent === "Adding…" &&
                  detailRef?.act === act) {
                act.disabled = false;
                act.textContent = "Retry";
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
    byInner.clear();
    // Drop still-pending items from the previous view; in-flight fetches
    // complete anyway and their results stay memoized in packCache.
    thumbQueue.length = 0;
    thumbQueued.clear();
    io?.disconnect();
    let section = "";
    let grid: HTMLElement | null = null;
    for (const it of items) {
      byInner.set(it.inner, it);
      if (it.section !== section) {
        section = it.section;
        browse.appendChild(el("div", "sec",
          `${section} · ${items.filter((x) => x.section === section).length}`));
        grid = el("div", "grid");
        browse.appendChild(grid);
      }
      const t = el("button", "tile");
      t.dataset.inner = it.inner;
      if (installed.has(it.inner)) t.classList.add("done");
      const th = thumbs.get(it.inner);
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
      const inner = m.inner;
      if (m.op === "installed" && typeof inner === "string") {
        installed.add(inner);
        browse.querySelector(`[data-inner="${CSS.escape(inner)}"]`)
          ?.classList.add("done");
        if (detailRef?.inner === inner) {
          detailRef.act.disabled = false;
          detailRef.act.textContent = "In tank ✓ — add again?";
        }
      } else if (m.op === "installFailed" && typeof inner === "string") {
        if (detailRef?.inner === inner) {
          detailRef.act.disabled = false;
          detailRef.act.textContent = "Retry";
          detailRef.status.textContent = `Install failed: ${m.error}`;
        }
      } else if (m.op === "state" && Array.isArray(m.addons)) {
        // Tank's add-on list — sync install badges (covers restores that
        // finished before this panel opened, and removals).
        const live = new Set(
          (m.addons as { inner?: unknown }[])
            .map((a) => a.inner)
            .filter((x): x is string => typeof x === "string"));
        for (const inner of installed) {
          if (live.has(inner)) continue;
          installed.delete(inner);
          browse.querySelector(`[data-inner="${CSS.escape(inner)}"]`)
            ?.classList.remove("done");
        }
        for (const inner of live) {
          if (installed.has(inner)) continue;
          installed.add(inner);
          browse.querySelector(`[data-inner="${CSS.escape(inner)}"]`)
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
          if (installed.has(it.inner)) return;
          return fetchPack(it.url)
            .then((rs) => {
              if (!installed.has(it.inner)) applyPack(it, rs, false);
            })
            .catch((e) =>
              console.warn(`add-on restore failed for ${it.inner}:`, e));
        });
      }
      return p;
    },
  };
}
