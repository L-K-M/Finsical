// Hosts a page's Platinum window. Inside the app every client window
// (Tank Stats, Preferences, Tank Overview, Import Add-ons) is a
// borderless native window that the page draws completely, so the
// chrome's gestures go to the shell as bus ops, which it applies to
// the window that sent them:
//
//   winClose            close the window
//   winZoom             toggle between the user and standard frames
//   winShade {on}       fold to the titlebar (windowshade) and back
//   winGrow             track the grow box (bottom-right resize)
//   dragWindow          move the window with the mouse
//
// In a browser tab the same page fills the tab and does what a tab
// can: close a script-opened tab, resize one, fold the window in CSS.
import { inNativeShell } from "./bus.js";
import type { Bus } from "./bus.js";
import { mountWindow } from "./platinum/window.js";
import type { PlatinumWindow } from "./platinum/window.js";

interface Size { w: number; h: number }

export interface HostOptions {
  title: string;
  /** Show the zoom box; `standard` is the browser tab's zoomed size. */
  zoom?: { standard: Size };
  /** Show the grow box; `min` bounds the in-tab resize. */
  grow?: { min: Size };
}

export interface HostedWindow {
  readonly platinum: PlatinumWindow;
  readonly shaded: boolean;
  close(): void;
}

/** A shaded native window is titlebar-only (~23px tall); an expanded
 * one is far taller. A viewport growing across this height means the
 * shell expanded the window (reopening a window closed while shaded),
 * so the page's fold state follows. Tab switches and minimizing leave
 * the height alone and keep the fold. */
const SHADED_MAX_H = 60;

export function hostWindow(el: HTMLElement, bus: Bus,
                           opts: HostOptions): HostedWindow {
  const native = inNativeShell();
  let shaded = false;

  const close = () => {
    bus.post({ op: "winClose" });
    if (!native) window.close(); // no-op unless script-opened
  };

  let tabSize: Size | null = null;
  const zoom = () => {
    if (shaded || !opts.zoom) return;
    if (native) { bus.post({ op: "winZoom" }); return; }
    if (tabSize) {
      window.resizeTo(tabSize.w, tabSize.h);
      tabSize = null;
    } else {
      tabSize = { w: window.outerWidth, h: window.outerHeight };
      window.resizeTo(opts.zoom.standard.w, opts.zoom.standard.h);
    }
  };

  // An in-tab grow leaves an inline height, which would beat the
  // shaded rule: park it while the window is folded.
  let grownH = "";
  const setShade = (on: boolean) => {
    shaded = on;
    if (on) {
      grownH = el.style.height;
      el.style.height = "";
    } else if (grownH) {
      el.style.height = grownH;
      grownH = "";
    }
    platinum.setShaded(on);
    bus.post({ op: "winShade", on });
  };

  const grow = (e: PointerEvent) => {
    e.preventDefault();
    if (native) { bus.post({ op: "winGrow" }); return; }
    // In a tab: resize the drawn window itself, top-left pinned.
    const min = opts.grow!.min;
    const r = el.getBoundingClientRect();
    const x0 = e.clientX, y0 = e.clientY, w0 = r.width, h0 = r.height;
    el.style.left = `${r.left}px`; el.style.top = `${r.top}px`;
    el.style.right = "auto"; el.style.bottom = "auto";
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      el.style.width = `${Math.max(min.w, w0 + ev.clientX - x0)}px`;
      if (!shaded)
        el.style.height = `${Math.max(min.h, h0 + ev.clientY - y0)}px`;
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
  };

  const platinum = mountWindow(el, {
    title: opts.title,
    onClose: close,
    ...(opts.zoom ? { onZoom: zoom } : {}),
    onCollapse: () => setShade(!shaded),
    ...(opts.grow ? { onGrow: grow } : {}),
    onDrag: (e) => {
      e.preventDefault();
      bus.post({ op: "dragWindow" });
    },
  });

  // Escape closes, unless something inside (a menu, a dialog key
  // handler) already took the key.
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !e.repeat && !e.defaultPrevented) close();
  });

  // A reload resets the page's fold state: put the native window back
  // in step (a no-op when it isn't shaded; ignored in a tab).
  bus.post({ op: "winShade", on: false });
  let lastH = window.innerHeight;
  window.addEventListener("resize", () => {
    const h = window.innerHeight;
    if (shaded && lastH <= SHADED_MAX_H && h > SHADED_MAX_H) {
      shaded = false;
      platinum.setShaded(false);
    }
    lastH = h;
  });

  return {
    platinum,
    get shaded() { return shaded; },
    close,
  };
}
