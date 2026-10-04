import contextlib
import io
import os
import struct
import sys
import tempfile
import unittest
import zipfile

sys.path.insert(0, os.path.dirname(os.path.dirname(
    os.path.dirname(os.path.abspath(__file__)))))
import tools.fetch  # noqa: E402
from tools.fetch import (_MAX_ZIP_DEPTH, _emit_source,  # noqa: E402
                         _harvest)
from tools.tests.fixtures import build_is3, build_rsrc  # noqa: E402


def _fails_midway(_payload, dst):
    """Emitter stub: lands partial output, then dies — the
    recognizable-but-corrupt case."""
    os.makedirs(dst, exist_ok=True)
    with open(os.path.join(dst, "manifest.json"), "w") as f:
        f.write("{ not a manifest")
    raise ValueError("corrupt source")


def fake_pack(bmp_payload: bytes) -> bytes:
    """Minimal 9003inc pack: header + one chunk + dir trailer."""
    d = bytearray(0x100)
    struct.pack_into("<I", d, 0, 0x00000100)
    d[16:20] = b"AqZn"
    d += struct.pack("<I", len(bmp_payload)) + bmp_payload
    struct.pack_into("<I", d, 4, len(d))      # dir_off
    d += b"\x00" * 16
    return bytes(d)


def bmp_8bit(w=4, h=4) -> bytes:
    pal = b"".join(struct.pack("<BBBB", i, i, i, 0) for i in range(256))
    off = 14 + 40 + len(pal)
    img = w * h
    return struct.pack("<2sIHHI", b"BM", off + img, 0, 0, off) + \
        struct.pack("<IiiHHIIiiII", 40, w, -h, 1, 8, 0, img, 0, 0, 0, 0) + \
        pal + bytes([1] * img)


class SjisInfo(zipfile.ZipInfo):
    """A zip entry whose name is stored as raw Shift-JIS bytes with the
    UTF-8 flag clear, the way the JPN add-on archives were written."""
    def __init__(self, name: str):
        super().__init__(name)

    def _encodeFilenameFlags(self):
        return self.filename.encode("shift_jis"), \
            self.flag_bits & ~0x800


