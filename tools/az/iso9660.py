"""Minimal ISO9660 reader (primary volume descriptor only). Stdlib only."""
import struct


class Iso:
    def __init__(self, path):
        self.f = open(path, 'rb')
        self.sector = 2048
        self.f.seek(16 * self.sector)
        pvd = self.f.read(self.sector)
        assert pvd[0] == 1 and pvd[1:6] == b'CD001', 'not ISO9660'
        # root dir record at offset 156
        self.root = self._dir_record(pvd, 156)

    def _dir_record(self, buf, off):
        ln = buf[off]
        if ln == 0:
            return None
        ext = struct.unpack_from('<I', buf, off + 2)[0]
        size = struct.unpack_from('<I', buf, off + 10)[0]
        flags = buf[off + 25]
        nlen = buf[off + 32]
        name = buf[off + 33:off + 33 + nlen]
        if name == b'\x00':
            name = b'.'
        elif name == b'\x01':
            name = b'..'
        return {'extent': ext, 'size': size, 'dir': bool(flags & 2),
                'name': name.split(b';')[0].decode('latin1')}

    def _read(self, extent, size):
        self.f.seek(extent * self.sector)
        return self.f.read(size)

    def listdir(self, rec=None):
        rec = rec or self.root
        data = self._read(rec['extent'], rec['size'])
        out = []
        p = 0
        while p < len(data):
            if data[p] == 0:
                p += self.sector - (p % self.sector)
                continue
            r = self._dir_record(data, p)
            p += data[p]
            if r and r['name'] not in ('.', '..'):
                out.append(r)
        return out

    def read_file(self, rec):
        return self._read(rec['extent'], rec['size'])

    def walk(self, rec=None, prefix='', seen=None):
        seen = set() if seen is None else seen
        for r in self.listdir(rec):
            if r['dir']:
                if r['extent'] in seen:
                    continue
                seen.add(r['extent'])
            p = prefix + '/' + r['name']
            yield p, r
            if r['dir']:
                yield from self.walk(r, p, seen)


if __name__ == '__main__':
    import sys
    iso = Iso(sys.argv[1])
    for p, r in iso.walk():
        print('%10d %s%s' % (r['size'], p, '/' if r['dir'] else ''))
