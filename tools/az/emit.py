"""Emit a .azpack bundle directory from a 9003inc pack file.

A bundle is:
  manifest.json   — pack metadata + per-chunk records (id, kind, file)
  images/         — BMP chunks converted to PNG
  chunks/         — every chunk's raw payload (id-named), for later decoding
"""
import json
import os
import struct

from .img import read_bmp, write_png
from .pack import Pack


def _chunk_name(c):
    rid = f"{c.res_id:04x}" if c.res_id is not None else "anon"
    sub = f"{c.sub:04x}" if c.sub is not None else "0000"
    return f"{rid}_{sub}_{c.pos:x}"


def emit(pack: Pack, outdir: str) -> dict:
    os.makedirs(os.path.join(outdir, "images"), exist_ok=True)
    os.makedirs(os.path.join(outdir, "chunks"), exist_ok=True)

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
