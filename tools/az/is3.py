"""InstallShield 3 archives: the data.z cabinets (signature 13 5D 65 8C)
the AquaZone US discs keep their Windows items in, and the PKWARE DCL
Implode compression their members use. Stdlib only.

An archive is a header, the members' data, a table of directories and
a table of files. All numbers are little-endian. The layout follows
what the three AquaZone cabinets hold and what deark's is_z module
reads; fields the cabinets keep constant and nothing here needs are
skipped.
"""
import struct

SIGNATURE = b"\x13\x5d\x65\x8c"
# Header offsets: the file count, the directory table's offset and
# count, and the file table's offset.
_H_FILES, _H_DIRPOS, _H_DIRS, _H_FILEPOS = 12, 41, 49, 51
_HEADER = 55
# A file entry: the fields before its name.
_ENTRY = 30
# Attribute bit for a member stored as it is, not imploded.
_STORED = 0x10
# Largest member read: the cabinets' biggest is 1.2 MB, and a crafted
# size must not ask for gigabytes.
MAX_MEMBER_BYTES = 64 << 20


class Is3Error(ValueError):
    """An InstallShield 3 archive that is malformed, truncated, split
    across volumes or in a form this reader doesn't take."""


def is_is3(d):
    return d[:4] == SIGNATURE


class Member:
    """One file in the archive: its path ("dir/name"), its size, and
    where and how its data is stored."""

    def __init__(self, path, size, packed, offset, stored):
        self.path, self.size = path, size
        self.packed, self.offset, self.stored = packed, offset, stored

    def __repr__(self):
        return f"Member({self.path!r}, {self.size})"


def _u16(d, o):
    if o + 2 > len(d):
        raise Is3Error("archive is truncated")
    return struct.unpack_from("<H", d, o)[0]


def _u32(d, o):
    if o + 4 > len(d):
        raise Is3Error("archive is truncated")
    return struct.unpack_from("<I", d, o)[0]


def _name(d, o, n):
    if o + n > len(d):
        raise Is3Error("archive is truncated")
    return d[o:o + n].decode("cp1252", "replace")


def members(d):
    """The archive's files, in table order. Raises Is3Error."""
    if not is_is3(d) or len(d) < _HEADER:
        raise Is3Error("not an InstallShield 3 archive")
    nfiles, ndirs = _u16(d, _H_FILES), _u16(d, _H_DIRS)
    dirs, p = [], _u32(d, _H_DIRPOS)
    for _ in range(ndirs):
        seg, n = _u16(d, p + 2), _u16(d, p + 4)
        if seg < 6 + n:
            raise Is3Error("bad directory entry")
        dirs.append(_name(d, p + 6, n))
        p += seg
    out, p = [], _u32(d, _H_FILEPOS)
    for _ in range(nfiles):
        if p + _ENTRY > len(d):
            raise Is3Error("archive is truncated")
        di, size, packed, offset = struct.unpack_from("<HIII", d, p + 1)
        seg, attr, split = _u16(d, p + 23), d[p + 25], d[p + 26]
        n = d[p + 29]
        if seg < _ENTRY + n:
            raise Is3Error("bad file entry")
        if di >= len(dirs):
            raise Is3Error("file entry names a missing directory")
        if split:
            raise Is3Error("member is split across volumes")
        if offset + packed > len(d):
            raise Is3Error("member data runs past the end")
        name = _name(d, p + _ENTRY, n)
        path = f"{dirs[di]}/{name}" if dirs[di] else name
        out.append(Member(path, size, packed, offset, bool(attr & _STORED)))
        p += seg
    return out


def read_member(d, m):
    """A member's bytes, exploded unless it is stored. Raises Is3Error."""
    if m.size > MAX_MEMBER_BYTES:
        raise Is3Error(f"{m.path}: {m.size} bytes is over the cap")
    data = d[m.offset:m.offset + m.packed]
    if m.stored:
        if len(data) != m.size:
            raise Is3Error(f"{m.path}: stored size doesn't match")
        return bytes(data)
    return explode(data, m.size)


# ---- PKWARE DCL Implode ---------------------------------------------
#
# The decoder follows the format as zlib's contrib/blast documents it:
# a byte saying whether literals are coded (1) or raw (0), a byte
# giving the distance's low bits (4 to 6), then tokens, read a bit at a
# time from each byte's low bit up. A 0 bit starts a literal, a 1 a
# match: a length, then a distance back into what came out. Length 519
# ends the stream. The three codes are fixed canonical Huffman codes,
# sent with every bit inverted, most significant first; their code
# lengths below are as deark's fmtutil-lzh.c (MIT) packs them, two to
# a byte, high nibble first.

