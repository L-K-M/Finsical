package dev.finsical.app;

import java.util.ArrayDeque;

/**
 * Caps how often the shell restarts after losing the WebView renderer, as
 * the macOS and Linux shells cap their reloads: past a few losses a minute
 * the page is a deterministic crasher, and restarting again only burns CPU
 * and battery on renderer spawns. Plain Java, so it is unit tested on the
 * JVM; not thread safe (the UI thread owns it).
 */
final class RestartLimiter {
    static final long WINDOW_MS = 60_000;
    static final int LIMIT = 3;

    private final ArrayDeque<Long> times = new ArrayDeque<>();

    /**
     * Records a loss at nowMs (a monotonic clock) and says whether the shell
     * may restart for it.
     */
    boolean allowRestart(long nowMs) {
        while (!times.isEmpty() && nowMs - times.peekFirst() > WINDOW_MS) {
            times.removeFirst();
        }
        times.addLast(nowMs);
        return times.size() <= LIMIT;
    }
}
