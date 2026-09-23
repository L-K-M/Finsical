// Mac OS 8 control behavior for the Platinum kit: press tracking the
// Control Manager way, push-button title layout, the default button's
// Return key, pop-up menus, scroll bars and list boxes. Looks come
// from platinum.css; native elements (<button>, checkbox and range
// inputs) are used wherever one exists so focus, keyboard and
// assistive tech keep working.
import { installPlatinum } from "./install.js";

function part(tag: string, cls: string): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  return e;
}

function inside(el: Element, x: number, y: number): boolean {
  const r = el.getBoundingClientRect();
  return x >= r.left && x < r.right && y >= r.top && y < r.bottom;
}

/** Track a press on `el`: it shows pressed (pt-pressed) while a
 * primary-button press that started on it is over it, and `action`
 * runs if the press ends over it — releasing outside cancels.
 * Keyboard and assistive-tech activation (a click with no pointer
 * behind it) runs `action` directly. */
export function trackPress(el: HTMLElement, action: () => void): void {
  el.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || isDisabled(el)) return;
    e.preventDefault(); // no focus ring or text selection from a click
    e.stopPropagation(); // e.g. a titlebar drag underneath
    el.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      if (ev.pointerId === e.pointerId)
        el.classList.toggle("pt-pressed", inside(el, ev.clientX, ev.clientY));
    };
    const end = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", end);
      el.removeEventListener("pointercancel", end);
      el.classList.remove("pt-pressed");
      if (ev.type === "pointerup" && inside(el, ev.clientX, ev.clientY) &&
          !isDisabled(el))
        action();
    };
    el.classList.add("pt-pressed");
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  });
  el.addEventListener("click", (e) => {
    if (e.detail === 0 && !isDisabled(el)) action();
  });
}

/** Pressed highlight only, for controls whose activation is native
 * (a checkbox's label toggles its input on click). */
export function trackHighlight(el: HTMLElement): void {
  el.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || isDisabled(el)) return;
    const move = (ev: PointerEvent) => {
      if (ev.pointerId === e.pointerId)
        el.classList.toggle("pt-pressed", inside(el, ev.clientX, ev.clientY));
    };
    const end = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      el.classList.remove("pt-pressed");
    };
    el.classList.add("pt-pressed");
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  });
}

function isDisabled(el: Element): boolean {
  return (el as HTMLButtonElement).disabled === true ||
    el.querySelector("input:disabled") !== null;
}

/** Advance width of `text` in `el`'s font. Canvas metrics work for
 * hidden elements too, and the bitmap fonts' advances are whole
 * pixels. */
function textWidth(text: string, el: Element): number {
  const ctx = (measure ??= document.createElement("canvas")).getContext("2d");
  if (!ctx) return 0;
  const cs = getComputedStyle(el);
  ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  return Math.round(ctx.measureText(text).width);
}
let measure: HTMLCanvasElement | undefined;

/** Where a centered title starts: floor((width - title) / 2), or
 * rounding the half pixel up (bevel button titles). */
export function centeredOffset(width: number, title: number,
                               roundUp = false): number {
  return Math.max(0, Math.floor((width - title + (roundUp ? 1 : 0)) / 2));
}

/** Center `el`'s single line of text on a whole pixel (text-align:
 * center would land odd differences on half pixels and blur the
 * bitmap glyphs). QuickDraw callers round the half pixel down, bevel
 * button titles round it up (`roundUp`). Re-centers when the element
 * resizes; call again after changing the text. */
export function centerText(el: HTMLElement, roundUp = false): void {
  const apply = () => {
    const cs = getComputedStyle(el);
    const inner = el.clientWidth - parseFloat(cs.paddingLeft || "0") -
      parseFloat(cs.paddingRight || "0");
    const adv = textWidth(el.textContent ?? "", el);
    el.style.textAlign = "left";
    el.style.textIndent = `${centeredOffset(inner, adv, roundUp)}px`;
  };
  if (!centered.has(el)) {
    centered.add(el);
    new ResizeObserver(apply).observe(el);
    void installPlatinum().catch(() => {}).finally(apply);
  }
  apply();
}
const centered = new WeakSet<HTMLElement>();

// ---- push buttons -----------------------------------------------------

