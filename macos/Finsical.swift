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
            let mime = WebHandler.mime[ext] ?? "application/octet-stream"
            // Bundled files change between builds — no-store so a cached
            // response can't resurrect an old page after a rebuild. The
            // charset keeps the utf-8 declaration the plain URLResponse
            // used to carry.
            let text = mime.hasPrefix("text/") || mime == "image/svg+xml"
                || mime == "application/json"
            let type = text ? mime + "; charset=utf-8" : mime
            guard let res = HTTPURLResponse(
                url: url, statusCode: 200, httpVersion: "HTTP/1.1",
                headerFields: ["Content-Type": type,
                               "Content-Length": String(data.count),
                               "Cache-Control": "no-store"]) else {
                task.didFailWithError(URLError(.badServerResponse))
                return
            }
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
    /// Saved window frames, under the keys Finsical has always used.
    private let frames = OsmiumFrameStore(prefix: "FinsicalFrame.")
    /// The client windows (Preferences, Tank Overview, Import Add-ons,
    /// Tank Stats) are Osmium UI windows: borderless, drawn entirely by
    /// their pages, whose boxes post window ops to the host's "osmium"
    /// message handler.
    private lazy var host = OsmiumWindowHost(
        frames: frames,
        configuration: { [unowned self] in self.makeWebConfig() },
        prepare: { [unowned self] v in
            v.uiDelegate = self
            v.navigationDelegate = self
        })
    private lazy var prefs = host.add(OsmiumWindowSpec(
        url: page("prefs.html"), title: "Preferences",
        frameKey: "FinsicalPrefs", size: NSSize(width: 565, height: 457)))
    private lazy var overview = host.add(OsmiumWindowSpec(
        url: page("overview.html"), title: "Tank Overview",
        frameKey: "FinsicalOverview", size: NSSize(width: 521, height: 381),
        minSize: NSSize(width: 361, height: 201)))
    private lazy var addons = host.add(OsmiumWindowSpec(
        url: page("addons.html"), title: "Import Add-ons",
        frameKey: "FinsicalAddons", size: NSSize(width: 621, height: 441),
        minSize: NSSize(width: 441, height: 301)))
    /// The stats page clips rather than scrolls (Mac OS 8 windows
    /// without scroll bars), so its minimum keeps every field and two
    /// care hints visible.
    private lazy var stats = host.add(OsmiumWindowSpec(
        url: page("stats.html"), title: "Tank Stats",
        frameKey: "FinsicalStats", size: NSSize(width: 360, height: 320),
        minSize: NSSize(width: 300, height: 250)))

    private func page(_ name: String) -> URL {
        URL(string: "\(WebHandler.scheme)://app/\(name)")!
    }

    private func makeWebConfig() -> WKWebViewConfiguration {
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(WebHandler(), forURLScheme: WebHandler.scheme)
        // "finsical" posts are relayed to the sibling webview (bus.ts).
        config.userContentController.add(self, name: "finsical")
        return config
    }

    @objc func openPrefs() { host.show(prefs) }
    @objc func openOverview() { host.show(overview) }
    @objc func openImport() { host.show(addons) }
    @objc func openStats() { host.show(stats) }

    /// The tank window's shape follows the selected machine case.
    /// Applied only when the id changes — state pushes every ~2s.
    private var machineId = ""
    private var machineVbW: CGFloat = 0
    private var machineVbH: CGFloat = 0
    private var machineShape: [(rect: CGRect, radius: CGFloat)] = []
    /// Tank ▸ Pause/Resume — title tracks the tank's paused flag (the
    /// page owns state; the menu is a mirror of `postState` + ⌘P).
    private var pauseMenuItem: NSMenuItem?

    func setPauseMenuItem(_ item: NSMenuItem) {
        pauseMenuItem = item
    }

    private func syncPauseMenu(paused: Bool) {
        pauseMenuItem?.title = paused ? "Resume Simulation" : "Pause Simulation"
    }
    private var machineMaskImage: CGImage?
    private func applyMachine(id: String, w: CGFloat, h: CGFloat,
                              shape: [(CGRect, CGFloat)],
                              maskPath: String?, hole: CGRect?) {
        guard id != machineId, w > 0, h > 0 else { return }
        let old = machineVbW
        machineId = id
        machineVbW = w
        machineVbH = h
        machineShape = shape
        // Image cases: the art's own alpha is the silhouette — pixel-
        // exact, including anti-aliased edges. Shape stays as fallback.
        machineMaskImage = loadMaskImage(maskPath, hole: hole)
        webView.layer?.mask = nil  // drop a stale mask's layer type
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

    /// Load a mask image shipped under Resources/web/ — the raster
    /// case art. Returns nil for vector machines or missing assets.
    /// `hole` is the screen aperture in viewBox units: the art cuts it
    /// out transparent, which as a mask would punch a real hole in the
    /// window — the aquarium lives there, so it gets filled back in.
    /// The flood fill below backs the rect up: the measured aperture can
    /// lag the art's translucent rim by a few px, and anything that
    /// can't reach the image edge through clear pixels is interior.
    private func loadMaskImage(_ rel: String?, hole: CGRect?) -> CGImage? {
        guard let rel, !rel.isEmpty, !rel.contains(".."),
              let root = Bundle.main.resourceURL?
                .appendingPathComponent("web"),
              let img = NSImage(
                contentsOf: root.appendingPathComponent(rel))
        else {
            // Otherwise a missing asset degrades to a silent plain
            // rectangle — say so.
            if let rel { NSLog("mask image failed to load: %@", rel) }
            return nil
        }
        guard let base = img.cgImage(forProposedRect: nil, context: nil,
                                     hints: nil) else { return nil }
        guard let ctx = CGContext(
                data: nil, width: base.width, height: base.height,
                bitsPerComponent: 8, bytesPerRow: 0,
                space: CGColorSpaceCreateDeviceRGB(),
                bitmapInfo:
                  CGImageAlphaInfo.premultipliedLast.rawValue)
        else { return base }
        // Bake the fill into the mask once, at image resolution —
        // cheaper than re-sublayering on every resize. CG image space
        // is y-up; hole arrives top-down.
        let iw = CGFloat(base.width), ih = CGFloat(base.height)
        let kx = iw / machineVbW, ky = ih / machineVbH
        ctx.draw(base, in: CGRect(x: 0, y: 0, width: iw, height: ih))
        ctx.setFillColor(NSColor.black.cgColor) // alpha 1 = masked in
        if let hole {
            ctx.fill(CGRect(x: hole.minX * kx,
                            y: ih - hole.maxY * ky,
                            width: hole.width * kx,
                            height: hole.height * ky))
        }
        // The measured rect can lag the art's real glass rim by a few px,
        // leaving a sliver of see-through window inside the bezel. Back it
        // up: every pixel that cannot reach the image edge through clearly
        // transparent (alpha < 250) pixels is interior — glass, translucent
        // rim, enclosed gaps — and gets masked in. Edge-connected gaps
        // (handle recess, space between feet) stay transparent.
        if let raw = ctx.data {
            let w = base.width, h = base.height, bpr = ctx.bytesPerRow
            let buf = raw.assumingMemoryBound(to: UInt8.self)
            // Alpha sits last in the 32-bit pixel for premultipliedLast
            // at default order and premultipliedFirst at little-endian;
            // the crossed combinations put it first.
            let info = ctx.bitmapInfo.rawValue
            let alphaInfo = CGImageAlphaInfo(
                rawValue: info & CGBitmapInfo.alphaInfoMask.rawValue)
            let first = alphaInfo == .premultipliedFirst
                || alphaInfo == .first
            let little = info & CGBitmapInfo.byteOrderMask.rawValue
                == CGBitmapInfo.byteOrder32Little.rawValue
            let alphaOff = first == little ? 3 : 0
            var seen = [Bool](repeating: false, count: w * h)
            var stack: [Int] = []
            func seed(_ x: Int, _ y: Int) {
                let i = y * w + x
                guard !seen[i],
                      buf[y * bpr + x * 4 + alphaOff] < 250 else { return }
                seen[i] = true
                stack.append(i)
            }
            for x in 0 ..< w { seed(x, 0); seed(x, h - 1) }
            for y in 0 ..< h { seed(0, y); seed(w - 1, y) }
            while let i = stack.popLast() {
                let x = i % w, y = i / w
                if x > 0 { seed(x - 1, y) }
                if x < w - 1 { seed(x + 1, y) }
                if y > 0 { seed(x, y - 1) }
                if y < h - 1 { seed(x, y + 1) }
            }
            for i in 0 ..< w * h where !seen[i] {
                buf[(i / w) * bpr + (i % w) * 4 + alphaOff] = 255
            }
        }
        return ctx.makeImage() ?? base
    }

    /// Clip the window's content to the case silhouette: the raster
    /// case's own alpha when an image mask is set, else a union of
    /// rounded rects in viewBox units as a CAShapeLayer mask on the
    /// webview's layer. Either way, even if the webview's background
    /// ever paints (drawsBackground not honored), only the bezel shape
    /// can show. Scales with the viewBox like the art does.
    private func syncMask() {
        guard machineVbW > 0, let layer = webView.layer else { return }
        // A layer's space follows the view's isFlipped, which AppKit
        // mirrors into isGeometryFlipped for layer-backed views.
        let flipped = layer.isGeometryFlipped
        if let img = machineMaskImage {
            // Raster silhouette: the image's alpha channel is the mask
            // (loadMaskImage already baked the screen aperture back in).
            let mask = layer.mask is CAShapeLayer || layer.mask == nil
                ? CALayer() : layer.mask!
            mask.frame = CGRect(origin: .zero, size: layer.bounds.size)
            mask.isGeometryFlipped = flipped
            mask.contents = img
            mask.contentsGravity = .resize
            layer.mask = mask
            return
        }
        let s = webView.frame.width / machineVbW
        guard s > 0, !machineShape.isEmpty else {
            layer.mask = nil
            return
        }
        let path = CGMutablePath()
        for (rect, r) in machineShape {
            let ly = flipped ? rect.minY : machineVbH - rect.maxY
            path.addRoundedRect(
                in: CGRect(x: rect.minX * s, y: ly * s,
                           width: rect.width * s,
                           height: rect.height * s),
                cornerWidth: r * s, cornerHeight: r * s)
        }
        // Reuse the mask layer — syncMask runs every resize tick.
        let mask = layer.mask as? CAShapeLayer ?? CAShapeLayer()
        mask.frame = CGRect(origin: .zero, size: layer.bounds.size)
        // A shape-layer path rasterizes — without this it renders at
        // 1x and jaggies on Retina.
        mask.contentsScale = window.backingScaleFactor
        mask.path = path
        layer.mask = mask
    }

    // Every move and resize rewrites the tank's saved frame, so the
    // value on disk is always where the user last left it. (The client
    // windows' frames are the host's.)
    func windowDidMove(_ note: Notification) {
        if note.object as? NSWindow === window {
            frames.save(window.frame, key: "FinsicalTank")
        }
    }

    func windowDidResize(_ note: Notification) {
        guard note.object as? NSWindow === window else { return }
        syncMask()
        frames.save(window.frame, key: "FinsicalTank")
    }

    // Any backing-scale change — a move between displays (committed
    // after the screen-change notification) or a same-display density
    // change — fires this, not always a resize. Re-rasterize the mask.
    func windowDidChangeBackingProperties(_ note: Notification) {
        if note.object as? NSWindow === window { syncMask() }
    }

    /// Bus relay: posts from a client window (Preferences, Tank
    /// Overview, Import Add-ons, Tank Stats) go to the tank page, which
    /// owns all state; the tank's posts fan out to every open client
    /// window (web/bus.ts registers window.__bus).
    func userContentController(_ ucc: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        // The client windows' chrome goes to the Osmium host on its own
        // message handler; only the tank's case drag comes this way.
        if let body = message.body as? [String: Any] {
            // A press on the tank's case moves the tank window.
            if body["op"] as? String == "dragWindow",
               message.webView === webView {
                OsmiumWindowHost.drag(window, firstResponder: webView)
                return
            }
            // Tank state carries the machine's viewBox aspect —
            // retune the frame to the case outline. Falls through:
            // clients still need the push.
            if body["op"] as? String == "state",
               message.webView === webView {
                if let p = body["paused"] as? Bool {
                    syncPauseMenu(paused: p)
                }
                if let mc = body["machine"] as? [String: Any],
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
                    var hole: CGRect?
                    if let hd = mc["hole"] as? [String: Any],
                       let hx = (hd["x"] as? NSNumber)?.doubleValue,
                       let hy = (hd["y"] as? NSNumber)?.doubleValue,
                       let hw = (hd["w"] as? NSNumber)?.doubleValue,
                       let hh = (hd["h"] as? NSNumber)?.doubleValue {
                        hole = CGRect(x: hx, y: hy,
                                      width: hw, height: hh)
                    }
                    applyMachine(id: mid, w: CGFloat(mw), h: CGFloat(mh),
                                 shape: shape,
                                 maskPath: mc["mask"] as? String, hole: hole)
                }
            }
        }
        guard let data = try? JSONSerialization.data(
                  withJSONObject: message.body),
              let text = String(data: data, encoding: .utf8) else { return }
        // Closed windows keep their webview alive (reopen reuses it)
        // but have no need for pushes — skip them until they're shown.
        let open = host.windows.filter { $0.webView?.window?.isVisible == true }
        let dests: [WKWebView] = message.webView === webView
            ? open.compactMap { $0.webView }
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
                : host.hosted(for: dest)?.spec.title ?? "client"
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

    @objc func togglePause() {
        let js = "window.finsical?.togglePause ? window.finsical.togglePause()" +
                 " : (() => { throw new Error('window.finsical.togglePause missing') })()"
        webView?.evaluateJavaScript(js) { result, error in
            if let error {
                NSLog("Finsical: togglePause JS failed: \(error.localizedDescription)")
                return
            }
            // setPaused returns the new flag — keep the menu label in sync
            // even if the state push races the completion handler.
            if let paused = result as? Bool {
                self.syncPauseMenu(paused: paused)
            }
        }
    }

    @objc func supportArchive() {
        if let url = URL(string: "https://archive.org/donate") {
            NSWorkspace.shared.open(url)
        }
    }

    /// Keep the aquarium on screen: hand any top-level http(s) navigation
    /// to the default browser instead of replacing the app's content.
    /// The handler's type matches WKNavigationDelegate's exactly: in
    /// Swift 6 a near miss is only a warning, and WebKit would never
    /// call this method.
    func webView(_ webView: WKWebView,
                 decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping @MainActor @Sendable
                     (WKNavigationActionPolicy) -> Void) {
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

        frames.restore(window, key: "FinsicalTank")
        window.makeKeyAndOrderFront(nil)

        webView.load(URLRequest(url: page("index.html")))
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ app: NSApplication) -> Bool { true }
}

