import { mountImportPanel } from "./import.js";
import { previewOf } from "./render.js";
import { fishThumbKey, openBus } from "./bus.js";
import { fileSoundRecords } from "../core/data/snd.js";
import { sndsMerge } from "./store.js";
import type { BusMsg } from "./bus.js";
import type { Importable } from "./import.js";

// Panel window: tank overview plus the add-on browser, full-size.
// The tank page owns the sim — this page sends intents (install,
// removeFish, removeAddon) and renders the state it pushes back.
// Opened by Tank > Import Add-ons… / Tank > Overview in the app; in a
// browser it talks to an index.html tab over BroadcastChannel.

interface FishSnap {
  id: number; species: string; hunger: number; state: string;
  pack?: string;
}
interface TankState extends BusMsg {
  addons?: Importable[];
  fish?: FishSnap[];
  waterQuality?: number;
  tickCount?: number;
}
let tankState: TankState | null = null;
let greeted = false;
// Row thumbnails arrive on demand (wantThumbs → thumbs): the tank
// renders them from live objects, so state pushes stay slim.
const thumbStore = new Map<string, string>(); // key → dataURL
const thumbRequested = new Set<string>();     // asked once per page

function el(tag: string, cls = "", text = ""): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

const overviewEl = document.getElementById("overview")!;
const panelEl = document.getElementById("panel")!;

// Fill any .othumbbox placeholders whose thumb has arrived.
function paintThumbs(): void {
  overviewEl.querySelectorAll<HTMLElement>(".othumbbox")
    .forEach((box) => {
      const d = thumbStore.get(box.dataset.thumb ?? "");
      if (!d || box.querySelector("img")) return;
      const img = document.createElement("img");
      img.className = "othumb";
      img.src = d;
      img.alt = "";
      box.appendChild(img);
    });
}

let tankBoot: string | undefined;
const bus = openBus((m) => {
  if (m.op === "state") {
    greeted = true;
    // A tank restart loses any in-flight wantThumbs — a new boot id
    // resets ask state so missing thumbs are requested again (stored
    // thumbs still serve; only empty boxes re-ask).
    if (typeof m.boot === "string" && m.boot !== tankBoot) {
      tankBoot = m.boot;
      thumbRequested.clear();
      lastStructure = "";
    }
    tankState = m;
    renderOverview();
  } else if (m.op === "thumbs" &&
             m.thumbs && typeof m.thumbs === "object") {
    for (const [k, d] of
         Object.entries(m.thumbs as Record<string, unknown>))
      if (typeof d === "string") thumbStore.set(k, d);
    paintThumbs();
  }
  panel.notify(m);
});

const panel = mountImportPanel({
  // Remote mode never touches the sim locally — the tank page applies
  // installs and posts the result back.
  onSheets: () => {},
  onImages: () => {},
  preview: previewOf,
}, { host: panelEl, remote: bus });

panel.open();

// Escape closes the window — the native shell intercepts this bus post
// (a page can't close a window it didn't open); over BroadcastChannel
// the tank page just sees an unknown op and ignores it.
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !e.repeat) bus.post({ op: "closePanel" });
});

// Sound files dropped on the panel: decoded/encoded bytes persist to
// the shared IndexedDB store, then the tank page is asked to reload
// and play them (audio contexts live in the tank page's webview).
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => {
  e.preventDefault();
  void (async () => {
    const recs: { name: string; wav: Uint8Array }[] = [];
    for (const file of Array.from(e.dataTransfer?.files ?? [])) {
      if (file.size > 32 * 1024 * 1024) continue; // same cap as the tank
      recs.push(...fileSoundRecords(
        file.name, new Uint8Array(await file.arrayBuffer())));
    }
    if (!recs.length) return;
    try { await sndsMerge(recs); }
    catch (err) {
      // The tank re-reads the store on soundsLoaded — nothing landed,
      // so posting it would report a success that isn't one.
      console.warn("snd persist failed:", err);
      return;
    }
    bus.post({ op: "soundsLoaded", name: recs[0]!.name });
  })().catch((err) => console.warn("sound drop failed:", err));
});

// ---- tabs ------------------------------------------------------------------
function showView(v: string): void {
  const b = document.querySelector<HTMLButtonElement>(
    `#tabs .tab[data-view="${v}"]`);
  if (!b) return;
  document.querySelectorAll<HTMLButtonElement>("#tabs .tab").forEach((t) => {
    const on = t === b;
    t.classList.toggle("on", on);
    t.setAttribute("aria-selected", String(on));
    t.tabIndex = on ? 0 : -1; // roving tabindex: only the active tab stops
  });
  overviewEl.style.display = v === "overview" ? "" : "none";
  panelEl.style.display = v === "addons" ? "" : "none";
}
document.querySelectorAll<HTMLButtonElement>("#tabs .tab").forEach((b) =>
  b.addEventListener("click", () => showView(b.dataset.view!)));
// ARIA tabs imply arrow-key traversal — cycle between the two tabs.
document.getElementById("tabs")!.addEventListener("keydown", (e) => {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  if (e.metaKey || e.ctrlKey || e.altKey) return; // don't hijack VO/history
  e.preventDefault();
  const cur = document.querySelector<HTMLButtonElement>("#tabs .tab.on");
  const next = cur?.dataset.view === "overview" ? "addons" : "overview";
  showView(next);
  document.querySelector<HTMLButtonElement>(
    `#tabs .tab[data-view="${next}"]`)?.focus();
});

// The native menu picks the initial view via the URL hash and can switch
// views on an already-open panel.
if (location.hash === "#addons") showView("addons");
(window as { panelUI?: unknown }).panelUI = { show: showView };