/** Room either side of a title when a button sizes itself. */
const TITLE_PAD = 12;
/** Narrowest push button (the standard OK/Cancel width). */
const MIN_BUTTON = 59;
/** A default button's ring adds this much on each side. */
const RING = 3;
/** How long Return or Escape shows a button pressed: 8 ticks. */
const FLASH_MS = 133;

/** Size a push button and place its title where the Control Manager
 * draws it: floor((width - title) / 2) from the button's left, on a
 * whole pixel. `data-width` fixes the width (ring excluded); otherwise
 * the button fits its title. Call again after changing the title. */
export function fitButton(b: HTMLElement): void {
  const adv = textWidth(b.textContent ?? "", b);
  const ring = b.classList.contains("pt-default") ? RING : 0;
  const w = Number(b.dataset.width) ||
    Math.max(MIN_BUTTON, adv + 2 * TITLE_PAD);
  const border = 4 + ring; // the 9-slice's fixed end
  b.style.width = `${w + 2 * ring}px`;
  b.style.textAlign = "left";
  b.style.paddingLeft = `${ring + centeredOffset(w, adv) - border}px`;
  b.style.paddingRight = "0";
}

/** Enable or disable a checkbox or slider input, dimming its whole
 * control (platinum.css reads .pt-disabled on the wrapper). */
export function setEnabled(input: HTMLInputElement, on: boolean): void {
  input.disabled = !on;
  input.closest(".pt-checkbox, .pt-slider")
    ?.classList.toggle("pt-disabled", !on);
}

/** Wire a push button: press tracking, title layout (now and once the
 * bitmap fonts are in), and `action`. */
export function pushButton(b: HTMLButtonElement, action: () => void): void {
  trackPress(b, action);
  fitButton(b);
  void installPlatinum().catch(() => {}).finally(() => fitButton(b));
}

/** Change a push button's title, keeping its layout exact. */
export function setButtonTitle(b: HTMLElement, text: string): void {
  b.textContent = text;
  fitButton(b);
}

/** Return and Enter press `ok`, Escape (and Command-period) press
 * `cancel`, each flashing the button the way the Dialog Manager does.
 * Keys typed into text fields, menus and focused buttons (which have
 * their own Return handling) are left alone. */
export function bindDialogKeys(ok: HTMLButtonElement | null,
                               cancel: HTMLButtonElement | null,
                               actions: { ok?: () => void;
                                          cancel?: () => void }): void {
  window.addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.repeat) return;
    const t = e.target as HTMLElement | null;
    if (t?.closest("input:not([type=checkbox]):not([type=range]), " +
                   "textarea, [contenteditable], button, .pt-menu"))
      return;
    const isOk = e.key === "Enter";
    const isCancel = e.key === "Escape" || (e.metaKey && e.key === ".");
    const b = isOk ? ok : isCancel ? cancel : null;
    const act = isOk ? actions.ok : actions.cancel;
    // Hidden buttons (display: none anywhere up the tree) have no boxes.
    if (!b || !act || b.disabled || !b.isConnected ||
        b.getClientRects().length === 0) return;
    e.preventDefault();
    b.classList.add("pt-pressed");
    setTimeout(() => {
      b.classList.remove("pt-pressed");
      if (!b.disabled) act();
    }, FLASH_MS);
  });
}

// ---- pop-up menus -----------------------------------------------------

/** Menu item height. */
const ITEM_H = 16;
/** Width of a pop-up's arrow section, which its menu doesn't cover. */
const ARROW_W = 21;
/** Item text inset plus room after it, for sizing the menu. */
const ITEM_PAD = 18 + 12 + 2; // inset, right margin, outline

export interface PopupOptions {
  items: readonly string[];
  selected: number;
  onChange(index: number): void;
  label?: string;
}

export interface Popup {
  readonly selected: number;
  setItems(items: readonly string[], selected: number): void;
  setSelected(index: number): void;
}

let popupSeq = 0;

/** A pop-up menu's top edge: the current item over the button, moved
 * down or up as needed to keep the menu (and its 2px shadow) on
 * screen. */
export function menuTop(buttonTop: number, selected: number, count: number,
                        viewportH: number): number {
  const h = count * ITEM_H + 2;
  const top = buttonTop - Math.max(0, selected) * ITEM_H;
  return Math.min(Math.max(0, top), Math.max(0, viewportH - h - 2));
}

/** A pop-up button: shows the current item; its menu opens over the
 * button with the current item (checked) under the pointer. Menus
 * stay open after a click (Mac OS 8 "sticky" menus) or track a press
 * and choose on release. */
