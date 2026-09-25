"""`finsical --smoke-test`: start the real app on a throwaway profile,
check that the tank, every client window, the relay between them and a
menu action work, and quit the normal way. Used by CI under xvfb-run.

Import only after app.py has chosen the GDK backend.
"""

from __future__ import annotations

import enum
from typing import Any, Optional

from gi.repository import GLib

from . import logic
from .clients import ClientWindow
from .shell import FinsicalApp, Observer

OVERALL_TIMEOUT_S = 90
STATS_POLL_MS = 250
# Stats renders its rows only once a state push relayed from the tank
# arrived, so rows prove the relay both ways (hello out, state back).
STATS_ROWS_SCRIPT = "document.querySelector('#srows')?.childElementCount > 0"


class Step(enum.Enum):
    # (description, timeout in seconds)
    TANK_STATE = (
        "the tank posts its first state (scheme, script, handler)",
        30,
    )
    CLIENTS = ("every client window says hello and reports its fold state", 30)
    STATS_ROWS = ("Tank Stats renders a state relayed from the tank", 20)
    MENU_CALL = ("the menu's Pause Simulation reaches the tank and back", 10)
    PICTURE = ("the menu's Take a Picture hands the shell a PNG", 15)
    QUIT = ("quitting saves through the normal quit sequence", 10)

    @property
    def description(self) -> str:
        return self.value[0]

    @property
    def timeout_s(self) -> int:
        return self.value[1]


class SmokeTest(Observer):
    def __init__(self) -> None:
        self.failure: Optional[str] = None
        self.passed = False
        self._app: Optional[FinsicalApp] = None
        self._step: Optional[Step] = None
        self._step_timer = 0
        self._hello: set[str] = set()
        self._fold_reported: set[str] = set()
        self._want_paused = True

    # -- Observer ------------------------------------------------------------

    def started(self, app: FinsicalApp) -> None:
        self._app = app
        GLib.timeout_add_seconds(OVERALL_TIMEOUT_S, self._overall_timeout)
        self._begin(Step.TANK_STATE)

    def tank_posted(self, msg: Any) -> None:
        if not isinstance(msg, dict) or msg.get("op") != "state":
            return
        assert self._app is not None
        if self._step is Step.TANK_STATE:
            self._begin(Step.CLIENTS)
            for spec in logic.CLIENT_SPECS:
                self._app.show_client(spec.name)
        elif (
            self._step is Step.MENU_CALL
            and msg.get("paused") is self._want_paused
        ):
            # Paused, then resumed: the profile ends as it began.
            if self._want_paused:
                self._want_paused = False
                self._app.activate_action("pause", None)
                return
            self._begin(Step.PICTURE)
            self._app.activate_action("picture", None)

    def picture_offered(self, name: str, png: bytes) -> bool:
        if self._step is not Step.PICTURE:
            return False
        assert self._app is not None
        # decode_picture already checked the PNG signature.
        if not name.endswith(".png"):
            self._fail(f"the picture's suggested name {name!r} is not .png")
            return True
        self._begin(Step.QUIT)
        self._app.quit_gracefully()
        return True  # no save dialog in a test run

    def client_posted(
        self, client: ClientWindow, handler: str, msg: Any
    ) -> None:
        if self._step is not Step.CLIENTS or not isinstance(msg, dict):
            return
        name = client.spec.name
        if handler == "finsical" and msg.get("op") == "hello":
            self._hello.add(name)
        elif handler == "osmium" and msg.get("op") == "winShade":
            self._fold_reported.add(name)
        everyone = {spec.name for spec in logic.CLIENT_SPECS}
        if self._hello >= everyone and self._fold_reported >= everyone:
            self._begin(Step.STATS_ROWS)
            GLib.timeout_add(STATS_POLL_MS, self._poll_stats)

    def quit_finished(self, via_timeout: bool) -> None:
        if self._step is not Step.QUIT:
            return
        if via_timeout:
            self._record_failure(
                "the tank did not answer before the quit timeout"
            )
            return
        self._end_step()
        self.passed = self.failure is None

    # -- steps ---------------------------------------------------------------

    def _begin(self, step: Step) -> None:
        self._end_step()
        self._step = step
        self._step_timer = GLib.timeout_add_seconds(
            step.timeout_s, self._step_timeout, step
        )

    def _end_step(self) -> None:
        if self._step is not None:
            print(f"smoke test: ok: {self._step.description}", flush=True)
        if self._step_timer:
            GLib.source_remove(self._step_timer)
            self._step_timer = 0

    def _poll_stats(self) -> bool:
        if self._step is not Step.STATS_ROWS:
            return GLib.SOURCE_REMOVE
        assert self._app is not None and self._app.clients is not None
        page = self._app.clients.windows[logic.STATS.name].page
        assert page is not None

        def done(value: Any, error: Optional[GLib.Error]) -> None:
            if self._step is not Step.STATS_ROWS:
                return
            if error is not None:
                self._fail(
                    f"evaluating the stats page failed: {error.message}"
                )
            elif (
                value is not None and value.is_boolean() and value.to_boolean()
            ):
                # The menu's own action, as a click on it runs it.
                self._begin(Step.MENU_CALL)
                self._want_paused = True
                assert self._app is not None
                self._app.activate_action("pause", None)
            else:
                GLib.timeout_add(STATS_POLL_MS, self._poll_stats)

        page.evaluate(STATS_ROWS_SCRIPT, done)
        return GLib.SOURCE_REMOVE

    def _step_timeout(self, step: Step) -> bool:
        self._step_timer = 0
        if self._step is step:
            self._fail(f"timed out after {step.timeout_s} s")
        return GLib.SOURCE_REMOVE

    def _overall_timeout(self) -> bool:
        if not self.passed and self.failure is None:
            self._fail(
                f"the whole test took longer than {OVERALL_TIMEOUT_S} s"
            )
        # Even the normal quit sequence may be what hangs.
        assert self._app is not None
        self._app.quit()
        return GLib.SOURCE_REMOVE

    def _record_failure(self, reason: str) -> None:
        if self.failure is None:
            step = self._step.description if self._step else "startup"
            self.failure = f"{step}: {reason}"

    def _fail(self, reason: str) -> None:
        self._record_failure(reason)
        assert self._app is not None
        self._app.quit_gracefully()
