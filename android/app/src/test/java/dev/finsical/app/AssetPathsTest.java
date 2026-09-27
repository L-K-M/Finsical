package dev.finsical.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;

import java.util.Optional;

import org.junit.Test;

public class AssetPathsTest {
    private static void assertResolves(String encodedPath, String asset) {
        assertEquals(encodedPath, Optional.of(asset), AssetPaths.resolve(encodedPath));
    }

    private static void assertRejected(String encodedPath) {
        assertFalse(encodedPath, AssetPaths.resolve(encodedPath).isPresent());
    }

    @Test
    public void mapsFilesIntoTheWebRoot() {
        assertResolves("/index.html", "web/index.html");
        assertResolves("/assets/macintosh-plus.png", "web/assets/macintosh-plus.png");
        assertResolves("/pack/manifest.json", "web/pack/manifest.json");
        assertResolves("/pack/_sounds/.hidden.wav", "web/pack/_sounds/.hidden.wav");
    }

    @Test
    public void directoriesNameTheirIndex() {
        assertResolves("/", "web/index.html");
        assertResolves("", "web/index.html");
        assertResolves(null, "web/index.html");
        assertResolves("/pack/", "web/pack/index.html");
    }

    @Test
    public void decodesPercentEscapes() {
        assertResolves("/pack/sounds/Bubble%20Pop.wav", "web/pack/sounds/Bubble Pop.wav");
        assertResolves("/pack/images/caf%C3%A9.png", "web/pack/images/café.png");
        // A plus is a plus in a path, not a space.
        assertResolves("/a+b.png", "web/a+b.png");
    }

    @Test
    public void rejectsTraversal() {
        assertRejected("/../secret");
        assertRejected("/assets/../../secret");
        assertRejected("/%2e%2e/secret");
        assertRejected("/assets/%2E%2E/index.html");
        assertRejected("/./index.html");
        assertRejected("/assets//tam.png");
    }

    @Test
    public void rejectsEncodedSlashAndNul() {
        assertRejected("/assets%2findex.html");
        assertRejected("/assets%2Findex.html");
        assertRejected("/..%2Fsecret");
        assertRejected("/index.html%00.png");
    }

    @Test
    public void rejectsMalformedEscapes() {
        assertRejected("/index.html%");
        assertRejected("/index.html%2");
        assertRejected("/index%zz.html");
        // Not UTF-8.
        assertRejected("/caf%E9.png");
        assertRejected("/café.png");
    }

    @Test
    public void namesContentTypesLikeTheMacShell() {
        assertType("index.html", "text/html", "utf-8");
        assertType("bundle.js", "text/javascript", "utf-8");
        assertType("app.css", "text/css", "utf-8");
        assertType("manifest.json", "application/json", "utf-8");
        assertType("icon.svg", "image/svg+xml", "utf-8");
        assertType("assets/tam.png", "image/png", null);
        assertType("decoder.wasm", "application/wasm", null);
        assertType("chunks/0.bin", "application/octet-stream", null);
        assertType("sounds/pop.wav", "audio/wav", null);
    }

    @Test
    public void matchesExtensionsCaseInsensitively() {
        assertType("ASSETS/TAM.PNG", "image/png", null);
        assertType("Index.HTML", "text/html", "utf-8");
    }

    @Test
    public void unknownTypesAreOctetStreams() {
        assertType("readme", "application/octet-stream", null);
        assertType("notes.txt", "application/octet-stream", null);
        assertType("dir.v2/file", "application/octet-stream", null);
    }

    private static void assertType(String path, String mimeType, String charset) {
        AssetPaths.ContentType type = AssetPaths.contentType(path);
        assertEquals(path, mimeType, type.mimeType);
        if (charset == null) {
            assertNull(path, type.charset);
        } else {
            assertEquals(path, charset, type.charset);
        }
    }
}
