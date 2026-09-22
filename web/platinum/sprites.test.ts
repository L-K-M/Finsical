import { describe, expect, it } from "vitest";
import { SPRITES, spriteCss, spriteSvg } from "./sprites.js";
import { titleLeft } from "./window.js";

// Box pixels as Mac OS 8.0 draws them, gray level per hex digit: the
// Finder's zoom and collapse boxes, and the zoom box held down.
const ZOOM = [
  "888888888888.", "822222222222f", "82fcccc2ccc2f", "82c99aa2bc82f",
  "82c9aab2cc82f", "82caabb2cd82f", "82cabbc2dd82f", "82222222de82f",
  "82cbccddee82f", "82cccddeef82f", "82c888888882f", "822222222222f",
  ".ffffffffffff",
];
const COLLAPSE = [
  "888888888888.", "822222222222f", "82fcccccccc2f", "82c99aabbc82f",
  "82c9aabbcc82f", "822222222222f", "82cabbccdd82f", "822222222222f",
  "82cbccddee82f", "82cccddeef82f", "82c888888882f", "822222222222f",
  ".ffffffffffff",
];
const ZOOM_PRESSED_TOP = [
  "888888888888.", "822222222222f", "824455627782f", "824556627882f",
  "825566728892f", "825667728992f", "826677829992f", "822222229a92f",
];

describe("sprites", () => {
  it("are rectangular grids of known palette keys", () => {
    for (const [name, rows] of Object.entries(SPRITES)) {
      expect(rows.length, name).toBeGreaterThan(0);
      expect(new Set(rows.map((r) => r.length)).size, name).toBe(1);
      expect(() => spriteSvg(rows), name).not.toThrow();
    }
  });

  it("draw the titlebar boxes pixel for pixel", () => {
    expect(SPRITES.zoom).toEqual(ZOOM);
    expect(SPRITES.collapse).toEqual(COLLAPSE);
    expect(SPRITES.zoomPressed.slice(0, 8)).toEqual(ZOOM_PRESSED_TOP);
  });

  it("compile runs of one color into a single crisp path", () => {
    expect(spriteSvg(["ff8", ".f."])).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" width="3" height="2"' +
      ' shape-rendering="crispEdges"><path fill="#ffffff" d="M0 0h2v1H0z' +
      'M1 1h1v1H1z"/><path fill="#888888" d="M2 0h1v1H2z"/></svg>');
    expect(() => spriteSvg(["x"])).toThrow(/palette key/);
  });

  it("expose every sprite as a custom property", () => {
    const css = spriteCss();
    for (const name of ["close-pressed", "grow-inactive", "fill-right"])
      expect(css).toContain(`--pt-sprite-${name}: url("data:image/svg+xml,`);
  });
});

describe("titleLeft", () => {
  // [window width, title width, title x] from Mac OS 8.0 windows:
  // Finder "Mac OS 8 full", Appearance, Desktop Pictures, About This
  // Computer, Key Caps.
  it("matches the Window Manager's centering", () => {
    for (const [w, t, x] of [[416, 77, 169], [396, 77, 159], [442, 106, 168],
                             [478, 130, 174], [492, 56, 218]] as const)
      expect(titleLeft(w, t)).toBe(x);
  });
});
