import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync } from "node:fs";
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
  // execFileSync blocks the worker — the beforeAll timeout can never
  // fire mid-build, so the child needs its own kill budget. A failing
  // build still reports via stdout/stderr attached to the thrown error;
  // WEB_BUILD_DEBUG streams logs live when needed.
  execFileSync("npm", ["run", "build"], {
    cwd: fixture,
    stdio: process.env.WEB_BUILD_DEBUG ? "inherit" : "pipe",
    shell: process.platform === "win32",
    timeout: 25_000,
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
    for (const path of new Set([m.image, m.rearImage, m.maskImage].filter(Boolean))) {
      const output = join(fixture, "dist", path);
      expect(existsSync(output), path).toBe(true);
      expect(readFileSync(output).equals(readFileSync(join(root, "web", path))))
        .toBe(true);
    }
  });

  it("ships the favicon in every native package's web payload", () => {
    // The packagers hand-maintain their file lists next to the build
    // script's copy list; icon.svg went missing from all three when the
    // favicon landed, so every Linux and macOS page asked for a file
    // their web root did not have. Read the lists, not the file names.
    const lists = ["linux/build-deb.sh", "linux/build-tarball.sh"]
      .map((file) => {
        const src = readFileSync(join(root, file), "utf8");
        const list = /readonly WEB_FILES=\(([\s\S]*?)\)/.exec(src)?.[1];
        expect(list, `${file} WEB_FILES`).toBeTruthy();
        const names = list.trim().split(/\s+/);
        expect(names, file).toContain("icon.svg");
        return names;
      });
    // build-tarball.sh ships "the same web payload" as build-deb.sh;
    // hold the two hand-maintained lists to that promise.
    expect(lists[1], "tarball WEB_FILES").toEqual(lists[0]);
    const makefile = readFileSync(join(root, "macos/Makefile"), "utf8");
    const cp = /cp \.\.\/web\/index\.html[\s\S]*?\$\(OSMIUM\)/.exec(makefile)?.[0];
    expect(cp, "macOS staging cp").toBeTruthy();
    expect(cp).toContain("../web/icon.svg");
  });

  it("keeps the MACE LGPL notice in every bundle that ships the decoder", () => {
    // The /*! legal comment in core/data/mace.ts is the shipped LGPL
    // notice; esbuild drops /* comments, so one character or a
    // --legal-comments flag could strip it from every bundle. Key on
    // the decoder's own table so a new bundle compiling MACE in is
    // covered too — and assert the tables are really there so the
    // check can't pass vacuously.
    // The marker is read out of the source constant, not copied — a
    // regenerated table must fail loudly here, not just look absent.
    const maceSrc = readFileSync(join(root, "core/data/mace.ts"), "utf8");
    const maceMark =
      /MACE_TAB2_B64\s*=\s*"([A-Za-z0-9+/=]{16})/.exec(maceSrc)?.[1];
    expect(maceMark, "MACE_TAB2_B64 marker in mace.ts").toBeTruthy();
    const dist = join(fixture, "dist");
    const bundles = readdirSync(dist)
      .filter((f) => /\.[cm]?js$/.test(f));
    const withMace = bundles.filter((f) =>
      readFileSync(join(dist, f), "utf8").includes(maceMark));
    expect(withMace.sort()).toEqual(["addons.js", "bundle.js"]);
    for (const f of withMace) {
      const js = readFileSync(join(dist, f), "utf8");
      expect(js, f).toContain("SPDX-License-Identifier: LGPL-2.1-or-later");
      expect(js, f).toContain("Laszlo Torok");
    }
  });
});
