import { openBus } from "./bus.js";
import { hostWindow } from "osmium-ui";
import { deriveStats, hungerLabel, trend, uptime } from "./statsmodel.js";
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
               series?: (number | null)[]): HTMLElement {
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
  if (series && series.some((v) => Number.isFinite(v)))
    cell.appendChild(spark(series));
  return cell;
}

/** A 1-bit sparkline of the rolling history — newest sample on the
 * right, one canvas column each, gaps where a sample is missing. */
function spark(series: (number | null)[]): HTMLCanvasElement {
  const W = 44, H = 14;
  const cv = document.createElement("canvas");
  cv.className = "sspark";
  cv.width = W; cv.height = H;
  cv.setAttribute("aria-hidden", "true");
  const c = cv.getContext("2d")!;
  c.fillStyle = "#fff"; c.fillRect(0, 0, W, H);
  c.fillStyle = "#000";
  const pts = series.slice(-W);
  const off = W - pts.length;
  let py = -1;
  pts.forEach((v, i) => {
    // NaN counts as a gap too — otherwise it would no-op the fillRect
    // and poison the next sample's connector through py.
    if (v === null || !Number.isFinite(v)) { py = -1; return; }
    const y = Math.round((1 - Math.min(1, Math.max(0, v))) * (H - 1));
    if (py < 0) c.fillRect(off + i, y, 1, 1);
    else {
      const lo = Math.min(py, y), hi = Math.max(py, y);
      c.fillRect(off + i, lo, 1, hi - lo + 1);
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
                               history.map((s) => s.water)));
  field("Avg. hunger", st.avgHunger === null
    ? meter(null, "—", "")
    : meter(st.avgHunger, `${Math.round(st.avgHunger * 100)}%`,
            trend(old?.avgHunger ?? null, st.avgHunger),
            history.map((s) => s.avgHunger)));
  field("Hungriest", text(st.hungriest
    ? `${st.hungriest.name} — ${hungerLabel(st.hungriest.hunger)}` : "—"));
  field("Fish", text(`${st.fishCount}` +
    (st.seeking ? ` (${st.seeking} seeking food)` : "") +
    (st.startled ? ` (${st.startled} startled)` : "")));
  field("Food", text(st.food
    ? `${st.food} pellet${st.food > 1 ? "s" : ""}` +
      (st.foodSettled ? `, ${st.foodSettled} rotting` : "")
    : "none"));
  field("Light", text(st.phase === "day" ? "Day" : "Night"));
  field("Tank age", text(uptime(st.uptimeMin)));

  careEl.textContent = "";
  careEl.appendChild(el("div", "osm-label scarehead", "Care:"));
  for (const a of st.advice) careEl.appendChild(el("div", "scareline", a));
}

let greeted = false;
const bus = openBus((m: BusMsg) => {
  if (m.op !== "state") return;
  greeted = true;
  const st = deriveStats(m as StatsInput);
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

// Ungated on `greeted`: if the tank tab opens after the greet retries
// gave up, this heartbeat is the revival path — one cheap message, and
// an unanswered hello costs nothing when no tank is listening.
setInterval(() => {
  if (!document.hidden) bus.post({ op: "hello" });
}, 2000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) bus.post({ op: "hello" });
});
