package dev.finsical.app;

import static org.junit.Assert.assertEquals;

import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

import org.junit.Test;

public class PictureNameTest {
    // 2026-09-25T07:04:05Z
    private static final Date TIME = new Date(1790319845000L);

    @Test
    public void namesLikeThePageDoes() {
        assertEquals("finsical-20260925-070405.png", PictureName.of(TIME, TimeZone.getTimeZone("UTC")));
    }

    @Test
    public void usesTheGivenZone() {
        assertEquals("finsical-20260925-090405.png", PictureName.of(TIME, TimeZone.getTimeZone("Europe/Zurich")));
    }

    @Test
    public void digitsStayAsciiInAnyLocale() {
        Locale saved = Locale.getDefault();
        try {
            Locale.setDefault(Locale.forLanguageTag("ar-EG"));
            assertEquals("finsical-20260925-070405.png", PictureName.of(TIME, TimeZone.getTimeZone("UTC")));
        } finally {
            Locale.setDefault(saved);
        }
    }
}
