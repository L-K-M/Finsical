import { openBus, TANK_QUIET_MS } from "./bus.js";
import { hostWindow, mountPopup, pushButton, setButtonTitle }
  from "osmium-ui";
import { MEDICINES } from "../core/aquarium/disease.js";
import { deriveStats, hungerLabel, SPARK_H, SPARK_W, sparkColumns, sparkRow,
         summaryText, trend, uptime } from "./statsmodel.js";
import type { BusMsg } from "./bus.js";
import type { StatsInput, TankStats, WaterStats } from "./statsmodel.js";

// Tank Stats — an optional secondary window drawn as a Mac OS 8
// document window (Osmium UI) and laid out like a Get Info window:
// bold labels on a shared right edge, values after them, progress
// bars for the two levels, care hints below.
// The tank page owns the sim; this page renders the `state` payloads
// it pushes (same contract as the other client windows). The window
// chrome goes through Osmium UI's hostWindow.

// A file dropped on this window must not navigate it to the file —
// only the tank page and the Add-ons window accept drops.
window.addEventListener("dragover", (e) => {
  e.preventDefault();
  // Reject file drops with the OS "no drop" cursor instead of a copy cursor.
  if (e.dataTransfer?.types.includes("Files"))
    e.dataTransfer.dropEffect = "none";
});
window.addEventListener("drop", (e) => e.preventDefault());

const win = document.getElementById("swin")!;
const rowsEl = document.getElementById("srows")!;
const careEl = document.getElementById("scare")!;

function el(tag: string, cls = "", text = ""): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

/** One label/value pair of the .osm-fields grid. */
function field(label: string, value: HTMLElement): void {
  rowsEl.append(el("span", "osm-label", `${label}:`), value);
}
function text(value: string): HTMLElement {
  return el("span", "sval", value);
}
/** A level as a progress bar, its percentage, trend arrow, and a
 * sparkline of the recent samples. The bar repeats what the text says,
 * so assistive tech reads only the text. */
function meter(frac: number | null, pct: string, arrow: string,
               series?: { t: number; v: number | null }[]): HTMLElement {
  const cell = el("span", "smeter");
  const bar = el("div", "osm-progress");
  bar.setAttribute("aria-hidden", "true");
  bar.style.setProperty("--osm-value",
                        String(Math.min(1, Math.max(0, frac ?? 0))));
  const track = el("div", "osm-progress-track");
  track.appendChild(el("div", "osm-progress-fill"));
  bar.appendChild(track);
  cell.append(bar, el("span", "spct", pct), el("span", "strend", arrow));
  // No framed blank: an all-gap history (null/NaN/Infinity — the
  // same definition spark() can't draw) is "no data yet".
  if (series && series.some((s) => Number.isFinite(s.v)))
    cell.appendChild(spark(series));
  return cell;
}

/** A 1-bit sparkline of the rolling history — newest on the right,
 * a column per time slot (sparkColumns), gaps where a sample is
 * missing. */
function spark(series: { t: number; v: number | null }[]): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.className = "sspark";
  cv.width = SPARK_W; cv.height = SPARK_H;
  cv.setAttribute("aria-hidden", "true");
  const c = cv.getContext("2d")!;
  c.fillStyle = "#fff"; c.fillRect(0, 0, SPARK_W, SPARK_H);
  c.fillStyle = "#000";
  let py = -1;
  sparkColumns(series, Date.now()).forEach((v, i) => {
    // NaN counts as a gap too — otherwise it would no-op the fillRect
    // and poison the next sample's connector through py.
    if (v === undefined || v === null || !Number.isFinite(v)) {
      py = -1;
      return;
    }
    const y = sparkRow(v);
    if (py < 0) c.fillRect(i, y, 1, 1);
    else {
      const lo = Math.min(py, y), hi = Math.max(py, y);
      c.fillRect(i, lo, 1, hi - lo + 1);
    }
    py = y;
  });
  return cv;
}

