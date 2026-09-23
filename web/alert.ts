// Mac OS 8 alerts over the tank page. Osmium UI has no alert window,
// so this builds one from its pieces: the modal dialog frame (black
// outline, raised bevel, inset bevel, var(--osm-dialog) face) drawn by
// app.css, a 32 x 32 note or caution icon registered as an Osmium
// sprite, Charcoal 12 text, Osmium push buttons with the default ring,
// an optional Osmium progress bar, and Return/Escape through
// bindDialogKeys. A transparent scrim over the whole page swallows
// presses while the alert is up, the way a modal alert holds the Mac.
import { bindDialogKeys, pushButton, registerSprites } from "osmium-ui";
import { ALERT_ICONS, ALERT_PALETTE } from "./icons.js";

export type AlertIcon = "note" | "caution";

export interface AlertButton {
  title: string;
  /** The default button: drawn with the ring, pressed by Return. */
  default?: true;
  /** Pressed by Escape and Command-period. */
  cancel?: true;
  /** Runs on the press. Omitted, the button closes the alert; given,
   * the action decides (close it, or update it into the next step). */
  action?: (alert: Alert) => void;
}

export interface AlertSpec {
  icon: AlertIcon;
  text: string;
  /** Left to right; Mac OS 8 puts the default button rightmost. */
  buttons: readonly AlertButton[];
  /** 0 to 1 shows a progress bar under the text; omitted, none. */
  progress?: number;
}

export interface Alert {
  /** Replace the icon, text, buttons and progress in place. */
  update(spec: AlertSpec): void;
  close(): void;
  readonly isOpen: boolean;
}

/** Widest alert, as wide as Mac OS 8's standard alerts. */
const MAX_W = 340;
/** Room kept between the alert and the page edges. */
const EDGE = 8;

/** Alert width for a viewport `vw` wide: the standard width, narrowed
 * to fit small windows (the Mac Plus tank window is 330 wide). */
export function alertWidth(vw: number): number {
  return Math.max(0, Math.min(MAX_W, Math.floor(vw) - 2 * EDGE));
}

/** Where an alert w x h goes in a vw x vh viewport: centered across,
 * and a third of the leftover height above it (the Dialog Manager's
 * alert position), on whole pixels so the bitmap text stays crisp. */
export function alertOrigin(vw: number, vh: number, w: number,
                            h: number): { left: number; top: number } {
  return { left: Math.max(0, Math.floor((vw - w) / 2)),
           top: Math.max(EDGE, Math.floor((vh - h) / 3)) };
}

let registered = false;
let openCount = 0;

/** True while any alert is up: the tank ignores taps meanwhile. */
export function alertOpen(): boolean {
  return openCount > 0;
}

function div(cls: string): HTMLDivElement {
  const e = document.createElement("div");
  e.className = cls;
  return e;
}

export function showAlert(spec: AlertSpec): Alert {
  if (!registered) {
    registerSprites(ALERT_ICONS, ALERT_PALETTE);
    registered = true;
  }
  const scrim = div("alertscrim");
  const win = div("alertwin osm-system");
  win.setAttribute("role", "alertdialog");
  win.setAttribute("aria-modal", "true");
  const icon = div("alerticon");
  const text = div("alerttext");
  text.id = `alerttext${Math.random().toString(36).slice(2)}`;
  win.setAttribute("aria-describedby", text.id);
  const bar = div("osm-progress alertprogress");
  const track = div("osm-progress-track");
  track.append(div("osm-progress-fill"));
  bar.append(track);
  const row = div("alertbuttons");
  win.append(icon, text, bar, row);
  scrim.append(win);

  // Nothing under a modal alert may act: presses outside it are
  // swallowed, and none (inside it either) reaches the page's handler
  // that turns a press on the machine case into a window drag.
  scrim.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    if (e.target === scrim) e.preventDefault();
  });
  for (const type of ["click", "contextmenu"] as const)
    scrim.addEventListener(type, (e) => {
      if (e.target !== scrim) return;
      e.preventDefault();
      e.stopPropagation();
    });

  let open = true;
  const place = () => {
    win.style.width = `${alertWidth(window.innerWidth)}px`;
    const o = alertOrigin(window.innerWidth, window.innerHeight,
                          win.offsetWidth, win.offsetHeight);
    win.style.left = `${o.left}px`;
    win.style.top = `${o.top}px`;
  };
  // Text rewraps once the bitmap fonts arrive, and on window resizes.
  const ro = new ResizeObserver(place);

  const alert: Alert = {
    update(s: AlertSpec) {
      icon.style.backgroundImage = `var(--osm-sprite-alert-${s.icon})`;
      text.textContent = s.text;
      bar.hidden = s.progress === undefined;
      bar.style.setProperty("--osm-value", String(s.progress ?? 0));
      row.replaceChildren();
      let ok: HTMLButtonElement | null = null;
      let cancel: HTMLButtonElement | null = null;
      for (const b of s.buttons) {
        const el = document.createElement("button");
        el.className = b.default ? "osm-button osm-default" : "osm-button";
        el.textContent = b.title;
        row.append(el);
        pushButton(el, () => {
          if (!open) return;
          if (b.action) b.action(alert);
          else alert.close();
        });
        if (b.default) ok = el;
        if (b.cancel) cancel = el;
      }
      // One binding per set of buttons: bindDialogKeys has no unbind,
      // but it skips buttons no longer in the page, so replaced sets
      // go quiet.
      bindDialogKeys(ok, cancel, {
        ok: () => ok?.click(),
        cancel: () => cancel?.click(),
        active: () => open,
      });
      if (open) place();
    },
    close() {
      if (!open) return;
      open = false;
      openCount--;
      ro.disconnect();
      window.removeEventListener("resize", place);
      scrim.remove();
    },
    get isOpen() { return open; },
  };

  openCount++;
  document.body.append(scrim);
  alert.update(spec);
  ro.observe(win);
  window.addEventListener("resize", place);
  return alert;
}
