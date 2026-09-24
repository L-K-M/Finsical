import { describe, expect, it } from "vitest";
import { spriteSvg } from "osmium-ui";
import { ALERT_ICONS, ALERT_PALETTE, ICON_PALETTE, ICON_SPRITES, MENU_GLYPH,
         SOUND_ICON }
  from "./icons.js";

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

describe("menu-bar glyph", () => {
  // Osmium draws a menu's icon in a 16 x 16 box; a bigger sprite shows
  // only its top-left corner.
  it("is a 16 x 16 grid of known palette keys", () => {
    expect(MENU_GLYPH.length).toBe(16);
    for (const r of MENU_GLYPH) expect(r.length).toBe(16);
    expect(() => spriteSvg(MENU_GLYPH, ICON_PALETTE)).not.toThrow();
  });
});

describe("alert icons", () => {
  // alert.ts registers them the first time an alert opens; a bad grid
  // would throw there and leave the alert without its frame.
  it("are 32 x 32 grids of known palette keys", () => {
    for (const [name, rows] of Object.entries(ALERT_ICONS)) {
      expect(rows.length, name).toBe(32);
      for (const r of rows) expect(r.length, name).toBe(32);
      expect(() => spriteSvg(rows, ALERT_PALETTE), name).not.toThrow();
    }
  });
});

describe("sound icon", () => {
  // It fills the add-on lists' 38 x 28 thumbnails without scaling, and
  // render.ts's rasterizer knows grays and ICON_PALETTE, not Osmium's
  // lavender ramp.
  it("is a 32 x 24 grid of grays and icon palette colors", () => {
    expect(SOUND_ICON.length).toBe(24);
    for (const r of SOUND_ICON) {
      expect(r.length).toBe(32);
      for (const k of r)
        expect(/^[0-9a-f.]$/.test(k) || k in ICON_PALETTE, k).toBe(true);
    }
  });
});
