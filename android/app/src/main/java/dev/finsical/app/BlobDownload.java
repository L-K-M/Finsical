package dev.finsical.app;

import java.util.regex.Pattern;

/**
 * Reading a blob: download in the page. Take a Picture and Export Tank click
 * an {@code <a download>} on a blob: URL, which WebView hands to the
 * DownloadListener as the bare URL: WebView cannot fetch blob: URLs itself,
 * and only the page that made one can read it. So the shell runs
 * {@link #readerScript} in the tank page, which reads the blob as a data:
 * URL and passes it back through the JavaScript interface
 * {@value #INTERFACE_NAME}. Plain Java, so it is unit tested on the JVM.
 */
final class BlobDownload {
    /**
     * The interface's name on the tank page's window. It must not collide
     * with the page's own globals (finsical, webkit, __bus): web/bus.ts
     * takes a window.webkit for the macOS bridge.
     */
    static final String INTERFACE_NAME = "FinsicalAndroid";

    /**
     * The largest download the shell takes. A picture is a 640 x 400 PNG
     * (1 MB even uncompressed) and a saved tank a few KB of JSON (the page
     * refuses to import more than 5 MB), so this only stops runaway
     * payloads before their base64 fills the heap.
     */
    static final int MAX_BYTES = 8 * 1024 * 1024;

    /** Room for a data: URL's header ("data:image/png;base64,"). */
    private static final int MAX_HEADER_CHARS = 256;

    /** The longest data: URL the shell decodes: MAX_BYTES in base64, plus the header. */
    static final int MAX_DATA_URL_CHARS = (MAX_BYTES + 2) / 3 * 4 + MAX_HEADER_CHARS;

    /**
     * A blob: URL of the app origin, as Blink mints them: the origin, a
     * slash and a UUID. The strict shape also guarantees the URL needs no
     * escaping inside the script's string literal.
     */
    private static final Pattern APP_BLOB_URL = Pattern.compile(
            "blob:https://" + Pattern.quote(AppOrigin.HOST) + "/[0-9a-f-]{1,64}", Pattern.CASE_INSENSITIVE);

    /** A request token as UUID.toString() writes it; safe in a string literal. */
    private static final Pattern TOKEN = Pattern.compile("[0-9a-f-]{1,64}");

    private static final String BLOB_SCHEME = "blob:";

    /**
     * Reads the blob and calls back exactly once: deliver(token, dataUrl) or
     * fail(token, reason). It completes with true once started, and with
     * false when the interface is missing (not the tank page). It fetches
     * at once: the page revokes the URL 5 to 10 s after the click.
     */
    private static final String READER_SCRIPT = String.join("\n",
            "(function () {",
            "  var bridge = window." + INTERFACE_NAME + ";",
            "  var token = '%TOKEN%';",
            "  if (!bridge) return false;",
            "  fetch('%URL%')",
            "    .then(function (response) {",
            "      if (!response.ok) throw new Error('HTTP ' + response.status);",
            "      return response.blob();",
            "    })",
            "    .then(function (blob) {",
            "      if (blob.size > %MAX%) throw new Error(blob.size + ' bytes is over the %MAX% byte limit');",
            "      return new Promise(function (resolve, reject) {",
            "        var reader = new FileReader();",
            "        reader.onload = function () { resolve(reader.result); };",
            "        reader.onerror = function () { reject(reader.error); };",
            "        reader.readAsDataURL(blob);",
            "      });",
            "    })",
            "    .then(function (dataUrl) { bridge.deliver(token, dataUrl); },",
            "          function (error) { bridge.fail(token, String(error)); });",
            "  return true;",
            "})();");

    private BlobDownload() {}

    /** Whether a download URL is a blob: URL of any origin. */
    static boolean isBlob(String url) {
        return url != null && url.regionMatches(true, 0, BLOB_SCHEME, 0, BLOB_SCHEME.length());
    }

    /** Whether a download URL is a blob: URL the app origin made. */
    static boolean isAppBlob(String url) {
        return url != null && APP_BLOB_URL.matcher(url).matches();
    }

    /**
     * The script that reads `blobUrl` in the page and reports under `token`.
     *
     * @throws IllegalArgumentException if the URL is not an app blob: URL or
     *     the token is not a UUID string; callers check both first
     */
    static String readerScript(String blobUrl, String token) {
        if (!isAppBlob(blobUrl)) {
            throw new IllegalArgumentException("not a blob: URL of the app origin: " + blobUrl);
        }
        if (token == null || !TOKEN.matcher(token).matches()) {
            throw new IllegalArgumentException("not a request token: " + token);
        }
        return READER_SCRIPT
                .replace("%TOKEN%", token)
                .replace("%URL%", blobUrl)
                .replace("%MAX%", Integer.toString(MAX_BYTES));
    }
}