export function mountPopup(btn: HTMLButtonElement,
                           opts: PopupOptions): Popup {
  let items = [...opts.items];
  let selected = opts.selected;
  let menu: HTMLElement | null = null;
  let hi = -1;
  // Where the keyboard goes back to when the menu closes: the button
  // after keyboard use, otherwise whatever had it before (a pop-up
  // used with the mouse never takes the keyboard target).
  let returnFocus: HTMLElement | null = null;
  const id = `pt-popup-${++popupSeq}`;
  btn.setAttribute("aria-haspopup", "listbox");
  btn.setAttribute("aria-expanded", "false");

  const render = () => {
    btn.textContent = items[selected] ?? "";
    // An aria-label replaces a button's content in its name, so it
    // carries the current item too.
    if (opts.label)
      btn.setAttribute("aria-label", `${opts.label} ${items[selected] ?? ""}`);
  };
  render();

  function highlight(i: number): void {
    if (!menu) return;
    hi = i;
    menu.querySelectorAll(".pt-menu-item").forEach((li, k) =>
      li.classList.toggle("pt-highlight", k === i));
    if (i >= 0) menu.setAttribute("aria-activedescendant", `${id}-${i}`);
    else menu.removeAttribute("aria-activedescendant");
  }

  function itemAt(x: number, y: number): number {
    if (!menu || !inside(menu, x, y)) return -1;
    const lis = Array.from(menu.querySelectorAll(".pt-menu-item"));
    return lis.findIndex((li) => inside(li, x, y));
  }

  function open(byKey: boolean): void {
    if (menu || btn.disabled) return;
    const active = document.activeElement;
    returnFocus = byKey ? btn
      : active instanceof HTMLElement && active !== document.body ? active
      : null;
    const r = btn.getBoundingClientRect();
    menu = part("ul", "pt-menu");
    menu.id = `${id}-menu`;
    menu.setAttribute("role", "listbox");
    menu.tabIndex = -1;
    if (opts.label) menu.setAttribute("aria-label", opts.label);
    items.forEach((text, i) => {
      const li = part("li", "pt-menu-item");
      li.id = `${id}-${i}`;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", String(i === selected));
      li.textContent = text;
      menu!.appendChild(li);
    });
    document.body.appendChild(menu);
    // The menu covers the text part of the button (outline to the
    // arrow's separator) and grows to fit its widest item, kept on
    // screen together with its 2px shadow.
    const widest = Math.max(0, ...items.map((t) => textWidth(t, btn)));
    const w = Math.max(Math.round(r.width) - ARROW_W, widest + ITEM_PAD);
    const h = items.length * ITEM_H + 2;
    const top = menuTop(Math.round(r.top), selected, items.length,
                        window.innerHeight);
    const left = Math.max(0, Math.min(Math.round(r.left),
                                      window.innerWidth - w - 2));
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.style.width = `${w}px`;
    menu.style.maxHeight = `${window.innerHeight - top - 2}px`;
    if (h > window.innerHeight - top - 2) {
      // Taller than the screen: scroll so the current item still
      // sits over the button.
      menu.style.overflowY = "auto";
      menu.scrollTop = Math.max(0, Math.max(0, selected) * ITEM_H -
                                   (Math.round(r.top) - top));
    }
    btn.classList.add("pt-pressed");
    btn.setAttribute("aria-expanded", "true");
    btn.setAttribute("aria-controls", menu.id);
    highlight(byKey ? selected : -1);
    // The menu takes the keyboard however it opened, so Escape closes
    // the menu rather than reaching the window.
    menu.focus({ preventScroll: true });
    menu.addEventListener("keydown", onMenuKey);
    menu.addEventListener("pointermove", (e) =>
      highlight(itemAt(e.clientX, e.clientY)));
    // A click inside the open menu chooses; the release of the press
    // that opened it is the button's to handle. Presses stay with the
    // menu (the page underneath must not start a drag).
    let pressed = false;
    menu.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      if (e.button === 0) { pressed = true; e.preventDefault(); }
    });
    menu.addEventListener("pointerup", (e) => {
      const i = itemAt(e.clientX, e.clientY);
      if (pressed && i >= 0) choose(i);
      pressed = false;
    });
    document.addEventListener("pointerdown", onOutside, true);
    window.addEventListener("blur", close);
  }

  function close(): void {
    if (!menu) return;
    const hadFocus = menu.contains(document.activeElement);
    menu.remove();
    menu = null;
    hi = -1;
    btn.classList.remove("pt-pressed");
    btn.setAttribute("aria-expanded", "false");
    btn.removeAttribute("aria-controls");
    document.removeEventListener("pointerdown", onOutside, true);
    window.removeEventListener("blur", close);
    if (hadFocus) {
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
      else (document.activeElement as HTMLElement | null)?.blur();
    }
    returnFocus = null;
  }

  function choose(i: number): void {
    const m = menu;
    if (!m) return;
    // One blink of the chosen item, then the menu goes away.
    m.querySelectorAll(".pt-menu-item").forEach((li) =>
      li.classList.remove("pt-highlight"));
    setTimeout(() => highlight(i), 50);
    setTimeout(() => {
      if (menu !== m) return;
      close();
      if (i !== selected) {
        selected = i;
        render();
        opts.onChange(i);
      }
    }, 100);
  }

  // A press outside dismisses the menu and does nothing else: its
  // click is swallowed too, or a label or checkbox under it would act.
  function onOutside(e: PointerEvent): void {
    if (menu && !menu.contains(e.target as Node) && e.target !== btn &&
        !btn.contains(e.target as Node)) {
      e.stopPropagation();
      e.preventDefault();
      close();
      const eat = (ev: Event) => {
        // detail 0: a keyboard-activated click, not this press's.
        if ((ev as MouseEvent).detail === 0) { done(); return; }
        ev.stopPropagation();
        ev.preventDefault();
        done();
      };
      const done = () => {
        document.removeEventListener("click", eat, true);
        document.removeEventListener("pointerdown", done, true);
      };
      document.addEventListener("click", eat, true);
      // A press that never becomes a click mustn't eat the next one.
      setTimeout(() => document.addEventListener("pointerdown", done, true));
    }
  }

  function onMenuKey(e: KeyboardEvent): void {
    const n = items.length;
    if (e.key === "ArrowDown") highlight(Math.min(n - 1, hi + 1));
    else if (e.key === "ArrowUp") highlight(Math.max(0, hi < 0 ? 0 : hi - 1));
    else if (e.key === "Home") highlight(0);
    else if (e.key === "End") highlight(n - 1);
    else if (e.key === "Enter" || e.key === " ") {
      if (hi >= 0 && !e.repeat) choose(hi);
    } else if (e.key === "Escape" || e.key === "Tab") close();
    else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
      const k = e.key.toLowerCase();
      const from = hi + 1;
      for (let d = 0; d < n; d++) {
        const i = (from + d) % n;
        if (items[i]!.toLowerCase().startsWith(k)) { highlight(i); break; }
      }
    } else return;
    e.preventDefault();
    e.stopPropagation();
  }

  btn.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || btn.disabled) return;
    e.preventDefault();
    if (menu) { close(); return; }
    open(false);
    const x0 = e.clientX, y0 = e.clientY;
    // Press-drag-release chooses; a plain click leaves the menu open.
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      window.removeEventListener("pointerup", up, true);
      window.removeEventListener("pointercancel", up, true);
      window.removeEventListener("pointermove", move, true);
      if (ev.type === "pointercancel") return;
      const i = itemAt(ev.clientX, ev.clientY);
      const moved = Math.abs(ev.clientX - x0) + Math.abs(ev.clientY - y0) > 3;
      if (i >= 0 && moved) choose(i);
      else if (moved && !inside(btn, ev.clientX, ev.clientY) &&
               !(menu && inside(menu, ev.clientX, ev.clientY))) close();
    };
    const move = (ev: PointerEvent) => {
      if (ev.pointerId === e.pointerId)
        highlight(itemAt(ev.clientX, ev.clientY));
    };
    window.addEventListener("pointerup", up, true);
    window.addEventListener("pointercancel", up, true);
    window.addEventListener("pointermove", move, true);
  });
  btn.addEventListener("keydown", (e) => {
    if (["ArrowDown", "ArrowUp", " ", "Enter"].includes(e.key)) {
      e.preventDefault();
      if (!e.repeat) open(true);
    }
  });
  btn.addEventListener("click", (e) => {
    if (e.detail === 0 && !menu) open(true); // assistive tech
  });

  return {
    get selected() { return selected; },
    setItems(next, sel) {
      close();
      items = [...next];
      selected = sel;
      render();
    },
    setSelected(i) {
      close();
      selected = i;
      render();
    },
  };
}

