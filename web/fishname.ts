/**
 * Fish names: what an owner calls a fish, and what the tank shows for
 * it. A named fish goes by its name everywhere (tags, the hover tip,
 * Get Info, Overview, Stats, notices); an unnamed one by its species.
 */

/** Longest name kept, in characters: about what a name tag or the Get
 * Info title shows before it trims. */
export const NAME_MAX = 24;

/** Zero-width non-joiner and joiner: the format characters a name
 * keeps. Only between visible characters, so never a blank name. */
const JOINERS = "\u200c\u200d";

/** A name as stored: control and format characters (zero-width
 * spaces, bidi overrides) dropped, except the joiners that emoji
 * sequences and some scripts need; runs of whitespace folded to one
 * space, trimmed and cut to NAME_MAX. Undefined when nothing visible is
 * left or `raw` isn't a string, which clears the name (the fish goes
 * back to its species). Saves and bus messages are untrusted, so both
 * pass through here. */
export function cleanFishName(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  // Cc: controls. Cf: invisible format characters, which could leave a
  // blank tag or, as bidi overrides, reorder the text around the name.
  // ZWJ and ZWNJ stay: without them a family emoji falls apart into
  // several, and Persian or Arabic letters join wrongly.
  const s = raw.replace(/[\p{Cc}\p{Cf}]/gu,
                        (c) => JOINERS.includes(c) ? c : "")
    .replace(/\s+/g, " ").trim();
  // Cut by code point so a name never ends in half a surrogate pair,
  // then drop joiners stranded at either end.
  const cut = Array.from(s).slice(0, NAME_MAX).join("")
    .replace(/^[\s\u200c\u200d]+|[\s\u200c\u200d]+$/gu, "");
  return cut || undefined;
}

/** What the tank calls a fish: its name, else its species, else
 * "Fish" (a stand-in with no species). The pages call it on bus data,
 * so a field that isn't a string counts as missing. */
export function fishLabel(f: { name?: unknown; species?: unknown }): string {
  const name = typeof f.name === "string" ? f.name.trim() : "";
  if (name) return name;
  if (typeof f.species === "string" && f.species) return f.species;
  return "Fish";
}
