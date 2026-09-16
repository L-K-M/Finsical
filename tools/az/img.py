"""Minimal image helpers: decode 8-bit BMP, encode PNG (stdlib only)."""
import struct, zlib


def read_bmp(d, off=0):
    """Decode a BMP at d[off:]. Returns (w, h, rgba_bytes) bottom-up handled."""
    assert d[off:off + 2] == b'BM'
    size = struct.unpack_from('<I', d, off + 2)[0]
    px_off = struct.unpack_from('<I', d, off + 10)[0]
    hdr = struct.unpack_from('<I', d, off + 14)[0]
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
    for y in range(h):
        row = y if topdown else h - 1 - y
        base = off + px_off + row * stride
        if bpp == 8:
            if comp == 0:
                idx = d[base:base + w]
            else:  # RLE8
                idx = bytearray()
                p = base
                while len(idx) < w and p < off + size:
                    n, v = d[p], d[p + 1]
                    if n:
                        idx += bytes([v]) * n
                        p += 2
                    else:
                        p += 2
                        if v == 0 or v == 1:
                            break
                        if v == 2:
                            p += 2
                            continue
                        idx += d[p:p + v]
                        p += v + (v & 1)
                idx = bytes(idx[:w])
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
    for i, v in enumerate(idx):
        r, g, b = pal[v] if v < len(pal) else (0, 0, 0)
        rgba[i * 4:i * 4 + 4] = bytes((r, g, b, 255))
    write_png(path, w, h, bytes(rgba))
