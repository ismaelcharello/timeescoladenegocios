package br.com.timeescoladenegocios.app;

import android.app.AlertDialog;
import android.net.Uri;
import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "MobilePolicy")
public class MobilePolicyPlugin extends Plugin {
    private static final String PRODUCTION_HOST = "app.timeescoladenegocios.com.br";

    @Override
    public Boolean shouldOverrideLoad(Uri url) {
        if (!PRODUCTION_HOST.equalsIgnoreCase(url.getHost())) {
            return null;
        }

        String path = url.getPath();
        if (path != null && (path.equals("/checkout") || path.startsWith("/checkout/"))) {
            getActivity().runOnUiThread(() -> new AlertDialog.Builder(getActivity())
                .setTitle("Assinatura pelo app")
                .setMessage("A compra mobile será liberada após a definição de pagamento das lojas. Membros ativos podem continuar entrando normalmente.")
                .setPositiveButton("Entendi", null)
                .show());
            return true;
        }

        return null;
    }
}