// Rolling window of recent pushes — trends compare now vs ~90 s ago.
interface Sample { t: number; avgHunger: number | null; water: number }
const history: Sample[] = [];
const TREND_AGE_MS = 90_000;
function trendBase(): Sample | null {
  const cutoff = Date.now() - TREND_AGE_MS;
  let old: Sample | null = null;
  for (const s of history) { if (s.t > cutoff) break; old = s; }
  // A hidden/closed window misses pushes — a baseline far older than
  // the window would compare "now" against a stale sample. Fall back
  // to the oldest in-window sample so the arrow means ~90 s again.
  if (old && Date.now() - old.t > 2 * TREND_AGE_MS)
    return history.find((s) => s.t > cutoff) ?? null;
  return old;
}

function render(st: TankStats): void {
  rowsEl.textContent = "";
  const old = trendBase();
  const water = st.waterPct / 100;
  field("Water quality", meter(water, `${st.waterPct}%`,
                               trend(old?.water ?? null, water),
                               history.map((s) => ({ t: s.t, v: s.water }))));
  field("Avg. hunger", st.avgHunger === null
    ? meter(null, "—", "")
    : meter(st.avgHunger, `${Math.round(st.avgHunger * 100)}%`,
            trend(old?.avgHunger ?? null, st.avgHunger),
            history.map((s) => ({ t: s.t, v: s.avgHunger }))));
  field("Hungriest", text(st.hungriest
    ? `${st.hungriest.name} — ${hungerLabel(st.hungriest.hunger)}` : "—"));
  const w = st.water;
  if (w) waterRows(w);
  field("Fish", text(`${st.fishCount}` +
    (st.sick.length ? `, ${st.sick.length} sick` : "") +
    (st.dead ? `, ${st.dead} dead` : "") +
    (st.seeking ? ` (${st.seeking} seeking food)` : "") +
    (st.startled ? ` (${st.startled} startled)` : "")));
  field("Food", text(st.food
    ? `${st.food} pellet${st.food > 1 ? "s" : ""}` +
      (st.foodSettled ? `, ${st.foodSettled} rotting` : "")
    : "none"));
  field("Light", text(st.lightLabel));
  field("Tank age", text(w ? days(w.days) : uptime(st.uptimeMin)));
  if (st.milestone) field("Diary", text(st.milestone));

  careEl.textContent = "";
  careEl.appendChild(el("div", "osm-label scarehead", "Care:"));
  for (const a of st.advice) careEl.appendChild(el("div", "scareline", a));
}

/** The original's water window, per litre. */
function waterRows(w: WaterStats): void {
  const mg = (v: number, d = 2): string => `${v.toFixed(d)} mg/L`;
  field("Temperature", text(`${w.temp.toFixed(1)} °C`));
  field("pH", text(`${w.pH.toFixed(2)}, hardness ${w.gH.toFixed(1)} °dH`));
  field("Oxygen", text(`${mg(w.o2)} (${w.oxygenPct}%)`));
  field("Carbon dioxide", text(mg(w.co2, 1)));
  field("Nitrate", text(mg(w.nitrate)));
  field("Ammonia", text(mg(w.ammonia)));
  field("Chlorine", text(mg(w.chlorine)));
  field("Filter dirt", meter(w.filterDirt / 100,
                             `${Math.round(w.filterDirt)}%`, ""));
  field("Medicine", text(w.doses.length
    ? w.doses.map((d) => `${d.name} ${d.ml} ml`).join(", ") + " dissolving"
    : "none"));
}

/** "3 days", "1 day", "5 hours" of tank time. */
function days(d: number): string {
  if (d < 1) {
    const h = Math.floor(d * 24);
    return `${h} hour${h === 1 ? "" : "s"}`;
  }
  const n = Math.floor(d);
  return `${n} day${n === 1 ? "" : "s"}`;
}

// ---- keeping -------------------------------------------------------------
// Controls for the tank's care. The tank page applies them and pushes the
// new state; values here only mirror that state (plus the water change
// and medicine being prepared, which are this window's own).
const HEAT_STEP = 0.5;
const AMOUNTS = [0.05, 0.1, 0.2, 0.25, 0.33, 0.5, 0.75, 0.9];
const SPEEDS = [1, 2, 5, 10, 30, 60, 100];
let water: WaterStats | null = null;
let changeTemp: number | null = null;
let doseMed = MEDICINES.findIndex((m) => m.name === "Green Remedy");
const $ = (id: string): HTMLButtonElement =>
  document.getElementById(id) as HTMLButtonElement;
