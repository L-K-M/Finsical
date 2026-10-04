import { afterEach, describe, expect, it, vi } from "vitest";
import { ownBytes } from "../core/data/bytes.js";
import { buildPict, rect } from "../core/data/pict.fixture.js";
import { buildRsrc, wrapAppledouble } from "../core/data/resfork.fixture.js";

// The bytes a dropped file left in IndexedDB; archive downloads are
// cached nowhere in node.
const stored = vi.hoisted(() => new Map<string, Uint8Array>());
vi.mock("./store.js", async (orig) => ({
  ...await orig<typeof import("./store.js")>(),
  packGet: async (url: string) => stored.get(url) ?? null,
  packPut: async () => true,
  metaGet: async () => null,
  metaPut: async () => true,
}));
const { importAddon, listAddons, loadProblem, macDisplayName, sceneryFix,
        usablePacks } = await import("./import.js");

afterEach(() => {
  vi.unstubAllGlobals();
  stored.clear();
});

const ITEM = "https://archive.org/download/aquazonewithguppiesandaddons";
const SEVEN_Z = `${ITEM}/Missing%20addons%20Aquazone.7z`;
const FOLDER = "Spare interesting things/Misc Macintosh files/";
/** Where archive.org really serves an entry: under the folder the 7z
 * stores, not the one its listing names. */
const served = (name: string) => `${SEVEN_Z}/` +
  encodeURIComponent(`Missing addons Aquazone/${FOLDER}${name}`);
/** An archive view row, the whole entry path in one encoded segment,
 * under the top folder the listing gets wrong. */
const row = (name: string) =>
  `<a href="//archive.org/download/aquazonewithguppiesandaddons/` +
  `Missing%20addons%20Aquazone.7z/` +
  `${encodeURIComponent(`addons Aquazone/${FOLDER}${name}`)}">x</a>`;

type Entry = [number, string | null, number, Uint8Array];
/** A playable 'snd ': format 2, one bufferCmd, 8-bit samples. */
function snd(pcm: number[]): Uint8Array {
  const out = new Uint8Array(14 + 22 + pcm.length);
  const v = new DataView(out.buffer);
  v.setUint16(0, 2); v.setUint16(4, 1);           // format 2, one command
  v.setUint16(6, 0x8050); v.setUint32(10, 14);    // bufferCmd -> header
  v.setUint32(14 + 4, 1);                         // one channel
  v.setUint32(14 + 8, 11025 * 65536);
  out.set(pcm, 36);
  return out;
}
const CLUT: [number, number, number][] = [[255, 255, 255], [40, 80, 160]];
const pict = (w: number, h: number, file = false) => buildPict({
  file, frame: rect(0, 0, h, w),
  ops: [{ kind: "indexed", depth: 8, w, h, clut: CLUT,
          px: Array.from({ length: w * h }, (_, i) => i < w ? 0 : 1) }],
});
/** A gravel add-on's AppleDouble companion; `withSound` adds a 'snd '. */
const gravelCompanion = (withSound = false) => wrapAppledouble(buildRsrc(
  new Map<string, Entry[]>([
    ["Grvl", [[4020, null, 0, Uint8Array.of(0, 53, 0, 52, 0, 0, 0, 0)]]],
    ["BADP", [[4020, null, 0, pict(64, 48)]]],
    ["BAPC", [[4020, null, 0, pict(500, 60)]]],
    ...withSound ? [["snd ", [[1, "tap", 0, snd([128, 140, 120])]]]] as
      [string, Entry[]][] : [],
  ])));

const serve = (files: Record<string, Uint8Array | string>) =>
  vi.stubGlobal("fetch", async (u: string) => {
    const body = files[String(u)];
    return body === undefined ? new Response(null, { status: 404 })
      : new Response(typeof body === "string" ? body : ownBytes(body));
  });

