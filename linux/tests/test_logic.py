"""Tests for the Linux shell's GTK-free logic. Run from the repository
root with: python3 -m unittest discover -s linux/tests -t linux
"""

import ast
import base64
import json
import os
import pathlib
import tempfile
import unittest

from finsical_shell import logic
from finsical_shell.logic import (
    BoxRect,
    ClientWindowState,
    Rect,
    Size,
    SizeStep,
    WindowPref,
)

LINUX_DIR = pathlib.Path(__file__).resolve().parent.parent


class TempDirTest(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        # WebRoot resolves symlinks, and macOS's temp directory is one
        # (/var -> /private/var); build.sh runs these tests there too.
        self.tmp = os.path.realpath(self._tmp.name)
        self.addCleanup(self._tmp.cleanup)

    def write(self, rel, data=b"x"):
        path = os.path.join(self.tmp, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            f.write(data)
        return path


class TestWebRoot(TempDirTest):
    def setUp(self):
        super().setUp()
        self.root_dir = os.path.join(self.tmp, "web")
        self.index = self.write("web/index.html", b"<html>")
        self.write("web/assets/case.png", b"png")
        self.write("web/my file.txt", b"spaced")
        self.write("secret.txt", b"secret")
        self.root = logic.WebRoot(self.root_dir)

    def test_empty_path_and_trailing_slash_serve_index(self):
        self.assertEqual(self.root.resolve_request(""), self.index)
        self.assertEqual(self.root.resolve_request("/"), self.index)
        self.assertEqual(
            self.root.resolve_request("/assets/"),
            os.path.join(self.root.path, "assets", "index.html"),
        )

    def test_plain_file(self):
        response = self.root.respond("/assets/case.png")
        self.assertEqual(
            (response.status, response.content_type, response.body),
            (200, "image/png", b"png"),
        )

    def test_percent_decoding(self):
        self.assertEqual(self.root.respond("/my%20file.txt").body, b"spaced")

    def test_traversal_stays_inside(self):
        for path in (
            "/../secret.txt",
            "/assets/../../secret.txt",
            "/a/../../../etc/passwd",
        ):
            with self.subTest(path=path):
                self.assertIsNone(self.root.resolve_request(path))
                self.assertEqual(self.root.respond(path).status, 404)

    def test_encoded_slash_is_rejected(self):
        for path in (
            "/assets/..%2f..%2fsecret.txt",
            "/assets%2Fcase.png",
            "/%2F",
        ):
            with self.subTest(path=path):
                self.assertIsNone(self.root.resolve_request(path))

    def test_nul_is_rejected(self):
        self.assertIsNone(self.root.resolve_request("/index.html%00.png"))
        self.assertIsNone(self.root.resolve_request("/index.html\0"))

    def test_invalid_utf8_is_rejected(self):
        self.assertIsNone(self.root.resolve_request("/%ff%fe"))

    def test_symlink_escape_is_rejected(self):
        os.symlink(
            os.path.join(self.tmp, "secret.txt"),
            os.path.join(self.root_dir, "link.txt"),
        )
        self.assertIsNone(self.root.resolve_request("/link.txt"))

    def test_symlink_inside_root_is_served(self):
        os.symlink("index.html", os.path.join(self.root_dir, "alias.html"))
        self.assertEqual(self.root.respond("/alias.html").body, b"<html>")

    def test_directory_and_missing_file_are_404(self):
        for path in ("/assets", "/missing.json", "/pack/manifest.json"):
            with self.subTest(path=path):
                response = self.root.respond(path)
                self.assertEqual((response.status, response.body), (404, b""))

    def test_root_itself_is_not_a_file(self):
        self.assertIsNone(self.root.resolve_request("/."))

    def test_asset_paths(self):
        self.assertEqual(
            self.root.resolve_asset("assets/case.png"),
            os.path.join(self.root.path, "assets", "case.png"),
        )
        for rel in (
            "",
            "/etc/passwd",
            "../secret.txt",
            "assets/../../secret.txt",
            "assets/x\0.png",
        ):
            with self.subTest(rel=rel):
                self.assertIsNone(self.root.resolve_asset(rel))
        os.symlink(
            os.path.join(self.tmp, "secret.txt"),
            os.path.join(self.root_dir, "assets", "evil.png"),
        )
        self.assertIsNone(self.root.resolve_asset("assets/evil.png"))


class TestContentType(unittest.TestCase):
    def test_macos_map_and_charset(self):
        cases = {
            "index.html": "text/html; charset=utf-8",
            "bundle.js": "text/javascript; charset=utf-8",
            "app.css": "text/css; charset=utf-8",
            "manifest.json": "application/json; charset=utf-8",
            "icon.svg": "image/svg+xml; charset=utf-8",
            "case.png": "image/png",
            "mod.wasm": "application/wasm",
            "chunk.bin": "application/octet-stream",
            "bubble.wav": "audio/wav",
            "CASE.PNG": "image/png",
            "notes.xyz": "application/octet-stream",
            "noext": "application/octet-stream",
        }
        for name, expected in cases.items():
            with self.subTest(name=name):
                self.assertEqual(logic.content_type(name), expected)


class TestFindWebRoot(TempDirTest):
    def test_installed_layout(self):
        self.write("share/web/index.html")
        self.assertEqual(
            logic.find_web_root(
                None, os.path.join(self.tmp, "share"), logic.Layout.INSTALLED
            ),
            os.path.realpath(os.path.join(self.tmp, "share", "web")),
        )

    def test_source_tree_layout(self):
        self.write("repo/dist/index.html")
        os.makedirs(os.path.join(self.tmp, "repo", "linux"))
        self.assertEqual(
            logic.find_web_root(
                None,
                os.path.join(self.tmp, "repo", "linux"),
                logic.Layout.SOURCE_TREE,
            ),
            os.path.realpath(os.path.join(self.tmp, "repo", "dist")),
        )

    def test_source_tree_ignores_installed_location(self):
        self.write("share/web/index.html")
        with self.assertRaises(logic.WebRootError) as cm:
            logic.find_web_root(
                None, os.path.join(self.tmp, "share"), logic.Layout.SOURCE_TREE
            )
        self.assertIn("npm run build", str(cm.exception))

    def test_environment_wins(self):
        self.write("share/web/index.html")
        self.write("custom/index.html")
        self.assertEqual(
            logic.find_web_root(
                os.path.join(self.tmp, "custom"),
                os.path.join(self.tmp, "share"),
                logic.Layout.INSTALLED,
            ),
            os.path.realpath(os.path.join(self.tmp, "custom")),
        )

    def test_invalid_environment_is_an_error_not_a_fallback(self):
        self.write("share/web/index.html")
        with self.assertRaises(logic.WebRootError) as cm:
            logic.find_web_root(
                os.path.join(self.tmp, "nowhere"),
                os.path.join(self.tmp, "share"),
                logic.Layout.INSTALLED,
            )
        self.assertIn(logic.WEB_ROOT_ENV, str(cm.exception))

    def test_missing_build(self):
        with self.assertRaises(logic.WebRootError):
            logic.find_web_root(None, self.tmp, logic.Layout.INSTALLED)

    def test_version(self):
        self.assertEqual(
            logic.read_version(self.tmp), logic.DEVELOPMENT_VERSION
        )
        self.write("version.txt", b"0.3.0\n")
        self.assertEqual(logic.read_version(self.tmp), "0.3.0")


class TestStores(TempDirTest):
    def path(self, name=logic.WINDOWS_FILE):
        return os.path.join(self.tmp, "config", "finsical", name)

    def test_frame_round_trip(self):
        frames = logic.FrameStore(logic.JsonStore(self.path()))
        frames.put("FinsicalTank", 310, 400, (12, 34))
        frames.put("FinsicalPrefs", 565, 457, None)
        self.assertTrue(frames.flush())
        again = logic.FrameStore(logic.JsonStore(self.path()))
        self.assertEqual(
            again.get("FinsicalTank"), logic.SavedFrame(310, 400, 12, 34)
        )
        self.assertEqual(
            again.get("FinsicalPrefs"), logic.SavedFrame(565, 457)
        )
        self.assertIsNone(again.get("FinsicalStats"))
        self.assertEqual(
            os.listdir(os.path.dirname(self.path())), [logic.WINDOWS_FILE]
        )

    def test_size_only_save_keeps_the_known_position(self):
        frames = logic.FrameStore(logic.JsonStore(self.path()))
        frames.put("FinsicalTank", 310, 400, (12, 34))
        frames.put("FinsicalTank", 400, 516, None)
        self.assertEqual(
            frames.get("FinsicalTank"), logic.SavedFrame(400, 516, 12, 34)
        )

    def test_corrupt_file_recovers_with_defaults(self):
        self.write(
            os.path.join("config", "finsical", logic.WINDOWS_FILE),
            b"{not json",
        )
        with self.assertLogs("finsical", "WARNING") as logs:
            frames = logic.FrameStore(logic.JsonStore(self.path()))
        self.assertIn("using defaults", logs.output[0])
        self.assertIsNone(frames.get("FinsicalTank"))
        frames.put("FinsicalTank", 100, 200, None)
        self.assertTrue(frames.flush())
        with open(self.path(), encoding="utf-8") as f:
            self.assertEqual(
                json.load(f), {"FinsicalTank": {"w": 100, "h": 200}}
            )

    def test_non_object_file_recovers(self):
        self.write(
            os.path.join("config", "finsical", logic.WINDOWS_FILE), b"[1, 2]"
        )
        with self.assertLogs("finsical", "WARNING"):
            store = logic.JsonStore(self.path())
        self.assertIsNone(store.get("anything"))

    def test_invalid_frames_are_ignored(self):
        store = logic.JsonStore(self.path())
        frames = logic.FrameStore(store)
        for key, value in {
            "a": {"w": 0, "h": 10},
            "b": {"w": 10},
            "c": "big",
            "d": {"w": True, "h": 10},
            "e": {"w": 1.5, "h": 2},
        }.items():
            store.set(key, value)
            with self.subTest(key=key):
                self.assertIsNone(frames.get(key))
        store.set("f", {"w": 10, "h": 20, "x": "left", "y": 3})
        self.assertEqual(frames.get("f"), logic.SavedFrame(10, 20))

    def test_failed_flush_reports_and_stays_pending(self):
        blocker = self.write("config", b"a file where a directory should be")
        store = logic.JsonStore(
            os.path.join(blocker, "finsical", logic.SETTINGS_FILE)
        )
        store.set("k", 1)
        with self.assertLogs("finsical", "WARNING"):
            self.assertFalse(store.flush())

    def test_unchanged_store_does_not_write(self):
        store = logic.JsonStore(self.path())
        self.assertTrue(store.flush())
        self.assertFalse(os.path.exists(self.path()))

    def test_settings_default_on(self):
        settings = logic.Settings(
            logic.JsonStore(self.path(logic.SETTINGS_FILE))
        )
        self.assertTrue(settings.get(WindowPref.FLOAT_ABOVE))
        self.assertTrue(settings.get(WindowPref.ALL_DESKTOPS))
        settings.set(WindowPref.FLOAT_ABOVE, False)
        settings.flush()
        again = logic.Settings(logic.JsonStore(self.path(logic.SETTINGS_FILE)))
        self.assertFalse(again.get(WindowPref.FLOAT_ABOVE))
        self.assertTrue(again.get(WindowPref.ALL_DESKTOPS))

    def test_settings_ignore_non_booleans(self):
        store = logic.JsonStore(self.path(logic.SETTINGS_FILE))
        store.set(WindowPref.ALL_DESKTOPS.value, "no")
        self.assertTrue(logic.Settings(store).get(WindowPref.ALL_DESKTOPS))


class TestGeometry(unittest.TestCase):
    AREA = Rect(0, 30, 1920, 1050)

    def test_beside_tank_right_fits(self):
        tank = Rect(100, 200, 310, 400)
        self.assertEqual(
            logic.beside_tank(tank, Size(521, 381), self.AREA), (422, 200)
        )

    def test_beside_tank_flips_left(self):
        tank = Rect(1500, 200, 310, 400)
        self.assertEqual(
            logic.beside_tank(tank, Size(521, 381), self.AREA), (967, 200)
        )

    def test_beside_tank_clamps_into_work_area(self):
        # Neither side fits a small screen: clamp x, keep the bottom on
        # screen, and never go above the work area's top.
        area = Rect(0, 30, 800, 570)
        self.assertEqual(
            logic.beside_tank(Rect(200, 400, 400, 300), Size(621, 441), area),
            (0, 159),
        )
        self.assertEqual(
            logic.beside_tank(Rect(200, 0, 100, 100), Size(300, 200), area),
            (312, 30),
        )
        self.assertEqual(
            logic.beside_tank(Rect(0, 0, 100, 100), Size(300, 900), area),
            (112, 30),
        )

    def test_first_machine_keeps_height_and_centre(self):
        frame = Rect(640, 340, 640, 400)
        new = logic.first_machine_frame(frame, 821, 1059)
        self.assertEqual(new, Rect(805, 340, 310, 400))
        self.assertAlmostEqual(
            new.x + new.w / 2, frame.x + frame.w / 2, delta=0.5
        )

    def test_case_swap_keeps_scale_and_top_left(self):
        frame = Rect(10, 20, 310, 400)
        new = logic.swapped_machine_frame(frame, 821, 320, 200)
        self.assertEqual(new, Rect(10, 20, 121, 76))
        back = logic.swapped_machine_frame(new, 320, 821, 1059)
        self.assertEqual((back.x, back.y), (10, 20))
        self.assertAlmostEqual(back.w, 310, delta=1)

    def test_tank_min_size(self):
        self.assertEqual(logic.tank_min_size(821, 1059), Size(206, 265))
        self.assertEqual(logic.tank_min_size(320, 200), Size(80, 50))

    def test_larger_and_smaller(self):
        aspect = 821 / 1059
        big = Size(1920, 1050)
        minimum = logic.tank_min_size(821, 1059)
        self.assertEqual(
            logic.stepped_tank_size(
                Size(310, 400), SizeStep.LARGER, aspect, minimum, big
            ),
            Size(388, 500),
        )
        self.assertEqual(
            logic.stepped_tank_size(
                Size(310, 400), SizeStep.SMALLER, aspect, minimum, big
            ),
            Size(248, 320),
        )

    def test_larger_clamps_to_the_work_area(self):
        aspect = 821 / 1059
        minimum = logic.tank_min_size(821, 1059)
        # Height-bound on a landscape screen.
        self.assertEqual(
            logic.stepped_tank_size(
                Size(700, 903),
                SizeStep.LARGER,
                aspect,
                minimum,
                Size(1920, 1050),
            ),
            Size(814, 1050),
        )
        # Width-bound for a wide machine.
        self.assertEqual(
            logic.stepped_tank_size(
                Size(1000, 625),
                SizeStep.LARGER,
                1.6,
                Size(80, 50),
                Size(1100, 2000),
            ),
            Size(1100, 688),
        )

    def test_smaller_clamps_to_the_minimum(self):
        aspect = 821 / 1059
        minimum = logic.tank_min_size(821, 1059)
        self.assertEqual(
            logic.stepped_tank_size(
                Size(220, 284),
                SizeStep.SMALLER,
                aspect,
                minimum,
                Size(1920, 1050),
            ),
            Size(206, 266),
        )

    def test_minimum_wins_on_a_tiny_monitor(self):
        size = logic.stepped_tank_size(
            Size(100, 100),
            SizeStep.LARGER,
            1.0,
            Size(200, 200),
            Size(150, 150),
        )
        self.assertEqual(size, Size(200, 200))

    def test_intersects_any(self):
        monitors = [Rect(0, 0, 1920, 1080), Rect(1920, 0, 1280, 1024)]
        self.assertTrue(
            logic.intersects_any(Rect(-100, -100, 150, 150), monitors)
        )
        self.assertTrue(
            logic.intersects_any(Rect(3000, 900, 400, 400), monitors)
        )
        self.assertFalse(
            logic.intersects_any(Rect(3300, 0, 100, 100), monitors)
        )
        self.assertFalse(
            logic.intersects_any(Rect(-100, 0, 100, 100), monitors)
        )

    def test_centered(self):
        self.assertEqual(
            logic.centered(Size(640, 400), Rect(0, 30, 1920, 1050)),
            Rect(640, 355, 640, 400),
        )


class TestClientWindowState(unittest.TestCase):
    FRAME = Rect(100, 50, 521, 381)

    def test_shade_and_unshade(self):
        state = ClientWindowState(logic.OVERVIEW)
        folded = state.shade(self.FRAME)
        self.assertEqual(folded, Rect(100, 50, 521, 23))
        self.assertTrue(state.shaded)
        self.assertEqual(state.hints(), logic.SizeHints(361, 23, None, None))
        self.assertEqual(state.unshade(folded), self.FRAME)
        self.assertFalse(state.shaded)
        self.assertEqual(state.hints(), logic.SizeHints(361, 201, None, None))

    def test_load_time_unshade_is_a_no_op(self):
        state = ClientWindowState(logic.OVERVIEW)
        self.assertIsNone(state.unshade(self.FRAME))
        self.assertFalse(state.shaded)

    def test_first_capture_wins(self):
        state = ClientWindowState(logic.OVERVIEW)
        folded = state.shade(self.FRAME)
        # A reload while folded re-sends the fold from the sliver.
        self.assertEqual(state.shade(folded), folded)
        self.assertEqual(state.unshade(folded).h, 381)

    def test_capture_is_at_least_the_minimum(self):
        state = ClientWindowState(logic.OVERVIEW)
        state.shade(Rect(0, 0, 521, 100))
        self.assertEqual(state.unshade(Rect(0, 0, 521, 23)).h, 201)
        fixed = ClientWindowState(logic.PREFS)
        fixed.shade(Rect(0, 0, 565, 23))
        self.assertEqual(fixed.unshade(Rect(0, 0, 565, 23)).h, 457)

    def test_fixed_window_hints(self):
        state = ClientWindowState(logic.PREFS)
        self.assertEqual(state.hints(), logic.SizeHints(565, 457, 565, 457))
        state.shade(Rect(0, 0, 565, 457))
        self.assertEqual(state.hints(), logic.SizeHints(565, 23, 565, 23))

    def test_zoom_toggles(self):
        state = ClientWindowState(logic.OVERVIEW)
        user = Rect(200, 100, 700, 600)
        standard = state.zoom(user, None)
        self.assertEqual(standard, Rect(200, 100, 521, 381))
        self.assertEqual(state.zoom(standard, None), user)
        # At standard with no user frame to go back to: nothing.
        self.assertIsNone(state.zoom(standard, None))

    def test_zoom_standard_frame_stays_in_work_area(self):
        state = ClientWindowState(logic.ADDONS)
        area = Rect(0, 30, 800, 570)
        self.assertEqual(
            state.zoom(Rect(700, 500, 450, 310), area),
            Rect(179, 159, 621, 441),
        )
        self.assertEqual(
            state.standard_frame(Rect(-50, 0, 450, 310), area),
            Rect(0, 30, 621, 441),
        )

    def test_zoom_ignored_when_shaded_or_fixed(self):
        state = ClientWindowState(logic.STATS)
        state.shade(Rect(0, 0, 400, 400))
        self.assertIsNone(state.zoom(Rect(0, 0, 400, 23), None))
        self.assertIsNone(
            ClientWindowState(logic.PREFS).zoom(Rect(0, 0, 565, 457), None)
        )

    def test_reopen_expands_a_window_closed_while_folded(self):
        state = ClientWindowState(logic.STATS)
        folded = state.shade(Rect(5, 6, 380, 640))
        self.assertEqual(state.reopen(folded), Rect(5, 6, 380, 640))
        self.assertFalse(state.shaded)
        self.assertIsNone(state.reopen(Rect(5, 6, 380, 640)))

    def test_reopen_grows_a_saved_sliver(self):
        state = ClientWindowState(logic.STATS)
        self.assertEqual(
            state.reopen(Rect(5, 6, 380, 23)), Rect(5, 6, 380, 640)
        )

    def test_folded_window_saves_its_expanded_frame(self):
        state = ClientWindowState(logic.OVERVIEW)
        folded = state.shade(self.FRAME)
        self.assertEqual(state.frame_to_save(folded), self.FRAME)
        self.assertEqual(
            ClientWindowState(logic.OVERVIEW).frame_to_save(self.FRAME),
            self.FRAME,
        )

    def test_specs_match_the_macos_shell(self):
        self.assertEqual(
            [
                (s.page, s.title, s.frame_key, s.size, s.min_size)
                for s in logic.CLIENT_SPECS
            ],
            [
                (
                    "prefs.html",
                    "Preferences",
                    "FinsicalPrefs",
                    Size(565, 457),
                    None,
                ),
                (
                    "overview.html",
                    "Tank Overview",
                    "FinsicalOverview",
                    Size(521, 381),
                    Size(361, 201),
                ),
                (
                    "addons.html",
                    "Import Add-ons",
                    "FinsicalAddons",
                    Size(621, 441),
                    Size(441, 301),
                ),
                (
                    "stats.html",
                    "Tank Stats",
                    "FinsicalStats",
                    Size(380, 640),
                    Size(340, 560),
                ),
            ],
        )
        self.assertEqual(logic.STATS.url, "finsical://app/stats.html")


class TestStatePushes(unittest.TestCase):
    PLUS = {
        "id": "plus",
        "w": 821,
        "h": 1059,
        "shape": [{"x": 0, "y": 0, "w": 821, "h": 1059, "r": 0}],
        "mask": "assets/macintosh-plus.png",
        "hole": {"x": 102, "y": 129, "w": 618, "h": 451, "r": 0},
    }

    def test_parse_machine(self):
        m = logic.parse_machine({"op": "state", "machine": self.PLUS})
        self.assertEqual(
            m,
            logic.Machine(
                "plus",
                821.0,
                1059.0,
                (BoxRect(0, 0, 821, 1059),),
                "assets/macintosh-plus.png",
                BoxRect(102, 129, 618, 451),
            ),
        )

    def test_bare_machine(self):
        m = logic.parse_machine(
            {
                "machine": {
                    "id": "bare",
                    "w": 320,
                    "h": 200,
                    "shape": [{"x": 0, "y": 0, "w": 320, "h": 200}],
                    "mask": None,
                    "hole": None,
                }
            }
        )
        self.assertEqual((m.mask, m.hole, len(m.shape)), (None, None, 1))

    def test_malformed_machines(self):
        for machine in (
            None,
            "plus",
            {"id": "x", "w": 0, "h": 10},
            {"id": 3, "w": 1, "h": 1},
            {"id": "x", "w": True, "h": 1},
            {"id": "x", "w": 1},
            {"id": "x", "w": float("inf"), "h": 1},
        ):
            with self.subTest(machine=machine):
                self.assertIsNone(logic.parse_machine({"machine": machine}))

    def test_machine_tolerates_bad_parts(self):
        raw = dict(
            self.PLUS,
            shape=[{"x": 0}, "rect", {"x": 1, "y": 2, "w": 3, "h": 4}],
            mask="",
            hole={"x": 1, "y": 2, "w": 3},
        )
        m = logic.parse_machine({"machine": raw})
        self.assertEqual(
            (m.shape, m.mask, m.hole), ((BoxRect(1, 2, 3, 4),), None, None)
        )

    def test_update_status(self):
        s = logic.TankStatus()
        s = logic.update_status(
            s,
            {
                "crt": {"on": True, "available": True},
                "lighting": {"mode": "clock"},
                "sound": {"muted": True},
                "paused": True,
            },
        )
        self.assertEqual(s, logic.TankStatus(True, True, True, True, True))
        s = logic.update_status(s, {"lighting": {"lamp": False}})
        self.assertEqual(s, logic.TankStatus(True, True, False, True, True))
        # Absent or malformed groups keep their values.
        self.assertEqual(
            logic.update_status(s, {"crt": "on", "paused": "yes"}), s
        )

    def test_pause_label(self):
        self.assertEqual(logic.pause_label(False), "Pause Simulation")
        self.assertEqual(logic.pause_label(True), "Resume Simulation")


class TestScripts(unittest.TestCase):
    def test_bus_script_escapes_line_separators(self):
        text = json.dumps({"op": "x", "s": "a b c"}, ensure_ascii=False)
        script = logic.bus_delivery_script(text)
        self.assertNotIn(" ", script)
        self.assertNotIn(" ", script)
        self.assertEqual(
            script,
            "window.__bus ? (window.__bus("
            '{"op": "x", "s": "a\\u2028b\\u2029c"}), undefined) : \'dropped\'',
        )

    def test_tank_call_script(self):
        # The whole script, as macos/Finsical.swift sends it: a partial
        # match once let a stray brace through.
        self.assertEqual(
            logic.tank_call_script("togglePause"),
            "window.finsical?.togglePause ? window.finsical.togglePause()"
            " : (() => { throw new Error("
            "'window.finsical.togglePause missing') })()",
        )
        with self.assertRaises(ValueError):
            logic.tank_call_script("alert")

    def test_scripts_have_balanced_brackets(self):
        scripts = [
            logic.tank_call_script(f) for f in sorted(logic.TANK_FUNCTIONS)
        ]
        scripts.append(logic.bus_delivery_script('{"op": "a", "s": "b"}'))
        pairs = {")": "(", "}": "{", "]": "["}
        for script in scripts:
            with self.subTest(script=script):
                stack = []
                for char in script:
                    if char in "({[":
                        stack.append(char)
                    elif char in pairs:
                        self.assertTrue(stack and stack.pop() == pairs[char])
                self.assertEqual(stack, [])


def grid(rows):
    """An alpha buffer from strings: '#' opaque, '.' clear, '+' 249."""
    values = {"#": 255, ".": 0, "+": 249, "=": 250}
    return (
        bytearray(values[c] for row in rows for c in row),
        len(rows[0]),
        len(rows),
    )


def render(alpha, width):
    names = {255: "#", 0: ".", 249: "+", 250: "="}
    return [
        "".join(names[v] for v in alpha[i : i + width])
        for i in range(0, len(alpha), width)
    ]


class TestInteriorFill(unittest.TestCase):
    def test_enclosed_gap_fills_and_edge_gaps_stay(self):
        alpha, w, h = grid(
            [
                "..#####..",
                "..#...#..",
                "..#####..",
                "..##.##..",
                ".........",
                "###...###",
                "#.#...#.#",
                "###...###",
            ]
        )
        logic.fill_interior(alpha, w, h)
        self.assertEqual(
            render(alpha, w),
            [
                "..#####..",
                "..#####..",
                "..#####..",
                "..##.##..",
                ".........",
                "###...###",
                "###...###",
                "###...###",
            ],
        )

    def test_diagonal_contact_does_not_connect(self):
        alpha, w, h = grid([".####", "#.###", "##.##", "#####"])
        logic.fill_interior(alpha, w, h)
        self.assertEqual(
            render(alpha, w), [".####", "#####", "#####", "#####"]
        )

    def test_threshold(self):
        # 249 is still clear enough to pass; 250 blocks.
        alpha, w, h = grid(["#+###", "#.#.#", "#####"])
        logic.fill_interior(alpha, w, h)
        self.assertEqual(render(alpha, w), ["#+###", "#.###", "#####"])
        alpha, w, h = grid(["#=###", "#.#.#", "#####"])
        logic.fill_interior(alpha, w, h)
        self.assertEqual(render(alpha, w), ["#####", "#####", "#####"])

    def test_winding_channel_reaches_the_border(self):
        alpha, w, h = grid(
            ["#######", "#.....#", "#.###.#", "#.#.#.#", "#.#.#..", "#######"]
        )
        logic.fill_interior(alpha, w, h)
        self.assertEqual(
            render(alpha, w),
            ["#######", "#.....#", "#.###.#", "#.###.#", "#.###..", "#######"],
        )

    def test_large_ring(self):
        w = h = 400
        alpha = bytearray(w * h)
        for y in range(50, 350):
            for x in range(50, 350):
                inside = 60 <= x < 340 and 60 <= y < 340
                alpha[y * w + x] = 0 if inside else 255
        logic.fill_interior(alpha, w, h)
        self.assertEqual(alpha[200 * w + 200], 255)
        self.assertEqual(alpha[10 * w + 10], 0)
        self.assertEqual(sum(1 for a in alpha if a == 255), 300 * 300)

    def test_size_mismatch(self):
        with self.assertRaises(ValueError):
            logic.fill_interior(bytearray(5), 2, 2)

    def test_fill_rect_opaque_clips(self):
        alpha, w, h = grid(["....", "....", "...."])
        logic.fill_rect_opaque(alpha, w, h, 2, -1, 9, 2)
        self.assertEqual(render(alpha, w), ["..##", "..##", "...."])

    def test_scaled_shape_rects(self):
        shape = (BoxRect(0, 0, 320, 200), BoxRect(10.5, 3, 0.1, 0))
        self.assertEqual(
            logic.scaled_shape_rects(shape, 0.5), [Rect(0, 0, 160, 100)]
        )


class TestTankFrames(unittest.TestCase):
    AREA = Rect(0, 30, 1920, 1050)

    def test_grabbable_needs_a_patch_not_a_sliver(self):
        areas = [self.AREA, Rect(1920, 0, 1280, 1024)]
        self.assertTrue(
            logic.grabbable_on_any(Rect(100, 100, 300, 400), areas)
        )
        # 1 px of the frame on screen is a lost window.
        self.assertFalse(
            logic.grabbable_on_any(Rect(-299, 100, 300, 400), areas)
        )
        # Exactly the minimum patch counts; one less does not.
        self.assertTrue(
            logic.grabbable_on_any(Rect(-236, 0, 300, 400), [self.AREA])
        )
        self.assertFalse(
            logic.grabbable_on_any(Rect(-237, 0, 300, 400), [self.AREA])
        )
        self.assertFalse(
            logic.grabbable_on_any(Rect(100, -370, 300, 400), [self.AREA])
        )
        self.assertFalse(logic.grabbable_on_any(Rect(0, 0, 300, 400), []))

    def test_clamp_to_visible_moves_but_never_resizes(self):
        area = self.AREA
        self.assertEqual(
            logic.clamp_to_visible(Rect(10, 900, 300, 400), area),
            Rect(10, 680, 300, 400),
        )
        self.assertEqual(
            logic.clamp_to_visible(Rect(-50, 0, 300, 400), area),
            Rect(0, 30, 300, 400),
        )
        self.assertEqual(
            logic.clamp_to_visible(Rect(1800, 100, 300, 400), area),
            Rect(1620, 100, 300, 400),
        )
        # Larger than the work area: pinned to its top-left.
        self.assertEqual(
            logic.clamp_to_visible(Rect(50, 90, 2000, 1200), area),
            Rect(0, 30, 2000, 1200),
        )
        inside = Rect(100, 100, 300, 400)
        self.assertEqual(logic.clamp_to_visible(inside, area), inside)

    def test_bare_tank_has_a_thin_drag_strip(self):
        self.assertEqual(logic.drag_strip_height("bare"), 8)
        self.assertEqual(logic.drag_strip_height("plus"), 22)
        self.assertEqual(logic.drag_strip_height(None), 22)


class TestPicture(unittest.TestCase):
    PNG = logic.PNG_SIGNATURE + b"rest of a png"

    def test_decodes_base64_png(self):
        encoded = base64.b64encode(self.PNG).decode("ascii")
        self.assertEqual(logic.decode_picture(encoded), self.PNG)

    def test_rejects_what_is_not_base64_png(self):
        self.assertIsNone(logic.decode_picture(None))
        self.assertIsNone(logic.decode_picture(42))
        self.assertIsNone(logic.decode_picture("not base64!"))
        gif = base64.b64encode(b"GIF89a....").decode("ascii")
        self.assertIsNone(logic.decode_picture(gif))
        self.assertIsNone(
            logic.decode_picture("A" * (logic.PICTURE_MAX_BYTES * 2))
        )

    def test_file_name_loses_directories(self):
        self.assertEqual(
            logic.picture_file_name("finsical-20260925-101010.png"),
            "finsical-20260925-101010.png",
        )
        self.assertEqual(
            logic.picture_file_name("../../etc/passwd"), "passwd"
        )
        self.assertEqual(logic.picture_file_name("a\\b.png"), "b.png")
        for bad in (None, "", "..", "dir/", 5):
            self.assertEqual(
                logic.picture_file_name(bad), logic.DEFAULT_PICTURE_NAME
            )

    def test_write_file_atomic(self):
        with tempfile.TemporaryDirectory() as d:
            path = os.path.join(d, "pic.png")
            logic.write_file_atomic(path, b"one", 0o644)
            logic.write_file_atomic(path, b"two", 0o644)
            with open(path, "rb") as f:
                self.assertEqual(f.read(), b"two")
            self.assertEqual(os.listdir(d), ["pic.png"])
            with self.assertRaises(OSError):
                logic.write_file_atomic(
                    os.path.join(d, "missing", "x.png"), b"x"
                )


class TestCrashLimiter(unittest.TestCase):
    def test_three_reloads_a_minute(self):
        limiter = logic.CrashLimiter()
        self.assertTrue(limiter.allow_reload(0))
        self.assertTrue(limiter.allow_reload(10))
        self.assertTrue(limiter.allow_reload(20))
        self.assertFalse(limiter.allow_reload(30))
        self.assertEqual(limiter.recent, 4)
        # Once the old crashes age out, reloads resume.
        self.assertTrue(limiter.allow_reload(85))
        self.assertEqual(limiter.recent, 2)


class TestTankBridge(unittest.TestCase):
    def test_every_tank_function_is_in_the_page_bridge(self):
        """The menu calls window.finsical.<fn> (web/main.ts
        finsicalBridge); a name the page dropped or renamed would only
        fail at run time."""
        main = (LINUX_DIR.parent / "web" / "main.ts").read_text("utf-8")
        start = main.index("const finsicalBridge = {")
        bridge = main[start : main.index("};", start)]
        for function in sorted(logic.TANK_FUNCTIONS):
            with self.subTest(function=function):
                self.assertRegex(bridge, rf"\b{function}\b")


class TestMenu(unittest.TestCase):
    def test_take_a_picture_is_in_the_menu(self):
        # macOS Tank ▸ Take a Picture, right after Pause.
        actions = [e and e.action for e in logic.APP_MENU]
        self.assertEqual(
            actions[actions.index("pause") + 1], "picture"
        )

    def test_actions_are_unique(self):
        actions = [e.action for e in logic.APP_MENU if e is not None]
        self.assertEqual(len(actions), len(set(actions)))

    def test_text_editing_keys_stay_free(self):
        accels = [
            a.lower()
            for e in logic.APP_MENU
            if e is not None
            for a in e.accels
        ]
        accels.append(logic.CLOSE_WINDOW_ACCEL.lower())
        for key in "acvxz":
            for mods in ("<control>", "<control><shift>"):
                self.assertNotIn(mods + key, accels)
        self.assertEqual(len(accels), len(set(accels)))


class TestSources(unittest.TestCase):
    def test_python_310_syntax(self):
        """Ubuntu 22.04 runs Python 3.10; CI does not."""
        sources = sorted((LINUX_DIR / "finsical_shell").glob("*.py"))
        sources.append(LINUX_DIR / "finsical")
        self.assertGreater(len(sources), 2)
        for path in sources:
            with self.subTest(path=path.name):
                ast.parse(
                    path.read_text(encoding="utf-8"),
                    str(path),
                    feature_version=(3, 10),
                )

    def test_logic_needs_no_gi(self):
        tree = ast.parse(
            (LINUX_DIR / "finsical_shell" / "logic.py").read_text(
                encoding="utf-8"
            )
        )
        imported = {
            alias.name.split(".")[0]
            for node in ast.walk(tree)
            if isinstance(node, ast.Import)
            for alias in node.names
        }
        imported |= {
            node.module.split(".")[0]
            for node in ast.walk(tree)
            if isinstance(node, ast.ImportFrom) and node.module
        }
        self.assertFalse(imported & {"gi", "cairo"})


if __name__ == "__main__":
    unittest.main()