// ---- scroll bars ------------------------------------------------------

/** Arrow height, separator included (the thumb overlaps the separator
 * at either end of its travel). */
const ARROW_H = 16;
/** Thumb bitmap height, both black lines included. */
const THUMB_H = 17;
/** Delay before a held arrow or track press starts repeating, and the
 * repeat period. */
const REPEAT_DELAY_MS = 250;
const REPEAT_MS = 50;

export interface Scrollbar {
  /** Re-read the view's extent (call after content changes size). */
  update(): void;
}

/** Thumb top (its black top line) for a scroll fraction, in a bar of
 * height `h`: from the up arrow's separator to the down arrow's. */
export function thumbTop(h: number, frac: number): number {
  const travel = h - 2 * ARROW_H - THUMB_H + 2;
  return ARROW_H - 1 + Math.round(Math.min(1, Math.max(0, frac)) * travel);
}

/** Give `view` (a scrolling child of `host`) a Platinum scroll bar on
 * the right edge of `host`, overlapping its 1px edge. `line` is the
 * arrow step. The view keeps native wheel and keyboard scrolling. */
export function attachScrollbar(host: HTMLElement, view: HTMLElement,
                                line: number): Scrollbar {
  const bar = part("div", "pt-scrollbar");
  bar.setAttribute("aria-hidden", "true"); // the view scrolls natively
  const up = part("div", "pt-sb-up");
  const down = part("div", "pt-sb-down");
  const thumb = part("div", "pt-sb-thumb");
  bar.append(thumb, up, down);
  host.appendChild(bar);
  host.classList.add("pt-has-scrollbar");

  const max = () => view.scrollHeight - view.clientHeight;
  const barH = () => bar.offsetHeight;
  let dragging = false;

  function update(): void {
    const m = max();
    const h = barH();
    bar.classList.toggle("pt-sb-off", m <= 0);
    thumb.style.display = h < 2 * ARROW_H + THUMB_H ? "none" : "";
    if (!dragging && m > 0)
      thumb.style.top = `${thumbTop(h, view.scrollTop / m)}px`;
  }

  /** Run `step` now and then repeatedly while the press lasts and
   * `still()` holds for the pointer's current position. */
  function repeat(el: HTMLElement, e: PointerEvent,
                  step: (x: number, y: number) => void,
                  still: (x: number, y: number) => boolean): void {
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    let x = e.clientX, y = e.clientY;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      if (still(x, y)) step(x, y);
      timer = setTimeout(tick, REPEAT_MS);
    };
    const move = (ev: PointerEvent) => { x = ev.clientX; y = ev.clientY; };
    const end = () => {
      clearTimeout(timer);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", end);
      el.removeEventListener("pointercancel", end);
      el.classList.remove("pt-pressed");
    };
    step(x, y);
    timer = setTimeout(tick, REPEAT_DELAY_MS);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  }

  for (const [arrow, dir] of [[up, -1], [down, 1]] as const) {
    arrow.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || max() <= 0) return;
      arrow.classList.add("pt-pressed");
      repeat(arrow, e, () => { view.scrollTop += dir * line; },
             (x, y) => {
               const over = inside(arrow, x, y);
               arrow.classList.toggle("pt-pressed", over);
               return over;
             });
    });
  }

  // Track: page toward the pointer until the thumb reaches it.
  bar.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.target !== bar || max() <= 0) return;
    const page = Math.max(line, view.clientHeight - line);
    const top = bar.getBoundingClientRect().top;
    repeat(bar, e, (_x, y) => {
      const t = thumb.offsetTop;
      const py = y - top;
      if (py < t) view.scrollTop -= page;
      else if (py > t + THUMB_H) view.scrollTop += page;
    }, (_x, y) => {
      const t = thumb.offsetTop, py = y - top;
      return py < t || py > t + THUMB_H;
    });
  });

  // Thumb: drag, scrolling live.
  thumb.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    thumb.setPointerCapture(e.pointerId);
    dragging = true;
    thumb.classList.add("pt-pressed");
    const grab = e.clientY - thumb.offsetTop;
    const move = (ev: PointerEvent) => {
      const h = barH();
      const t0 = ARROW_H - 1;
      const t1 = thumbTop(h, 1);
      const t = Math.min(t1, Math.max(t0, Math.round(ev.clientY - grab)));
      thumb.style.top = `${t}px`;
      view.scrollTop = t1 > t0 ? (t - t0) / (t1 - t0) * max() : 0;
    };
    const end = () => {
      dragging = false;
      thumb.classList.remove("pt-pressed");
      thumb.removeEventListener("pointermove", move);
      thumb.removeEventListener("pointerup", end);
      thumb.removeEventListener("pointercancel", end);
      update();
    };
    thumb.addEventListener("pointermove", move);
    thumb.addEventListener("pointerup", end);
    thumb.addEventListener("pointercancel", end);
  });

  // Wheel and trackpad scrolling over the bar scroll the view, as a
  // native scroll bar would.
  bar.addEventListener("wheel", (e) => {
    view.scrollTop += e.deltaY * (e.deltaMode === 1 ? line
      : e.deltaMode === 2 ? view.clientHeight : 1);
    e.preventDefault();
  }, { passive: false });
  view.addEventListener("scroll", update, { passive: true });
  const ro = new ResizeObserver(update);
  ro.observe(view);
  ro.observe(host);
  update();
  return { update };
}