_LIT_LENGTHS = bytes.fromhex(
    "bcccccccc87cc7ccccccccccccdccccc4a8caca87789767876777787788cb79b"
    "c676657886b967667b66679899b8b9c8c566656665b756556a55558788abbccc"
    "ddddddddddddddddddddddddddddddddddddddddddddddddcccccccccccccccc"
    "ccccccccccccccccccccccccccccccccdcdddcdddcddddcdddcccddddddddddd")
_LEN_LENGTHS = bytes.fromhex("2333444555566677")
_DIST_LENGTHS = bytes.fromhex(
    "2445555666666666666666777777777777777777777777778888888888888888")
# Match lengths by length code: a base, and the extra bits after it.
_LEN_BASE = (3, 2, 4, 5, 6, 7, 8, 9, 10, 12, 16, 24, 40, 72, 136, 264)
_LEN_EXTRA = (0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8)
_END = 519


def _nibbles(packed, n):
    return [packed[i // 2] >> 4 if i % 2 == 0 else packed[i // 2] & 15
            for i in range(n)]


def _decoder(lengths):
    """(width, table): the next `width` bits of the stream, in reading
    order from bit 0, index the table, which gives (symbol, code
    length). Codes are canonical: shorter first, and by symbol within
    a length."""
    width = max(lengths)
    table = [None] * (1 << width)
    code = 0
    for length in range(1, width + 1):
        for sym, n in enumerate(lengths):
            if n != length:
                continue
            # Sent inverted, most significant bit first: as read from
            # bit 0 up, that is the code's bits reversed, flipped.
            sent = 0
            for k in range(length):
                sent |= (((code >> (length - 1 - k)) & 1) ^ 1) << k
            for at in range(sent, 1 << width, 1 << length):
                table[at] = (sym, length)
            code += 1
        code <<= 1
    return width, table


_LIT = _decoder(_nibbles(_LIT_LENGTHS, 256))
_LEN = _decoder(_nibbles(_LEN_LENGTHS, 16))
_DIST = _decoder(_nibbles(_DIST_LENGTHS, 64))


def explode(src, size):
    """Decompress a DCL Implode stream to exactly `size` bytes. Raises
    Is3Error for a stream that is malformed, truncated, or doesn't come
    to `size` bytes at its end code."""
    if size > MAX_MEMBER_BYTES:
        raise Is3Error(f"{size} bytes is over the cap")
    if len(src) < 2:
        raise Is3Error("imploded data is truncated")
    coded, low = src[0], src[1]
    if coded > 1 or not 4 <= low <= 6:
        raise Is3Error("not DCL imploded data")
    out = bytearray()
    buf = cnt = 0  # bits not yet used, and how many
    pos, end = 2, len(src)

    def fill(n):
        nonlocal buf, cnt, pos
        while cnt < n and pos < end:
            buf |= src[pos] << cnt
            pos += 1
            cnt += 8

    def bits(n):
        nonlocal buf, cnt
        fill(n)
        if cnt < n:
            raise Is3Error("imploded data is truncated")
        v = buf & ((1 << n) - 1)
        buf >>= n
        cnt -= n
        return v

    def decode(dec):
        nonlocal buf, cnt
        width, table = dec
        fill(width)
        hit = table[buf & ((1 << width) - 1)]
        if hit is None or hit[1] > cnt:
            raise Is3Error("imploded data is truncated or corrupt")
        buf >>= hit[1]
        cnt -= hit[1]
        return hit[0]

    while True:
        if not bits(1):
            out.append(decode(_LIT) if coded else bits(8))
        else:
            sym = decode(_LEN)
            length = _LEN_BASE[sym] + bits(_LEN_EXTRA[sym])
            if length == _END:
                break
            extra = 2 if length == 2 else low
            dist = (decode(_DIST) << extra) + bits(extra) + 1
            start = len(out) - dist
            if start < 0:
                raise Is3Error("imploded data reaches back before its start")
            if dist >= length:
                out += out[start:start + length]
            else:  # the copy overlaps what it writes
                for i in range(length):
                    out.append(out[start + i])
        if len(out) > size:
            raise Is3Error("imploded data is longer than its member")
    if len(out) != size:
        raise Is3Error("imploded data is shorter than its member")
    return bytes(out)
