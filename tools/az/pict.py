"""PICT v2 -> pixels decoder. Handles PackBitsRect/DirectBitsRect with
color tables. Stdlib only."""
import struct


def _packbits(d, p, n):
    out = bytearray()
    while len(out) < n and p < len(d):
        b = d[p]; p += 1
        if b < 0x80:
            out += d[p:p + b + 1]; p += b + 1
        elif b > 0x80:
            out += bytes([d[p]]) * (257 - b); p += 1
    return bytes(out)


class PictError(Exception):
    pass


class Pict:
    def __init__(self, d, off=0):
        self.d = d
        self.p = off
        self.pal = []
        self.psize = 8
        self._run()

    def _u16(self):
        v = struct.unpack_from('>H', self.d, self.p)[0]; self.p += 2; return v

    def _u32(self):
        v = struct.unpack_from('>I', self.d, self.p)[0]; self.p += 4; return v

    def _rect(self):
        t, l, b, r = struct.unpack_from('>4H', self.d, self.p); self.p += 8
        return t, l, b, r

    def _pixmap(self):
        rowbytes = self._u16()
        if not rowbytes & 0x8000:
            raise PictError('expected pixmap flag')
        rowbytes &= 0x7fff
        bounds = self._rect()
        self._u16()                      # pmVersion
        pack = self._u16()               # packType
        self._u32()                      # packSize
        self._u32(); self._u32()         # hRes, vRes
        self._u16()                      # pixelType
        psize = self._u16()              # pixelSize
        self._u16()                      # cmpCount
        self._u16()                      # cmpSize
        self._u32()                      # planeBytes
        self._u32()                      # pmTable
        self._u32()                      # pmReserved
        pal = []
        self._u32()                      # ctSeed
        self._u16()                      # ctFlags
        n = self._u16() + 1              # ctSize
        for _ in range(min(n, 4096)):
            self._u16()                  # value
            r, g, b = struct.unpack_from('>3H', self.d, self.p); self.p += 6
            pal.append((r >> 8, g >> 8, b >> 8))
        return rowbytes, bounds, pal, psize, pack

    def _read_pixdata(self, rowbytes, bounds, psize):
        t, l, b, r = bounds
        h = b - t
        d = self.d
        rows = []
        for _ in range(h):
            cnt = self.d[self.p] if rowbytes <= 250 else self._u16()
            self.p += 1 if rowbytes <= 250 else 0
            raw = d[self.p:self.p + cnt]
            rows.append(_packbits(raw, 0, rowbytes))
            self.p += cnt
        return r - l, h, rows

    def _scan_pixmap(self):
        """Fallback: scan for a PixMap signature (rowBytes|0x8000 + sane bounds
        + pmVersion 0 + pixelSize in {1,2,4,8,16,32})."""
        d = self.d
        for i in range(self.p, min(self.p + 4096, len(d) - 60)):
            rb = struct.unpack_from('>H', d, i)[0]
            if not rb & 0x8000:
                continue
            rb &= 0x7fff
            t, l, b, r = struct.unpack_from('>4H', d, i + 2)
            w, h = r - l, b - t
            if not (0 < w < 4096 and 0 < h < 4096 and rb >= (w + 7) // 8):
                continue
            if struct.unpack_from('>H', d, i + 10)[0] != 0:  # pmVersion
                continue
            if struct.unpack_from('>H', d, i + 30)[0] not in (1, 2, 4, 8, 16, 32):
                continue
            self.p = i
            return True
        return False

    def _run(self):
        self._u16()                    # picSize
        self.frame = self._rect()      # picFrame
        guard = 0
        while self.p < len(self.d) - 2 and guard < 200:
            guard += 1
            op = self._u16()
            if op in (0x0098, 0x0099, 0x009A, 0x009B):
                if op in (0x009A, 0x009B):
                    self._u32()        # baseAddr
                rowbytes, bounds, pal, psize, pack = self._pixmap()
                self._rect(); self._rect(); self._u16()  # src,dst,mode
                if op in (0x0099, 0x009B):               # region follows mode
                    sz = self._u16()
                    self.p += sz - 2
                w, h, rows = self._read_pixdata(rowbytes, bounds, psize)
                self.w, self.h, self.rows, self.pal, self.psize = w, h, rows, pal, psize
                return
            if op == 0x0000:
                continue                       # NOP
            if op == 0x0011:
                self.p += 2                    # version op
                continue
            if op == 0x0C00:
                self.p += 24                   # headerOp
                continue
            if op == 0x0001:                   # clip region
                sz = self._u16()
                self.p += sz - 2
                continue
            if op in (0x001E, 0x0001 - 0x10000, 0x02B0, 0x00FF, 0x02FF):
                continue                       # argless misc
            if op == 0x001C:
                continue                       # hiliteMode
            if op == 0x0002:                   # pen pattern (bkPat)
                self.p += 8
                continue
            if op in (0x0004, 0x0005):         # txFont/txFace
                self.p += 2
                continue
            if op == 0x00A0:                   # shortComment
                self.p += 2
                continue
            if op == 0x00A1:                   # longComment
                self.p += 2
                sz = self._u16()
                self.p += sz
                continue
            if op == 0x0006:
                self.p += 4                    # txSize? actually 2; keep 4-safe
                continue
            # unknown opcode: try signature scan
            if self._scan_pixmap():
                rowbytes, bounds, pal, psize, pack = self._pixmap()
                self._rect(); self._rect(); self._u16()
                w, h, rows = self._read_pixdata(rowbytes, bounds, psize)
                self.w, self.h, self.rows, self.pal, self.psize = w, h, rows, pal, psize
                return
            raise PictError(f'bad opcode {op:#06x} @{self.p - 2:#x}')
        raise PictError('no bits opcode found')

    def to_indexed(self):
        w, h, ps = self.w, self.h, self.psize
        out = bytearray(w * h)
        for y, row in enumerate(self.rows):
            if ps == 8:
                out[y * w:(y + 1) * w] = row[:w]
            elif ps == 4:
                for x in range(w):
                    out[y * w + x] = (row[x >> 1] >> (4 if x % 2 == 0 else 0)) & 0xF
            elif ps == 1:
                for x in range(w):
                    out[y * w + x] = 1 - ((row[x >> 3] >> (7 - x % 8)) & 1)
            elif ps == 16:
                for x in range(w):
                    v = struct.unpack_from('>H', row, x * 2)[0]
                    out[y * w + x] = self._pal_add(
                        ((v >> 10) & 31) * 255 // 31,
                        ((v >> 5) & 31) * 255 // 31,
                        (v & 31) * 255 // 31)
            elif ps == 32:
                for x in range(w):
                    _, r, g, b = row[x * 4:x * 4 + 4]
                    out[y * w + x] = self._pal_add(r, g, b)
        if not self.pal:
            self.pal = [(0, 0, 0), (255, 255, 255)]
        self.idx = bytes(out)
        return self.idx, self.pal

    def _pal_add(self, r, g, b):
        try:
            return self.pal.index((r, g, b))
        except ValueError:
            self.pal.append((r, g, b))
            return len(self.pal) - 1
