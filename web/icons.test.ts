import { describe, expect, it } from "vitest";
import { spriteSvg } from "osmium-ui";
import { ICON_PALETTE, ICON_SPRITES } from "./icons.js";

describe("pane icons", () => {
  // prefs.ts registers them at load; registerSprites throws on a ragged
  // grid or an unknown palette key, which would break the window.
  it("are 32 x 32 grids of known palette keys", () => {
    for (const [name, rows] of Object.entries(ICON_SPRITES)) {
      expect(rows.length, name).toBe(32);
      for (const r of rows) expect(r.length, name).toBe(32);
      expect(() => spriteSvg(rows, ICON_PALETTE), name).not.toThrow();
    }
  });
});
