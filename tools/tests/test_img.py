import os
import tempfile
import unittest

from tools.az.img import read_bmp, write_png
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


if __name__ == "__main__":
    unittest.main()
