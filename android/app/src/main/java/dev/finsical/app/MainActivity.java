package dev.finsical.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
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
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.ValueCallback;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.OptionalInt;
import java.util.TimeZone;
import java.util.UUID;

/**
 * Finsical's Android shell: the tank page full screen in its browser mode,
 * with the page's own Mac OS 8 menu bar and Add-ons button, served from the
 * APK's assets on the app origin (AppOrigin, AssetServer).
 *
 * <p>The page opens Preferences, Tank Overview, Tank Stats and Import
 * Add-ons with window.open; each becomes a panel over the tank
 * (PanelLayer), and the pages talk to the tank over BroadcastChannel,
 * which spans every WebView in the app. Back closes the top panel. The one
 * JS bridge is the tank's {@value BlobDownload#INTERFACE_NAME}, which only
 * hands blob: downloads back to the shell (see BlobDownload).
 */
public final class MainActivity extends Activity {
    static final String LOG_TAG = "Finsical";

    private static final int REQUEST_SAVE_DOWNLOAD = 1;
    private static final int REQUEST_OPEN_DOCUMENT = 2;
    /**
     * What the document picker offers the page's file inputs: Import Tank
     * accepts ".fins,application/json", and .fins has no MIME type the
     * picker could filter on.
     */
    private static final String ANY_TYPE = "*/*";
    /** How evaluateJavascript reports a script that completed with true. */
    private static final String JS_TRUE = "true";
    /** Longest URL a log line quotes: data: URLs run to hundreds of KB. */
    private static final int MAX_LOGGED_URL = 100;
    private static final int MESSAGE_PADDING_DP = 24;
    private static final int MESSAGE_TEXT_SP = 18;

    /** What a WebView is for; configure differs only in the background. */
    private enum Role { TANK, PANEL }

    /** A download's bytes while the user picks where to save them. */
    private static final class PendingSave {
        final byte[] bytes;
        final DownloadTarget.Kind kind;

        PendingSave(byte[] bytes, DownloadTarget.Kind kind) {
            this.bytes = bytes;
            this.kind = kind;
        }
    }

