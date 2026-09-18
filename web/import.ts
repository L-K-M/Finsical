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

const BASE = "https://archive.org/download";
export const DEFAULT_ITEM = "aquazonewithguppiesandaddons";
/** Outer zips in that item that hold importable add-on packs. */
const COLLECTIONS: [section: string, outer: string][] = [
  ["fish", "addon and modded fish.zip"],
  ["gravel", "gravel.zip"],
];

export interface Importable { section: string; inner: string; url: string }

/** List inner .zip entries of an outer zip via its HTML listing page. */
async function listCollection(item: string, outer: string):
    Promise<Importable[]> {
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

/** Fetch an inner zip and return every pack entry inside. */
async function fetchInnerPacks(url: string): Promise<Uint8Array[]> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  const z = new Uint8Array(await r.arrayBuffer());
  const packs: Uint8Array[] = [];
  for (const e of zipEntries(z)) {
    if (!/\.(fsh|grv|plt|acc|azn|rez)$/i.test(e.name)) continue;
    const d = await zipRead(z, e);
    if (isPack(d)) packs.push(d);
  }
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
  onSheets(sheets: Map<string, SpriteSheet>, name: string, section: string): void;
  onImages(images: Iterable<IndexedImage>, name: string, section: string): void;
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

/** Afterglow-style add-on browser: card grid -> detail w/ live preview. */
export function mountImportPanel(h: ImportHandlers):
    { open(): void; close(): void; readonly isOpen: boolean } {
  const installed = new Set<string>();
  const thumbs = new Map<string, HTMLCanvasElement>();

  const ov = el("div", "ov");
  ov.setAttribute("role", "dialog");
  ov.setAttribute("aria-modal", "true");
  ov.setAttribute("aria-label", "Import add-ons");
  ov.style.display = "none";
  const card = el("div", "card");
  ov.appendChild(card);

  const hd = el("div", "hd");
  const titles = el("div", "titles");
  titles.appendChild(el("div", "title", "Internet Archive"));
  titles.appendChild(el("div", "sub", "Aquazone add-ons"));
  hd.appendChild(titles);
  const close = el("button", "x", "✕");
  close.title = "Close";
  hd.appendChild(close);
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
  document.body.appendChild(ov);

  function paintThumb(tile: Element, th: HTMLCanvasElement): void {
    if (tile.querySelector(".tthumb")) return;
    const copy = el("canvas", "tthumb");
    copy.width = th.width; copy.height = th.height;
    copy.getContext("2d")!.drawImage(th, 0, 0);
    tile.insertBefore(copy, tile.firstChild);
  }

  function showBrowse(): void {
    detail.style.display = "none";
    browse.style.display = "";
    // Detail fetches populate thumbs lazily — back-fill tiles on return.
    for (const [inner, th] of thumbs) {
      const t = browse.querySelector(`[data-inner="${CSS.escape(inner)}"]`);
      if (t) paintThumb(t, th);
    }
  }

  function applyAddon(it: Importable, rs: PackResult[]): void {
    const usable = rs.filter((r) => r.sheets.size || r.images.size);
    if (!usable.length) throw new Error("no pack inside");
    for (const r of usable) {
      if (r.sheets.size) h.onSheets(r.sheets, it.inner, it.section);
      if (r.images.size) h.onImages(r.images.values(), it.inner, it.section);
    }
    installed.add(it.inner);
    browse.querySelector(`[data-inner="${CSS.escape(it.inner)}"]`)
      ?.classList.add("done");
    const pv = h.preview(usable);
    if (pv) thumbs.set(it.inner, pv);
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

    void importAddon(it.url).then((rs) => {
      const usable = rs.filter((r) => r.sheets.size || r.images.size);
      if (!usable.length) throw new Error("no pack inside");
      const pv = h.preview(usable);
      if (pv) { pvBox.appendChild(pv); thumbs.set(it.inner, pv); }
      const kinds = [...new Set(usable.map((r) =>
        r.sheets.size ? "fish" : "scenery"))].join(" + ");
      status.textContent =
        `${usable.length} pack${usable.length > 1 ? "s" : ""} · ${kinds}`;
      act.style.display = "";
      act.textContent = installed.has(it.inner) ? "Add again" : "Add to tank";
      act.addEventListener("click", () => {
        try {
          applyAddon(it, usable);
          act.textContent = "In tank ✓ — add again?";
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
    let section = "";
    let grid: HTMLElement | null = null;
    for (const it of items) {
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

  close.addEventListener("click", () => { ov.style.display = "none"; });
  ov.addEventListener("pointerdown", (e) => {
    if (e.target === ov) ov.style.display = "none";
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && ov.style.display !== "none")
      ov.style.display = "none";
  });

  let loaded = false;
  return {
    open() {
      ov.style.display = "flex";
      if (!loaded) { loaded = true; loadListing(); }
      showBrowse();
    },
    close() { ov.style.display = "none"; },
    get isOpen() { return ov.style.display !== "none"; },
  };
}
