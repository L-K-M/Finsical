"""Emit a .azpack bundle directory from a 9003inc pack file.

A bundle is:
  manifest.json   — pack metadata + per-chunk records (id, kind, file)
  images/         — BMP chunks and Mac PICT pictures (emit_mac) as
                    indexed PNG, the kind the tank reads
  sprites/        — decoded sprite-stream chunks as PNG sheets
  chunks/         — every chunk's raw payload (id-named), for later decoding
"""
import json
import os
import sys

from .fsh import is_sprite_stream, iter_frames
from .img import bmp_palette, read_bmp_indexed, save_indexed_png
from .macpics import mac_pictures
from .pack import Pack
from .snd import sounds_from_rsrc


def _chunk_name(c):
    rid = f"{c.res_id:04x}" if c.res_id is not None else "anon"
    sub = f"{c.sub:04x}" if c.sub is not None else "0000"
    return f"{rid}_{sub}_{c.pos:x}"


def _sprite_sheet(payload: bytes):
    """Decode a sprite-stream chunk into a grid sheet.

    Returns (groups, frames_per_group, cell_w, cell_h, sheet_idx, dims)
    where dims lists each frame's (group, frame, w, h) in emission order,
    or None if the payload isn't a sprite stream.
    """
    if not is_sprite_stream(payload):
        return None
    frames = []
    ng = nf = 0
    for g, f, fr in iter_frames(payload):
        frames.append((g, f, fr))
        ng = max(ng, g + 1)
        nf = max(nf, f + 1)
    if not frames:
        return None
    cw = max(fr.w for _, _, fr in frames)
    ch = max(fr.h for _, _, fr in frames)
    sw, sh = cw * nf, ch * ng
    # Same cap as core/data/fsh.ts: a corrupt header can claim a grid far
    # larger than the frames filling it, and the buffer below would be
    # allocated and touched before anything noticed. Raise rather than
    # return None so emit() records the reason on the chunk.
    if sw * sh > 1 << 26:
        raise ValueError(f"sprite sheet {sw}x{sh} exceeds 1<<26 pixels")
    sheet = bytearray(sw * sh)
    for g, f, fr in frames:
        for y in range(fr.h):
            base = (g * ch + y) * sw + f * cw
            row = fr.idx[y * fr.w:(y + 1) * fr.w]
            sheet[base:base + fr.w] = row.ljust(fr.w, b"\x00")[:fr.w]
    dims = [[g, f, fr.w, fr.h] for g, f, fr in frames]
    return ng, nf, cw, ch, bytes(sheet), dims


def emit(pack: Pack, outdir: str) -> dict:
    os.makedirs(os.path.join(outdir, "images"), exist_ok=True)
    os.makedirs(os.path.join(outdir, "sprites"), exist_ok=True)
    os.makedirs(os.path.join(outdir, "chunks"), exist_ok=True)

    # sprite frames are palette-indexed; borrow the palette of the first
    # BMP chunk (fish packs embed a portrait that shares it), else gray.
    pal, pal_src = [(i, i, i) for i in range(256)], None
    for c in pack.chunks:
        if c.is_bmp and (p := bmp_palette(c.payload)):
            pal, pal_src = p, _chunk_name(c)
            break
    pal += [(i, i, i) for i in range(len(pal), 256)]  # sprite indices are 8-bit

    records = []
    for c in pack.chunks:
        fname = _chunk_name(c)
        raw_path = f"chunks/{fname}.bin"
        with open(os.path.join(outdir, raw_path), "wb") as f:
            f.write(c.payload)

        rec = {
            "file": raw_path,
            "size": len(c.payload),
            "resId": c.res_id,
            "sub": c.sub,
        }
        if c.name:
            rec["name"] = c.name
        if c.is_bmp:
            try:
                w, h, idx, bmp_pal, _ = read_bmp_indexed(c.payload)
            except Exception:
                rec["bad_image"] = True
            else:
                img = f"images/{fname}.png"
                save_indexed_png(os.path.join(outdir, img), w, h, idx,
                                 bmp_pal)
                rec["image"] = img
                rec["w"], rec["h"] = w, h
        else:
            try:
                sheet = _sprite_sheet(c.payload)
            except Exception as e:
                sheet = None
                rec["spriteError"] = str(e)
            if sheet is not None:
                ng, nf, cw, ch, idx, dims = sheet
                img = f"sprites/{fname}.png"
                try:
                    save_indexed_png(os.path.join(outdir, img),
                                     cw * nf, ch * ng, idx, pal)
                    rec["sprites"] = {
                        "image": img, "groups": ng, "framesPerGroup": nf,
                        "cellW": cw, "cellH": ch, "dims": dims,
                        "paletteSrc": pal_src,
                    }
                except Exception as e:
                    rec["spriteError"] = f"{type(e).__name__}: {e}"
                    try:
                        os.remove(os.path.join(outdir, img))
                    except (OSError, NameError):
                        pass
        records.append(rec)

    manifest = {
        "format": "azpack/1",
        "tag": pack.tag,
        "version": pack.version,
        "names": [{"resId": r, "name": n} for r, n in pack.names()],
        "chunks": records,
    }
    with open(os.path.join(outdir, "manifest.json"), "w",
              encoding="utf-8") as f:
        json.dump(manifest, f, indent=1)
    return manifest


