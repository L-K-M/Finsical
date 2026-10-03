/**
 * The tank's drawn plant area, in px²: Σ width × height over the
 * decor that photosynthesises. Sim converts it to chemistry units. Plants
 * add oxygen and take up CO2 and nitrate in light, and breathe in the
 * dark (docs/ORIGINAL-SIM.md, "Water"); accessories stand among them
 * but are inert. The tank page derives this on every decor change, so
 * a restored or removed plant is reflected in the water at once.
 */

export interface PlantItem {
  plant: boolean;
  /** The in-tank art size, px — the frames are pre-scaled canvases. */
  width: number;
  height: number;
}

export function plantAreaOf(items: readonly PlantItem[]): number {
  let sum = 0;
  for (const it of items)
    if (it.plant) sum += it.width * it.height;
  return sum;
}
