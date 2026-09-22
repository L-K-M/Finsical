import { inNativeShell, openBus } from "./bus.js";
import { deriveStats, hungerLabel, trend, uptime } from "./statsmodel.js";
import type { BusMsg } from "./bus.js";
import type { StatsInput, TankStats } from "./statsmodel.js";

// Tank Stats — an optional secondary window styled like a System 8
// (Platinum) window: pinstripe titlebar, close box, collapse box.
// The tank page owns the sim; this page renders the `state` payloads
// it pushes (same contract as panel.ts/prefs.ts) and posts window
// intents the native shell handles: closeStats, statsShade, dragWindow.
// In a plain browser the chrome posts are ignored — the window body
// still renders live state over BroadcastChannel.

const win = document.getElementById("swin")!;
const rowsEl = document.getElementById("srows")!;
const careEl = document.getElementById("scare")!;

function el(tag: string, cls = "", text = ""): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function meterRow(label: string, frac: number | null,
                  value: string): HTMLElement {
  const row = el("div", "srow");
  row.appendChild(el("span", "slabel", label));
  const m = el("span", "smeter");
  const fill = el("span", "sfill");
  fill.style.width = `${Math.round((frac ?? 0) * 100)}%`;
  m.appendChild(fill);
  row.appendChild(m);
  row.appendChild(el("span", "sval", value));
  return row;
}
function textRow(label: string, value: string): HTMLElement {
  const row = el("div", "srow");
  row.appendChild(el("span", "slabel", label));
  row.appendChild(el("span", "sval", value));
  return row;
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
  const wTrend = trend(old?.water ?? null, st.waterPct / 100);
  const hTrend = trend(old?.avgHunger ?? null, st.avgHunger ?? 0);
  rowsEl.appendChild(meterRow("Water quality", st.waterPct / 100,
    `${st.waterPct}% ${wTrend}`));
  rowsEl.appendChild(meterRow("Avg. hunger", st.avgHunger,
    st.avgHunger === null ? "—"
                          : `${Math.round(st.avgHunger * 100)}% ${hTrend}`));
  rowsEl.appendChild(textRow("Hungriest",
    st.hungriest ? `${st.hungriest.name} — ${hungerLabel(st.hungriest.hunger)}`
                 : "—"));
  rowsEl.appendChild(textRow("Fish",
    `${st.fishCount}` +
    (st.seeking ? ` (${st.seeking} seeking food)` : "") +
    (st.startled ? ` (${st.startled} startled)` : "")));
  rowsEl.appendChild(textRow("Food",
    st.food ? `${st.food} pellet${st.food > 1 ? "s" : ""}` +
      (st.foodSettled ? `, ${st.foodSettled} rotting` : "")
            : "none"));
  rowsEl.appendChild(textRow("Light",
    st.phase === "day" ? "Day" : "Night"));
  rowsEl.appendChild(textRow("Tank age", uptime(st.uptimeMin)));

  careEl.textContent = "";
  careEl.appendChild(el("div", "scarehead", "Care"));
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
document.getElementById("sclose")!.addEventListener("click", () => {
  bus.post({ op: "closeStats" });
  window.close(); // browser-tab fallback; no-ops where not script-opened
});
// Zoom box: toggles user ↔ standard size (native shell performs it;
// the browser fallback can only resize script-opened windows).
let savedSize: { w: number; h: number } | null = null;
document.getElementById("szoom")!.addEventListener("click", () => {
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
});
let shaded = false;
document.getElementById("sshade")!.addEventListener("click", () => {
  shaded = !shaded;
  win.classList.toggle("shaded", shaded);
  bus.post({ op: "statsShade", on: shaded });
});
// Grow box: bottom-right drag resizes — the native shell runs a modal
// tracking loop; the fallback resizes the CSS window in place (height
// locked while shaded, matching the native 24px minSize).
document.getElementById("sgrow")!.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
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
});
// Dragging the titlebar moves the window (native shell performs it).
document.getElementById("stitle")!.addEventListener("pointerdown", (e) => {
  if (e.button !== 0 || e.target instanceof HTMLButtonElement) return;
  e.preventDefault();
  bus.post({ op: "dragWindow" });
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !e.repeat) {
    bus.post({ op: "closeStats" });
    window.close();
  }
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
    win.classList.remove("shaded");
  }
  lastInnerH = h;
});
