"""Minimal ISO9660 reader (primary volume descriptor only). Stdlib only."""
import os
import struct


class IsoError(ValueError):
    """An ISO image that is malformed, truncated or extends past its file."""


class Iso:
    def __init__(self, path):
        self.f = open(path, 'rb')
        try:
            self.size = os.fstat(self.f.fileno()).st_size
            self.sector = 2048
            self.f.seek(16 * self.sector)
            pvd = self.f.read(self.sector)
            # Untrusted input: raise, never assert — run under python -O
            # an assert would let garbage decode (or crash with a raw
            # struct.error instead of a named error).
            if len(pvd) < self.sector or pvd[0] != 1 or pvd[1:6] != b'CD001':
                raise IsoError('not ISO9660')
            # root dir record at offset 156
            self.root = self._dir_record(pvd, 156)
            if self.root is None:
                raise IsoError('ISO9660 image has no root directory')
        except BaseException:
            self.f.close()
            raise

    def _dir_record(self, buf, off):
        if off + 34 > len(buf):
            raise IsoError('directory record overruns its buffer')
        ln = buf[off]
        if ln == 0:
            return None
        if ln < 34 or off + ln > len(buf):
            raise IsoError('directory record overruns its buffer')
        ext = struct.unpack_from('<I', buf, off + 2)[0]
        size = struct.unpack_from('<I', buf, off + 10)[0]
        flags = buf[off + 25]
        nlen = buf[off + 32]
        if 33 + nlen > ln:
            raise IsoError('directory record name overruns its record')
        name = buf[off + 33:off + 33 + nlen]
        # A crafted name must not smuggle path separators, a bare dot
        # name, or an embedded NUL (which open() rejects mid-extraction)
        # into walk()'s accumulated paths. The real '.'/'..' records are
        # the single bytes \x00/\x01 normalized just below.
        if (not name or b'/' in name or b'\\' in name
                or name.strip(b'.') == b''
                or (b'\x00' in name and name != b'\x00')):
            raise IsoError('unsafe directory record name')
        if name == b'\x00':
            name = b'.'
        elif name == b'\x01':
            name = b'..'
        return {'extent': ext, 'size': size, 'dir': bool(flags & 2),
                'name': name.split(b';')[0].decode('latin1')}

    def _read(self, extent, size):
        start = extent * self.sector
        if size < 0 or start + size > self.size:
            raise IsoError('entry extends past the end of the image')
        self.f.seek(start)
        data = self.f.read(size)
        if len(data) != size:
            raise IsoError('short read from the image')
        return data

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

    def close(self):
        self.f.close()

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()


if __name__ == '__main__':
    import sys
    with Iso(sys.argv[1]) as iso:
        for p, r in iso.walk():
            print('%10d %s%s' % (r['size'], p, '/' if r['dir'] else ''))
