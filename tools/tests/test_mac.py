"""Mac pictures through the CLI: emit_mac, azpack.py and fetch.py's
--archive mode, with pictures and forks built here."""
import contextlib
import io
import json
import os
import struct
import tempfile
import unittest
import zlib
from unittest import mock

import tools.fetch
from tools import azpack
from tools.az.emit import emit_mac
from tools.az.macpics import has_mac_pictures, mac_display_name, mac_pictures
from tools.tests.fixtures import (build_pict, build_rsrc, wrap_appledouble,
                                  wrap_applesingle, wrap_binhex, wrap_macbinary)

CLUT = [(255, 255, 255), (40, 160, 60), (30, 60, 200)]


def strip(w=400, h=60):
    """A gravel strip: white sky rows over green stones."""
    return build_pict(w, h, [0 if i < w * 2 else 1 for i in range(w * h)],
                      clut=CLUT)


def snd():
    """A playable 'snd ': format 2, one bufferCmd, 8-bit samples."""
    body = struct.pack(">HHHHHI", 2, 0, 1, 0x8050, 0, 14)
    hdr = struct.pack(">IIIIIBB", 0, 1, 11025 << 16, 0, 0, 0, 60)
    return body + hdr + bytes([128, 140, 120])


def gravel_fork(with_sound=False):
    types = {b"Grvl": [(4020, None, 0, bytes([0, 53, 0, 52, 0, 0, 0, 0]))],
             b"BADP": [(4020, None, 0, build_pict(64, 48, [2] * 64 * 48,
                                                  clut=CLUT))],
             b"BAPC": [(4020, None, 0, strip())]}
    if with_sound:
        types[b"snd "] = [(1, "crunch", 0, snd())]
    return wrap_appledouble(build_rsrc(types))


def png_header(path):
    """(w, h, bit depth, color type, interlace) of a PNG file."""
    with open(path, "rb") as f:
        d = f.read()
    assert d[:8] == b"\x89PNG\r\n\x1a\n"
    return struct.unpack(">IIBBBBB", d[16:29])[:3] + \
        (d[25], d[28])


def png_indices(path, w, h):
    """The palette indices of an 8-bit indexed PNG with filter 0 rows."""
    with open(path, "rb") as f:
        d = f.read()
    p, idat = 8, b""
    while p < len(d):
        n = struct.unpack(">I", d[p:p + 4])[0]
        if d[p + 4:p + 8] == b"IDAT":
            idat += d[p + 8:p + 8 + n]
        p += 12 + n
    raw = zlib.decompress(idat)
    return b"".join(raw[y * (w + 1) + 1:(y + 1) * (w + 1)] for y in range(h))


