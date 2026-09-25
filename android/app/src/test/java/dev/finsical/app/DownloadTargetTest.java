package dev.finsical.app;

import static org.junit.Assert.assertEquals;

import dev.finsical.app.DownloadTarget.Kind;

import java.util.Date;
import java.util.TimeZone;

import org.junit.Test;

public class DownloadTargetTest {
    // 2026-09-25T07:04:05Z
    private static final Date TIME = new Date(1790319845000L);
    private static final TimeZone UTC = TimeZone.getTimeZone("UTC");

    private static DownloadTarget target(String mimeType) {
        return DownloadTarget.forMimeType(mimeType, TIME, UTC);
    }

    @Test
    public void pngIsAPictureNamedLikeThePageDoes() {
        DownloadTarget target = target("image/png");
        assertEquals(Kind.PICTURE, target.kind);
        assertEquals("finsical-20260925-070405.png", target.fileName);
        assertEquals("image/png", target.documentMimeType);
    }

    @Test
    public void pictureNameUsesTheGivenZone() {
        assertEquals("finsical-20260925-090405.png",
                DownloadTarget.forMimeType("image/png", TIME, TimeZone.getTimeZone("Europe/Zurich")).fileName);
    }

    @Test
    public void jsonIsAnExportedTank() {
        DownloadTarget target = target("application/json");
        assertEquals(Kind.TANK, target.kind);
        assertEquals("finsical-tank.fins", target.fileName);
        // Not application/json, or providers append .json to the name.
        assertEquals("application/octet-stream", target.documentMimeType);
    }

    @Test
    public void otherTypesAreGenericFilesOfTheirType() {
        DownloadTarget text = target("text/plain");
        assertEquals(Kind.FILE, text.kind);
        assertEquals("finsical-download", text.fileName);
        assertEquals("text/plain", text.documentMimeType);
        assertEquals("image/svg+xml", target("image/svg+xml").documentMimeType);
        assertEquals("application/octet-stream", target("application/octet-stream").documentMimeType);
    }

    @Test
    public void malformedOrMissingTypesBecomeOctetStream() {
        for (String type : new String[] {null, "", "text", "/plain", "text/", "text/plain; charset=utf-8",
                "Text/Plain", "text/pla in", "*/*", "text/plain\n"}) {
            DownloadTarget target = target(type);
            assertEquals(type, Kind.FILE, target.kind);
            assertEquals(type, "finsical-download", target.fileName);
            assertEquals(type, "application/octet-stream", target.documentMimeType);
        }
    }
}
