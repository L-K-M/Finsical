// Platinum runtime: registers the Mac OS 8 bitmap fonts and the sprite
// images platinum.css draws with. mountWindow() calls it; pages that
// use Platinum controls without a window call it themselves.
import { emboldened, strikeGlyphs } from "./bitmapfont.js";
import type { StrikeData } from "./bitmapfont.js";
import { CHARCOAL_12 } from "./fonts/charcoal12.js";
import { GENEVA_10 } from "./fonts/geneva10.js";
import { spriteCss } from "./sprites.js";
import { buildPixelFont } from "./ttf.js";

let installed: Promise<void> | null = null;

/** Add the sprite custom properties and the four font faces (Charcoal
 * 12 and Geneva 10, each with QuickDraw-synthesized bold). Idempotent.
 * Resolves once the fonts can be measured; rejects if the browser
 * refuses a face — text then falls back to the next family in
 * platinum.css, so callers should report the error and carry on. */
export function installPlatinum(): Promise<void> {
  if (installed) return installed;
  // An async body turns a synchronous throw (say, a malformed strike)
  // into the same cached rejection a refused face produces. Everything
  // before the await still runs now, so the sprites exist at first paint.
  installed = (async () => {
    const style = document.createElement("style");
    style.textContent = `:root {\n${spriteCss()}\n}`;
    document.head.appendChild(style);
    const faces = [CHARCOAL_12, GENEVA_10]
      .flatMap((s) => [face(s, false), face(s, true)]);
    // FontFaceSet's setlike add() is typed only in lib.dom.iterable,
    // which this project doesn't load.
    const set = document.fonts as unknown as { add(f: FontFace): void };
    for (const f of faces) set.add(f);
    await Promise.all(faces.map((f) => f.load()));
  })();
  return installed;
}

function face(s: StrikeData, bold: boolean): FontFace {
  const glyphs = strikeGlyphs(s);
  const bytes = buildPixelFont({
    family: s.family, bold, sizePx: s.sizePx,
    ascent: s.ascent, descent: s.descent,
    glyphs: bold ? emboldened(glyphs) : glyphs,
  });
  return new FontFace(s.family, bytes, { weight: bold ? "700" : "400" });
}