def emit_sounds(data: bytes, outdir: str) -> dict:
    """Emit a sounds-only .azpack from a resource fork (.rsrc)."""
    decoded = list(sounds_from_rsrc(data))
    if not decoded:
        raise ValueError("snd resources present but none decodable")
    manifest = {"format": "azpack/1", "tag": "", "version": 0,
                "names": [], "sounds": _write_sounds(decoded, outdir),
                "chunks": []}
    with open(os.path.join(outdir, "manifest.json"), "w",
              encoding="utf-8") as f:
        json.dump(manifest, f, indent=1)
    return manifest


# The tank's width, and the smallest picture a drop may show: the
# rules web/drop.ts applies (isGravelImage in web/render.ts and
# BACKDROP_MIN), so a bundle shows what the same file shows in the app.
TANK_WIDTH = 320
BACKDROP_MIN = (160, 100)


def _shown(gravel: bool, w: int, h: int) -> bool:
    """Whether the app shows a w x h picture from this file: a gravel
    fork's strips, or any other file's pictures of BACKDROP_MIN or
    more."""
    if gravel:
        return w >= h * 4 and w >= TANK_WIDTH / 2
    return w >= BACKDROP_MIN[0] and h >= BACKDROP_MIN[1]


def emit_mac(data: bytes, outdir: str) -> dict:
    """Emit an .azpack of a Mac file's pictures: a PICT file, or a fork
    carrying pictures (see macpics.py), with the fork's sounds if it has
    any. Each picture keeps its payload under chunks/; the ones the app
    would show (_shown) get an indexed PNG under images/, which the
    tank's bundle loader reads as backdrop or gravel art by shape. So a
    gravel add-on's catalog picture (BADP), the size of a backdrop,
    gets none. White is palette index 0, the color the tank keys out of
    a gravel strip."""
    found = mac_pictures(data)
    if found is None:
        raise ValueError("no pictures found")
    kind, images, failed = found
    if kind == "accessory":
        # The tank's bundle loader reads backdrop and gravel art only,
        # by shape: an accessory's art would come back as a backdrop.
        raise ValueError("an accessory's art: bundles carry no decor, so "
                         "drop the file on the tank instead")
    gravel = kind == "gravel"
    if not images:
        raise ValueError("no picture decodes: " + "; ".join(failed))
    if not any(_shown(gravel, w, h) for _k, _r, _b, (w, h, _p, _i) in images):
        raise ValueError("no picture the tank can show")
    for f in failed:
        print(f"  skipping picture {f}", file=sys.stderr)
    # A PICT file carries no sounds; a fork may. mac_pictures opened
    # this fork, so it opens again, and a sound that won't decode is
    # skipped where it's read.
    decoded = []
    if images[0][1] is not None:
        decoded = list(sounds_from_rsrc(data))
    for sub in ("images", "chunks"):
        os.makedirs(os.path.join(outdir, sub), exist_ok=True)
    records = []
    for key, rid, payload, (w, h, palette, idx) in images:
        safe = key.replace(" ", "_")
        raw = f"chunks/{safe}.bin"
        with open(os.path.join(outdir, raw), "wb") as f:
            f.write(payload)
        rec = {"file": raw, "size": len(payload), "resId": rid, "sub": None,
               "name": key}
        if _shown(gravel, w, h):
            img = f"images/{safe}.png"
            save_indexed_png(os.path.join(outdir, img), w, h, idx, palette)
            rec.update(image=img, w=w, h=h)
        records.append(rec)
    manifest = {"format": "azpack/1", "tag": "", "version": 0, "names": [],
                "chunks": records}
    if decoded:
        manifest["sounds"] = _write_sounds(decoded, outdir)
    with open(os.path.join(outdir, "manifest.json"), "w",
              encoding="utf-8") as f:
        json.dump(manifest, f, indent=1)
    return manifest


def _write_sounds(decoded, outdir: str) -> list:
    """Write decoded (name, wav) pairs under sounds/, one file name per
    record, and return their manifest records."""
    os.makedirs(os.path.join(outdir, "sounds"), exist_ok=True)
    records = []
    used: set[str] = set()
    for name, wav in decoded:
        safe = "".join(ch if ch.isalnum() or ch in "-_." else "_"
                       for ch in name) or "snd"
        base = safe
        n = 2
        while safe.casefold() in used:
            safe = f"{base}-{n}"
            n += 1
        used.add(safe.casefold())
        path = f"sounds/{safe}.wav"
        with open(os.path.join(outdir, path), "wb") as f:
            f.write(wav)
        records.append({"name": name, "file": path})
    return records