const heatEl = document.getElementById("sheat")!;
const tempEl = document.getElementById("stemp")!;
const amountPop = mountPopup($("samt"), {
  items: AMOUNTS.map((a) => `${Math.round(a * 100)}%`), selected: 2,
  label: "Change", onChange: () => { /* read when Change Water is pressed */ },
});
mountPopup($("smed"), {
  items: MEDICINES.map((m) => m.name), selected: doseMed, label: "Medicine",
  onChange: (i) => { doseMed = i; refreshKeeping(); },
});
const speedLabel = (v: number): string =>
  v === 1 ? "Real time" : `${v}× faster`;
const speedPop = mountPopup($("sspeed"), {
  items: SPEEDS.map(speedLabel), selected: 0, label: "Time",
  onChange: (i) => bus.post({ op: "simSpeed", value: SPEEDS[i] }),
});
/** A dose sized for the tank: the label's amount per 10 litres. */
function doseMl(): number {
  const m = MEDICINES[doseMed];
  return m ? Math.round(m.dosePer10L * (water?.litres ?? 100) / 10) : 0;
}
function refreshKeeping(): void {
  const w = water;
  heatEl.textContent = w ? `${w.heaterTarget.toFixed(1)} °C` : "—";
  const t = changeTemp ?? w?.change.temp ?? 26.5;
  tempEl.textContent = `${t.toFixed(1)} °C`;
  setButtonTitle($("sdose"), `Add ${doseMl()} ml`);
}
const clampTemp = (t: number): number =>
  Math.min(water?.heaterMax ?? 36, Math.max(water?.heaterMin ?? 16, t));
pushButton($("sheatdn"), () => water && bus.post(
  { op: "heaterTarget", value: water.heaterTarget - HEAT_STEP }));
pushButton($("sheatup"), () => water && bus.post(
  { op: "heaterTarget", value: water.heaterTarget + HEAT_STEP }));
pushButton($("sclean"), () => bus.post({ op: "cleanFilter" }));
const stepTemp = (d: number) => () => {
  changeTemp = clampTemp((changeTemp ?? water?.change.temp ?? 26.5) + d);
  refreshKeeping();
};
pushButton($("stempdn"), stepTemp(-HEAT_STEP));
pushButton($("stempup"), stepTemp(HEAT_STEP));
// Fresh tap water carries chlorine and, at another temperature, shocks
// the fish; the tank page applies the change as the original did.
pushButton($("schange"), () => bus.post({
  op: "changeWater", fraction: AMOUNTS[amountPop.selected],
  temp: changeTemp ?? water?.change.temp,
}));
pushButton($("sdose"), () => bus.post({
  op: "addMedicine", id: MEDICINES[doseMed]?.id, ml: doseMl(),
}));
let keepingSeeded = false;
function syncKeeping(w: WaterStats | null): void {
  water = w;
  if (w && !keepingSeeded) {
    // The last change the tank made is where this window starts.
    keepingSeeded = true;
    const i = AMOUNTS.findIndex((a) => Math.abs(a - w.change.fraction) < 0.005);
    if (i >= 0) amountPop.setSelected(i);
  }
  if (w) {
    const i = SPEEDS.indexOf(w.speed);
    if (i >= 0 && i !== speedPop.selected) speedPop.setSelected(i);
  }
  refreshKeeping();
}

let greeted = false;
let tankBoot: string | undefined;
let lastStats: TankStats | null = null;
let lastStateAt = 0;
let tankGone = false;
const bus = openBus((m: BusMsg) => {
  if (m.op !== "state") return;
  greeted = true;
  lastStateAt = Date.now();
  if (tankGone) { tankGone = false;
                rowsEl.classList.remove("osm-dimmed"); }
  if (typeof m.boot === "string") {
    // A restarted tank is a different tank: its water and hunger must
    // not merge into the trends and sparklines the old one drew.
    if (tankBoot !== undefined && m.boot !== tankBoot) history.length = 0;
    tankBoot = m.boot;
  }
  const st = deriveStats(m as StatsInput);
  lastStats = st;
  history.push({ t: Date.now(), avgHunger: st.avgHunger,
                 water: st.waterPct / 100 });
  // Trim by age, keeping the newest pre-cutoff sample that trendBase()
  // needs — a bare count cap can evict it once pushes arrive faster
  // than 512 per 90s and the arrows pin to "→". The count cap stays as
  // a backstop but never evicts index 0 (the baseline).
  const cutoff = Date.now() - TREND_AGE_MS;
  while (history.length > 1 && history[1]!.t <= cutoff) history.shift();
  if (history.length > 512) history.splice(1, history.length - 512);
  render(st);
  syncKeeping(st.water);
});

