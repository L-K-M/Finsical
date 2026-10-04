import hashlib
import unittest

from tools.az.pict import PictError, decode_pict, is_pict
from tools.tests.fixtures import build_ops_pict, build_pict, quicktime_op

WHITE, RED, GREEN, BLUE = 0xFFFFFF, 0xFF0000, 0x00FF00, 0x0000FF
CLUT = [(255, 255, 255), (255, 0, 0), (0, 255, 0), (0, 0, 255)]


def colors(img):
    w, h, palette, idx = img
    return [palette[k][0] << 16 | palette[k][1] << 8 | palette[k][2]
            for k in idx]


class TestDecode(unittest.TestCase):
    def test_indexed_pixels_through_the_color_table(self):
        px = [0, 1, 2, 3, 1, 1, 1, 1, 1, 2, 3, 0, 0, 0, 0]
        img = decode_pict(build_pict(5, 3, px, clut=CLUT))
        self.assertEqual(img[:2], (5, 3))
        self.assertEqual(colors(img), [[WHITE, RED, GREEN, BLUE][v] for v in px])

    def test_partial_byte_depths(self):
        for depth in (1, 2, 4):
            clut = [(i * 16, 255 - i * 16, 200 if i & 1 else 40)
                    for i in range(1 << depth)]
            px = [(i * 5 + 1) % (1 << depth) for i in range(21)]
            img = decode_pict(build_pict(7, 3, px, depth=depth, clut=clut))
            self.assertEqual(colors(img), [
                clut[v][0] << 16 | clut[v][1] << 8 | clut[v][2] for v in px])

    def test_word_byte_counts_past_250(self):
        px = [(i >> 4) & 3 for i in range(300 * 2)]
        img = decode_pict(build_pict(300, 2, px, clut=CLUT))
        self.assertEqual(colors(img), [[WHITE, RED, GREEN, BLUE][v] for v in px])

    def test_direct_pixels(self):
        px = [RED, GREEN, BLUE, 0x123456, WHITE, 0, 0x808080, 0xABCDEF]
        for pack_type in (0, 4):
            img = decode_pict(build_pict(4, 2, px, direct=32, pack_type=pack_type))
            self.assertEqual(colors(img), px)
        five = lambda c: sum(((((c >> s) & 0xF8) | ((c >> s) >> 5 & 7))  # noqa: E731
                              << s) for s in (16, 8, 0))
        img = decode_pict(build_pict(4, 2, px, direct=16))
        self.assertEqual(colors(img), [five(c) for c in px])

    def test_data_fork_header(self):
        d = bytearray(build_pict(4, 1, [1, 2, 3, 0], clut=CLUT, file=True))
        d[0:512] = b"A" * 512
        self.assertTrue(is_pict(bytes(d)))
        self.assertEqual(decode_pict(bytes(d)),
                         decode_pict(build_pict(4, 1, [1, 2, 3, 0], clut=CLUT)))

    def test_white_is_index_zero_and_only_white(self):
        clut = [(0, 0, 0), (255, 0, 0), (0, 0, 255), (255, 255, 255)]
        img = decode_pict(build_pict(6, 1, [0, 3, 1, 3, 2, 0], clut=clut))
        self.assertEqual(img[2][0], (255, 255, 255))
        self.assertEqual([k == 0 for k in img[3]],
                         [False, True, False, True, False, False])

    def test_median_cut_matches_the_typescript_decoder(self):
        # The picture core/data/pict.test.ts pins: both decoders must
        # reduce it to the same palette and indices.
        w, h = 64, 32
        px = [WHITE if i % 97 == 0 else
              (i % w * 4) << 16 | (i // w * 8) << 8 | (i % w + i // w) * 2
              for i in range(w * h)]
        w_, h_, palette, idx = decode_pict(build_pict(w, h, px, direct=32))
        self.assertLessEqual(len(palette), 256)
        both = bytes(v for c in palette for v in c) + idx
        self.assertEqual(
            hashlib.sha256(both).hexdigest(),
            "dc328fe62aa7332c692642d95b28810bd88e10acedb78722fdedbc48a6c48b0a")

    def test_untrusted_input_raises_pict_error_only(self):
        good = build_pict(9, 4, [i % 4 for i in range(36)], clut=CLUT)
        for n in range(len(good)):
            with self.assertRaises(PictError):
                decode_pict(good[:n])
        seed = 42
        for _ in range(1500):
            d = bytearray(good)
            for _ in range(1 + seed % 4):
                seed = (seed * 1664525 + 1013904223) & 0xFFFFFFFF
                at = seed % len(d)
                seed = (seed * 1664525 + 1013904223) & 0xFFFFFFFF
                d[at] = seed & 0xFF
            try:
                w, h, palette, idx = decode_pict(bytes(d))
                self.assertEqual(len(idx), w * h)
                self.assertTrue(all(k < len(palette) for k in idx))
            except PictError:
                pass

    def test_untrusted_quicktime_images_raise_pict_error_only(self):
        good = build_ops_pict(5, 2, [quicktime_op(
            5, 2, [0, 1, 2, 3, 1, 3, 2, 1, 0, 2], CLUT)])
        self.assertEqual(decode_pict(good)[:2], (5, 2))
        for n in range(len(good)):
            with self.assertRaises(PictError):
                decode_pict(good[:n])
        seed = 7
        for _ in range(1500):
            d = bytearray(good)
            for _ in range(1 + seed % 4):
                seed = (seed * 1664525 + 1013904223) & 0xFFFFFFFF
                at = seed % len(d)
                seed = (seed * 1664525 + 1013904223) & 0xFFFFFFFF
                d[at] = seed & 0xFF
            try:
                w, h, palette, idx = decode_pict(bytes(d))
                self.assertEqual(len(idx), w * h)
                self.assertTrue(all(k < len(palette) for k in idx))
            except PictError:
                pass

    def test_refuses_what_is_not_a_picture(self):
        for d in (b"", bytes(600), b"BM" + bytes(60)):
            self.assertFalse(is_pict(d))
            with self.assertRaises(PictError):
                decode_pict(d)


class TestQuickTime(unittest.TestCase):
    """QuickTime BMP images, as core/data/pict.test.ts has them."""
    PX = [1, 2, 3, 3, 2, 1]

    def test_rows_bottom_row_first_through_the_color_table(self):
        img = decode_pict(build_ops_pict(3, 2, [quicktime_op(3, 2, self.PX,
                                                             CLUT)]))
        self.assertEqual(colors(img), [RED, GREEN, BLUE, BLUE, GREEN, RED])

    def test_src_rect_only_moved_by_the_matrix(self):
        op = quicktime_op(3, 2, self.PX, CLUT, src=(0, 1, 1, 3), dx=1, dy=1)
        self.assertEqual(colors(decode_pict(build_ops_pict(4, 3, [op]))),
                         [WHITE] * 6 + [GREEN, BLUE] + [WHITE] * 4)

    def test_inside_the_clip_region_only(self):
        clip = [0x00, 0x01, 0, 10, 0, 0, 0, 0, 0, 1, 0, 3]
        op = quicktime_op(3, 2, self.PX, CLUT)
        self.assertEqual(colors(decode_pict(build_ops_pict(3, 2, [clip, op]))),
                         [RED, GREEN, BLUE, WHITE, WHITE, WHITE])

    def test_says_why_and_draws_a_later_bitmap(self):
        bitmap = list(build_pict(3, 2, self.PX, clut=CLUT)[40:-2])
        cases = [
            (dict(codec=b"jpeg"), "QuickTime-compressed"),
            (dict(depth=16), "16-bit"),
            (dict(data_size=6), "compressed"),
            (dict(matte_size=4), "matte"),
            (dict(matrix=[0x20000, 0, 0, 0, 0x20000, 0, 0, 0, 0x40000000]),
             "scaled"),
        ]
        for more, why in cases:
            op = quicktime_op(3, 2, self.PX, CLUT, **more)
            with self.assertRaisesRegex(PictError, why):
                decode_pict(build_ops_pict(3, 2, [op]))
            img = decode_pict(build_ops_pict(3, 2, [op, bitmap]))
            self.assertEqual(colors(img), [RED, GREEN, BLUE, BLUE, GREEN, RED])


if __name__ == "__main__":
    unittest.main()
