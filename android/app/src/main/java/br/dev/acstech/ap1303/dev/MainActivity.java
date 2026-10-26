package br.dev.acstech.ap1303.dev;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.webkit.WebSettings;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CameraQrPlugin.class);
        registerPlugin(PdfArquivosPlugin.class);
        registerPlugin(PushNativoPlugin.class);
        super.onCreate(savedInstanceState);
        // HTTP permitido somente no debug e somente no domínio configurado
        // pelo network-security-config debug. Release permanece bloqueado.
        if (BuildConfig.DEBUG) {
            try (java.io.InputStream in = getAssets().open("public/mobile-build.json")) {
                java.io.ByteArrayOutputStream bytes = new java.io.ByteArrayOutputStream();
                byte[] buffer = new byte[1024];
                int count;
                while ((count = in.read(buffer)) != -1) bytes.write(buffer, 0, count);
                JSONObject stamp = new JSONObject(bytes.toString("UTF-8"));
                if ("emuladores".equals(stamp.optString("destino"))) {
                    getBridge().getWebView().getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
                }
            } catch (Exception ignored) { /* Falha fechada: não habilita HTTP. */ }
        }
    }
}
