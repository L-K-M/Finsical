"""Classic Mac resource fork reader. Handles raw resource forks,
AppleDouble (.rsrc sidecar) files, MacBinary .bin, and BinHex 4 .hqx —
resource forks can't survive a modern filesystem or download unwrapped,
so the transfer encodings are peeled off here. Stdlib only."""
import struct

# Most resources of one type read from a file: MAX_FILE_SOUNDS in
# core/data/sndbank.ts. Real forks hold a few dozen.
MAX_RESOURCES = 1024

_BINHEX_ALPHABET = (
    b'!"#$%&\'()*+,-012345689@ABCDEFGHIJKLMNPQRSTUVXYZ[`abcdefhijklmpqr')
_BINHEX_LUT = {c: i for i, c in enumerate(_BINHEX_ALPHABET)}


def unwrap_appledouble(d):
    """If d is AppleDouble/AppleSingle, return the resource-fork bytes."""
    magic = struct.unpack_from('>I', d, 0)[0]
    if magic not in (0x00051607, 0x00051600):
        return d
    n = struct.unpack_from('>H', d, 24)[0]
    rsrc = None
    for i in range(n):
        eid, off, ln = struct.unpack_from('>III', d, 26 + i * 12)
        if eid == 2:  # resource fork
            rsrc = d[off:off + ln]
    return rsrc if rsrc is not None else d


def unwrap_macbinary(d):
    """If d looks like a MacBinary file, return its resource fork.

    Detection: the 128-byte header's fixed-zero fields, a sane name
    length, and fork sizes that fit the file — a raw resource fork
    (which starts with its data offset, usually 0x00000100) fails the
    name-length check, so this can't misfire on a bare fork.
    """
    if len(d) < 128 or d[0] != 0 or d[74] != 0:
        return d
    nlen = d[1]
    if not 1 <= nlen <= 63:
        return d
    dlen, rlen = struct.unpack_from('>II', d, 83)
    if not rlen:
        return d
    roff = 128 + (dlen + 127) // 128 * 128
    if roff + rlen > len(d):
        return d
    return d[roff:roff + rlen]


def _binhex_decode(raw):
    """Decode BinHex 4 text to the raw header+forks blob, or None.

    Layout after de-RLE: u8 nameLen, name, u8 zero, type u32, creator
    u32, flags u16, dataLen u32, rsrcLen u32, header CRC u16, then data
    fork + u16 CRC, then resource fork + u16 CRC. CRCs are skipped —
    the structural checks in unwrap_binhex are the gate.
    """
    start = raw.find(b':')
    if start < 0:
        return None
    vals = bytearray()
    for ch in raw[start + 1:]:
        v = _BINHEX_LUT.get(ch)
        if v is not None:
            vals.append(v)
        elif ch == 0x3A and len(vals) > 64:  # closing ':' marks the end
            break
    out = bytearray()
    i = 0
    while i + 4 <= len(vals):
        acc = (vals[i] << 18 | vals[i + 1] << 12
               | vals[i + 2] << 6 | vals[i + 3])
        out += bytes([(acc >> 16) & 0xFF, (acc >> 8) & 0xFF, acc & 0xFF])
        i += 4
    tail = len(vals) - i
    if tail:
        acc = 0
        for j in range(tail):
            acc |= vals[i + j] << (18 - j * 6)
        out += bytes([(acc >> 16) & 0xFF, (acc >> 8) & 0xFF][:tail - 1])
    # RLE pass: 0x90 0x00 = literal 0x90; 0x90 n = prior byte × n total.
    d = bytearray()
    i = 0
    while i < len(out):
        b = out[i]
        if b == 0x90 and i + 1 < len(out):
            n = out[i + 1]
            if n == 0:
                d.append(0x90)
                i += 2
                continue
            if not d:
                return None
            d += bytes([d[-1]]) * (n - 1)
            i += 2
            continue
        d.append(b)
        i += 1
    return d


