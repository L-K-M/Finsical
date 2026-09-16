import unittest

from tools.az.pack import Pack, PackError, is_pack
from tools.tests.fixtures import build_bmp8, build_pack

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

    def test_name_extraction(self):
        p = Pack(_pack())
        self.assertEqual(p.names(), [(0x500, "Fred")])

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
            self.assertEqual(len(m["chunks"]), 3)
            self.assertEqual(m["names"], {"1280": "Fred"})
            with open(os.path.join(td, "manifest.json")) as f:
                disk = json.load(f)
            self.assertEqual(disk["chunks"], m["chunks"])
            img = [c for c in m["chunks"] if "image" in c]
            self.assertEqual(len(img), 1)
            self.assertTrue(os.path.exists(os.path.join(td, img[0]["image"])))
            for c in m["chunks"]:
                self.assertTrue(os.path.exists(os.path.join(td, c["file"])))


if __name__ == "__main__":
    unittest.main()