// ---- list boxes -------------------------------------------------------

export interface ListOptions {
  /** Row pitch in pixels (the arrow step). */
  rowHeight: number;
  label: string;
  onSelect?(index: number): void;
  /** Double-click on a row. */
  onOpen?(index: number): void;
}

/** Where a list's scroll position lands when its rows are replaced. */
export type ListScroll =
  /** Back to the first row (new contents), then to the kept selection. */
  | "top"
  /** Where it was (a refresh of the same rows mustn't jump under the
   * reader, even to show the kept selection). */
  | "keep";

export interface SetRowsOptions {
  /** Row to select afterwards, without reporting it; -1 clears. */
  keep?: number;
  scroll?: ListScroll;
}

export interface PlatinumList {
  readonly element: HTMLElement;
  readonly selected: number;
  readonly rows: readonly HTMLElement[];
  /** Replace the rows; the selection moves to `keep` (or clears). */
  setRows(rows: HTMLElement[], opts?: SetRowsOptions): void;
  select(index: number, notify?: boolean): void;
  /** Placeholder line shown centered when there are no rows. */
  setEmpty(text: string): void;
}

let listSeq = 0;
/** Movement that turns a touch press into a scroll, not a selection. */
const TOUCH_SLOP = 6;

/** A single-selection list box in `host` (styled .pt-list): rows are
 * options; with a mouse the selection follows the pointer while it's
 * down (List Manager behavior) and is reported on release; a touch
 * selects on a tap and leaves swipes to scrolling. Arrow keys,
 * Home/End, Page keys and typing a name's first letters move it. */
