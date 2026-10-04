#!/usr/bin/env python3
r"""fetch — download Aquazone source archives from archive.org and turn
what's inside into .azpack bundles.

    python3 tools/fetch.py                      # default item, into packs/
    python3 tools/fetch.py <identifier> -o out/ # another item
    python3 tools/fetch.py --include '\.zip$'   # only matching files
    python3 tools/fetch.py --archive 'Missing addons Aquazone.7z' \
        --entries 'Misc Macintosh files/'       # entries, one by one

Nothing is committed to the repo — output lands in packs/ (gitignored).
.ZIP is unpacked in memory; so is an InstallShield 3 cabinet (data.z, as
the US discs keep their Windows items in) via tools.az.is3; .ISO is
walked via tools.az.iso9660; anything that looks like a pack
(.fsh/.acc/.plt/.azn/.REZ), a Mac PICT picture or a resource fork with
pictures or 'snd ' resources becomes an .azpack via the normal emitters.

--archive reads entries through archive.org's archive view, which
serves the files inside a zip, 7z or ISO one at a time: for archives
this tool can't open itself (7z), or to take a few files from a big
one. Each entry is identified by its content, not its name.

Python 3.9+, stdlib only.
"""
from __future__ import annotations
import argparse
import hashlib
import html
import io
import json
import os
import re
import shutil
import sys
import tempfile
import urllib.parse
import urllib.request
import zipfile
from typing import Callable

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from tools.az.emit import emit, emit_mac, emit_sounds
from tools.az.is3 import Is3Error, is_is3, members, read_member
from tools.az.iso9660 import Iso
from tools.az.macpics import has_mac_pictures, mac_display_name
from tools.az.pack import Pack, is_pack
from tools.az.snd import has_sounds

META = "https://archive.org/metadata/{ident}"
DOWNLOAD = "https://archive.org/download/{ident}/{name}"
# The archive view's listing of an archive in an item: one link per
# entry, the entry's whole path percent-encoded into one segment.
ARCHIVE_VIEW = "https://archive.org/download/{ident}/{archive}/"
# Listings that name entries under the wrong top folder, as
# web/import.ts's Collection.rename knows them: the listed URLs serve
# 0 bytes, the stored folder serves the file.
LISTING_RENAMES = {
    ("aquazonewithguppiesandaddons", "Missing addons Aquazone.7z"):
        ("addons Aquazone/", "Missing addons Aquazone/"),
}
DEFAULT_IDENT = "aquazonewithguppiesandaddons"
IMPORTABLE = (".fsh", ".acc", ".plt", ".azn", ".rez", ".rsrc",
            ".grv", ".fd", ".dna", ".med", ".bin", ".hqx")
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


def _emit_source(name: str, data: bytes, outdir: str,
                 strict: bool = False) -> str | None:
    """If data is importable, emit an .azpack under outdir; return path.
    A failed emit is reported and returns None, or raises when strict,
    so a caller can count it as failed rather than not importable."""
    base = os.path.splitext(mac_display_name(os.path.basename(name)))[0]
    out = os.path.join(outdir, base + ".azpack")
    n = 2
    while out in _EMITTED:
        out = os.path.join(outdir, f"{base}-{n}.azpack")
        n += 1

    def drop_stale_siblings() -> None:
        # Numbered siblings orphaned by earlier runs go only after this
        # run proved the base name importable: cleaning them first
        # destroyed a previous good bundle when the new source decoded
        # to nothing. Scan a bounded range rather than stopping at the
        # first gap, or a leftover fish-3 behind a missing fish-2 would
        # survive forever.
        for k in range(2, _STALE_SIBLING_SCAN_CAP):
            stale = os.path.join(outdir, f"{base}-{k}.azpack")
            if stale not in _EMITTED and os.path.isdir(stale):
                shutil.rmtree(stale, ignore_errors=True)

    def finish() -> str:
        # Register before cleaning: drop_stale_siblings must not rmtree
        # the bundle just emitted when `out` is itself a numbered name.
        _EMITTED.add(out)
        drop_stale_siblings()
        return out

    try:
        if is_pack(data):
            _install_emitted(lambda dst: emit(Pack(data), dst), out)
            return finish()
        if has_mac_pictures(data):
            _install_emitted(lambda dst: emit_mac(data, dst), out)
            return finish()
        if has_sounds(data):
            _install_emitted(lambda dst: emit_sounds(data, dst), out)
            return finish()
    except Exception as e:
        if strict:
            raise
        print(f"  {name}: {type(e).__name__}: {e}", file=sys.stderr)
    return None


