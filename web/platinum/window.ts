// A Mac OS 8 document window around an element: titlebar with close /
// zoom / collapse boxes, centered title, pinstripes, optional grow box,
// active/inactive states. Looks come from platinum.css; this module
// builds the chrome, keeps the title centered the way the Window
// Manager does, and tracks box presses like the Control Manager (the
// box highlights while the mouse is down over it; releasing outside
// cancels). What a box *does* is the host's business — see the
// callbacks — because only the native shell can close or move a window.
import { installPlatinum } from "./install.js";

export interface WindowOptions {
  title: string;
  /** Each box is drawn only when its handler is given. */
  onClose?: () => void;
  onZoom?: () => void;
  onCollapse?: () => void;
  /** pointerdown on the grow box; omit for a fixed-size window. */
  onGrow?: (e: PointerEvent) => void;
  /** pointerdown on the titlebar outside the boxes. */
  onDrag?: (e: PointerEvent) => void;
}

export interface PlatinumWindow {
  readonly element: HTMLElement;
  readonly content: HTMLElement;
  setTitle(text: string): void;
  setShaded(on: boolean): void;
}

/** Where the Window Manager starts a title: centered on the whole
 * window, rounding left, whatever boxes sit on either side. */
export function titleLeft(windowWidth: number, titleWidth: number): number {
  return Math.floor((windowWidth - titleWidth) / 2);
}

function part(tag: string, cls: string): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  return e;
}

/** Highlight `box` while a primary-button press is over it; run
 * `action` if the press ends over it. Assistive tech "clicks" (no
 * pointer, detail 0) activate it directly. */
function trackBox(box: HTMLElement, action: () => void): void {
  box.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    box.setPointerCapture(e.pointerId);
    const over = (ev: PointerEvent): boolean => {
      const r = box.getBoundingClientRect();
      return ev.clientX >= r.left && ev.clientX < r.right &&
             ev.clientY >= r.top && ev.clientY < r.bottom;
    };
    const move = (ev: PointerEvent) => {
      if (ev.pointerId === e.pointerId)
        box.classList.toggle("pt-pressed", over(ev));
    };
    const end = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      box.removeEventListener("pointermove", move);
      box.removeEventListener("pointerup", end);
      box.removeEventListener("pointercancel", end);
      box.classList.remove("pt-pressed");
      if (ev.type === "pointerup" && over(ev)) action();
    };
    box.classList.add("pt-pressed");
    box.addEventListener("pointermove", move);
    box.addEventListener("pointerup", end);
    box.addEventListener("pointercancel", end);
  });
  box.addEventListener("click", (e) => { if (e.detail === 0) action(); });
}

/** Turn `el` into a Platinum window. Its `.pt-content` child (created
 * around the existing children if missing) becomes the content area. */
export function mountWindow(el: HTMLElement,
                            opts: WindowOptions): PlatinumWindow {
  el.classList.add("pt-window");
  let content = el.querySelector<HTMLElement>(":scope > .pt-content");
  if (!content) {
    content = part("div", "pt-content");
    content.append(...Array.from(el.childNodes));
    el.append(content);
  }

  const bar = part("div", "pt-titlebar");
  const title = part("span", "pt-title");
  title.textContent = opts.title;
  const chrome: HTMLElement[] = [
    bar, part("div", "pt-stripes pt-stripes-l"), title,
    part("div", "pt-stripes pt-stripes-r"),
  ];
  const boxes: [string, string, (() => void) | undefined][] = [
    ["pt-close", "Close", opts.onClose],
    ["pt-zoom", "Zoom", opts.onZoom],
    ["pt-collapse", "Collapse", opts.onCollapse],
  ];
  for (const [cls, label, action] of boxes) {
    if (!action) continue;
    const box = part("button", `pt-box ${cls}`);
    box.setAttribute("aria-label", label);
    box.tabIndex = -1; // OS 8 boxes take no keyboard focus
    trackBox(box, action);
    chrome.push(box);
  }
  el.classList.toggle("pt-no-zoom", !opts.onZoom);
  el.prepend(...chrome);

  const { onDrag, onGrow } = opts;
  if (onDrag) {
    bar.addEventListener("pointerdown", (e) => {
      if (e.button === 0) onDrag(e);
    });
  }
  if (onGrow) {
    const grow = part("div", "pt-grow");
    grow.setAttribute("role", "separator");
    grow.setAttribute("aria-label", "Resize window");
    grow.addEventListener("pointerdown", (e) => {
      if (e.button === 0) onGrow(e);
    });
    el.append(grow);
  }

  // Title position and the stripes' parting both need the measured
  // string width, which is only right once the bitmap fonts are in.
  const layout = () => {
    const adv = Math.round(title.getBoundingClientRect().width);
    el.style.setProperty("--pt-title-x",
                         `${titleLeft(el.offsetWidth, adv)}px`);
    el.style.setProperty("--pt-title-w", `${adv}px`);
  };
  new ResizeObserver(layout).observe(el);
  installPlatinum()
    .catch((err: unknown) => {
      console.error("Platinum fonts unavailable; using fallbacks", err);
    })
    .finally(layout);

  // Active while the page has focus: the native shell gives every
  // Platinum window its own page, so page focus is window focus.
  const syncFocus = () =>
    el.classList.toggle("pt-inactive", !document.hasFocus());
  window.addEventListener("focus", syncFocus);
  window.addEventListener("blur", syncFocus);
  syncFocus();

  return {
    element: el,
    content,
    setTitle(text) { title.textContent = text; layout(); },
    setShaded(on) { el.classList.toggle("pt-shaded", on); },
  };
}
