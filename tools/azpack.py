#!/usr/bin/env python3
"""azpack — turn an Aquazone container (.fsh/.acc/.plt/.azn/.REZ) into an
.azpack bundle the app can import.

    python3 tools/azpack.py NeonTetra.fsh -o NeonTetra.azpack
    python3 tools/azpack.py *.fsh -o packs/    # one bundle per input

Then drag the output folder onto the Finsical window (or drop it in
web/pack/ for the dev shell).
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from tools.az.emit import emit
from tools.az.pack import Pack


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
                manifest = emit(Pack(f.read()), out)
        except Exception as e:
            print(f"{src}: {type(e).__name__}: {e}", file=sys.stderr)
            rc = 1
            continue
        n = sum(1 for c in manifest["chunks"] if "sprites" in c)
        print(f"{src} -> {out}  ({len(manifest['chunks'])} chunks, "
              f"{n} sprite sheets)")
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
