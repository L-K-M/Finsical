"""Build minimal-but-valid binary fixtures for the extractor parsers."""
import struct


def _packbits_literal(data: bytes) -> bytes:
    """Encode as pure literal runs (max 128 bytes each)."""
    out = bytearray()
    for i in range(0, len(data), 128):
        run = data[i:i + 128]
        out.append(len(run) - 1)
        out += run
    return bytes(out)


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


def build_pict8(w: int, h: int, idx: bytes, pal: list) -> bytes:
    """PICT v2 with a single PackBitsRect. idx is top-down row-major."""
    rowbytes = w
    out = bytearray()
    out += struct.pack(">H4H", 0, 0, 0, h, w)      # picSize, picFrame
    out += struct.pack(">HH", 0x0011, 0x02FF)      # version op
    out += struct.pack(">H", 0x0C00) + b"\0" * 24  # headerOp
    out += struct.pack(">H", 0x0098)               # PackBitsRect
    out += struct.pack(">H4H", rowbytes | 0x8000, 0, 0, h, w)
    out += struct.pack(">HHI", 0, 0, 0)            # pmVersion, packType, packSize
    out += struct.pack(">II", 72 << 16, 72 << 16)  # hRes, vRes
    out += struct.pack(">HHHH", 0, 8, 1, 8)        # pixelType, size, cmp
    out += struct.pack(">III", 0, 0, 0)            # planeBytes, pmTable, rsvd
    out += struct.pack(">IHH", 0, 0, len(pal) - 1)  # ctSeed, ctFlags, ctSize
    for i, (r, g, b) in enumerate(pal):
        out += struct.pack(">H3H", i, r << 8, g << 8, b << 8)
    out += struct.pack(">4H4HH", 0, 0, h, w, 0, 0, h, w, 0)  # src, dst, mode
    for y in range(h):
        enc = _packbits_literal(idx[y * w:(y + 1) * w])
        if rowbytes > 250:  # word-length row counts when rowBytes > 250
            out += struct.pack(">H", len(enc))
        else:
            out.append(len(enc))
        out += enc
    out += struct.pack(">H", 0x00FF)               # endOfPic
    return bytes(out)


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
    enc = bytearray()
    for i in range(0, len(rle), 3):
        chunk = rle[i:i + 3]
        acc = int.from_bytes(chunk.ljust(3, b"\0"), "big")
        n = 4 if len(chunk) == 3 else len(chunk) + 1
        enc += bytes(_BINHEX_ALPHABET[(acc >> s) & 63]
                     for s in (18, 12, 6, 0)[:n])
    return (b"(This file must be converted with BinHex 4.0)\r\n:"
            + bytes(enc) + b":")
