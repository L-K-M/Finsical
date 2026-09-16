"""Classic Mac resource fork reader. Handles raw resource forks and
AppleDouble (.rsrc sidecar) files. Stdlib only."""
import struct


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


class ResFile:
    def __init__(self, path):
        with open(path, 'rb') as f:
            d = f.read()
        self.data = unwrap_appledouble(d)
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
        """rtype: 4-byte tag. Yields (id, name, attrs, rawbytes)."""
        for t, cnt, rbase in self.types():
            if t != rtype:
                continue
            for j in range(cnt):
                r = rbase + j * 12
                rid = struct.unpack_from('>h', self.data, r)[0]
                noff = struct.unpack_from('>h', self.data, r + 2)[0]
                attr = self.data[r + 4]
                dd = struct.unpack_from('>I', self.data, r + 5)[0] >> 8
                sz = struct.unpack_from('>I', self.data, self.do + dd)[0]
                blob = self.data[self.do + dd + 4:self.do + dd + 4 + sz]
                name = None
                if noff != -1:
                    p = self.nbase + noff
                    ln = self.data[p]
                    name = self.data[p + 1:p + 1 + ln].decode('mac_roman', 'replace')
                yield rid, name, attr, blob

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
