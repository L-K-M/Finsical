import unittest

from tools.az.pict import Pict
from tools.tests.fixtures import build_pict8

PAL = [(0, 0, 0), (90, 90, 90), (180, 180, 180), (255, 255, 255)]


class TestPict(unittest.TestCase):
    def test_decodes_packbits_rect(self):
        idx = bytes(range(16))
        pict = Pict(build_pict8(4, 4, idx, PAL))
        self.assertEqual((pict.w, pict.h), (4, 4))
        out, pal = pict.to_indexed()
        self.assertEqual(out, idx)
        self.assertEqual(pal[:4], PAL)

    def test_odd_width(self):
        idx = bytes([(x + y) % 4 for y in range(5) for x in range(7)])
        pict = Pict(build_pict8(7, 5, idx, PAL))
        out, _ = pict.to_indexed()
        self.assertEqual(out, idx)

    def test_garbage_raises(self):
        with self.assertRaises(Exception):
            Pict(b"\xde\xad\xbe\xef" * 8)


if __name__ == "__main__":
    unittest.main()
