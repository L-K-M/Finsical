import Cocoa
import WebKit

/// Serves the bundled web app (Resources/web/) on the `finsical` scheme so
/// fetch() works uniformly — including the optional bundled pack/ folder.
final class WebHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "finsical"
    private static let mime: [String: String] = [
        "html": "text/html", "js": "text/javascript", "json": "application/json",
        "png": "image/png", "bin": "application/octet-stream",
    ]

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url, url.scheme == WebHandler.scheme,
              let root = Bundle.main.resourceURL?.appendingPathComponent("web") else {
            task.didFailWithError(URLError(.unsupportedURL))
            return
        }
        let file = root.appendingPathComponent(url.path)
        // Stay inside the web root.
        guard file.path.hasPrefix(root.path + "/") else {
            task.didFailWithError(URLError(.fileDoesNotExist))
            return
        }
        do {
            let data = try Data(contentsOf: file)
            let ext = file.pathExtension.lowercased()
            let res = URLResponse(url: url, mimeType: WebHandler.mime[ext],
                                  expectedContentLength: data.count,
                                  textEncodingName: nil)
            task.didReceive(res)
            task.didReceive(data)
            task.didFinish()
        } catch {
            task.didFailWithError(error)
        }
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var window: NSWindow!

    func applicationDidFinishLaunching(_ note: Notification) {
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(WebHandler(), forURLScheme: WebHandler.scheme)
        let webView = WKWebView(frame: .init(x: 0, y: 0, width: 640, height: 400),
                              configuration: config)

        window = NSWindow(
            contentRect: webView.frame,
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered, defer: false)
        window.title = "Finsical"
        window.level = .floating                    // always on top
        window.collectionBehavior = [.canJoinAllSpaces]
        window.contentAspectRatio = NSSize(width: 320, height: 200)
        window.contentView = webView
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
app.activate(ignoringOtherApps: true)
app.run()
