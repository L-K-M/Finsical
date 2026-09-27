package dev.finsical.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import dev.finsical.app.AppOrigin.Destination;

import org.junit.Test;

public class AppOriginTest {
    @Test
    public void appOriginIsHttpsOnTheDefaultPort() {
        assertTrue(AppOrigin.isApp("https", AppOrigin.HOST, -1));
        assertTrue(AppOrigin.isApp("HTTPS", "AppAssets.AndroidPlatform.net", -1));
        assertFalse(AppOrigin.isApp("http", AppOrigin.HOST, -1));
        assertFalse(AppOrigin.isApp("https", AppOrigin.HOST, 8443));
        assertFalse(AppOrigin.isApp("https", "archive.org", -1));
        assertFalse(AppOrigin.isApp("https", "evil.appassets.androidplatform.net", -1));
        assertFalse(AppOrigin.isApp(null, null, -1));
    }

    @Test
    public void startsOnTheAppOrigin() {
        assertEquals("https://appassets.androidplatform.net/index.html", AppOrigin.START_URL);
    }

    @Test
    public void classifiesDestinations() {
        assertEquals(Destination.APP, AppOrigin.classify("https", AppOrigin.HOST, -1, "//" + AppOrigin.HOST + "/stats.html"));
        assertEquals(Destination.BLANK, AppOrigin.classify("about", null, -1, "blank"));
        assertEquals(Destination.WEB, AppOrigin.classify("https", "archive.org", -1, "//archive.org/donate"));
        assertEquals(Destination.WEB, AppOrigin.classify("http", "example.com", -1, "//example.com/"));
        assertEquals(Destination.OTHER, AppOrigin.classify("about", null, -1, "srcdoc"));
        assertEquals(Destination.OTHER, AppOrigin.classify("intent", null, -1, "#Intent;end"));
        assertEquals(Destination.OTHER, AppOrigin.classify("file", null, -1, "///sdcard/x"));
        assertEquals(Destination.OTHER, AppOrigin.classify("javascript", null, -1, "alert(1)"));
        assertEquals(Destination.OTHER, AppOrigin.classify(null, null, -1, null));
    }
}
