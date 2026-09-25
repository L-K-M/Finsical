package dev.finsical.app;

import java.util.OptionalInt;

/**
 * Reads the WebView's Chromium major version from its user agent. Plain
 * Java, so it is unit tested on the JVM.
 */
final class WebViewVersion {
    /**
     * The oldest WebView the web app runs on: pack decoding needs
     * DecompressionStream("deflate-raw") (core/data/zip.ts), new in
     * Chromium 103.
     */
    static final int MINIMUM_MAJOR = 103;

    private static final String CHROME_TOKEN = "Chrome/";
    /** More digits than any real version; keeps the parse from overflowing. */
    private static final int MAX_DIGITS = 6;

    private WebViewVersion() {}

    /**
     * The major version in a user agent's "Chrome/NN.x.y.z" token, or empty
     * when there is none (a WebView provider that is not Chromium-based).
     */
    static OptionalInt chromeMajor(String userAgent) {
        if (userAgent == null) {
            return OptionalInt.empty();
        }
        int start = userAgent.indexOf(CHROME_TOKEN);
        if (start < 0) {
            return OptionalInt.empty();
        }
        start += CHROME_TOKEN.length();
        int end = start;
        while (end < userAgent.length() && end - start < MAX_DIGITS
                && Character.isDigit(userAgent.charAt(end))) {
            end++;
        }
        if (end == start || (end < userAgent.length() && Character.isDigit(userAgent.charAt(end)))) {
            return OptionalInt.empty();
        }
        return OptionalInt.of(Integer.parseInt(userAgent.substring(start, end)));
    }
}