class TestMacPictures(unittest.TestCase):
    def test_a_pict_file_and_a_gravel_fork(self):
        gravel, images, failed = mac_pictures(build_pict(320, 200, [1] * 64000,
                                                         clut=CLUT, file=True))
        self.assertEqual((gravel, [i[0] for i in images], failed),
                         (False, ["PICT"], []))
        gravel, images, failed = mac_pictures(gravel_fork())
        self.assertTrue(gravel)
        self.assertEqual([(k, rid, img[:2]) for k, rid, _, img in images],
                         [("BAPC 4020", 4020, (400, 60)),
                          ("BADP 4020", 4020, (64, 48))])

    def test_a_pict_file_wrapped_for_the_trip(self):
        # Its picture travels in the data fork.
        pict = build_pict(320, 200, [1] * 64000, clut=CLUT, file=True)
        for d in (wrap_macbinary(b"", data=pict), wrap_binhex(b"", data=pict),
                  wrap_applesingle(b"", data=pict)):
            gravel, images, failed = mac_pictures(d)
            self.assertEqual([(k, img[:2]) for k, _, _, img in images],
                             [("PICT", (320, 200))])
            self.assertTrue(has_mac_pictures(d))
        # And it emits as a PICT file does.
        with tempfile.TemporaryDirectory() as out:
            m = emit_mac(wrap_macbinary(b"", data=pict), out)
        self.assertEqual([c["name"] for c in m["chunks"]], ["PICT"])

    def test_files_without_pictures(self):
        for d in (b"", b"\x01\x02\x03", bytes(4096),
                  build_rsrc({b"snd ": [(1, None, 0, snd())]})):
            self.assertIsNone(mac_pictures(d))
            self.assertFalse(has_mac_pictures(d))
        self.assertTrue(has_mac_pictures(gravel_fork()))

    def test_display_names(self):
        self.assertEqual(mac_display_name("ë€"), "苔")
        self.assertEqual(mac_display_name("._星砂- star sand"), "星砂- star sand")
        self.assertEqual(mac_display_name("Café"), "Café")
        self.assertEqual(mac_display_name("ãæÇÃÇÊÇ§Ç»äC"), "鏡のような海")

    def test_accented_latin_names_stay(self):
        # Each decodes as Shift-JIS without error, to kanji among letters.
        for n in ("Réal", "Noël", "Crème brûlée", "Smörgåsbord", "Ångström"):
            self.assertEqual(mac_display_name(n), n)

    def test_extension_kanji_read_as_the_browser_reads_them(self):
        # 0xED40 is 纊, an NEC-selected IBM kanji: a browser's Shift-JIS
        # (and cp932) decodes it, Python's shift_jis doesn't.
        self.assertEqual(mac_display_name("Ì@"), "纊")

    def test_a_type_count_past_the_map_keeps_the_types_before_it(self):
        # As core/data/resfork.ts reads it: BAPC is listed first, then
        # the count runs off the end of the file.
        fork = bytearray(build_rsrc({b"BAPC": [(4020, None, 0, strip())],
                                     b"Grvl": [(4020, None, 0, bytes(8))]}))
        mo = struct.unpack_from(">I", fork, 4)[0]
        tbase = mo + struct.unpack_from(">H", fork, mo + 24)[0]
        struct.pack_into(">H", fork, tbase, 500)
        gravel, images, _ = mac_pictures(bytes(fork))
        self.assertTrue(gravel)  # Grvl, the second type, still counts
        self.assertEqual([k for k, *_ in images], ["BAPC 4020"])

    def test_an_id_listed_twice_is_one_picture(self):
        # The TypeScript Map keeps the first place and the last picture.
        fork = build_rsrc({b"BAPC": [(4020, None, 0, strip(400, 60)),
                                     (4020, None, 0, strip(800, 60))]})
        _, images, _ = mac_pictures(fork)
        self.assertEqual([(k, img[:2]) for k, _, _, img in images],
                         [("BAPC 4020", (800, 60))])


