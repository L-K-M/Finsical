package dev.finsical.app;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class RestartLimiterTest {
    @Test
    public void allowsThreeRestartsAMinute() {
        RestartLimiter limiter = new RestartLimiter();
        assertTrue(limiter.allowRestart(0));
        assertTrue(limiter.allowRestart(10_000));
        assertTrue(limiter.allowRestart(20_000));
        assertFalse(limiter.allowRestart(30_000));
    }

    @Test
    public void allowsRestartsAgainOnceOldLossesAgeOut() {
        RestartLimiter limiter = new RestartLimiter();
        for (long t = 0; t < 4; t++) {
            limiter.allowRestart(t * 1000);
        }
        // At 64 s the losses at 0-3 s are all more than 60 s old.
        assertTrue(limiter.allowRestart(RestartLimiter.WINDOW_MS + 4_000));
    }

    @Test
    public void countsALossExactlyAtTheWindowEdge() {
        RestartLimiter limiter = new RestartLimiter();
        limiter.allowRestart(0);
        limiter.allowRestart(1);
        limiter.allowRestart(2);
        // 60 s after the first loss it still counts: four in the window.
        assertFalse(limiter.allowRestart(RestartLimiter.WINDOW_MS));
    }
}
