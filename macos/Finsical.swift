import Cocoa
import WebKit

/// Serves the bundled web app (Resources/web/) on the `finsical` scheme so
/// fetch() works uniformly — including the optional bundled pack/ folder.
final class WebHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "finsical"
    private static let mime: [String: String] = [
        "html": "text/html", "js": "text/javascript", "json": "application/json",
        "png": "image/png", "svg": "image/svg+xml", "css": "text/css",
        "wasm": "application/wasm", "bin": "application/octet-stream",
    ]

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url, url.scheme == WebHandler.scheme,
              let root = Bundle.main.resourceURL?.appendingPathComponent("web") else {
            task.didFailWithError(URLError(.unsupportedURL))
            return
        }
        var path = url.path
        if path.isEmpty || path.hasSuffix("/") { path += "index.html" }
        let file = root.appendingPathComponent(path).standardizedFileURL
        // Stay inside the web root.
        guard file.path.hasPrefix(root.path + "/") else {
            task.didFailWithError(URLError(.fileDoesNotExist))
            return
        }
        do {
            let data = try Data(contentsOf: file)
            let ext = file.pathExtension.lowercased()
            let res = URLResponse(url: url, mimeType: WebHandler.mime[ext] ?? "application/octet-stream",
                                  expectedContentLength: data.count,
                                  textEncodingName: "utf-8")
            task.didReceive(res)
            task.didReceive(data)
            task.didFinish()
        } catch {
            task.didFailWithError(error)
        }
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}