class TestEmitMac(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.out = self.tmp.name

    def tearDown(self):
        self.tmp.cleanup()

    def test_any_pict_file_is_a_picture_without_sounds(self):
        # A bare PICT and a file whose 512-byte header isn't zero: no
        # fork, so nothing to look for sounds in.
        bare = build_pict(320, 200, [1] * 64000, clut=CLUT)
        named = bytearray(build_pict(320, 200, [1] * 64000, clut=CLUT,
                                     file=True))
        named[:16] = b"Photoshop PICT  "
        for i, d in enumerate((bare, bytes(named))):
            out = os.path.join(self.out, str(i))
            m = emit_mac(d, out)
            self.assertEqual([c["name"] for c in m["chunks"]], ["PICT"])
            self.assertNotIn("sounds", m)

    def test_a_backdrop_becomes_an_indexed_png(self):
        px = [1 if (x + y) % 2 else 2 for y in range(200) for x in range(320)]
        m = emit_mac(build_pict(320, 200, px, clut=CLUT, file=True), self.out)
        (rec,) = m["chunks"]
        self.assertEqual((rec["image"], rec["w"], rec["h"], rec["resId"]),
                         ("images/PICT.png", 320, 200, None))
        png = os.path.join(self.out, rec["image"])
        # What core/data/azpack.ts's decodeIndexedPng reads: 8-bit,
        # palette (color type 3), not interlaced.
        self.assertEqual(png_header(png), (320, 200, 8, 3, 0))
        # White is index 0; the colors follow in first-seen order: the
        # first pixel's (value 2) is index 1.
        self.assertEqual(png_indices(png, 320, 200)[:4], bytes([1, 2, 1, 2]))

    def test_a_gravel_fork_keeps_its_catalog_picture_raw(self):
        m = emit_mac(gravel_fork(with_sound=True), self.out)
        self.assertEqual([(c["name"], "image" in c) for c in m["chunks"]],
                         [("BAPC 4020", True), ("BADP 4020", False)])
        self.assertEqual(png_indices(os.path.join(self.out,
                                                  "images/BAPC_4020.png"),
                                     400, 60)[:400], bytes(400))
        self.assertEqual([s["name"] for s in m["sounds"]], ["crunch"])
        with open(os.path.join(self.out, "manifest.json"), encoding="utf-8") as f:
            self.assertEqual(json.load(f), m)

    def test_refuses_files_without_pictures(self):
        with self.assertRaises(ValueError):
            emit_mac(b"not a picture", self.out)

    def test_shows_what_the_app_shows(self):
        # A gravel fork's other pictures stay raw, even a backdrop-sized
        # one: the app takes only its strip.
        types = {b"Grvl": [(4020, None, 0, bytes([0, 53, 0, 52, 0, 0, 0, 0]))],
                 b"BAPC": [(4020, None, 0, strip())],
                 b"PICT": [(128, None, 0, build_pict(320, 200, [1] * 64000,
                                                     clut=CLUT))]}
        m = emit_mac(wrap_appledouble(build_rsrc(types)), self.out)
        self.assertEqual([c["name"] for c in m["chunks"] if "image" in c],
                         ["BAPC 4020"])

    def test_refuses_pictures_the_app_refuses(self):
        # A strip under 100 pixels tall outside a gravel fork, and icons:
        # the app turns both files away, so no bundle either.
        for i, d in enumerate((build_pict(640, 60, [1] * 38400, clut=CLUT),
                               build_pict(64, 48, [1] * 3072, clut=CLUT))):
            with self.assertRaises(ValueError):
                emit_mac(d, os.path.join(self.out, str(i)))


class TestAzpackCli(unittest.TestCase):
    def test_takes_a_pict_and_a_fork(self):
        with tempfile.TemporaryDirectory() as tmp:
            src = []
            for name, data in (("Reef.pct", build_pict(320, 200, [1] * 64000,
                                                       clut=CLUT, file=True)),
                               ("._Pebbles", gravel_fork())):
                src.append(os.path.join(tmp, name))
                with open(src[-1], "wb") as f:
                    f.write(data)
            out = io.StringIO()
            with contextlib.redirect_stdout(out):
                rc = azpack.main(src + ["-o", os.path.join(tmp, "out")])
            self.assertEqual(rc, 0)
            self.assertIn("1 pictures", out.getvalue())
            # The companion's bundle isn't hidden behind its "._".
            for name in ("Reef", "Pebbles"):
                self.assertTrue(os.path.exists(os.path.join(
                    tmp, "out", name, "manifest.json")))


    def test_inputs_with_one_name_get_their_own_bundles(self):
        # A Mac file and its AppleDouble companion both name "Reef".
        with tempfile.TemporaryDirectory() as tmp:
            src = []
            for name, data in (("Reef.pct", build_pict(320, 200, [1] * 64000,
                                                       clut=CLUT, file=True)),
                               ("._Reef.pct", gravel_fork())):
                src.append(os.path.join(tmp, name))
                with open(src[-1], "wb") as f:
                    f.write(data)
            out = os.path.join(tmp, "out")
            with contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(azpack.main(src + ["-o", out]), 0)
            self.assertEqual(sorted(os.listdir(out)), ["Reef", "Reef-2"])


class TestArchiveEntries(unittest.TestCase):
    ITEM = "aquazonewithguppiesandaddons"
    SEVEN_Z = "Missing addons Aquazone.7z"
    FOLDER = "Spare interesting things/Misc Macintosh files/"

    def setUp(self):
        tools.fetch._EMITTED.clear()
        self.tmp = tempfile.TemporaryDirectory()
        self.out = os.path.join(self.tmp.name, "packs")

    def tearDown(self):
        self.tmp.cleanup()

    def listing(self, *names):
        """The archive view's rows: each entry under the folder the
        listing gets wrong, its whole path in one encoded segment."""
        from urllib.parse import quote
        rows = "".join(
            f'<tr><td><a href="//archive.org/download/{self.ITEM}/'
            f'{quote(self.SEVEN_Z)}/{quote("addons Aquazone/" + self.FOLDER + n, safe="")}">'
            f"{n}</a></td></tr>\n" for n in names)
        return f"<table>{rows}</table>".encode()

    def serve(self, files):
        """A stand-in for fetch.py's _get, keyed by entry name."""
        from urllib.parse import unquote
        calls = []

        def fake_get(url, out=None, max_bytes=None):
            calls.append(url)
            if url.endswith(".7z/"):
                body = self.listing(*files)
            else:
                body = files[unquote(url).rsplit("/", 1)[1]]
            if out is None:
                return body
            with open(out, "wb") as f:
                f.write(body)
        return calls, mock.patch.object(tools.fetch, "_get", fake_get)

    def test_lists_entries_under_the_stored_folder(self):
        _, patch = self.serve({"ë€": b"x", "._星雲- nebula": b"y"})
        with patch:
            names = tools.fetch._archive_entries(self.ITEM, self.SEVEN_Z)
        self.assertEqual(names, ["Missing addons Aquazone/" + self.FOLDER + "ë€",
                                 "Missing addons Aquazone/" + self.FOLDER
                                 + "._星雲- nebula"])

    def test_emits_mac_bundles_under_readable_names(self):
        calls, patch = self.serve({
            "ë€": build_pict(320, 200, [1] * 64000, clut=CLUT, file=True),
            "._星雲- nebula": gravel_fork(),
            "GRAVEL1.sit": b"StuffIt (c)1997-",
        })
        err = io.StringIO()
        with patch, contextlib.redirect_stdout(io.StringIO()), \
                contextlib.redirect_stderr(err):
            made, failed = tools.fetch.fetch_entries(
                self.ITEM, self.SEVEN_Z, self.out,
                tools.fetch.re.compile("Misc Macintosh"),
                os.path.join(self.tmp.name, "dl"))
        self.assertEqual(failed, 0)
        self.assertEqual(sorted(os.path.basename(p) for p in made),
                         ["星雲- nebula.azpack", "苔.azpack"])
        # Entries are fetched where archive.org stores them.
        self.assertTrue(all("Missing%20addons%20Aquazone%2F" in u
                            for u in calls[1:]))

    def test_reads_links_as_the_app_does(self):
        # Absolute, page-relative and query links count; links off
        # archive.org, over http or outside the archive don't.
        from urllib.parse import quote
        entry = quote("Missing addons Aquazone/" + self.FOLDER, safe="")
        base = f"/download/{self.ITEM}/{quote(self.SEVEN_Z)}/"
        page = "".join(f'<a href="{h}">x</a>' for h in (
            f"https://archive.org{base}{entry}a",
            f"{entry}b",
            f"//archive.org{base}{entry}c?download=1",
            f"//archive.org{base}{entry}c",
            f"https://example.com{base}{entry}d",
            f"http://archive.org{base}{entry}e",
            f"//archive.org/download/{self.ITEM}/other.zip/f",
        ))
        with mock.patch.object(tools.fetch, "_get",
                               lambda url, out=None, max_bytes=None:
                               page.encode()):
            names = tools.fetch._archive_entries(self.ITEM, self.SEVEN_Z)
        self.assertEqual([n.rsplit("/", 1)[1] for n in names],
                         ["a", "b", "c"])

    def test_a_picture_that_fails_to_emit_counts_as_failed(self):
        # Sniffs as a PICT, decodes to nothing: an error, not a skip.
        broken = build_pict(320, 200, [1] * 64000, clut=CLUT, file=True)[:600]
        _, patch = self.serve({"ë€": broken})
        with patch, contextlib.redirect_stdout(io.StringIO()), \
                contextlib.redirect_stderr(io.StringIO()):
            made, failed = tools.fetch.fetch_entries(
                self.ITEM, self.SEVEN_Z, self.out,
                tools.fetch.re.compile(""), os.path.join(self.tmp.name, "dl"))
        self.assertEqual((made, failed), ([], 1))

    def test_entries_need_an_archive(self):
        # Both fetches are stubbed: without the check, main would start
        # the default item's whole download.
        with mock.patch.object(tools.fetch, "fetch", return_value=([], 0)), \
                mock.patch.object(tools.fetch, "fetch_entries",
                                  return_value=([], 0)), \
                contextlib.redirect_stderr(io.StringIO()), \
                self.assertRaises(SystemExit):
            tools.fetch.main(["--entries", "Misc"])

    def test_an_empty_answer_fails_and_is_not_kept(self):
        _, patch = self.serve({"ë€": b""})
        dl = os.path.join(self.tmp.name, "dl")
        with patch, contextlib.redirect_stdout(io.StringIO()), \
                contextlib.redirect_stderr(io.StringIO()):
            made, failed = tools.fetch.fetch_entries(
                self.ITEM, self.SEVEN_Z, self.out,
                tools.fetch.re.compile(""), dl)
        self.assertEqual((made, failed), ([], 1))
        self.assertEqual(os.listdir(dl), [])


if __name__ == "__main__":
    unittest.main()
