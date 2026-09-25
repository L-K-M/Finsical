package dev.finsical.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;

import dev.finsical.app.PanelSizes.Size;

import java.util.Optional;

import org.junit.Test;

public class PanelSizesTest {
    @Test
    public void pagesUseTheMacWindowSizes() {
        assertEquals(Optional.of(new Size(565, 457)), PanelSizes.forPath("/prefs.html"));
        assertEquals(Optional.of(new Size(521, 381)), PanelSizes.forPath("/overview.html"));
        assertEquals(Optional.of(new Size(621, 441)), PanelSizes.forPath("/addons.html"));
        assertEquals(Optional.of(new Size(380, 640)), PanelSizes.forPath("/stats.html"));
    }

    @Test
    public void otherPagesHaveNoSize() {
        assertFalse(PanelSizes.forPath("/index.html").isPresent());
        assertFalse(PanelSizes.forPath("/").isPresent());
        assertFalse(PanelSizes.forPath("").isPresent());
        assertFalse(PanelSizes.forPath(null).isPresent());
        assertFalse(PanelSizes.forPath("/stats.html/").isPresent());
    }

    @Test
    public void pageNameIsTheLastSegment() {
        assertEquals("stats.html", PanelSizes.pageName("/stats.html"));
        assertEquals("stats.html", PanelSizes.pageName("/sub/stats.html"));
        assertEquals("stats.html", PanelSizes.pageName("stats.html"));
        assertEquals("", PanelSizes.pageName("/"));
        assertEquals("", PanelSizes.pageName(null));
    }

    @Test
    public void convertsDpToPixels() {
        assertEquals(new Size(360, 320), PanelSizes.toPixels(new Size(360, 320), 1f));
        assertEquals(new Size(1080, 960), PanelSizes.toPixels(new Size(360, 320), 3f));
        // 565 * 2.625 = 1483.125, 457 * 2.625 = 1199.625
        assertEquals(new Size(1483, 1200), PanelSizes.toPixels(new Size(565, 457), 2.625f));
    }

    @Test
    public void fitsWhenThereIsRoom() {
        assertEquals(new Size(360, 320), PanelSizes.fit(Optional.of(new Size(360, 320)), 1080, 2000));
    }

    @Test
    public void clampsEachAxisToTheAvailableArea() {
        // Preferences on a 360 x 700 dp portrait phone at 1x.
        assertEquals(new Size(360, 457), PanelSizes.fit(Optional.of(new Size(565, 457)), 360, 700));
        // Add-ons in a short landscape area.
        assertEquals(new Size(621, 300), PanelSizes.fit(Optional.of(new Size(621, 441)), 800, 300));
        assertEquals(new Size(300, 200), PanelSizes.fit(Optional.of(new Size(621, 441)), 300, 200));
        // Tank Stats, taller than a landscape phone.
        assertEquals(new Size(380, 360), PanelSizes.fit(PanelSizes.forPath("/stats.html"), 800, 360));
    }

    @Test
    public void unknownPagesFillTheArea() {
        assertEquals(new Size(1080, 1920), PanelSizes.fit(Optional.empty(), 1080, 1920));
    }

    @Test
    public void neverNegative() {
        assertEquals(new Size(0, 0), PanelSizes.fit(Optional.of(new Size(360, 320)), -5, -1));
        assertEquals(new Size(0, 0), PanelSizes.fit(Optional.empty(), -5, -1));
    }
}
