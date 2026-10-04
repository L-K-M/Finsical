"""The pictures in a classic Mac file, the Python twin of
core/data/macpics.ts: a data-fork PICT (a backdrop as Photoshop saved
it, 512-byte header and all, bare or wrapped in MacBinary, BinHex or
AppleSingle), or the picture resources of a resource fork in any
wrapping rsrc.py peels. Stdlib only.

AquaZone files its pictures under its own resource types. A gravel
add-on carries, all as id 4020, the strip the tank draws (BAPC), the
picture the item catalog shows (BADP) and the floor's geometry (Grvl):
the Windows .grv packs carry the same three. An accessory add-on (the
Mac set files its plants as accessories too) carries its art as ACPC,
beside records the engine requires (AccI, AcVe) and catalog pictures
(ACDP). 'PICT' is the Mac's own picture resource.
"""
import re
from itertools import islice

from .pict import PictError, decode_pict, is_pict
from .rsrc import MAX_WRAPPINGS, ResFile, RsrcError, data_fork

# In-tank art first, so it leads the images' order.
PICTURE_TYPES = (b"BAPC", b"BADP", b"ACPC", b"PICT")
# Most pictures decoded from one file, as in core/data/macpics.ts: an
# application's fork holds hundreds of interface PICTs.
MAX_FILE_PICTURES = 16
_JAPANESE = "[\u3040-\u30ff\u4e00-\u9fff]"
_LATIN_TOUCHING = re.compile(f"[A-Za-z]{_JAPANESE}|{_JAPANESE}[A-Za-z]")


def _resources(fork, rtype, n):
    """Up to n resources of one type."""
    return list(islice(fork.resources(rtype), n))


def _open_fork(data):
    try:
        return ResFile.from_bytes(data)
    except RsrcError:  # not a resource fork
        return None


def mac_pictures(data):
    """The pictures in data as (kind, images, failed), or None when it
    has none. images lists (key, rid, payload, (w, h, palette, idx))
    with key "TYPE id", or "PICT" and rid None for a data-fork file;
    failed lists "TYPE id: why" for pictures that didn't decode. kind
    is "gravel" for a gravel add-on's fork (it carries Grvl),
    "accessory" for an accessory add-on's (AccI), else "picture"."""
    fork = _open_fork(data)
    res = []
    if fork is not None:
        for t in PICTURE_TYPES:
            res += [(t.decode("latin-1"), rid, blob) for rid, _name, _attr, blob
                    in _resources(fork, t, MAX_FILE_PICTURES)]
        res = res[:MAX_FILE_PICTURES]
    if res:
        kind = ("gravel" if _resources(fork, b"Grvl", 1)
                else "accessory" if _resources(fork, b"AccI", 1)
                else "picture")
        # Keyed as the TypeScript Map is: an id a crafted map lists twice
        # keeps its first place and its last picture.
        images, failed = {}, []
        for t, rid, blob in res:
            key = f"{t} {rid}"
            try:
                images[key] = (key, rid, blob, decode_pict(blob))
            except PictError as e:
                failed.append(f"{key}: {e}")
        return kind, list(images.values()), failed
    file = _pict_file(data)
    if file is None:
        return None
    try:
        return "picture", [("PICT", None, file, decode_pict(file))], []
    except PictError as e:
        return "picture", [], [f"PICT: {e}"]


def _pict_file(data):
    """The PICT file data is, or carries in its data fork, or None. The
    data fork can be a wrapping in turn (a MacBinary file sent on as
    BinHex), so it is peeled as unwrap_container peels forks."""
    for _ in range(MAX_WRAPPINGS + 1):
        if data is None:
            return None
        if is_pict(data):
            return data
        data = data_fork(data)
    return None


def has_mac_pictures(data):
    """Whether data carries pictures mac_pictures would try, without
    decoding any: a PICT file, or a fork with picture resources."""
    fork = _open_fork(data)
    if fork is not None and any(_resources(fork, t, 1) for t in PICTURE_TYPES):
        return True
    return _pict_file(data) is not None


def mac_display_name(name):
    """A Mac file's name for people, as web/import.ts's macDisplayName:
    no AppleDouble "._", and Japanese read back where an archiver took
    Shift-JIS bytes for Mac Roman ("ë€" is 苔, moss). A heuristic: the
    bytes must decode as Shift-JIS and give kana or kanji, none of them
    right next to an ASCII letter, as an accented Latin name's would be
    ("Noël" reads "No鼠")."""
    base = name[2:] if name.startswith("._") else name
    if all(ord(c) < 0x80 for c in base):
        return base
    try:
        # cp932 is the Shift-JIS a browser's TextDecoder("shift_jis")
        # reads, extension kanji included.
        fixed = base.encode("mac_roman").decode("cp932")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return base
    if re.search(_JAPANESE, fixed) and not _LATIN_TOUCHING.search(fixed):
        return fixed
    return base
