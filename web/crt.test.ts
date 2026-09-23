import { afterEach, describe, expect, it, vi } from "vitest";
import { CRT_DEFAULTS, initCrt, sanitizeCrtConfig } from "./crt.js";

// sanitizeCrtConfig is the trust boundary for localStorage payloads and
// bus messages from the prefs window — anything odd must fall back to
// or clamp toward the tuned defaults.
describe("sanitizeCrtConfig", () => {
  it("returns defaults for non-objects", () => {
    for (const raw of [null, undefined, 42, "x", [1, 2], true])
      expect(sanitizeCrtConfig(raw)).toEqual(CRT_DEFAULTS);
  });

  it("keeps in-range values and drops unknown keys", () => {
    const c = sanitizeCrtConfig({ scanlines: 0.7, bogus: 1 });
    expect(c.scanlines).toBe(0.7);
    expect("bogus" in c).toBe(false);
    expect(c.beam).toBe(CRT_DEFAULTS.beam); // untouched key = default
  });

  it("clamps out-of-range and rejects non-numbers", () => {
    const c = sanitizeCrtConfig({
      bloom: 5, curvature: -1, grille: "high", flicker: NaN,
      overdrive: Infinity, beam: 0.25,
    });
    expect(c.bloom).toBe(1);
    expect(c.curvature).toBe(0);
    expect(c.grille).toBe(CRT_DEFAULTS.grille);
    expect(c.flicker).toBe(CRT_DEFAULTS.flicker);
    expect(c.overdrive).toBe(CRT_DEFAULTS.overdrive);
    expect(c.beam).toBe(0.25);
  });

  it("round-trips a full config", () => {
    const c = sanitizeCrtConfig(CRT_DEFAULTS);
    expect(c).toEqual(CRT_DEFAULTS);
    expect(c).not.toBe(CRT_DEFAULTS); // a copy — defaults stay frozen
  });
});

// initCrt needs just enough DOM + WebGL to count the expensive calls.
// The tank repaints at the 30 Hz sim rate while the CRT redraws every
// rAF for flicker/grain — texture uploads must follow the sim, not rAF.
describe("initCrt", () => {
  afterEach(() => vi.unstubAllGlobals());

  function fakeGl() {
    const calls = { texSubImage2D: 0, drawArrays: 0 };
    const gl = new Proxy({} as Record<string | symbol, unknown>, {
      get(_t, prop) {
        if (prop === "getShaderParameter" || prop === "getProgramParameter")
          return () => true;
        if (prop === "texSubImage2D")
          return () => { calls.texSubImage2D++; };
        if (prop === "drawArrays")
          return () => { calls.drawArrays++; };
        return () => ({});
      },
    });
    return { gl, calls };
  }

  function setup() {
    const { gl, calls } = fakeGl();
    const el = {
      getContext: () => gl, addEventListener: () => {},
      clientWidth: 640, clientHeight: 400, width: 0, height: 0,
    } as unknown as HTMLCanvasElement;
    vi.stubGlobal("document", {
      getElementById: () => el,
      body: { classList: { toggle: () => {}, remove: () => {} } },
    });
    vi.stubGlobal("window", { devicePixelRatio: 1 });
    const crt = initCrt(el);
    if (!crt) throw new Error("initCrt returned null under the GL stub");
    return { crt, calls };
  }

  it("uploads the texture only for fresh frames, but always draws", () => {
    const { crt, calls } = setup();
    crt.setEnabled(true);
    crt.render(true);            // sim ticked — new tank bitmap
    crt.render(false);           // no tick — same bitmap, skip upload
    crt.render(false);
    expect(calls.texSubImage2D).toBe(1);
    expect(calls.drawArrays).toBe(3); // flicker/grain still animate
  });

  it("re-uploads once after re-enable, even on a stale frame", () => {
    const { crt, calls } = setup();
    crt.setEnabled(true);
    crt.render(true);
    crt.setEnabled(false);
    crt.setEnabled(true);
    crt.render(false);
    expect(calls.texSubImage2D).toBe(2);
  });

  it("does nothing while disabled", () => {
    const { crt, calls } = setup();
    crt.render(true);
    expect(calls.texSubImage2D).toBe(0);
    expect(calls.drawArrays).toBe(0);
  });
});
