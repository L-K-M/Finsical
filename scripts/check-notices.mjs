#!/usr/bin/env node
// Fail when the hand-written notices miss third-party code the web
// build ships.
// Usage: node scripts/check-notices.mjs   (after npm ci)
//
// Every artifact ships THIRD_PARTY_NOTICES.md, and the .deb's copyright
// file is generated from linux/copyright.in. Both are maintained by
// hand, so this rebuilds the bundles in memory with esbuild's metafile
// and checks them against what actually goes in:
// - each npm package compiled into a bundle, or copied by
//   `npm run build`, needs a "## <name>" section in
//   THIRD_PARTY_NOTICES.md that quotes its LICENSE, UNLICENSE,
//   COPYING, COPYRIGHT and NOTICE files verbatim in a ```text block, and a "Files: node_modules/<name>/*"
//   paragraph in linux/copyright.in;
// - each bundled repository file with a /*! legal comment (third-party
//   code such as core/data/mace.ts) must be named in both.
import { build } from "esbuild";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

const NOTICES = "THIRD_PARTY_NOTICES.md";
const COPYRIGHT = "linux/copyright.in";
// L-K-M's own packages, under the Unlicense like Finsical, so they need
// no notice. Their license field is still checked: a relicensed release
// must not pass unnoticed.
const OWN_PACKAGES = new Map([["osmium-ui", "Unlicense"]]);
const LICENSE_FILE = /^(?:(?:UN)?LICEN[CS]E|COPY(?:ING|RIGHT)|NOTICE)/i;

const failures = [];

// The entry points and copied files come from the build script itself,
// so a new bundle or copied file is covered without editing this list.
// esbuild takes options as --name or --name=value, so its other
// arguments are entry points. An option the in-memory build below does
// not mirror fails the check rather than leaving a bundle unchecked.
const MIRRORED_OPTION = /^--(?:bundle|format=iife|outfile=\S+)$/;
const buildScript = JSON.parse(read("package.json")).scripts.build;
const entryPoints = [];
for (const command of buildScript.split(/&&|\|\|?|;/)) {
  const args = command.trim().split(/\s+/);
  const at = args.findIndex((arg) => /(?:^|\/)esbuild$/.test(arg));
  if (at < 0) continue;
  const options = args.slice(at + 1).filter((arg) => arg.startsWith("-"));
  const unmirrored = options.filter((arg) => !MIRRORED_OPTION.test(arg));
  if (!options.includes("--bundle") || unmirrored.length > 0) {
    failures.push(`The build script's "${command.trim()}" is not a ` +
      `--bundle command with only the options this check mirrors ` +
      `(${MIRRORED_OPTION}); update scripts/check-notices.mjs.`);
    continue;
  }
  entryPoints.push(...args.slice(at + 1).filter((arg) => !arg.startsWith("-")));
}
if (entryPoints.length === 0) {
  for (const failure of failures) console.error(failure);
  console.error("No esbuild entry points found in package.json's build script.");
  process.exit(1);
}

// The same options as `npm run build`; write: false keeps dist/ as is.
const { metafile } = await build({
  absWorkingDir: root,
  entryPoints,
  bundle: true,
  format: "iife",
  outdir: "dist",
  write: false,
  metafile: true,
  logLevel: "error",
});

// Inputs with code in some output: tree-shaken modules do not ship.
const shipped = new Set();
for (const output of Object.values(metafile.outputs))
  for (const [path, { bytesInOutput }] of Object.entries(output.inputs))
    if (bytesInOutput > 0) shipped.add(path);

/** node_modules/<name> (or node_modules/@scope/name) holding `path`. */
function packageDir(path) {
  const match = /^(.*node_modules\/(?:@[^/]+\/)?[^/]+)\//.exec(path);
  return match?.[1] ?? null;
}

const packageDirs = new Set();
for (const path of shipped) {
  const dir = packageDir(path);
  if (dir) packageDirs.add(dir);
}
for (const m of buildScript.matchAll(/node_modules\/(?!\.bin\/)(?:@[^/]+\/)?[^/'"\s]+\//g))
  packageDirs.add(packageDir(m[0]));

const notices = read(NOTICES);
const copyrightPatterns = new Set(
  read(COPYRIGHT).split("\n")
    .filter((line) => line.startsWith("Files:"))
    .flatMap((line) => line.slice("Files:".length).trim().split(/\s+/)),
);

/** The text of `## <heading>` up to the next level-2 heading, or null. */
function section(heading) {
  const start = notices.indexOf(`\n## ${heading}\n`);
  if (start < 0) return null;
  const end = notices.indexOf("\n## ", start + 1);
  return notices.slice(start, end < 0 ? undefined : end);
}

let thirdParty = 0;
for (const dir of [...packageDirs].sort()) {
  const pkg = JSON.parse(read(`${dir}/package.json`));
  const own = OWN_PACKAGES.get(pkg.name);
  if (own !== undefined) {
    if (pkg.license !== own)
      failures.push(`${pkg.name} is listed as our own ${own} package, but ` +
        `${dir}/package.json says ${JSON.stringify(pkg.license)}.`);
    continue;
  }

  thirdParty += 1;
  const files = readdirSync(join(root, dir), { withFileTypes: true })
    .filter((f) => f.isFile() && LICENSE_FILE.test(f.name))
    .map((f) => f.name);
  if (files.length === 0)
    failures.push(`${pkg.name}: ${dir} has no LICENSE, UNLICENSE, COPYING, ` +
      `COPYRIGHT or NOTICE file; quote its license text from upstream in ${NOTICES}.`);
  const text = section(pkg.name);
  if (text === null) {
    failures.push(`${pkg.name} (${pkg.license}) is bundled but ${NOTICES} ` +
      `has no "## ${pkg.name}" section.`);
  } else {
    for (const file of files) {
      const body = read(`${dir}/${file}`);
      const quoted = "```text\n" + body + (body.endsWith("\n") ? "" : "\n") + "```";
      if (!text.includes(quoted))
        failures.push(`${NOTICES}'s "## ${pkg.name}" section does not quote ` +
          `${dir}/${file} verbatim.`);
    }
  }
  if (!copyrightPatterns.has(`node_modules/${pkg.name}/*`))
    failures.push(`${pkg.name} is bundled but ${COPYRIGHT} has no ` +
      `"Files: node_modules/${pkg.name}/*" paragraph.`);
}

let legal = 0;
for (const path of [...shipped].sort()) {
  if (packageDir(path) || !read(path).includes("/*!")) continue;
  legal += 1;
  if (!notices.includes(`\`${path}\``))
    failures.push(`${path} has a /*! legal comment but ${NOTICES} does not ` +
      `name it.`);
  if (!copyrightPatterns.has(path))
    failures.push(`${path} has a /*! legal comment but no "Files:" ` +
      `paragraph in ${COPYRIGHT} names it.`);
}

if (failures.length) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}
console.log(`Notices cover ${thirdParty} bundled npm package(s) and ` +
  `${legal} file(s) with legal comments.`);
