/**
 * A Mac OS 8 menu bar for the plain-web shell. The native app has a
 * real menu; in a browser the tank page is the whole desktop, so it
 * gets the desktop's menu bar too — with a clock, the way System 8
 * kept one in the corner. This also fixes the browser's dead end:
 * Preferences and Tank Overview were native-menu-only before.
 */
import { MENU_SEPARATOR, mountMenuBar, mountWindow, pushButton,
         registerSprites } from "osmium-ui";
import { ICON_PALETTE, ICON_SPRITES, MENU_GLYPH } from "./icons.js";
import { inNativeShell } from "./bus.js";
import type { Menu } from "osmium-ui";

const DONATE_URL = "https://archive.org/donate";
const AZ_ITEM_URL =
  "https://archive.org/details/aquazonewithguppiesandaddons";
/** The Apple-menu slot shows the app's own glyph — a compact Mac with
 * a tank on screen (icons.ts), not anyone else's logo. */
const APPLE_SPRITE = "menu-glyph";

/** Open (or focus) a client page in a named tab: an already-open
 * window keeps its live state instead of reloading, and a tab grabbed
 * cross-origin is steered home by writing href (a second window.open
 * can be blocked — one open per gesture in Safari). */
export function openClientWindow(page: string): void {
  const target = `finsical-${page}`;
  const url = new URL(`${page}.html`, location.href).href;
  const existing = window.open("", target);
  try {
    if (existing && !existing.closed &&
        existing.location.pathname.endsWith(`/${page}.html`)) {
      existing.focus();
    } else if (existing && !existing.closed) {
      existing.location.assign(url);
      existing.focus();
    } else {
      window.open(url, target);
    }
  } catch {
    if (existing) {
      existing.location.href = url;
      existing.focus();
    } else {
      window.open(url, target);
    }
  }
}

export interface TankMenuActions {
  feed(): void;
  changeWater(): void;
  toggleAutoFeed(): void;
  importAddons(): void;
  takePicture(): void;
  exportTank(): void;
  importTank(): void;
  toggleCrt(): void;
  degauss(): void;
  toggleLamp(): void;
  toggleMute(): void;
  togglePause(): void;
  toggleZen(): void;
  toggleScold(): void;
  toggleBoot(): void;
  /** Live state, read each time a menu opens. Osmium's items have no
   * checkmark, so toggles name the action they would take instead,
   * like System 8's Show Balloons / Hide Balloons. */
  state(): { autoFeed: boolean; crtUsable: boolean; crtOn: boolean;
             lampOn: boolean; muted: boolean; paused: boolean;
             zen: boolean; scoldOn: boolean; bootOn: boolean };
}

/** True while a pull-down menu is open — the tank page's bare-key
 * shortcuts stand down so menu browsing doesn't feed the fish. */
export function menuOpen(): boolean {
  return !!document.querySelector(".osm-menu");
}

// ---- little document windows (About, Shortcuts) ----------------------

/** The open document window, if any — one at a time, like the OS. */
let docWin: HTMLElement | null = null;

/** True while a document window (About, Shortcuts) is open — bare
 * keys stand down behind its overlay, as they do for open menus. */
export function docOpen(): boolean {
  return docWin !== null;
}

/** A centered, closable Osmium window over a click-away layer, in the
 * same visual family as the add-on browser's overlay. */
function showDocWindow(title: string,
                       build: (content: HTMLElement) => void): void {
  if (docWin) return; // already open — leave it where it is
  const ov = document.createElement("div");
  ov.className = "ov";
  const win = document.createElement("div");
  win.className = "iwin dbwin";
  ov.append(win);
  const { content } = mountWindow(win, {
    title,
    onClose: dismiss,
    onDrag: (e) => dragDoc(win, e),
  });
  content.classList.add("dbdoc");
  build(content);
  document.body.append(ov);
  placeDoc(win);

  const onResize = () => placeDoc(win);
  const onBackdrop = (e: Event) => { if (e.target === ov) dismiss(); };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && !e.defaultPrevented) {
      dismiss();
      e.preventDefault();
    }
  };
  window.addEventListener("resize", onResize);
  ov.addEventListener("pointerdown", onBackdrop);
  window.addEventListener("keydown", onKey);

  function dismiss(): void {
    window.removeEventListener("resize", onResize);
    ov.removeEventListener("pointerdown", onBackdrop);
    window.removeEventListener("keydown", onKey);
    ov.remove();
    docWin = null;
  }
  docWin = win;
  content.querySelector<HTMLElement>(".osm-default")?.focus();
}

