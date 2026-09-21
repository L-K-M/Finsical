// Machine "cases" drawn around the tank. Each entry is an SVG bezel
// built from primitives — stylized homages, no copyrighted artwork —
// plus the screen rect (in viewBox units) that the tank/crt canvases
// overlay. The viewBox aspect also becomes the window's aspect; the
// screen is always the 320×200 tank.
export interface Machine {
  id: string;
  name: string;
  blurb: string;
  vbW: number; vbH: number;
  sx: number; sy: number;   // screen rect origin in viewBox units
  sw: number; sh: number;   // screen rect size — 320×200 everywhere
  rx: number;               // outer corner radius — the native shell
                            // clips the window to the same silhouette
  svg: string;              // inner markup for the shell <svg>
}

const S = { sw: 320, sh: 200 };

const cathode: Machine = {
  id: "cathode", name: "Cathode",
  blurb: "A dark tube monitor — the tank floats in a charcoal bezel.",
  vbW: 376, vbH: 264, sx: 28, sy: 24, rx: 30, ...S,
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

const se: Machine = {
  id: "se", name: "Compact",
  blurb: "An all-in-one platinum box in the spirit of a Macintosh SE — "
    + "vents up top, floppy slot and brightness knob on the chin.",
  vbW: 388, vbH: 332, sx: 34, sy: 40, rx: 22, ...S,
  svg: `<defs>
<linearGradient id="se-body" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#e2ddd2"/><stop offset="1" stop-color="#b6afa0"/></linearGradient>
<linearGradient id="se-well" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#716c60"/><stop offset="1" stop-color="#8b8578"/></linearGradient>
</defs>
<rect x="1.5" y="1.5" width="385" height="329" rx="22" fill="url(#se-body)" stroke="#8f887a" stroke-width="1.5"/>
<g fill="#a39d8e">
<rect x="34" y="13" width="140" height="3.5" rx="1.75"/>
<rect x="34" y="20.5" width="140" height="3.5" rx="1.75"/></g>
<rect x="22" y="28" width="344" height="224" rx="12" fill="url(#se-well)" stroke="#565248"/>
<rect x="23.5" y="29.5" width="341" height="221" rx="10.5" fill="none" stroke="#efebe0" stroke-width="1.5" opacity=".4"/>
<text x="40" y="296" font-family="Geneva, -apple-system, sans-serif" font-size="13" letter-spacing="2.5" font-weight="600" fill="#877f70">FINSICAL</text>
<rect x="270" y="292" width="78" height="7" rx="3.5" fill="#565248"/>
<rect x="270" y="292" width="78" height="3" rx="1.5" fill="#373430"/>
<circle cx="58" cy="316" r="6" fill="#8f887a" stroke="#6b665c"/>
<circle cx="56" cy="314" r="2" fill="#efebe0" opacity=".5"/>
<rect x="34" y="314" width="10" height="4" rx="2" fill="#3ad04e" opacity=".8"/>`,
};

const studio: Machine = {
  id: "studio", name: "Studio CRT",
  blurb: "A beige LC-era desktop monitor — deep bezel, domed face, "
    + "power bar under the screen.",
  vbW: 400, vbH: 298, sx: 40, sy: 32, rx: 24, ...S,
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
  vbW: 408, vbH: 356, sx: 44, sy: 40, rx: 58, ...S,
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
  vbW: 320, vbH: 200, sx: 0, sy: 0, rx: 0, ...S,
  svg: "",
};

export const MACHINES: readonly Machine[] = [cathode, se, studio, imac, bare];
export const DEFAULT_MACHINE = "cathode";
export function machineById(id: string): Machine | undefined {
  return MACHINES.find((m) => m.id === id);
}
