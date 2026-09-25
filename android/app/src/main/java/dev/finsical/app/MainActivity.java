package dev.finsical.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.provider.DocumentsContract;
import android.util.Base64;
import android.util.Log;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.ConsoleMessage;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.TextView;
import android.widget.Toast;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import java.io.IOException;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.OptionalInt;
import java.util.TimeZone;

/**
 * Finsical's Android shell: the tank page full screen in its browser mode,
 * with the page's own Mac OS 8 menu bar and Add-ons button, served from the
 * APK's assets on the app origin (AppOrigin, AssetServer).
 *
 * <p>There is no JS bridge. The page opens Preferences, Tank Overview, Tank
 * Stats and Import Add-ons with window.open; each becomes a panel over the
 * tank (PanelLayer), and the pages talk to the tank over BroadcastChannel,
 * which spans every WebView in the app. Back closes the top panel.
 */
public final class MainActivity extends Activity {
    static final String LOG_TAG = "Finsical";

    private static final int REQUEST_SAVE_PICTURE = 1;
    private static final String PNG = "image/png";
    /** Longest URL a log line quotes: data: URLs run to hundreds of KB. */
    private static final int MAX_LOGGED_URL = 100;
    private static final int MESSAGE_PADDING_DP = 24;
    private static final int MESSAGE_TEXT_SP = 18;

    /** What a WebView is for; configure differs only in the background. */
    private enum Role { TANK, PANEL }

