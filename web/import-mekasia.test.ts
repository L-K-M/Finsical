import { afterEach, describe, expect, it, vi } from "vitest";
import { COLLECTIONS, listAddons, sceneryFix, type PackSection }
  from "./import.js";

const enc = new TextEncoder();

/** A stored (method 0) zip of top-level entries, as import.test.ts
 * builds them. */
function buildZip(entries: { name: string; data: Uint8Array }[]):
    Uint8Array {
  const recs = entries.map((e) => ({ n: enc.encode(e.name), d: e.data }));
  const lhLen = recs.reduce((s, r) => s + 30 + r.n.length + r.d.length, 0);
  const cdLen = recs.reduce((s, r) => s + 46 + r.n.length, 0);
  const out = new Uint8Array(lhLen + cdLen + 22);
  const v = new DataView(out.buffer);
  let p = 0;
  const offs: number[] = [];
  for (const r of recs) {
    offs.push(p);
    v.setUint32(p, 0x04034b50, true);
    v.setUint16(p + 4, 20, true);
    v.setUint32(p + 18, r.d.length, true);
    v.setUint32(p + 22, r.d.length, true);
    v.setUint16(p + 26, r.n.length, true);
    out.set(r.n, p + 30);
    out.set(r.d, p + 30 + r.n.length);
    p += 30 + r.n.length + r.d.length;
  }
  const cd = p;
  recs.forEach((r, i) => {
    v.setUint32(p, 0x02014b50, true);
    v.setUint32(p + 20, r.d.length, true);
    v.setUint32(p + 24, r.d.length, true);
    v.setUint16(p + 28, r.n.length, true);
    v.setUint32(p + 42, offs[i]!, true);
    out.set(r.n, p + 46);
    p += 46 + r.n.length;
  });
  v.setUint32(p, 0x06054b50, true);
  v.setUint16(p + 8, recs.length, true);
  v.setUint16(p + 10, recs.length, true);
  v.setUint32(p + 12, cdLen, true);
  v.setUint32(p + 16, cd, true);
  return out;
}

const pack = new Uint8Array([1, 2, 3]);
// Like the real mekaccs.zip: accessories with the story's gravel beside
// them. mekplants.zip gets a stray accessory to prove the filter.
const zips: Record<string, Uint8Array> = {
  "mekaccs.zip": buildZip([
    { name: "MekaUni.acc", data: pack },
    { name: "G_Debris.grv", data: pack },
    { name: "Crystal.ACC", data: pack },
  ]),
  "mekplants.zip": buildZip([
    { name: "Mekaweed.plt", data: pack },
    { name: "Stray.acc", data: pack },
  ]),
};

afterEach(() => vi.unstubAllGlobals());

describe("the Mekasia collections", () => {
  it("list each kind of pack under its own section only", async () => {
    vi.stubGlobal("fetch", async (u: string | URL) => {
      const z = zips[String(u).split("/").pop()!];
      if (!z) return new Response(null, { status: 404 });
      return new Response(new Blob([z.slice()]));
    });
    const items = await listAddons((c) => c.outer.startsWith("mekasia.zip/"));
    const by = (section: string) => items
      .filter((i) => i.section === section).map((i) => i.inner).sort();
    expect(by("accessories")).toEqual(["Crystal", "MekaUni"]);
    expect(by("gravel")).toEqual(["G_Debris"]);
    expect(by("plants")).toEqual(["Mekaweed"]);
  });

  it("never let a scenery section take another scenery kind", () => {
    const own: Record<string, string> =
      { plants: "x.plt", accessories: "x.acc", gravel: "x.grv" };
    for (const c of COLLECTIONS) {
      // Page-listed collections (gravel.zip) offer one add-on zip per
      // link; nested and loose-file ones pick entries by extension, and
      // a missing `exts` falls back to every pack extension.
      if (!own[c.section] || (!c.outer.includes("/") && !c.prefix))
        continue;
      expect(c.exts, `${c.section} ${c.outer}`).toBeDefined();
      for (const [section, file] of Object.entries(own))
        expect(c.exts!.test(file), `${c.outer} vs ${file}`)
          .toBe(section === c.section);
    }
  });
});

describe("sceneryFix", () => {
  const url = "https://archive.org/download/aquazonewithguppiesandaddons/" +
    "mekasia.zip/mekaccs.zip#G_Debris.grv";

  it("moves a gravel pack saved as an accessory to the gravel", () => {
    const saved = { section: "accessories" as PackSection,
                    inner: "G_Debris", url, sounds: [] };
    expect(sceneryFix(saved)).toEqual({ ...saved, section: "gravel" });
    const caps = { ...saved, url: url.replace(".grv", ".GRV") };
    expect(sceneryFix(caps)).toEqual({ ...caps, section: "gravel" });
  });

  it("moves an accessory saved as a plant to the accessories", () => {
    const stray = { section: "plants" as PackSection, inner: "Stray",
                    sounds: [],
                    url: url.replace("mekaccs.zip#G_Debris.grv",
                                     "mekplants.zip#Stray.acc") };
    expect(sceneryFix(stray)).toEqual({ ...stray, section: "accessories" });
  });

  it("leaves records that already match their pack alone", () => {
    const ok = { section: "gravel" as PackSection, inner: "G_Debris", url };
    expect(sceneryFix(ok)).toBe(ok);
    const acc = { section: "accessories" as PackSection, inner: "MekaUni",
                  url: url.replace("G_Debris.grv", "MekaUni.acc") };
    expect(sceneryFix(acc)).toBe(acc);
  });

  it("never touches fish, sounds, backdrops or tanks", () => {
    for (const section of ["fish", "sounds", "backgrounds", "tanks"] as
         PackSection[]) {
      const it = { section, inner: "x", url };
      expect(sceneryFix(it)).toBe(it);
    }
  });

  it("keeps records whose url names no scenery extension", () => {
    const it = { section: "plants" as PackSection, inner: "x",
                 url: "https://archive.org/download/x/y.zip#weed" };
    expect(sceneryFix(it)).toBe(it);
    // An extension that names an Object.prototype member, not a section.
    for (const ext of ["constructor", "Constructor"]) {
      const odd = { ...it, url: `https://archive.org/download/x/y.${ext}` };
      expect(sceneryFix(odd)).toBe(odd);
    }
  });
});