def _install_emitted(emit_into: Callable[[str], object],
                     out: str) -> None:
    """Emit into a staging dir beside `out`, then rename into place.

    Publication never costs the bundle already at `out`: it is moved
    aside before the staged copy lands and put straight back if the
    publish rename fails — so neither a failed emit nor a failed
    publish destroys a prior good bundle. Everything under `work` is
    this call's own temporary artifact, except that after a failed
    publish the parked old bundle may still be in it: never sweep that.
    """
    work = tempfile.mkdtemp(dir=os.path.dirname(out) or ".",
                            prefix=".emit-")
    staging = os.path.join(work, "new")
    backup = os.path.join(work, "old")
    try:
        emit_into(staging)
        if os.path.lexists(out):
            os.rename(out, backup)
            try:
                os.rename(staging, out)
            except OSError:
                os.rename(backup, out)  # put the replaced bundle back
                raise
        else:
            os.rename(staging, out)
    except BaseException:
        # `backup` existing means a publish or rollback failure left the
        # old bundle parked in the work dir — user data, not litter, so
        # say where it is rather than sweep it. BaseException so an
        # interrupted emit still cleans its partial staging.
        if os.path.exists(backup):
            # A failed rollback leaves `out` absent — the parked copy
            # is the only one, and needs moving back by hand.
            missing = (
                "" if os.path.exists(out)
                else f" ({out} is missing — the parked copy is the"
                     " only one)")
            print(f"  prior bundle parked at {backup}{missing}",
                  file=sys.stderr)
        else:
            shutil.rmtree(work, ignore_errors=True)
        raise
    shutil.rmtree(work, ignore_errors=True)


_ENTRY_CAP = 1 << 30  # per-entry decompressed-byte cap
# How far the stale-sibling sweep looks past a gap (a missing -2 must
# not stop it from reaching a leftover -3). Far above any real run's
# per-name count while keeping the scan bounded.
_STALE_SIBLING_SCAN_CAP = 1000


def _read_capped(zf: zipfile.ZipFile, zi: zipfile.ZipInfo,
                 cap: int) -> bytes | None:
    """Read a zip entry, returning None when it exceeds cap bytes."""
    with zf.open(zi) as fh:
        blob = fh.read(cap + 1)
    return None if len(blob) > cap else blob


_MAX_ZIP_DEPTH = 4
_MAX_TOTAL_BYTES = 512 << 20  # shared across the recursion tree
# (the real add-on collection zip decompresses past 64MB; still
# bounded so a fan-out bomb stops)


def _entry_name(zi: zipfile.ZipInfo) -> str:
    """Decode an entry's stored name like core/data/zip.ts does: UTF-8
    when the general-purpose flag says so, else strict UTF-8, then
    Shift-JIS (the JPN add-on archives carry unflagged SJIS names), and
    Python's CP437 decode as the last resort. Normalizing backslashes
    must happen on the decoded name — a Shift-JIS trail byte can be
    0x5C, which reads as a separator if it runs first."""
    if zi.flag_bits & 0x800:
        return zi.filename
    raw = zi.orig_filename.encode("cp437")
    # zipfile truncates member names at a NUL; match it — on the raw
    # bytes, so bytes after the NUL can't fail the decode of the part
    # that survives.
    raw = raw.partition(b"\0")[0]
    for codec in ("utf-8", "shift_jis"):
        try:
            return raw.decode(codec)
        except UnicodeDecodeError:
            pass
    return zi.filename


