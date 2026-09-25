"""WebKit plumbing shared by every window: the finsical:// scheme over
the web root, one web context with persistent storage, and page views
with their message handlers, link policy and right-click menu.

Import only after app.py has chosen the GDK backend.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from typing import Any, Callable, Optional

from gi.repository import Gdk, Gio, GLib, Gtk, Soup, WebKit2

from . import logic

log = logic.log

# (json_text, parsed) for each message a page posts to a handler.
MessageHandler = Callable[[str, Any], None]
# (value, error) once an evaluated script finishes; exactly one is set.
ScriptDone = Callable[[Optional[Any], Optional[GLib.Error]], None]
MenuFactory = Callable[[], Gtk.Menu]

_REASON = {logic.HTTP_OK: "OK", logic.HTTP_NOT_FOUND: "Not Found"}
_WEB_SCHEMES = ("http", "https")
# WebKit's navigation items make no sense in an app window.
_NAVIGATION_ITEMS = frozenset(
    {
        WebKit2.ContextMenuAction.GO_BACK,
        WebKit2.ContextMenuAction.GO_FORWARD,
        WebKit2.ContextMenuAction.STOP,
        WebKit2.ContextMenuAction.RELOAD,
    }
)


@dataclass(frozen=True)
class Press:
    """A button press on a page view, replayable as a window drag."""

    button: int
    x_root: int
    y_root: int
    time: int


def open_in_browser(uri: str) -> None:
    """Hand a web link to the desktop's default browser, logging (not
    raising) a failure: the app keeps running either way."""

    def done(_source: Any, result: Gio.AsyncResult) -> None:
        try:
            Gio.AppInfo.launch_default_for_uri_finish(result)
        except GLib.Error as e:
            log.warning("could not open %s in the browser: %s", uri, e.message)

    Gio.AppInfo.launch_default_for_uri_async(uri, None, None, done)


class WebHost:
    """Owns the web context every page view shares, so all pages share
    one origin's storage (the add-ons page writes sounds the tank
    reads) and one scheme handler."""

    def __init__(
        self,
        root: logic.WebRoot,
        data_dir: str,
        cache_dir: str,
        console_to_stdout: bool,
    ) -> None:
        self._root = root
        self._console_to_stdout = console_to_stdout
        self._menu_factory: Optional[MenuFactory] = None
        manager = WebKit2.WebsiteDataManager(
            base_data_directory=data_dir, base_cache_directory=cache_dir
        )
        self._context = WebKit2.WebContext.new_with_website_data_manager(
            manager
        )
        self._context.register_uri_scheme(logic.SCHEME, self._serve)
        security = self._context.get_security_manager()
        # The page needs a secure context (crypto.subtle, storage) and
        # CORS fetches to archive.org from its finsical://app origin.
        security.register_uri_scheme_as_secure(logic.SCHEME)
        security.register_uri_scheme_as_cors_enabled(logic.SCHEME)

    def set_menu_factory(self, factory: MenuFactory) -> None:
        """The app menu a right-click outside a text field opens."""
        self._menu_factory = factory

    def create_view(self, handlers: dict[str, MessageHandler]) -> PageView:
        return PageView(self, handlers)

    def _build_view(
        self, manager: WebKit2.UserContentManager
    ) -> WebKit2.WebView:
        # Autoplay must be a construct-time policy: the settings flag
        # alone leaves AudioContext suspended until a click, and menu
        # actions (Feed Fish) arrive without a user gesture.
        view = WebKit2.WebView(
            web_context=self._context,
            user_content_manager=manager,
            website_policies=WebKit2.WebsitePolicies(
                autoplay=WebKit2.AutoplayPolicy.ALLOW
            ),
        )
        settings = view.get_settings()
        settings.set_enable_developer_extras(False)
        settings.set_enable_write_console_messages_to_stdout(
            self._console_to_stdout
        )
        # The page draws every visible pixel (the machine case, the Mac
        # OS 8 window); anything it leaves transparent stays so.
        view.set_background_color(Gdk.RGBA(0, 0, 0, 0))
        view.connect("decide-policy", self._on_decide_policy)
        view.connect("create", self._on_create)
        view.connect(
            "web-process-terminated",
            self._on_web_process_terminated,
            logic.CrashLimiter(),
        )
        return view

    def _on_web_process_terminated(
        self,
        view: WebKit2.WebView,
        reason: WebKit2.WebProcessTerminationReason,
        limiter: logic.CrashLimiter,
    ) -> None:
        """A crashed page leaves a floating window that paints and
        answers nothing: reload it (the tank restores its save), up to
        the limiter's cap, after a short delay (macOS
        webViewWebContentProcessDidTerminate)."""
        allowed = limiter.allow_reload(time.monotonic())
        log.warning(
            "web process for %s terminated (%s), %d in the last minute",
            view.get_uri(),
            reason.value_nick,
            limiter.recent,
        )
        if not allowed:
            log.warning("not reloading %s: it keeps crashing", view.get_uri())
            return

        def reload() -> bool:
            view.reload()
            return GLib.SOURCE_REMOVE

        GLib.timeout_add(logic.CRASH_RETRY_DELAY_MS, reload)

    def _popup_menu(
        self, view: WebKit2.WebView, event: Gdk.Event
    ) -> Optional[Gtk.Menu]:
        if self._menu_factory is None:
            return None
        menu = self._menu_factory()
        menu.attach_to_widget(view, None)
        menu.popup_at_pointer(event)
        return menu

    def _serve(self, request: WebKit2.URISchemeRequest) -> None:
        try:
            response = self._root.respond(request.get_path())
        except OSError as e:
            log.warning("cannot serve %s: %s", request.get_uri(), e)
            request.finish_error(
                GLib.Error.new_literal(
                    Gio.io_error_quark(), str(e), int(Gio.IOErrorEnum.FAILED)
                )
            )
            return

        stream = Gio.MemoryInputStream.new_from_bytes(
            GLib.Bytes.new(response.body)
        )
        reply = WebKit2.URISchemeResponse.new(stream, len(response.body))
        reply.set_status(response.status, _REASON.get(response.status))
        if response.content_type is not None:
            reply.set_content_type(response.content_type)
        headers = Soup.MessageHeaders.new(Soup.MessageHeadersType.RESPONSE)
        # Bundled files change between builds: a cached copy must not
        # bring back an old page after an upgrade.
        headers.append("Cache-Control", "no-store")
        reply.set_http_headers(headers)
        request.finish_with_response(reply)

    def _on_decide_policy(
        self,
        _view: WebKit2.WebView,
        decision: WebKit2.PolicyDecision,
        kind: WebKit2.PolicyDecisionType,
    ) -> bool:
        """Keep the app's pages in their windows: web links go to the
        browser, anything else that is not the app is refused. Every
        frame gets the same rule; the pages have no iframes."""
        if kind not in (
            WebKit2.PolicyDecisionType.NAVIGATION_ACTION,
            WebKit2.PolicyDecisionType.NEW_WINDOW_ACTION,
        ):
            return False
        uri = decision.get_navigation_action().get_request().get_uri()
        scheme = GLib.Uri.peek_scheme(uri)
        if (
            scheme == logic.SCHEME
            and kind == WebKit2.PolicyDecisionType.NAVIGATION_ACTION
        ):
            return False
        decision.ignore()
        if scheme in _WEB_SCHEMES:
            open_in_browser(uri)
        else:
            log.warning("refused navigation to %s", uri)
        return True

    def _on_create(
        self, _view: WebKit2.WebView, action: WebKit2.NavigationAction
    ) -> None:
        """window.open: the donate link (import.ts) opens with noopener,
        which arrives here rather than as a NEW_WINDOW decision. The app
        never opens a web view of its own this way."""
        uri = action.get_request().get_uri()
        if GLib.Uri.peek_scheme(uri) in _WEB_SCHEMES:
            open_in_browser(uri)
        else:
            log.warning("refused window.open(%s)", uri)
        return None


class PageView:
    """One page's web view. Each has its own content manager because
    WebKitGTK's message signal does not say which view posted; the
    handler closures here do. Handlers are registered before the page
    loads, since pages look for them while their script evaluates."""

    def __init__(
        self, host: WebHost, handlers: dict[str, MessageHandler]
    ) -> None:
        self._host = host
        self._press: Optional[Press] = None
        self._press_event: Optional[Gdk.Event] = None
        self._menu: Optional[Gtk.Menu] = None
        manager = WebKit2.UserContentManager()
        for name, handler in handlers.items():
            manager.connect(
                f"script-message-received::{name}",
                self._on_message,
                name,
                handler,
            )
            if not manager.register_script_message_handler(name):
                raise RuntimeError(
                    f"could not register message handler {name!r}"
                )
        self.view = host._build_view(manager)
        self.view.connect("button-press-event", self._on_button_press)
        self.view.connect("context-menu", self._on_context_menu)

    def load(self, uri: str) -> None:
        self.view.load_uri(uri)

    def evaluate(self, script: str, done: Optional[ScriptDone] = None) -> None:
        def finished(view: WebKit2.WebView, result: Gio.AsyncResult) -> None:
            try:
                value = view.evaluate_javascript_finish(result)
            except GLib.Error as e:
                if done is not None:
                    done(None, e)
                return
            if done is not None:
                done(value, None)

        self.view.evaluate_javascript(script, -1, None, None, None, finished)

    def begin_window_drag(self, begin: Callable[[Press], None]) -> None:
        """Start a window move or resize for a drag the page asked for
        (the case, a client's title bar or grow box).

        The request arrives as a script message outside any GDK event,
        so the drag replays the press that started it, and only while
        the button is still down: a press released by the time the
        message lands would otherwise drag with no button held.
        """
        press = self._press
        window = self.view.get_window()
        if (
            press is None
            or press.button != Gdk.BUTTON_PRIMARY
            or window is None
        ):
            return
        pointer = self.view.get_display().get_default_seat().get_pointer()
        _win, _x, _y, mask = window.get_device_position(pointer)
        if not mask & Gdk.ModifierType.BUTTON1_MASK:
            return
        begin(press)
        self._release_press()
        # The drag leaves focus off the page; its bare keys would go dead.
        self.view.grab_focus()

    def _release_press(self) -> None:
        """Hand the page the release of the press that began a window
        drag. The window manager (or GDK's own drag) takes the real
        release, and a page that never sees it takes the next press
        for a second button of the same one: a pointermove instead of
        a pointerdown, so the next click on a box is lost."""
        if self._press_event is None:
            return
        release = self._press_event.copy()
        release.type = Gdk.EventType.BUTTON_RELEASE
        release.button.state = (
            release.button.state | Gdk.ModifierType.BUTTON1_MASK
        )
        self.view.event(release)

    def _on_message(
        self,
        _manager: WebKit2.UserContentManager,
        result: WebKit2.JavascriptResult,
        name: str,
        handler: MessageHandler,
    ) -> None:
        text = result.get_js_value().to_json(0)
        if text is None:
            log.warning("ignoring a %s message with no JSON value", name)
            return
        try:
            parsed = json.loads(text)
        except ValueError as e:
            log.warning("ignoring a malformed %s message: %s", name, e)
            return
        handler(text, parsed)

    def _on_button_press(
        self, _view: WebKit2.WebView, event: Gdk.EventButton
    ) -> bool:
        if event.type == Gdk.EventType.BUTTON_PRESS:
            self._press = Press(
                event.button, int(event.x_root), int(event.y_root), event.time
            )
            # GTK's own copy (holding its window and device) to build
            # the release from.
            self._press_event = Gtk.get_current_event()
        return False  # the page still gets the press

    def _on_context_menu(
        self,
        view: WebKit2.WebView,
        menu: WebKit2.ContextMenu,
        event: Gdk.Event,
        hit: WebKit2.HitTestResult,
    ) -> bool:
        """Text fields keep WebKit's editing menu (cut, copy, paste in
        the Filter field); everywhere else opens the app menu. That
        menu is a Gtk.Menu rather than WebKit's own, which cannot show
        the keyboard shortcuts, and is rebuilt on every open so labels
        and check marks are current."""
        if hit.context_is_editable():
            for item in menu.get_items():
                if item.get_stock_action() in _NAVIGATION_ITEMS:
                    menu.remove(item)
            return False
        if self._menu is not None:
            self._menu.destroy()
        self._menu = self._host._popup_menu(view, event)
        return self._menu is not None
