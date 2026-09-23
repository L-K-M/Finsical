// Platinum runtime: registers the Mac OS 8 bitmap fonts and the sprite
// images platinum.css draws with. mountWindow() calls it; pages that
// use Platinum controls without a window call it themselves.
import { emboldened, strikeGlyphs } from "./bitmapfont.js";
import type { StrikeData } from "./bitmapfont.js";
import { CHARCOAL_12 } from "./fonts/charcoal12.js";
import { GENEVA_9 } from "./fonts/geneva9.js";
import { GENEVA_10 } from "./fonts/geneva10.js";
import { spriteCss } from "./sprites.js";
import { buildPixelFont } from "./ttf.js";

let installed: Promise<void> | null = null;

/** Add the sprite custom properties and the font faces (Charcoal 12
 * and Geneva 10, each with QuickDraw-synthesized bold, and Geneva 9
 * for captions). Idempotent.
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
    trackInputModality();
    const faces = [CHARCOAL_12, GENEVA_10]
      .flatMap((s) => [face(s, false), face(s, true)]);
    faces.push(face(GENEVA_9, false));
    // FontFaceSet's setlike add() is typed only in lib.dom.iterable,
    // which this project doesn't load.
    const set = document.fonts as unknown as { add(f: FontFace): void };
    for (const f of faces) set.add(f);
    await Promise.all(faces.map((f) => f.load()));
  })();
  return installed;
}

/** Keep .pt-kbd on the root while the keyboard is driving: set by any
 * unmodified key, cleared by any press. platinum.css draws focus rings
 * only under it. */
function trackInputModality(): void {
  const root = document.documentElement;
  document.addEventListener("keydown", (e) => {
    if (!e.metaKey && !e.ctrlKey) root.classList.add("pt-kbd");
  }, true);
  document.addEventListener("pointerdown", () => {
    root.classList.remove("pt-kbd");
  }, true);
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
