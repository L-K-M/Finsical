import { openBus } from "./bus.js";
import { CRT_DEFAULTS, CRT_PRESETS, presetTube, sanitizeCrtConfig }
  from "./crt.js";
import { MACHINES, previewMarkup } from "./machines.js";
import type { CrtConfig, CrtPreset } from "./crt.js";
import { centerText, hostWindow, mountList, mountPopup, pushButton,
         registerSprites, setEnabled, trackHighlight, trackPress }
  from "osmium-ui";
import { ICON_PALETTE, ICON_SPRITES } from "./icons.js";
import { hourLabel, LIGHTING_DEFAULTS, sanitizeLighting }
  from "../core/light.js";
import type { Lighting, LightMode } from "../core/light.js";
import { SOUND_DEFAULTS, sanitizeSoundConfig } from "./audio.js";
import type { SoundConfig } from "./audio.js";

// Preferences window: a Mac OS 8 control panel with five panes: the
// machine case, the CRT tube effect, the monitor's picture controls,
// the tank's lighting and sound. The tank page owns persistence and
// rendering: this page renders the state it pushes back (op:"state"
// carries `crt`, `machine`, `lighting` and `sound` snapshots) and posts
// intents: crtEnabled, crtConfig, machine, lighting, soundConfig.

// A file dropped on this window must not navigate it to the file —
// only the tank page and the Add-ons window accept drops.
window.addEventListener("dragover", (e) => {
  e.preventDefault();
  // Reject file drops with the OS "no drop" cursor instead of a copy cursor.
  if (e.dataTransfer?.types.includes("Files"))
    e.dataTransfer.dropEffect = "none";
});
window.addEventListener("drop", (e) => e.preventDefault());

interface SliderSpec {
  key: keyof CrtConfig;
  label: string;
  /** Captions under the slider's two ends. */
  ends: readonly [string, string];
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
  { key: "scanlines", label: "Scanlines", ends: ["Off", "Deep"],
    blurb: "Dark gaps between the picture's rows — the most " +
      "recognizable CRT trait. The lines stay locked to the game's " +
      "own pixel rows at any window size." },
  { key: "softening", label: "Softening", ends: ["Sharp", "Soft"],
    blurb: "A tube's beam smears color along each scan, never between " +
      "rows — horizontal edges soften while the scanlines stay crisp." },
  { key: "misconvergence", label: "Misconvergence",
    ends: ["Aligned", "Drifting"],
    blurb: "Real tubes never converge perfectly — the red and blue " +
      "beams drift apart toward the screen edges, leaving faint color " +
      "fringes on bright shapes." },
  { key: "bloom", label: "Bloom", ends: ["Off", "Glowing"],
    blurb: "Phosphors bleed light, so bright colors spill a little " +
      "into neighboring pixels." },
  { key: "overdrive", label: "Bright-color boost", ends: ["Off", "Hot"],
    blurb: "Phosphors overdrive on bright input — vivid colors glow " +
      "hotter than a flat panel shows them." },
  { key: "grille", label: "Shadow grille", ends: ["Off", "Visible"],
    blurb: "Fine vertical red/green/blue stripes, like the mask inside " +
      "an aperture-grille tube — much finer than the game's pixels." },
  { key: "curvature", label: "Screen curvature", ends: ["Flat", "Bulging"],
    blurb: "Bows the picture outward, like curved tube glass." },
  { key: "vignette", label: "Vignette", ends: ["Off", "Dark"],
    blurb: "Dims the edges and corners, where real tubes lose " +
      "brightness." },
  { key: "flicker", label: "Flicker", ends: ["Steady", "Shimmer"],
    blurb: "A faint brightness shimmer as the beam sweeps the screen." },
  { key: "grain", label: "Noise", ends: ["Clean", "Grainy"],
    blurb: "Subtle analog grain over the whole image." },
];

