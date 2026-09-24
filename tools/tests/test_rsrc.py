import os
import struct
import tempfile
import unittest

from tools.az.rsrc import (ResFile, unwrap_appledouble, unwrap_binhex,
                           unwrap_container, unwrap_macbinary)
from tools.tests.fixtures import (build_rsrc, wrap_appledouble,
                                  wrap_binhex, wrap_macbinary)


def _write(tmp, blob):
    p = os.path.join(tmp, "t.rsrc")
    with open(p, "wb") as f:
        f.write(blob)
    return p


class TestRsrc(unittest.TestCase):
    def test_lists_types_and_reads_named(self):
        rf_bytes = build_rsrc({
            b"PICT": [(128, "Fish", 0, b"fakepict")],
            b"snd ": [(1, None, 0, b"audiodata")],
        })
        with tempfile.TemporaryDirectory() as td:
            rf = ResFile(_write(td, rf_bytes))
            types = dict(rf.summary())
            self.assertEqual(types["PICT"], 1)
            self.assertEqual(types["snd "], 1)
            res = list(rf.resources(b"PICT"))
            self.assertEqual(len(res), 1)
            rid, name, attr, blob = res[0]
            self.assertEqual((rid, name, blob), (128, "Fish", b"fakepict"))

    def test_offsets_skip_attribute_flags(self):
        # resPurgeable (0x20) and friends live in the offset's high byte.
        rf_bytes = build_rsrc({b"snd ": [(1, "a", 0x20, b"one"),
                                         (2, "b", 0x60, b"two")]})
        with tempfile.TemporaryDirectory() as td:
            rf = ResFile(_write(td, rf_bytes))
            got = [(rid, blob) for rid, _n, _a, blob in
                   rf.resources(b"snd ")]
        self.assertEqual(got, [(1, b"one"), (2, b"two")])

    def test_shared_payload_yields_once(self):
        rf_bytes = bytearray(build_rsrc({b"snd ": [(1, "a", 0, b"one"),
                                                   (2, "b", 0, b"two")]}))
        mo = struct.unpack_from(">I", rf_bytes, 4)[0]
        refs = mo + 28 + 2 + 8
        # Point the second reference at the first one's payload.
        rf_bytes[refs + 12 + 5:refs + 12 + 8] = rf_bytes[refs + 5:refs + 8]
        with tempfile.TemporaryDirectory() as td:
            rf = ResFile(_write(td, bytes(rf_bytes)))
            got = [rid for rid, _n, _a, _b in rf.resources(b"snd ")]
        self.assertEqual(got, [1])

    def test_reads_first_type_entry_only(self):
        rf_bytes = bytearray(build_rsrc({b"snd ": [(1, "a", 0, b"one")],
                                         b"xxxx": [(2, "b", 0, b"two")]}))
        mo = struct.unpack_from(">I", rf_bytes, 4)[0]
        tbase = mo + struct.unpack_from(">H", rf_bytes, mo + 24)[0]
        rf_bytes[tbase + 2 + 8:tbase + 2 + 12] = b"snd "
        with tempfile.TemporaryDirectory() as td:
            rf = ResFile(_write(td, bytes(rf_bytes)))
            got = [rid for rid, _n, _a, _b in rf.resources(b"snd ")]
        self.assertEqual(got, [1])

    def test_appledouble_unwrap(self):
        inner = build_rsrc({b"DATA": [(100, None, 0, b"xyz")]})
        with tempfile.TemporaryDirectory() as td:
            rf = ResFile(_write(td, wrap_appledouble(inner)))
            res = list(rf.resources(b"DATA"))
            self.assertEqual(res[0][3], b"xyz")

    def test_unwrap_passthrough(self):
        raw = b"not appledouble"
        self.assertEqual(unwrap_appledouble(raw), raw)

    def test_macbinary_unwrap(self):
        inner = build_rsrc({b"snd ": [(1, "tap", 0, b"snddata")]})
        mb = wrap_macbinary(inner, data=b"payload")
        self.assertEqual(unwrap_macbinary(mb), inner)
        res = list(ResFile.from_bytes(mb).resources(b"snd "))
        self.assertEqual(res[0][1], "tap")

    def test_binhex_unwrap(self):
        # Payload includes 0x90 bytes and a long run to exercise RLE.
        inner = build_rsrc({b"snd ": [(1, "bloop", 0,
                                      b"\x90\x90\xff" + b"\x80" * 9)]})
        bh = wrap_binhex(inner, data=b"payload")
        self.assertEqual(unwrap_binhex(bh), inner)
        res = list(ResFile.from_bytes(bh).resources(b"snd "))
        self.assertEqual(res[0][3], b"\x90\x90\xff" + b"\x80" * 9)

    def test_negative_name_offset_treated_as_nameless(self):
        # A corrupt ref entry (nameOffset 0x8000) must not index
        # backwards into the name list — decodes nameless like -1.
        fork = bytearray(build_rsrc({b"snd ": [(1, "tap", 0, b"d")]}))
        map_off = struct.unpack_from(">I", fork, 4)[0]
        struct.pack_into(">h", fork, map_off + 28 + 2 + 8 + 2, -32768)
        res = list(ResFile.from_bytes(bytes(fork)).resources(b"snd "))
        self.assertEqual(res[0][1], None)
        self.assertEqual(res[0][3], b"d")

    def test_overlong_name_length_treated_as_nameless(self):
        # A length byte claiming more than remains must yield nameless
        # (matching the TS sibling), not a silently truncated name.
        fork = bytearray(build_rsrc({b"snd ": [(1, "tap", 0, b"d")]}))
        map_off = struct.unpack_from(">I", fork, 4)[0]
        fork[map_off + 28 + 22] = 0xFF  # the single name's length byte
        res = list(ResFile.from_bytes(bytes(fork)).resources(b"snd "))
        self.assertEqual(res[0][1], None)

    def test_nested_containers(self):
        # A .bin holding an AppleDouble holding the fork — real files
        # stack encodings, so unwrap_container loops until stable.
        inner = build_rsrc({b"snd ": [(2, None, 0, b"deep")]})
        nested = wrap_binhex(wrap_macbinary(wrap_appledouble(inner)))
        res = list(ResFile.from_bytes(nested).resources(b"snd "))
        self.assertEqual(res[0][3], b"deep")

    def test_binhex_rejects_garbage(self):
        raw = b"\x00\x01\x02\x03binary"
        self.assertIs(unwrap_binhex(raw), raw)

    def test_binhex_truncated_header_no_raise(self):
        # Cut the stream so decode yields a name byte (30) whose header
        # tail is missing — bounds-guarded passthrough, not IndexError.
        inner = build_rsrc({b"snd ": [(1, "x", 0, b"d")]})
        bh = wrap_binhex(inner, name=b"x" * 30)
        cut = bh[:60]
        self.assertIs(unwrap_binhex(cut), cut)
        self.assertIs(unwrap_container(cut), cut)

    def test_macbinary_rejects_raw_fork(self):
        # A raw fork starts with its data offset (0x00000100): byte 1
        # is zero, failing MacBinary's 1..63 name-length check.
        raw = b"\x00\x00\x01\x00" + b"\x00" * 200
        self.assertIs(unwrap_macbinary(raw), raw)


if __name__ == "__main__":
    unittest.main()
