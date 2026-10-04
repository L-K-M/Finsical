"""QuickDraw PICT decoder, the Python twin of core/data/pict.ts: a
picture from a Mac data-fork file (after its 512-byte header) or a
resource payload to an indexed image. Written from "Inside Macintosh:
Imaging With QuickDraw" (Apple, 1994), Appendix A, "Picture Opcodes".
Stdlib only.

It follows the TypeScript decoder step for step, so both give the same
pixels and palette for the same picture (a test pins the median cut on
both sides): read core/data/pict.ts for the format notes. In short,
version 1 and 2 pictures draw their BitsRect, BitsRgn, PackBitsRect,
PackBitsRgn, DirectBitsRect and DirectBitsRgn bitmaps from srcRect to
dstRect onto a white page, clipped to picFrame, the clip region and
the mask region; every other opcode is skipped by its documented
length. White is always palette index 0; up to 255 other colors stay
exact, more go through median cut.

Input is untrusted: reads are bounds-checked, sizes are capped before
anything is allocated, decoded and drawn pixels share a budget, and
failures raise PictError only.
"""

# The same caps as core/data/pict.ts.
MAX_SIDE = 8192
MAX_PIXELS = 1 << 22
MAX_WORK = 1 << 25
MAX_OPCODES = 1 << 17
FILE_HEADER = 512
MAX_CLUT = 256
MAX_EXACT = 1 << 16
BINS = 1 << 15

WHITE = 0xFFFFFF
BLACK = 0x000000

BITS_OPS = (0x90, 0x91, 0x98, 0x99, 0x9A, 0x9B)


class PictError(ValueError):
    """Why a picture didn't decode: the only error decode_pict raises."""


class Rect:
    __slots__ = ("top", "left", "bottom", "right")

    def __init__(self, top, left, bottom, right):
        self.top, self.left, self.bottom, self.right = top, left, bottom, right


class _Reader:
    """Bounds-checked big-endian reads: running off the end (or past a
    region's own length) is a PictError."""

    def __init__(self, d, p, end=None):
        self.d, self.p = d, p
        self.end = len(d) if end is None else end

    def _need(self, n):
        if self.p + n > self.end:
            raise PictError("picture is truncated")

    def u8(self):
        self._need(1)
        v = self.d[self.p]
        self.p += 1
        return v

    def u16(self):
        self._need(2)
        v = self.d[self.p] << 8 | self.d[self.p + 1]
        self.p += 2
        return v

    def i16(self):
        v = self.u16()
        return v - 0x10000 if v >= 0x8000 else v

    def u32(self):
        return self.u16() * 0x10000 + self.u16()

    def skip(self, n):
        self._need(n)
        self.p += n

    def take(self, n):
        self._need(n)
        s = self.d[self.p:self.p + n]
        self.p += n
        return s

    def rect(self):
        return Rect(self.i16(), self.i16(), self.i16(), self.i16())


def _i16(d, o):
    v = d[o] << 8 | d[o + 1]
    return v - 0x10000 if v >= 0x8000 else v


def _pict_start(d):
    for base in (0, FILE_HEADER):
        if len(d) < base + 12:
            continue
        if (_i16(d, base + 6) <= _i16(d, base + 2)
                or _i16(d, base + 8) <= _i16(d, base + 4)):
            continue
        if d[base + 10] == 0x11 and d[base + 11] == 0x01:
            return base
        if (len(d) >= base + 14 and d[base + 10] == 0x00
                and d[base + 11] == 0x11 and d[base + 12] == 0x02
                and d[base + 13] == 0xFF):
            return base
    return -1


def is_pict(d):
    """Whether d starts like a QuickDraw picture, with or without a
    data-fork header: a cheap sniff, not a promise that it decodes."""
    return _pict_start(d) >= 0


def _check_size(w, h, what):
    if w <= 0 or h <= 0:
        raise PictError(f"{what} is empty ({w} x {h})")
    if w > MAX_SIDE or h > MAX_SIDE or w * h > MAX_PIXELS:
        raise PictError(f"{what} is too large ({w} x {h})")


