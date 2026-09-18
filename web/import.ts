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
}

/** Small overlay listing archive.org add-ons; click a name to import it. */
export function mountImportPanel(h: ImportHandlers): void {
  const btn = document.createElement("button");
  btn.id = "importbtn";
  btn.textContent = "+ import";
  document.body.appendChild(btn);

  const panel = document.createElement("div");
  panel.id = "importpanel";
  panel.style.display = "none";
  document.body.appendChild(panel);

  btn.addEventListener("click", () => {
    const opening = panel.style.display === "none";
    panel.style.display = opening ? "block" : "none";
    if (!opening || panel.dataset.loaded) return;
    panel.dataset.loaded = "1";
    panel.textContent = "fetching archive.org listing…";
    void (async () => {
      const items = await listAddons();
      panel.textContent = "";
      if (!items.length) {
        delete panel.dataset.loaded; // allow retry on next open
        panel.textContent = "no add-ons found (network blocked?)";
        return;
      }
      let section = "";
      for (const it of items) {
        if (it.section !== section) {
          section = it.section;
          const h2 = document.createElement("div");
          h2.className = "sec";
          h2.textContent = section;
          panel.appendChild(h2);
        }
        const a = document.createElement("button");
        a.className = "item";
        a.textContent = it.inner;
        a.addEventListener("click", () => {
          a.disabled = true;
          a.textContent = `${it.inner}…`;
          void importAddon(it.url)
            .then((rs) => {
              const usable = rs.filter((r) => r.sheets.size || r.images.size);
              if (!usable.length) throw new Error("no pack inside");
              for (const r of usable) {
                if (r.sheets.size) h.onSheets(r.sheets, it.inner, it.section);
                if (r.images.size) h.onImages(r.images.values(), it.inner, it.section);
              }
              a.textContent = `${it.inner} ✓`;
            })
            .catch((e) => {
              a.disabled = false;
              a.textContent = `${it.inner} ✗`;
              console.warn(`import ${it.inner} failed:`, e);
            });
        });
        panel.appendChild(a);
      }
    })().catch((e) => { panel.textContent = String(e); });
  });
}
