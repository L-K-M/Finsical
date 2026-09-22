import { inNativeShell, openBus } from "./bus.js";
import { mountWindow } from "./platinum/window.js";
import { deriveStats, hungerLabel, trend, uptime } from "./statsmodel.js";
import type { BusMsg } from "./bus.js";
import type { StatsInput, TankStats } from "./statsmodel.js";

// Tank Stats — an optional secondary window drawn as a Mac OS 8
// document window (web/platinum/) and laid out like a Get Info
// window: bold labels on a shared right edge, values after them,
// Platinum progress bars for the two levels, care hints below.
// The tank page owns the sim; this page renders the `state` payloads
// it pushes (same contract as panel.ts/prefs.ts) and posts window
// intents the native shell handles: closeStats, statsShade, statsZoom,
// statsGrow, dragWindow. In a plain browser the chrome posts are
// ignored — the window body still renders live state over
// BroadcastChannel.

const win = document.getElementById("swin")!;
const rowsEl = document.getElementById("srows")!;
const careEl = document.getElementById("scare")!;

function el(tag: string, cls = "", text = ""): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

/** One label/value pair of the .pt-fields grid. */
function field(label: string, value: HTMLElement): void {
  rowsEl.append(el("span", "pt-label", `${label}:`), value);
}
function text(value: string): HTMLElement {
  return el("span", "sval", value);
}
/** A level as a progress bar, its percentage and trend arrow. The bar
 * repeats what the text says, so assistive tech reads only the text. */
function meter(frac: number | null, pct: string,
               arrow: string): HTMLElement {
  const cell = el("span", "smeter");
  const bar = el("div", "pt-progress");
  bar.setAttribute("aria-hidden", "true");
  bar.style.setProperty("--pt-value",
                        String(Math.min(1, Math.max(0, frac ?? 0))));
  const track = el("div", "pt-progress-track");
  track.appendChild(el("div", "pt-progress-fill"));
  bar.appendChild(track);
  cell.append(bar, el("span", "spct", pct), el("span", "strend", arrow));
  return cell;
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
                               trend(old?.water ?? null, water)));
  field("Avg. hunger", st.avgHunger === null
    ? meter(null, "—", "")
    : meter(st.avgHunger, `${Math.round(st.avgHunger * 100)}%`,
            trend(old?.avgHunger ?? null, st.avgHunger)));
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
  careEl.appendChild(el("div", "pt-label scarehead", "Care:"));
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
// In the native shell these land on the relay (Finsical.swift), which
// closes/shades/drags the real window. Over BroadcastChannel they no-op.
function closeWindow(): void {
  bus.post({ op: "closeStats" });
  window.close(); // browser-tab fallback; no-ops where not script-opened
}
// Zoom box: toggles user ↔ standard size (native shell performs it;
// the browser fallback can only resize script-opened windows).
let savedSize: { w: number; h: number } | null = null;
function zoom(): void {
  // Native ignores statsZoom while shaded — match it so the fallback
  // toggle can't advance its saved state on an ignored click.
  if (shaded) return;
  if (inNativeShell()) { bus.post({ op: "statsZoom" }); return; }
  if (savedSize) {
    window.resizeTo(savedSize.w, savedSize.h);
    savedSize = null;
  } else {
    savedSize = { w: window.outerWidth, h: window.outerHeight };
    window.resizeTo(400, 360);
  }
}
let shaded = false;
function toggleShade(): void {
  shaded = !shaded;
  platinum.setShaded(shaded);
  bus.post({ op: "statsShade", on: shaded });
}
// Grow box: bottom-right drag resizes — the native shell runs a modal
// tracking loop; the fallback resizes the CSS window in place (height
// locked while shaded, matching the native collapsed minSize).
function grow(e: PointerEvent): void {
  e.preventDefault();
  if (inNativeShell()) { bus.post({ op: "statsGrow" }); return; }
  const r = win.getBoundingClientRect();
  const x0 = e.clientX, y0 = e.clientY, w0 = r.width, h0 = r.height;
  win.style.left = `${r.left}px`; win.style.top = `${r.top}px`;
  win.style.right = "auto"; win.style.bottom = "auto";
  const move = (ev: PointerEvent) => {
    if (ev.pointerId !== e.pointerId) return;
    win.style.width = `${Math.max(300, w0 + ev.clientX - x0)}px`;
    if (!shaded)
      win.style.height = `${Math.max(60, h0 + ev.clientY - y0)}px`;
  };
  const up = (ev: PointerEvent) => {
    if (ev.pointerId !== e.pointerId) return;
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", up);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);
}
const platinum = mountWindow(win, {
  title: "Tank Stats",
  onClose: closeWindow,
  onZoom: zoom,
  onCollapse: toggleShade,
  onGrow: grow,
  // Dragging the titlebar moves the window (native shell performs it).
  onDrag: (e) => {
    e.preventDefault();
    bus.post({ op: "dragWindow" });
  },
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !e.repeat) closeWindow();
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
// A reload resets this page's `shaded` flag — force the native window
// back in sync (a no-op when it isn't shaded; ignored in-browser).
bus.post({ op: "statsShade", on: false });
// Ungated on `greeted`: if the tank tab opens after the greet retries
// gave up, this heartbeat is the revival path — one cheap message, and
// an unanswered hello costs nothing when no tank is listening.
setInterval(() => {
  if (!document.hidden) bus.post({ op: "hello" });
}, 2000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) bus.post({ op: "hello" });
});
// The shell expands a close-while-shaded window natively on reopen —
// a small→large viewport transition is the only signal that
// distinguishes reopen from tab-switch/minimize (which must leave the
// shade folded). In a browser tab the fold is CSS-only, so the
// viewport never drops below the threshold and nothing unshades.
// Must stay comfortably above the native shell's shaded (titlebar-only)
// window height (~24px) and below its minimum expanded height — drift
// here silently breaks reopen-unshade.
const SHADED_MAX_H = 60;
let lastInnerH = window.innerHeight;
window.addEventListener("resize", () => {
  const h = window.innerHeight;
  if (shaded && lastInnerH <= SHADED_MAX_H && h > SHADED_MAX_H) {
    shaded = false;
    platinum.setShaded(false);
  }
  lastInnerH = h;
});
