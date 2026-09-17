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
import hashlib
import io
import json
import os
import re
import shutil
import sys
import urllib.parse
import urllib.request
import zipfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from tools.az.emit import emit, emit_sounds
from tools.az.iso9660 import Iso
from tools.az.pack import Pack, is_pack
from tools.az.snd import has_sounds

META = "https://archive.org/metadata/{ident}"
DOWNLOAD = "https://archive.org/download/{ident}/{name}"
DEFAULT_IDENT = "aqua-zone-virtual-aquarium"
IMPORTABLE = (".fsh", ".acc", ".plt", ".azn", ".rez", ".rsrc")
_EMITTED: set[str] = set()  # paths written this run (re-runs replace)
_MAX_ARCHIVE_BYTES = 1 << 30  # cap for a single in-memory download
_MAX_ISO_BYTES = 4 << 30    # ISOs stream to disk; cap is anti-abuse


def _get(url: str, out: str | None = None,
         max_bytes: int | None = None) -> bytes | None:
    req = urllib.request.Request(url, headers={"User-Agent": "Finsical/1"})
    with urllib.request.urlopen(req, timeout=60) as r:
        if out is None:
            cap = _MAX_ARCHIVE_BYTES if max_bytes is None else max_bytes
            blob = r.read(cap + 1)
            if len(blob) > cap:
                raise ValueError(f"{url}: over {cap} bytes")
            return blob
        total = 0
        with open(out, "wb") as f:
            while chunk := r.read(1 << 20):
                total += len(chunk)
                if max_bytes is not None and total > max_bytes:
                    raise ValueError(f"{url}: over {max_bytes} bytes")
                f.write(chunk)
    return None


def _cached_get(url: str, path: str, want_size: int | None = None,
                max_bytes: int | None = None) -> None:
    """Download url into path via a .part file; reuse a good cache hit."""
    if os.path.exists(path) and (want_size is None
                                 or os.path.getsize(path) == want_size):
        return
    try:
        _get(url, path + ".part", max_bytes=max_bytes)
    except BaseException:
        try:
            os.remove(path + ".part")
        except OSError:
            pass
        raise
    os.replace(path + ".part", path)


def _list_item(ident: str) -> list[dict]:
    meta = json.loads(_get(META.format(ident=ident)))
    return meta.get("files", [])


def _emit_source(name: str, data: bytes, outdir: str) -> str | None:
    """If data is importable, emit an .azpack under outdir; return path."""
    base = os.path.splitext(os.path.basename(name))[0]
    out = os.path.join(outdir, base + ".azpack")
    n = 2
    while out in _EMITTED:
        out = os.path.join(outdir, f"{base}-{n}.azpack")
        n += 1
    try:
        if is_pack(data):
            shutil.rmtree(out, ignore_errors=True)
            emit(Pack(data), out)
            _EMITTED.add(out)
            return out
        if has_sounds(data):
            shutil.rmtree(out, ignore_errors=True)
            emit_sounds(data, out)
            _EMITTED.add(out)
            return out
    except Exception as e:
        if os.path.isdir(out):
            shutil.rmtree(out, ignore_errors=True)
        print(f"  {name}: {type(e).__name__}: {e}", file=sys.stderr)
    return None


_ENTRY_CAP = 1 << 30  # per-entry decompressed-byte cap


def _read_capped(zf: zipfile.ZipFile, zi: zipfile.ZipInfo,
                 cap: int) -> bytes | None:
    """Read a zip entry, returning None when it exceeds cap bytes."""
    with zf.open(zi) as fh:
        blob = fh.read(cap + 1)
    return None if len(blob) > cap else blob


_MAX_ZIP_DEPTH = 4
_MAX_TOTAL_BYTES = 64 << 20  # shared across the whole recursion tree


