import { describe, expect, it } from "vitest";
import { spriteSvg } from "osmium-ui";
import { PLACEHOLDER_FRAMES, PLACEHOLDER_PALETTE } from "./placeholder.js";

describe("placeholder fish", () => {
  // gridCanvas throws on a ragged grid or an unknown palette key —
  // spriteSvg checks the same without needing a canvas.
  it("frames are uniform grids of known palette keys", () => {
    expect(PLACEHOLDER_FRAMES.length).toBe(2);
    for (const rows of PLACEHOLDER_FRAMES) {
      expect(rows.length).toBe(14);
      for (const r of rows) expect(r.length).toBe(24);
      expect(() => spriteSvg(rows, PLACEHOLDER_PALETTE)).not.toThrow();
    }
  });

  it("frames differ only in the tail — the body holds still, the tail wags", () => {
    const a = PLACEHOLDER_FRAMES[0]!;
    const b = PLACEHOLDER_FRAMES[1]!;
    for (let i = 0; i < 14; i++)
      expect(a[i]!.slice(0, 18)).toBe(b[i]!.slice(0, 18));
    // The wag itself: the two tail regions must actually differ.
    expect(a.map((r) => r.slice(18)).join("\n"))
      .not.toBe(b.map((r) => r.slice(18)).join("\n"));
  });
});
