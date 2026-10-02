import os
import struct
import subprocess
import sys
import tempfile
import unittest

from tools.az.img import ImgError, read_bmp, write_png
from tools.tests.fixtures import build_bmp8, build_bmp8_rle

PAL = [(0, 0, 0), (255, 0, 0), (0, 255, 0), (0, 0, 255)]


class TestBmp(unittest.TestCase):
    def test_roundtrip_8bit(self):
        idx = bytes([0, 1, 2, 3, 1, 2, 3, 0, 2, 3, 0, 1, 3, 0, 1, 2])
        bmp = build_bmp8(4, 4, idx, PAL)
        w, h, rgba, _ = read_bmp(bmp)
        self.assertEqual((w, h), (4, 4))
        for y in range(4):
            for x in range(4):
                i = (y * 4 + x) * 4
                want = PAL[idx[y * 4 + x]]
                self.assertEqual(tuple(rgba[i:i + 3]), want, (x, y))
                self.assertEqual(rgba[i + 3], 255)

    def test_roundtrip_rle8(self):
        idx = bytes([0, 1, 2, 3, 1, 2, 3, 0, 2, 3, 0, 1, 3, 0, 1, 2])
        bmp = build_bmp8_rle(4, 4, idx, PAL)
        w, h, rgba, _ = read_bmp(bmp)
        self.assertEqual((w, h), (4, 4))
        for y in range(4):
            for x in range(4):
                i = (y * 4 + x) * 4
                want = PAL[idx[y * 4 + x]]
                self.assertEqual(tuple(rgba[i:i + 3]), want, (x, y))

    def test_roundtrip_rle8_odd_width(self):
        idx = bytes([1, 2, 3, 0, 1, 2, 3, 0, 1])
        bmp = build_bmp8_rle(3, 3, idx, PAL)
        w, h, rgba, _ = read_bmp(bmp)
        self.assertEqual((w, h), (3, 3))
        for y in range(3):
            for x in range(3):
                i = (y * 3 + x) * 4
                want = PAL[idx[y * 3 + x]]
                self.assertEqual(tuple(rgba[i:i + 3]), want, (x, y))


class TestBmpGuards(unittest.TestCase):
    """The caps core/data/bmp.ts enforces, so a pack's image can't ask
    the extractor for more memory than the file is worth."""

    def test_width_at_the_cap_still_decodes(self):
        w, h, _, _ = read_bmp(build_bmp8(8192, 1, bytes(8192), PAL))
        self.assertEqual((w, h), (8192, 1))

    def test_width_past_the_cap_is_rejected(self):
        with self.assertRaises(ValueError):
            read_bmp(build_bmp8(8193, 1, bytes(8193), PAL))

    def test_height_past_the_cap_is_rejected(self):
        with self.assertRaises(ValueError):
            read_bmp(build_bmp8(1, 8193, bytes(8193), PAL))

    def test_zero_dimensions_are_rejected(self):
        with self.assertRaises(ValueError):
            read_bmp(build_bmp8(0, 0, b"", PAL))

    def test_absurd_palette_count_still_decodes(self):
        # The colour table count is a free u32: 100000 entries run off the
        # end of a 1 KB file, which used to raise mid-unpack instead of
        # reading the palette the file actually carries.
        idx = bytes([0, 1, 2, 3, 1, 2, 3, 0, 2, 3, 0, 1, 3, 0, 1, 2])
        bmp = bytearray(build_bmp8(4, 4, idx, PAL))
        bmp[46:50] = struct.pack("<I", 100000)
        w, h, rgba, _ = read_bmp(bytes(bmp))
        self.assertEqual((w, h), (4, 4))
        for y in range(4):
            for x in range(4):
                i = (y * 4 + x) * 4
                self.assertEqual(tuple(rgba[i:i + 3]), PAL[idx[y * 4 + x]],
                                 (x, y))


class TestPng(unittest.TestCase):
    def test_writes_valid_png(self):
        with tempfile.TemporaryDirectory() as td:
            p = os.path.join(td, "x.png")
            write_png(p, 2, 2, bytes(range(16)))
            data = open(p, "rb").read()
        self.assertEqual(data[:8], b"\x89PNG\r\n\x1a\n")
        # IHDR data begins at byte 16 (8-byte sig + 4-byte length + 4-byte type)
        self.assertEqual(data[16:24], b"\x00\x00\x00\x02\x00\x00\x00\x02")
        self.assertIn(b"IHDR", data)
        self.assertIn(b"IEND", data)


class TestTruncated(unittest.TestCase):
    def test_rejects_truncated_headers_as_img_error(self):
        # A truncated download is the common malformed case; the named
        # error must reach callers instead of struct.error.
        for blob in (b"", b"BM", b"BM" + bytes(8), b"BM" + bytes(40)):
            with self.subTest(blob=blob):
                with self.assertRaises(ImgError):
                    read_bmp(blob)


class TestOFlags(unittest.TestCase):
    def test_img_guard_survives_python_dash_O(self):
        # The guard must be a raise, not an assert, or -O decodes garbage.
        code = ("from tools.az.img import read_bmp\n"
                "try:\n"
                "    read_bmp(b'XX' + bytes(60))\n"
                "except Exception as e:\n"
                "    print(type(e).__name__)\n")
        out = subprocess.run(
            [sys.executable, "-O", "-c", code],
            cwd=os.path.dirname(os.path.dirname(os.path.dirname(
                os.path.abspath(__file__)))),
            capture_output=True, text=True, check=True, timeout=30)
        self.assertIn("ImgError", out.stdout)


if __name__ == "__main__":
    unittest.main()