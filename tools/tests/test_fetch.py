import io
import os
import struct
import tempfile
import unittest
import zipfile

from tools.fetch import _emit_source, _harvest
from tools.az.pack import Pack


def fake_pack(bmp_payload: bytes) -> bytes:
    """Minimal 9003inc pack: header + one chunk + dir trailer."""
    d = bytearray(0x100)
    struct.pack_into("<I", d, 0, 0x00000100)
    d[16:20] = b"AqZn"
    d += struct.pack("<I", len(bmp_payload)) + bmp_payload
    struct.pack_into("<I", d, 4, len(d))      # dir_off
    d += b"\x00" * 16
    return bytes(d)


def bmp_8bit(w=4, h=4) -> bytes:
    pal = b"".join(struct.pack("<BBBB", i, i, i, 0) for i in range(256))
    off = 14 + 40 + len(pal)
    img = w * h
    return struct.pack("<2sIHHI", b"BM", off + img, 0, 0, off) + \
        struct.pack("<IiiHHIIiiII", 40, w, -h, 1, 8, 0, img, 0, 0, 0, 0) + \
        pal + bytes([1] * img)


class TestHarvest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.out = self.tmp.name

    def tearDown(self):
        self.tmp.cleanup()

    def test_pack_emits_bundle(self):
        made = _harvest("t.fsh", fake_pack(bmp_8bit()), self.out)
        self.assertEqual(len(made), 1)
        self.assertTrue(os.path.exists(
            os.path.join(made[0], "manifest.json")))

    def test_zip_recurses(self):
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            z.writestr("fish/NeonTetra.fsh", fake_pack(bmp_8bit()))
            z.writestr("__MACOSX/x", b"junk")
            z.writestr("readme.txt", b"hi")
        made = _harvest("a.zip", buf.getvalue(), self.out)
        self.assertEqual(len(made), 1)
        self.assertIn("NeonTetra", made[0])

    def test_garbage_is_skipped(self):
        self.assertEqual(_harvest("x.bin", b"not a pack", self.out), [])
        self.assertEqual(_harvest("x.zip", b"not a zip", self.out), [])

    def test_emit_source_pack(self):
        out = _emit_source("t.fsh", fake_pack(bmp_8bit()), self.out)
        self.assertIsNotNone(out)
        p = Pack(fake_pack(bmp_8bit()))
        self.assertEqual(len(p.chunks), 1)


if __name__ == "__main__":
    unittest.main()
