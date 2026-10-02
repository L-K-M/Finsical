import { describe, expect, it } from "vitest";

// overview.ts wires the window at import time. Keep the disconnect guard
// regression close to that wiring without requiring a browser harness.
const src = import.meta.glob<string>("./overview.ts", {
  query: "?raw", import: "default", eager: true,
})["./overview.ts"]?.replace(/\s+/g, " ") ?? "";
const mainSrc = import.meta.glob<string>("./main.ts", {
  query: "?raw", import: "default", eager: true,
})["./main.ts"]?.replace(/\s+/g, " ") ?? "";

describe("Overview disconnect guards", () => {
  it("blocks stale destructive intents", () => {
    expect(src).toMatch(
      /const removeSelected = \(\): void => \{\s*if \(tankGone\) return;/,
    );
    expect(src).toMatch(
      /pushButton\(emptyBtn, \(\) => \{\s*if \(tankGone\) \{\s*disarmEmpty\(\);\s*return;\s*\}/,
    );
    expect(src).toMatch(/emptyBtn\.disabled = tankGone;/);
    expect(src).toMatch(/tankGone = true;\s*disarmEmpty\(\);/);
    expect(src).toMatch(/emptyArmBoot = tankBoot;/);
    expect(src).toMatch(
      /isCurrentTankAction\(tankGone, armedBoot, tankBoot\)/,
    );
  });

  it("does not commit a rename after disconnect", () => {
    expect(src).toMatch(/const renameBoot = tankBoot;/);
    expect(src).toMatch(
      /isCurrentTankAction\(tankGone, renameBoot, tankBoot\)/,
    );
  });

  it("disarms pending confirmation when the tank restarts", () => {
    expect(src).toMatch(
      /tankBoot = m\.boot;\s*thumbRequested\.clear\(\);\s*lastStructure = "";\s*disarmEmpty\(\);/,
    );
  });
});

describe("Overview mutation tokens", () => {
  it("sends each mutation with the current tank boot", () => {
    expect(src).toMatch(/postTankMutation\(it\.remove, tankBoot\);/);
    expect(src).toMatch(
      /postTankMutation\(\{ op: "renameFish", id: f\.id, name: a\.value \},\s*renameBoot\);/,
    );
    expect(src).toMatch(
      /if \(!tankGone && it\?\.use\) postTankMutation\(it\.use, tankBoot\);/,
    );
    expect(src).toMatch(
      /postTankMutation\(\{ op: "emptyTank" \}, armedBoot\);/,
    );
  });

  it("checks the token at the tank dispatch boundary", () => {
    expect(mainSrc).toMatch(
      /if \(!acceptsTankIntent\(m, boot\)\) return;/,
    );
  });
});