class _Page:
    def __init__(self, frame):
        self.frame = frame
        self.w = frame.right - frame.left
        self.h = frame.bottom - frame.top
        self.rgb = None
        self.work = 0
        self.quick_time = False
        self.clip = None


def decode_pict(d):
    """Decode a picture to (w, h, palette, idx): palette is a list of
    (r, g, b), idx a bytes of row-major palette indices, the size of
    the picture's frame. Raises PictError when it can't."""
    d = bytes(d)
    base = _pict_start(d)
    if base < 0:
        raise PictError("not a QuickDraw picture")
    v1 = d[base + 10] == 0x11
    r = _Reader(d, base + 2)
    page = _Page(r.rect())
    _check_size(page.w, page.h, "picture")
    r.skip(2 if v1 else 4)  # the version opcode _pict_start matched
    n = 0
    while True:
        if n == MAX_OPCODES:
            raise PictError(f"picture has over {MAX_OPCODES} opcodes")
        n += 1
        if not v1 and (r.p - base) & 1:
            r.skip(1)
        if r.p >= len(d):
            raise PictError("picture ends before its end opcode")
        op = r.u8() if v1 else r.u16()
        if op == 0x00FF:
            break
        if op in BITS_OPS:
            _draw_bits(r, op, page)
        else:
            _skip_op(r, op, v1, page)
    if page.rgb is None:
        raise PictError(
            "picture is QuickTime-compressed, which Finsical can't read"
            if page.quick_time else "picture has no bitmap")
    return _quantize(page.rgb, page.w, page.h)


def _hex(op):
    return f"{op:04X}"


def _skip_op(r, op, v1, page):
    """Skip one non-bitmap opcode's data, by Appendix A's table."""
    def word():
        r.skip(r.u16())
    if op <= 0xFF:
        if op in (0x00, 0x17, 0x18, 0x19, 0x1C, 0x1E):
            return
        if op == 0x01:
            page.clip = _read_region(r)
            return
        if op == 0x04:
            return r.skip(1)
        if op in (0x03, 0x05, 0x08, 0x0D, 0x15, 0x16, 0x23, 0xA0):
            return r.skip(2)
        if op in (0x06, 0x07, 0x0B, 0x0C, 0x0E, 0x0F, 0x21):
            return r.skip(4)
        if op in (0x1A, 0x1B, 0x1D, 0x1F, 0x22):
            return r.skip(6)
        if op in (0x02, 0x09, 0x0A, 0x10, 0x20):
            return r.skip(8)
        if op == 0x11:
            return r.skip(1 if v1 else 2)  # a repeated version opcode
        if op in (0x12, 0x13, 0x14):
            return _skip_pix_pat(r)
        if op == 0x28:  # LongText
            r.skip(4)
            return r.skip(r.u8())
        if op in (0x29, 0x2A):  # DHText, DVText
            r.skip(1)
            return r.skip(r.u8())
        if op == 0x2B:  # DHDVText
            r.skip(2)
            return r.skip(r.u8())
        if op == 0xA1:  # LongComment: kind, size, data
            r.skip(2)
            return word()
        if 0x24 <= op <= 0x2F:
            return word()
        if 0x30 <= op <= 0x6F:
            same = (op & 0x0F) >= 8
            if op >= 0x60:
                return r.skip(4 if same else 12)
            return None if same else r.skip(8)
        if 0x70 <= op <= 0x8F:
            if (op & 0x0F) >= 8:
                return
            size = r.u16()
            if size < 10:
                raise PictError(f"bad shape size in opcode {_hex(op)}")
            return r.skip(size - 2)
        if 0x92 <= op <= 0xAF:
            return word()
        if 0xB0 <= op <= 0xCF:
            return
        if op >= 0xD0:
            return r.skip(r.u32())
        raise PictError(f"unexpected opcode {_hex(op)}")
    if op < 0x8000:
        return r.skip((op >> 8) * 2)  # 0C00 HeaderOp is 24
    if op < 0x8100:
        return
    if op in (0x8200, 0x8201):
        page.quick_time = True
    r.skip(r.u32())


