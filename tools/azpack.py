#!/usr/bin/env python3
"""azpack — turn an Aquazone container (.fsh/.acc/.plt/.azn/.REZ), a Mac
PICT picture or a Mac resource fork carrying pictures or 'snd ' sounds
(.rsrc, MacBinary .bin, BinHex .hqx, AppleDouble "._" files) into an
.azpack bundle the app can import.

    python3 tools/azpack.py NeonTetra.fsh -o NeonTetra.azpack
    python3 tools/azpack.py *.fsh -o packs/    # one bundle per input (POSIX
                                               # glob; list files on Windows)

Then drag the output folder onto the Finsical window (or drop it in
web/pack/ for the dev shell).

Python 3.9+, stdlib only.
"""
from __future__ import annotations
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from tools.az.emit import emit, emit_mac, emit_sounds
from tools.az.macpics import has_mac_pictures, mac_display_name
from tools.az.pack import Pack, is_pack
from tools.az.snd import has_sounds


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="azpack", description=__doc__)
    ap.add_argument("inputs", nargs="+",
                    help=".fsh/.acc/.plt/.azn/.REZ files, PICT files or "
                         "Mac resource forks")
    ap.add_argument("-o", "--out", required=True,
                    help="output dir; with multiple inputs, each gets a "
                         "subdirectory named after the file (an "
                         "AppleDouble companion's without its \"._\")")
    args = ap.parse_args(argv)

    rc = 0
    used: set[str] = set()
    for src in args.inputs:
        name = os.path.splitext(mac_display_name(os.path.basename(src)))[0]
        # A Mac file and its "._" companion, or Foo.fsh beside Foo.rez,
        # name one bundle: the later ones get -2, -3..., as in fetch.py.
        sub, n = name, 2
        while sub in used:
            sub, n = f"{name}-{n}", n + 1
        used.add(sub)
        out = args.out if len(args.inputs) == 1 else os.path.join(args.out, sub)
        try:
            with open(src, "rb") as f:
                data = f.read()
            os.makedirs(out, exist_ok=True)
            if is_pack(data):
                manifest = emit(Pack(data), out)
            elif has_mac_pictures(data):
                manifest = emit_mac(data, out)
            elif has_sounds(data):
                manifest = emit_sounds(data, out)
            else:
                raise ValueError("not a pack, a picture or a fork with "
                                 "pictures or snd resources")
        except Exception as e:
            print(f"{src}: {type(e).__name__}: {e}", file=sys.stderr)
            rc = 1
            continue
        n = sum(1 for c in manifest["chunks"] if "sprites" in c)
        pics = sum(1 for c in manifest["chunks"] if "image" in c)
        snds = manifest.get("sounds") or []
        if manifest["chunks"] or not snds:
            detail = f"{len(manifest['chunks'])} chunks, {n} sprite sheets"
            if pics and not n:
                detail += f", {pics} pictures"
            if snds:
                detail += f", {len(snds)} sounds"
        else:
            detail = f"{len(snds)} sounds (sounds-only)"
        print(f"{src} -> {out}  ({detail})")
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