/// Thin strip at the top edge that drags the window. The traffic-light
/// buttons render above it (titlebar layer), so they stay clickable.
final class DragStrip: NSView {
    override func mouseDown(with event: NSEvent) {
        window?.performDrag(with: event)
        // Dragging leaves first responder off the webview (bare keys
        // like F/C would go dead) — hand it back to the page.
        window?.makeFirstResponder(superview)
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate, WKUIDelegate,
                         WKNavigationDelegate, WKScriptMessageHandler,
                         NSWindowDelegate {
    private var window: NSWindow!
    private var webView: WKWebView!
    private var panelWindow: NSWindow?
    private var panelView: WKWebView?
    private var prefsWindow: NSWindow?
    private var prefsView: WKWebView?

    private func makeWebConfig() -> WKWebViewConfiguration {
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(WebHandler(), forURLScheme: WebHandler.scheme)
        // "finsical" posts are relayed to the sibling webview (bus.ts).
        config.userContentController.add(self, name: "finsical")
        return config
    }

    /// The panel window hosts the tank overview and the add-on browser —
    /// either would be squeezed inside the small tank window.
    @objc func openImport() { showPanel("addons") }
    @objc func openOverview() { showPanel("overview") }

    private func showPanel(_ view: String) {
        // view lands in both the URL hash and a JS string literal below —
        // never let an unvalidated value through.
        precondition(["addons", "overview"].contains(view),
                     "unknown panel view: \(view)")
        if panelWindow == nil {
            let pv = WKWebView(frame: .init(x: 0, y: 0, width: 680, height: 520),
                               configuration: makeWebConfig())
            pv.uiDelegate = self
            pv.navigationDelegate = self
            let w = NSWindow(
                contentRect: pv.frame,
                styleMask: [.titled, .closable, .miniaturizable, .resizable],
                backing: .buffered, defer: false)
            w.title = "Finsical"
            w.minSize = NSSize(width: 420, height: 360)
            w.contentView = pv
            w.isReleasedWhenClosed = false // reopen reuses the window
            w.initialFirstResponder = pv
            w.center()
            panelWindow = w
            panelView = pv
            pv.load(URLRequest(
                url: URL(string: "finsical://app/panel.html#\(view)")!))
        } else if let pv = panelView, pv.isLoading {
            // Still loading: window.panelUI doesn't exist yet — reload
            // with the requested hash instead of silently no-op'ing.
            pv.load(URLRequest(
                url: URL(string: "finsical://app/panel.html#\(view)")!))
        } else {
            panelView?.evaluateJavaScript(
                "if (window.panelUI) { window.panelUI.show('\(view)') } " +
                "else { throw new Error('panelUI missing') }") { [weak self] _, e in
                guard let e else { return }
                NSLog("Finsical: panel view switch failed: \(e)")
                // Page loaded but panelUI is gone (script failed) —
                // reload lands on the requested tab via the hash.
                if let u = URL(string: "finsical://app/panel.html#\(view)") {
                    self?.panelView?.load(URLRequest(url: u))
                }
            }
        }
        panelWindow?.makeKeyAndOrderFront(nil)
    }

    /// Preferences window — CRT effect controls (web/prefs.ts). Like
    /// the panel it only ever talks to the tank page over the bus.
    @objc func openPrefs() {
        if prefsWindow == nil {
            let pv = WKWebView(frame: .init(x: 0, y: 0, width: 440, height: 560),
                               configuration: makeWebConfig())
            pv.uiDelegate = self
            pv.navigationDelegate = self
            let w = NSWindow(
                contentRect: pv.frame,
                styleMask: [.titled, .closable, .miniaturizable, .resizable],
                backing: .buffered, defer: false)
            w.title = "Finsical Preferences"
            w.minSize = NSSize(width: 380, height: 420)
            w.contentView = pv
            w.isReleasedWhenClosed = false // reopen reuses the window
            w.initialFirstResponder = pv
            w.center()
            prefsWindow = w
            prefsView = pv
            pv.load(URLRequest(
                url: URL(string: "finsical://app/prefs.html")!))
        }
        prefsWindow?.makeKeyAndOrderFront(nil)
    }

    /// Bus relay: posts from a client window (panel, prefs) go to the
    /// tank page, which owns all state; the tank's posts fan out to
    /// every open client window (web/bus.ts registers window.__bus).
    func userContentController(_ ucc: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        // Window-close intents are handled natively — JS can't close a
        // window it didn't open. Each is honored only from its own view.
        if let body = message.body as? [String: Any] {
            if body["op"] as? String == "closePanel",
               message.webView === panelView {
                panelWindow?.close()
                return
            }
            if body["op"] as? String == "closePrefs",
               message.webView === prefsView {
                prefsWindow?.close()
                return
            }
        }
        guard let data = try? JSONSerialization.data(
                  withJSONObject: message.body),
              let text = String(data: data, encoding: .utf8) else { return }
        let dests: [WKWebView] = message.webView === webView
            ? [panelView, prefsView].compactMap { $0 }
            : [webView]
        if dests.isEmpty { return } // no client windows open
        // __bus is only registered once the page's script ran — surface
        // drops instead of silently losing the message.
        // U+2028/29 are legal raw inside JSON strings but terminate JS
        // source lines — escape them so the splice stays parseable.
        let js = text.replacingOccurrences(of: "\u{2028}", with: "\\u2028")
                     .replacingOccurrences(of: "\u{2029}", with: "\\u2029")
        for dest in dests {
            dest.evaluateJavaScript(
                "window.__bus ? (window.__bus(\(js)), undefined) : 'dropped'") {
                result, error in
                if let error {
                    NSLog("Finsical: bus relay failed: \(error.localizedDescription)")
                } else if result as? String == "dropped" {
                    NSLog("Finsical: bus relay dropped — destination page not ready")
                }
            }
        }
    }

    /// Closing the tank quits the app even if the panel is still open.
    func windowWillClose(_ note: Notification) {
        if note.object as? NSWindow === window { NSApp.terminate(nil) }
    }

    @objc func feedFish() {
        let js = "window.finsical?.feedFish ? window.finsical.feedFish()" +
                 " : (() => { throw new Error('window.finsical.feedFish missing') })()"
        webView?.evaluateJavaScript(js) { _, error in
            if let error { NSLog("Finsical: feedFish JS failed: \(error.localizedDescription)") }
        }
    }

    @objc func toggleCrt() {
        let js = "window.finsical?.toggleCrt ? window.finsical.toggleCrt()" +
                 " : (() => { throw new Error('window.finsical.toggleCrt missing') })()"
        webView?.evaluateJavaScript(js) { _, error in
            if let error { NSLog("Finsical: toggleCrt JS failed: \(error.localizedDescription)") }
        }
    }

    @objc func supportArchive() {
        if let url = URL(string: "https://archive.org/donate") {
            NSWorkspace.shared.open(url)
        }
    }

    /// Keep the aquarium on screen: hand any top-level http(s) navigation
    /// to the default browser instead of replacing the app's content.
    func webView(_ webView: WKWebView,
                 decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if action.targetFrame?.isMainFrame == true,
           let url = action.request.url,
           url.scheme == "http" || url.scheme == "https" {
            if !NSWorkspace.shared.open(url) {
                NSLog("Finsical: failed to hand off URL to browser: \(url)")
            }
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }

    /// target=_blank links (the donate link) have no host view; open them
    /// in the default browser instead.
    func webView(_ webView: WKWebView,
                 createWebViewWith configuration: WKWebViewConfiguration,
                 for action: WKNavigationAction,
                 windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = action.request.url, url.scheme == "http" || url.scheme == "https" {
            NSWorkspace.shared.open(url)
        }
        return nil
    }

    func applicationDidFinishLaunching(_ note: Notification) {
        webView = WKWebView(frame: .init(x: 0, y: 0, width: 640, height: 400),
                            configuration: makeWebConfig())
        webView.uiDelegate = self
        webView.navigationDelegate = self

        window = NSWindow(
            contentRect: webView.frame,
            styleMask: [.titled, .closable, .miniaturizable, .resizable,
                        .fullSizeContentView],
            backing: .buffered, defer: false)
        window.title = "Finsical"
        window.titleVisibility = .hidden          // no title text
        window.titlebarAppearsTransparent = true  // no grey bar — tank fills it
        window.level = .floating                    // always on top
        window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        window.contentAspectRatio = NSSize(width: 320, height: 200)
        window.contentView = webView
        window.delegate = self
        window.initialFirstResponder = webView // bare keys (F/C) hit the page
        // No traffic lights on the tank — the buttons are pointless for a
        // floating window, and everything lives in the menu. The behaviors
        // stay: ⌘M still minimizes, edges still resize, menu zoom works.
        window.standardWindowButton(.closeButton)?.isHidden = true
        window.standardWindowButton(.miniaturizeButton)?.isHidden = true
        window.standardWindowButton(.zoomButton)?.isHidden = true

        let strip = DragStrip()
        strip.translatesAutoresizingMaskIntoConstraints = false
        webView.addSubview(strip)
        NSLayoutConstraint.activate([
            strip.topAnchor.constraint(equalTo: webView.topAnchor),
            strip.leadingAnchor.constraint(equalTo: webView.leadingAnchor),
            strip.trailingAnchor.constraint(equalTo: webView.trailingAnchor),
            strip.heightAnchor.constraint(equalToConstant: 22),
        ])

        window.center()
        window.makeKeyAndOrderFront(nil)

        webView.load(URLRequest(url: URL(string: "finsical://app/index.html")!))
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ app: NSApplication) -> Bool { true }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
let mainMenu = NSMenu()
let appItem = NSMenuItem()
mainMenu.addItem(appItem)
let appMenu = NSMenu()
appMenu.addItem(withTitle: "Preferences…",
                action: #selector(AppDelegate.openPrefs),
                keyEquivalent: ",")
appMenu.addItem(.separator())
appMenu.addItem(withTitle: "Quit Finsical",
                action: #selector(NSApplication.terminate(_:)),
                keyEquivalent: "q")
appItem.submenu = appMenu
let tankItem = NSMenuItem()
mainMenu.addItem(tankItem)
let tankMenu = NSMenu(title: "Tank")
tankMenu.addItem(withTitle: "Tank Overview",
                 action: #selector(AppDelegate.openOverview),
                 keyEquivalent: "o")
tankMenu.addItem(withTitle: "Import Add-ons…",
                 action: #selector(AppDelegate.openImport),
                 keyEquivalent: "i")
tankMenu.addItem(withTitle: "Feed Fish",
                 action: #selector(AppDelegate.feedFish),
                 keyEquivalent: "f")
tankMenu.addItem(withTitle: "Toggle CRT Effect",
                 action: #selector(AppDelegate.toggleCrt),
                 keyEquivalent: "r")
tankMenu.addItem(.separator())
tankMenu.addItem(withTitle: "Support the Internet Archive",
                 action: #selector(AppDelegate.supportArchive),
                 keyEquivalent: "")
tankItem.submenu = tankMenu
let editItem = NSMenuItem()
mainMenu.addItem(editItem)
let editMenu = NSMenu(title: "Edit")
editMenu.addItem(withTitle: "Cut", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
editMenu.addItem(withTitle: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
editMenu.addItem(withTitle: "Paste", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
editMenu.addItem(withTitle: "Select All", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
editItem.submenu = editMenu
let windowItem = NSMenuItem()
mainMenu.addItem(windowItem)
let windowMenu = NSMenu(title: "Window")
// nil target → responder chain → key window; covers tank and panel.
// Both windows carry .closable in their styleMask — hiding the buttons
// doesn't remove it — so performClose works and keeps the
// windowShouldClose veto path for any future window that needs it.
// Closing the tank quits the app (windowWillClose).
windowMenu.addItem(withTitle: "Close",
                   action: #selector(NSWindow.performClose(_:)),
                   keyEquivalent: "w")
windowMenu.addItem(withTitle: "Minimize",
                   action: #selector(NSWindow.performMiniaturize(_:)),
                   keyEquivalent: "m")
windowMenu.addItem(withTitle: "Zoom",
                   action: #selector(NSWindow.performZoom(_:)),
                   keyEquivalent: "")
windowItem.submenu = windowMenu
windowMenu.addItem(.separator())
windowMenu.addItem(withTitle: "Bring All to Front",
                   action: #selector(NSApplication.arrangeInFront(_:)),
                   keyEquivalent: "")
app.windowsMenu = windowMenu
app.mainMenu = mainMenu
app.activate(ignoringOtherApps: true)
app.run()
