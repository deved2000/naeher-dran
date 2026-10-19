package app.naeherdran;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/** Zeigt das Kartenspiel (assets/index.html) bildschirmfüllend in einer WebView. */
public class MainActivity extends Activity {

    private static final int INK = 0xFF1F2733;
    private WebView web;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window w = getWindow();
        w.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON); // Bildschirm bleibt beim Spielen an
        w.setStatusBarColor(INK);
        w.setNavigationBarColor(INK);

        web = new WebView(this);
        web.setBackgroundColor(INK);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        web.setOverScrollMode(WebView.OVER_SCROLL_NEVER);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);   // Spielstand merken
        s.setTextZoom(100);             // Layout unabhängig von der System-Schriftgröße
        s.setSupportZoom(false);

        web.setWebViewClient(new WebViewClient());
        web.addJavascriptInterface(new Bridge(), "Android");
        setContentView(web);
        web.loadUrl("file:///android_asset/index.html");
    }

    @Override
    public void onBackPressed() {
        if (web == null) {
            finish();
            return;
        }
        web.evaluateJavascript("(window.onAndroidBack && window.onAndroidBack()) ? true : false",
                new ValueCallback<String>() {
                    @Override
                    public void onReceiveValue(String value) {
                        if (!"true".equals(value)) {
                            finish();
                        }
                    }
                });
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }

    /** Wird aus JavaScript aufgerufen, damit die Systemleisten zur Kartenfarbe passen. */
    public class Bridge {
        @JavascriptInterface
        public void setBarColor(final String hex) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        int c = Color.parseColor(hex);
                        getWindow().setNavigationBarColor(c);
                        getWindow().setStatusBarColor(c);
                    } catch (IllegalArgumentException e) {
                        // ungültige Farbe ignorieren
                    }
                }
            });
        }
    }
}
