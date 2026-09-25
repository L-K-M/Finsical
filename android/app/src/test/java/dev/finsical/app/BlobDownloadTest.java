package dev.finsical.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;

import java.util.UUID;

import org.junit.Test;

public class BlobDownloadTest {
    private static final String BLOB = "blob:https://appassets.androidplatform.net/337276e7-48ec-445f-b725-fcc22c59bf17";
    private static final String TOKEN = "0f8fad5b-d9cb-469f-a165-70867728950e";

    @Test
    public void recognizesBlobUrlsOfAnyOrigin() {
        assertTrue(BlobDownload.isBlob(BLOB));
        assertTrue(BlobDownload.isBlob("BLOB:https://example.com/x"));
        assertFalse(BlobDownload.isBlob("data:image/png;base64,AAAA"));
        assertFalse(BlobDownload.isBlob("https://appassets.androidplatform.net/index.html"));
        assertFalse(BlobDownload.isBlob("blo"));
        assertFalse(BlobDownload.isBlob(null));
    }

    @Test
    public void acceptsTheAppOriginsBlobUrls() {
        assertTrue(BlobDownload.isAppBlob(BLOB));
        assertTrue(BlobDownload.isAppBlob("BLOB:HTTPS://AppAssets.AndroidPlatform.net/337276E7-48EC-445F-B725-FCC22C59BF17"));
    }

    @Test
    public void rejectsOtherBlobUrls() {
        assertFalse(BlobDownload.isAppBlob(null));
        assertFalse(BlobDownload.isAppBlob(""));
        assertFalse(BlobDownload.isAppBlob("blob:https://archive.org/337276e7-48ec-445f-b725-fcc22c59bf17"));
        assertFalse(BlobDownload.isAppBlob(
                "blob:https://appassets.androidplatform.net.example.com/337276e7-48ec-445f-b725-fcc22c59bf17"));
        assertFalse(BlobDownload.isAppBlob("blob:http://appassets.androidplatform.net/337276e7"));
        assertFalse(BlobDownload.isAppBlob("blob:https://appassets.androidplatform.net:8443/337276e7"));
        assertFalse(BlobDownload.isAppBlob("blob:https://appassets.androidplatform.net/"));
        assertFalse(BlobDownload.isAppBlob("blob:null/337276e7-48ec-445f-b725-fcc22c59bf17"));
        assertFalse(BlobDownload.isAppBlob("https://appassets.androidplatform.net/337276e7"));
        // Anything that could break out of the script's string literal.
        assertFalse(BlobDownload.isAppBlob(BLOB + "');alert(1);('"));
        assertFalse(BlobDownload.isAppBlob(BLOB + "\\"));
        assertFalse(BlobDownload.isAppBlob(BLOB + "\n"));
        assertFalse(BlobDownload.isAppBlob(BLOB + "#x"));
    }

    @Test
    public void scriptReadsTheUrlAndReportsUnderTheToken() {
        String script = BlobDownload.readerScript(BLOB, TOKEN);
        assertTrue(script.contains("fetch('" + BLOB + "')"));
        assertTrue(script.contains("var token = '" + TOKEN + "';"));
        assertTrue(script.contains("window." + BlobDownload.INTERFACE_NAME));
        assertTrue(script.contains("blob.size > " + BlobDownload.MAX_BYTES + ")"));
        assertTrue(script.contains("bridge.deliver(token, dataUrl)"));
        assertTrue(script.contains("bridge.fail(token, String(error))"));
        assertFalse(script.contains("%"));
    }

    @Test
    public void acceptsUuidTokens() {
        String token = UUID.randomUUID().toString();
        assertTrue(BlobDownload.readerScript(BLOB, token).contains("'" + token + "'"));
    }

    @Test
    public void scriptRefusesWhatItCannotQuoteSafely() {
        assertThrows(IllegalArgumentException.class,
                () -> BlobDownload.readerScript("blob:https://archive.org/337276e7", TOKEN));
        assertThrows(IllegalArgumentException.class, () -> BlobDownload.readerScript(BLOB + "'", TOKEN));
        assertThrows(IllegalArgumentException.class, () -> BlobDownload.readerScript(BLOB, "x'"));
        assertThrows(IllegalArgumentException.class, () -> BlobDownload.readerScript(BLOB, ""));
        assertThrows(IllegalArgumentException.class, () -> BlobDownload.readerScript(BLOB, null));
    }

    @Test
    public void dataUrlLimitFitsTheBase64OfTheByteLimit() {
        // 8 MiB is 2796203 base64 quanta of 4 characters, plus the header.
        assertEquals(8 * 1024 * 1024, BlobDownload.MAX_BYTES);
        assertEquals(11184812 + 256, BlobDownload.MAX_DATA_URL_CHARS);
        int header = "data:application/octet-stream;base64,".length();
        assertTrue(header + (BlobDownload.MAX_BYTES + 2) / 3 * 4 <= BlobDownload.MAX_DATA_URL_CHARS);
    }
}
