import { describe, expect, it } from "vitest";
import { PAW_ART, PAW_DESCEND, PAW_H, PAW_RETREAT, PAW_SWAT_LEN,
         PAW_SWING, PAW_W, PAW_Y, pawPose, pawSpawnX, pawSwatAt }
  from "./catpaw.js";
import { SURFACE_W } from "./surface.js";

const VISIT = { t0: 100, x: 160, swats: 3 };
/** Total ticks a visit occupies. */
const SPAN = PAW_DESCEND + VISIT.swats * PAW_SWAT_LEN + PAW_RETREAT;

describe("PAW_ART", () => {
  it("is exactly PAW_W wide in every row — the margin math trusts it", () => {
    expect(PAW_ART.length).toBe(PAW_H);
    for (const row of PAW_ART) {
      expect(row.length).toBe(PAW_W);
      expect(row).toMatch(/^[.K]*$/);
    }
  });
});

describe("pawSpawnX", () => {
  it("keeps the sprite plus full swing inside the glass", () => {
    for (let i = 0; i < 200; i++) {
      const x = pawSpawnX(() => i / 199);
      expect(x - PAW_SWING - PAW_W / 2).toBeGreaterThanOrEqual(0);
      expect(x + PAW_SWING + PAW_W / 2).toBeLessThanOrEqual(SURFACE_W);
    }
  });
});

describe("pawPose", () => {
  it("is null before the visit and after it ends", () => {
    expect(pawPose(VISIT, VISIT.t0 - 1)).toBeNull();
    expect(pawPose(VISIT, VISIT.t0 + SPAN)).toBeNull();
    expect(pawPose(VISIT, VISIT.t0 + SPAN + 500)).toBeNull();
  });

  it("descends from offscreen to the swat line", () => {
    const top = pawPose(VISIT, VISIT.t0)!;
    const down = pawPose(VISIT, VISIT.t0 + PAW_DESCEND)!;
    expect(top.y).toBeCloseTo(-PAW_H);
    expect(down.y).toBeCloseTo(PAW_Y);
  });

  it("swings alternately right and left through the apex", () => {
    const apex0 = pawPose(VISIT,
      VISIT.t0 + PAW_DESCEND + PAW_SWAT_LEN / 2)!;
    const apex1 = pawPose(VISIT,
      VISIT.t0 + PAW_DESCEND + PAW_SWAT_LEN * 1.5)!;
    expect(apex0.x).toBeCloseTo(VISIT.x + PAW_SWING, 0);
    expect(apex1.x).toBeCloseTo(VISIT.x - PAW_SWING, 0);
    // Between swats the paw passes back through its hang point.
    const seam = pawPose(VISIT, VISIT.t0 + PAW_DESCEND + PAW_SWAT_LEN)!;
    expect(seam.x).toBeCloseTo(VISIT.x, 0);
  });

  it("retreats back offscreen", () => {
    const t = VISIT.t0 + SPAN - 1;
    expect(pawPose(VISIT, t)!.y).toBeLessThan(PAW_Y);
  });
});

describe("pawSwatAt", () => {
  it("fires once per swat at its apex", () => {
    const hits = new Set<number>();
    for (let t = VISIT.t0; t < VISIT.t0 + SPAN; t++) {
      const s = pawSwatAt(VISIT, t);
      if (s) hits.add(s.i);
    }
    expect([...hits].sort()).toEqual([0, 1, 2]);
  });

  it("aims the impulse at the paw's furthest reach", () => {
    let right: number | null = null, left: number | null = null;
    for (let t = VISIT.t0; t < VISIT.t0 + SPAN; t++) {
      const s = pawSwatAt(VISIT, t);
      if (s?.i === 0) right = s.x;
      if (s?.i === 1) left = s.x;
    }
    expect(right).toBeCloseTo(VISIT.x + PAW_SWING);
    expect(left).toBeCloseTo(VISIT.x - PAW_SWING);
  });

  it("does not fire during descent or retreat", () => {
    for (let t = VISIT.t0; t < VISIT.t0 + PAW_DESCEND; t++)
      expect(pawSwatAt(VISIT, t)).toBeNull();
    for (let t = VISIT.t0 + SPAN - PAW_RETREAT;
         t < VISIT.t0 + SPAN; t++)
      expect(pawSwatAt(VISIT, t)).toBeNull();
  });
});