    private FrameLayout root;
    private WebView tank;
    private PanelLayer panels;
    private ShellClient client;
    private final ShellChromeClient chrome = new ShellChromeClient();
    private SmokeTest smoke;
    /** Registered while a panel is open, on API 33+; see syncBackCallback. */
    private OnBackInvokedCallback panelBack;
    /** The Take a Picture PNG while the user picks where to save it. */
    private byte[] pendingPicture;
    private boolean restarting;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);
        padForSystemBars(root);
        setContentView(root);

        Optional<String> problem = webViewProblem();
        if (problem.isPresent()) {
            showProblem(problem.get());
            return;
        }

        client = new ShellClient(new AssetServer(getAssets()));
        panels = new PanelLayer(this, this::syncBackCallback);
        tank = newWebView(Role.TANK);
        root.addView(tank, matchParent());
        root.addView(panels, matchParent());
        smoke = SmokeTest.startIfRequested(this, getIntent(), panels);
        tank.loadUrl(AppOrigin.START_URL);
        // A hardware keyboard's bare keys (F feeds) go to the page.
        tank.requestFocus();
    }

    /**
     * Why the tank cannot run here, or empty when it can. The web app
     * needs WebView {@value WebViewVersion#MINIMUM_MAJOR}; devices without
     * Play keep whatever WebView their image shipped with.
     */
    private Optional<String> webViewProblem() {
        String userAgent;
        try {
            userAgent = WebSettings.getDefaultUserAgent(this);
        } catch (RuntimeException e) {
            // No WebView provider is installed, or it is being updated.
            Log.e(LOG_TAG, "Android System WebView is unavailable", e);
            return Optional.of(getString(R.string.webview_missing));
        }
        OptionalInt major = WebViewVersion.chromeMajor(userAgent);
        if (!major.isPresent()) {
            // Recovery by design: a provider that does not name its
            // Chromium version may still be new enough, so start anyway.
            Log.w(LOG_TAG, "Cannot read the WebView version from \"" + userAgent + "\"; starting anyway");
            return Optional.empty();
        }
        if (major.getAsInt() < WebViewVersion.MINIMUM_MAJOR) {
            Log.e(LOG_TAG, "WebView " + major.getAsInt() + " is older than " + WebViewVersion.MINIMUM_MAJOR);
            return Optional.of(getString(R.string.webview_too_old, major.getAsInt(), WebViewVersion.MINIMUM_MAJOR));
        }
        return Optional.empty();
    }

    private void showProblem(String message) {
        TextView text = new TextView(this);
        text.setText(message);
        text.setTextColor(Color.WHITE);
        text.setTextSize(TypedValue.COMPLEX_UNIT_SP, MESSAGE_TEXT_SP);
        text.setGravity(Gravity.CENTER);
        int padding = Math.round(MESSAGE_PADDING_DP * getResources().getDisplayMetrics().density);
        text.setPadding(padding, padding, padding, padding);
        root.addView(text, matchParent());
    }

    /**
     * Pads the content clear of the system bars, the display cutout and the
     * keyboard, then hands the insets on as zero (the "zeroing" approach):
     * the pages' env(safe-area-inset-*) resolves to 0 instead of padding
     * the same area twice. Below API 30 the window keeps its default
     * system-bar fitting; edge-to-edge is only enforced from API 35.
     */
    private static void padForSystemBars(View view) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            return;
        }
        view.setOnApplyWindowInsetsListener((v, windowInsets) -> {
            int types = WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout()
                    | WindowInsets.Type.ime();
            Insets used = windowInsets.getInsets(types);
            v.setPadding(used.left, used.top, used.right, used.bottom);
            return new WindowInsets.Builder(windowInsets).setInsets(types, Insets.NONE).build();
        });
    }

    /** The one configuration for the tank and every window.open child. */
    // The web app is JavaScript. It comes only from the APK's assets, and
    // ShellClient refuses navigation to any other origin.
    @SuppressLint("SetJavaScriptEnabled")
    private WebView newWebView(Role role) {
        WebView view = new WebView(this);
        WebSettings settings = view.getSettings();
        settings.setJavaScriptEnabled(true);
        // Off by default; the tank and its settings live in localStorage.
        settings.setDomStorageEnabled(true);
        // Without both, window.open replaces the current page instead of
        // reaching onCreateWindow, and the panels could not exist.
        settings.setSupportMultipleWindows(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        // Ambient sound and sound previews start without a tap, as on macOS.
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        // The pages are pixel-exact Mac OS 8 layouts; a system font scale
        // would overflow their fixed-size boxes.
        settings.setTextZoom(100);
        view.setWebViewClient(client);
        view.setWebChromeClient(chrome);
        view.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> onDownload(url));
        if (role == Role.PANEL) {
            // Client pages are transparent around the window they draw (the
            // corner notches of its 1 px shadow); the tank shows through.
            view.setBackgroundColor(Color.TRANSPARENT);
        }
        return view;
    }

    // ---- Downloads: Take a Picture --------------------------------------

    /**
     * Take a Picture clicks an {@code <a download>} holding a data: PNG,
     * which WebView hands here as the full data: URL (the file name is not
     * passed on). The user picks where to save it (no storage permission,
     * one code path for every API level).
     */
    private void onDownload(String url) {
        Optional<DataUrl> data = DataUrl.parse(url);
        if (data.isPresent()) {
            savePicture(url, data.get());
            return;
        }
        Uri uri = Uri.parse(url);
        if (destination(uri) == AppOrigin.Destination.WEB) {
            openExternal(uri);
            return;
        }
        Log.w(LOG_TAG, "Ignored a download this app cannot handle: " + forLog(url));
    }

    private void savePicture(String url, DataUrl data) {
        if (!PNG.equals(data.mimeType) || !data.base64) {
            Log.w(LOG_TAG, "Ignored a data: download that is not a base64 PNG: " + forLog(url));
            return;
        }
        byte[] png;
        try {
            png = Base64.decode(url.substring(data.payloadStart), Base64.DEFAULT);
        } catch (IllegalArgumentException e) {
            Log.e(LOG_TAG, "Take a Picture handed over a PNG that is not valid base64", e);
            toast(R.string.picture_failed);
            return;
        }

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT)
                .addCategory(Intent.CATEGORY_OPENABLE)
                .setType(PNG)
                .putExtra(Intent.EXTRA_TITLE, PictureName.of(new Date(), TimeZone.getDefault()));
        try {
            startActivityForResult(intent, REQUEST_SAVE_PICTURE);
        } catch (ActivityNotFoundException e) {
            Log.e(LOG_TAG, "No app can create a document to save the picture in", e);
            toast(R.string.picture_no_app);
            return;
        }
        pendingPicture = png;
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode != REQUEST_SAVE_PICTURE) {
            super.onActivityResult(requestCode, resultCode, data);
            return;
        }
        byte[] png = pendingPicture;
        pendingPicture = null;
        Uri document = data == null ? null : data.getData();
        if (resultCode != RESULT_OK || document == null) {
            Log.i(LOG_TAG, "Saving the picture was cancelled");
            return;
        }
        if (png == null) {
            // The process was killed while the picker was open, and the
            // picture with it. Remove the empty file the picker created.
            Log.e(LOG_TAG, "The picture was lost while the file picker was open");
            deleteDocument(document);
            toast(R.string.picture_lost);
            return;
        }
        writePicture(document, png);
    }

    private void writePicture(Uri document, byte[] png) {
        ContentResolver resolver = getContentResolver();
        Context app = getApplicationContext();
        Handler main = new Handler(Looper.getMainLooper());
        // Off the UI thread: the document may live with a slow provider
        // (a cloud drive).
        new Thread(() -> {
            int message = write(resolver, document, png) ? R.string.picture_saved : R.string.picture_failed;
            main.post(() -> Toast.makeText(app, message, Toast.LENGTH_LONG).show());
        }, "finsical-save-picture").start();
    }

    private static boolean write(ContentResolver resolver, Uri document, byte[] bytes) {
        try (OutputStream out = resolver.openOutputStream(document)) {
            if (out == null) {
                throw new IOException("the document provider returned no stream");
            }
            out.write(bytes);
            return true;
        } catch (IOException | SecurityException e) {
            Log.e(LOG_TAG, "Cannot write the picture to " + document, e);
            return false;
        }
    }

    private void deleteDocument(Uri document) {
        try {
            if (!DocumentsContract.deleteDocument(getContentResolver(), document)) {
                Log.w(LOG_TAG, "Cannot delete the empty picture file " + document);
            }
        } catch (RuntimeException | IOException e) {
            Log.w(LOG_TAG, "Cannot delete the empty picture file " + document, e);
        }
    }

    // ---- Navigation -----------------------------------------------------

    private static AppOrigin.Destination destination(Uri uri) {
        return AppOrigin.classify(uri.getScheme(), uri.getHost(), uri.getPort(), uri.getSchemeSpecificPart());
    }

    /** Hands a web URL to the browser, like the macOS shell does. */
    private void openExternal(Uri uri) {
        Intent intent = new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE);
        try {
            startActivity(intent);
        } catch (ActivityNotFoundException e) {
            Log.e(LOG_TAG, "No app can open " + forLog(uri.toString()), e);
            toast(R.string.link_no_app);
        }
    }

    // ---- Back -----------------------------------------------------------

    /**
     * Back closes the top panel. On API 33+ the callback is registered only
     * while a panel is open: an enabled callback would otherwise take Back
     * from the system and suppress the predictive back-to-home animation.
     */
    private void syncBackCallback(int visiblePanels) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            return;
        }
        OnBackInvokedDispatcher dispatcher = getOnBackInvokedDispatcher();
        if (visiblePanels > 0 && panelBack == null) {
            panelBack = () -> panels.closeTop();
            dispatcher.registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, panelBack);
        } else if (visiblePanels == 0 && panelBack != null) {
            dispatcher.unregisterOnBackInvokedCallback(panelBack);
            panelBack = null;
        }
    }

    // API 24-32 only: with enableOnBackInvokedCallback, API 33+ sends Back
    // to panelBack and never calls this, which is what GestureBackNavigation
    // warns about.
    @SuppressLint("GestureBackNavigation")
    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        if (panels != null && panels.closeTop()) {
            return;
        }
        super.onBackPressed();
    }

    // ---- Lifecycle ------------------------------------------------------

    // Paused in onStop, not onPause: in multi-window mode on Android 9 and
    // older a visible but unfocused Activity is paused, and the tank should
    // keep swimming there. A paused WebView's page is hidden, so the page
    // saves the tank and suspends its audio. Never pauseTimers(): it is
    // global to every WebView in the process.
    @Override
    protected void onStart() {
        super.onStart();
        for (WebView view : webViews()) {
            view.onResume();
        }
    }

    @Override
    protected void onStop() {
        for (WebView view : webViews()) {
            view.onPause();
        }
        super.onStop();
    }

    @Override
    protected void onDestroy() {
        if (smoke != null) {
            smoke.cancel();
        }
        destroyWebViews();
        super.onDestroy();
    }

    private List<WebView> webViews() {
        List<WebView> views = new ArrayList<>();
        if (tank != null) {
            views.add(tank);
        }
        if (panels != null) {
            views.addAll(panels.webViews());
        }
        return views;
    }

    private void destroyWebViews() {
        if (panels != null) {
            panels.destroyAll();
        }
        if (tank != null) {
            root.removeView(tank);
            tank.destroy();
            tank = null;
        }
    }

    /**
     * Every WebView shares one renderer, so when it dies they all go. Start
     * over with a fresh Activity; the page saves the tank every 10 s, so at
     * most those seconds are lost.
     */
    private void restartAfterRendererLoss() {
        if (restarting) {
            return;
        }
        restarting = true;
        if (smoke != null) {
            smoke.cancel();
        }
        destroyWebViews();
        recreate();
    }

    // ---- Helpers --------------------------------------------------------

    private static FrameLayout.LayoutParams matchParent() {
        return new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT);
    }

    private void toast(int message) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
    }

    private static String forLog(String url) {
        return url.length() <= MAX_LOGGED_URL ? url : url.substring(0, MAX_LOGGED_URL) + "...";
    }

    private static int logPriority(ConsoleMessage.MessageLevel level) {
        switch (level) {
            case ERROR:
                return Log.ERROR;
            case WARNING:
                return Log.WARN;
            case DEBUG:
                return Log.DEBUG;
            default:
                return Log.INFO;
        }
    }

    // ---- WebView clients --------------------------------------------------

    /** Serves the app origin and decides every navigation. */
    private final class ShellClient extends WebViewClient {
        // Final: shouldInterceptRequest reads it on WebView's network thread.
        private final AssetServer assets;

        ShellClient(AssetServer assets) {
            this.assets = assets;
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri url = request.getUrl();
            // Anything else (archive.org) goes to the network as usual.
            if (!AppOrigin.isApp(url.getScheme(), url.getHost(), url.getPort())) {
                return null;
            }
            return assets.serve(request);
        }

        /**
         * App pages load in place; web links go to the browser; anything
         * else is refused. A window.open child's first page decides whether
         * it becomes a panel: an app page shows it, anything else (the
         * donate link, opened with noopener) discards it.
         */
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri url = request.getUrl();
            boolean mainFrame = request.isForMainFrame();
            switch (destination(url)) {
                case APP:
                    if (mainFrame) {
                        panels.show(view, url.getPath());
                    }
                    return false;
                case BLANK:
                    return false;
                case WEB:
                    openExternal(url);
                    break;
                default:
                    Log.w(LOG_TAG, "Refused to navigate to " + forLog(url.toString()));
                    break;
            }
            if (mainFrame && panels.isPending(view)) {
                panels.close(view);
            }
            return true;
        }

        /** Fallback for a child's first navigation that bypassed the above. */
        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            if (!panels.isPending(view)) {
                return;
            }
            Uri uri = Uri.parse(url);
            switch (destination(uri)) {
                case APP:
                    panels.show(view, uri.getPath());
                    return;
                case BLANK:
                    return;
                case WEB:
                    view.stopLoading();
                    openExternal(uri);
                    break;
                default:
                    view.stopLoading();
                    Log.w(LOG_TAG, "Refused to open a window on " + forLog(url));
                    break;
            }
            panels.close(view);
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            if (view == tank && smoke != null) {
                smoke.onTankLoaded(view);
            }
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame()) {
                Log.e(LOG_TAG, "Cannot load " + forLog(request.getUrl().toString()) + ": " + error.getDescription());
            }
        }

        @Override
        public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
            // WebView calls this on API 26+ only; the check tells lint so.
            boolean crashed = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && detail.didCrash();
            Log.e(LOG_TAG, "The WebView renderer " + (crashed ? "crashed" : "was stopped by the system")
                    + "; restarting");
            restartAfterRendererLoss();
            return true;
        }
    }

    /** Turns window.open into panels and forwards the pages' console. */
    private final class ShellChromeClient extends WebChromeClient {
        /**
         * Every child starts as a pending panel: no URL is known yet (see
         * PanelLayer). It must be configured before sendToTarget, and never
         * navigated by the shell.
         */
        @Override
        public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
            WebView child = newWebView(Role.PANEL);
            panels.addPending(child);
            ((WebView.WebViewTransport) resultMsg.obj).setWebView(child);
            resultMsg.sendToTarget();
            return true;
        }

        /** window.close() from a panel (its close box, Escape). */
        @Override
        public void onCloseWindow(WebView window) {
            // Blink lets a page with one history entry close itself; the
            // tank stays.
            if (window == tank) {
                Log.i(LOG_TAG, "Ignored window.close() on the tank");
                return;
            }
            panels.close(window);
        }

        /** The page focused an open named window (its Window menu). */
        @Override
        public void onRequestFocus(WebView view) {
            panels.bringPanelToFront(view);
        }

        @Override
        public boolean onConsoleMessage(ConsoleMessage message) {
            Log.println(logPriority(message.messageLevel()), LOG_TAG,
                    message.message() + " (" + message.sourceId() + ":" + message.lineNumber() + ")");
            return true;
        }
    }
}
