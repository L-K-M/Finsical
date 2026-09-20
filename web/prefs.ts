import { openBus } from "./bus.js";
import { CRT_DEFAULTS, sanitizeCrtConfig } from "./crt.js";
import type { BusMsg } from "./bus.js";
import type { CrtConfig } from "./crt.js";

// Preferences window: CRT effect controls. The tank page owns the
// shader and persistence — this page renders the state it pushes back
// (op:"state" carries a `crt` snapshot) and posts intents: crtEnabled
// toggles the effect, crtConfig carries one changed trait at a time.

const SPECS: { key: keyof CrtConfig; label: string; blurb: string }[] = [
  { key: "scanlines", label: "Scanlines",
    blurb: "Dark gaps between the picture's rows — the most " +
      "recognizable CRT trait. The lines stay locked to the game's " +
      "own pixel rows at any window size." },
  { key: "beam", label: "Horizontal softening",
    blurb: "A tube's beam smears color along each scan, never between " +
      "rows — horizontal edges soften while the scanlines stay crisp." },
  { key: "bloom", label: "Bloom",
    blurb: "Phosphors bleed light, so bright colors spill a little " +
      "into neighboring pixels." },
  { key: "overdrive", label: "Bright-color boost",
    blurb: "Phosphors overdrive on bright input — vivid colors glow " +
      "hotter than a flat panel shows them." },
  { key: "grille", label: "Shadow grille",
    blurb: "Fine vertical red/green/blue stripes, like the mask inside " +
      "an aperture-grille tube — much finer than the game's pixels." },
  { key: "curvature", label: "Screen curvature",
    blurb: "Bows the picture outward, like curved tube glass." },
  { key: "vignette", label: "Vignette",
    blurb: "Dims the edges and corners, where real tubes lose " +
      "brightness." },
  { key: "flicker", label: "Flicker",
    blurb: "A faint brightness shimmer as the beam sweeps the screen." },
  { key: "grain", label: "Noise",
    blurb: "Subtle analog grain over the whole image." },
];

interface CrtSnap { available?: boolean; on?: boolean; cfg?: unknown }
let cfg: CrtConfig = { ...CRT_DEFAULTS };
let greeted = false;
// Sliders being dragged ignore state echoes so a push can't tug the
// knob out from under the pointer.
const dragging = new Set<keyof CrtConfig>();

function el(tag: string, cls = "", text = ""): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

const onBox = document.getElementById("crt-on") as HTMLInputElement;
const warnEl = document.getElementById("crt-warn")!;
const controlsEl = document.getElementById("controls")!;

const sliders = new Map<keyof CrtConfig, HTMLInputElement>();
const values = new Map<keyof CrtConfig, HTMLElement>();

const bus = openBus((m) => {
  if (m.op !== "state") return;
  greeted = true;
  const crt = (m.crt ?? {}) as CrtSnap;
  onBox.checked = crt.on === true;
  // Only warn when the tank explicitly reports the effect can't run —
  // a missing field just means an older page build.
  warnEl.hidden = crt.available !== false;
  if (crt.cfg !== undefined) cfg = sanitizeCrtConfig(crt.cfg);
  syncControls();
});

for (const spec of SPECS) {
  const row = el("div", "pfrow");
  const top = el("div", "pfrowtop");
  top.appendChild(el("span", "pfname", spec.label));
  const val = el("span", "pfval");
  top.appendChild(val);
  row.appendChild(top);
  const input = document.createElement("input");
  input.type = "range";
  input.min = "0"; input.max = "100"; input.step = "1";
  input.setAttribute("aria-label", spec.label);
  input.addEventListener("input", () => {
    const v = Number(input.value) / 100;
    cfg[spec.key] = v;
    val.textContent = `${input.value}%`;
    bus.post({ op: "crtConfig", cfg: { [spec.key]: v } });
  });
  input.addEventListener("pointerdown", () => dragging.add(spec.key));
  input.addEventListener("pointerup", () => dragging.delete(spec.key));
  input.addEventListener("pointercancel", () => dragging.delete(spec.key));
  input.addEventListener("blur", () => dragging.delete(spec.key));
  sliders.set(spec.key, input);
  values.set(spec.key, val);
  row.appendChild(input);
  row.appendChild(el("div", "pfblurb", spec.blurb));
  controlsEl.appendChild(row);
}

function syncControls(): void {
  for (const [k, input] of sliders) {
    if (dragging.has(k)) continue;
    input.value = String(Math.round(cfg[k] * 100));
    values.get(k)!.textContent = `${input.value}%`;
  }
}
syncControls();

onBox.addEventListener("change", () =>
  bus.post({ op: "crtEnabled", on: onBox.checked }));

document.getElementById("pfreset")!.addEventListener("click", () => {
  cfg = { ...CRT_DEFAULTS };
  bus.post({ op: "crtConfig", cfg });
  syncControls();
});

// Escape closes the window — the native shell intercepts this bus post
// (a page can't close a window it didn't open).
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !e.repeat) bus.post({ op: "closePrefs" });
});

// The tank page may still be loading when the window opens — retry the
// hello until a state push arrives.
let tries = 0;
const greet = setInterval(() => {
  if (greeted || ++tries > 60) clearInterval(greet); // give up after 30s
  else bus.post({ op: "hello" });
}, 500);
bus.post({ op: "hello" });
