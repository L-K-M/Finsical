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

// ---- tabs ------------------------------------------------------------------
function showView(v: string): void {
  const b = document.querySelector<HTMLButtonElement>(
    `#tabs .tab[data-view="${v}"]`);
  if (!b) return;
  document.querySelectorAll("#tabs .tab").forEach((t) =>
    t.classList.toggle("on", t === b));
  overviewEl.style.display = v === "overview" ? "" : "none";
  panelEl.style.display = v === "addons" ? "" : "none";
}
document.querySelectorAll<HTMLButtonElement>("#tabs .tab").forEach((b) =>
  b.addEventListener("click", () => showView(b.dataset.view!)));

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

function renderOverview(): void {
  const s = tankState;
  if (!s) return;
  const fish = s.fish ?? [];
  const addons = s.addons ?? [];
  overviewEl.textContent = "";

  const stats = el("div", "ostats",
    `${fish.length} fish · water ${Math.round((s.waterQuality ?? 1) * 100)}%` +
    ` · up ${uptime(s.tickCount ?? 0)}`);
  overviewEl.appendChild(stats);

  overviewEl.appendChild(el("div", "osec", `Fish (${fish.length})`));
  if (!fish.length)
    overviewEl.appendChild(el("div", "oempty",
      "No fish — add one from the Add-ons tab."));
  for (const f of fish) {
    const row = el("div", "orow");
    row.appendChild(el("span", "oname", f.species || "Fish"));
    row.appendChild(el("span", "ometa",
      `${f.state} · ${hungerLabel(f.hunger)}`));
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
      bus.post({ op: "removeAddon", inner: a.inner }));
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
setInterval(() => { if (greeted) bus.post({ op: "hello" }); }, 10_000);
