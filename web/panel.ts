import { mountImportPanel } from "./import.js";
import { previewOf } from "./render.js";
import { openBus } from "./bus.js";
import type { BusMsg } from "./bus.js";
import type { Importable } from "./import.js";

// Panel window: tank overview plus the add-on browser, full-size.
// The tank page owns the sim — this page sends intents (install,
// removeFish, removeAddon) and renders the state it pushes back.
// Opened by Tank > Import Add-ons… / Tank > Overview in the app; in a
// browser it talks to an index.html tab over BroadcastChannel.

interface FishSnap {
  id: number; species: string; hunger: number; state: string;
}
interface TankState extends BusMsg {
  addons?: Importable[];
  fish?: FishSnap[];
  waterQuality?: number;
  tickCount?: number;
}
let tankState: TankState | null = null;
let greeted = false;

function el(tag: string, cls = "", text = ""): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

const overviewEl = document.getElementById("overview")!;
const panelEl = document.getElementById("panel")!;

const bus = openBus((m) => {
  if (m.op === "state") {
    greeted = true;
    tankState = m;
    renderOverview();
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

function renderOverview(): void {
  const s = tankState;
  if (!s) return;
  const fish = s.fish ?? [];
  const addons = s.addons ?? [];
  const structure = JSON.stringify([
    fish.map((f) => [f.id, f.species]),
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

  statsEl = el("div", "ostats", statsLine(s, fish.length));
  overviewEl.appendChild(statsEl);

  overviewEl.appendChild(el("div", "osec", `Fish (${fish.length})`));
  if (!fish.length)
    overviewEl.appendChild(el("div", "oempty",
      "No fish — add one from the Add-ons tab."));
  for (const f of fish) {
    const row = el("div", "orow");
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
    row.appendChild(el("span", "oname", a.inner));
    row.appendChild(el("span", "ometa", a.section));
    const rm = el("button", "orm", "Remove");
    rm.addEventListener("click", () =>
      bus.post({ op: "removeAddon", url: a.url }));
    row.appendChild(rm);
    overviewEl.appendChild(row);
  }
}

// The tank page may still be loading when the panel opens — retry the
// hello until a state push arrives (it also posts on every save).
let tries = 0;
const greet = setInterval(() => {
  if (greeted || ++tries > 60) clearInterval(greet); // give up after 30s
  else bus.post({ op: "hello" });
}, 500);
bus.post({ op: "hello" });
// Slow heartbeat after first contact: re-syncs the panel if the tank
// page reloads mid-session (state replies only touch install badges).
// Skipped while hidden — the relay filters pushes to closed windows.
setInterval(() => {
  if (greeted && !document.hidden) bus.post({ op: "hello" });
}, 10_000);
// Hunger/state/water drift continuously — poll faster while the Tank
// tab is visible so the overview reads live.
setInterval(() => {
  if (greeted && overviewEl.style.display !== "none" && !document.hidden)
    bus.post({ op: "hello" });
}, 2000);
// Snap to fresh state the moment the panel is shown again — covers
// both the overview data and install badges on the Add-ons tab, and
// resyncs after the relay's hidden-window filter skipped pushes.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && greeted) bus.post({ op: "hello" });
});
