import struct
import unittest

from tools.az.is3 import (_DIST_LENGTHS, _LEN_LENGTHS, _LIT_LENGTHS,
                          Is3Error, MAX_MEMBER_BYTES, _nibbles, explode,
                          is_is3, members, read_member)
from tools.tests.fixtures import build_is3, implode

PACK = struct.pack("<I", 0x100) + bytes(range(256)) * 3

# The same code lengths as zlib's contrib/blast writes them: runs, each
# byte a length (low nibble) and its repeat count less one (high).
BLAST_LIT = bytes([
    11, 124, 8, 7, 28, 7, 188, 13, 76, 4, 10, 8, 12, 10, 12, 10, 8, 23, 8,
    9, 7, 6, 7, 8, 7, 6, 55, 8, 23, 24, 12, 11, 7, 9, 11, 12, 6, 7, 22, 5,
    7, 24, 6, 11, 9, 6, 7, 22, 7, 11, 38, 7, 9, 8, 25, 11, 8, 11, 9, 12,
    8, 12, 5, 38, 5, 38, 5, 11, 7, 5, 6, 21, 6, 10, 53, 8, 7, 24, 10, 27,
    44, 253, 253, 253, 252, 252, 252, 13, 12, 45, 12, 45, 12, 61, 12, 45,
    44, 173])
BLAST_LEN = bytes([2, 35, 36, 53, 38, 23])
BLAST_DIST = bytes([2, 20, 53, 230, 247, 151, 248])


class TestExplode(unittest.TestCase):
    def test_decodes_blasts_documented_example(self):
        # The example zlib's contrib/blast gives for the format: raw
        # literals, 4 distance bits, a match and the end code. The
        # round trips below share this reader's conventions; this one
        # comes from outside it.
        self.assertEqual(explode(bytes.fromhex("00048224258f807f"), 13),
                         b"AIAIAIAIAIAIA")

    def test_code_length_tables_match_blasts(self):
        # The tables are deark's, two lengths a byte; blast's runs come
        # from another source. Their agreeing pins every code, not only
        # the few the example above uses.
        def runs(rep):
            return [b & 15 for b in rep for _ in range((b >> 4) + 1)]
        self.assertEqual(_nibbles(_LIT_LENGTHS, 256), runs(BLAST_LIT))
        self.assertEqual(_nibbles(_LEN_LENGTHS, 16), runs(BLAST_LEN))
        self.assertEqual(_nibbles(_DIST_LENGTHS, 64), runs(BLAST_DIST))
        self.assertEqual((len(_LIT_LENGTHS), len(_LEN_LENGTHS),
                          len(_DIST_LENGTHS)), (128, 8, 32))

    def test_round_trips_each_form(self):
        # Raw and coded literals, every distance width, overlapping
        # copies ("ab" over and over) and a length 2 match, whose
        # distance takes 2 low bits.
        data = PACK + b"ab" * 300 + b"xyzxyq" * 50 + b"aa"
        for coded in (False, True):
            for low in (4, 5, 6):
                with self.subTest(coded=coded, low=low):
                    self.assertEqual(explode(implode(data, coded, low),
                                             len(data)), data)

    def test_an_empty_member_is_its_end_code(self):
        self.assertEqual(explode(implode(b""), 0), b"")

    def test_refuses_what_isnt_imploded(self):
        for bad in (b"", b"\x00", b"\x02\x06", b"\x00\x03", b"\x00\x07"):
            with self.assertRaises(Is3Error):
                explode(bad + bytes(8), 8)

    def test_holds_a_stream_to_its_member_size(self):
        packed = implode(PACK)
        for size in (len(PACK) - 1, len(PACK) + 1):
            with self.assertRaises(Is3Error):
                explode(packed, size)

    def test_refuses_a_distance_before_the_start(self):
        # Raw literals, 6 distance bits, then a match first thing: its
        # flag, length code 0 (3 bytes) and distance code 0 (the two
        # shortest codes, 00, sent inverted), six zero bits: distance 1,
        # with nothing to copy from yet.
        with self.assertRaises(Is3Error):
            explode(bytes([0x00, 0x06, 0x1F, 0x00]), 3)

    def test_raises_only_is3_error_on_damage(self):
        packed = implode(PACK + b"ab" * 100, coded=True)
        size = len(PACK) + 200
        for n in range(len(packed)):
            with self.assertRaises(Is3Error):
                explode(packed[:n], size)
        seed = 9
        for _ in range(500):
            d = bytearray(packed)
            for _ in range(1 + seed % 3):
                seed = (seed * 1664525 + 1013904223) & 0xFFFFFFFF
                at = seed % len(d)
                seed = (seed * 1664525 + 1013904223) & 0xFFFFFFFF
                d[at] = seed & 0xFF
            try:
                self.assertEqual(len(explode(bytes(d), size)), size)
            except Is3Error:
                pass


class TestArchive(unittest.TestCase):
    def test_lists_and_reads_members(self):
        d = build_is3([(0, "Eden.azn", PACK, False),
                       (1, "Wall.bmp", b"BM" + bytes(60), True),
                       (0, "Anchor rock.acc", PACK[::-1], False)],
                      dirs=("Items", "Backgrounds"))
        self.assertTrue(is_is3(d))
        ms = members(d)
        self.assertEqual([(m.path, m.size, m.stored) for m in ms],
                         [("Items/Eden.azn", len(PACK), False),
                          ("Backgrounds/Wall.bmp", 62, True),
                          ("Items/Anchor rock.acc", len(PACK), False)])
        self.assertEqual([read_member(d, m) for m in ms],
                         [PACK, b"BM" + bytes(60), PACK[::-1]])

    def test_refuses_what_it_cant_read(self):
        good = build_is3([(0, "Eden.azn", PACK, False)])
        self.assertFalse(is_is3(b"PK\x03\x04"))
        with self.assertRaises(Is3Error):
            members(b"PK\x03\x04" + bytes(60))
        # A member split across volumes, and one past the end.
        filepos = struct.unpack_from("<I", good, 51)[0]
        split = bytearray(good)
        split[filepos + 26] = 1
        past = bytearray(good)
        struct.pack_into("<I", past, filepos + 11, len(good))
        for bad in (split, past):
            with self.assertRaises(Is3Error):
                members(bytes(bad))
        # A member too big to allocate: listed, but not read.
        huge = bytearray(good)
        struct.pack_into("<I", huge, filepos + 3, MAX_MEMBER_BYTES + 1)
        m = members(bytes(huge))[0]
        with self.assertRaises(Is3Error):
            read_member(bytes(huge), m)
        with self.assertRaisesRegex(Is3Error, "over the cap"):
            explode(implode(b""), MAX_MEMBER_BYTES + 1)

    def test_raises_only_is3_error_on_damage(self):
        good = build_is3([(0, "Eden.azn", PACK, False),
                          (0, "Wall.bmp", b"BM" + bytes(60), True)])
        for n in range(len(good)):
            try:
                for m in members(good[:n]):
                    read_member(good[:n], m)
            except Is3Error:
                pass
        seed = 3
        for _ in range(500):
            d = bytearray(good)
            for _ in range(1 + seed % 3):
                seed = (seed * 1664525 + 1013904223) & 0xFFFFFFFF
                at = seed % len(d)
                seed = (seed * 1664525 + 1013904223) & 0xFFFFFFFF
                d[at] = seed & 0xFF
            try:
                for m in members(bytes(d)):
                    read_member(bytes(d), m)
            except Is3Error:
                pass


if __name__ == "__main__":
    unittest.main()
