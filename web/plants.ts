/**
 * The tank's plant mass in the unit `Aquarium.plantSize` expects:
 * Σ width × height ÷ 1000 over the decor that photosynthesises. Plants
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

export function plantSizeOf(items: readonly PlantItem[]): number {
  let sum = 0;
  for (const it of items)
    if (it.plant) sum += it.width * it.height / 1000;
  return sum;
}
