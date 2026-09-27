package dev.finsical.app;

import java.util.Date;
import java.util.TimeZone;
import java.util.regex.Pattern;

/**
 * What a page download is and how the save picker should offer it. WebView
 * does not pass on an {@code <a download>} file name, so the shell names the
 * file from the download's MIME type. Plain Java, so it is unit tested on
 * the JVM.
 */
final class DownloadTarget {
    /** The page feature a download comes from; picks the user's messages. */
    enum Kind {
        /** Take a Picture (web/main.ts takePicture): a PNG. */
        PICTURE,
        /** Export Tank (web/main.ts exportTank): the saved-tank JSON. */
        TANK,
        /** Anything else the page hands over. */
        FILE
    }

    static final String PNG = "image/png";
    static final String JSON = "application/json";
    static final String OCTET_STREAM = "application/octet-stream";
    /** The page's own name for an exported tank (web/main.ts exportTank). */
    static final String TANK_FILE_NAME = "finsical-tank.fins";
    static final String GENERIC_FILE_NAME = "finsical-download";

    /** A lower-case type/subtype without parameters (RFC 6838 characters). */
    private static final Pattern MIME_TYPE = Pattern.compile("[a-z0-9][a-z0-9!#$&^_.+-]*/[a-z0-9][a-z0-9!#$&^_.+-]*");

    final Kind kind;
    /** The name the save picker suggests. */
    final String fileName;
    /** The MIME type the save picker is asked to create. */
    final String documentMimeType;

    private DownloadTarget(Kind kind, String fileName, String documentMimeType) {
        this.kind = kind;
        this.fileName = fileName;
        this.documentMimeType = documentMimeType;
    }

    /**
     * The target for a download of the given MIME type (lower case, without
     * parameters, as DataUrl reports it), named for the given time and zone
     * where the name carries one.
     */
    static DownloadTarget forMimeType(String mimeType, Date now, TimeZone zone) {
        String type = mimeType == null ? "" : mimeType;
        if (type.equals(PNG)) {
            return new DownloadTarget(Kind.PICTURE, PictureName.of(now, zone), PNG);
        }
        if (type.equals(JSON)) {
            // Created as octet-stream: a provider that sees application/json
            // with an extension it does not map to it (.fins has no MIME type)
            // appends its own, and the file would be finsical-tank.fins.json.
            return new DownloadTarget(Kind.TANK, TANK_FILE_NAME, OCTET_STREAM);
        }
        // With the real type, the provider adds a fitting extension to the
        // extensionless name; a malformed type must not reach the picker.
        String document = MIME_TYPE.matcher(type).matches() ? type : OCTET_STREAM;
        return new DownloadTarget(Kind.FILE, GENERIC_FILE_NAME, document);
    }
}