// Monitor front-panel controls — adjustments a real tube offered,
// applied after all the tube traits.
const PIC_SPECS: SliderSpec[] = [
  { key: "brightness", label: "Brightness", ends: ["Dim", "Bright"],
    fmt: offset,
    blurb: "The master drive level — how hard the beam pushes the " +
      "phosphors. Pushed too far it washes out the scanlines." },
  { key: "contrast", label: "Contrast", ends: ["Low", "High"], fmt: offset,
    blurb: "Separates bright from dark around the picture's middle. " +
      "Higher contrast deepens the water and heats the highlights." },
  { key: "zoom", label: "Overscan", ends: ["None", "Tight"],
    blurb: "Real sets run the raster a little past the glass — this " +
      "zooms in, cropping the outermost pixels like the bezel did." },
  { key: "hsize", label: "Width", ends: ["Narrow", "Wide"], fmt: offset,
    blurb: "The width pot from the service menu — stretches or " +
      "squeezes the raster sideways inside the glass." },
  { key: "vsize", label: "Height", ends: ["Short", "Tall"], fmt: offset,
    blurb: "The height pot — tubes drifted tall or squat as they " +
      "warmed up, and owners dialed it back by hand." },
  { key: "skew", label: "Skew", ends: ["Leans left", "Leans right"],
    fmt: offset,
    blurb: "The parallelogram pot — the raster's top edge slides " +
      "sideways, leaning the whole picture." },
  { key: "perspective", label: "Perspective",
    ends: ["Faces left", "Faces right"], fmt: offset,
    blurb: "The keystone pot — swings the raster like the tube " +
      "turning on its stand, so one edge looms large while the " +
      "other shrinks back." },
  { key: "red", label: "Red gain", ends: ["Less", "More"], fmt: offset,
    blurb: "Trims the red gun, like a service-menu adjustment. " +
      "Lower it to cool the picture, raise it to warm." },
  { key: "green", label: "Green gain", ends: ["Less", "More"], fmt: offset,
    blurb: "Trims the green gun — the brightest of the three on a " +
      "tube, so small moves go far." },
  { key: "blue", label: "Blue gain", ends: ["Less", "More"], fmt: offset,
    blurb: "Trims the blue gun. Aging tubes drift blue-weak — a " +
      "nudge restores the water's depth." },
];
const ALL_SPECS: SliderSpec[] = [...SPECS, ...PIC_SPECS];
const specOf = (k: keyof CrtConfig): SliderSpec =>
  ALL_SPECS.find((s) => s.key === k)!;

/** Group boxes and the slider rows inside them (three per row). */
interface Group { title: string; rows: (keyof CrtConfig)[][] }
const MONITOR_GROUPS: Group[] = [
  { title: "Beam & Phosphor",
    rows: [["scanlines", "softening", "misconvergence"],
           ["bloom", "overdrive", "grille"]] },
  { title: "Glass & Signal",
    rows: [["curvature", "vignette"], ["flicker", "grain"]] },
];
const PICTURE_GROUPS: Group[] = [
  { title: "Picture", rows: [["brightness", "contrast", "zoom"]] },
  { title: "Geometry", rows: [["hsize", "vsize"],
                             ["skew", "perspective"]] },
  { title: "Color", rows: [["red", "green", "blue"]] },
];

type PaneId = "machine" | "monitor" | "picture" | "lighting" | "sound";
const PANES: { id: PaneId; label: string; icon: string; hint: string;
               /** Hint while the CRT effect is off (its sliders dim). */
               offHint?: string;
               keys: (keyof CrtConfig)[] }[] = [
  { id: "machine", label: "Machine", icon: "icon-machine",
    hint: "Choose the computer the tank runs in.", keys: [] },
  { id: "monitor", label: "Monitor", icon: "icon-monitor",
    hint: "How the picture tube draws the tank. Point at a slider " +
      "to see what it does.",
    offHint: "Turn on Simulate a CRT monitor to adjust the picture tube.",
    keys: SPECS.map((s) => s.key) },
  { id: "picture", label: "Picture", icon: "icon-picture",
    hint: "The monitor's front-panel controls, applied after the " +
      "tube. Point at a slider to see what it does.",
    offHint: "These controls adjust the CRT effect. Turn on Simulate a " +
      "CRT monitor in the Monitor pane to use them.",
    keys: PIC_SPECS.map((s) => s.key) },
  { id: "lighting", label: "Lighting", icon: "icon-lighting",
    hint: "How the tank is lit. Point at a pop-up menu to see what it " +
      "does.", keys: [] },
  { id: "sound", label: "Sound", icon: "icon-sound",
    hint: "How the tank sounds. Point at a control to see what it does.",
    keys: [] },
];
const PANE_KEY = "finsical:prefsPane";

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
// Machine picks latch the same way: pushes already in flight still
// carry the previous case and would snap the list back mid-browse.
let machinePending: string | null = null;
let machineTimer: ReturnType<typeof setTimeout> | undefined;
// Slider drags fire input per step — coalesce to one bus post per
// frame, carrying every trait touched since the last one.
let pendingCfg: Partial<CrtConfig> | null = null;
let postScheduled = false;
// Lighting picks latch like machine picks.
let lighting: Lighting = { ...LIGHTING_DEFAULTS };
let lightPending: Lighting | null = null;
let lightTimer: ReturnType<typeof setTimeout> | undefined;