def _skip_color_table(r):
    r.skip(6)  # ctSeed, ctFlags
    n = r.i16() + 1
    if n < 0 or n > MAX_CLUT:
        raise PictError("bad color table")
    r.skip(n * 8)


def _skip_rows(r, row_bytes, rows):
    for _ in range(rows):
        if row_bytes < 8:
            r.skip(row_bytes)
        else:
            r.skip(r.u16() if row_bytes > 250 else r.u8())


def _skip_pix_pat(r):
    """BkPixPat, PnPixPat, FillPixPat (Listing A-1): an RGB color for
    ditherPat (2), else a whole pixel map with color table and rows."""
    kind = r.u16()
    r.skip(8)
    if kind == 2:
        return r.skip(6)
    row_bytes = r.u16() & 0x3FFF
    b = r.rect()
    r.skip(36)  # pmVersion through pmReserved; no baseAddr
    _skip_color_table(r)
    rows = b.bottom - b.top
    if rows < 0 or rows > MAX_SIDE:
        raise PictError("bad pattern bounds")
    _skip_rows(r, row_bytes, rows)


def _read_color_table(r, depth):
    r.skip(4)  # ctSeed
    device = (r.u16() & 0x8000) != 0
    n = r.i16() + 1
    if n < 0 or n > MAX_CLUT:
        raise PictError("bad color table")
    lut = [BLACK] * (1 << depth)
    for i in range(n):
        value = r.u16()
        c = (r.u16() >> 8) << 16 | (r.u16() >> 8) << 8 | r.u16() >> 8
        at = i if device else value
        if at < len(lut):
            lut[at] = c
    return lut


class _Region:
    """A region's box, and its scanlines of inversion points (None for
    a plain rectangle). Apple never documented a region's inside; this
    is the form QuickDraw is known to write."""

    def __init__(self, box, rows):
        self.box, self.rows = box, rows


def _read_region(r):
    size = r.u16()
    if size < 10:
        raise PictError("bad region size")
    end = r.p + size - 2
    if end > r.end:
        raise PictError("picture is truncated")
    box = r.rect()
    if size == 10:
        return _Region(box, None)
    sub = _Reader(r.d, r.p, end)
    rows = []
    y = sub.i16()
    while y != 0x7FFF:
        xs = []
        x = sub.i16()
        while x != 0x7FFF:
            xs.append(x)
            x = sub.i16()
        rows.append((y, xs))
        y = sub.i16()
    r.p = end
    return _Region(box, rows)


class _Mask:
    """Inside flags of a region over columns x0..x1-1, a row at a time
    in increasing y (see core/data/pict.ts's Mask)."""

    def __init__(self, rgn, x0, x1):
        self.rgn, self.x0 = rgn, x0
        self.toggles = bytearray(x1 - x0)
        self.inside = bytearray(x1 - x0)
        self.left_parity = 0
        self.next = 0

    def row(self, y):
        box, rows = self.rgn.box, self.rgn.rows
        n = len(self.inside)
        while rows and self.next < len(rows) and rows[self.next][0] <= y:
            for x in rows[self.next][1]:
                if x < self.x0:
                    self.left_parity ^= 1
                elif x - self.x0 < n:
                    self.toggles[x - self.x0] ^= 1
            self.next += 1
        inside = self.inside
        if y < box.top or y >= box.bottom:
            inside[:] = bytes(n)
            return inside
        on = self.left_parity if rows else 0
        for i in range(n):
            x = self.x0 + i
            if rows:
                on ^= self.toggles[i]
            inside[i] = 1 if ((on if rows else 1)
                              and box.left <= x < box.right) else 0
        return inside