    private FrameLayout root;
    private WebView tank;
    private PanelLayer panels;
    private ShellClient client;
    private final ShellChromeClient chrome = new ShellChromeClient();
    private SmokeTest smoke;
    /** Registered while a panel is open, on API 33+; see syncBackCallback. */
    private OnBackInvokedCallback panelBack;
    // Back to the UI thread from PageBridge (WebView's JavaBridge thread)
    // and from the thread that writes a saved file.
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    /**
     * blob: downloads the tank page is reading: token -> kind. UI thread
     * only. A read whose page reloaded before answering stays until the
     * Activity goes, a few bytes.
     */
    private final Map<String, DownloadTarget.Kind> pendingReads = new HashMap<>();
    /** Set while the save picker is open; one save at a time. */
    private PendingSave pendingSave;
    /** The page's file input waiting for the document picker's answer. */
    private ValueCallback<Uri[]> pendingFileChooser;
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
        // Before the first load, which is when it appears on the page. The
        // tank only: popups lose interfaces when WebView binds them.
        tank.addJavascriptInterface(new PageBridge(), BlobDownload.INTERFACE_NAME);
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
        view.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) ->
                onDownload(url, mimeType));
        if (role == Role.PANEL) {
            // Client pages are transparent around the window they draw (the
            // corner notches of its 1 px shadow); the tank shows through.
            view.setBackgroundColor(Color.TRANSPARENT);
        }
        return view;
    }

    // ---- Downloads: Take a Picture, Export Tank --------------------------

    /**
     * The page's {@code <a download>} clicks. Take a Picture and Export
     * Tank hand over blob: URLs, which the tank page reads for the shell
     * (readBlob); Take a Picture falls back to a data: PNG where
     * canvas.toBlob fails. WebView does not pass on the file name, so
     * DownloadTarget names the file from its type, and the user picks where
     * to save it (no storage permission, one code path for every API level).
     */
    private void onDownload(String url, String mimeType) {
        if (DataUrl.parse(url).isPresent()) {
            saveDataUrl(url);
            return;
        }
        if (BlobDownload.isBlob(url)) {
            readBlob(url, mimeType);
            return;
        }
        Uri uri = Uri.parse(url);
        if (destination(uri) == AppOrigin.Destination.WEB) {
            openExternal(uri);
            return;
        }
        Log.w(LOG_TAG, "Ignored a download this app cannot handle: " + forLog(url));
    }

    /**
     * Asks the tank page to read a blob: download at once (the page revokes
     * the URL seconds after the click) and hand it back as a data: URL
     * through PageBridge. The tank reads it even when a panel made the
     * blob: only the tank has the interface, and every page of the origin
     * can read the origin's blob: URLs.
     */
    private void readBlob(String url, String mimeType) {
        DownloadTarget.Kind kind = targetFor(mimeType).kind;
        if (!BlobDownload.isAppBlob(url)) {
            Log.w(LOG_TAG, "Ignored a blob: download that is not the app's: " + forLog(url));
            return;
        }
        if (!tankOnAppOrigin()) {
            Log.e(LOG_TAG, "Cannot read a blob: download: the tank is not showing the app");
            toast(failedMessage(kind));
            return;
        }

        // A random token ties the answer to this request, so a stray call
        // to the interface cannot start a save.
        String token = UUID.randomUUID().toString();
        pendingReads.put(token, kind);
        tank.evaluateJavascript(BlobDownload.readerScript(url, token), started -> {
            // A destroyed tank (tank == null) has nothing left to report to.
            if (JS_TRUE.equals(started) || tank == null) {
                return;
            }
            pendingReads.remove(token);
            Log.e(LOG_TAG, "The tank page could not start reading a download (it has no "
                    + BlobDownload.INTERFACE_NAME + ")");
            toast(failedMessage(kind));
        });
    }

    /**
     * The tank page's way back to the shell, as window.FinsicalAndroid
     * (BlobDownload.INTERFACE_NAME); only the reader script calls it.
     * WebView calls these methods on its JavaBridge thread while the page
     * waits for them to return, so they only hand over to the UI thread.
     */
    private final class PageBridge {
        @JavascriptInterface
        public void deliver(String token, String dataUrl) {
            mainHandler.post(() -> {
                if (claimRead(token).isPresent()) {
                    saveDataUrl(dataUrl);
                }
            });
        }

        @JavascriptInterface
        public void fail(String token, String reason) {
            mainHandler.post(() -> {
                Optional<DownloadTarget.Kind> kind = claimRead(token);
                if (kind.isPresent()) {
                    Log.e(LOG_TAG, "The tank page could not read a download: " + reason);
                    toast(failedMessage(kind.get()));
                }
            });
        }
    }

    /**
     * The kind of the pending read that `token` names, which it removes;
     * empty for a call the shell did not ask for or from a tank that has
     * left the app origin.
     */
    private Optional<DownloadTarget.Kind> claimRead(String token) {
        if (!tankOnAppOrigin()) {
            Log.w(LOG_TAG, "Ignored a download report: the tank is not showing the app");
            return Optional.empty();
        }
        // HashMap takes a null key: a token-less call is simply unknown.
        Optional<DownloadTarget.Kind> kind = Optional.ofNullable(pendingReads.remove(token));
        if (!kind.isPresent()) {
            Log.w(LOG_TAG, "Ignored a download report the shell did not ask for");
        }
        return kind;
    }

    /** Whether the tank exists and shows a page of the app origin. */
    private boolean tankOnAppOrigin() {
        if (tank == null) {
            return false;
        }
        String url = tank.getUrl();
        if (url == null) {
            return false;
        }
        Uri uri = Uri.parse(url);
        return AppOrigin.isApp(uri.getScheme(), uri.getHost(), uri.getPort());
    }

    /** Decodes a base64 data: download and asks the user where to save it. */
    private void saveDataUrl(String url) {
        Optional<DataUrl> parsed = DataUrl.parse(url);
        DownloadTarget target = targetFor(parsed.isPresent() ? parsed.get().mimeType : null);
        if (!parsed.isPresent() || !parsed.get().base64) {
            Log.e(LOG_TAG, "Cannot save a download that is not a base64 data: URL: " + forLog(url));
            toast(failedMessage(target.kind));
            return;
        }
        if (url.length() > BlobDownload.MAX_DATA_URL_CHARS) {
            Log.e(LOG_TAG, "Refused a " + url.length() + "-character download; the limit is "
                    + BlobDownload.MAX_DATA_URL_CHARS);
            toast(failedMessage(target.kind));
            return;
        }
        if (pendingSave != null) {
            Log.w(LOG_TAG, "Refused a download while the save picker is open for another");
            toast(R.string.save_busy);
            return;
        }

        byte[] bytes;
        try {
            bytes = Base64.decode(url.substring(parsed.get().payloadStart), Base64.DEFAULT);
        } catch (IllegalArgumentException e) {
            Log.e(LOG_TAG, "A download handed over data that is not valid base64", e);
            toast(failedMessage(target.kind));
            return;
        }

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT)
                .addCategory(Intent.CATEGORY_OPENABLE)
                .setType(target.documentMimeType)
                .putExtra(Intent.EXTRA_TITLE, target.fileName);
        try {
            startActivityForResult(intent, REQUEST_SAVE_DOWNLOAD);
        } catch (ActivityNotFoundException e) {
            Log.e(LOG_TAG, "No app can create a document to save the download in", e);
            toast(R.string.save_no_app);
            return;
        }
        pendingSave = new PendingSave(bytes, target.kind);
    }

    private static DownloadTarget targetFor(String mimeType) {
        return DownloadTarget.forMimeType(mimeType, new Date(), TimeZone.getDefault());
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        switch (requestCode) {
            case REQUEST_SAVE_DOWNLOAD:
                onSaveDocumentChosen(resultCode, data);
                break;
            case REQUEST_OPEN_DOCUMENT:
                onOpenDocumentChosen(resultCode, data);
                break;
            default:
                super.onActivityResult(requestCode, resultCode, data);
                break;
        }
    }

    private void onSaveDocumentChosen(int resultCode, Intent data) {
        PendingSave save = pendingSave;
        pendingSave = null;
        Uri document = data == null ? null : data.getData();
        if (resultCode != RESULT_OK || document == null) {
            Log.i(LOG_TAG, "Saving the download was cancelled");
            return;
        }
        if (save == null) {
            // The process was killed while the picker was open, and the
            // download with it. Remove the empty file the picker created.
            Log.e(LOG_TAG, "The download was lost while the file picker was open");
            deleteDocument(document);
            toast(R.string.save_lost);
            return;
        }
        writeDocument(document, save);
    }

    private void writeDocument(Uri document, PendingSave save) {
        ContentResolver resolver = getContentResolver();
        Context app = getApplicationContext();
        int saved = savedMessage(save.kind);
        int failed = failedMessage(save.kind);
        // Off the UI thread: the document may live with a slow provider
        // (a cloud drive).
        new Thread(() -> {
            int message = write(resolver, document, save.bytes) ? saved : failed;
            mainHandler.post(() -> Toast.makeText(app, message, Toast.LENGTH_LONG).show());
        }, "finsical-save-download").start();
    }

    private static boolean write(ContentResolver resolver, Uri document, byte[] bytes) {
        try (OutputStream out = resolver.openOutputStream(document)) {
            if (out == null) {
                throw new IOException("the document provider returned no stream");
            }
            out.write(bytes);
            return true;
        } catch (IOException | SecurityException e) {
            Log.e(LOG_TAG, "Cannot write the download to " + document, e);
            return false;
        }
    }

    private void deleteDocument(Uri document) {
        try {
            if (!DocumentsContract.deleteDocument(getContentResolver(), document)) {
                Log.w(LOG_TAG, "Cannot delete the empty file " + document);
            }
        } catch (RuntimeException | IOException e) {
            Log.w(LOG_TAG, "Cannot delete the empty file " + document, e);
        }
    }

    private static int savedMessage(DownloadTarget.Kind kind) {
        switch (kind) {
            case PICTURE:
                return R.string.picture_saved;
            case TANK:
                return R.string.tank_saved;
            default:
                return R.string.file_saved;
        }
    }

    private static int failedMessage(DownloadTarget.Kind kind) {
        switch (kind) {
            case PICTURE:
                return R.string.picture_failed;
            case TANK:
                return R.string.tank_failed;
            default:
                return R.string.file_failed;
        }
    }

    // ---- File inputs: Import Tank ---------------------------------------

    /**
     * An {@code <input type=file>} click, from any WebView. The page gets
     * the picked documents' content: URIs, or null when the user cancels or
     * nothing can pick; exactly once either way, as WebView requires.
     */
    private boolean showFileChooser(ValueCallback<Uri[]> callback, WebChromeClient.FileChooserParams params) {
        // An unanswered earlier request would leave its page waiting.
        cancelFileChooser();
        boolean multiple = params.getMode() == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE;
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT)
                .addCategory(Intent.CATEGORY_OPENABLE)
                .setType(ANY_TYPE)
                .putExtra(Intent.EXTRA_ALLOW_MULTIPLE, multiple);
        try {
            startActivityForResult(intent, REQUEST_OPEN_DOCUMENT);
        } catch (ActivityNotFoundException e) {
            Log.e(LOG_TAG, "No app can open a document for the page's file input", e);
            toast(R.string.open_no_app);
            callback.onReceiveValue(null);
            return true;
        }
        pendingFileChooser = callback;
        return true;
    }

    private void onOpenDocumentChosen(int resultCode, Intent data) {
        ValueCallback<Uri[]> callback = pendingFileChooser;
        pendingFileChooser = null;
        if (callback == null) {
            // The process or Activity was recreated while the picker was
            // open: the page that asked is gone, and so is its callback.
            Log.w(LOG_TAG, "Dropped a picked document: the page that asked for it is gone");
            return;
        }
        if (resultCode != RESULT_OK) {
            Log.i(LOG_TAG, "Opening a document was cancelled");
            callback.onReceiveValue(null);
            return;
        }
        callback.onReceiveValue(pickedDocuments(data));
    }

    /** The documents in a picker result, or null for none. */
    private static Uri[] pickedDocuments(Intent data) {
        if (data == null) {
            return null;
        }
        List<Uri> uris = new ArrayList<>();
        // With EXTRA_ALLOW_MULTIPLE the picks come as ClipData, and some
        // pickers also put a single pick there.
        ClipData clip = data.getClipData();
        if (clip != null) {
            for (int i = 0; i < clip.getItemCount(); i++) {
                Uri uri = clip.getItemAt(i).getUri();
                if (uri != null) {
                    uris.add(uri);
                }
            }
        }
        if (uris.isEmpty() && data.getData() != null) {
            uris.add(data.getData());
        }
        return uris.isEmpty() ? null : uris.toArray(new Uri[0]);
    }

    /** Answers a waiting file input with "nothing picked". */
    private void cancelFileChooser() {
        ValueCallback<Uri[]> callback = pendingFileChooser;
        pendingFileChooser = null;
        if (callback != null) {
            callback.onReceiveValue(null);
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
        // While the WebViews can still take the answer.
        cancelFileChooser();
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
        if (url == null) {
            return "null";
        }
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

    /**
     * Turns window.open into panels, answers file inputs and forwards the
     * pages' console.
     */
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

        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            return showFileChooser(callback, params);
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
