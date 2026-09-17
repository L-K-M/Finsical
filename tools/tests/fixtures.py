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


def wrap_appledouble(rsrc: bytes) -> bytes:
    """Wrap resource-fork bytes in an AppleDouble file (entry id 2)."""
    entry_off = 26 + 12
    hdr = struct.pack(">II", 0x00051607, 0x00020000) + b"\0" * 16
    hdr += struct.pack(">H", 1) + struct.pack(">III", 2, entry_off, len(rsrc))
    return hdr + rsrc
