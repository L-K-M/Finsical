package dev.finsical.app;

import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Maps request paths on the app origin to files in the APK's assets/web/
 * folder, and names their content types. Plain Java, so it is unit tested
 * on the JVM.
 *
 * <p>The web root sits in a subfolder because the APK's asset manager also
 * resolves some framework folders (images/, webkit/) at its top level; a
 * page's request must never reach those.
 */
final class AssetPaths {
    /** The web root inside the APK's assets. */
    static final String WEB_ROOT = "web/";

    private static final String INDEX = "index.html";
    private static final String UTF_8 = "utf-8";
    private static final String OCTET_STREAM = "application/octet-stream";

    /**
     * The macOS shell's map (macos/Finsical.swift) plus wav for pack sounds.
     * (Map.of needs API 30.)
     */
    private static final Map<String, String> MIME_TYPES;

    static {
        Map<String, String> types = new HashMap<>();
        types.put("html", "text/html");
        types.put("js", "text/javascript");
        types.put("json", "application/json");
        types.put("png", "image/png");
        types.put("svg", "image/svg+xml");
        types.put("css", "text/css");
        types.put("wasm", "application/wasm");
        types.put("bin", OCTET_STREAM);
        types.put("wav", "audio/wav");
        MIME_TYPES = Collections.unmodifiableMap(types);
    }

    /** A response's MIME type, and its charset for text (null otherwise). */
    static final class ContentType {
        final String mimeType;
        final String charset;

        private ContentType(String mimeType, String charset) {
            this.mimeType = mimeType;
            this.charset = charset;
        }
    }

    private AssetPaths() {}

    /**
     * The asset path (such as "web/assets/tam.png") for a percent-encoded URL
     * path, or empty when the path cannot name a bundled file: an encoded
     * slash or NUL, malformed escapes, or an empty, "." or ".." segment. A
     * directory path ("/" or ending in "/") names its index.html.
     */
    static Optional<String> resolve(String encodedPath) {
        String encoded = encodedPath == null ? "" : encodedPath;
        // An encoded slash would turn one URL segment into two path
        // segments after decoding, dodging the segment checks below.
        if (encoded.toLowerCase(Locale.ROOT).contains("%2f")) {
            return Optional.empty();
        }
        Optional<String> decoded = percentDecode(encoded);
        if (!decoded.isPresent() || decoded.get().indexOf('\0') >= 0) {
            return Optional.empty();
        }

        String path = decoded.get();
        if (path.startsWith("/")) {
            path = path.substring(1);
        }
        if (path.isEmpty() || path.endsWith("/")) {
            path += INDEX;
        }
        for (String segment : path.split("/", -1)) {
            if (segment.isEmpty() || segment.equals(".") || segment.equals("..")) {
                return Optional.empty();
            }
        }
        return Optional.of(WEB_ROOT + path);
    }

    /**
     * The content type for a file name, by extension. Text, SVG and JSON
     * are utf-8, like the macOS shell serves them; unknown types are
     * application/octet-stream.
     */
    static ContentType contentType(String fileName) {
        int slash = fileName.lastIndexOf('/');
        int dot = fileName.lastIndexOf('.');
        String extension = dot > slash ? fileName.substring(dot + 1).toLowerCase(Locale.ROOT) : "";
        String mimeType = MIME_TYPES.getOrDefault(extension, OCTET_STREAM);
        boolean text = mimeType.startsWith("text/")
                || mimeType.equals("image/svg+xml")
                || mimeType.equals("application/json");
        return new ContentType(mimeType, text ? UTF_8 : null);
    }

    /** Strict RFC 3986 percent-decoding as UTF-8 ("+" stays a plus). */
    private static Optional<String> percentDecode(String s) {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream(s.length());
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c != '%') {
                if (c > 0x7F) {
                    // A canonical URL path is ASCII.
                    return Optional.empty();
                }
                bytes.write(c);
                continue;
            }
            if (i + 2 >= s.length()) {
                return Optional.empty();
            }
            int high = Character.digit(s.charAt(i + 1), 16);
            int low = Character.digit(s.charAt(i + 2), 16);
            if (high < 0 || low < 0) {
                return Optional.empty();
            }
            bytes.write(high << 4 | low);
            i += 2;
        }
        try {
            return Optional.of(StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(bytes.toByteArray()))
                    .toString());
        } catch (CharacterCodingException e) {
            return Optional.empty();
        }
    }
}