export function mountList(host: HTMLElement, opts: ListOptions): PlatinumList {
  const id = `pt-list-${++listSeq}`;
  host.classList.add("pt-list");
  host.setAttribute("role", "listbox");
  host.setAttribute("aria-label", opts.label);
  host.tabIndex = 0;
  const view = part("div", "pt-list-view");
  // The listbox is the keyboard target; its scroller must not become a
  // second tab stop (Chromium and Firefox focus bare scrollers), and a
  // click that focuses it hands focus straight back.
  view.tabIndex = -1;
  view.addEventListener("focus", () => host.focus({ preventScroll: true }));
  host.appendChild(view);
  const sb = attachScrollbar(host, view, opts.rowHeight);
  const empty = part("div", "pt-list-empty");
  let rows: HTMLElement[] = [];
  let sel = -1;
  let typed = "";
  let typedAt = 0;

  function reveal(i: number): void {
    const r = rows[i];
    if (!r) return;
    if (r.offsetTop < view.scrollTop) view.scrollTop = r.offsetTop;
    else if (r.offsetTop + r.offsetHeight > view.scrollTop + view.clientHeight)
      view.scrollTop = r.offsetTop + r.offsetHeight - view.clientHeight;
  }

  function select(i: number, notify = true, show = true): void {
    const next = rows[i] ? i : -1;
    if (next === sel) return;
    rows[sel]?.classList.remove("pt-selected");
    rows[sel]?.setAttribute("aria-selected", "false");
    sel = next;
    const r = rows[sel];
    if (r) {
      r.classList.add("pt-selected");
      r.setAttribute("aria-selected", "true");
      host.setAttribute("aria-activedescendant", r.id);
      if (show) reveal(sel);
    } else host.removeAttribute("aria-activedescendant");
    if (notify) opts.onSelect?.(sel);
  }

  const rowAt = (y: number): number => {
    const r = view.getBoundingClientRect();
    return Math.floor((y - r.top + view.scrollTop) / opts.rowHeight);
  };

  view.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    if (e.pointerType !== "mouse") {
      // Touch and pen: a tap selects; anything that moves is a scroll
      // (the browser's pan cancels the pointer).
      const x0 = e.clientX, y0 = e.clientY;
      view.setPointerCapture(e.pointerId);
      const up = (ev: PointerEvent) => {
        if (ev.pointerId !== e.pointerId) return;
        view.removeEventListener("pointerup", up);
        view.removeEventListener("pointercancel", up);
        if (ev.type === "pointercancel" ||
            Math.abs(ev.clientX - x0) + Math.abs(ev.clientY - y0) > TOUCH_SLOP)
          return;
        const i = rowAt(ev.clientY);
        if (i >= rows.length) return;
        host.focus({ preventScroll: true }); // keys follow (hybrid devices)
        select(i);
      };
      view.addEventListener("pointerup", up);
      view.addEventListener("pointercancel", up);
      return;
    }
    host.focus({ preventScroll: true });
    const before = sel;
    const i = rowAt(e.clientY);
    if (i < rows.length) select(i, false);
    view.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const k = Math.min(rows.length - 1, Math.max(0, rowAt(ev.clientY)));
      if (rows.length && k !== sel) select(k, false);
    };
    // One report per press, however many rows the drag crossed.
    const end = () => {
      view.removeEventListener("pointermove", move);
      view.removeEventListener("pointerup", end);
      view.removeEventListener("pointercancel", end);
      if (sel !== before) opts.onSelect?.(sel);
    };
    view.addEventListener("pointermove", move);
    view.addEventListener("pointerup", end);
    view.addEventListener("pointercancel", end);
  });
  view.addEventListener("dblclick", (e) => {
    const i = rowAt(e.clientY);
    if (i === sel && rows[i]) opts.onOpen?.(i);
  });

  host.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || !rows.length) return;
    const page = Math.max(1, Math.floor(view.clientHeight / opts.rowHeight) - 1);
    const last = rows.length - 1;
    let i: number | null = null;
    if (e.key === "ArrowDown") i = sel < 0 ? 0 : Math.min(last, sel + 1);
    else if (e.key === "ArrowUp") i = sel < 0 ? last : Math.max(0, sel - 1);
    else if (e.key === "Home") i = 0;
    else if (e.key === "End") i = last;
    else if (e.key === "PageDown") i = Math.min(last, Math.max(0, sel) + page);
    else if (e.key === "PageUp") i = Math.max(0, sel - page);
    else if (e.key.length === 1 && e.key !== " ") {
      const now = Date.now();
      typed = (now - typedAt < 1000 ? typed : "") + e.key.toLowerCase();
      typedAt = now;
      const k = rows.findIndex((r) =>
        (r.dataset.name ?? r.textContent ?? "").toLowerCase()
          .startsWith(typed));
      if (k >= 0) i = k;
    }
    if (i === null) return;
    e.preventDefault();
    select(i);
  });

  return {
    element: host,
    get selected() { return sel; },
    get rows() { return rows; },
    setRows(next, { keep = -1, scroll = "top" } = {}) {
      const top = view.scrollTop;
      view.textContent = "";
      rows = next;
      sel = -1;
      host.removeAttribute("aria-activedescendant");
      rows.forEach((r, i) => {
        r.classList.add("pt-row");
        r.id = `${id}-${i}`;
        r.setAttribute("role", "option");
        r.setAttribute("aria-selected", "false");
        r.style.height = `${opts.rowHeight}px`;
        view.appendChild(r);
      });
      if (!rows.length && empty.textContent) view.appendChild(empty);
      view.scrollTop = scroll === "keep" ? top : 0;
      select(keep, false, scroll === "top");
      sb.update();
    },
    select: (i, notify) => select(i, notify),
    setEmpty(text) {
      empty.textContent = text;
      if (!rows.length) {
        view.textContent = "";
        if (text) view.appendChild(empty);
      }
      if (text) centerText(empty);
    },
  };
}