def unwrap_binhex(d):
    """If d is BinHex 4 text, return the resource fork of its file."""
    if not d.lstrip()[:1] in (b':',) and \
            b'This file must be converted with BinHex' not in d[:8192]:
        return d
    dec = _binhex_decode(d)
    if dec is None or len(dec) < 22:
        return d
    nlen = dec[0]
    if not 1 <= nlen <= 63 or len(dec) < nlen + 22 or dec[1 + nlen] != 0:
        return d
    off = 1 + nlen + 1 + 18  # name + pad + type/creator/flags/dlens
    if off + 2 > len(dec):
        return d
    dlen, rlen = struct.unpack_from('>II', dec, off - 8)
    off += 2  # header CRC
    if off + dlen + 2 + rlen > len(dec):
        return d
    rsrc = dec[off + dlen + 2:off + dlen + 2 + rlen]
    return rsrc if rlen else d


def unwrap_container(d):
    """Peel transfer encodings off a file, returning resource-fork bytes.

    Peels can expose another container (a .bin holding an AppleDouble
    file), so loop until a full pass changes nothing — each function
    returns its input object unchanged when it can't peel, which makes
    `is` identity the stable-point test.
    """
    for _ in range(4):  # no legit nesting is deeper than this
        out = unwrap_binhex(unwrap_macbinary(unwrap_appledouble(d)))
        if out is d:
            return out
        d = out
    return d


class ResFile:
    def __init__(self, path):
        with open(path, 'rb') as f:
            self._init(f.read())

    @classmethod
    def from_bytes(cls, d):
        self = cls.__new__(cls)
        self._init(d)
        return self

    def _init(self, d):
        self.data = unwrap_container(d)
        r = self.data
        self.do, self.mo, self.dl, self.ml = struct.unpack_from('>4I', r, 0)
        tlo, nlo = struct.unpack_from('>HH', r, self.mo + 24)
        self.tbase = self.mo + tlo
        self.nbase = self.mo + nlo
        self.ntypes = struct.unpack_from('>H', r, self.tbase)[0] + 1

    def types(self):
        out = []
        for i in range(self.ntypes):
            e = self.tbase + 2 + i * 8
            t = self.data[e:e + 4]
            cnt = struct.unpack_from('>H', self.data, e + 4)[0] + 1
            roff = struct.unpack_from('>H', self.data, e + 6)[0]
            out.append((t, cnt, self.tbase + roff))
        return out

    def resources(self, rtype):
        """rtype: 4-byte tag. Yields (id, name, attrs, rawbytes).

        Like core/data/snd.ts: only the first entry for the type is
        read, each payload yields once however many references share
        it, and at most MAX_RESOURCES resources come back, so a
        crafted map can't multiply one blob into millions. A reference
        or payload that runs past the end is skipped, as there.
        A second id sharing a payload is dropped even under another
        name, deliberately: see bankSounds in core/data/sndbank.ts."""
        for t, cnt, rbase in self.types():
            if t != rtype:
                continue
            seen = set()
            emitted = 0  # the cap counts what comes back, not refs read
            for j in range(cnt):
                if emitted >= MAX_RESOURCES:
                    break
                r = rbase + j * 12
                if r + 12 > len(self.data):
                    break
                rid = struct.unpack_from('>h', self.data, r)[0]
                noff = struct.unpack_from('>h', self.data, r + 2)[0]
                attr = self.data[r + 4]
                dd = struct.unpack_from('>I', self.data, r + 5)[0] >> 8
                if dd in seen:
                    continue
                seen.add(dd)
                at = self.do + dd
                if at + 4 > len(self.data):
                    continue
                sz = struct.unpack_from('>I', self.data, at)[0]
                if at + 4 + sz > len(self.data):
                    continue
                blob = self.data[at + 4:at + 4 + sz]
                name = None
                # Only -1 is the nameless sentinel; other negatives would
                # index backwards into the name list (or worse).
                if noff >= 0:
                    p = self.nbase + noff
                    # Full Pascal name must fit — matches the TS sibling,
                    # which treats an overflowing length as nameless.
                    if (p < len(self.data) and
                            p + 1 + self.data[p] <= len(self.data)):
                        ln = self.data[p]
                        name = self.data[p + 1:p + 1 + ln] \
                            .decode('mac_roman', 'replace')
                emitted += 1
                yield rid, name, attr, blob
            return

    def summary(self):
        rows = []
        for t, cnt, rbase in self.types():
            rows.append((t.decode('mac_roman', 'replace'), cnt))
        return rows


if __name__ == '__main__':
    import sys
    rf = ResFile(sys.argv[1])
    for t, c in rf.summary():
        print(f'{t!r:10} x{c}')