/** Drag a document window by its title bar, whole pixels, kept on
 * screen (same clamps as the add-on overlay's drag). */
function dragDoc(win: HTMLElement, e: PointerEvent): void {
  e.preventDefault();
  const r = win.getBoundingClientRect();
  const dx = e.clientX - r.left, dy = e.clientY - r.top;
  const move = (ev: PointerEvent) => {
    if (ev.pointerId !== e.pointerId) return;
    const x = Math.round(Math.min(window.innerWidth - 40,
      Math.max(40 - r.width, ev.clientX - dx)));
    const y = Math.round(Math.min(window.innerHeight - 20,
      Math.max(24, ev.clientY - dy)));
    win.style.left = `${x}px`;
    win.style.top = `${y}px`;
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
function placeDoc(win: HTMLElement): void {
  const w = win.offsetWidth, h = win.offsetHeight;
  win.style.left =
    `${Math.max(8, Math.floor((window.innerWidth - w) / 2))}px`;
  win.style.top =
    `${Math.max(28, Math.floor((window.innerHeight - h) / 2))}px`;
}

function aboutContent(c: HTMLElement): void {
  c.classList.add("dbabout");
  // The compact-Mac-with-tank pane icon at 3x (app.css), from the
  // sprite registered with the bar: it uses Osmium's own colors too.
  const big = document.createElement("div");
  big.className = "dbicon";
  big.setAttribute("aria-hidden", "true");

  const title = document.createElement("div");
  title.className = "dbtitle";
  title.textContent = "Finsical";
  const blurb = document.createElement("div");
  blurb.className = "dbblurb";
  blurb.textContent =
    "A little aquarium for modern Macs, in the spirit of the 90s " +
    "classic Aquazone (9003inc). Fish, gravel, plants and sounds " +
    "come from the add-on files you import — none ship with the app.";
  const credit = document.createElement("div");
  credit.className = "dbcredit";
  credit.textContent =
    "Built with help from large language models. Add-ons come from " +
    "the Internet Archive.";

  const foot = document.createElement("div");
  foot.className = "dbfoot";
  const donate = document.createElement("button");
  donate.type = "button";
  donate.className = "osm-button";
  donate.textContent = "Donate…";
  pushButton(donate, () => window.open(DONATE_URL, "_blank", "noopener"));
  const ok = document.createElement("button");
  ok.type = "button";
  ok.className = "osm-button osm-default";
  ok.textContent = "OK";
  pushButton(ok, () => closeDoc());
  foot.append(donate, ok);

  c.append(big, title, blurb, credit, foot);
}

function shortcutsContent(c: HTMLElement): void {
  c.classList.add("dbkeys");
  const rows: readonly (readonly [string, string])[] = [
    ["F", "Feed the fish"],
    ["L", "Switch the lamp off or on"],
    ["M", "Mute or unmute the sound"],
    ["P", "Pause or resume the tank"],
    ["C", "Toggle the CRT effect"],
    ["S", "Open Tank Stats"],
    ["⌘I / Ctrl-I", "Import add-ons"],
    ["Esc", "Close the front window"],
  ];
  for (const [key, what] of rows) {
    const row = document.createElement("div");
    row.className = "dbkeyrow";
    const k = document.createElement("span");
    k.className = "dbkey";
    k.textContent = key;
    const w = document.createElement("span");
    w.textContent = what;
    row.append(k, w);
    c.append(row);
  }
  const ok = document.createElement("button");
  ok.type = "button";
  ok.className = "osm-button osm-default";
  ok.textContent = "OK";
  pushButton(ok, () => closeDoc());
  c.append(ok);
}

function closeDoc(): void {
  (docWin?.querySelector(".osm-close") as HTMLElement | null)?.click();
}

// ---- the bar -----------------------------------------------------------

/** The System 8 clock, right-aligned in the bar ("3:42 PM"). */
function mountClock(bar: HTMLElement): () => void {
  const el = document.createElement("span");
  el.className = "mbclock";
  el.setAttribute("aria-hidden", "true");
  bar.append(el);
  const paint = () => {
    const d = new Date();
    const h12 = d.getHours() % 12 || 12;
    el.textContent = `${h12}:${String(d.getMinutes()).padStart(2, "0")} ` +
      (d.getHours() < 12 ? "AM" : "PM");
  };
  paint();
  // Every second, not every 30: the minute must roll over the moment
  // it happens (the paint is a cheap textContent write).
  const t = setInterval(paint, 1_000);
  // Background tabs throttle the interval to ~1/min — snap the clock
  // back to now the moment the page shows again.
  const vis = () => { if (!document.hidden) paint(); };
  document.addEventListener("visibilitychange", vis);
  return () => {
    clearInterval(t);
    el.remove();
    document.removeEventListener("visibilitychange", vis);
  };
}

/** Mount the menu bar along the top of the browser page. A no-op
 * inside the native shell (the app's own menu takes over). Returns a
 * teardown so tests can unmount. */
export function mountTankMenuBar(a: TankMenuActions): (() => void) | null {
  if (inNativeShell()) return null;
  registerSprites({ ...ICON_SPRITES, [APPLE_SPRITE]: MENU_GLYPH },
                  ICON_PALETTE);
  const bar = document.createElement("div");
  bar.id = "menubar";
  const menus: readonly Menu[] = [
    {
      title: "Finsical", icon: APPLE_SPRITE,
      items: () => [
        { title: "About Finsical…",
          action: () => showDocWindow("About Finsical", aboutContent) },
        MENU_SEPARATOR,
        { title: "Support the Internet Archive…",
          action: () => window.open(DONATE_URL, "_blank", "noopener") },
      ],
    },
    {
      title: "Tank",
      items: () => {
        const s = a.state();
        return [
          { title: "Feed Fish", action: a.feed },
          { title: "Change Water", action: a.changeWater },
          { title: s.autoFeed ? "Turn Auto-Feeder Off"
                             : "Turn Auto-Feeder On",
            action: a.toggleAutoFeed },
          MENU_SEPARATOR,
          { title: s.paused ? "Resume Simulation" : "Pause Simulation",
            action: a.togglePause },
          { title: s.lampOn ? "Turn Lamp Off" : "Turn Lamp On",
            action: a.toggleLamp },
          { title: s.muted ? "Unmute Sound" : "Mute Sound",
            action: a.toggleMute },
          { title: s.scoldOn ? "Turn Tap Sign Off" : "Turn Tap Sign On",
            action: a.toggleScold },
          { title: s.bootOn ? "Turn Startup Screen Off"
                            : "Turn Startup Screen On",
            action: a.toggleBoot },
          // Dimmed (no action) where the page has no usable WebGL.
          { title: s.crtOn ? "Turn CRT Effect Off" : "Turn CRT Effect On",
            ...(s.crtUsable ? { action: a.toggleCrt } : {}) },
          // Dimmed while the tube is off or dead — nothing to degauss.
          { title: "Degauss",
            ...(s.crtOn && s.crtUsable ? { action: a.degauss } : {}) },
          MENU_SEPARATOR,
          { title: s.zen ? "Leave Zen Mode" : "Enter Zen Mode",
            action: a.toggleZen },
          MENU_SEPARATOR,
          { title: "Take a Picture", action: a.takePicture },
          { title: "Export Tank…", action: a.exportTank },
          { title: "Import Tank…", action: a.importTank },
          { title: "Import Add-ons…", action: a.importAddons },
        ];
      },
    },
    {
      title: "Window",
      items: () => [
        { title: "Preferences…", action: () => openClientWindow("prefs") },
        { title: "Tank Overview…",
          action: () => openClientWindow("overview") },
        { title: "Tank Stats…", action: () => openClientWindow("stats") },
      ],
    },
    {
      title: "Help",
      items: () => [
        { title: "Shortcuts…",
          action: () => showDocWindow("Shortcuts", shortcutsContent) },
        { title: "Aquazone, the original…",
          action: () => window.open(AZ_ITEM_URL, "_blank", "noopener") },
      ],
    },
  ];
  mountMenuBar(bar, menus);
  const stopClock = mountClock(bar);
  document.body.append(bar);
  return () => { closeDoc(); stopClock(); bar.remove(); };
}
