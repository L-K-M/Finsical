import { describe, expect, it, vi } from "vitest";
import { corpseSprite } from "./corpse.js";

describe("corpseSprite", () => {
  it("keeps the live sprite when muted-frame allocation fails", () => {
    const output = { width: 0, height: 0, getContext: () => null };
    vi.stubGlobal("document", { createElement: () => output });
    const source = { width: 4, height: 2 } as HTMLCanvasElement;

    try {
      expect(corpseSprite(source)).toBe(source);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("composites and caches a muted sprite without Canvas filter", () => {
    const calls: unknown[][] = [];
    const context = {
      set imageSmoothingEnabled(value: boolean) {
        calls.push(["smoothing", value]);
      },
      drawImage: (...args: unknown[]) => calls.push(["drawImage", ...args]),
      set globalCompositeOperation(value: string) {
        calls.push(["composite", value]);
      },
      set globalAlpha(value: number) { calls.push(["alpha", value]); },
      set fillStyle(value: string) { calls.push(["fill", value]); },
      set filter(value: string) { calls.push(["filter", value]); },
      fillRect: (...args: number[]) => calls.push(["fillRect", ...args]),
    } as unknown as CanvasRenderingContext2D;
    const output = { width: 0, height: 0, getContext: () => context };
    const out = output as unknown as HTMLCanvasElement;
    const createElement = vi.fn(() => out);
    vi.stubGlobal("document", { createElement });
    const source = { width: 4, height: 2 } as HTMLCanvasElement;

    try {
      expect(corpseSprite(source)).toBe(out);
      expect(corpseSprite(source)).toBe(out);
    } finally {
      vi.unstubAllGlobals();
    }

    expect(output.width).toBe(4);
    expect(output.height).toBe(2);
    expect(createElement).toHaveBeenCalledTimes(1);
    expect(calls).toEqual([
      ["smoothing", false],
      ["drawImage", source, 0, 0],
      ["composite", "source-atop"],
      ["alpha", 0.7],
      ["fill", "#808080"],
      ["fillRect", 0, 0, 4, 2],
      ["alpha", 0.15],
      ["fill", "#000"],
      ["fillRect", 0, 0, 4, 2],
      ["alpha", 1],
      ["composite", "source-over"],
    ]);
    expect(calls.some(([kind]) => kind === "filter")).toBe(false);
  });
});
