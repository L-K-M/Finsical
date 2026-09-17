import io
import os
import struct
import sys
import tempfile
import unittest
import zipfile

sys.path.insert(0, os.path.dirname(os.path.dirname(
    os.path.dirname(os.path.abspath(__file__)))))
from tools.fetch import _emit_source, _harvest  # noqa: E402


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

    def test_same_basename_does_not_collide(self):
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            z.writestr("a/fish.fsh", fake_pack(bmp_8bit()))
            z.writestr("b/fish.fsh", fake_pack(bmp_8bit()))
        made = _harvest("two.zip", buf.getvalue(), self.out)
        self.assertEqual(len(made), 2)
        self.assertNotEqual(made[0], made[1])
        self.assertTrue(all(os.path.isdir(p) for p in made))

    def test_garbage_is_skipped(self):
        self.assertEqual(_harvest("x.bin", b"not a pack", self.out), [])
        self.assertEqual(_harvest("x.zip", b"not a zip", self.out), [])

    def test_oversized_zip_entry_skipped(self):
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            z.writestr("tiny.fsh", fake_pack(bmp_8bit()))
        data = bytearray(buf.getvalue())
        # Lie about uncompressed size in local + central headers.
        for sig, off in ((b"PK\x03\x04", 22), (b"PK\x01\x02", 24)):
            i = data.find(sig)
            self.assertNotEqual(i, -1)
            data[i + off:i + off + 4] = (2 << 30).to_bytes(4, "little")
        self.assertEqual(_harvest("a.zip", bytes(data), self.out), [])

    def test_read_capped_overrun(self):
        from tools.fetch import _read_capped
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            z.writestr("big.bin", b"\x00" * 2048)
        with zipfile.ZipFile(io.BytesIO(buf.getvalue())) as zf:
            zi = zf.infolist()[0]
            self.assertIsNone(_read_capped(zf, zi, 1024))
            self.assertEqual(len(_read_capped(zf, zi, 4096)), 2048)

    def test_invalid_include_regex_reports_usage_error(self):
        from tools.fetch import main
        buf = io.StringIO()
        real, sys.stderr = sys.stderr, buf
        try:
            with self.assertRaises(SystemExit) as cm:
                main(["--include", "["])
        finally:
            sys.stderr = real
        self.assertEqual(cm.exception.code, 2)
        self.assertIn("invalid regex", buf.getvalue())

    def test_emit_source_pack(self):
        out = _emit_source("t.fsh", fake_pack(bmp_8bit()), self.out)
        self.assertIsNotNone(out)
        self.assertTrue(os.path.exists(out))
        self.assertTrue(os.path.exists(
            os.path.join(out, "manifest.json")))


if __name__ == "__main__":
    unittest.main()
