/**
 * .azn import: AquaZone's tank document, a saved aquarium holding its
 * backdrop, gravel, plants, accessories and equipment.
 *
 * The file is a 9003inc resource pack (see rsrc.ts). The layout lives
 * in these records:
 *
 *   AQUA  one per file: u16@8 tank height, u16@10 width, in the
 *         original's pixels. A pack without a nonzero AQUA size is
 *         not a tank.
 *   PlTI  a plant species: the map name is the species name, u16@8
 *         the frame count, and its art the PLPC ids id..id+n-1.
 *   PlPI  one placed plant, 270 bytes: a Pascal species name at @0
 *         and a box at the tail (u16@260 h, @262 w, @264 x, @266 top,
 *         @268 depth). Plants draw stretched to w x h, which often
 *         differs from the frame size.
 *   AccI  one placed accessory whose resource id is the art's base
 *         id: u16@0 x, @2 top, @4 depth, @10 frame count; the ACPC
 *         ids base..base+n-1 are its frames and the first frame's
 *         size is the item's w x h. Bytes 6-9 and 14-15 hold flags
 *         whose meaning is unknown; they are ignored.
 *   PLPC, ACPC  8-bit BMP frames (see bmp.ts).
 *
 * The PlPO/PlPS/PTSN records (a per-plant size-preset index, the size
 * presets and the preset count) go unread: PlPI already stores the
 * size the owner chose, the presets only describe how it was picked.
 *
 * Item order is all plants in PlPI order, then all accessories in
 * AccI order; callers key saved positions by it, so keep it
 * deterministic.
 */
import type { IndexedImage } from "./azpack.js";
import { decodeBmp } from "./bmp.js";
import { u16 } from "./bytes.js";
import { MAX_DECOR_FRAMES } from "./decor.js";
import { isPack } from "./fsh.js";
import { packResources, type PackResource } from "./rsrc.js";

export const TANK_DEPTH_MAX = 400;   // stored depths run 0 (back) to 400 (front)
export const TANK_ITEMS_MAX = 64;    // bound on items read from one file (untrusted input)

export type TankItemKind = "plant" | "accessory";

export interface TankItem {
  kind: TankItemKind;
  /** Species name for plants, the AccI map name for accessories. */
  name: string | null;
  frames: IndexedImage[];
  /** Box in tank pixels, as stored; callers map and clamp. */
  x: number;
  top: number;
  w: number;
  h: number;
  /** Stored depth normalized to 0 (back) .. 1 (front). */
  depth: number;
}

export interface TankLayout {
  width: number;
  height: number;
  items: TankItem[];
}

/** Record sizes the fields below need; shorter records are skipped. */
const AQUA_SIZE = 12;
const PLPI_SIZE = 270;
const ACCI_SIZE = 12;
/** PlTI frame-count field: u16@8, so a payload under 10 bytes has none. */
const PLTI_COUNT_MIN = 10;

/** A record's claimed frame count, bounded to 1..MAX_DECOR_FRAMES. */
const frameCount = (n: number) => Math.min(MAX_DECOR_FRAMES, Math.max(1, n));

/** The Pascal species name heading a PlPI: a length byte, then that
 * many bytes mapped through char codes, clipped to the record. */
function pascalString(p: Uint8Array): string {
  const n = Math.min(p[0] ?? 0, p.length - 1);
  let s = "";
  for (let i = 0; i < n; i++) s += String.fromCharCode(p[1 + i]!);
  return s;
}

/** The tank in an .azn, or null when the data is not a tank file. */
export function tankLayout(d: Uint8Array): TankLayout | null {
  if (!isPack(d)) return null;
  let res: PackResource[];
  try {
    res = packResources(d);
  } catch {
    return null;
  }
  const aqua = res.find((r) => r.type === "AQUA");
  if (!aqua || aqua.payload.length < AQUA_SIZE) return null;
  const height = u16(aqua.payload, 8), width = u16(aqua.payload, 10);
  if (!width || !height) return null;

  // Frame art resolves by (type, id); species resolve by map name.
  // First wins for both, matching the original's lookup.
  const byId = new Map<string, PackResource>();
  const species = new Map<string, PackResource>();
  for (const r of res) {
    const k = `${r.type}/${r.id}`;
    if (!byId.has(k)) byId.set(k, r);
    if (r.type === "PlTI" && r.name !== null && !species.has(r.name))
      species.set(r.name, r);
  }

  // Each (type, id) decodes at most once, so items sharing art (the
  // usual case: several plants of one species) hold the same
  // IndexedImage objects.
  const decoded = new Map<string, IndexedImage | null>();
  const frameImage = (type: string, id: number): IndexedImage | null => {
    const k = `${type}/${id}`;
    if (decoded.has(k)) return decoded.get(k) ?? null;
    let img: IndexedImage | null = null;
    const r = byId.get(k);
    if (r) {
      try {
        img = decodeBmp(r.payload);
      } catch {
        img = null; // decodeBmp throws on hostile headers
      }
    }
    decoded.set(k, img);
    return img;
  };

  // The frame run base..base+n-1 ends at the first id gap, bad BMP or
  // size change; whatever decoded before the break is what it keeps.
  const collect = (type: string, base: number, n: number): IndexedImage[] => {
    const out: IndexedImage[] = [];
    for (let i = 0; i < n; i++) {
      const img = frameImage(type, base + i);
      const first = out[0];
      if (!img || (first && (img.w !== first.w || img.h !== first.h)))
        break;
      out.push(img);
    }
    return out;
  };

  const plant = (r: PackResource): TankItem | null => {
    const p = r.payload;
    if (p.length < PLPI_SIZE) return null;
    const sp = species.get(pascalString(p));
    if (!sp) return null;
    const h = u16(p, 260), w = u16(p, 262);
    if (!w || !h) return null;
    const n = frameCount(sp.payload.length >= PLTI_COUNT_MIN
      ? u16(sp.payload, 8) : 1);
    const f = collect("PLPC", sp.id, n);
    if (!f.length) return null;
    return {
      kind: "plant", name: sp.name, frames: f,
      x: u16(p, 264), top: u16(p, 266), w, h,
      depth: Math.min(1, Math.max(0, u16(p, 268) / TANK_DEPTH_MAX)),
    };
  };

  const accessory = (r: PackResource): TankItem | null => {
    const p = r.payload;
    if (p.length < ACCI_SIZE) return null;
    const f = collect("ACPC", r.id, frameCount(u16(p, 10)));
    const first = f[0];
    if (!first) return null;
    return {
      kind: "accessory", name: r.name, frames: f,
      x: u16(p, 0), top: u16(p, 2), w: first.w, h: first.h,
      depth: Math.min(1, Math.max(0, u16(p, 4) / TANK_DEPTH_MAX)),
    };
  };

  const items: TankItem[] = [];
  for (const r of res) {
    if (items.length >= TANK_ITEMS_MAX) break;
    if (r.type !== "PlPI") continue;
    const it = plant(r);
    if (it) items.push(it);
  }
  for (const r of res) {
    if (items.length >= TANK_ITEMS_MAX) break;
    if (r.type !== "AccI") continue;
    const it = accessory(r);
    if (it) items.push(it);
  }
  return { width, height, items };
}
