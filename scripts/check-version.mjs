#!/usr/bin/env node
// Fail when the version numbers the project publishes disagree.
// Usage: node scripts/check-version.mjs
//
// scripts/release.sh bumps all three in one commit; this catches a hand
// edit or a release that skipped one. Plain regexes rather than a plist
// parser: CI's Linux runner has no PlistBuddy, and the script must not
// add dependencies.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

/** The first capture group of `pattern` in `path`, or null when absent. */
function find(path, pattern) {
  return read(path).match(pattern)?.[1] ?? null;
}

const sources = [
  ["package.json", JSON.parse(read("package.json")).version ?? null],
  ["macos/Info.plist CFBundleShortVersionString",
   find("macos/Info.plist",
        /<key>CFBundleShortVersionString<\/key>\s*<string>([^<]*)<\/string>/)],
  ["README.md version marker",
   find("README.md", /<!-- version -->([^<]*)<!-- \/version -->/)],
];

const missing = sources.filter(([, version]) => !version);
for (const [name] of missing) console.error(`No version found in ${name}.`);

const versions = new Set(sources.map(([, version]) => version));
if (missing.length || versions.size !== 1) {
  for (const [name, version] of sources)
    console.error(`  ${name}: ${version ?? "(missing)"}`);
  console.error("Versions must agree; scripts/release.sh keeps them in step.");
  process.exit(1);
}

console.log(`Versions agree: ${sources[0][1]}`);