function el(tag: string, cls = "", text = ""): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

const onBox = document.getElementById("crt-on") as HTMLInputElement;
const warnEl = document.getElementById("crt-warn")!;
const descEl = document.getElementById("pfdesc")!;
const defaultsBtn = document.getElementById("pfdefaults") as HTMLButtonElement;

const bus = openBus((m) => {
  if (m.op !== "state") return;
  const firstState = !greeted;
  greeted = true;
  const crt = (m.crt ?? {}) as CrtSnap;
  if (firstState || !onTouched || crt.available === false ||
      (crt.on === true) === onBox.checked) {
    onTouched = false;
    onBox.checked = crt.on === true;
    syncEnabled();
  }
  // Only warn when the tank explicitly reports the effect can't run —
  // a missing field just means an older page build.
  warnEl.hidden = crt.available !== false;
  if (crt.cfg !== undefined) cfg = sanitizeCrtConfig(crt.cfg);
  if (m.sound !== undefined) takeSound(sanitizeSoundConfig(m.sound));
  const mc = m.machine as { id?: unknown } | undefined;
  if (typeof mc?.id === "string" &&
      (machinePending === null || mc.id === machinePending)) {
    machinePending = null;
    showMachine(mc.id);
  }
  // A missing field means an older tank build: keep what's shown.
  if (m.lighting !== undefined) {
    const l = sanitizeLighting(m.lighting);
    if (lightPending === null || sameLighting(l, lightPending)) {
      lightPending = null;
      lighting = l;
      syncLighting();
    }
  }
  syncControls();
});

registerSprites(ICON_SPRITES, ICON_PALETTE);
hostWindow(document.getElementById("pwin")!, { title: "Preferences" });

// ---- the caption area -------------------------------------------------
// Explains whatever the pointer (or keyboard focus) is on, the way
// Balloon Help would, and falls back to the pane's own hint.
let pane: PaneId = "machine";
/** A Sound pane control the caption area can explain. */
interface SoundItem {
  label: string;
  blurb: string;
  input: HTMLInputElement;
  /** Shown after the label, like a slider's value. */
  value?: () => string;
}
let described: SliderSpec | LightSpec | SoundItem | null = null;
let describedPreset: CrtPreset | null = null;
function describe(spec: SliderSpec | LightSpec | SoundItem | null,
                  preset: CrtPreset | null = null): void {
  described = spec;
  describedPreset = preset;
  descEl.textContent = "";
  if (preset) {
    descEl.append(el("span", "osm-label", preset.label), ` — ${preset.blurb}`);
    return;
  }
  if (pane === "machine") {
    const m = MACHINES.find((x) => x.id === machineSel);
    if (m) {
      descEl.append(el("span", "osm-label", m.name), ` — ${m.blurb}`);
      return;
    }
  }
  if (!spec) {
    const p = PANES.find((x) => x.id === pane)!;
    descEl.textContent = !onBox.checked && p.offHint ? p.offHint : p.hint;
    return;
  }
  const [label, blurb] = "key" in spec
    ? [`${spec.label}: ${(spec.fmt ?? pct)(cfg[spec.key])}`, spec.blurb]
    : "input" in spec
      ? [spec.value ? `${spec.label}: ${spec.value()}` : spec.label,
         spec.blurb]
      : [`${spec.label}: ${spec.value()}`, spec.blurb()];
  descEl.append(el("span", "osm-label", label), ` — ${blurb}`);
}