def _is_mac_file(name: str) -> bool:
    """Whether name may be a classic Mac file's, which needs no
    extension: an AppleDouble companion ("._Pebbles", which a zip made
    on a Mac keeps under __MACOSX/), whose resource fork holds a
    gravel's pictures, or a name without a dot, as the 7z's PICT
    backdrops have (MAC_FILES in web/import.ts). Content decides what
    such a file holds, as for a drop."""
    base = os.path.basename(name)
    return base.startswith("._") or "." not in base


def _harvest(name: str, data: bytes, outdir: str, depth: int = 0,
             budget: list[int] | None = None) -> list[str]:
    """Recurse into archives; emit .azpack for anything importable."""
    if budget is None:
        budget = [_MAX_TOTAL_BYTES]
    lower = name.lower()
    if lower.endswith(IMPORTABLE) or _is_mac_file(name):
        out = _emit_source(name, data, outdir)
        return [out] if out else []
    if depth >= _MAX_ZIP_DEPTH:
        return []
    if lower.endswith(".zip"):
        try:
            zf = zipfile.ZipFile(io.BytesIO(data))
        except zipfile.BadZipFile:
            return []
        return _harvest_members(
            ((_entry_name(zi), zi.file_size,
              lambda cap, zi=zi: _read_capped(zf, zi, cap))
             for zi in zf.infolist() if not zi.is_dir()),
            outdir, depth, budget)
    if lower.endswith(".z"):
        try:
            listed = members(data)
        except Is3Error as e:
            print(f"  {name}: {e}", file=sys.stderr)
            return []
        return _harvest_members(
            ((m.path, m.size,
              lambda cap, m=m: read_member(data, m) if m.size <= cap
              else None) for m in listed),
            outdir, depth, budget)
    return []


def _harvest_members(entries, outdir: str, depth: int,
                     budget: list[int]) -> list[str]:
    """Harvest an archive's members, each (path, declared size, read),
    where read(cap) gives the member's bytes, or None past cap. A
    member over the per-entry cap or the remaining budget is skipped
    with a note, and so is one that fails: it costs only itself."""
    made = []
    for entry, size, read in entries:
        base = os.path.basename(entry.replace("\\", "/"))
        if not base:
            continue
        if size > _ENTRY_CAP:
            print(f"  {entry}: skipped, declares {size} bytes over cap",
                  file=sys.stderr)
            continue
        if budget[0] <= 0:
            print(f"  {entry}: skipped, total byte budget exhausted",
                  file=sys.stderr)
            continue
        try:
            blob = read(min(_ENTRY_CAP, budget[0]))
            if blob is None:
                print(f"  {entry}: skipped, decompressed data over cap or "
                      "remaining budget", file=sys.stderr)
                continue
            budget[0] -= len(blob)
            made += _harvest(base, blob, outdir, depth + 1, budget)
        except Exception as e:
            print(f"  {entry}: {type(e).__name__}: {e}", file=sys.stderr)
    return made


def _harvest_disc(iso, outdir: str) -> list[str]:
    """Walk an ISO image, harvesting importable entries under one budget."""
    made: list[str] = []
    budget = [_MAX_TOTAL_BYTES]  # one budget per disc
    for entry, rec in iso.walk():
        base = os.path.basename(entry)
        if rec["dir"] or not base.lower().endswith(
                IMPORTABLE + (".zip", ".z")):
            continue
        if rec["size"] > _MAX_ARCHIVE_BYTES:
            print(f"  {entry}: skipped, {rec['size']} bytes over cap",
                  file=sys.stderr)
            continue
        if budget[0] <= 0:
            print(f"  {entry}: skipped, disc byte budget exhausted",
                  file=sys.stderr)
            break
        try:
            blob = iso.read_file(rec)
            budget[0] -= len(blob)
            made += _harvest(base, blob, outdir, depth=0, budget=budget)
        except Exception as e:
            print(f"  {entry}: {type(e).__name__}: {e}", file=sys.stderr)
    return made


