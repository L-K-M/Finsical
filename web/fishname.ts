/**
 * Fish names: what an owner calls a fish, and what the tank shows for
 * it. A named fish goes by its name everywhere (tags, the hover tip,
 * Get Info, Overview, Stats, notices); an unnamed one by its species.
 */

/** Longest name kept, in characters: about what a name tag or the Get
 * Info title shows before it trims. */
export const NAME_MAX = 24;

/** A name as stored: control and format characters (zero-width
 * spaces, bidi overrides) dropped, runs of whitespace
 * folded to one space, trimmed and cut to NAME_MAX. Undefined when
 * nothing is left or `raw` isn't a string, which clears the name (the
 * fish goes back to its species). Saves and bus messages are untrusted,
 * so both pass through here. */
export function cleanFishName(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  // Cc: controls. Cf: invisible format characters, which could leave a
  // blank tag or, as bidi overrides, reorder the text around the name.
  const s = raw.replace(/[\p{Cc}\p{Cf}]/gu, "")
    .replace(/\s+/g, " ").trim();
  // Cut by code point so a name never ends in half a surrogate pair.
  const cut = Array.from(s).slice(0, NAME_MAX).join("").trimEnd();
  return cut || undefined;
}

/** What the tank calls a fish: its name, else its species, else
 * "Fish" (a stand-in with no species). The pages call it on bus data,
 * so a field that isn't a string counts as missing. */
export function fishLabel(f: { name?: unknown; species?: unknown }): string {
  if (typeof f.name === "string" && f.name.trim()) return f.name;
  if (typeof f.species === "string" && f.species) return f.species;
  return "Fish";
}
