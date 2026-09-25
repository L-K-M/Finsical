import unittest

from tools.az.emit import _sprite_sheet
from tools.az.fsh import iter_frames
from tools.tests.fixtures import build_fsh


class TestSpriteSheet(unittest.TestCase):
    def test_cells_land_in_their_grid_slot(self):
        # One solid colour per cell, so the sheet reads back as four
        # blocks: group runs down, frame runs across.
        cells = [bytes([10 * g + f + 1]) * 4 for g in range(2)
                 for f in range(2)]
        out = _sprite_sheet(build_fsh(2, [(2, 2, px) for px in cells]))
        self.assertIsNotNone(out)
        ng, nf, cw, ch, idx, dims = out
        self.assertEqual((ng, nf, cw, ch), (2, 2, 2, 2))
        self.assertEqual(dims, [[0, 0, 2, 2], [0, 1, 2, 2],
                                [1, 0, 2, 2], [1, 1, 2, 2]])
        sw = cw * nf
        for g in range(2):
            for f in range(2):
                want = bytes([10 * g + f + 1]) * cw
                for y in range(ch):
                    at = (g * ch + y) * sw + f * cw
                    self.assertEqual(idx[at:at + cw], want, (g, f, y))

    def test_sheet_past_the_pixel_cap_is_rejected(self):
        # 63x63 cells of 131px is an 8253x8253 sheet — 68,112,009 pixels,
        # just past the 1 << 26 cap core/data/fsh.ts applies to the same
        # grid. Without it emit() would allocate and fill a ~65 MB buffer
        # from a payload of ~85 KB.
        cells = [(131, 131, bytes(i % 251 for i in range(131 * 131)))]
        cells += [(1, 1, b"\0")] * (63 * 63 - 1)
        blob = build_fsh(63, cells)
        # The fixture must parse all the way through — otherwise the cap
        # would be hiding behind iter_frames bailing out early.
        self.assertEqual(len(list(iter_frames(blob))), 63 * 63)
        with self.assertRaises(ValueError):
            _sprite_sheet(blob)

    def test_not_a_sprite_stream_reads_as_none(self):
        self.assertIsNone(_sprite_sheet(b"BM" + b"\0" * 64))


if __name__ == "__main__":
    unittest.main()
