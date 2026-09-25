package dev.finsical.app;

import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import android.webkit.WebView;

import java.util.Optional;

/**
 * A self check for CI's emulator job, in debuggable builds only. Launched
 * with the boolean extra {@link #EXTRA}, it opens Tank Stats from the tank
 * and waits for the stats page to render rows. The page renders them only
 * after a state push from the tank crossed BroadcastChannel into the panel,
 * so a pass proves the web root is served, both pages run, window.open
 * makes a panel, and the bus works between WebViews.
 *
 * <p>The result is one logcat line, tag {@value MainActivity#LOG_TAG}:
 * exactly "FINSICAL_SMOKE PASS" or "FINSICAL_SMOKE FAIL: reason".
 */
final class SmokeTest {
    static final String EXTRA = "dev.finsical.app.SMOKE_TEST";

    private static final long TIMEOUT_MS = 60_000;
    private static final long POLL_MS = 500;
    private static final String STATS_PAGE = "stats.html";
    // Named like the page's own Window menu does (web/menubar.ts), so a
    // later menu open reuses this window.
    private static final String OPEN_STATS_JS = "window.open('stats.html', 'finsical-stats') !== null";
    private static final String ROWS_JS = "document.querySelector('#srows')?.childElementCount > 0";
    private static final String JS_TRUE = "true";

    private final PanelLayer panels;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private long deadline;
    private boolean tankLoaded;
    private boolean finished;

    private SmokeTest(PanelLayer panels) {
        this.panels = panels;
    }

    /**
     * Starts the check if the launch intent asks for it and the build is
     * debuggable; otherwise returns null.
     */
    static SmokeTest startIfRequested(Context context, Intent intent, PanelLayer panels) {
        if (intent == null || !intent.getBooleanExtra(EXTRA, false)) {
            return null;
        }
        if ((context.getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) == 0) {
            Log.w(MainActivity.LOG_TAG, "Ignoring " + EXTRA + ": the smoke test runs in debuggable builds only");
            return null;
        }
        SmokeTest test = new SmokeTest(panels);
        test.deadline = SystemClock.uptimeMillis() + TIMEOUT_MS;
        test.handler.postAtTime(() -> {
            if (!test.tankLoaded) {
                test.fail("the tank page did not finish loading within " + TIMEOUT_MS / 1000 + " s");
            }
        }, test.deadline);
        Log.i(MainActivity.LOG_TAG, "Smoke test started");
        return test;
    }

    /** Called when the tank's page has finished loading. */
    void onTankLoaded(WebView tank) {
        if (tankLoaded || finished) {
            return;
        }
        tankLoaded = true;
        deadline = SystemClock.uptimeMillis() + TIMEOUT_MS;
        tank.evaluateJavascript(OPEN_STATS_JS, result -> {
            if (!JS_TRUE.equals(result)) {
                fail("window.open('stats.html') on the tank returned " + result);
                return;
            }
            poll();
        });
    }

    /** Stops the check without a result (the Activity is going away). */
    void cancel() {
        finished = true;
        handler.removeCallbacksAndMessages(null);
    }

    private void poll() {
        if (finished) {
            return;
        }
        Optional<WebView> stats = panels.findByPage(STATS_PAGE);
        if (!stats.isPresent()) {
            retryOrFail("the Tank Stats panel never opened");
            return;
        }
        stats.get().evaluateJavascript(ROWS_JS, result -> {
            if (JS_TRUE.equals(result)) {
                pass();
                return;
            }
            retryOrFail("Tank Stats rendered no rows: no state reached it from the tank over BroadcastChannel");
        });
    }

    private void retryOrFail(String reason) {
        if (SystemClock.uptimeMillis() + POLL_MS > deadline) {
            fail(reason + " within " + TIMEOUT_MS / 1000 + " s");
            return;
        }
        handler.postDelayed(this::poll, POLL_MS);
    }

    private void pass() {
        if (finished) {
            return;
        }
        cancel();
        Log.i(MainActivity.LOG_TAG, "FINSICAL_SMOKE PASS");
    }

    private void fail(String reason) {
        if (finished) {
            return;
        }
        cancel();
        Log.e(MainActivity.LOG_TAG, "FINSICAL_SMOKE FAIL: " + reason);
    }
}
