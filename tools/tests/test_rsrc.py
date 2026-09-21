import os
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

    def test_macbinary_rejects_raw_fork(self):
        # A raw fork starts with its data offset (0x00000100): byte 1
        # is zero, failing MacBinary's 1..63 name-length check.
        raw = b"\x00\x00\x01\x00" + b"\x00" * 200
        self.assertIs(unwrap_macbinary(raw), raw)


if __name__ == "__main__":
    unittest.main()