def _archive_entries(ident: str, archive: str) -> list[str]:
    """Entry paths an archive's archive view lists, as stored: a known
    listing quirk (LISTING_RENAMES) is put right. Links are read as
    web/import.ts reads them: resolved against the page, https on
    archive.org only, matched on the decoded path."""
    page_url = ARCHIVE_VIEW.format(ident=ident,
                                   archive=urllib.parse.quote(archive))
    text = _get(page_url).decode("utf-8", "replace")
    prefix = f"/download/{ident}/{archive}/"
    listed, stored = LISTING_RENAMES.get((ident, archive), ("", ""))
    out: list[str] = []
    for href in re.findall(r'href="([^"]+)"', text):
        try:
            u = urllib.parse.urlsplit(
                urllib.parse.urljoin(page_url, html.unescape(href)))
        except ValueError:
            continue  # a malformed href: no entry link
        host = u.hostname or ""
        if u.scheme != "https" or not (host == "archive.org" or
                                       host.endswith(".archive.org")):
            continue
        path = urllib.parse.unquote(u.path)
        if not path.startswith(prefix):
            continue
        rel = path[len(prefix):]
        if not rel or rel.endswith("/"):
            continue
        if listed and rel.startswith(listed):
            rel = stored + rel[len(listed):]
        if rel not in out:
            out.append(rel)
    return out


def fetch_entries(ident: str, archive: str, outdir: str,
                  entries: re.Pattern, downloads: str
                  ) -> tuple[list[str], int]:
    """Fetch the entries of one archive in an item that match
    `entries`, through archive.org's archive view, and harvest each by
    its content. Downloads are cached like whole files."""
    names = [n for n in _archive_entries(ident, archive) if entries.search(n)]
    if not names:
        print(f"{ident}/{archive}: no entries match {entries.pattern}")
        return [], 0
    made: list[str] = []
    failed = 0
    _EMITTED.clear()
    os.makedirs(outdir, exist_ok=True)
    os.makedirs(downloads, exist_ok=True)
    for name in names:
        url = (ARCHIVE_VIEW.format(ident=ident,
                                   archive=urllib.parse.quote(archive))
               + urllib.parse.quote(name, safe=""))
        key = hashlib.sha256(url.encode()).hexdigest()[:16]
        path = os.path.join(downloads, f"{key}-{os.path.basename(name)}")
        print(name)
        try:
            _cached_get(url, path, max_bytes=_MAX_ARCHIVE_BYTES)
            with open(path, "rb") as fh:
                blob = fh.read()
            if not blob:
                # Cached or not, an empty answer is no file: drop it so
                # the next run asks again.
                os.remove(path)
                raise ValueError("archive.org served 0 bytes (its listing "
                                 "may name the wrong folder)")
            if name.lower().endswith((".zip", ".z")):
                made += _harvest(os.path.basename(name), blob, outdir)
            else:
                out = _emit_source(name, blob, outdir, strict=True)
                if out:
                    made.append(out)
        except Exception as e:
            print(f"  {name}: {type(e).__name__}: {e}", file=sys.stderr)
            failed += 1
    return made, failed


def fetch(ident: str, outdir: str, include: re.Pattern,
          downloads: str) -> tuple[list[str], int]:
    files = [f for f in _list_item(ident)
             if include.search(f.get("name", ""))]
    if not files:
        print(f"{ident}: no files match {include.pattern}")
        return [], 0
    made: list[str] = []
    failed = 0
    _EMITTED.clear()  # re-entry replaces bundles, like a fresh process
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
                with Iso(path) as iso:
                    made += _harvest_disc(iso, outdir)
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
    ap.add_argument("--archive",
                    help="an archive in the item (zip, 7z, iso) whose "
                         "entries archive.org serves one by one: fetch "
                         "those instead of whole files")
    ap.add_argument("--entries", default="", type=_regex,
                    help="with --archive: regex over entry paths "
                         "(default: all)")
    args = ap.parse_args(argv)
    if args.entries.pattern and not args.archive:
        ap.error("--entries needs --archive")

    try:
        if args.archive:
            made, failed = fetch_entries(args.ident, args.archive, args.out,
                                         args.entries, args.downloads)
        else:
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
