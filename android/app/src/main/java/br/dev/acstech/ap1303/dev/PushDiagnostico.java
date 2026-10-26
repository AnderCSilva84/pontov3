package br.dev.acstech.ap1303.dev;

import android.util.Log;

// Opt-in local de desenvolvimento. Só códigos de etapa, nunca payload/token.
final class PushDiagnostico {
    static void etapa(String etapa) {
        if (BuildConfig.DEBUG && Log.isLoggable("AP1303Push", Log.DEBUG)) {
            Log.d("AP1303Push", etapa);
        }
    }
}
