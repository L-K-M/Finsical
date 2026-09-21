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

    /// The tank window's shape follows the selected machine case.
    /// Applied only when the id changes — state pushes every ~2s.
    private var machineId = ""
    private var machineVbW: CGFloat = 0
    private var machineVbH: CGFloat = 0
    private var machineShape: [(rect: CGRect, radius: CGFloat)] = []
    private func applyMachine(id: String, w: CGFloat, h: CGFloat,
                              shape: [(CGRect, CGFloat)]) {
        guard id != machineId, w > 0, h > 0 else { return }
        let old = machineVbW
        machineId = id
        machineVbW = w
        machineVbH = h
        machineShape = shape
        syncMask()
        window.contentAspectRatio = NSSize(width: w, height: h)
        window.contentMinSize = NSSize(width: w * 0.45, height: h * 0.45)
        if old <= 0 {
            // First apply: the launch frame is 320×200-aspect but the
            // machine's isn't — snap the frame to the case outline so
            // the bezel doesn't letterbox inside dead glass until the
            // user happens to resize.
            let f = window.frame
            let nw = f.height * w / h
            window.setFrame(NSRect(x: f.midX - nw / 2, y: f.minY,
                                   width: nw, height: f.height),
                            display: true, animate: false)
            return
        }
        // Keep the screen the same size across a case swap — scale the
        // window by the viewBox ratio, pinned to the top edge. The page
        // is full-bleed (fullSizeContentView), so frame == content.
        let f = window.frame
        let nw = f.width * (w / old)
        let nh = nw * h / w
        window.setFrame(NSRect(x: f.minX, y: f.maxY - nh,
                               width: nw, height: nh),
                        display: true, animate: true)
    }

    /// Clip the window's content to the case silhouette — a union of
    /// rounded rects in viewBox units, applied as a CAShapeLayer mask
    /// on the webview's layer. Unlike cornerRadius this handles
    /// irregular cases (stepped bases, protruding chins), and even if
    /// the webview's background ever paints (drawsBackground not
    /// honored), only the bezel shape can show. Scales with the
    /// viewBox like the SVG art does.
    private func syncMask() {
        guard machineVbW > 0, let layer = webView.layer else { return }
        let s = webView.frame.width / machineVbW
        guard s > 0, !machineShape.isEmpty else {
            layer.mask = nil
            return
        }
        // Shape coords are top-down (SVG viewBox); a layer's space
        // follows the view's isFlipped, which AppKit mirrors into
        // isGeometryFlipped for layer-backed views.
        let flipped = layer.isGeometryFlipped
        let path = CGMutablePath()
        for (rect, r) in machineShape {
            let ly = flipped ? rect.minY : machineVbH - rect.maxY
            path.addRoundedRect(
                in: CGRect(x: rect.minX * s, y: ly * s,
                           width: rect.width * s,
                           height: rect.height * s),
                cornerWidth: r * s, cornerHeight: r * s)
        }
        let mask = CAShapeLayer()
        mask.frame = CGRect(origin: .zero, size: layer.bounds.size)
        mask.path = path
        layer.mask = mask
    }

    func windowDidResize(_ note: Notification) {
        if note.object as? NSWindow === window { syncMask() }
    }

    /// A bezel mousedown asks for a window drag — synthesize the
    /// leftMouseDown performDrag expects, at the cursor's position.
    private func dragTank() {
        let w = window!
        let loc = w.convertPoint(fromScreen: NSEvent.mouseLocation)
        guard let ev = NSEvent.mouseEvent(with: .leftMouseDown,
            location: loc, modifierFlags: [], timestamp: 0,
            windowNumber: w.windowNumber, context: nil,
            eventNumber: 0, clickCount: 1, pressure: 0)
        else { return }
        w.performDrag(with: ev)
        // Same as DragStrip — hand first responder back to the page.
        w.makeFirstResponder(webView)
    }

    /// Bus relay: posts from a client window (panel, prefs) go to the
    /// tank page, which owns all state; the tank's posts fan out to
    /// every open client window (web/bus.ts registers window.__bus).
    func userContentController(_ ucc: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        // Window-close and window-drag intents are handled natively —
        // JS can't perform either itself. Each is honored only from
        // the view it's about.
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
            if body["op"] as? String == "dragWindow",
               message.webView === webView {
                dragTank()
                return
            }
            // Tank state carries the machine's viewBox aspect —
            // retune the frame to the case outline. Falls through:
            // clients still need the push.
            if body["op"] as? String == "state",
               message.webView === webView,
               let mc = body["machine"] as? [String: Any],
               let mid = mc["id"] as? String,
               let mw = (mc["w"] as? NSNumber)?.doubleValue,
               let mh = (mc["h"] as? NSNumber)?.doubleValue {
                var shape: [(CGRect, CGFloat)] = []
                if let raw = mc["shape"] as? [[String: Any]] {
                    shape = raw.compactMap { e in
                        guard let x = (e["x"] as? NSNumber)?.doubleValue,
                              let y = (e["y"] as? NSNumber)?.doubleValue,
                              let w = (e["w"] as? NSNumber)?.doubleValue,
                              let h = (e["h"] as? NSNumber)?.doubleValue
                        else { return nil }
                        let r = (e["r"] as? NSNumber)?.doubleValue ?? 0
                        return (CGRect(x: x, y: y, width: w, height: h),
                                CGFloat(r))
                    }
                }
                applyMachine(id: mid, w: CGFloat(mw), h: CGFloat(mh),
                             shape: shape)
            }
        }
        guard let data = try? JSONSerialization.data(
                  withJSONObject: message.body),
              let text = String(data: data, encoding: .utf8) else { return }
        // Closed windows keep their webview alive (reopen reuses it)
        // but have no need for pushes — skip them until they're shown.
        let clients = [panelView, prefsView].compactMap { $0 }
            .filter { $0.window?.isVisible == true }
        let dests: [WKWebView] = message.webView === webView
            ? clients
            : [webView]
        if dests.isEmpty { return } // no client windows open
        // __bus is only registered once the page's script ran — surface
        // drops instead of silently losing the message.
        // U+2028/29 are legal raw inside JSON strings but terminate JS
        // source lines — escape them so the splice stays parseable.
        let js = text.replacingOccurrences(of: "\u{2028}", with: "\\u2028")
                     .replacingOccurrences(of: "\u{2029}", with: "\\u2029")
        for dest in dests {
            let name = dest === webView ? "tank"
                     : dest === panelView ? "panel" : "prefs"
            dest.evaluateJavaScript(
                "window.__bus ? (window.__bus(\(js)), undefined) : 'dropped'") {
                result, error in
                if let error {
                    NSLog("Finsical: bus relay to \(name) failed: \(error.localizedDescription)")
                } else if result as? String == "dropped" {
                    NSLog("Finsical: bus relay to \(name) dropped — destination page not ready")
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
        // The webview must not paint behind the page — a transparent
        // html background means the machine case drawn in-page is the
        // only visible surface. Two levers: underPageBackgroundColor is
        // the public API (WKWebView fills transparent page regions with
        // it — defaults white, which is exactly the corner artifact);
        // drawsBackground is the longstanding SPI that stops any
        // backing paint entirely. Apply both; the respond-check guards
        // the KVC throw if the key ever vanishes.
        webView.underPageBackgroundColor = .clear
        if webView.responds(to: NSSelectorFromString("setDrawsBackground:")) {
            webView.setValue(false, forKey: "drawsBackground")
        }
        // Layer-backed so syncCornerRadius can clip the case silhouette.
        webView.wantsLayer = true

        window = NSWindow(
            contentRect: webView.frame,
            styleMask: [.titled, .closable, .miniaturizable, .resizable,
                        .fullSizeContentView],
            backing: .buffered, defer: false)
        window.title = "Finsical"
        window.titleVisibility = .hidden          // no title text
        window.titlebarAppearsTransparent = true  // no grey bar — tank fills it
        // The visible frame is the machine bezel inside the page. A
        // transparent, non-opaque window lets its rounded corners and
        // silhouette float free; the shadow follows the painted shape.
        window.isOpaque = false
        window.backgroundColor = .clear
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