// Several source files (this one and Osmium UI's window host), so the
// entry point is an @main type rather than top-level code. AppKit runs
// it on the main thread, where everything it sets up belongs.
@main
@MainActor
enum FinsicalApp {
    static func main() {
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
        tankMenu.addItem(withTitle: "Tank Stats",
                         action: #selector(AppDelegate.openStats),
                         keyEquivalent: "S") // ⇧⌘S — ⌘S is the Save convention
        tankMenu.addItem(withTitle: "Import Add-ons…",
                         action: #selector(AppDelegate.openImport),
                         keyEquivalent: "i")
        tankMenu.addItem(withTitle: "Feed Fish",
                         action: #selector(AppDelegate.feedFish),
                         keyEquivalent: "f")
        tankMenu.addItem(withTitle: "Toggle CRT Effect",
                         action: #selector(AppDelegate.toggleCrt),
                         keyEquivalent: "r")
        let pause = tankMenu.addItem(withTitle: "Pause Simulation",
                                 action: #selector(AppDelegate.togglePause),
                                 keyEquivalent: "p") // ⌘P — no Print menu here
        delegate.setPauseMenuItem(pause)
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
        // nil target → responder chain → key window. The tank carries
        // .closable in its styleMask (hiding the buttons doesn't remove it);
        // the borderless client windows answer through OsmiumWindow's
        // overrides. Both keep the windowShouldClose veto path. Closing the
        // tank quits the app (windowWillClose).
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
        // NSApplication holds its delegate weakly.
        withExtendedLifetime(delegate) { app.run() }
    }
}
