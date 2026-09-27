import { describe, expect, it } from "vitest";
import { clientWindowFeatures } from "./menubar.js";

// A tank window at (100, 80) on a 1440x900 screen under a 25 px bar.
const AT = { screenX: 100, screenY: 80, availLeft: 0, availTop: 25,
             availWidth: 1440, availHeight: 875 };
const parse = (f: string) => Object.fromEntries(f.split(",").slice(1)
  .map((kv) => kv.split("=")).map(([k, v]) => [k, Number(v)]));

describe("clientWindowFeatures", () => {
  it("asks for a popup the size of the app's window", () => {
    expect(clientWindowFeatures("stats", AT).split(",")[0]).toBe("popup");
    expect(parse(clientWindowFeatures("stats", AT)))
      .toMatchObject({ width: 380, height: 360 });
    expect(parse(clientWindowFeatures("prefs", AT)))
      .toMatchObject({ width: 565, height: 518 });
    expect(parse(clientWindowFeatures("overview", AT)))
      .toMatchObject({ width: 521, height: 381 });
    expect(parse(clientWindowFeatures("addons", AT)))
      .toMatchObject({ width: 621, height: 441 });
  });

  it("opens a little in and down from the tank window", () => {
    expect(parse(clientWindowFeatures("stats", AT)))
      .toMatchObject({ left: 140, top: 140 });
  });

  it("stays on screen near the right and bottom edges", () => {
    const f = parse(clientWindowFeatures("prefs",
      { ...AT, screenX: 1300, screenY: 800 }));
    expect(f.left).toBe(1440 - 565);
    expect(f.top).toBe(25 + 875 - 40 - 518); // title bar kept clear
  });

  it("pins to the screen's corner when the window is bigger than it", () => {
    const f = parse(clientWindowFeatures("addons",
      { ...AT, availWidth: 400, availHeight: 300 }));
    expect(f.left).toBe(0);
    expect(f.top).toBe(25);
  });

  it("stays on a second screen to the left of the main one", () => {
    const f = parse(clientWindowFeatures("stats",
      { screenX: -1500, screenY: 0, availLeft: -1920, availTop: 0,
        availWidth: 1920, availHeight: 1080 }));
    expect(f.left).toBe(-1460);
    expect(f.top).toBe(60);
  });
});