def _harvest(name: str, data: bytes, outdir: str, depth: int = 0,
             budget: list[int] | None = None) -> list[str]:
    """Recurse into archives; emit .azpack for anything importable."""
    if budget is None:
        budget = [_MAX_TOTAL_BYTES]
    lower = name.lower()
    if lower.endswith(IMPORTABLE):
        out = _emit_source(name, data, outdir)
        return [out] if out else []
    if lower.endswith(".zip") and depth < _MAX_ZIP_DEPTH:
        made = []
        try:
            zf = zipfile.ZipFile(io.BytesIO(data))
        except zipfile.BadZipFile:
            return []
        for zi in zf.infolist():
            base = os.path.basename(zi.filename.replace("\\", "/"))
            if (zi.is_dir() or zi.filename.startswith("__MACOSX")
                    or not base or base.startswith("._")):
                continue
            if zi.file_size > _ENTRY_CAP:
                print(f"  {zi.filename}: skipped, declares "
                      f"{zi.file_size} bytes over cap", file=sys.stderr)
                continue
            if budget[0] <= 0:
                print(f"  {zi.filename}: skipped, total byte budget "
                      "exhausted", file=sys.stderr)
                continue
            try:
                blob = _read_capped(zf, zi, min(_ENTRY_CAP, budget[0]))
                if blob is None:
                    print(f"  {zi.filename}: skipped, decompressed data "
                          "over cap or remaining budget",
                          file=sys.stderr)
                    continue
                budget[0] -= len(blob)
                made += _harvest(base, blob, outdir, depth + 1, budget)
            except Exception as e:
                print(f"  {zi.filename}: {type(e).__name__}: {e}",
                      file=sys.stderr)
        return made
    return []


def fetch(ident: str, outdir: str, include: re.Pattern,
          downloads: str) -> tuple[list[str], int]:
    files = [f for f in _list_item(ident)
             if include.search(f.get("name", ""))]
    if not files:
        print(f"{ident}: no files match {include.pattern}")
        return [], 0
    made: list[str] = []
    failed = 0
    os.makedirs(outdir, exist_ok=True)
    os.makedirs(downloads, exist_ok=True)
    for f in files:
        name = f["name"]
        url = DOWNLOAD.format(ident=ident,
                              name=urllib.parse.quote(name))
        print(f"{name} ({f.get('size', '?')} bytes)")
        try:
            try:
                want = int(f.get("size"))
            except (TypeError, ValueError):
                want = None
            key = hashlib.sha256(url.encode()).hexdigest()[:16]
            path = os.path.join(downloads,
                                f"{key}-{os.path.basename(name)}")
            is_iso = name.lower().endswith(".iso")
            cap = _MAX_ISO_BYTES if is_iso else _MAX_ARCHIVE_BYTES
            if want is not None and want > cap:
                print(f"skipping {name}: declared size {want} over "
                      f"{cap} bytes", file=sys.stderr)
                continue
            try:
                _cached_get(url, path, want_size=want, max_bytes=cap)
            except ValueError as e:  # stream exceeded cap mid-download
                print(f"  {name}: {e}", file=sys.stderr)
                failed += 1
                continue
            if is_iso:
                iso = Iso(path)
                for entry, rec in iso.walk():
                    base = os.path.basename(entry)
                    if rec["dir"] or not base.lower().endswith(
                            IMPORTABLE + (".zip",)):
                        continue
                    try:
                        made += _harvest(base, iso.read_file(rec), outdir)
                    except Exception as e:
                        print(f"  {entry}: {type(e).__name__}: {e}",
                              file=sys.stderr)
            else:
                with open(path, "rb") as fh:
                    blob = fh.read(_MAX_ARCHIVE_BYTES + 1)
                if len(blob) > _MAX_ARCHIVE_BYTES:
                    raise ValueError(
                        f"{name}: over {_MAX_ARCHIVE_BYTES} bytes")
                made += _harvest(name, blob, outdir)
        except Exception as e:
            print(f"  {name}: {type(e).__name__}: {e}", file=sys.stderr)
            failed += 1
    return made, failed


def main(argv: list[str] | None = None) -> int:
    def _regex(pattern: str) -> re.Pattern:
        try:
            return re.compile(pattern)
        except re.error as e:
            raise argparse.ArgumentTypeError(f"invalid regex: {e}")

    ap = argparse.ArgumentParser(prog="fetch", description=__doc__)
    ap.add_argument("ident", nargs="?", default=DEFAULT_IDENT,
                    help="archive.org item identifier")
    ap.add_argument("-o", "--out", default="packs",
                    help="output dir for .azpack bundles")
    ap.add_argument("--include", default=r"(?i)\.(iso|zip)$",
                    type=_regex,
                    help="regex over item file names (default: iso/zip)")
    ap.add_argument("--downloads", default="packs/downloads",
                    help="where big downloads are cached")
    args = ap.parse_args(argv)

    try:
        made, failed = fetch(args.ident, args.out, args.include,
                             args.downloads)
    except (OSError, ValueError) as e:
        print(f"error: {e}", file=sys.stderr)
        return 1
    for p in made:
        print(f"  -> {p}")
    print(f"{len(made)} bundle(s) under {args.out}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
