/**
 * Where a piece from an AquaZone tank file (core/data/azn.ts) stands in
 * Finsical's tank. The file places each plant and accessory in its own
 * pixels (640 x 480 for most tanks); its backdrop goes on the glass
 * cover-cropped (fitBackdrop, coverCrop in web/render.ts), so a piece
 * maps across with the same scale and the same left crop and lines up
 * with the backdrop behind it. Vertically every piece stands on
 * Finsical's floor, as all decor does: the file's floor sits in its own
 * gravel strip, below what the 320 x 200 crop keeps.
 *
 * Pure so vitest can pin the geometry without a DOM.
 */

import { coverCrop } from "./render.js";

/** How a file's tank maps onto Finsical's: tank px per file px, and
 * the file x at Finsical's left edge. */
export interface TankFit {
  s: number;
  sx: number;
}

/** A piece's place in Finsical's tank: its centre x and drawn size in
 * whole pixels, at least one each. */
export interface Placement {
  cx: number;
  w: number;
  h: number;
}

/** Pixels kept free above the tallest piece, as decorScale keeps for
 * standalone decor: art that would reach the top shrinks to fit. */
export const LAYOUT_HEADROOM = 8;

/** The cover-crop that puts a `file`-sized backdrop on a `tank`-sized
 * glass, as fitBackdrop draws it. */
export function tankFit(file: { width: number; height: number },
                        tank: { width: number; height: number }): TankFit {
  const r = coverCrop(file.width, file.height, tank.width, tank.height);
  if (!(r.sw > 0)) return { s: 0, sx: 0 };
  return { s: tank.width / r.sw, sx: r.sx };
}

/** Where a piece the file draws at `item` (left x, width, height in
 * file px) goes: its centre through the backdrop's mapping, its size
 * scaled alike, and shrunk evenly when it would be taller than the
 * headroom allows or wider than the tank. Both bounds hold for any
 * file: its sizes are untrusted, and every piece's art is drawn once
 * at this size. No known tank has a piece wider than the tank. */
export function placeItem(item: { x: number; w: number; h: number },
                          fit: TankFit,
                          tank: { width: number; height: number }):
    Placement {
  let w = item.w * fit.s, h = item.h * fit.s;
  const k = Math.min(1, (tank.height - LAYOUT_HEADROOM) / h,
                     tank.width / w);
  if (k < 1) {
    w *= k;
    h *= k;
  }
  return {
    cx: (item.x + item.w / 2 - fit.sx) * fit.s,
    w: Math.max(1, Math.round(w)),
    h: Math.max(1, Math.round(h)),
  };
}
