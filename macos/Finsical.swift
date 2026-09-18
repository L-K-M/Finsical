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
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate, WKUIDelegate, WKNavigationDelegate {
    private var window: NSWindow!
    private var webView: WKWebView!

    /// Menu actions evaluate JS entry points exposed by web/main.ts. A
    /// missing hook throws so the failure lands in the log, not silently.
    @objc func openImport() {
        let js = "window.finsical?.openImport ? window.finsical.openImport()" +
                 " : (() => { throw new Error('window.finsical.openImport missing') })()"
        webView?.evaluateJavaScript(js) { _, error in
            if let error { NSLog("Finsical: openImport JS failed: \(error.localizedDescription)") }
        }
    }

    @objc func feedFish() {
        let js = "window.finsical?.feedFish ? window.finsical.feedFish()" +
                 " : (() => { throw new Error('window.finsical.feedFish missing') })()"
        webView?.evaluateJavaScript(js) { _, error in
            if let error { NSLog("Finsical: feedFish JS failed: \(error.localizedDescription)") }
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
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(WebHandler(), forURLScheme: WebHandler.scheme)
        webView = WKWebView(frame: .init(x: 0, y: 0, width: 640, height: 400),
                            configuration: config)
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
appMenu.addItem(withTitle: "Quit Finsical",
                action: #selector(NSApplication.terminate(_:)),
                keyEquivalent: "q")
appItem.submenu = appMenu
let tankItem = NSMenuItem()
mainMenu.addItem(tankItem)
let tankMenu = NSMenu(title: "Tank")
tankMenu.addItem(withTitle: "Import Add-ons…",
                 action: #selector(AppDelegate.openImport),
                 keyEquivalent: "i")
tankMenu.addItem(withTitle: "Feed Fish",
                 action: #selector(AppDelegate.feedFish),
                 keyEquivalent: "f")
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
app.mainMenu = mainMenu
app.activate(ignoringOtherApps: true)
app.run()
