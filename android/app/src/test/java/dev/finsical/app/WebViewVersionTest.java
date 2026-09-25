package dev.finsical.app;

import static org.junit.Assert.assertEquals;

import java.util.OptionalInt;

import org.junit.Test;

public class WebViewVersionTest {
    @Test
    public void readsTheChromeMajorVersion() {
        assertEquals(OptionalInt.of(138), WebViewVersion.chromeMajor(
                "Mozilla/5.0 (Linux; Android 9; SM-G960F Build/PPR1.180610.011; wv) AppleWebKit/537.36 "
                        + "(KHTML, like Gecko) Version/4.0 Chrome/138.0.7204.179 Mobile Safari/537.36"));
        assertEquals(OptionalInt.of(95), WebViewVersion.chromeMajor(
                "Mozilla/5.0 (Linux; Android 5.1; wv) AppleWebKit/537.36 (KHTML, like Gecko) "
                        + "Version/4.0 Chrome/95.0.4638.74 Safari/537.36"));
        assertEquals(OptionalInt.of(1000), WebViewVersion.chromeMajor("x Chrome/1000.0 y"));
        assertEquals(OptionalInt.of(103), WebViewVersion.chromeMajor("Chrome/103"));
    }

    @Test
    public void emptyWithoutAUsableToken() {
        assertEquals(OptionalInt.empty(), WebViewVersion.chromeMajor(null));
        assertEquals(OptionalInt.empty(), WebViewVersion.chromeMajor(""));
        assertEquals(OptionalInt.empty(), WebViewVersion.chromeMajor("Mozilla/5.0 (X11; Linux) Gecko/20100101 Firefox/140.0"));
        assertEquals(OptionalInt.empty(), WebViewVersion.chromeMajor("Chrome/"));
        assertEquals(OptionalInt.empty(), WebViewVersion.chromeMajor("Chrome/.1"));
        assertEquals(OptionalInt.empty(), WebViewVersion.chromeMajor("Chrome/x"));
        // Too many digits to be a version (and to fit an int).
        assertEquals(OptionalInt.empty(), WebViewVersion.chromeMajor("Chrome/99999999999.0"));
    }

    @Test
    public void minimumIsTheFirstVersionWithDeflateRaw() {
        assertEquals(103, WebViewVersion.MINIMUM_MAJOR);
    }
}
