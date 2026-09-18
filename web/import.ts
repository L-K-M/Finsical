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
    const href = m[1]!.replace(/^\/+[^/]+/, ""); // strip //host
    if (!href.startsWith("/download/")) continue;
    const inner = decodeURIComponent(href.slice(prefix.length));
    if (!inner || inner.includes("/")) continue;
    const name = inner.replace(/\.zip$/i, "");
    if (!name || name === outer) continue;
    out.push({ section: "", inner: name,
               url: `https://archive.org${href}` });
  }
  return out;
}

/** Fetch an inner zip and return the pack bytes of its first pack entry. */
async function fetchInnerPack(url: string): Promise<Uint8Array | null> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  const z = new Uint8Array(await r.arrayBuffer());
  for (const e of zipEntries(z)) {
    if (!/\.(fsh|grv|plt|acc|azn|rez)$/i.test(e.name)) continue;
    const d = await zipRead(z, e);
    if (isPack(d)) return d;
  }
  return null;
}

export interface PackResult {
  sheets: Map<string, SpriteSheet>;
  images: Map<string, IndexedImage>;
}

/** Download + decode one add-on (inner zip of a collection zip). */
export async function importAddon(url: string): Promise<PackResult | null> {
  const pack = await fetchInnerPack(url);
  if (!pack) return null;
  return { sheets: fshToSheets(pack), images: packImages(pack) };
}

/** Fetch the listing pages of all collections. Never rejects: a failed
 * section just comes back empty. */
export async function listAddons(item = DEFAULT_ITEM):
    Promise<{ section: string; inner: string; url: string }[]> {
  const out: Importable[] = [];
  for (const [section, outer] of COLLECTIONS) {
    try {
      const items = await listCollection(item, outer);
      for (const it of items) it.section = section;
      out.push(...items);
    } catch (e) {
      console.warn(`archive.org listing failed for ${outer}:`, e);
    }
  }
  return out;
}

// ---- import panel --------------------------------------------------------

export interface ImportHandlers {
  onSheets(sheets: Map<string, SpriteSheet>, name: string): void;
  onImages(images: Iterable<IndexedImage>, name: string): void;
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
    panel.style.display = panel.style.display === "none" ? "block" : "none";
    if (panel.dataset.loaded) return;
    panel.dataset.loaded = "1";
    panel.textContent = "fetching archive.org listing…";
    void (async () => {
      const items = await listAddons();
      panel.textContent = "";
      if (!items.length) {
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
            .then((r) => {
              if (!r || (!r.sheets.size && !r.images.size))
                throw new Error("no pack inside");
              if (r.sheets.size) h.onSheets(r.sheets, it.inner);
              if (r.images.size) h.onImages(r.images.values(), it.inner);
              a.textContent = `${it.inner} ✓`;
            })
            .catch((e) => {
              a.textContent = `${it.inner} ✗`;
              console.warn(`import ${it.inner} failed:`, e);
            });
        });
        panel.appendChild(a);
      }
    })().catch((e) => { panel.textContent = String(e); });
  });
}