// A file dropped here would navigate this borderless window to the
// raw file, with no way back — swallow drops like the tank page does.
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => e.preventDefault());

// ---- window chrome -------------------------------------------------------
// Zoom toggles to the standard size; the grow box keeps every field
// and two care hints visible (the window clips rather than scrolls).
hostWindow(win, {
  title: "Tank Stats",
  zoom: { standard: { w: 380, h: 640 } },
  grow: { min: { w: 340, h: 60 } },
});

// Until the first state push lands the window says what it is waiting
// for — a blank fields grid reads as broken, not as loading.
let waiting = text("Waiting for the tank…");
field("Tank", waiting);

// The tank page may still be loading when the window opens — retry the
// hello until a state push arrives, then keep a live heartbeat so the
// numbers stay current (same cadence the panel uses).
let tries = 0;
const greet = setInterval(() => {
  if (greeted || ++tries > 60) {
    clearInterval(greet); // give up after 30s — say so rather than wait on
    if (!greeted)
      waiting.textContent = "The tank isn't answering — is Finsical running?";
  } else bus.post({ op: "hello" });
}, 500);
bus.post({ op: "hello" });


// Copy Summary — the window's rows as plain text on the clipboard, so
// a tank's state can leave the app (the tank diary's quick share).
const copyBtn = document.getElementById("scopy") as HTMLButtonElement;
pushButton(copyBtn, () => {
  const st = lastStats;
  let copyTimer: ReturnType<typeof setTimeout> | undefined;
  const done = (label: string): void => {
    copyBtn.textContent = label;
    // A re-click inside the window restarts the feedback, not just
    // the label — a stale reset must not erase the newer one early.
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copyBtn.textContent = "Copy Summary";
    }, 1500);
  };
  if (!st) { done("No data yet"); return; }
  const text = summaryText(st);
  // Older WebKit and non-secure (plain-http) contexts have no async
  // clipboard API at all — the textarea + execCommand fallback covers
  // them, and also catches writeText rejections (denied permission).
  const fallback = (): void => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.readOnly = true; // stops iOS raising the soft keyboard on focus
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta);
    try {
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, ta.value.length); // older iOS
      done(document.execCommand("copy") ? "Copied!" : "Copy failed");
    } catch { done("Copy failed"); }
    // focus() moved it to the textarea — give it back so keyboard
    // users don't land on <body> when this path runs.
    finally { ta.remove(); copyBtn.focus(); }
  };
  if (typeof navigator.clipboard?.writeText === "function")
    navigator.clipboard.writeText(text)
      .then(() => done("Copied!"))
      .catch(fallback);
  else fallback();
});

// Ungated on `greeted`: if the tank tab opens after the greet retries
// gave up, this heartbeat is the revival path — one cheap message, and
// an unanswered hello costs nothing when no tank is listening.
setInterval(() => {
  if (!document.hidden) bus.post({ op: "hello" });
}, 2000);
// A hello earns a state push within ~750 ms — six quiet seconds after
// the last one means the tank tab is gone or reloading. Dim the stale
// readings and say so instead of showing them as live.
setInterval(() => {
  // Only mark — the state handler restores when a real push lands, so
  // a late hello reply can't strand the dim between the two.
  if (!greeted || tankGone ||
      Date.now() - lastStateAt <= TANK_QUIET_MS) return;
  tankGone = true;
  rowsEl.classList.add("osm-dimmed");
  careEl.textContent = "";
  careEl.appendChild(el("div", "scareline", "Waiting for the tank…"));
}, 1000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    // A backgrounded tab is expected to be quiet — the return hello's
    // response window resets staleness so a live tank never flashes
    // "Waiting for the tank…" on the way back.
    lastStateAt = Date.now();
    bus.post({ op: "hello" });
  }
});
// Right-click inside a borderless WebKit window surfaces WebKit's
// generic menu (Reload etc.) — nothing in it applies to a desk
// accessory, so swallow it like the tank page does.
window.addEventListener("contextmenu", (e) => e.preventDefault());
