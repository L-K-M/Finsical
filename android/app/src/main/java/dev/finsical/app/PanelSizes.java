package dev.finsical.app;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * How big each client page's panel is. Plain Java, so it is unit tested on
 * the JVM.
 *
 * <p>The sizes are the macOS window sizes (macos/Finsical.swift), in dp:
 * each page draws its whole Mac OS 8 window to fill the viewport, 1 px
 * drop shadow included, and WebView lays a page out at 1 CSS px per dp.
 * A screen smaller than the size squeezes the page, which lays itself out
 * for that (the fixed-position window fills whatever viewport it gets).
 */
final class PanelSizes {
    /** An immutable width and height. */
    static final class Size {
        final int width;
        final int height;

        Size(int width, int height) {
            this.width = width;
            this.height = height;
        }

        @Override
        public boolean equals(Object other) {
            if (!(other instanceof Size)) {
                return false;
            }
            Size size = (Size) other;
            return width == size.width && height == size.height;
        }

        @Override
        public int hashCode() {
            return 31 * width + height;
        }

        @Override
        public String toString() {
            return width + "x" + height;
        }
    }

    /** Page file name -> panel size in dp. (Map.of needs API 30.) */
    private static final Map<String, Size> PAGE_SIZES_DP;

    static {
        Map<String, Size> sizes = new HashMap<>();
        sizes.put("prefs.html", new Size(565, 457));
        sizes.put("overview.html", new Size(521, 381));
        sizes.put("addons.html", new Size(621, 441));
        sizes.put("stats.html", new Size(360, 320));
        PAGE_SIZES_DP = Collections.unmodifiableMap(sizes);
    }

    private PanelSizes() {}

    /** The last segment of a URL path: "/stats.html" -> "stats.html". */
    static String pageName(String path) {
        if (path == null) {
            return "";
        }
        return path.substring(path.lastIndexOf('/') + 1);
    }

    /** The panel size in dp for a page's URL path, or empty for pages without one. */
    static Optional<Size> forPath(String path) {
        return Optional.ofNullable(PAGE_SIZES_DP.get(pageName(path)));
    }

    /** A dp size in pixels at the given display density (px per dp). */
    static Size toPixels(Size dp, float density) {
        return new Size(Math.round(dp.width * density), Math.round(dp.height * density));
    }

    /**
     * The on-screen size of a panel: its own size clamped to the available
     * area, or the whole area for a page without a size (empty `desired`).
     */
    static Size fit(Optional<Size> desired, int availableWidth, int availableHeight) {
        int width = Math.max(0, availableWidth);
        int height = Math.max(0, availableHeight);
        if (!desired.isPresent()) {
            return new Size(width, height);
        }
        return new Size(Math.min(desired.get().width, width), Math.min(desired.get().height, height));
    }
}