def _direct_layout(depth, pack_type, cmp_count):
    """packType 0 means the default packing (3 for 16-bit pixels, 4 for
    32-bit), as core/data/pict.ts reads it."""
    if depth == 16:
        if pack_type in (0, 1, 3):
            return ("rgb16", None)
    elif depth == 32:
        if pack_type == 1:
            return ("xrgb", None)
        if pack_type == 2:
            return ("rgb", None)
        if pack_type in (0, 4):
            if cmp_count not in (3, 4):
                raise PictError(f"unsupported component count {cmp_count}")
            return ("planar", cmp_count)
    else:
        raise PictError(f"unsupported direct pixel size {depth}")
    raise PictError(f"unsupported packType {pack_type} for {depth}-bit pixels")


def _unpack_bits(src, length, unit):
    """PackBits into `length` bytes: n < 128 copies n + 1 units, n > 128
    repeats the next unit 257 - n times, 128 does nothing. A row that
    runs long is cut, one that runs short leaves zeros."""
    out = bytearray()
    i = 0
    while i < len(src) and len(out) < length:
        n = src[i]
        i += 1
        if n < 128:
            m = (n + 1) * unit
            out += src[i:i + min(m, length - len(out))]
            i += m
        elif n > 128:
            if i + unit > len(src):
                break
            out += src[i:i + unit] * (257 - n)
            i += unit
    if len(out) < length:
        out += bytes(length - len(out))
    return bytes(out[:length])


def _widen5(v):
    return (v << 3) | (v >> 2)


def _to_colors(layout, row, w):
    kind, arg = layout
    if kind == "indexed":
        depth, lut = arg
        mask = (1 << depth) - 1
        if depth == 8:
            return [lut[v] for v in row[:w]]
        out = []
        for x in range(w):
            bit = x * depth
            out.append(lut[(row[bit >> 3] >> (8 - depth - (bit & 7))) & mask])
        return out
    if kind == "mono":
        return [BLACK if (row[x >> 3] >> (7 - (x & 7))) & 1 else WHITE
                for x in range(w)]
    if kind == "rgb16":
        out = []
        for x in range(w):
            v = row[2 * x] << 8 | row[2 * x + 1]
            out.append(_widen5(v >> 10 & 31) << 16
                       | _widen5(v >> 5 & 31) << 8 | _widen5(v & 31))
        return out
    if kind == "xrgb":
        return [row[4 * x + 1] << 16 | row[4 * x + 2] << 8 | row[4 * x + 3]
                for x in range(w)]
    if kind == "rgb":
        return [row[3 * x] << 16 | row[3 * x + 1] << 8 | row[3 * x + 2]
                for x in range(w)]
    r0 = w if arg == 4 else 0  # planar: the alpha plane first
    reds, greens, blues = (row[r0:r0 + w], row[r0 + w:r0 + 2 * w],
                           row[r0 + 2 * w:r0 + 3 * w])
    return [a << 16 | b << 8 | c for a, b, c in zip(reds, greens, blues)]


