import { openBus } from "./bus.js";
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
const body = document.getElementById("sbody")!;
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
  while (history.length > 512) history.shift();
  render(st);
});

// ---- window chrome -------------------------------------------------------
// In the native shell these land on the relay (Finsical.swift), which
// closes/shades/drags the real window. Over BroadcastChannel they no-op.
document.getElementById("sclose")!.addEventListener("click", () => {
  bus.post({ op: "closeStats" });
  window.close(); // browser-tab fallback; no-ops where not script-opened
});
let shaded = false;
document.getElementById("sshade")!.addEventListener("click", () => {
  shaded = !shaded;
  win.classList.toggle("shaded", shaded);
  bus.post({ op: "statsShade", on: shaded });
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
// Ungated on `greeted`: if the tank tab opens after the greet retries
// gave up, this heartbeat is the revival path — one cheap message, and
// an unanswered hello costs nothing when no tank is listening.
setInterval(() => {
  if (!document.hidden) bus.post({ op: "hello" });
}, 2000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) bus.post({ op: "hello" });
});
