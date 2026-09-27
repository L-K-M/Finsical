package dev.finsical.app;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

/**
 * The file name suggested when saving a Take a Picture PNG. The page names
 * its download the same way (web/main.ts), but the WebView does not pass
 * that name on, so the shell rebuilds it. Plain Java, so it is unit tested
 * on the JVM.
 */
final class PictureName {
    private PictureName() {}

    /** finsical-YYYYMMDD-HHMMSS.png for the given time and zone. */
    static String of(Date time, TimeZone zone) {
        // Locale.ROOT: ASCII digits whatever the device language.
        SimpleDateFormat format = new SimpleDateFormat("yyyyMMdd-HHmmss", Locale.ROOT);
        format.setTimeZone(zone);
        return "finsical-" + format.format(time) + ".png";
    }
}
