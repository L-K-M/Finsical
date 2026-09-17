"""Minimal image helpers: decode 8-bit BMP, encode PNG (stdlib only)."""
import struct, zlib


def read_bmp(d, off=0):
    """Decode a BMP at d[off:]. Returns (w, h, rgba_bytes, bmp_size)."""
    assert d[off:off + 2] == b'BM'
    size = struct.unpack_from('<I', d, off + 2)[0]
    px_off = struct.unpack_from('<I', d, off + 10)[0]
    hdr = struct.unpack_from('<I', d, off + 14)[0]
    assert hdr >= 40, f'unsupported DIB header size {hdr}'
    w, h = struct.unpack_from('<ii', d, off + 18)
    bpp, comp = struct.unpack_from('<HI', d, off + 28)
    ncol = struct.unpack_from('<I', d, off + 46)[0] or (1 << bpp)
    assert comp in (0, 1), f'unsupported compression {comp}'
    topdown = h < 0
    h = abs(h)
    pal = []
    for i in range(ncol):
        b, g, r, _ = d[off + 14 + hdr + i * 4: off + 18 + hdr + i * 4]
        pal.append((r, g, b))
    rgba = bytearray(w * h * 4)
    stride = ((w * bpp + 31) // 32) * 4
    rows = []
    if comp == 1:  # RLE8: one continuous stream, first stored scanline = image bottom
        p, done = off + px_off, False
        end = off + size if size else len(d)
        while len(rows) < h and not done and p + 1 < end:
            run = bytearray()
            while p + 1 < end:  # consume commands until EOL/EOB, clip at w
                n, v = d[p], d[p + 1]
                p += 2
                if n:  # encoded run
                    run += bytes([v]) * n
                elif v == 0:  # end of line
                    break
                elif v == 1:  # end of bitmap
                    done = True
                    break
                elif v == 2:  # delta: move right dx, down dy
                    dx, dy = d[p], d[p + 1]
                    p += 2
                    if dy:
                        rows.append(bytes(run[:w]).ljust(w, b'\0'))
                        rows += [bytes(w)] * (dy - 1)
                        run = bytearray(b'\0' * dx)
                    else:
                        run += b'\0' * dx
                else:  # absolute run
                    run += d[p:p + v]
                    p += v + (v & 1)
            rows.append(bytes(run[:w]).ljust(w, b'\0'))
        rows += [bytes(w)] * (h - len(rows))
    for y in range(h):
        row = y if topdown else h - 1 - y
        if bpp == 8:
            if comp == 0:
                base = off + px_off + row * stride
                idx = d[base:base + w]
            else:  # RLE8 rows are in stored order; flip like uncompressed rows
                idx = rows[row]
        else:
            raise ValueError(f'bpp {bpp} unsupported')
        for x in range(w):
            r, g, b = pal[idx[x]] if idx[x] < len(pal) else (0, 0, 0)
            i = (y * w + x) * 4
            rgba[i:i + 4] = bytes((r, g, b, 255))
    return w, h, bytes(rgba), size


def write_png(path, w, h, rgba):
    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    raw = b''.join(b'\x00' + rgba[y * w * 4:(y + 1) * w * 4] for y in range(h))
    png = (b'\x89PNG\r\n\x1a\n'
           + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
           + chunk(b'IDAT', zlib.compress(raw, 9))
           + chunk(b'IEND', b''))
    with open(path, 'wb') as f:
        f.write(png)


def save_indexed_png(path, w, h, idx, pal):
    """idx: bytes of palette indices; pal: list of (r,g,b)."""
    rgba = bytearray(w * h * 4)
    assert len(idx) == w * h, 'index buffer size does not match w*h'
    for i, v in enumerate(idx):
        r, g, b = pal[v] if v < len(pal) else (0, 0, 0)
        rgba[i * 4:i * 4 + 4] = bytes((r, g, b, 255))
    write_png(path, w, h, bytes(rgba))
