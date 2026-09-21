// Machine "cases" drawn around the tank. Each entry is an SVG bezel
// built from primitives — stylized homages, no copyrighted artwork —
// plus the screen rect (in viewBox units) that the tank/crt canvases
// overlay. The viewBox aspect also becomes the window's aspect; the
// screen is always the 320×200 tank.
/** A rounded rect in viewBox units — a building block of the window
 * silhouette. The native shell unions these into a CGPath layer mask,
 * so the window's visible shape can be irregular (stepped bases,
 * protruding chins), not just a rounded rect. */
export interface ShapeRect {
  x: number; y: number; w: number; h: number; r: number;
}

export interface Machine {
  id: string;
  name: string;
  blurb: string;
  vbW: number; vbH: number;
  sx: number; sy: number;   // screen rect origin in viewBox units
  sw: number; sh: number;   // screen rect size — 320×200 everywhere
  shape: ShapeRect[];       // window silhouette — must cover the art's
                            // outer edge exactly
  svg: string;              // inner markup for the shell <svg>
}

const S = { sw: 320, sh: 200 };

const cathode: Machine = {
  id: "cathode", name: "Cathode",
  blurb: "A dark tube monitor — the tank floats in a charcoal bezel.",
  vbW: 376, vbH: 264, sx: 28, sy: 24,
  shape: [{ x: 1.5, y: 1.5, w: 373, h: 261, r: 30 }], ...S,
  // Gradient ids are namespaced per machine — the preferences page
  // renders several of these SVGs into one document, and bare ids
  // would collide (url(#x) resolves document-wide).
  svg: `<defs>
<linearGradient id="cat-body" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#272b32"/><stop offset=".6" stop-color="#181b20"/>
<stop offset="1" stop-color="#0f1114"/></linearGradient>
<linearGradient id="cat-well" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#04060a"/><stop offset="1" stop-color="#0b0e13"/></linearGradient>
</defs>
<rect x="1.5" y="1.5" width="373" height="261" rx="30" fill="url(#cat-body)" stroke="#363b44" stroke-width="1.5"/>
<rect x="16" y="12" width="344" height="224" rx="16" fill="url(#cat-well)" stroke="#000"/>
<rect x="17.5" y="13.5" width="341" height="221" rx="14.5" fill="none" stroke="#2e333c" stroke-width="1.5" opacity=".6"/>
<rect x="180" y="246" width="16" height="4" rx="2" fill="#3ad04e" opacity=".85"/>`,
};

// Compact all-in-one in the spirit of a Macintosh Plus — the stepped
// base slab makes the silhouette irregular, which the layer mask
// reproduces. Art order: base first so the body's bottom edge seams
// over it.
const se: Machine = {
  id: "se", name: "Compact",
  blurb: "A platinum all-in-one in the spirit of a Macintosh Plus — "
    + "bezel ring around the glass, badge and floppy on the chin, "
    + "stepped base slab.",
  vbW: 388, vbH: 340, sx: 34, sy: 40, ...S,
  shape: [
    { x: 1.5, y: 1.5, w: 385, h: 297, r: 18 },   // body
    { x: 10, y: 296, w: 368, h: 42.5, r: 9 },    // base slab, stepped in
  ],
  svg: `<defs>
<linearGradient id="se-body" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#eae5da"/><stop offset="1" stop-color="#c4bcab"/></linearGradient>
<linearGradient id="se-ring" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#d9d3c5"/><stop offset="1" stop-color="#b4ac9b"/></linearGradient>
<linearGradient id="se-well" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#57534a"/><stop offset="1" stop-color="#3a362d"/></linearGradient>
<linearGradient id="se-glass" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#2b3234"/><stop offset="1" stop-color="#12181a"/></linearGradient>
<linearGradient id="se-base" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#cfc8b8"/><stop offset="1" stop-color="#a89f8d"/></linearGradient>
</defs>
<rect x="10" y="296" width="368" height="42.5" rx="9" fill="url(#se-base)" stroke="#8f887a" stroke-width="1.5"/>
<rect x="1.5" y="1.5" width="385" height="297" rx="18" fill="url(#se-body)" stroke="#968e7d" stroke-width="1.5"/>
<rect x="4" y="3" width="380" height="293" rx="15.5" fill="none" stroke="#f4f0e6" stroke-width="1.2" opacity=".6"/>
<rect x="13" y="297.5" width="362" height="1.5" fill="#efe9db" opacity=".8"/>
<g fill="#a89f8e">
<rect x="34" y="12" width="150" height="3.5" rx="1.75"/>
<rect x="204" y="12" width="150" height="3.5" rx="1.75"/></g>
<rect x="20" y="26" width="348" height="238" rx="14" fill="url(#se-ring)" stroke="#8f887a"/>
<rect x="22" y="28" width="344" height="234" rx="12" fill="none" stroke="#f2eee2" stroke-width="1" opacity=".7"/>
<rect x="30" y="36" width="328" height="220" rx="10" fill="url(#se-well)"/>
<rect x="34" y="40" width="320" height="200" rx="6" fill="url(#se-glass)"/>
<rect x="38" y="268" width="14" height="15" rx="2" fill="#3c3a34"/>
<g><rect x="40" y="270" width="10" height="2" fill="#61bb46"/><rect x="40" y="272" width="10" height="2" fill="#fdb827"/><rect x="40" y="274" width="10" height="2" fill="#f5821f"/><rect x="40" y="276" width="10" height="2" fill="#e03a3e"/><rect x="40" y="278" width="10" height="2" fill="#963d97"/><rect x="40" y="280" width="10" height="2" fill="#009ddc"/></g>
<text x="60" y="283" font-family="Geneva, -apple-system, sans-serif" font-size="12" letter-spacing="1.5" font-weight="600" fill="#877f70">Finsical</text>
<rect x="252" y="268" width="100" height="13" rx="2" fill="#37342d" stroke="#8f887a"/>
<rect x="255" y="272" width="94" height="5" rx="1" fill="#171512"/>
<circle cx="44" cy="318" r="5" fill="none" stroke="#7d7666" stroke-width="1.4"/>
<g stroke="#7d7666" stroke-width="1.4">
<line x1="44" y1="309.5" x2="44" y2="311.5"/><line x1="44" y1="324.5" x2="44" y2="326.5"/>
<line x1="35.5" y1="318" x2="37.5" y2="318"/><line x1="50.5" y1="318" x2="52.5" y2="318"/>
<line x1="38" y1="312" x2="39.4" y2="313.4"/><line x1="48.6" y1="322.6" x2="50" y2="324"/>
<line x1="50" y1="312" x2="48.6" y2="313.4"/><line x1="39.4" y1="322.6" x2="38" y2="324"/></g>
<g fill="#8f887a"><rect x="240" y="314" width="26" height="2" rx="1"/><rect x="240" y="319" width="26" height="2" rx="1"/><rect x="240" y="324" width="26" height="2" rx="1"/></g>
<rect x="330" y="310" width="16" height="18" rx="2" fill="#4a463c" stroke="#8f887a"/>`,
};

