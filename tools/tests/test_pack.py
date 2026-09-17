import struct
import unittest

from tools.az.pack import Pack, PackError, is_pack
from tools.tests.fixtures import build_bmp8, build_fsh, build_pack

PAL = [(0, 0, 0), (255, 255, 255)]


def _pack():
    bmp = build_bmp8(2, 2, bytes([0, 1, 1, 0]), PAL)
    name = bytes([4]) + b"Fred" + b"\0" * 20
    blob = bytes(range(64))
    return build_pack(
        [bmp, name, blob],
        [(0x258, 0xFFFF, 0), (0x500, 0xFFFF, 1), (0x259, 0x0F, 2)],
    )


class TestPack(unittest.TestCase):
    def test_walks_chunks_and_directory(self):
        p = Pack(_pack())
        self.assertEqual(len(p.chunks), 3)
        self.assertEqual(len(p.images()), 1)
        self.assertEqual(len(p.blobs()), 2)
        self.assertEqual(len(p.directory), 3)
        self.assertEqual(p.chunks[0].res_id, 0x258)
        self.assertEqual(p.chunks[1].res_id, 0x500)
        self.assertEqual(p.chunks[2].sub, 0x0F)

    def test_header_fields(self):
        p = Pack(build_pack([b"x"], tag=b"AqZn", version=0x1234))
        self.assertEqual(p.tag, "AqZn")
        self.assertEqual(p.version, 0x1234)

    def test_name_extraction(self):
        p = Pack(_pack())
        self.assertEqual(p.names(), [(0x500, "Fred")])

    def test_duplicate_dir_records_first_wins(self):
        p = Pack(build_pack([b"abc"], [(0x258, 1, 0), (0x999, 2, 0)]))
        self.assertEqual(len(p.directory), 2)
        self.assertEqual((p.chunks[0].res_id, p.chunks[0].sub), (0x258, 1))

    def test_chunk_overrunning_trailer_is_dropped(self):
        good = b"OK"
        # last chunk claims 8 bytes: fits in the file but crosses dir_off
        body = bytearray(b"\0" * 0x100)
        body += struct.pack("<I", len(good)) + good
        body += struct.pack("<I", 8) + b"BMbad"
        dir_off = len(body)
        hdr = struct.pack("<IIII", 0x00000100, dir_off,
                          dir_off - 0x100, 0x104)
        body[:16] = hdr
        body += hdr  # trailer header copy (no dir records)
        p = Pack(bytes(body))
        self.assertEqual(len(p.chunks), 1)
        self.assertEqual(p.chunks[0].payload, good)

    def test_rejects_non_pack(self):
        self.assertFalse(is_pack(b"hello"))
        with self.assertRaises(PackError):
            Pack(b"hello")


class TestEmit(unittest.TestCase):
    def test_emit_writes_manifest_and_files(self):
        import json
        import os
        import tempfile
        from tools.az.emit import emit

        with tempfile.TemporaryDirectory() as td:
            m = emit(Pack(_pack()), td)
            self.assertEqual(m["format"], "azpack/1")
            self.assertEqual(m["tag"], "XXXX")
            self.assertEqual(m["version"], 0x5DC)
            self.assertEqual(len(m["chunks"]), 3)
            self.assertEqual(m["names"], [{"resId": 0x500, "name": "Fred"}])
            with open(os.path.join(td, "manifest.json")) as f:
                disk = json.load(f)
            self.assertEqual(disk["chunks"], m["chunks"])
            img = [c for c in m["chunks"] if "image" in c]
            self.assertEqual(len(img), 1)
            self.assertTrue(os.path.exists(os.path.join(td, img[0]["image"])))
            for c in m["chunks"]:
                self.assertTrue(os.path.exists(os.path.join(td, c["file"])))

    def test_emit_decodes_sprite_streams(self):
        import os
        import tempfile
        from tools.az.emit import emit

        bmp = build_bmp8(2, 2, bytes([0, 1, 1, 0]), PAL)
        px = bytes([1] * 8 + [0] * 8)  # 4x4, column-major-ish pattern
        stream = build_fsh(2, [(4, 4, px), (4, 4, px[::-1])])
        pack = Pack(build_pack([bmp, stream],
                               [(0x258, 0xFFFF, 0), (0xC8, 0xFFFF, 1)]))
        with tempfile.TemporaryDirectory() as td:
            m = emit(pack, td)
            sp = [c for c in m["chunks"] if "sprites" in c]
            self.assertEqual(len(sp), 1)
            meta = sp[0]["sprites"]
            self.assertEqual((meta["groups"], meta["framesPerGroup"]), (1, 2))
            self.assertEqual((meta["cellW"], meta["cellH"]), (4, 4))
            self.assertEqual(meta["dims"], [[4, 4], [4, 4]])
            path = os.path.join(td, meta["image"])
            self.assertTrue(os.path.exists(path))
            with open(path, "rb") as fh:
                self.assertEqual(fh.read(8), b"\x89PNG\r\n\x1a\n")

    def test_emit_survives_bad_bmp(self):
        import os
        import tempfile
        from tools.az.emit import emit

        good = build_bmp8(2, 2, bytes([0, 1, 1, 0]), PAL)
        bad = b"BM" + b"\xff" * 40  # BMP magic, garbage body
        pack = Pack(build_pack([good, bad], [(0x258, 0xFFFF, 0),
                                             (0x259, 0xFFFF, 1)]))
        with tempfile.TemporaryDirectory() as td:
            m = emit(pack, td)
            self.assertEqual(len(m["chunks"]), 2)
            recs = {c["resId"]: c for c in m["chunks"]}
            self.assertIn("image", recs[0x258])
            self.assertNotIn("image", recs[0x259])
            self.assertTrue(recs[0x259].get("bad_image"))
            for c in m["chunks"]:
                self.assertTrue(os.path.exists(os.path.join(td, c["file"])))


if __name__ == "__main__":
    unittest.main()
