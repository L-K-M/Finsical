// The browser shell's Mac OS 8 menu bar. The native app has real menus
// (macos/Finsical.swift); a plain browser tab has none — this bar is how
// browser and touch users reach About, the client windows, feeding, a
// snapshot and the CRT toggle. mountAppMenuBar is a no-op inside the
// native shell, where the transparent page can't even show the bar.
import { MENU_SEPARATOR, mountMenuBar, mountWindow, pushButton,
         registerSprites } from "osmium-ui";
import { inNativeShell } from "./bus.js";
import { ICON_PALETTE, ICON_SPRITES } from "./icons.js";
import { DEFAULT_ITEM } from "./import.js";

const ITEM_URL = `https://archive.org/details/${DEFAULT_ITEM}`;
const DONATE_URL = "https://archive.org/donate";

/** The bar's height — overlay windows stay clear of it when dragged. */
const BAR_H = 20;

// A 16 x 16 apple for the Apple menu, drawn for Finsical (not copied):
// stem, leaf, and the bite on the right.
const APPLE = [
  "................",
  ".........00.....",
  "........0000....",
  ".......000......",
  ".......0........",
  "....0000000.....",
  "...000000000....",
  "..0000000000....",
  "..00000000.0....",
  "..0000000..0....",
  "..00000000.0....",
  "..0000000000....",
  "...0000..000....",
  "...000...00.....",
  "................",
  "................",
];

export interface MenuBarHooks {
  feedFish(): void;
  openImport(): void;
  /** Open (or focus) a client page — prefs.html, overview.html, stats.html. */
  openClient(page: string, name: string): void;
  toggleCrt(): void;
  crtUsable(): boolean;
  crtOn(): boolean;
  /** Download a PNG of the live tank bitmap. */
  snapshot(): void;
}

function el(tag: string, cls: string, text = ""): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  if (text) e.textContent = text;
  return e;
}

// Same overlay-window mechanics as the add-on browser (import.ts):
// a press outside closes, the titlebar drags within the viewport.
function dragOverlay(win: HTMLElement, e: PointerEvent): void {
  e.preventDefault();
  const r = win.getBoundingClientRect();
  const dx = e.clientX - r.left, dy = e.clientY - r.top;
  const move = (ev: PointerEvent) => {
    if (ev.pointerId !== e.pointerId) return;
    const x = Math.round(Math.min(window.innerWidth - 40,
                                  Math.max(40 - r.width, ev.clientX - dx)));
    const y = Math.round(Math.min(window.innerHeight - 20,
                                  Math.max(BAR_H + 1, ev.clientY - dy)));
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

let aboutOv: HTMLElement | null = null;
function showAbout(): void {
  if (!aboutOv) {
    const ov = el("div", "ov");
    const win = el("div", "iwin aboutwin");
    ov.appendChild(win);
    const close = () => { ov.style.display = "none"; };
    // A press outside the window closes it, like the add-on overlay.
    ov.addEventListener("pointerdown", (e) => { if (e.target === ov) close(); });
    const card = mountWindow(win, {
      title: "About Finsical",
      onClose: close,
      onDrag: (e) => dragOverlay(win, e),
    }).content;
    card.classList.add("aboutcard");
    const icon = el("div", "abouticon");
    icon.style.backgroundImage = "var(--osm-sprite-icon-machine)";
    card.append(
      icon,
      el("div", "aboutname", "Finsical"),
      el("div", "aboutline", "A virtual aquarium for your Mac,"),
      el("div", "aboutline", "in the spirit of Aquazone."),
      el("div", "aboutline", "Add-ons stream from the Internet Archive."));
    const ok = el("button", "osm-button osm-default aboutok", "OK") as
      HTMLButtonElement;
    ok.type = "button";
    card.appendChild(ok);
    pushButton(ok, close);
    document.body.appendChild(ov);
    aboutOv = ov;
  }
  // Centered, clear of the menu bar.
  const win = aboutOv.firstElementChild as HTMLElement;
  win.style.left = `${Math.round((window.innerWidth - 280) / 2)}px`;
  win.style.top = `${Math.max(BAR_H + 8,
    Math.round((window.innerHeight - 180) / 2))}px`;
  aboutOv.style.display = "";
}

export function mountAppMenuBar(h: MenuBarHooks): void {
  if (inNativeShell()) return;
  // The Apple menu's glyph plus the About box's machine icon. Calling
  // registerSprites again on pages that already registered these is
  // harmless — the later identical rule just wins.
  registerSprites({ "icon-apple": APPLE });
  registerSprites(ICON_SPRITES, ICON_PALETTE);
  const bar = document.createElement("div");
  bar.id = "menubar";
  document.body.appendChild(bar);
  mountMenuBar(bar, [
    { title: "Finsical", icon: "icon-apple", items: () => [
      { title: "About Finsical…", action: showAbout },
      MENU_SEPARATOR,
      { title: "AquaZone on the Internet Archive",
        action: () => { window.open(ITEM_URL, "_blank", "noopener"); } },
      { title: "Donate to the Internet Archive…",
        action: () => { window.open(DONATE_URL, "_blank", "noopener"); } },
    ] },
    { title: "File", items: () => [
      { title: "Take a Picture", action: h.snapshot },
      MENU_SEPARATOR,
      { title: "Preferences…",
        action: () => h.openClient("prefs.html", "finsical-prefs") },
    ] },
    { title: "Tank", items: () => [
      { title: "Feed Fish", action: h.feedFish },
      MENU_SEPARATOR,
      { title: "Tank Overview",
        action: () => h.openClient("overview.html", "finsical-overview") },
      { title: "Tank Stats",
        action: () => h.openClient("stats.html", "finsical-stats") },
      MENU_SEPARATOR,
      { title: "Import Add-ons…", action: h.openImport },
    ] },
    { title: "View", items: () => [
      { title: `${h.crtOn() ? "✓ " : ""}CRT Effect`,
        ...(h.crtUsable() ? { action: h.toggleCrt } : {}) },
    ] },
  ]);
}