describe("the 7z's Mac scenery", () => {
  const listing = [
    "._星砂- star sand", "._畳- tatami", "GRAVEL1.sit", "mactools.zip",
    "ãæÇÃÇÊÇ§Ç»äC", "ë€", "青のグラデーション",
  ].map(row).join("\n");

  it("lists PICT backdrops and gravel forks under readable names", async () => {
    serve({ [`${SEVEN_Z}/`]: listing });
    const got = await listAddons(
      (c) => c.outer === "Missing addons Aquazone.7z" &&
             c.section !== "sounds");
    expect(got.map((a) => [a.section, a.inner])).toEqual([
      ["gravel", "星砂- star sand"],
      ["gravel", "畳- tatami"],
      ["backgrounds", "鏡のような海"],
      ["backgrounds", "苔"],
      ["backgrounds", "青のグラデーション"],
    ]);
    // The URL keeps the stored name, mojibake and all.
    expect(got.find((a) => a.inner === "苔")?.url).toBe(served("ë€"));
    expect(got.find((a) => a.inner === "星砂- star sand")?.url)
      .toBe(served("._星砂- star sand"));
  });

  it("decodes a backdrop by its content: a PICT file", async () => {
    serve({ [served("ë€")]: pict(320, 240, true) });
    const rs = await importAddon(served("ë€"));
    expect(rs).toHaveLength(1);
    expect([...rs[0]!.images.values()].map((i) => [i.w, i.h]))
      .toEqual([[320, 240]]);
    expect(rs[0]!.sounds).toEqual([]);
    expect(usablePacks(rs, "backgrounds")).toHaveLength(1);
  });

  it("decodes a gravel by its content: the strip in its fork", async () => {
    serve({ [served("._畳- tatami")]: gravelCompanion() });
    const rs = await importAddon(served("._畳- tatami"));
    expect([...rs[0]!.images.values()].map((i) => [i.w, i.h]))
      .toEqual([[500, 60], [64, 48]]);
    expect(usablePacks(rs, "gravel")).toHaveLength(1);
  });

  it("keeps a picture fork's sounds out: one kind of content per add-on",
     async () => {
    serve({ [served("._星砂- star sand")]: gravelCompanion(true) });
    const rs = await importAddon(served("._星砂- star sand"));
    expect(rs).toHaveLength(1);
    expect(rs[0]!.images.size).toBe(2);
    expect(rs[0]!.sounds).toEqual([]);
  });

  it("says when the pictures can't be read, sounds or not", async () => {
    const broken = wrapAppledouble(buildRsrc(new Map<string, Entry[]>([
      ["BAPC", [[4020, null, 0, Uint8Array.of(1, 2, 3)]]]])));
    serve({ [served("._broken")]: broken });
    const e = await importAddon(served("._broken")).catch((x: unknown) => x);
    expect(String(e)).toMatch(/unreadable picture/);
    expect(loadProblem(e)).toBe("Finsical can't read this add-on's pictures.");
    // A fork with sounds too is still a picture add-on: listed as
    // scenery, it doesn't install as sounds alone.
    const noisy = wrapAppledouble(buildRsrc(new Map<string, Entry[]>([
      ["BAPC", [[4020, null, 0, Uint8Array.of(1, 2, 3)]]],
      ["snd ", [[1, "tap", 0, snd([128, 140, 120])]]]])));
    serve({ [served("._noisy")]: noisy });
    expect(String(await importAddon(served("._noisy"))
      .catch((x: unknown) => x))).toMatch(/unreadable picture/);
  });

  it("never takes an audio file for a picture", async () => {
    // Bytes that sniff as a PICT but don't decode, under an audio name.
    const odd = buildPict({ frame: rect(0, 0, 2, 2), file: true, ops: [
      { kind: "raw", bytes: [0x82, 0x00, 0, 0, 0, 2, 1, 2] }] });
    serve({ [`${ITEM}/odd.wav`]: odd });
    const rs = await importAddon(`${ITEM}/odd.wav`);
    expect(rs.map((r) => r.sounds.map((s) => s.name))).toEqual([["odd"]]);
  });
});

describe("sceneryFix", () => {
  it("leaves a dropped file's section alone: its content decided it",
     () => {
    // A Mac gravel fork that happens to be named like a plant pack.
    for (const url of ["local:bed.plt", "local:._bed.acc"])
      expect(sceneryFix({ section: "gravel", inner: "bed", url }).section)
        .toBe("gravel");
  });
});

describe("dropped Mac pictures at launch", () => {
  it("restore a PICT file as one image", async () => {
    stored.set("local:Astral Hill", pict(320, 240, true));
    const rs = await importAddon("local:Astral Hill");
    expect(rs[0]!.entry).toBe("local:Astral Hill");
    expect([...rs[0]!.images.values()].map((i) => [i.w, i.h]))
      .toEqual([[320, 240]]);
  });

  it("restore a gravel fork's pictures", async () => {
    stored.set("local:._Aqua", gravelCompanion(true));
    const rs = await importAddon("local:._Aqua");
    expect(rs[0]!.images.size).toBe(2);
    expect(rs[0]!.sounds).toEqual([]);
  });
});

describe("macDisplayName", () => {
  it("drops an AppleDouble companion's ._", () => {
    expect(macDisplayName("._苔の絨毯- moss carpet")).toBe("苔の絨毯- moss carpet");
  });

  it("reads Shift-JIS taken for Mac Roman back as Japanese", () => {
    expect(macDisplayName("ãæÇÃÇÊÇ§Ç»äC")).toBe("鏡のような海");
    expect(macDisplayName("ë€")).toBe("苔");
  });

  it("leaves other names alone", () => {
    for (const n of ["青のグラデーション", "Astral Hill", "Café", "ÉSUMÉ"])
      expect(macDisplayName(n)).toBe(n);
  });

  it("leaves accented Latin names that happen to decode alone", () => {
    // Each decodes as Shift-JIS without error, to kanji among letters.
    for (const n of ["Réal", "Noël", "Crème brûlée", "Smörgåsbord",
                     "Ångström"])
      expect(macDisplayName(n)).toBe(n);
  });
});
