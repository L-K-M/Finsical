/**
 * Name tags on every fish at once: AquaZone's Options > Names ("attach
 * name tags to your fish"), so a tank of look-alikes reads at a glance
 * and touch screens, which never hover, can tell one fish from another.
 * Placement is pure, so vitest pins it; the DOM layer only writes what
 * placement returns.
 */
import type { TankMap } from "./feedzone.js";

/** Gap between a tag and the fish it names, px. */
const TAG_GAP = 2;

export interface TagSpot { left: number; top: number }

/**
 * Where a tag of `w` x `h` px goes for a fish centred at tank x
 * `fx` whose drawn body spans tank rows `top`..`bottom`: centred above
 * the body, or under it when above would reach past the waterline
 * (tank row `surface`) into the air strip. Clamped inside the
 * `bounds` box, host px.
 */
export function tagPlacement(fx: number, top: number, bottom: number,
                             map: TankMap, w: number, h: number,
                             bounds: { w: number; h: number },
                             surface: number): TagSpot {
  const cx = map.ox + fx * map.s;
  let y = map.oy + top * map.s - TAG_GAP - h;
  if (y < map.oy + surface * map.s)
    y = map.oy + bottom * map.s + TAG_GAP;
  return {
    left: Math.round(Math.max(0, Math.min(cx - w / 2, bounds.w - w))),
    top: Math.round(Math.max(0, Math.min(y, bounds.h - h))),
  };
}

/** One fish to tag: its id (the tag's identity from frame to frame),
 * label, centre x and the tank rows its drawn body spans. */
export interface TagFish {
  id: number; label: string; x: number; top: number; bottom: number;
}

export interface NameTags {
  /** Show exactly these tags, placed through `map`, kept inside
   * `bounds`. */
  sync(fish: readonly TagFish[], map: TankMap,
       bounds: { w: number; h: number }, surface: number): void;
  /** Remove every tag. */
  clear(): void;
}

/** A layer of `.nametag` labels inside `host` (positioned). */
export function mountNameTags(host: HTMLElement): NameTags {
  const tags = new Map<number, { el: HTMLElement; w: number; h: number }>();
  const clear = (): void => {
    for (const t of tags.values()) t.el.remove();
    tags.clear();
  };
  return {
    sync(fish, map, bounds, surface) {
      const live = new Set<number>();
      // Text first and every size read after, so the layout runs once
      // per frame rather than once per tag.
      for (const f of fish) {
        live.add(f.id);
        let t = tags.get(f.id);
        if (!t) {
          const el = document.createElement("div");
          el.className = "nametag";
          host.appendChild(el);
          t = { el, w: 0, h: 0 };
          tags.set(f.id, t);
        }
        if (t.el.textContent !== f.label) {
          t.el.textContent = f.label;
          t.w = 0; // measure again
        }
      }
      for (const [id, t] of tags)
        if (!live.has(id)) { t.el.remove(); tags.delete(id); }
      for (const t of tags.values())
        if (!t.w) { t.w = t.el.offsetWidth; t.h = t.el.offsetHeight; }
      for (const f of fish) {
        const t = tags.get(f.id)!;
        const p = tagPlacement(f.x, f.top, f.bottom, map, t.w, t.h,
                               bounds, surface);
        t.el.style.left = `${p.left}px`;
        t.el.style.top = `${p.top}px`;
      }
    },
    clear,
  };
}
