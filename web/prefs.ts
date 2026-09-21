import { openBus } from "./bus.js";
import { CRT_DEFAULTS, sanitizeCrtConfig } from "./crt.js";
import { MACHINES } from "./machines.js";
import type { CrtConfig } from "./crt.js";

// Preferences window: machine case picker + CRT effect controls. The
// tank page owns persistence and rendering — this page renders the
// state it pushes back (op:"state" carries `crt` and `machine`
// snapshots) and posts intents: crtEnabled, crtConfig, machine.

interface SliderSpec {
  key: keyof CrtConfig;
  label: string;
  blurb: string;
  /** Value label — defaults to a plain percentage. Mid-centered
   * controls (brightness, trims) show a signed offset instead. */
  fmt?: (v: number) => string;
}
const pct = (v: number): string => `${Math.round(v * 100)}%`;
const offset = (v: number): string => {
  const d = Math.round((v - 0.5) * 200);
  return d === 0 ? "0" : `${d > 0 ? "+" : ""}${d}`;
};

const SPECS: SliderSpec[] = [
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
  { key: "misconvergence", label: "Misconvergence",
    blurb: "Real tubes never converge perfectly — the red and blue " +
      "beams drift apart toward the screen edges, leaving faint color " +
      "fringes on bright shapes." },
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

// Monitor front-panel controls — adjustments a real tube offered,
// applied after all the tube traits.
const PIC_SPECS: SliderSpec[] = [
  { key: "brightness", label: "Brightness", fmt: offset,
    blurb: "The master drive level — how hard the beam pushes the " +
      "phosphors. Pushed too far it washes out the scanlines." },
  { key: "contrast", label: "Contrast", fmt: offset,
    blurb: "Separates bright from dark around the picture's middle. " +
      "Higher contrast deepens the water and heats the highlights." },
  { key: "zoom", label: "Overscan",
    blurb: "Real sets run the raster a little past the glass — this " +
      "zooms in, cropping the outermost pixels like the bezel did." },
  { key: "red", label: "Red gain", fmt: offset,
    blurb: "Trims the red gun, like a service-menu adjustment. " +
      "Lower it to cool the picture, raise it to warm." },
  { key: "green", label: "Green gain", fmt: offset,
    blurb: "Trims the green gun — the brightest of the three on a " +
      "tube, so small moves go far." },
  { key: "blue", label: "Blue gain", fmt: offset,
    blurb: "Trims the blue gun. Aging tubes drift blue-weak — a " +
      "nudge restores the water's depth." },
];

interface CrtSnap { available?: boolean; on?: boolean; cfg?: unknown }
let cfg: CrtConfig = { ...CRT_DEFAULTS };
let greeted = false;
// Sliders being dragged ignore state echoes so a push can't tug the
// knob out from under the pointer.
const dragging = new Set<keyof CrtConfig>();
// After a manual toggle, stale in-flight echoes of the master switch
// are skipped until the echo reflecting it lands — but a rejection
// (tank reports the effect can't run) must still apply, and the latch
// times out so a dropped post can't wedge the checkbox.
let onTouched = false;
let onTouchTimer: ReturnType<typeof setTimeout> | undefined;
// Slider drags fire input per step — coalesce to one bus post per
// frame, carrying every trait touched since the last one.
let pendingCfg: Partial<CrtConfig> | null = null;
let postScheduled = false;

function el(tag: string, cls = "", text = ""): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

const onBox = document.getElementById("crt-on") as HTMLInputElement;
const warnEl = document.getElementById("crt-warn")!;
const traitsEl = document.getElementById("pftraits")!;
const picEl = document.getElementById("pfpicture")!;
const machineEl = document.getElementById("pfmachine")!;

// Machine picker: one tile per case, mini bezel preview from the same
// SVG markup the tank draws at full size. Selection is optimistic —
// the tank echoes it back in the next state push.
let machineSel = "";
const machineTiles = new Map<string, HTMLElement>();
for (const m of MACHINES) {
  const tile = el("button", "pftile") as HTMLButtonElement;
  tile.type = "button";
  const pv = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  pv.setAttribute("viewBox", `0 0 ${m.vbW} ${m.vbH}`);
  pv.setAttribute("aria-hidden", "true");
  pv.innerHTML = m.svg;
  tile.appendChild(pv);
  const tt = el("span", "pftiletitle", m.name);
  tile.appendChild(tt);
  tile.appendChild(el("span", "pftileblurb", m.blurb));
  tile.addEventListener("click", () => {
    machineSel = m.id;
    syncMachineTiles();
    bus.post({ op: "machine", id: m.id });
  });
  machineTiles.set(m.id, tile);
  machineEl.appendChild(tile);
}
function syncMachineTiles(): void {
  for (const [id, t] of machineTiles)
    t.classList.toggle("on", id === machineSel);
}

const sliders = new Map<keyof CrtConfig, HTMLInputElement>();
const values = new Map<keyof CrtConfig, HTMLElement>();

const bus = openBus((m) => {
  if (m.op !== "state") return;
  const firstState = !greeted;
  greeted = true;
  const crt = (m.crt ?? {}) as CrtSnap;
  if (firstState || !onTouched || crt.available === false ||
      (crt.on === true) === onBox.checked) {
    onTouched = false;
    onBox.checked = crt.on === true;
  }
  // Only warn when the tank explicitly reports the effect can't run —
  // a missing field just means an older page build.
  warnEl.hidden = crt.available !== false;
  if (crt.cfg !== undefined) cfg = sanitizeCrtConfig(crt.cfg);
  const mc = m.machine as { id?: unknown } | undefined;
  if (typeof mc?.id === "string" && machineTiles.has(mc.id)) {
    machineSel = mc.id;
    syncMachineTiles();
  }
  syncControls();
});

function queueConfigPost(key: keyof CrtConfig): void {
  (pendingCfg ??= {})[key] = cfg[key];
  if (postScheduled) return;
  postScheduled = true;
  requestAnimationFrame(() => {
    postScheduled = false;
    const p = pendingCfg;
    pendingCfg = null;
    if (p) bus.post({ op: "crtConfig", cfg: p });
  });
}

function addSliders(specs: SliderSpec[], host: HTMLElement): void {
  for (const spec of specs) {
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
      val.textContent = (spec.fmt ?? pct)(v);
      queueConfigPost(spec.key);
    });
    input.addEventListener("pointerdown", () => dragging.add(spec.key));
    // Arrow/Home/End tweaks latch like drags — otherwise an echo
    // landing mid-adjustment yanks the knob back. Both paths clear on
    // blur. Only value-changing keys latch — a stray keypress mustn't
    // block echo sync until blur.
    input.addEventListener("keydown", (e) => {
      // Modifier-held arrows (⌘← line-nav muscle memory) don't step
      // the value — don't let them latch the guard either.
      if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey &&
          ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
           "Home", "End", "PageUp", "PageDown"].includes(e.key))
        dragging.add(spec.key);
    });
    input.addEventListener("blur", () => dragging.delete(spec.key));
    sliders.set(spec.key, input);
    values.set(spec.key, val);
    row.appendChild(input);
    row.appendChild(el("div", "pfblurb", spec.blurb));
    host.appendChild(row);
  }
}
addSliders(SPECS, traitsEl);
addSliders(PIC_SPECS, picEl);
// Pointer release can be routed off the input — clear drags at window
// level so a missed pointerup can't wedge a slider out of echo sync.
window.addEventListener("pointerup", () => dragging.clear());
window.addEventListener("pointercancel", () => dragging.clear());

