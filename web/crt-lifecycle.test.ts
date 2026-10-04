import { afterEach, describe, expect, it, vi } from "vitest";
import { initCrt, sanitizeCrtConfig } from "./crt.js";
import type { CrtConfig } from "./crt.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// Exercise the real filter's frame-ownership contract without a GPU.
// Shader calls are stubs; the uploaded power and context-loss event are
// observable, so elapsed time cannot stand in for a rendered frame.
function fixture() {
  let now = 0;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  const uniform1f = vi.fn();
  const noOp = () => {};
  const gl = new Proxy({
    MAX_TEXTURE_SIZE: 0x0d33,
    MAX_VIEWPORT_DIMS: 0x0d3a,
    FRAMEBUFFER_COMPLETE: 0x8cd5,
    getParameter: (key: number) => key === 0x0d3a ? [4096, 4096] : 4096,
    getShaderParameter: () => true,
    getProgramParameter: () => true,
    checkFramebufferStatus: () => 0x8cd5,
    getUniformLocation: (_program: unknown, name: string) => name,
    uniform1f,
  }, {
    get(target, key) {
      if (key in target) return Reflect.get(target, key);
      if (typeof key === "string" && key.startsWith("create"))
        return () => ({});
      return noOp;
    },
  });
  const listeners = new Map<string, (event: Event) => void>();
  const out = {
    width: 640, height: 400, clientWidth: 640, clientHeight: 400,
    getContext: () => gl,
    addEventListener: (type: string, listener: (event: Event) => void) =>
      listeners.set(type, listener),
  };
  vi.stubGlobal("document", {
    getElementById: () => out,
    body: { classList: { toggle: noOp, remove: noOp } },
  });
  vi.stubGlobal("window", {
    devicePixelRatio: 1,
    matchMedia: () => ({ matches: false }),
    addEventListener: noOp,
  });
  vi.stubGlobal("ResizeObserver", undefined);
  const crt = initCrt({ width: 320, height: 200 } as HTMLCanvasElement)!;
  expect(crt).not.toBeNull();
  return {
    crt,
    uniform1f,
    advanceTo: (time: number) => { now = time; },
    power: () => uniform1f.mock.calls.filter(([name]) => name === "uPower")
      .at(-1)?.[1],
    loseContext: () => listeners.get("webglcontextlost")!(
      new Event("webglcontextlost", { cancelable: true })),
  };
}

describe("CRT warm-up frame ownership", () => {
  it.each([false, true])("settles after a long stall (partial frame: %s)",
    (partial) => {
      const f = fixture();
      f.crt.setEnabled(true);
      if (partial) {
        f.advanceTo(100);
        f.crt.render();
        expect(f.power()).toBeGreaterThan(0);
        expect(f.power()).toBeLessThan(1);
      }

      // A hidden tab or stalled main thread resumes after the old
      // timeout. A paused tank must still owe its full-power paint.
      f.advanceTo(1500);
      expect(f.crt.animating).toBe(true);
      f.crt.render();
      expect(f.power()).toBe(1);
      expect(f.crt.animating).toBe(false);
    });

  it("stops owing frames when the WebGL context is lost", () => {
    const f = fixture();
    f.crt.setEnabled(true);
    f.advanceTo(100);
    f.crt.render();
    expect(f.crt.animating).toBe(true);
    f.loseContext();
    expect(f.crt.usable).toBe(false);
    expect(f.crt.enabled).toBe(false);
    expect(f.crt.animating).toBe(false);
    f.crt.setEnabled(true);
    expect(f.crt.enabled).toBe(false);
  });
});

describe("CRT configure", () => {
  // The page hands configure() each full Monitor-pane config; what
  // reaches the shader is the uniform set, the mask as its CRT_MASKS
  // index.
  it("uploads each config it is given, and A, B, A restores A", () => {
    const f = fixture();
    const upload = (c: CrtConfig): Record<string, unknown> => {
      f.uniform1f.mockClear();
      f.crt.configure(c);
      return Object.fromEntries(f.uniform1f.mock.calls);
    };
    const a = sanitizeCrtConfig({ scanlines: 0.9, bloom: 0.1, mask: "slot" });
    const b = sanitizeCrtConfig({ scanlines: 0.2, bloom: 0.7, softening: 0.3,
                                  curvature: 0.8, red: 0.1, mask: "shadow" });

    const first = upload(a);
    expect(first).toMatchObject({ uScan: 0.9, uBloom: 0.1, uMask: 1 });
    const second = upload(b);
    expect(second).toMatchObject({ uScan: 0.2, uBloom: 0.7, uSoft: 0.3,
                                   uCurve: 0.8, uRed: 0.1, uMask: 2 });
    expect(second).not.toEqual(first);
    expect(upload(a)).toEqual(first);
  });

  it("clamps values a caller passes out of range", () => {
    const f = fixture();
    f.crt.configure({ ...sanitizeCrtConfig(null), scanlines: 2, bloom: -1 });
    expect(Object.fromEntries(f.uniform1f.mock.calls))
      .toMatchObject({ uScan: 1, uBloom: 0 });
  });
});
