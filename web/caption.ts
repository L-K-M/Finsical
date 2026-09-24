// Caption text for the Preferences caption area.
//
// The CRT tube sliders dim while the effect is off, the way Mac OS 8
// dims dependent controls. Pointing at one then must explain the
// switch, not show a value that cannot apply. Pure, so it is tested
// here rather than through the window.

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
  if (!t.crtOn && t.offHint !== undefined)
    return { label: "", tail: t.offHint };
  return { label: `${t.label}: ${t.valueText}`, tail: ` — ${t.blurb}` };
}
