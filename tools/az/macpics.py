"""The pictures in a classic Mac file, the Python twin of
core/data/macpics.ts: a data-fork PICT (a backdrop as Photoshop saved
it, 512-byte header and all), or the picture resources of a resource
fork in any wrapping rsrc.py peels. Stdlib only.

AquaZone files its pictures under its own resource types. A gravel
add-on carries, all as id 4020, the strip the tank draws (BAPC), the
picture the item catalog shows (BADP) and the floor's geometry (Grvl):
the Windows .grv packs carry the same three. 'PICT' is the Mac's own
picture resource.
"""
from itertools import islice

from .pict import PictError, decode_pict, is_pict
from .rsrc import ResFile

# In-tank art first, so it leads the images' order.
PICTURE_TYPES = (b"BAPC", b"BADP", b"PICT")
# Most pictures decoded from one file, as in core/data/macpics.ts: an
# application's fork holds hundreds of interface PICTs.
MAX_FILE_PICTURES = 16


def _resources(fork, rtype, n):
    """Up to n resources of one type; [] where a crafted map breaks."""
    try:
        return list(islice(fork.resources(rtype), n))
    except Exception:  # struct.error, IndexError: an unreadable map
        return []


def _open_fork(data):
    try:
        return ResFile.from_bytes(data)
    except Exception:  # not a resource fork
        return None


def mac_pictures(data):
    """The pictures in data as (gravel, images, failed), or None when it
    has none. images lists (key, rid, payload, (w, h, palette, idx))
    with key "TYPE id", or "PICT" and rid None for a data-fork file;
    failed lists "TYPE id: why" for pictures that didn't decode. gravel
    is whether a Grvl record marks a gravel add-on's fork."""
    fork = _open_fork(data)
    res = []
    if fork is not None:
        for t in PICTURE_TYPES:
            res += [(t.decode("latin-1"), rid, blob) for rid, _name, _attr, blob
                    in _resources(fork, t, MAX_FILE_PICTURES)]
        res = res[:MAX_FILE_PICTURES]
    if res:
        gravel = bool(_resources(fork, b"Grvl", 1))
        images, failed = [], []
        for t, rid, blob in res:
            try:
                images.append((f"{t} {rid}", rid, blob, decode_pict(blob)))
            except PictError as e:
                failed.append(f"{t} {rid}: {e}")
        return gravel, images, failed
    if not is_pict(data):
        return None
    try:
        return False, [("PICT", None, data, decode_pict(data))], []
    except PictError as e:
        return False, [], [f"PICT: {e}"]


def has_mac_pictures(data):
    """Whether data carries pictures mac_pictures would try, without
    decoding any: a PICT file, or a fork with picture resources."""
    fork = _open_fork(data)
    if fork is not None and any(_resources(fork, t, 1) for t in PICTURE_TYPES):
        return True
    return is_pict(data)


def mac_display_name(name):
    """A Mac file's name for people, as web/import.ts's macDisplayName:
    no AppleDouble "._", and Japanese read back where an archiver took
    Shift-JIS bytes for Mac Roman ("ë€" is 苔, moss). A heuristic: the
    bytes must decode as Shift-JIS and give kana or kanji."""
    base = name[2:] if name.startswith("._") else name
    if all(ord(c) < 0x80 for c in base):
        return base
    try:
        fixed = base.encode("mac_roman").decode("shift_jis")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return base
    if any("\u3040" <= c <= "\u30ff" or "\u4e00" <= c <= "\u9fff"
           for c in fixed):
        return fixed
    return base
