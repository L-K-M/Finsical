#!/usr/bin/env python3
"""fetch — download Aquazone source archives from archive.org and turn
what's inside into .azpack bundles.

    python3 tools/fetch.py                      # default item, into packs/
    python3 tools/fetch.py <identifier> -o out/ # another item
    python3 tools/fetch.py --include '\.zip$'   # only matching files

Nothing is committed to the repo — output lands in packs/ (gitignored).
.ZIP is unpacked in memory; .ISO is walked via tools.az.iso9660; anything
that looks like a pack (.fsh/.acc/.plt/.azn/.REZ) or a resource fork with
'snd ' resources becomes an .azpack via the normal emitters.
"""
from __future__ import annotations
import argparse
import io
import json
import os
import re
import sys
import urllib.parse
import urllib.request
import zipfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from tools.az.emit import emit, emit_sounds
from tools.az.iso9660 import Iso
from tools.az.pack import Pack, is_pack
from tools.az.snd import sounds_from_rsrc

META = "https://archive.org/metadata/{ident}"
DOWNLOAD = "https://archive.org/download/{ident}/{name}"
DEFAULT_IDENT = "aqua-zone-virtual-aquarium"
IMPORTABLE = (".fsh", ".acc", ".plt", ".azn", ".rez", ".rsrc")


def _get(url: str, out: str | None = None) -> bytes | None:
    req = urllib.request.Request(url, headers={"User-Agent": "Finsical/1"})
    with urllib.request.urlopen(req, timeout=60) as r:
        if out is None:
            return r.read()
        with open(out, "wb") as f:
            while chunk := r.read(1 << 20):
                f.write(chunk)
    return None


def _list_item(ident: str) -> list[dict]:
    meta = json.loads(_get(META.format(ident=ident)))
    return meta.get("files", [])


def _emit_source(name: str, data: bytes, outdir: str) -> str | None:
    """If data is importable, emit an .azpack under outdir; return path."""
    base = os.path.splitext(os.path.basename(name))[0]
    out = os.path.join(outdir, base + ".azpack")
    n = 2
    while os.path.exists(out):
        out = os.path.join(outdir, f"{base}-{n}.azpack")
        n += 1
    try:
        if is_pack(data):
            emit(Pack(data), out)
            return out
        if any(True for _ in sounds_from_rsrc(data)):
            emit_sounds(data, out)
            return out
    except Exception as e:
        print(f"  {name}: {type(e).__name__}: {e}", file=sys.stderr)
    return None


def _harvest(name: str, data: bytes, outdir: str) -> list[str]:
    """Recurse into archives; emit .azpack for anything importable."""
    lower = name.lower()
    if lower.endswith(IMPORTABLE):
        out = _emit_source(name, data, outdir)
        return [out] if out else []
    if lower.endswith(".zip"):
        made = []
        try:
            zf = zipfile.ZipFile(io.BytesIO(data))
        except zipfile.BadZipFile:
            return []
        for zi in zf.infolist():
            if zi.is_dir() or zi.filename.startswith("__MACOSX"):
                continue
            base = os.path.basename(zi.filename)
            if not base:
                continue
            made += _harvest(base, zf.read(zi), outdir)
        return made
    return []


def fetch(ident: str, outdir: str, include: re.Pattern,
          downloads: str) -> list[str]:
    files = [f for f in _list_item(ident)
             if include.search(f.get("name", ""))]
    if not files:
        print(f"{ident}: no files match {include.pattern}")
        return []
    made: list[str] = []
    os.makedirs(downloads, exist_ok=True)
    for f in files:
        name = f["name"]
        url = DOWNLOAD.format(ident=ident,
                              name=urllib.parse.quote(name))
        print(f"{name} ({f.get('size', '?')} bytes)")
        try:
            if name.lower().endswith(".iso"):
                path = os.path.join(downloads, os.path.basename(name))
                if not os.path.exists(path):
                    _get(url, path + ".part")
                    os.replace(path + ".part", path)
                iso = Iso(path)
                for entry, rec in iso.walk():
                    base = os.path.basename(entry)
                    if rec["dir"] or not base.lower().endswith(
                            IMPORTABLE + (".zip",)):
                        continue
                    made += _harvest(base, iso.read_file(rec), outdir)
            else:
                made += _harvest(name, _get(url), outdir)
        except Exception as e:
            print(f"  {name}: {type(e).__name__}: {e}", file=sys.stderr)
    return made


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="fetch", description=__doc__)
    ap.add_argument("ident", nargs="?", default=DEFAULT_IDENT,
                    help="archive.org item identifier")
    ap.add_argument("-o", "--out", default="packs",
                    help="output dir for .azpack bundles")
    ap.add_argument("--include", default=r"(?i)\.(iso|zip)$",
                    type=re.compile,
                    help="regex over item file names (default: iso/zip)")
    ap.add_argument("--downloads", default="packs/downloads",
                    help="where big downloads are cached")
    args = ap.parse_args(argv)

    made = fetch(args.ident, args.out, args.include, args.downloads)
    for p in made:
        print(f"  -> {p}")
    print(f"{len(made)} bundle(s) under {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