// ---- pane buttons -------------------------------------------------------
const strip = document.getElementById("pfstrip")!;
const paneTabs = new Map<PaneId, HTMLButtonElement>();
function showPane(id: PaneId, focus = false): void {
  pane = id;
  for (const p of PANES) {
    const tab = paneTabs.get(p.id)!;
    const on = p.id === id;
    tab.classList.toggle("osm-selected", on);
    tab.setAttribute("aria-selected", String(on));
    tab.tabIndex = on ? 0 : -1;
    document.getElementById(`pane-${p.id}`)!.hidden = !on;
  }
  if (focus) paneTabs.get(id)!.focus();
  defaultsBtn.hidden = id === "machine";
  document.getElementById("pffoot")!
    .classList.toggle("pfdefaults", !defaultsBtn.hidden);
  describe(null);
  try { localStorage.setItem(PANE_KEY, id); } catch { /* unavailable */ }
}
for (const p of PANES) {
  const item = el("div", "pfpanebtn");
  const tab = el("button", "osm-bevel") as HTMLButtonElement;
  tab.type = "button";
  tab.id = `tab-${p.id}`;
  tab.setAttribute("role", "tab");
  tab.setAttribute("aria-controls", `pane-${p.id}`);
  tab.style.setProperty("--osm-icon", `var(--osm-sprite-${p.icon})`);
  const cap = el("span", "osm-bevel-caption", p.label);
  cap.id = `tabcap-${p.id}`;
  tab.setAttribute("aria-labelledby", cap.id);
  item.append(tab, cap);
  strip.appendChild(item);
  centerText(cap, true);
  document.getElementById(`pane-${p.id}`)!
    .setAttribute("aria-labelledby", tab.id);
  // Pane buttons select on press, like radio buttons.
  trackPress(tab, () => showPane(p.id));
  paneTabs.set(p.id, tab);
}
// Arrow keys move between the pane buttons (a vertical tab list).
strip.addEventListener("keydown", (e) => {
  if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  e.preventDefault();
  const i = PANES.findIndex((p) => p.id === pane);
  const n = (i + (e.key === "ArrowDown" ? 1 : PANES.length - 1)) % PANES.length;
  showPane(PANES[n]!.id, true);
});

