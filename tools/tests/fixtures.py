"""Build minimal-but-valid binary fixtures for the extractor parsers."""
import struct


def build_bmp8(w: int, h: int, idx: bytes, pal: list) -> bytes:
    """8-bit uncompressed BMP. idx is top-down row-major pixel indices."""
    assert len(idx) == w * h, f"idx is {len(idx)} bytes, expected {w * h}"
    assert 0 < len(pal) <= 256, "8-bit palette must hold 1-256 entries"
    stride = ((w * 8 + 31) // 32) * 4
    palbytes = b"".join(struct.pack("<4B", b, g, r, 0) for r, g, b in pal)
    palbytes += b"\0" * (256 - len(pal)) * 4
    px = bytearray()
    for y in range(h - 1, -1, -1):  # bottom-up
        row = idx[y * w:(y + 1) * w]
        px += row + b"\0" * (stride - w)
    px_off = 14 + 40 + 256 * 4
    size = px_off + len(px)
    hdr = (b"BM" + struct.pack("<IHHI", size, 0, 0, px_off)
           + struct.pack("<IiiHHIIiiII", 40, w, h, 1, 8, 0, len(px),
                         2835, 2835, 256, 0))
    return hdr + palbytes + bytes(px)


def build_bmp8_rle(w: int, h: int, idx: bytes, pal: list) -> bytes:
    """8-bit RLE8 BMP: each row one absolute run + EOL, then end-of-bitmap."""
    assert len(idx) == w * h
    palbytes = b"".join(struct.pack("<4B", b, g, r, 0) for r, g, b in pal)
    palbytes += b"\0" * (256 - len(pal)) * 4
    px = bytearray()
    for y in range(h - 1, -1, -1):  # stored bottom-up
        px += b"\x00" + bytes([w]) + idx[y * w:(y + 1) * w]
        if w & 1:
            px += b"\x00"          # absolute runs pad to even
        px += b"\x00\x00"          # end of line
    px += b"\x00\x01"              # end of bitmap
    px_off = 14 + 40 + 256 * 4
    size = px_off + len(px)
    hdr = (b"BM" + struct.pack("<IHHI", size, 0, 0, px_off)
           + struct.pack("<IiiHHIIiiII", 40, w, h, 1, 8, 1, len(px),
                         2835, 2835, 256, 0))
    return hdr + palbytes + bytes(px)


def build_rsrc(types: dict) -> bytes:
    """Resource fork. types: {b'TYPE': [(id, name_or_None, attr, data)]}."""
    data_area = bytearray()
    data_offsets = []
    for tid, entries in types.items():
        for rid, name, attr, blob in entries:
            data_offsets.append((tid, rid, name, attr, len(data_area)))
            data_area += struct.pack(">I", len(blob)) + blob

    type_list = bytearray(struct.pack(">H", len(types) - 1))
    ref_lists = bytearray()
    # ref-list offsets are relative to the start of the type list
    ref_base = 2 + 8 * len(types)
    name_list = bytearray()
    name_offsets = {}
    for tid, entries in types.items():
        type_list += tid + struct.pack(">HH", len(entries) - 1,
                                       ref_base + len(ref_lists))
        for rid, name, attr, doff in [
                (e[1], e[2], e[3], e[4]) for e in data_offsets if e[0] == tid]:
            if name is None:
                noff = -1
            else:
                noff = name_offsets.get(name)
                if noff is None:
                    noff = len(name_list)
                    nb = name.encode("mac_roman")
                    name_list += bytes([len(nb)]) + nb
                    name_offsets[name] = noff
            ref_lists += struct.pack(">hh", rid, noff)
            ref_lists += bytes([attr]) + doff.to_bytes(3, "big")
            ref_lists += b"\0" * 4

    type_list += ref_lists
    map_body = (b"\0" * 22 + struct.pack(">HHH", 0, 28, 28 + len(type_list))
                + type_list + name_list)

    data_off = 256
    map_off = data_off + len(data_area)
    header = struct.pack(">4I", data_off, map_off, len(data_area),
                         len(map_body))
    return (header + b"\0" * (data_off - 16) + bytes(data_area)
            + map_body)


def build_pack(chunks, directory=(), tag=b"XXXX", version=0x5DC) -> bytes:
    """9003inc pack. chunks: [payload]; directory: [(res_id, sub, chunk_idx)].
    Trailer holds a 16-byte header copy then 12-byte directory records."""
    body = bytearray(b"\0" * 0x100)
    starts = []
    for pl in chunks:
        starts.append(len(body))
        body += struct.pack("<I", len(pl)) + pl
    dir_off = len(body)
    hdr = struct.pack("<IIII", 0x00000100, dir_off, dir_off - 0x100,
                      starts[0] + 4 if starts else 0)
    body[:len(hdr)] = hdr
    body[16:20] = tag[:4].ljust(4, b"\0")
    body[20:24] = struct.pack("<I", version)
    trailer = bytearray(hdr)  # header copy
    for rid, sub, idx in directory:
        trailer += struct.pack("<HHII", rid, sub, starts[idx] - 0x100, 0)
    return bytes(body + trailer)


def _encode_frame_stream(px: bytes) -> bytes:
    """Encode column-major pixels into the Aquazone signed-i16 RLE format.

    Each item is a little-endian i16 `v`: v < 0 emits -v pixels of the next
    byte (a color run), v > 0 emits the next v bytes as literal pixels.
    Runs shorter than 2 ride as literals.
    """
    out = bytearray()
    n = len(px)
    i = 0
    while i < n:
        j = i
        while j < n and px[j] == px[i]:
            j += 1
        if j - i >= 2:
            run = j - i
            while run > 0x7FFF:
                out += struct.pack("<h", -0x7FFF) + bytes([px[i]])
                run -= 0x7FFF
            out += struct.pack("<h", -run) + bytes([px[i]])
            i = j
            continue
        k = i
        while k < n:
            m = k
            while m < n and px[m] == px[k]:
                m += 1
            if m - k >= 2:
                break
            k = m
        lits = px[i:k]
        for off in range(0, len(lits), 0x7FFF):
            seg = lits[off:off + 0x7FFF]
            out += struct.pack("<h", len(seg)) + seg
        i = k
    return bytes(out)


def build_fsh(frames_per_group: int, frames: list) -> bytes:
    """Sprite-stream chunk. frames: [(w, h, column_major_idx)], length a
    multiple of frames_per_group. Returns header + records payload."""
    nf = frames_per_group
    ng = len(frames) // nf
    assert ng * nf == len(frames)
    out = bytearray(struct.pack("<HHI", ng, nf, 0))
    for gi in range(ng):
        for fi in range(nf):
            w, h, px = frames[gi * nf + fi]
            assert len(px) == w * h
            stream = _encode_frame_stream(px)
            out += struct.pack("<HHHI", w, h, 0, len(stream)) + stream
            if fi == nf - 1:
                out += b"" if gi == ng - 1 else struct.pack("<HI", nf, 0)
            else:
                out += b"\0" * 4
    return bytes(out)


def wrap_appledouble(rsrc: bytes) -> bytes:
    """Wrap resource-fork bytes in an AppleDouble file (entry id 2)."""
    entry_off = 26 + 12
    hdr = struct.pack(">II", 0x00051607, 0x00020000) + b"\0" * 16
    hdr += struct.pack(">H", 1) + struct.pack(">III", 2, entry_off, len(rsrc))
    return hdr + rsrc


def wrap_macbinary(rsrc: bytes, data: bytes = b"",
                   name: bytes = b"file") -> bytes:
    """Wrap a resource fork in a MacBinary container (128-byte header,
    data fork padded to 128, then the resource fork)."""
    hdr = bytearray(128)
    hdr[1] = len(name)
    hdr[2:2 + len(name)] = name
    hdr[65:69] = b"APPL"
    hdr[69:73] = b"9003"
    struct.pack_into(">II", hdr, 83, len(data), len(rsrc))
    return bytes(hdr) + data + b"\0" * (-len(data) % 128) + rsrc


_BINHEX_ALPHABET = (
    b'!"#$%&\'()*+,-012345689@ABCDEFGHIJKLMNPQRSTUVXYZ[`abcdefhijklmpqr')


def wrap_binhex(rsrc: bytes, data: bytes = b"",
                name: bytes = b"file") -> bytes:
    """Wrap a resource fork in BinHex 4 text: header + forks, RLE-coded
    (0x90 literals and 4+ byte runs), then 6-bit packed between ':'."""
    body = (bytes([len(name)]) + name + b"\0" + b"APPL9003"
            + struct.pack(">HII", 0, len(data), len(rsrc)) + b"\0\0"
            + data + b"\0\0" + rsrc + b"\0\0")
    rle = bytearray()
    i = 0
    while i < len(body):
        b = body[i]
        run = 1
        while i + run < len(body) and body[i + run] == b and run < 255:
            run += 1
        if b == 0x90:
            rle += b"\x90\x00"  # literal marker byte
            i += 1
        elif run >= 4:
            rle += bytes([b, 0x90, run])
            i += run
        else:
            rle += bytes([b]) * run
            i += run
    return binhex_text(bytes(rle))


def binhex_text(rle: bytes) -> bytes:
    """BinHex 4 text for a stream already run-length coded (0x90 runs),
    between the preamble line and the closing colon."""
    enc = bytearray()
    for i in range(0, len(rle), 3):
        chunk = rle[i:i + 3]
        acc = int.from_bytes(chunk.ljust(3, b"\0"), "big")
        n = 4 if len(chunk) == 3 else len(chunk) + 1
        enc += bytes(_BINHEX_ALPHABET[(acc >> s) & 63]
                     for s in (18, 12, 6, 0)[:n])
    return (b"(This file must be converted with BinHex 4.0)\r\n:"
            + bytes(enc) + b":")


# ---- QuickDraw pictures (tools/az/pict.py), after core/data/pict.fixture.ts

def _be16(v):
    return [(v >> 8) & 0xFF, v & 0xFF]


def _be32(v):
    return [(v >> 24) & 0xFF, (v >> 16) & 0xFF, (v >> 8) & 0xFF, v & 0xFF]


def _rect(r):
    return sum((_be16(v) for v in r), [])


def pack_bits(src, unit=1):
    """PackBits, as QuickDraw writes it: runs of three units or more
    repeat, the rest go literal."""
    n = len(src) // unit
    at = lambda i: list(src[i * unit:i * unit + unit])  # noqa: E731
    out, i = [], 0
    while i < n:
        run = 1
        while i + run < n and run < 128 and at(i + run) == at(i):
            run += 1
        if run >= 3:
            out += [257 - run] + at(i)
            i += run
            continue
        j = i
        while j < n and j - i < 128:
            if j + 2 < n and at(j) == at(j + 1) == at(j + 2):
                break
            j += 1
        out.append(j - i - 1)
        for k in range(i, j):
            out += at(k)
        i = j
    return out


def build_pict(w, h, px, depth=8, clut=None, file=False, direct=None,
               pack_type=4):
    """A version 2 picture of one bitmap filling its w x h frame. With a
    color table, px holds pixel values; with direct=16 or 32, px holds
    0xRRGGBB colors (packType 4 by default, 3 for 16-bit). `file` adds
    a data-fork file's 512-byte header."""
    pic = _be16(0) + _rect((0, 0, h, w)) + [0x00, 0x11, 0x02, 0xFF,
                                            0x0C, 0x00] + [0] * 24
    bounds = _rect((0, 0, h, w))
    fields = lambda pt, d, ptype, cmp_, csize: (  # noqa: E731
        _be16(0) + _be16(pt) + _be32(0) + _be32(72 << 16) + _be32(72 << 16)
        + _be16(ptype) + _be16(d) + _be16(cmp_) + _be16(csize) + [0] * 12)
    place = bounds + bounds + _be16(0)

    def rows(row_of, row_bytes, unit=1):
        out = []
        for y in range(h):
            raw = row_of(y)
            if row_bytes < 8:
                out += raw
                continue
            enc = pack_bits(raw, unit)
            out += (_be16(len(enc)) if row_bytes > 250 else [len(enc)]) + enc
        return out

    if direct == 32:
        row_bytes = w * 4
        planes = lambda y: [c >> s & 0xFF for s in (16, 8, 0)  # noqa: E731
                            for c in px[y * w:(y + 1) * w]]
        pic += ([0x00, 0x9A] + _be32(0xFF) + _be16(row_bytes | 0x8000) + bounds
                + fields(pack_type, 32, 16, 3, 8) + place + rows(planes, row_bytes))
    elif direct == 16:
        row_bytes = w * 2
        words = lambda y: sum((_be16(((c >> 19) & 31) << 10  # noqa: E731
                                     | ((c >> 11) & 31) << 5 | ((c >> 3) & 31))
                               for c in px[y * w:(y + 1) * w]), [])
        pic += ([0x00, 0x9A] + _be32(0xFF) + _be16(row_bytes | 0x8000) + bounds
                + fields(3, 16, 16, 3, 5) + place + rows(words, row_bytes, 2))
    else:
        clut = clut or [(255, 255, 255), (0, 0, 0)]
        row_bytes = -(-w * depth // 8)
        row_bytes += row_bytes & 1

        def bits(y):
            row = [0] * row_bytes
            for x in range(w):
                v = px[y * w + x] & ((1 << depth) - 1)
                bit = x * depth
                row[bit >> 3] |= v << (8 - depth - (bit & 7))
            return row
        table = (_be32(0) + _be16(0x8000) + _be16(len(clut) - 1)
                 + sum((_be16(0) + _be16(r * 257) + _be16(g * 257)
                        + _be16(b * 257) for r, g, b in clut), []))
        pic += ([0x00, 0x98] + _be16(row_bytes | 0x8000) + bounds
                + fields(0, depth, 0, 1, depth) + table + place
                + rows(bits, row_bytes))
    if len(pic) & 1:
        pic.append(0)
    pic += [0x00, 0xFF]
    return bytes(([0] * 512 if file else []) + pic)
