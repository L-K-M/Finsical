import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { MACHINES } from "../web/machines.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
let fixture;

beforeAll(() => {
  fixture = mkdtempSync(join(tmpdir(), "finsical-web-build-"));
  cpSync(join(root, "package.json"), join(fixture, "package.json"));
  for (const directory of ["web", "core", "node_modules"])
    symlinkSync(join(root, directory), join(fixture, directory), "junction");
  execFileSync("npm", ["run", "build"], {
    cwd: fixture,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}, 30_000);

afterAll(() => {
  if (fixture) rmSync(fixture, { recursive: true, force: true });
});

describe("standalone web build", () => {
  it("includes every page, script, and stylesheet", () => {
    const pages = ["index", "overview", "addons", "prefs", "stats"];
    const scripts = ["bundle", "overview", "addons", "prefs", "stats"];
    const files = [...pages.map((p) => `${p}.html`),
      ...scripts.map((p) => `${p}.js`), "app.css", "osmium.css"];
    for (const file of files)
      expect(existsSync(join(fixture, "dist", file)), file).toBe(true);
  });

  const imaged = MACHINES.filter((m) => m.image);
  it("has at least one machine image to verify", () => {
    expect(imaged.length).toBeGreaterThan(0);
  });
  it.each(imaged)("includes the $name case image", (m) => {
    const output = join(fixture, "dist", m.image);
    expect(existsSync(output), m.image).toBe(true);
    expect(readFileSync(output).equals(readFileSync(join(root, "web", m.image))))
      .toBe(true);
  });
});