// ---- machine pane ---------------------------------------------------------
// The cases in a list box, the selected one's art in a preview well.
// Selection is optimistic — the tank echoes it back in the next state
// push.
let machineSel = "";
const preview = document.getElementById("pfpreview")!;
const machineList = mountList(document.getElementById("pfmachines")!, {
  rowHeight: 16,
  label: "Machine",
  onSelect(i) {
    const m = MACHINES[i];
    if (!m || m.id === machineSel) return;
    machineSel = m.id;
    paintPreview();
    if (pane === "machine") describe(null);
    machinePending = m.id;
    clearTimeout(machineTimer);
    // One round-trip is plenty; after that the next push resyncs.
    machineTimer = setTimeout(() => { machinePending = null; }, 1500);
    bus.post({ op: "machine", id: m.id });
  },
});
machineList.setRows(MACHINES.map((m) => {
  const row = el("div", "", m.name);
  row.dataset.name = m.name;
  return row;
}));
function paintPreview(): void {
  const m = MACHINES.find((x) => x.id === machineSel);
  preview.textContent = "";
  if (!m) return;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${m.vbW} ${m.vbH}`);
  svg.innerHTML = previewMarkup(m);
  preview.appendChild(svg);
}
function showMachine(id: string): void {
  const i = MACHINES.findIndex((m) => m.id === id);
  if (i < 0 || id === machineSel) return;
  machineSel = id;
  machineList.select(i, false);
  paintPreview();
  if (pane === "machine") describe(null);
}

// ---- picture presets ---------------------------------------------------
// One-click full configs beside the per-slider Defaults: Authentic is
// the tuned defaults, the others are named restore paths (see crt.ts).
const presetHost = document.getElementById("pfpresets")!;
const presetBtns: HTMLButtonElement[] = [];

function applyPreset(p: CrtPreset): void {
  if (!onBox.checked) return;
  const tube = presetTube(p);
  // Drop coalesced slider changes still awaiting their rAF post for
  // the keys the preset overwrites — they carry pre-preset values.
  for (const k of Object.keys(tube) as (keyof CrtConfig)[])
    if (pendingCfg) delete pendingCfg[k];
  cfg = { ...cfg, ...tube };
  bus.post({ op: "crtConfig", cfg: tube });
  syncControls();
}

for (const p of CRT_PRESETS) {
  const btn = el("button", "osm-button pfpreset", p.label) as HTMLButtonElement;
  btn.type = "button";
  pushButton(btn, () => applyPreset(p));
  btn.addEventListener("pointerenter", () => {
    if (pane === "monitor" && !described) describe(null, p);
  });
  btn.addEventListener("pointerleave", () => {
    if (describedPreset === p) describe(null);
  });
  btn.addEventListener("focus", () => {
    // Same precedence as pointerenter: a live slider caption wins so
    // Tab-through doesn't yank it and blur can't reset it to the hint.
    if (pane === "monitor" && !described) describe(null, p);
  });
  btn.addEventListener("blur", () => {
    if (describedPreset === p) describe(null);
  });
  presetHost.appendChild(btn);
  presetBtns.push(btn);
}

// ---- sliders ------------------------------------------------------------
const sliders = new Map<keyof CrtConfig, HTMLInputElement>();

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

/** One Keyboard-style slider: caption above, tick marks under the
 * track, end captions below. */
function slider(spec: SliderSpec): HTMLElement {
  const unit = el("div", "pfslider");
  const id = `sl-${spec.key}`;
  const label = el("label", "osm-caption pflabel", spec.label);
  label.setAttribute("for", id);
  const track = el("div", "osm-slider");
  const input = document.createElement("input");
  input.type = "range";
  input.id = id;
  input.min = "0"; input.max = "100"; input.step = "1";
  track.appendChild(input);
  const ends = el("div", "osm-caption pfends");
  ends.setAttribute("aria-hidden", "true");
  ends.append(el("span", "", spec.ends[0]), el("span", "", spec.ends[1]));
  unit.append(label, track, ends);

  input.addEventListener("input", () => {
    const v = Number(input.value) / 100;
    cfg[spec.key] = v;
    input.setAttribute("aria-valuetext", (spec.fmt ?? pct)(v));
    if (described === spec) describe(spec);
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
  input.addEventListener("focus", () => describe(spec));
  input.addEventListener("blur", () => {
    dragging.delete(spec.key);
    if (described === spec) describe(null);
  });
  unit.addEventListener("pointerenter", () => describe(spec));
  unit.addEventListener("pointerleave", () => {
    // A drag keeps its caption until the pointer is released.
    if (described === spec && !dragging.has(spec.key) &&
        document.activeElement !== input) describe(null);
  });
  sliders.set(spec.key, input);
  return unit;
}

function addGroups(groups: Group[], host: HTMLElement): void {
  for (const g of groups) {
    const box = el("div", "osm-group pfgroup");
    box.appendChild(el("div", "osm-group-title", g.title));
    box.setAttribute("role", "group");
    box.setAttribute("aria-label", g.title);
    for (const row of g.rows) {
      const r = el("div", "pfrow");
      for (const k of row) r.appendChild(slider(specOf(k)));
      box.appendChild(r);
    }
    host.appendChild(box);
  }
}
addGroups(MONITOR_GROUPS, document.getElementById("pftraits")!);
addGroups(PICTURE_GROUPS, document.getElementById("pfpicture")!);
// Pointer release can be routed off the input — clear drags at window
// level so a missed pointerup can't wedge a slider out of echo sync.
const endDrags = () => {
  dragging.clear();
  volDragging = false;
  // Lighting pop-ups have no drag to end.
  if (!described || !("key" in described || "input" in described)) return;
  // WebKit doesn't focus a range input on click, so a release over the
  // slider keeps its caption while the slider is still pointed at.
  const input = "key" in described ? sliders.get(described.key)!
    : described.input;
  if (document.activeElement !== input &&
      !input.closest(".pfslider, .osm-checkbox")!.matches(":hover"))
    describe(null);
};
window.addEventListener("pointerup", endDrags);
window.addEventListener("pointercancel", endDrags);

function syncControls(): void {
  for (const spec of ALL_SPECS) {
    const input = sliders.get(spec.key);
    if (!input || dragging.has(spec.key)) continue;
    input.value = String(Math.round(cfg[spec.key] * 100));
    input.setAttribute("aria-valuetext", (spec.fmt ?? pct)(cfg[spec.key]));
  }
  if (described) describe(described);
}
syncControls();

// ---- the CRT switch ---------------------------------------------------
// The sliders only act through the CRT effect: they dim while it's off,
// the way Mac OS 8 dims controls that depend on an off switch.
function syncEnabled(): void {
  for (const input of sliders.values()) setEnabled(input, onBox.checked);
  for (const btn of presetBtns) btn.disabled = !onBox.checked;
  document.getElementById("pfpanes")!
    .classList.toggle("pfcrtoff", !onBox.checked);
  // A preset caption is only useful while the effect can take it —
  // fall back to the pane hint (which switches to offHint when off).
  if (describedPreset) describe(null);
  else if (!described) describe(null);
}
syncEnabled();
trackHighlight(document.getElementById("pfcrt")!);
onBox.addEventListener("change", () => {
  syncEnabled();
  onTouched = true;
  clearTimeout(onTouchTimer);
  // One round-trip is plenty — if no matching echo lands, let the next
  // state push resync rather than staying optimistic forever.
  onTouchTimer = setTimeout(() => { onTouched = false; }, 1500);
  bus.post({ op: "crtEnabled", on: onBox.checked });
});

// ---- lighting pane -------------------------------------------------------
// The mode in one pop-up, the timer's hours in two more that dim unless
// the timer runs. Picks are optimistic; the tank echoes them back.
interface LightSpec { label: string; value(): string; blurb(): string }
const MODES: { mode: LightMode; name: string; blurb: string }[] = [
  { mode: "demo", name: "Fast day and night",
    blurb: "A whole day and night pass every 13 minutes, with a warm " +
      "dawn and dusk in between." },
  { mode: "timer", name: "Light timer",
    blurb: "The lights follow this Mac's clock, fading on and off at " +
      "the hours you set. Nights stay light enough to watch, with a " +
      "moonbeam that follows the real moon." },
  { mode: "always", name: "Always on", blurb: "Daylight all the time." },
];
const HOURS = Array.from({ length: 24 }, (_, h) => hourLabel(h));
const modeOf = (): (typeof MODES)[number] =>
  MODES.find((x) => x.mode === lighting.mode)!;
const sameLighting = (a: Lighting, b: Lighting): boolean =>
  a.mode === b.mode && a.on === b.on && a.off === b.off &&
  a.lamp === b.lamp;

function setLighting(p: Partial<Lighting>): void {
  lighting = { ...lighting, ...p };
  lightPending = { ...lighting };
  clearTimeout(lightTimer);
  // One round-trip is plenty; after that the next push resyncs.
  lightTimer = setTimeout(() => { lightPending = null; }, 1500);
  syncLighting();
  bus.post({ op: "lighting", lighting });
}

/** Wire a pop-up and its title to a caption, like the sliders. */
function lightControl(id: string, spec: LightSpec,
                      items: string[], label: string,
                      onChange: (i: number) => void) {
  const btn = document.getElementById(`pl-${id}`) as HTMLButtonElement;
  const unit = document.getElementById(`plc-${id}`)!;
  const pop = mountPopup(btn, { items, selected: 0, label, onChange });
  const open = () => btn.getAttribute("aria-expanded") === "true";
  unit.addEventListener("pointerenter", () => describe(spec));
  unit.addEventListener("pointerleave", () => {
    // An open menu keeps its caption while the pointer is on it.
    if (described === spec && !open() && document.activeElement !== btn)
      describe(null);
  });
  btn.addEventListener("focus", () => describe(spec));
  btn.addEventListener("blur", () => {
    // Opening the menu moves focus into it; the caption stays for it.
    if (described === spec && !open() && !unit.matches(":hover"))
      describe(null);
  });
  return { btn, pop, title: unit.querySelector("label")! };
}
const modeCtl = lightControl("mode", {
  label: "Lighting", value: () => modeOf().name, blurb: () => modeOf().blurb,
}, MODES.map((x) => x.name), "Lighting",
  (i) => setLighting({ mode: MODES[i]!.mode }));
const onCtl = lightControl("on", {
  label: "Lights on at", value: () => hourLabel(lighting.on),
  blurb: () => "The timer switches the lights on at this hour, and they " +
    "brighten through a warm dawn over the next half hour.",
}, HOURS, "Lights on at", (h) => setLighting({ on: h }));
const offCtl = lightControl("off", {
  label: "Off at", value: () => hourLabel(lighting.off),
  blurb: () => "The timer switches the lights off at this hour, and they " +
    "dim through a sunset glow into a moonlit night.",
}, HOURS, "Lights off at", (h) => setLighting({ off: h }));

// The lamp checkbox, captioned like the pop-ups.
const lampBox = document.getElementById("pl-lamp") as HTMLInputElement;
const lampUnit = document.getElementById("pflamp")!;
const lampSpec: LightSpec = {
  label: "Lamp", value: () => lighting.lamp ? "On" : "Off",
  blurb: () => "Switch the lamp off for night, whatever the Lighting " +
    "setting says, and on again to hand the tank back to it. The L key " +
    "and Tank > Toggle Lights do the same.",
};
trackHighlight(lampUnit);
lampUnit.addEventListener("pointerenter", () => describe(lampSpec));
lampUnit.addEventListener("pointerleave", () => {
  if (described === lampSpec && document.activeElement !== lampBox)
    describe(null);
});
lampBox.addEventListener("focus", () => describe(lampSpec));
lampBox.addEventListener("blur", () => {
  if (described === lampSpec && !lampUnit.matches(":hover")) describe(null);
});
lampBox.addEventListener("change",
  () => setLighting({ lamp: lampBox.checked }));

function syncLighting(): void {
  // setSelected closes an open menu, so only touch pop-ups that differ.
  const pick = (c: typeof modeCtl, i: number) => {
    if (c.pop.selected !== i) c.pop.setSelected(i);
  };
  pick(modeCtl, MODES.indexOf(modeOf()));
  pick(onCtl, lighting.on);
  pick(offCtl, lighting.off);
  lampBox.checked = lighting.lamp;
  const timer = lighting.mode === "timer";
  for (const c of [onCtl, offCtl]) {
    c.btn.disabled = !timer;
    c.title.classList.toggle("osm-disabled", !timer);
  }
  if (described && !("key" in described)) describe(described);
}
syncLighting();

// ---- the Sound pane ---------------------------------------------------
// Volume with its Mute box, then the tank's own sounds. Changes post
// as partial op:"soundConfig" messages, coalesced to one per frame like
// the CRT sliders.
let sound: SoundConfig = { ...SOUND_DEFAULTS };
// Values set here that the state pushes have yet to echo: pushes
// already in flight still carry the old ones and would flip a checkbox
// back. Like the CRT switch, the latch times out so a dropped post
// can't wedge a control.
let soundTouched: Partial<SoundConfig> = {};
let soundTimer: ReturnType<typeof setTimeout> | undefined;
let volDragging = false;
let pendingSound: Partial<SoundConfig> | null = null;
let soundPostScheduled = false;

const volInput = document.getElementById("snd-volume") as HTMLInputElement;
const volUnit = document.getElementById("pfvol")!;
const muteBox = document.getElementById("snd-mute") as HTMLInputElement;
const bubblesBox = document.getElementById("snd-bubbles") as HTMLInputElement;
const ambientBox = document.getElementById("snd-ambient") as HTMLInputElement;

function postSound(patch: Partial<SoundConfig>): void {
  sound = { ...sound, ...patch };
  soundTouched = { ...soundTouched, ...patch };
  clearTimeout(soundTimer);
  soundTimer = setTimeout(() => { soundTouched = {}; }, 1500);
  pendingSound = { ...pendingSound, ...patch };
  syncSound();
  if (soundPostScheduled) return;
  soundPostScheduled = true;
  requestAnimationFrame(() => {
    soundPostScheduled = false;
    const p = pendingSound;
    pendingSound = null;
    if (p) bus.post({ op: "soundConfig", cfg: p });
  });
}

/** Adopt a state push's settings, except values still awaiting their
 * echo and the volume while it's being dragged. */
function takeSound(s: SoundConfig): void {
  for (const k of Object.keys(s) as (keyof SoundConfig)[]) {
    if (k in soundTouched) {
      if (soundTouched[k] !== s[k]) continue;
      delete soundTouched[k];
    }
    if (k === "volume" && volDragging) continue;
    sound = { ...sound, [k]: s[k] };
  }
  syncSound();
}

function syncSound(): void {
  if (!volDragging) volInput.value = String(Math.round(sound.volume * 100));
  volInput.setAttribute("aria-valuetext",
                        sound.muted ? "Muted" : pct(sound.volume));
  muteBox.checked = sound.muted;
  bubblesBox.checked = sound.bubbles;
  ambientBox.checked = sound.ambient;
  // Mute keeps the volume, so the slider dims instead of dropping to
  // Off, the way Mac OS 8 dims controls that depend on an off switch.
  setEnabled(volInput, !sound.muted);
  volUnit.classList.toggle("pfoff", sound.muted);
  if (described) describe(described);
}

/** Point the caption area at a control while it's hovered or focused. */
function captioned(item: SoundItem, host: HTMLElement): void {
  item.input.addEventListener("focus", () => describe(item));
  item.input.addEventListener("blur", () => {
    if (item.input === volInput) volDragging = false;
    if (described === item) describe(null);
  });
  host.addEventListener("pointerenter", () => describe(item));
  host.addEventListener("pointerleave", () => {
    // A volume drag keeps its caption until the pointer is released.
    if (described === item && !(item.input === volInput && volDragging) &&
        document.activeElement !== item.input) describe(null);
  });
}

captioned({ label: "Volume", input: volInput,
            value: () => sound.muted ? "Muted" : pct(sound.volume),
            blurb: "How loud the tank plays everything: bubbles, glass " +
              "taps, feeding and the water. All the way left is silent." },
          volUnit);
captioned({ label: "Mute", input: muteBox,
            blurb: "Silences every sound the tank makes. The volume " +
              "stays where it is for when you turn sound back on." },
          document.getElementById("pfmute")!);
captioned({ label: "Bubble sounds", input: bubblesBox,
            blurb: "A soft bloop now and then as a bubble rises. The " +
              "game's own sounds have none, so this plays a short " +
              "bubble sound you add." },
          document.getElementById("pfbubbles")!);
captioned({ label: "Water ambience", input: ambientBox,
            blurb: "The filter's steady bubbling, looped under " +
              "everything else as in the original game." },
          document.getElementById("pfambient")!);

volInput.addEventListener("input", () =>
  postSound({ volume: Number(volInput.value) / 100 }));
volInput.addEventListener("pointerdown", () => { volDragging = true; });
// Value-changing keys latch like a drag, as on the CRT sliders.
volInput.addEventListener("keydown", (e) => {
  if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey &&
      ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
       "Home", "End", "PageUp", "PageDown"].includes(e.key))
    volDragging = true;
});
muteBox.addEventListener("change", () =>
  postSound({ muted: muteBox.checked }));
bubblesBox.addEventListener("change", () =>
  postSound({ bubbles: bubblesBox.checked }));
ambientBox.addEventListener("change", () =>
  postSound({ ambient: ambientBox.checked }));
for (const id of ["pfmute", "pfbubbles", "pfambient"])
  trackHighlight(document.getElementById(id)!);
syncSound();

// Defaults restores the visible pane's settings only. The other panes
// are out of sight and stay as they are.
pushButton(defaultsBtn, () => {
  if (pane === "lighting") {
    setLighting({ ...LIGHTING_DEFAULTS });
    return;
  }
  if (pane === "sound") {
    postSound({ ...SOUND_DEFAULTS });
    return;
  }
  const keys = PANES.find((p) => p.id === pane)!.keys;
  if (!keys.length) return;
  // Drop coalesced slider changes still awaiting their rAF post for
  // these keys — they carry pre-reset values.
  const reset: Partial<CrtConfig> = {};
  for (const k of keys) {
    reset[k] = CRT_DEFAULTS[k];
    cfg[k] = CRT_DEFAULTS[k];
    if (pendingCfg) delete pendingCfg[k];
  }
  bus.post({ op: "crtConfig", cfg: reset });
  syncControls();
});

let initial: PaneId = "machine";
try {
  const saved = localStorage.getItem(PANE_KEY);
  if (PANES.some((p) => p.id === saved)) initial = saved as PaneId;
} catch { /* storage unavailable */ }
showPane(initial);
// The machine list takes the arrow keys as soon as the window opens.
if (initial === "machine") machineList.element.focus({ preventScroll: true });

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