const studio: Machine = {
  id: "studio", name: "Studio CRT",
  blurb: "A beige LC-era desktop monitor — deep bezel, domed face, "
    + "power bar under the screen.",
  vbW: 400, vbH: 298, sx: 40, sy: 32,
  shape: [{ x: 1.5, y: 1.5, w: 397, h: 295, r: 24 }], ...S,
  svg: `<defs>
<radialGradient id="stu-face" cx=".5" cy=".38" r=".8">
<stop offset="0" stop-color="#e8e3d8"/><stop offset=".7" stop-color="#cfc8b8"/>
<stop offset="1" stop-color="#aaa394"/></radialGradient>
</defs>
<rect x="1.5" y="1.5" width="397" height="295" rx="24" fill="url(#stu-face)" stroke="#8f887a" stroke-width="1.5"/>
<rect x="28" y="20" width="344" height="224" rx="14" fill="#565248" stroke="#373430"/>
<rect x="29.5" y="21.5" width="341" height="221" rx="12.5" fill="none" stroke="#efebe0" stroke-width="1.5" opacity=".45"/>
<rect x="146" y="260" width="108" height="20" rx="10" fill="#c9c2b2" stroke="#a09a8b"/>
<circle cx="160" cy="270" r="4" fill="#3ad04e" opacity=".9"/>
<rect x="196" y="264" width="30" height="12" rx="6" fill="#8f887a" stroke="#7a7468"/>`,
};

// iMac G3 chin: two speaker-grille dot clusters flanking the tray slot.
const grilleDots = (ox: number): string => {
  let s = "";
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 6; c++)
      s += `<circle cx="${ox + c * 9}" cy="${296 + r * 9}" r="2.3"/>`;
  return s;
};
const imac: Machine = {
  id: "imac", name: "iMac",
  blurb: "The Bondi-blue bubble — translucent teal shell, speaker "
    + "grille and CD tray on the chin.",
  vbW: 408, vbH: 356, sx: 44, sy: 40,
  shape: [{ x: 1.5, y: 1.5, w: 405, h: 353, r: 58 }], ...S,
  svg: `<defs>
<linearGradient id="imac-body" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#55bab1"/><stop offset=".55" stop-color="#37968e"/>
<stop offset="1" stop-color="#2a7a74"/></linearGradient>
</defs>
<rect x="1.5" y="1.5" width="405" height="353" rx="58" fill="url(#imac-body)" stroke="#1f5f5a" stroke-width="1.5"/>
<rect x="32" y="28" width="344" height="224" rx="20" fill="#0d2f2c" stroke="#164a45"/>
<rect x="33.5" y="29.5" width="341" height="221" rx="18.5" fill="none" stroke="#7fd4cd" stroke-width="1.5" opacity=".35"/>
<g fill="#1d6059">${grilleDots(88)}${grilleDots(266)}</g>
<rect x="158" y="332" width="92" height="6" rx="3" fill="#164a45"/>
<rect x="158" y="332" width="92" height="2.5" rx="1.25" fill="#0d2f2c"/>`,
};

const bare: Machine = {
  id: "bare", name: "Bare tank",
  blurb: "No case — just the water, edge to edge.",
  vbW: 320, vbH: 200, sx: 0, sy: 0,
  shape: [{ x: 0, y: 0, w: 320, h: 200, r: 0 }], ...S,
  svg: "",
};

export const MACHINES: readonly Machine[] = [cathode, se, studio, imac, bare];
export const DEFAULT_MACHINE = "cathode";
export function machineById(id: string): Machine | undefined {
  return MACHINES.find((m) => m.id === id);
}
