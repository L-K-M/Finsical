"""9003inc pack container (.fsh/.acc/.plt/.azn/.REZ) reader.

Layout:
  - 256-byte header: u32 magic 00 01 00 00, u32 dir offset, u32,
    u32 first-chunk hint, tag ('XXXX'/'AqZn'), u32 version (0x5dc).
  - From 0x100: u32-LE length-prefixed chunks (length excludes prefix).
  - Trailer at header@4: 16-byte header copy, type table (8-byte records
    of u16,u16,tag4), then a resource directory of 12-byte records
    (u16 resId, u16 sub, u32 chunk offset relative to 0x100, u32 pad).
"""
import struct

MAGIC = 0x00000100
DATA_BASE = 0x100


class PackError(Exception):
    pass


def is_pack(d: bytes) -> bool:
    return len(d) > DATA_BASE and struct.unpack_from("<I", d, 0)[0] == MAGIC


class Chunk:
    __slots__ = ("pos", "payload", "res_id", "sub")

    def __init__(self, pos, payload):
        self.pos = pos
        self.payload = payload
        self.res_id = None
        self.sub = None

    @property
    def is_bmp(self):
        return self.payload[:2] == b"BM"

    @property
    def name(self):
        """Pascal-string name if this chunk leads with one."""
        pl = self.payload
        if not pl:
            return None
        n = pl[0]
        if 0 < n <= 31 and n <= len(pl) - 1:
            s = pl[1:1 + n]
            if all(32 <= c < 127 for c in s):
                return s.decode("ascii")
        return None


class Pack:
    def __init__(self, d: bytes):
        if not is_pack(d):
            raise PackError("bad magic")
        self._d = d
        self.dir_off = struct.unpack_from("<I", d, 4)[0]
        self.tag = d[16:20].split(b"\0")[0].decode("latin1")
        self.version = struct.unpack_from("<I", d, 20)[0]
        self.chunks = []
        self._by_pos = {}
        p = DATA_BASE
        while p + 4 <= len(d) and p < self.dir_off:
            n = struct.unpack_from("<I", d, p)[0]
            if n < 1 or p + 4 + n > min(len(d), self.dir_off):
                break
            c = Chunk(p + 4, d[p + 4:p + 4 + n])
            self.chunks.append(c)
            self._by_pos[p] = c
            p += 4 + n
        self.directory = self._read_dir()

    def _read_dir(self):
        """Scan the trailer for 12-byte records (resId, sub, off, pad) whose
        off+0x100 lands on a chunk boundary; annotate matching chunks."""
        d = self._d
        out = []
        i = self.dir_off + 16
        limit = len(d)
        while i + 12 <= limit:
            rid, sub, off, pad = struct.unpack_from("<HHII", d, i)
            if pad == 0 and off + DATA_BASE in self._by_pos:
                out.append((rid, sub, off))
                c = self._by_pos[off + DATA_BASE]
                if c.res_id is None:
                    c.res_id, c.sub = rid, sub
                i += 12
            else:
                i += 1
        return out

    # --- payload classification ---

    def images(self):
        return [c for c in self.chunks if c.is_bmp]

    def names(self):
        return [(c.res_id, c.name) for c in self.chunks
                if c.name and c.res_id is not None]

    def blobs(self):
        """Non-BMP payloads — RLE sprite frames / scripts / params."""
        return [c for c in self.chunks if not c.is_bmp]


def load(path):
    with open(path, "rb") as f:
        return Pack(f.read())