function syncControls(): void {
  for (const spec of [...SPECS, ...PIC_SPECS]) {
    const input = sliders.get(spec.key);
    if (!input || dragging.has(spec.key)) continue;
    input.value = String(Math.round(cfg[spec.key] * 100));
    values.get(spec.key)!.textContent = (spec.fmt ?? pct)(cfg[spec.key]);
  }
}
syncControls();

onBox.addEventListener("change", () => {
  onTouched = true;
  clearTimeout(onTouchTimer);
  // One round-trip is plenty — if no matching echo lands, let the next
  // state push resync rather than staying optimistic forever.
  onTouchTimer = setTimeout(() => { onTouched = false; }, 1500);
  bus.post({ op: "crtEnabled", on: onBox.checked });
});

document.getElementById("pfreset")!.addEventListener("click", () => {
  // Drop a coalesced slider change still awaiting its rAF post — it
  // carries pre-reset values that would undo part of the reset.
  pendingCfg = null;
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
// Slow heartbeat after first contact: re-syncs if the tank page
// reloads mid-session. Skipped while hidden — a closed window's
// hellos would just be relayed and filtered anyway.
setInterval(() => {
  if (greeted && !document.hidden) bus.post({ op: "hello" });
}, 10_000);
// Snap to fresh state the moment the window is shown again — the
// relay skips pushes to hidden windows, so a reopened one is stale.
// No `greeted` guard: if the greet loop gave up (tank still loading),
// refocusing retries contact — the relay drops it harmlessly if the
// tank isn't there yet.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) bus.post({ op: "hello" });
});
