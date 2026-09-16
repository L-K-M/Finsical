import os
import tempfile
import unittest

from tools.az.rsrc import ResFile, unwrap_appledouble
from tools.tests.fixtures import build_rsrc, wrap_appledouble


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


if __name__ == "__main__":
    unittest.main()