def _draw_bits(r, op, page):
    direct = op >= 0x9A
    if direct:
        r.skip(4)  # baseAddr
    rb = r.u16()
    pix_map = (rb & 0x8000) != 0
    row_bytes = rb & (0x3FFF if pix_map else 0x7FFF)
    bounds = r.rect()
    bw, bh = bounds.right - bounds.left, bounds.bottom - bounds.top
    _check_size(bw, bh, "bitmap")
    layout = ("mono", None)
    pack_type = 0
    if pix_map:
        r.skip(2)  # pmVersion
        pack_type = r.u16()
        r.skip(14)  # packSize, hRes, vRes, pixelType
        depth, cmp_count = r.u16(), r.u16()
        r.skip(14)  # cmpSize, planeBytes, pmTable, pmReserved
        if direct:
            layout = _direct_layout(depth, pack_type, cmp_count)
        else:
            if depth not in (1, 2, 4, 8):
                raise PictError(
                    f"unsupported pixel size {depth} with a color table")
            layout = ("indexed", (depth, _read_color_table(r, depth)))
    elif direct:
        raise PictError("direct bits without a pixel map")
    src, dst = r.rect(), r.rect()
    r.skip(2)  # transfer mode
    mask = _read_region(r) if op & 1 else None

    kind = layout[0]
    bpp = (layout[1][0] if kind == "indexed" else 1 if kind == "mono"
           else 16 if kind == "rgb16" else 32)
    if row_bytes < -(-bw * bpp // 8):
        raise PictError(f"rowBytes {row_bytes} too small for {bw} pixels")

    # How rows are stored: see core/data/pict.ts.
    read, length, packed = layout, row_bytes, False
    if op <= 0x91 or row_bytes < 8:
        if kind in ("planar", "rgb"):
            read = ("xrgb", None)
    elif kind == "rgb":
        length = row_bytes * 3 // 4
    elif kind == "planar":
        length = bw * layout[1]
        packed = True
    else:
        packed = not (direct and pack_type == 1)
    unit = 2 if kind == "rgb16" else 1

    frame = page.frame
    cb = page.clip.box if page.clip else frame
    x0 = max(dst.left, frame.left, cb.left)
    x1 = min(dst.right, frame.right, cb.right)
    y0 = max(dst.top, frame.top, cb.top)
    y1 = min(dst.bottom, frame.bottom, cb.bottom)
    sw, sh = src.right - src.left, src.bottom - src.top
    dw, dh = dst.right - dst.left, dst.bottom - dst.top
    draws = x1 > x0 and y1 > y0 and sw > 0 and sh > 0 and dw > 0 and dh > 0
    cost = bw * bh + ((x1 - x0) * (y1 - y0) if draws else 0)
    if page.work + cost > MAX_WORK:
        raise PictError("picture asks for too much drawing")
    page.work += cost
    if page.rgb is None:
        page.rgb = [WHITE] * (page.w * page.h)
    rgb = page.rgb

    cols = []
    if draws:
        for i in range(x1 - x0):
            sx = src.left + (x0 + i - dst.left) * sw // dw - bounds.left
            cols.append(sx if 0 <= sx < bw else -1)
    m = _Mask(mask, x0, x1) if mask and draws else None
    c = (_Mask(page.clip, x0, x1)
         if page.clip and page.clip.rows and draws else None)
    # The common copy: every column one source column on from the last.
    run = (bool(cols) and cols[0] >= 0 and cols[-1] - cols[0] == len(cols) - 1
           and all(b - a == 1 for a, b in zip(cols, cols[1:])))
    y = y0
    for by in range(bounds.top, bounds.bottom):
        if packed:
            row = _unpack_bits(r.take(r.u16() if row_bytes > 250 else r.u8()),
                               length, unit)
        else:
            row = r.take(length)
        if not draws:
            continue
        line = _to_colors(read, row, bw)
        while y < y1:
            sy = src.top + (y - dst.top) * sh // dh
            if sy > by:
                break
            if sy < by:  # above the bitmap's bounds
                y += 1
                continue
            inside = m.row(y) if m else None
            clipped = c.row(y) if c else None
            out = (y - frame.top) * page.w - frame.left
            if run and inside is None and clipped is None:
                rgb[out + x0:out + x1] = line[cols[0]:cols[0] + len(cols)]
            else:
                for i, sx in enumerate(cols):
                    if (sx >= 0 and (inside is None or inside[i])
                            and (clipped is None or clipped[i])):
                        rgb[out + x0 + i] = line[sx]
            y += 1


def _bin_of(c):
    return (c >> 19 & 31) << 10 | (c >> 11 & 31) << 5 | (c >> 3 & 31)


def _quantize(rgb, w, h):
    """The page as (w, h, palette, idx), white at index 0: the other
    colors keep their first-seen order while 255 entries hold them;
    past that, median cut picks 255 (see core/data/pict.ts)."""
    seen = {}
    cols, pops = [], []
    binned = False
    for c in rgb:
        if c == WHITE:
            continue
        e = seen.get(c)
        if e is not None:
            pops[e] += 1
            continue
        if len(cols) == MAX_EXACT:
            binned = True
            break
        seen[c] = len(cols)
        cols.append(c)
        pops.append(1)
    if not binned and len(cols) <= 255:
        idx = bytes(0 if c == WHITE else seen[c] + 1 for c in rgb)
        palette = [(255, 255, 255)] + [(c >> 16, c >> 8 & 255, c & 255)
                                       for c in cols]
        return w, h, palette, idx
    if not binned:
        rep, pop = cols, pops
        sums = [((c >> 16) * n, (c >> 8 & 255) * n, (c & 255) * n)
                for c, n in zip(cols, pops)]
        entry_of = seen.__getitem__
    else:
        count = [0] * BINS
        acc = [[0, 0, 0] for _ in range(BINS)]
        for c in rgb:
            if c == WHITE:
                continue
            k = _bin_of(c)
            count[k] += 1
            a = acc[k]
            a[0] += c >> 16
            a[1] += c >> 8 & 255
            a[2] += c & 255
        entry_of_bin = {}
        rep, pop, sums = [], [], []
        for k in range(BINS):
            if not count[k]:
                continue
            entry_of_bin[k] = len(rep)
            rep.append((k >> 10) << 19 | (k >> 5 & 31) << 11 | (k & 31) << 3
                       | 0x040404)
            pop.append(count[k])
            sums.append(tuple(acc[k]))

        def entry_of(c):
            return entry_of_bin[_bin_of(c)]
    box_of, n = _median_cut(rep, pop)
    tot = [[0, 0, 0, 0] for _ in range(n)]
    for e, b in enumerate(box_of):
        t = tot[b]
        t[0] += pop[e]
        t[1] += sums[e][0]
        t[2] += sums[e][1]
        t[3] += sums[e][2]
    # Math.round on the way JavaScript does it: half up.
    palette = [(255, 255, 255)] + [
        tuple(int(t[k] / t[0] + 0.5) for k in (1, 2, 3)) for t in tot]
    idx = bytes(0 if c == WHITE else box_of[entry_of(c)] + 1 for c in rgb)
    return w, h, palette, idx


def _median_cut(rep, pop):
    """Heckbert's median cut, exactly as core/data/pict.ts runs it: the
    box whose pixel count times longest side is largest splits at its
    weighted median, until 255 boxes or none can split. Returns each
    entry's box and how many boxes there are."""
    def chan(e, ch):
        return rep[e] >> (16 - 8 * ch) & 255
    order = list(range(len(rep)))

    def measure(lo, hi):
        total = 0
        mn, mx = [255, 255, 255], [0, 0, 0]
        for i in range(lo, hi):
            e = order[i]
            total += pop[e]
            for ch in range(3):
                v = chan(e, ch)
                if v < mn[ch]:
                    mn[ch] = v
                if v > mx[ch]:
                    mx[ch] = v
        ch = 0
        for k in (1, 2):
            if mx[k] - mn[k] > mx[ch] - mn[ch]:
                ch = k
        return [lo, hi, total, ch, mn[ch], mx[ch]]

    boxes = [measure(0, len(rep))] if rep else []
    while len(boxes) < 255:
        best, score = -1, 0
        for i, (lo, hi, total, _, lo_v, hi_v) in enumerate(boxes):
            s = total * (hi_v - lo_v + 1) if hi - lo > 1 else 0
            if s > score:
                score, best = s, i
        if best < 0:
            break
        lo, hi, total, ch, lo_v, hi_v = boxes[best]
        hist = [0] * 256
        for i in range(lo, hi):
            hist[chan(order[i], ch)] += pop[order[i]]
        cut, acc = lo_v, hist[lo_v]
        while acc * 2 < total and cut < hi_v - 1:
            cut += 1
            acc += hist[cut]
        left = [e for e in order[lo:hi] if chan(e, ch) <= cut]
        right = [e for e in order[lo:hi] if chan(e, ch) > cut]
        order[lo:hi] = left + right
        mid = lo + len(left)
        boxes[best:best + 1] = [measure(lo, mid), measure(mid, hi)]
    box_of = [0] * len(rep)
    for i, (lo, hi, *_rest) in enumerate(boxes):
        for j in range(lo, hi):
            box_of[order[j]] = i
    return box_of, len(boxes)
