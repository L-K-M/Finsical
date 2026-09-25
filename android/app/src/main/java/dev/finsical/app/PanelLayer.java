package dev.finsical.app;

import android.annotation.SuppressLint;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * The layer above the tank that holds the web app's window.open windows
 * (Preferences, Tank Overview, Tank Stats, Import Add-ons) as panels.
 *
 * <p>WebView's onCreateWindow does not say what a new window will load, so
 * every child starts pending: attached but invisible, so it can load. Its
 * first navigation decides (see MainActivity): an app page shows it as a
 * panel; an external link goes to the browser and the child is discarded.
 *
 * <p>Each panel is centered at its page's macOS window size, clamped to the
 * layer. Touches outside every panel fall through to the tank, which stays
 * interactive; touching a panel brings it to the front. A closed panel is
 * destroyed, not hidden: the page's next window.open for that name creates
 * a fresh one.
 */
// Built in code with its listener, never inflated from a layout, so it has
// no constructor for the layout tools (ViewConstructor).
@SuppressLint("ViewConstructor")
final class PanelLayer extends ViewGroup {
    /** Told whenever the number of visible panels changes. */
    interface Listener {
        void onVisiblePanelsChanged(int count);
    }

    private static final class Panel {
        boolean pending = true;
        String page = "";
        Optional<PanelSizes.Size> sizeDp = Optional.empty();
    }

    private final Map<WebView, Panel> panels = new HashMap<>();
    private final Listener listener;
    // A view is destroyed after the callback that closed it has returned
    // (WebView must not be destroyed inside its own callbacks). Not
    // View.post: that never runs once the layer is detached.
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    PanelLayer(Context context, Listener listener) {
        super(context);
        this.listener = listener;
    }

    /** Adds a new window.open child, invisible until {@link #show}. */
    void addPending(WebView child) {
        panels.put(child, new Panel());
        child.setVisibility(View.INVISIBLE);
        addView(child);
    }

    boolean isPending(WebView view) {
        Panel panel = panels.get(view);
        return panel != null && panel.pending;
    }

    /**
     * Shows a child as the panel for the app page at `path`, or resizes an
     * open panel that navigated to another page. Ignores unknown views
     * (the tank).
     */
    void show(WebView view, String path) {
        Panel panel = panels.get(view);
        if (panel == null) {
            return;
        }
        panel.page = PanelSizes.pageName(path);
        panel.sizeDp = PanelSizes.forPath(path);
        requestLayout();
        if (!panel.pending) {
            return;
        }
        panel.pending = false;
        view.setVisibility(View.VISIBLE);
        bringChildToFront(view);
        listener.onVisiblePanelsChanged(visibleCount());
    }

    /** Brings a visible panel to the front. Ignores other views. */
    void bringPanelToFront(WebView view) {
        Panel panel = panels.get(view);
        if (panel == null || panel.pending) {
            return;
        }
        bringChildToFront(view);
    }

    /** Removes and destroys a panel or pending child. Ignores other views. */
    void close(WebView view) {
        Panel panel = panels.remove(view);
        if (panel == null) {
            return;
        }
        view.setVisibility(View.GONE);
        mainHandler.post(() -> {
            removeView(view);
            view.destroy();
        });
        if (!panel.pending) {
            listener.onVisiblePanelsChanged(visibleCount());
        }
    }

    /** Closes the frontmost visible panel; false when none is open. */
    boolean closeTop() {
        for (int i = getChildCount() - 1; i >= 0; i--) {
            View child = getChildAt(i);
            Panel panel = panels.get(child);
            if (panel != null && !panel.pending) {
                close((WebView) child);
                return true;
            }
        }
        return false;
    }

    /** The visible panel showing a page ("stats.html"), if any. */
    Optional<WebView> findByPage(String page) {
        for (Map.Entry<WebView, Panel> entry : panels.entrySet()) {
            Panel panel = entry.getValue();
            if (!panel.pending && panel.page.equals(page)) {
                return Optional.of(entry.getKey());
            }
        }
        return Optional.empty();
    }

    /** Every panel and pending child, for lifecycle calls. */
    List<WebView> webViews() {
        return new ArrayList<>(panels.keySet());
    }

    /** Removes and destroys everything at once (the Activity is going away). */
    void destroyAll() {
        List<WebView> views = webViews();
        panels.clear();
        removeAllViews();
        for (WebView view : views) {
            view.destroy();
        }
    }

    private int visibleCount() {
        int count = 0;
        for (Panel panel : panels.values()) {
            if (!panel.pending) {
                count++;
            }
        }
        return count;
    }

    @Override
    public boolean onInterceptTouchEvent(MotionEvent event) {
        // Only watches: a touch on a panel raises it and still reaches it.
        if (event.getActionMasked() != MotionEvent.ACTION_DOWN) {
            return false;
        }
        for (int i = getChildCount() - 1; i >= 0; i--) {
            View child = getChildAt(i);
            if (child.getVisibility() != View.VISIBLE) {
                continue;
            }
            if (event.getX() >= child.getLeft() && event.getX() < child.getRight()
                    && event.getY() >= child.getTop() && event.getY() < child.getBottom()) {
                if (i != getChildCount() - 1) {
                    bringChildToFront(child);
                }
                break;
            }
        }
        return false;
    }

    @Override
    public boolean shouldDelayChildPressedState() {
        return false;
    }

    @Override
    protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
        int width = MeasureSpec.getSize(widthMeasureSpec);
        int height = MeasureSpec.getSize(heightMeasureSpec);
        setMeasuredDimension(width, height);
        // Read per pass: the Activity handles density changes itself.
        float density = getResources().getDisplayMetrics().density;
        for (int i = 0; i < getChildCount(); i++) {
            View child = getChildAt(i);
            if (child.getVisibility() == View.GONE) {
                continue;
            }
            PanelSizes.Size size = sizeOf(child, width, height, density);
            child.measure(MeasureSpec.makeMeasureSpec(size.width, MeasureSpec.EXACTLY),
                    MeasureSpec.makeMeasureSpec(size.height, MeasureSpec.EXACTLY));
        }
    }

    @Override
    protected void onLayout(boolean changed, int left, int top, int right, int bottom) {
        int width = right - left;
        int height = bottom - top;
        for (int i = 0; i < getChildCount(); i++) {
            View child = getChildAt(i);
            if (child.getVisibility() == View.GONE) {
                continue;
            }
            int childLeft = (width - child.getMeasuredWidth()) / 2;
            int childTop = (height - child.getMeasuredHeight()) / 2;
            child.layout(childLeft, childTop, childLeft + child.getMeasuredWidth(),
                    childTop + child.getMeasuredHeight());
        }
    }

    /** A panel's clamped size; pending children fill the layer. */
    private PanelSizes.Size sizeOf(View child, int width, int height, float density) {
        Panel panel = panels.get(child);
        Optional<PanelSizes.Size> desired = panel == null
                ? Optional.empty()
                : panel.sizeDp.map(dp -> PanelSizes.toPixels(dp, density));
        return PanelSizes.fit(desired, width, height);
    }
}
