package dev.finsical.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class DataUrlTest {
    @Test
    public void parsesACanvasPng() {
        String url = "data:image/png;base64,iVBORw0KGgo=";
        DataUrl data = DataUrl.parse(url).orElseThrow(AssertionError::new);
        assertEquals("image/png", data.mimeType);
        assertTrue(data.base64);
        assertEquals("iVBORw0KGgo=", url.substring(data.payloadStart));
    }

    @Test
    public void normalizesCaseAndParameters() {
        DataUrl data = DataUrl.parse("DATA:Image/PNG;name=x.png;BASE64,AAAA").orElseThrow(AssertionError::new);
        assertEquals("image/png", data.mimeType);
        assertTrue(data.base64);
    }

    @Test
    public void percentEncodedPayloadIsNotBase64() {
        DataUrl data = DataUrl.parse("data:text/plain;charset=utf-8,hello%20world").orElseThrow(AssertionError::new);
        assertEquals("text/plain", data.mimeType);
        assertFalse(data.base64);
    }

    @Test
    public void base64MustBeTheLastParameter() {
        DataUrl data = DataUrl.parse("data:image/png;base64;x=y,AAAA").orElseThrow(AssertionError::new);
        assertFalse(data.base64);
    }

    @Test
    public void missingTypeIsPlainText() {
        DataUrl data = DataUrl.parse("data:,hi").orElseThrow(AssertionError::new);
        assertEquals("text/plain", data.mimeType);
        assertFalse(data.base64);
        assertEquals(6, data.payloadStart);
        DataUrl base64 = DataUrl.parse("data:;base64,aGk=").orElseThrow(AssertionError::new);
        assertEquals("text/plain", base64.mimeType);
        assertTrue(base64.base64);
    }

    @Test
    public void emptyPayloadStartsAtTheEnd() {
        String url = "data:image/png;base64,";
        DataUrl data = DataUrl.parse(url).orElseThrow(AssertionError::new);
        assertEquals(url.length(), data.payloadStart);
    }

    @Test
    public void rejectsOtherUrls() {
        assertFalse(DataUrl.parse(null).isPresent());
        assertFalse(DataUrl.parse("").isPresent());
        assertFalse(DataUrl.parse("https://archive.org/x.png").isPresent());
        assertFalse(DataUrl.parse("blob:https://appassets.androidplatform.net/1234").isPresent());
        assertFalse(DataUrl.parse("data:image/png;base64").isPresent());
        assertFalse(DataUrl.parse("dat").isPresent());
    }
}
