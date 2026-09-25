package dev.finsical.app;

import java.util.Locale;
import java.util.Optional;

/**
 * The header of a data: URL (RFC 2397), the form every download reaches
 * the save path in: Take a Picture's fallback hands its PNG to the
 * DownloadListener as one, and the tank page reads blob: downloads into
 * one (BlobDownload). Plain Java, so it is unit tested on the JVM;
 * decoding the payload is the caller's job.
 */
final class DataUrl {
    private static final String SCHEME = "data:";
    private static final String BASE64 = "base64";
    /** RFC 2397: a data URL without a media type is US-ASCII text. */
    private static final String DEFAULT_MIME_TYPE = "text/plain";

    /** The media type, lower case, without parameters. */
    final String mimeType;
    /** Whether the payload is base64 rather than percent-encoded. */
    final boolean base64;
    /** Index in the URL where the payload starts (after the comma). */
    final int payloadStart;

    private DataUrl(String mimeType, boolean base64, int payloadStart) {
        this.mimeType = mimeType;
        this.base64 = base64;
        this.payloadStart = payloadStart;
    }

    /** Parses a data: URL's header, or empty when the URL is not one. */
    static Optional<DataUrl> parse(String url) {
        if (url == null || !url.regionMatches(true, 0, SCHEME, 0, SCHEME.length())) {
            return Optional.empty();
        }
        int comma = url.indexOf(',', SCHEME.length());
        if (comma < 0) {
            return Optional.empty();
        }

        String[] parts = url.substring(SCHEME.length(), comma).split(";", -1);
        String mimeType = parts[0].trim().toLowerCase(Locale.ROOT);
        if (mimeType.isEmpty()) {
            mimeType = DEFAULT_MIME_TYPE;
        }
        // ";base64" is always the last parameter.
        boolean base64 = parts.length > 1 && parts[parts.length - 1].trim().equalsIgnoreCase(BASE64);
        return Optional.of(new DataUrl(mimeType, base64, comma + 1));
    }
}
