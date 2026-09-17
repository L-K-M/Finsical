#!/usr/bin/env python3
"""azpack — turn an Aquazone container (.fsh/.acc/.plt/.azn/.REZ) into an
.azpack bundle the app can import.

    python3 tools/azpack.py NeonTetra.fsh -o NeonTetra.azpack
    python3 tools/azpack.py *.fsh -o packs/    # one bundle per input (POSIX
                                               # glob; list files on Windows)

Then drag the output folder onto the Finsical window (or drop it in
web/pack/ for the dev shell).
"""
from __future__ import annotations
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from tools.az.emit import emit, emit_sounds
from tools.az.pack import Pack, is_pack
from tools.az.snd import has_sounds


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="azpack", description=__doc__)
    ap.add_argument("inputs", nargs="+", help=".fsh/.acc/.plt/.azn/.REZ files")
    ap.add_argument("-o", "--out", required=True,
                    help="output dir; with multiple inputs, each gets a "
                         "subdirectory named after the file")
    args = ap.parse_args(argv)

    rc = 0
    for src in args.inputs:
        name = os.path.splitext(os.path.basename(src))[0]
        out = args.out if len(args.inputs) == 1 else os.path.join(args.out, name)
        try:
            with open(src, "rb") as f:
                data = f.read()
            os.makedirs(out, exist_ok=True)
            if is_pack(data):
                manifest = emit(Pack(data), out)
            elif has_sounds(data):
                manifest = emit_sounds(data, out)
            else:
                raise ValueError("not a pack or resource fork")
        except Exception as e:
            print(f"{src}: {type(e).__name__}: {e}", file=sys.stderr)
            rc = 1
            continue
        n = sum(1 for c in manifest["chunks"] if "sprites" in c)
        s = f", {len(manifest['sounds'])} sounds" if manifest["sounds"] else ""
        print(f"{src} -> {out}  ({len(manifest['chunks'])} chunks, "
              f"{n} sprite sheets{s})")
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