class TestHarvest(unittest.TestCase):
    def setUp(self):
        tools.fetch._EMITTED.clear()  # keep tests order-independent
        self.tmp = tempfile.TemporaryDirectory()
        self.out = self.tmp.name

    def tearDown(self):
        self.tmp.cleanup()

    def test_pack_emits_bundle(self):
        made = _harvest("t.fsh", fake_pack(bmp_8bit()), self.out)
        self.assertEqual(len(made), 1)
        self.assertTrue(os.path.exists(
            os.path.join(made[0], "manifest.json")))

    def test_zip_recurses(self):
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            z.writestr("fish/NeonTetra.fsh", fake_pack(bmp_8bit()))
            z.writestr("__MACOSX/x", b"junk")
            z.writestr("readme.txt", b"hi")
        made = _harvest("a.zip", buf.getvalue(), self.out)
        self.assertEqual(len(made), 1)
        self.assertIn("NeonTetra", made[0])

    def test_same_basename_does_not_collide(self):
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            z.writestr("a/fish.fsh", fake_pack(bmp_8bit()))
            z.writestr("b/fish.fsh", fake_pack(bmp_8bit()))
        made = _harvest("two.zip", buf.getvalue(), self.out)
        self.assertEqual(len(made), 2)
        self.assertNotEqual(made[0], made[1])
        self.assertTrue(all(os.path.isdir(p) for p in made))

    def test_zip_entry_paths_are_contained(self):
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            z.writestr("../../evil.fsh", fake_pack(bmp_8bit()))
            z.writestr("/abs/path.fsh", fake_pack(bmp_8bit()))
            z.writestr("dir\\back.fsh", fake_pack(bmp_8bit()))
            z.writestr("._meta.fsh", fake_pack(bmp_8bit()))
        made = _harvest("slip.zip", buf.getvalue(), self.out)
        # ._meta.fsh too: an AppleDouble companion reaches the emitters,
        # which go by content, and its bundle is named without the "._".
        self.assertEqual(len(made), 4)
        for p in made:
            self.assertEqual(os.path.commonpath([p, self.out]), self.out)
        self.assertFalse(any("._" in os.path.basename(p) for p in made))

    def test_sjis_entry_names(self):
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            z.writestr(SjisInfo("グッピー1.fsh"), fake_pack(bmp_8bit()))
            # ソ's trail byte is 0x5C — decodes to a name, not a path.
            z.writestr(SjisInfo("ソ.fsh"), fake_pack(bmp_8bit()))
        with zipfile.ZipFile(buf) as zf:
            for zi in zf.infolist():
                self.assertFalse(zi.flag_bits & 0x800)  # unflagged SJIS names
        made = _harvest("jpn.zip", buf.getvalue(), self.out)
        self.assertEqual(
            sorted(os.path.basename(p) for p in made),
            ["グッピー1.azpack", "ソ.azpack"])

    def test_food_pack_extension_harvests(self):
        made = _harvest("flake.fd", fake_pack(bmp_8bit()), self.out)
        self.assertEqual(len(made), 1)
        self.assertIn("flake", made[0])

    def test_garbage_is_skipped(self):
        self.assertEqual(_harvest("x.bin", b"not a pack", self.out), [])
        self.assertEqual(_harvest("x.zip", b"not a zip", self.out), [])

    def test_oversized_zip_entry_skipped(self):
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            z.writestr("tiny.fsh", fake_pack(bmp_8bit()))
        data = bytearray(buf.getvalue())
        # Lie about uncompressed size in local + central headers.
        for sig, off in ((b"PK\x03\x04", 22), (b"PK\x01\x02", 24)):
            i = data.find(sig)
            self.assertNotEqual(i, -1)
            data[i + off:i + off + 4] = (2 << 30).to_bytes(4, "little")
        self.assertEqual(_harvest("a.zip", bytes(data), self.out), [])

    def test_nested_zip_depth_limited(self):
        inner = io.BytesIO()
        with zipfile.ZipFile(inner, "w") as z:
            z.writestr("deep.fsh", fake_pack(bmp_8bit()))
        blob = inner.getvalue()
        for i in range(_MAX_ZIP_DEPTH + 2):  # beyond _MAX_ZIP_DEPTH
            b = io.BytesIO()
            with zipfile.ZipFile(b, "w") as z:
                z.writestr(f"l{i}.zip", blob)
            blob = b.getvalue()
        self.assertEqual(_harvest("outer.zip", blob, self.out), [])

    def test_nested_zip_within_depth_still_harvests(self):
        inner = io.BytesIO()
        with zipfile.ZipFile(inner, "w") as z:
            z.writestr("deep.fsh", fake_pack(bmp_8bit()))
        blob = inner.getvalue()
        for i in range(_MAX_ZIP_DEPTH - 1):  # within _MAX_ZIP_DEPTH
            b = io.BytesIO()
            with zipfile.ZipFile(b, "w") as z:
                z.writestr(f"l{i}.zip", blob)
            blob = b.getvalue()
        self.assertEqual(len(_harvest("outer.zip", blob, self.out)), 1)

    def test_budget_exhaustion_skips_remaining_entries(self):
        one = fake_pack(bmp_8bit())
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            z.writestr("a/fish.fsh", one)
            z.writestr("b/fish.fsh", one)
        self.assertEqual(
            _harvest("z.zip", buf.getvalue(), self.out,
                     depth=0, budget=[0]), [])
        # Exactly enough budget for the first entry: it lands, rest skip.
        made = _harvest("z.zip", buf.getvalue(), self.out,
                        depth=0, budget=[len(one)])
        self.assertEqual(len(made), 1)

    def test_installshield_cabinet_recurses(self):
        # The US discs keep their Windows items in data.z, an
        # InstallShield 3 cabinet: its packs come out as bundles.
        cab = build_is3([(0, "Eden.azn", fake_pack(bmp_8bit()), False),
                         (0, "Wall.bmp", bmp_8bit(), True),
                         (0, "Anchor rock.acc", fake_pack(bmp_8bit()), False)])
        made = _harvest("DATA.Z", cab, self.out)
        self.assertEqual(sorted(os.path.basename(p) for p in made),
                         ["Anchor rock.azpack", "Eden.azpack"])
        # One whose tables are cut off costs only itself.
        with contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(_harvest("data.z", cab[:300], self.out), [])

    def test_disc_walk_opens_installshield_cabinets(self):
        cab = build_is3([(0, "Eden.azn", fake_pack(bmp_8bit()), False)])

        class FakeIso:
            def walk(self):
                yield "/WIN95/ITEMS/DATA.Z", {"dir": False, "size": len(cab),
                                              "name": "DATA.Z"}

            def read_file(self, rec):
                return cab

        made = tools.fetch._harvest_disc(FakeIso(), self.out)
        self.assertEqual([os.path.basename(p) for p in made], ["Eden.azpack"])

    def test_disc_budget_exhaustion_breaks_iso_loop(self):
        one = fake_pack(bmp_8bit())

        class FakeIso:
            def __init__(self):
                self.reads = []

            def walk(self):
                for p in ["/a/fish.fsh", "/b/fish.fsh", "/c/fish.fsh"]:
                    yield p, {"dir": False, "size": 100,
                              "name": p.rsplit("/", 1)[-1]}

            def read_file(self, rec):
                self.reads.append(rec["name"])
                return one

        iso = FakeIso()
        real = tools.fetch._MAX_TOTAL_BYTES
        tools.fetch._MAX_TOTAL_BYTES = len(one)  # one entry drains it
        try:
            made = tools.fetch._harvest_disc(iso, self.out)
        finally:
            tools.fetch._MAX_TOTAL_BYTES = real
        self.assertEqual(len(iso.reads), 1)  # broke before entry 2
        self.assertEqual(len(made), 1)

    def test_read_capped_overrun(self):
        from tools.fetch import _read_capped
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
            z.writestr("big.bin", b"\x00" * 2048)
        with zipfile.ZipFile(io.BytesIO(buf.getvalue())) as zf:
            zi = zf.infolist()[0]
            self.assertIsNone(_read_capped(zf, zi, 1024))
            self.assertEqual(len(_read_capped(zf, zi, 4096)), 2048)

    def test_invalid_include_regex_reports_usage_error(self):
        from tools.fetch import main
        buf = io.StringIO()
        with contextlib.redirect_stderr(buf), \
                self.assertRaises(SystemExit) as cm:
            main(["--include", "["])
        self.assertEqual(cm.exception.code, 2)
        self.assertIn("invalid regex", buf.getvalue())

    def test_emit_source_pack(self):
        out = _emit_source("t.fsh", fake_pack(bmp_8bit()), self.out)
        self.assertIsNotNone(out)
        self.assertTrue(os.path.exists(out))

    def test_rerun_replaces_bundle(self):
        one = fake_pack(bmp_8bit())
        first = _emit_source("t.fsh", one, self.out)
        tools.fetch._EMITTED.clear()  # simulate a second process run
        second = _emit_source("t.fsh", one, self.out)
        self.assertEqual(first, second)
        self.assertTrue(os.path.exists(
            os.path.join(second, "manifest.json")))

    def test_rerun_drops_orphaned_numbered_bundles(self):
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            z.writestr("a/fish.fsh", fake_pack(bmp_8bit()))
            z.writestr("b/fish.fsh", fake_pack(bmp_8bit()))
        _harvest("two.zip", buf.getvalue(), self.out)
        stale = os.path.join(self.out, "fish-2.azpack")
        self.assertTrue(os.path.isdir(stale))
        tools.fetch._EMITTED.clear()  # next run sees only one source
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            z.writestr("fish.fsh", fake_pack(bmp_8bit()))
        _harvest("one.zip", buf.getvalue(), self.out)
        self.assertFalse(os.path.exists(stale))

    def test_unimportable_source_keeps_earlier_bundles(self):
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            z.writestr("a/fish.fsh", fake_pack(bmp_8bit()))
            z.writestr("b/fish.fsh", fake_pack(bmp_8bit()))
        _harvest("two.zip", buf.getvalue(), self.out)
        base = os.path.join(self.out, "fish.azpack")
        stale = os.path.join(self.out, "fish-2.azpack")
        self.assertTrue(os.path.isdir(base))
        self.assertTrue(os.path.isdir(stale))
        tools.fetch._EMITTED.clear()  # simulate a second process run
        # A later run meets a same-named source it cannot import: the
        # earlier bundles must survive. Cleaning numbered siblings before
        # the data proves importable destroyed the previous good result.
        self.assertIsNone(
            _emit_source("fish.bin", b"not importable", self.out))
        self.assertTrue(os.path.isdir(base))
        self.assertTrue(os.path.isdir(stale))

    def test_stale_sweep_reaches_past_a_gap(self):
        base = _emit_source("fish.fsh", fake_pack(bmp_8bit()), self.out)
        gap = os.path.join(self.out, "fish-3.azpack")
        os.makedirs(gap)  # a leftover -3 with no -2 beside it
        tools.fetch._EMITTED.clear()
        again = _emit_source("fish.fsh", fake_pack(bmp_8bit()), self.out)
        self.assertEqual(again, base)
        self.assertFalse(os.path.exists(gap))
        # Emit once more without clearing _EMITTED: this run lands on
        # fish-2.azpack, so the sweep must spare the numbered bundle it
        # just wrote (finish() registers before sweeping) while still
        # cleaning the orphan behind it.
        os.makedirs(gap)
        numbered = _emit_source("fish.fsh", fake_pack(bmp_8bit()), self.out)
        self.assertEqual(numbered,
                         os.path.join(self.out, "fish-2.azpack"))
        self.assertTrue(os.path.isdir(numbered))
        self.assertTrue(os.path.isdir(base))
        self.assertFalse(os.path.exists(gap))

    def test_failed_emit_keeps_the_earlier_bundles(self):
        # A recognizable source whose emit dies partway used to cost
        # the base bundle: _emit_source rmtree'd it before emit ran.
        base = _emit_source("fish.fsh", fake_pack(bmp_8bit()), self.out)
        sibling = _emit_source("fish.fsh", fake_pack(bmp_8bit()), self.out)
        with open(os.path.join(base, "old.marker"), "w") as f:
            f.write("1")
        tools.fetch._EMITTED.clear()  # a second run replaces in place
        real_emit = tools.fetch.emit
        tools.fetch.emit = _fails_midway
        try:
            self.assertIsNone(
                _emit_source("fish.fsh", fake_pack(bmp_8bit()), self.out))
        finally:
            tools.fetch.emit = real_emit
        # Base (sentinel and manifest intact) and the numbered sibling
        # both survive, with no staging leftovers beside them.
        self.assertTrue(os.path.isfile(os.path.join(base, "old.marker")))
        self.assertTrue(os.path.isfile(
            os.path.join(base, "manifest.json")))
        self.assertTrue(os.path.isdir(sibling))
        self.assertEqual(sorted(os.listdir(self.out)),
                         ["fish-2.azpack", "fish.azpack"])

    def test_failed_publish_restores_the_earlier_bundle(self):
        base = _emit_source("fish.fsh", fake_pack(bmp_8bit()), self.out)
        with open(os.path.join(base, "old.marker"), "w") as f:
            f.write("1")
        tools.fetch._EMITTED.clear()

        real_rename = os.rename
        fired = []

        def fail_first_publish(src, dst):
            # The staged publish into `out` fails once; the move-aside
            # before it and the rollback after it go through.
            if dst == base and not fired:
                fired.append(1)
                raise OSError("simulated publish failure")
            return real_rename(src, dst)

        os.rename = fail_first_publish
        try:
            self.assertIsNone(
                _emit_source("fish.fsh", fake_pack(bmp_8bit()), self.out))
        finally:
            os.rename = real_rename
        # The swapped-out bundle went back; nothing staged or parked
        # is left beside it.
        self.assertTrue(os.path.isfile(os.path.join(base, "old.marker")))
        self.assertEqual(os.listdir(self.out), ["fish.azpack"])

        # The failure is retry-safe: a following emit publishes.
        self.assertEqual(
            _emit_source("fish.fsh", fake_pack(bmp_8bit()), self.out),
            base)
        self.assertFalse(os.path.exists(
            os.path.join(base, "old.marker")))

    def test_rollback_failure_parks_the_bundle_and_says_where(self):
        base = _emit_source("fish.fsh", fake_pack(bmp_8bit()), self.out)
        tools.fetch._EMITTED.clear()

        real_rename = os.rename

        def fail_everything_into_base(src, dst):
            # Publish and rollback both target `out`: both fail.
            if dst == base:
                raise OSError("simulated publish failure")
            return real_rename(src, dst)

        err = io.StringIO()
        os.rename = fail_everything_into_base
        try:
            with contextlib.redirect_stderr(err):
                self.assertIsNone(
                    _emit_source("fish.fsh", fake_pack(bmp_8bit()),
                                 self.out))
        finally:
            os.rename = real_rename
        # The old bundle is not swept — it stays parked and intact, and
        # the error output names where to find it.
        self.assertFalse(os.path.exists(base))
        parked = [d for d in os.listdir(self.out)
                  if d.startswith(".emit-")]
        self.assertEqual(len(parked), 1)
        self.assertTrue(os.path.isfile(
            os.path.join(self.out, parked[0], "old", "manifest.json")))
        self.assertIn(parked[0], err.getvalue())
        self.assertIn("is missing", err.getvalue())

    def test_failed_sounds_emit_keeps_the_earlier_bundle(self):
        # The sounds emitter gets the same staged publish: a corrupt
        # .rsrc re-emit must not cost the previous bank.
        base = os.path.join(self.out, "bank.azpack")
        os.makedirs(os.path.join(base, "sounds"))
        with open(os.path.join(base, "manifest.json"), "w") as f:
            f.write('{"format": "azpack/1"}')
        fork = build_rsrc({b"snd ": [(1, "x", 0, b"\x00" * 4)]})
        real = tools.fetch.emit_sounds
        tools.fetch.emit_sounds = _fails_midway
        try:
            self.assertIsNone(_emit_source("bank.rsrc", fork, self.out))
        finally:
            tools.fetch.emit_sounds = real
        self.assertTrue(os.path.isfile(
            os.path.join(base, "manifest.json")))
        self.assertEqual(os.listdir(self.out), ["bank.azpack"])

    def test_cached_get_reuse_and_part_cleanup(self):
        path = os.path.join(self.out, "a.zip")

        def fake_get(url, out=None, max_bytes=None):
            if out is None:
                return b"{}"
            with open(out, "wb") as f:
                f.write(b"data")

        real_get = tools.fetch._get
        tools.fetch._get = fake_get
        try:
            tools.fetch._cached_get("u", path)          # downloads
            self.assertEqual(open(path, "rb").read(), b"data")
            tools.fetch._cached_get("u", path, want_size=4)  # cache hit
            self.assertFalse(os.path.exists(path + ".part"))
            tools.fetch._cached_get("u", path, want_size=9)  # re-downloads
            self.assertEqual(open(path, "rb").read(), b"data")

            def boom(url, out=None, max_bytes=None):
                with open(out, "wb") as f:
                    f.write(b"partial")
                raise OSError("net down")
            tools.fetch._get = boom
            with self.assertRaises(OSError):
                tools.fetch._cached_get("u", path + "2")
            self.assertFalse(os.path.exists(path + "2.part"))
        finally:
            tools.fetch._get = real_get


if __name__ == "__main__":
    unittest.main()
