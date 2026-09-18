import unittest

from tools.az.fsh import decode_pixels, is_sprite_stream, iter_frames
from tools.tests.fixtures import build_fsh


def to_col(img: bytes, w: int, h: int) -> bytes:
    """row-major -> column-major."""
    return bytes(img[(k % h) * w + k // h] for k in range(w * h))


def to_row(col: bytes, w: int, h: int) -> bytes:
    """column-major -> row-major."""
    return bytes(col[x * h + y] for y in range(h) for x in range(w))


class TestSpriteStream(unittest.TestCase):
    def test_roundtrip_single_frame(self):
        # 6x4 with runs, literal mixes, and a 0xFF value
        img = bytes([
            0, 0, 0, 0, 0, 0,
            0, 9, 9, 9, 9, 0,
            0, 9, 7, 255, 8, 0,
            0, 0, 0, 0, 0, 0,
        ])
        blob = build_fsh(1, [(6, 4, to_col(img, 6, 4))])
        frames = list(iter_frames(blob))
        self.assertEqual(len(frames), 1)
        g, f, fr = frames[0]
        self.assertEqual((g, f, fr.w, fr.h), (0, 0, 6, 4))
        self.assertEqual(fr.idx, img)

    def test_long_run_splits(self):
        # genuine column-major input: the 300-run stays contiguous so the
        # encoder's >255 split path is exercised. fr.idx is the row-major
        # transpose of the input.
        col = bytes([3] * 300 + [1, 2] * 30)  # 20x18 column-major
        blob = build_fsh(2, [(20, 18, col), (20, 18, col[::-1])])
        frames = list(iter_frames(blob))
        self.assertEqual(len(frames), 2)
        self.assertEqual(frames[0][2].idx, to_row(col, 20, 18))
        self.assertEqual(frames[1][2].idx, to_row(col[::-1], 20, 18))

    def test_multi_group(self):
        imgs = [bytes(range(24)), bytes(range(24, 48)), bytes([7] * 24)]
        blob = build_fsh(3, [(4, 6, to_col(i, 4, 6)) for i in imgs]
                         + [(4, 6, to_col(i, 4, 6)) for i in imgs])
        frames = list(iter_frames(blob))
        self.assertEqual(len(frames), 6)
        self.assertEqual([(g, f) for g, f, _ in frames],
                         [(0, 0), (0, 1), (0, 2), (1, 0), (1, 1), (1, 2)])
        for (_, _, fr), want in zip(frames, imgs + imgs):
            self.assertEqual(fr.idx, want)

    def test_short_stream_pads_with_zero(self):
        # stream emits fewer pixels than w*h -> tail fills with 0
        stream = bytes([0xF8, 0xFF, 5, 2, 0, 9, 9])  # 8 of col5 + lits 9,9
        idx = decode_pixels(stream, 4, 4)
        # column-major: 8 px of 5 fill columns x0,x1; lits 9,9 -> x2 y0,y1
        self.assertEqual(idx[0:8], bytes([5, 5, 9, 0, 5, 5, 9, 0]))
        self.assertEqual(idx[-1], 0)

    def test_literal_run_emits_verbatim(self):
        # `04 00` = a 4-pixel literal run; its bytes (0xFF included) land as
        # pixel data — a positive i16 cannot be misread as a color run.
        stream = bytes([0x04, 0x00, 0xFF, 0x07, 0xAA, 0xBB])
        idx = decode_pixels(stream, 2, 2)
        # column-major emit [255,7,170,187] -> row-major [255,170,7,187]
        self.assertEqual(idx, bytes([255, 170, 7, 187]))

    def test_color_run_then_literal_run(self):
        # `FE FF 09` = i16 -2 -> run of 2 x col 9; `01 00 2A` = 1 literal.
        stream = bytes([0xFE, 0xFF, 0x09, 0x01, 0x00, 0x2A])
        idx = decode_pixels(stream, 3, 1)
        self.assertEqual(idx, bytes([9, 9, 0x2A]))

    def test_long_run_roundtrip(self):
        # a run of 300 fits one signed-i16 color-run command.
        from tools.tests.fixtures import _encode_frame_stream
        px = bytes([7]) * 300  # one 300-tall column of color 7
        stream = _encode_frame_stream(px)
        self.assertEqual(stream, b"\xd4\xfe\x07")
        self.assertEqual(decode_pixels(stream, 1, 300), px)

    def test_sniff(self):
        blob = build_fsh(1, [(4, 4, bytes(16))])
        self.assertTrue(is_sprite_stream(blob))
        self.assertFalse(is_sprite_stream(b""))
        self.assertFalse(is_sprite_stream(b"BM" + b"\0" * 100))
        self.assertFalse(is_sprite_stream(b"\x40\x00\x40\x00" + b"\0" * 100))

    def test_stops_on_garbage_record(self):
        good = build_fsh(1, [(4, 4, bytes(16))])
        # claim a second frame so the trailing bytes get parsed as a record
        blob = good[:2] + b"\x02\x00" + good[4:] + b"GARBAGEGARBAGE"
        frames = list(iter_frames(blob))
        self.assertEqual(len(frames), 1)


if __name__ == "__main__":
    unittest.main()
