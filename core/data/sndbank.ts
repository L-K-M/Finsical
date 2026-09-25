/**
 * The Windows game's sound effects: System/AZ_WAVES.REZ, a 9003 pack
 * (see fsh.ts) whose chunks are plain RIFF/WAVE files and whose
 * trailer is a classic Mac resource map stored little-endian:
 *
 *   0x00  u32 data offset (0x100, the value isPack checks), u32 map
 *         offset, u32 data length, u32 map length
 *   map   16-byte header copy, 8 reserved bytes, u16 type list offset
 *         and u16 name list offset (both from the map), then u16 type
 *         count - 1. Unlike a Mac map's, the type list offset (30)
 *         points past the count.
 *   types 8-byte entries: the type code byte-reversed (" dns" for
 *         'snd '), u16 count - 1, u16 reference list offset (from the
 *         type list)
 *   refs  12-byte entries: i16 id, i16 name offset (-1: none), u32 data
 *         offset from the data offset (high byte: attributes), u32 spare
 *   data  u32 length, then the payload
 *
 * Fish and scenery packs share the layout. The bank names none of its
 * 25 sounds, but the Mac build's resource fork carries the same 25 ids
 * with names, so records take those names: the tank looks sounds up by
 * name, and a Mac user's fork then decodes to the same records as the
 * Windows bank.
 */
import { isPack } from "./fsh.js";

/** 'snd ' resource names from the Mac build (AQUAZONE 1.5 on the
 * Deluxe II disc), by id. Where the event is known it comes from the
 * Mac code that plays the id. */
export const GAME_SOUND_NAMES: ReadonlyMap<number, string> = new Map([
  // Glass taps, by where the tap lands.
  [1000, "CENTER*"], [1001, "SIDE"], [1002, "TOP*"], [1003, "BOTTOM*"],
  [2203, "IntoWaterBig"],  // a backdrop, gravel, plant or accessory goes in
  [2671, "letoutWater"],   // a fish or its eggs are taken out
  [7462, "ChangeWater"],   // the "Changing water." event
  [7650, "TimerOnOff"],
  [8074, "WashFilter"],    // the "Cleaning the filter." event
  [9000, "AZ bubble 9003"], // the filter's bubbling, looped
  [9001, "aqua"],          // played once as an aquarium opens
  [13439, "Switch"],       // the light switch
  [13606, "pipopa"],
  [16016, "Drop"],         // food or medicine goes in
  [16517, "EventPreg"],
  [17232, "IntoWater"],    // a fish or eggs go in
  [21371, "EventSick"],
  [24413, "add"],
  [25304, "EventBirth"],
  [26118, "set"],
  [27034, "EventTiyu"],    // chiyu, a fish has recovered
  [28916, "EventCouple"],
  [29264, "EventEgg"],     // also each letter in the Mekasia story
  [29727, "TimerSet"],
  [32080, "EventDead"],
]);

/** Install feedback and the add-on browser's Play button use a set's
 * first record, so the bubbling leads rather than a 40 ms tap click. */
const LEAD_ID = 9000;

const SND_REVERSED = [0x20, 0x64, 0x6e, 0x73]; // " dns"

export interface BankSound { name: string; wav: Uint8Array }

const ascii = (d: Uint8Array, o: number, s: string): boolean =>
  [...s].every((c, i) => d[o + i] === c.charCodeAt(0));

/** The WAV sounds in a 9003 sound bank, bubbling first and then by id;
 * [] for any other pack (fish, scenery) or a map that doesn't parse.
 * Out-of-bounds entries are skipped one by one. */
export function bankSounds(d: Uint8Array): BankSound[] {
  if (!isPack(d)) return [];
  const v = new DataView(d.buffer, d.byteOffset, d.byteLength);
  const u16 = (o: number) => v.getUint16(o, true);
  const u32 = (o: number) => v.getUint32(o, true);
  const dataOff = u32(0), mapOff = u32(4);
  if (mapOff + 28 > d.length) return [];
  const typeList = mapOff + u16(mapOff + 24);
  const nameList = mapOff + u16(mapOff + 26);
  if (typeList < mapOff + 2 || typeList > d.length) return [];

  const found: { id: number; rec: BankSound }[] = [];
  const ntypes = u16(typeList - 2) + 1;
  for (let t = 0; t < ntypes; t++) {
    const e = typeList + t * 8;
    if (e + 8 > d.length) break;
    if (!SND_REVERSED.every((b, i) => d[e + i] === b)) continue;
    const count = u16(e + 4) + 1;
    const refs = typeList + u16(e + 6);
    for (let j = 0; j < count; j++) {
      const r = refs + j * 12;
      if (r + 12 > d.length) break;
      const id = v.getInt16(r, true);
      const nameOff = v.getInt16(r + 2, true);
      const at = dataOff + (u32(r + 4) & 0xFFFFFF);
      if (at + 4 > d.length) continue;
      const len = u32(at);
      if (at + 4 + len > d.length) continue;
      const wav = d.subarray(at + 4, at + 4 + len);
      if (len < 12 || !ascii(wav, 0, "RIFF") || !ascii(wav, 8, "WAVE"))
        continue;
      const name = pascal(d, nameOff < 0 ? -1 : nameList + nameOff) ??
        GAME_SOUND_NAMES.get(id) ?? `snd_${id & 0xFFFF}`;
      found.push({ id, rec: { name, wav } });
    }
  }
  found.sort((a, b) => a.id === LEAD_ID ? -1 : b.id === LEAD_ID ? 1
                                                 : a.id - b.id);
  return found.map((f) => f.rec);
}

/** A Pascal string at `p` (read as latin1), or null for -1, an empty
 * name or one that runs off the end. */
function pascal(d: Uint8Array, p: number): string | null {
  if (p < 0 || p >= d.length) return null;
  const n = d[p]!;
  if (!n || p + 1 + n > d.length) return null;
  return String.fromCharCode(...d.subarray(p + 1, p + 1 + n));
}
