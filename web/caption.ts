// Caption text for the Preferences caption area.
//
// The CRT tube sliders dim while the effect is off, the way Mac OS 8
// dims dependent controls. Pointing at one then must explain the
// switch, not show a value that cannot apply. Pure, so it is tested
// here rather than through the window.

import { POS_RANGE } from "./crt.js";

export interface TubeCaption {
  label: string;
  valueText: string;
  blurb: string;
  /** Hint while the CRT effect is off; tube sliders fall back to it. */
  offHint?: string | undefined;
  crtOn: boolean;
}

export interface Caption {
  /** Empty when the body is a bare hint with no label. */
  label: string;
  /** Either ` — blurb` or a bare hint. */
  tail: string;
}

export function tubeCaption(t: TubeCaption): Caption {
  // Truthy check, like the checkbox branch in describe: an empty off
  // hint means no off hint, and the value shows as usual.
  if (!t.crtOn && t.offHint)
    return { label: "", tail: t.offHint };
  return { label: `${t.label}: ${t.valueText}`, tail: ` — ${t.blurb}` };
}

/** Value text for a position pot: how far the raster sits off center
 * and which way, e.g. "Centered", "4% left", "0.6% up". `ends` are the
 * slider's end captions (low end first), so the spoken direction
 * always matches the words printed under the track.
 *
 * The percentage is the raster's actual shift as a share of its
 * neutral width or height, which is what the shader applies:
 * (v - 0.5) * 2 * POS_RANGE. Slider travel would read 100% at the
 * end stop while the picture moved only 10%, overstating it. One
 * slider step moves the raster 0.2%, so one decimal keeps every step
 * distinct and never rounds a real shift down to "0%". */
export function positionText(v: number,
    ends: readonly [string, string]): string {
  const shift = Math.round((v - 0.5) * 2 * POS_RANGE * 1000) / 10;
  if (shift === 0) return "Centered";

  const dir = (shift < 0 ? ends[0] : ends[1]).toLowerCase();
  return `${Math.abs(shift)}% ${dir}`;
}
