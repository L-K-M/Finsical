"""Tests for the minimal ISO9660 reader and its untrusted-input guards."""
import os
import struct
import subprocess
import sys
import tempfile
import unittest

from tools.az.iso9660 import Iso, IsoError

SECTOR = 2048


def _dir_record(extent, size, name, is_dir=False):
    rec = bytearray(33 + len(name))
    rec[0] = len(rec)
    struct.pack_into('<I', rec, 2, extent)
    struct.pack_into('<I', rec, 10, size)
    rec[25] = 2 if is_dir else 0
    rec[32] = len(name)
    rec[33:] = name
    return bytes(rec)


def build_iso(root_extent=17, root_size=SECTOR, file_extent=18,
              file_blob=b'DATA', pad_after_root=b''):
    """A minimal ISO: PVD at sector 16, a root directory at
    root_extent, one FILE.BIN;1 entry pointing at file_extent."""
    img = bytearray(SECTOR * (file_extent + 1))
    pvd = bytearray(SECTOR)
    pvd[0] = 1
    pvd[1:6] = b'CD001'
    pvd[156:156 + 34] = _dir_record(root_extent, root_size, b'\x00', True)
    img[16 * SECTOR:17 * SECTOR] = pvd
    root = bytearray(SECTOR)
    off = 0
    for name, extent, size, is_dir in [
            (b'\x00', root_extent, root_size, True),
            (b'\x01', root_extent, root_size, True),
            (b'FILE.BIN;1', file_extent, len(file_blob), False)]:
        rec = _dir_record(extent, size, name, is_dir)
        root[off:off + len(rec)] = rec
        off += len(rec)
    root[off:off + len(pad_after_root)] = pad_after_root
    img[root_extent * SECTOR:(root_extent + 1) * SECTOR] = root
    # NB: bytearray slice assignment clamps an out-of-range slice, so a
    # root_extent past the pre-sized image appends this sector at EOF
    # instead of placing it. test_rejects_a_directory_extent_past_the_
    # image relies on that: extent 99 still exceeds the resulting file.
    img[file_extent * SECTOR:file_extent * SECTOR + len(file_blob)] = file_blob
    return bytes(img)


class TestIsoGuards(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.dir.cleanup)

    def write(self, blob, name="image.iso"):
        path = os.path.join(self.dir.name, name)
        with open(path, "wb") as f:
            f.write(blob)
        return path

    def test_rejects_a_non_iso_file(self):
        path = self.write(b"not a disc" * 4096)
        with self.assertRaises(IsoError) as cm:
            Iso(path)
        self.assertIn("ISO9660", str(cm.exception))

    def test_rejects_a_truncated_volume_descriptor(self):
        path = self.write(b"\x01CD001" + bytes(64))
        with self.assertRaises(IsoError):
            Iso(path)

    def test_reads_a_minimal_image_and_closes(self):
        path = self.write(build_iso())
        with Iso(path) as iso:
            entries = {r["name"]: r for _, r in iso.walk()}
            self.assertIn("FILE.BIN", entries)
            self.assertEqual(entries["FILE.BIN"]["size"], 4)
            self.assertEqual(iso.read_file(entries["FILE.BIN"]), b"DATA")
        self.assertTrue(iso.f.closed)

    def test_rejects_a_directory_extent_past_the_image(self):
        path = self.write(build_iso(root_extent=99))
        with Iso(path) as iso:
            with self.assertRaises(IsoError):
                iso.listdir()

    def test_rejects_a_directory_record_overrunning_its_sector(self):
        # A record length that walks past the buffer must not be trusted.
        path = self.write(build_iso())
        with Iso(path) as iso:
            with self.assertRaises(IsoError):
                iso._dir_record(b"\xff" + bytes(40), 0)

    def test_rejects_a_record_name_with_path_separators(self):
        path = self.write(build_iso())
        with Iso(path) as iso:
            for name in (b"../EVIL;1", b"a/b;1", b".", b"..",
                         b"evil\x00.txt;1"):
                with self.subTest(name=name):
                    with self.assertRaises(IsoError):
                        iso._dir_record(_dir_record(18, 4, name), 0)

    def test_rejects_dot_names_hiding_behind_a_version(self):
        # walk() uses the identifier after the ;version split, so the
        # unsafe-name check must judge that form: raw '.;1' is not all
        # dots, yet decodes to '.' and would land a bare '..' in the
        # accumulated paths.
        path = self.write(build_iso())
        with Iso(path) as iso:
            for name in (b".;1", b"..;1", b";1"):
                with self.subTest(name=name):
                    with self.assertRaises(IsoError):
                        iso._dir_record(_dir_record(18, 4, name), 0)

    def test_keeps_the_single_byte_self_and_parent_names(self):
        # The real '.'/'..' records are the single bytes \x00/\x01 —
        # the identifier check must not read them as bare dot names.
        path = self.write(build_iso())
        with Iso(path) as iso:
            self.assertEqual(
                iso._dir_record(
                    _dir_record(17, SECTOR, b"\x00", True), 0)["name"],
                ".")
            self.assertEqual(
                iso._dir_record(
                    _dir_record(17, SECTOR, b"\x01", True), 0)["name"],
                "..")

    def test_zero_padding_short_of_a_record_is_still_padding(self):
        # ISO pads a directory sector's tail with zeros; a zero length
        # byte ends the records however few bytes remain. Reading the
        # 34-byte minimum first would misread 1-33 bytes of real
        # padding as a truncated record.
        path = self.write(build_iso())
        rec = _dir_record(18, 4, b"FILE.BIN;1")
        with Iso(path) as iso:
            for padlen in (1, 20, 33):
                with self.subTest(padlen=padlen):
                    self.assertIsNone(
                        iso._dir_record(rec + bytes(padlen), len(rec)))
                    # A nonzero byte in the same tail is still no
                    # record at all — the size guard must keep biting.
                    with self.assertRaises(IsoError):
                        iso._dir_record(
                            rec + b"\x22" + bytes(padlen - 1), len(rec))


class TestOFlags(unittest.TestCase):
    def test_iso_guard_survives_python_dash_O(self):
        # The constructor's CD001 check must be a raise, not an
        # assert, or -O builds an Iso on a garbage volume descriptor.
        code = (
            "import os, tempfile\n"
            "from tools.az.iso9660 import Iso\n"
            "fd, path = tempfile.mkstemp()\n"
            "os.write(fd, b'not a disc' * 4096)\n"
            "os.close(fd)\n"
            "try:\n"
            "    Iso(path)\n"
            "except Exception as e:\n"
            "    print(type(e).__name__)\n"
            "os.unlink(path)\n")
        out = subprocess.run(
            [sys.executable, "-O", "-c", code],
            cwd=os.path.dirname(os.path.dirname(os.path.dirname(
                os.path.abspath(__file__)))),
            capture_output=True, text=True, check=True, timeout=30)
        self.assertIn("IsoError", out.stdout)


if __name__ == "__main__":
    unittest.main()
