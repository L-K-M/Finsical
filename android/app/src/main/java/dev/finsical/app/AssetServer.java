package dev.finsical.app;

import android.content.res.AssetManager;
import android.util.Log;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;

import java.io.ByteArrayInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Answers every request for the app origin from the APK's assets/web/,
 * the Android counterpart of the macOS shell's finsical:// scheme handler.
 * Called on WebView's network thread.
 *
 * <p>A missing file is a real 404, as a web server would answer: the page
 * probes for an optional bundled pack with fetch('pack/manifest.json') and
 * takes a 404 as "no pack". Returning null instead would send the request
 * to the network.
 */
final class AssetServer {
    private static final String GET = "GET";
    private static final String HEAD = "HEAD";
    private static final String CACHE_CONTROL = "Cache-Control";
    /**
     * The bundled files change with every app update: no-store keeps a
     * cached response from bringing back an old page.
     */
    private static final String NO_STORE = "no-store";

    private final AssetManager assets;

    AssetServer(AssetManager assets) {
        this.assets = assets;
    }

    /** The response for a request whose URL is on the app origin. */
    WebResourceResponse serve(WebResourceRequest request) {
        String method = request.getMethod();
        if (!GET.equals(method) && !HEAD.equals(method)) {
            Map<String, String> headers = new HashMap<>(noStore());
            headers.put("Allow", GET + ", " + HEAD);
            return empty(405, "Method Not Allowed", headers);
        }

        Optional<String> asset = AssetPaths.resolve(request.getUrl().getEncodedPath());
        if (!asset.isPresent()) {
            return notFound();
        }

        InputStream body;
        try {
            // AssetManager streams report their exact remaining size, which
            // WebView uses as the Content-Length.
            body = assets.open(asset.get());
        } catch (FileNotFoundException e) {
            return notFound();
        } catch (IOException e) {
            Log.e(MainActivity.LOG_TAG, "Cannot read asset " + asset.get(), e);
            return empty(500, "Internal Server Error", noStore());
        }

        if (HEAD.equals(method)) {
            closeProbe(body, asset.get());
            body = emptyStream();
        }
        AssetPaths.ContentType type = AssetPaths.contentType(asset.get());
        return new WebResourceResponse(type.mimeType, type.charset, 200, "OK", noStore(), body);
    }

    private static WebResourceResponse notFound() {
        return empty(404, "Not Found", noStore());
    }

    private static WebResourceResponse empty(int status, String reason, Map<String, String> headers) {
        return new WebResourceResponse("text/plain", "utf-8", status, reason, headers, emptyStream());
    }

    private static Map<String, String> noStore() {
        return Collections.singletonMap(CACHE_CONTROL, NO_STORE);
    }

    private static InputStream emptyStream() {
        return new ByteArrayInputStream(new byte[0]);
    }

    private static void closeProbe(InputStream stream, String asset) {
        try {
            stream.close();
        } catch (IOException e) {
            // Only an existence check read it; the HEAD answer stands.
            Log.w(MainActivity.LOG_TAG, "Cannot close asset " + asset, e);
        }
    }
}
