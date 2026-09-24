import { openBus } from "./bus.js";
import { hostWindow, pushButton } from "osmium-ui";
import { deriveStats, hungerLabel, SPARK_H, SPARK_W, sparkColumns, sparkRow,
         summaryText, trend, uptime } from "./statsmodel.js";
import type { BusMsg } from "./bus.js";
import type { StatsInput, TankStats } from "./statsmodel.js";

// Tank Stats — an optional secondary window drawn as a Mac OS 8
// document window (Osmium UI) and laid out like a Get Info window:
// bold labels on a shared right edge, values after them, progress
// bars for the two levels, care hints below.
// The tank page owns the sim; this page renders the `state` payloads
// it pushes (same contract as the other client windows). The window
// chrome goes through Osmium UI's hostWindow.

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
  field("Fish", text(`${st.fishCount}` +
    (st.seeking ? ` (${st.seeking} seeking food)` : "") +
    (st.startled ? ` (${st.startled} startled)` : "")));
  field("Food", text(st.food
    ? `${st.food} pellet${st.food > 1 ? "s" : ""}` +
      (st.foodSettled ? `, ${st.foodSettled} rotting` : "")
    : "none"));
  field("Light", text(st.lightLabel));
  field("Tank age", text(uptime(st.uptimeMin)));

  careEl.textContent = "";
  careEl.appendChild(el("div", "osm-label scarehead", "Care:"));
  for (const a of st.advice) careEl.appendChild(el("div", "scareline", a));
}

let greeted = false;
let lastStats: TankStats | null = null;
const bus = openBus((m: BusMsg) => {
  if (m.op !== "state") return;
  greeted = true;
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
});

// ---- window chrome -------------------------------------------------------
// Zoom toggles to the standard size; the grow box keeps every field
// and two care hints visible (the window clips rather than scrolls).
hostWindow(win, {
  title: "Tank Stats",
  zoom: { standard: { w: 400, h: 360 } },
  grow: { min: { w: 300, h: 60 } },
});

// The tank page may still be loading when the window opens — retry the
// hello until a state push arrives, then keep a live heartbeat so the
// numbers stay current (same cadence the panel uses).
let tries = 0;
const greet = setInterval(() => {
  if (greeted || ++tries > 60) clearInterval(greet); // give up after 30s
  else bus.post({ op: "hello" });
}, 500);
bus.post({ op: "hello" });

// Change Water — a partial change on the tank sim (it also siphons
// settled pellets). The next state push re-renders the numbers.
pushButton(document.getElementById("schange") as HTMLButtonElement,
           () => bus.post({ op: "changeWater" }));

// Copy Summary — the window's rows as plain text on the clipboard, so
// a tank's state can leave the app (the tank diary's quick share).
const copyBtn = document.getElementById("scopy") as HTMLButtonElement;
pushButton(copyBtn, () => {
  const st = lastStats;
  const done = (label: string): void => {
    copyBtn.textContent = label;
    setTimeout(() => { copyBtn.textContent = "Copy Summary"; }, 1500);
  };
  if (!st) { done("No data yet"); return; }
  const text = summaryText(st);
  // Older WebKit and non-secure (plain-http) contexts have no async
  // clipboard API at all — the textarea + execCommand fallback covers
  // them, and also catches writeText rejections (denied permission).
  const fallback = (): void => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta);
    try {
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, ta.value.length); // older iOS
      done(document.execCommand("copy") ? "Copied!" : "Copy failed");
    } catch { done("Copy failed"); }
    finally { ta.remove(); }
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
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) bus.post({ op: "hello" });
});
