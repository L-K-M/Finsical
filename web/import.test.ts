import { afterAll, describe, expect, it, vi } from "vitest";
import { browserGeometry, DECOR_COPIES_MAX, fragDecode, fragEncode,
         importAddon, installProblem, listAddons, loadProblem,
         transientFailure, isListed, orphanedSounds,
         qualifySoundItemName, recordAddon } from "./import.js";
import type { Importable } from "./import.js";

const enc = new TextEncoder();

/** Minimal multi-entry stored zip (method 0) — same layout as
 * core/data/zip.test.ts's buildZip, extended to N entries and raw
 * name bytes (for Shift_JIS archives). */
function buildZip(entries: { name: string | Uint8Array;
                             data: Uint8Array }[]): Uint8Array {
  const recs = entries.map((e) => ({
    n: typeof e.name === "string" ? enc.encode(e.name) : e.name,
    d: e.data,
  }));
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
    // flags (p+6) stay 0 — no UTF-8 marker, like the JPN archives
    v.setUint16(p + 8, 0, true);          // stored
    v.setUint32(p + 14, 0, true);         // crc (reader ignores it)
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
    v.setUint16(p + 10, 0, true);         // method: stored
    v.setUint32(p + 16, 0, true);         // crc
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

// Real name bytes from the JPN set's bonus bundle — Shift_JIS, UTF-8
// flag unset. The inner Mac archive and the mp3 leaf inside it.
const MACZIP_NAME = new Uint8Array([
  65, 81, 85, 65, 90, 79, 78, 69, 32, 148, 241, 148, 132, 149, 105,
  139, 108, 130, 223, 141, 135, 130, 237, 130, 185, 47, 65, 81, 85,
  65, 90, 79, 78, 69, 32, 131, 125, 131, 98, 131, 76, 131, 147, 131,
  116, 131, 66, 131, 98, 131, 86, 131, 133, 129, 105, 77, 65, 67,
  144, 234, 151, 112, 129, 106, 46, 122, 105, 112]);
const MP3_LEAF = new Uint8Array([
  65, 81, 85, 65, 90, 79, 78, 69, 32, 131, 125, 131, 98, 131, 76, 131,
  147, 131, 116, 131, 66, 131, 98, 131, 86, 131, 133, 129, 105, 77, 65,
  67, 144, 234, 151, 112, 129, 106, 47, 77, 97, 99, 105, 110, 102, 105,
  115, 104, 46, 109, 112, 51]);
const MP3_BYTES = new Uint8Array([0x49, 0x44, 0x33, 0x04, 1, 2, 3]); // ID3

const innerZip = buildZip([
  { name: MP3_LEAF, data: MP3_BYTES },
  { name: "dup.mp3", data: MP3_BYTES },
  { name: "sub/dup.mp3", data: MP3_BYTES },
  // A literal '#' in an entry name — must not break the URL's
  // fragment chain.
  { name: "hash#tag.mp3", data: MP3_BYTES },
]);
const outerZip = buildZip([
  { name: "dir/", data: new Uint8Array(0) },
  { name: "dir/Tamatama.fsh", data: new Uint8Array([1, 2, 3]) },
  { name: "dir/notreally.zip", data: enc.encode("not a zip") },
  { name: MACZIP_NAME, data: innerZip },
]);

vi.stubGlobal("fetch", async (u: string | URL) => {
  const s = String(u);
  if (s.endsWith(".zip"))
    return { ok: true,
             arrayBuffer: async () =>
               outerZip.buffer.slice(outerZip.byteOffset,
                                     outerZip.byteOffset +
                                       outerZip.byteLength) };
  return { ok: false, status: 404,
           text: async () => "", arrayBuffer: async () => new ArrayBuffer(0) };
});
afterAll(() => vi.unstubAllGlobals());

describe("archive.org nested collections", () => {
  it("lists sounds two zips deep and fish in subdirectories", async () => {
    const items = await listAddons();
    const sounds = items.filter((i) => i.section === "sounds");
    expect(sounds).toHaveLength(4);
    expect(sounds[0]!.inner).toBe("Macinfish");
    // Same-stem leaves in different subdirs must not alias — the
    // colliding one keeps its path-qualified name.
    expect(sounds.map((i) => i.inner).sort())
      .toEqual(["Macinfish", "dup", "hash#tag", "sub/dup"]);
    // zipUrl#innerMacZip#leaf — the entry chain is the identity.
    expect(sounds[0]!.url.split("#")).toHaveLength(3);
    expect(sounds[0]!.url).toContain(
      encodeURIComponent("AQUAZONE 非売品詰め合わせ.zip"));
    const fish = items.filter((i) => i.section === "fish");
    expect(fish.some((i) => i.inner === "Tamatama")).toBe(true);
    expect(fish.find((i) => i.inner === "Tamatama")!.url.split("#"))
      .toHaveLength(2);
  });

  it("survives a .zip-named entry that isn't a zip", async () => {
    // dir/notreally.zip matches `inside` but can't parse — it must be
    // skipped, not sink the collection's whole listing.
    const items = await listAddons();
    expect(items.filter((i) => i.section === "sounds")).toHaveLength(4);
  });

  it("round-trips an entry name containing a '#'", async () => {
    const items = await listAddons();
    const snd = items.find((i) => i.inner === "hash#tag")!;
    // The escaped name keeps the fragment chain at three parts.
    expect(snd.url.split("#")).toHaveLength(3);
    expect(snd.url).toContain("hash%23tag.mp3");
    const rs = await importAddon(snd.url);
    expect(rs[0]!.sounds).toEqual([{ name: "hash#tag", wav: MP3_BYTES }]);
  });

  it("keeps non-escaped names raw so stored URLs stay identical", () => {
    // The URL is the add-on's persisted identity — names without # or
    // % must mint the same string installs recorded before escaping.
    for (const raw of ["マッキンフィッシュ（MAC専用）.zip", "a b.mp3",
                       "dup.mp3"]) {
      expect(fragEncode(raw)).toBe(raw);
      expect(fragDecode(raw)).toBe(raw);
    }
    // Round-trips through the escape.
    expect(fragEncode("a#b.mp3")).toBe("a%23b.mp3");
    expect(fragDecode("a%23b.mp3")).toBe("a#b.mp3");
    // A literal %23 encodes to %2523 and back — order matters.
    expect(fragEncode("a%23b.mp3")).toBe("a%2523b.mp3");
    expect(fragDecode("a%2523b.mp3")).toBe("a%23b.mp3");
  });

  it("imports the nested mp3 as a sound record", async () => {
    const items = await listAddons();
    const snd = items.find((i) => i.section === "sounds")!;
    const rs = await importAddon(snd.url);
    expect(rs).toHaveLength(1);
    expect(rs[0]!.sounds).toEqual([{ name: "Macinfish", wav: MP3_BYTES }]);
  });
});

describe("qualifySoundItemName", () => {
  const rec = (name: string) => ({ name, wav: new Uint8Array(4) });

  it("renames an audio record to a path-qualified inner", () => {
    // The listing disambiguated "dup" to "sub/dup" — the record must
    // carry that identity or a separately-installed sibling aliases it.
    const rs = qualifySoundItemName([rec("dup")], "sub/dup");
    expect(rs.map((r) => r.name)).toEqual(["sub/dup"]);
  });

  it("renames a numeric-suffix inner the same way", () => {
    const rs = qualifySoundItemName([rec("dup")], "dup (2)");
    expect(rs.map((r) => r.name)).toEqual(["dup (2)"]);
  });

  it("leaves unqualified names and fork records alone", () => {
    expect(qualifySoundItemName([rec("Macinfish")], "Macinfish")
      .map((r) => r.name)).toEqual(["Macinfish"]);
    // 'snd ' record names come from the resource, not the filename.
    expect(qualifySoundItemName([rec("tap"), rec("bloop")], "sounds")
      .map((r) => r.name)).toEqual(["tap", "bloop"]);
  });

  it("keeps fork record names under a path-qualified inner", () => {
    expect(qualifySoundItemName([rec("tap"), rec("bloop")], "sub/sounds")
      .map((r) => r.name)).toEqual(["tap", "bloop"]);
  });

  it("qualifies only the record matching the leaf stem", () => {
    // Mixed batch: the leaf-stem record takes the item identity while
    // a sibling 'snd ' record keeps its own name.
    expect(qualifySoundItemName([rec("dup"), rec("tap")], "dup (2)")
      .map((r) => r.name)).toEqual(["dup (2)", "tap"]);
    // Qualifier + extension both strip before the stem compare.
    expect(qualifySoundItemName([rec("dup")], "dup (2).mp3")
      .map((r) => r.name)).toEqual(["dup (2).mp3"]);
  });
});

describe("recordAddon", () => {
  const it0 = (url: string): Importable =>
    ({ url, inner: url, section: "sounds" }) as Importable;
  it("adds a new install and merges later sound names into it", () => {
    const list: Importable[] = [];
    expect(recordAddon(list, it0("a.zip"), ["x"], "install")).toBe(true);
    expect(recordAddon(list, it0("a.zip"), ["x", "y"], "install")).toBe(true);
    expect(list).toHaveLength(1);
    expect(list[0]!.sounds).toEqual(["x", "y"]);
  });
  it("lets a restore refresh a record but never re-add a removed one", () => {
    const list: Importable[] = [{ ...it0("a.zip"), sounds: ["x"] }];
    expect(recordAddon(list, it0("a.zip"), ["y"], "refresh")).toBe(true);
    expect(list[0]!.sounds).toEqual(["x", "y"]);
    // Removed while its restore was downloading: it stays removed.
    expect(recordAddon(list, it0("gone.zip"), ["z"], "refresh")).toBe(false);
    expect(list).toHaveLength(1);
  });
  it("counts Add Again copies on decor sections only", () => {
    const plant = (url: string): Importable =>
      ({ url, inner: url, section: "plants" });
    const list: Importable[] = [];
    recordAddon(list, plant("a.plt"), [], "install");
    recordAddon(list, plant("a.plt"), [], "install");
    recordAddon(list, plant("a.plt"), [], "install");
    expect(list[0]!.copies).toBe(3);
    // A restore refreshes the record — it isn't another copy.
    recordAddon(list, plant("a.plt"), [], "refresh");
    expect(list[0]!.copies).toBe(3);
    // Fish and sound packs never carry a count.
    recordAddon(list, it0("s.rez"), [], "install");
    recordAddon(list, it0("s.rez"), [], "install");
    expect(list[1]!.copies).toBeUndefined();
  });
  it("strips a caller-supplied copies field on first install", () => {
    const list: Importable[] = [];
    recordAddon(list, { url: "a.plt", inner: "a.plt",
                        section: "plants", copies: 99 }, [], "install");
    expect(list[0]!.copies).toBeUndefined();
  });
  it("caps the copy count and clamps corrupt values", () => {
    const plant = (url: string): Importable =>
      ({ url, inner: url, section: "plants" });
    const list: Importable[] = [];
    for (let i = 0; i < DECOR_COPIES_MAX + 2; i++)
      recordAddon(list, plant("a.plt"), [], "install");
    expect(list[0]!.copies).toBe(DECOR_COPIES_MAX);
    // A corrupt persisted count can't grow the record past the cap.
    list[0]!.copies = -7;
    recordAddon(list, plant("a.plt"), [], "install");
    expect(list[0]!.copies).toBe(2);
  });
});

describe("isListed", () => {
  const it0 = (url: string): Importable =>
    ({ url, inner: url, section: "fish" }) as Importable;
  it("tells a still-installed add-on from one removed since", () => {
    // Removed (or the tank emptied) while its restore or retry was
    // pending: the restore must not bring it back.
    const list = [it0("b.zip"), it0("a.zip")];
    expect(isListed(list, it0("a.zip"))).toBe(true);
    expect(isListed(list, it0("gone.zip"))).toBe(false);
    expect(isListed([], it0("a.zip"))).toBe(false);
  });
});

describe("orphanedSounds", () => {
  const addon = (url: string, sounds?: string[]) =>
    ({ section: "sounds", inner: url, url, ...(sounds ? { sounds } : {}) });
  it("returns names only the leaving add-ons owned", () => {
    expect(orphanedSounds(
      [addon("a.zip", ["tap", "drop"])], [addon("b.zip", ["aqua"])]))
      .toEqual(["tap", "drop"]);
  });
  it("keeps a name a surviving add-on still claims", () => {
    // Two add-ons can ship a same-named record — the survivor's copy
    // is the one in the store, so the name must not be dropped.
    expect(orphanedSounds(
      [addon("a.zip", ["bubbles"])], [addon("b.zip", ["bubbles"])]))
      .toEqual([]);
  });
  it("treats add-ons without recorded sounds as contributing none", () => {
    expect(orphanedSounds([addon("a.zip")], [addon("b.zip")]))
      .toEqual([]);
  });
  it("keeps everything when the leaving add-on still sits in rest", () => {
    // Pins the caller contract: `rest` must already exclude `gone`,
    // otherwise removeAddon silently drops nothing.
    const a = addon("a.zip", ["tap"]);
    expect(orphanedSounds([a], [a, addon("b.zip")])).toEqual([]);
  });
});

describe("browserGeometry", () => {
  it("splits the Import Add-ons window on whole pixels", () => {
    // The 621 x 441 window's content box: 46% would be 284.28.
    expect(browserGeometry(618, 418)).toEqual({ listW: 284, previewH: 180 });
  });
  it("gives the preview's height to the text under it first", () => {
    // 150px of detail column: 55% is 82, but the text needs 99.
    expect(browserGeometry(560, 240)).toEqual({ listW: 257, previewH: 51 });
  });
  it("drops a preview too short to be worth a well", () => {
    expect(browserGeometry(560, 220).previewH).toBeNull();
  });
});

describe("loadProblem", () => {
  it("names the HTTP status instead of the whole URL", () => {
    expect(loadProblem(new Error(
      "https://archive.org/download/x/y.zip: 404")))
      .toBe("archive.org answered with error 404.");
  });
  it("explains a download without an add-on", () => {
    expect(loadProblem(new Error("no pack inside")))
      .toBe("The download has no add-on in it.");
  });
  it("falls back to the connection for network failures", () => {
    expect(loadProblem(new TypeError("Failed to fetch")))
      .toBe("Check the connection and try again.");
  });
});

describe("transientFailure", () => {
  it("treats HTTP, empty, missing-entry and network errors as retriable", () => {
    expect(transientFailure(new Error("https://a/b.zip: 503"))).toBe(true);
    expect(transientFailure(new Error("https://a/b.zip: empty"))).toBe(true);
    expect(transientFailure(new Error("https://a/b.zip: entry missing")))
      .toBe(true);
    expect(transientFailure(new TypeError("Failed to fetch"))).toBe(true);
    expect(transientFailure(new Error("The user aborted a request.")))
      .toBe(true);
  });
  it("treats decode and validation failures as final", () => {
    expect(transientFailure(new Error("no pack inside"))).toBe(false);
    expect(transientFailure(new Error("png: bad signature"))).toBe(false);
    expect(transientFailure(new Error("bad pack format 9"))).toBe(false);
  });
});

describe("installProblem", () => {
  it("explains archive.org failures in one line", () => {
    expect(installProblem(new Error(
      "https://archive.org/download/x/y.zip: 404")))
      .toBe("archive.org answered with error 404.");
    expect(installProblem(new Error("no pack inside")))
      .toBe("The download has no add-on in it.");
  });
  it("passes the tank's own messages through untouched", () => {
    expect(installProblem(
      new Error("cancelled — the tank was emptied mid-install")))
      .toBe("cancelled — the tank was emptied mid-install");
    expect(installProblem(new Error("png: bad signature")))
      .toBe("png: bad signature");
    expect(installProblem("The tank already has 12 fish."))
      .toBe("The tank already has 12 fish.");
  });
});
