package dev.finsical.app;

import java.util.Locale;

/**
 * The origin the web app runs on, and what a navigation's URL means for
 * the shell. Plain Java (callers pass the parsed URL's parts), so it is
 * unit tested on the JVM.
 *
 * <p>appassets.androidplatform.net is reserved for app-local content
 * (androidx's WebViewAssetLoader uses it); requests for it never reach
 * the network because the shell answers them all. The origin must never
 * change: localStorage and IndexedDB, where the tank lives, are keyed on
 * it.
 */
final class AppOrigin {
    static final String HOST = "appassets.androidplatform.net";
    static final String START_URL = "https://" + HOST + "/index.html";

    /** Where a navigation leads, which decides how the shell handles it. */
    enum Destination {
        /** The bundled web app: load it in the WebView. */
        APP,
        /** The empty page every window.open panel starts with. */
        BLANK,
        /** The web at large: hand it to the browser. */
        WEB,
        /** Any other scheme (intent:, file:, javascript:, ...): refuse. */
        OTHER
    }

    private AppOrigin() {}

    /**
     * Classifies a URL from its parts, as android.net.Uri reports them: a
     * missing host is null and a missing port is -1.
     */
    static Destination classify(String scheme, String host, int port, String schemeSpecificPart) {
        String s = scheme == null ? "" : scheme.toLowerCase(Locale.ROOT);
        if (isApp(s, host, port)) {
            return Destination.APP;
        }
        if (s.equals("about") && "blank".equals(schemeSpecificPart)) {
            return Destination.BLANK;
        }
        if (s.equals("http") || s.equals("https")) {
            return Destination.WEB;
        }
        return Destination.OTHER;
    }

    /** Whether the URL parts name the app origin (https, default port). */
    static boolean isApp(String scheme, String host, int port) {
        return "https".equalsIgnoreCase(scheme) && HOST.equalsIgnoreCase(host) && port == -1;
    }
}
