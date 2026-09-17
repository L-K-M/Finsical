"""Emit a .azpack bundle directory from a 9003inc pack file.

A bundle is:
  manifest.json   — pack metadata + per-chunk records (id, kind, file)
  images/         — BMP chunks converted to PNG
  sprites/        — decoded sprite-stream chunks as PNG sheets
  chunks/         — every chunk's raw payload (id-named), for later decoding
"""
import json
import os
import struct

from .fsh import is_sprite_stream, iter_frames
from .img import bmp_palette, read_bmp, save_indexed_png, write_png
from .pack import Pack


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
                w, h, rgba, _ = read_bmp(c.payload)
            except Exception:
                rec["bad_image"] = True
            else:
                img = f"images/{fname}.png"
                write_png(os.path.join(outdir, img), w, h, rgba)
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
                    rec["spriteError"] = str(e)
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


def main(argv):
    if len(argv) != 3:
        raise SystemExit(f"usage: {argv[0]} <pack-file> <outdir>")
    src, outdir = argv[1], argv[2]
    with open(src, "rb") as f:
        pack = Pack(f.read())
    m = emit(pack, outdir)
    n_img = sum(1 for c in m["chunks"] if "image" in c)
    print(f"{src}: {len(m['chunks'])} chunks, {n_img} images -> {outdir}")


if __name__ == "__main__":
    import sys
    main(sys.argv)