// ---- tank overview ---------------------------------------------------------
function uptime(ticks: number): string {
  const mins = Math.floor(ticks / 30 / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function hungerLabel(h: number): string {
  if (h < 0.33) return "full";
  if (h < 0.66) return "peckish";
  return "hungry";
}

// Rows are only rebuilt when membership changes — a full rebuild on
// every 2s state push could swap a Remove button out mid-click and
// drops keyboard focus. Live labels refresh in place instead.
let lastStructure = "";
let statsEl: HTMLElement | null = null;
const fishMeta = new Map<number, HTMLElement>();

function statsLine(s: TankState, count: number): string {
  return `${count} fish · water ` +
    `${Math.round((s.waterQuality ?? 1) * 100)}% · up ` +
    uptime(s.tickCount ?? 0);
}

// Thumbnail box for a row: fixed-size placeholder filled when the
// tank's thumbs reply lands (or immediately if it's already stored).
function thumbBox(key: string, need: Set<string>): HTMLElement {
  const box = el("span", "othumbbox");
  box.dataset.thumb = key;
  if (!thumbStore.has(key) && !thumbRequested.has(key)) {
    thumbRequested.add(key);
    need.add(key);
  }
  return box;
}

function renderOverview(): void {
  const s = tankState;
  if (!s) return;
  const fish = s.fish ?? [];
  // A fish add-on is represented by its fish — it only lists in
  // Add-ons while no fish is bound to it (same bound test the tank
  // uses: pack url, or species name for pre-pack rosters).
  const addons = (s.addons ?? []).filter((a) =>
    a.section !== "fish" ||
    !fish.some((f) => f.pack === a.url ||
      (f.pack === undefined && f.species === a.inner)));
  const structure = JSON.stringify([
    fish.map((f) => [f.id, f.species, f.pack]),
    addons.map((a) => [a.inner, a.section]),
  ]);
  if (structure === lastStructure) {
    if (statsEl) statsEl.textContent = statsLine(s, fish.length);
    for (const f of fish) {
      const meta = fishMeta.get(f.id);
      // Desync between lastStructure and the DOM degrades to a rebuild
      // rather than a crash on every poll.
      if (!meta) { lastStructure = ""; return renderOverview(); }
      meta.textContent = `${f.state} · ${hungerLabel(f.hunger)}`;
    }
    return;
  }
  lastStructure = structure;
  fishMeta.clear();
  overviewEl.textContent = "";
  const need = new Set<string>();

  statsEl = el("div", "ostats", statsLine(s, fish.length));
  overviewEl.appendChild(statsEl);

  overviewEl.appendChild(el("div", "osec", `Fish (${fish.length})`));
  if (!fish.length)
    overviewEl.appendChild(el("div", "oempty",
      "No fish — add one from the Add-ons tab."));
  for (const f of fish) {
    const row = el("div", "orow");
    row.appendChild(thumbBox(fishThumbKey(f), need));
    row.appendChild(el("span", "oname", f.species || "Fish"));
    const meta = el("span", "ometa",
      `${f.state} · ${hungerLabel(f.hunger)}`);
    fishMeta.set(f.id, meta);
    row.appendChild(meta);
    const rm = el("button", "orm", "Remove");
    rm.addEventListener("click", () =>
      bus.post({ op: "removeFish", id: f.id }));
    row.appendChild(rm);
    overviewEl.appendChild(row);
  }

  overviewEl.appendChild(el("div", "osec", `Add-ons (${addons.length})`));
  if (!addons.length)
    overviewEl.appendChild(el("div", "oempty", "Nothing installed yet."));
  for (const a of addons) {
    const row = el("div", "orow");
    row.appendChild(thumbBox(`a:${a.url}`, need));
    row.appendChild(el("span", "oname", a.inner));
    row.appendChild(el("span", "ometa", a.section));
    const rm = el("button", "orm", "Remove");
    rm.addEventListener("click", () =>
      bus.post({ op: "removeAddon", url: a.url }));
    row.appendChild(rm);
    overviewEl.appendChild(row);
  }
  paintThumbs();
  // Rows were just rebuilt — drop thumb state for keys that died with
  // them (removed fish, uninstalled add-ons) so the maps stay bounded.
  const live = new Set(fish.map(fishThumbKey));
  for (const a of addons) live.add(`a:${a.url}`);
  for (const k of thumbStore.keys()) if (!live.has(k)) thumbStore.delete(k);
  for (const k of thumbRequested) if (!live.has(k)) thumbRequested.delete(k);
  if (need.size) bus.post({ op: "wantThumbs", keys: [...need] });
}

// The tank page may still be loading when the panel opens — retry the
// hello until a state push arrives (it also posts on every save).
let tries = 0;
const greet = setInterval(() => {
  if (greeted || ++tries > 60) clearInterval(greet); // give up after 30s
  else bus.post({ op: "hello" });
}, 500);
bus.post({ op: "hello" });
// Poll while the window is visible — the overview reads live, Add-ons
// install badges stay synced, and this is also the recovery path if
// the tank page reloaded mid-session. (State replies only toggle
// badges in place — cheap on any tab.) Skipped while hidden: the
// relay filters pushes to closed windows anyway.
setInterval(() => {
  if (greeted && !document.hidden) bus.post({ op: "hello" });
}, 2000);
// Snap to fresh state the moment the panel is shown again — covers
// both the overview data and install badges on the Add-ons tab, and
// resyncs after the relay's hidden-window filter skipped pushes.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && greeted) bus.post({ op: "hello" });
});
