package br.com.timeescoladenegocios.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String PRODUCTION_HOST = "app.timeescoladenegocios.com.br";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(MobilePolicyPlugin.class);
        super.onCreate(savedInstanceState);
        handleIncomingIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIncomingIntent(intent);
    }

    private Uri productionUrl(Uri incomingUrl) {
        if (incomingUrl == null) {
            return null;
        }

        if ("https".equalsIgnoreCase(incomingUrl.getScheme())
            && PRODUCTION_HOST.equalsIgnoreCase(incomingUrl.getHost())) {
            return incomingUrl;
        }

        if (!"timeescola".equalsIgnoreCase(incomingUrl.getScheme())
            || !"auth".equalsIgnoreCase(incomingUrl.getHost())) {
            return null;
        }

        String path = incomingUrl.getEncodedPath();
        String authPath = path == null || path.isEmpty() ? "/auth/confirm" : "/auth" + path;
        return incomingUrl.buildUpon()
            .scheme("https")
            .authority(PRODUCTION_HOST)
            .encodedPath(authPath)
            .build();
    }

    private void handleIncomingIntent(Intent intent) {
        Uri url = productionUrl(intent == null ? null : intent.getData());
        if (url == null || getBridge() == null) {
            return;
        }

        getBridge().getWebView().post(() -> getBridge().getWebView().loadUrl(url.toString()));
    }
}
