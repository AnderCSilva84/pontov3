package br.dev.acstech.ap1303.dev;

import android.Manifest;
import android.app.Activity;
import android.app.Application;
import android.os.Bundle;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.JSObject;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.tasks.Task;
import com.google.android.gms.common.GoogleApiAvailability;
import com.google.android.gms.common.moduleinstall.ModuleInstall;
import com.google.android.gms.common.moduleinstall.ModuleInstallRequest;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.codescanner.GmsBarcodeScanner;
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions;
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

// Leitura QR local. O leitor web permanece como alternativa explícita.
@CapacitorPlugin(name = "CameraQr", permissions = {
    @Permission(alias = "camera", strings = { Manifest.permission.CAMERA })
})
public class CameraQrPlugin extends Plugin {
    private PluginCall leituraPendente;
    private final ScannerQrSessao sessaoScanner = new ScannerQrSessao();
    private Application.ActivityLifecycleCallbacks observadorCaptura;
    private Task<Barcode> tarefaScanner;
    private boolean diagnosticoAtivo;
    private int criadas, retomadas, pausadas, destruidas, cancelamentos, conclusoes, recuperacoes;
    // Observação somente: o nome é do SDK 16.1.0 fixado no projeto.
    // Nenhuma decisão de captura depende deste observador.
    private boolean telaGoogle(Activity activity) {
        return activity.getClass().getName().equals("com.google.mlkit.vision.codescanner.internal.GmsBarcodeScanningDelegateActivity");
    }
    private final Application.ActivityLifecycleCallbacks observador = new Application.ActivityLifecycleCallbacks() {
        public void onActivityCreated(Activity a, Bundle b) { if (telaGoogle(a)) criadas++; }
        public void onActivityResumed(Activity a) { if (telaGoogle(a)) retomadas++; }
        public void onActivityPaused(Activity a) { if (telaGoogle(a)) pausadas++; }
        public void onActivityDestroyed(Activity a) { if (telaGoogle(a)) destruidas++; }
        public void onActivityStarted(Activity a) {}
        public void onActivityStopped(Activity a) {}
        public void onActivitySaveInstanceState(Activity a, Bundle b) {}
    };

    // Identificação restrita à versão 16.1.0 fixada. Sem reflexão ou alteração do SDK.
    private void observarCaptura(final long rodada) {
        observadorCaptura = new Application.ActivityLifecycleCallbacks() {
            public void onActivityCreated(Activity a, Bundle b) { if (telaGoogle(a)) sessaoScanner.criada(rodada, a); }
            public void onActivityDestroyed(Activity a) {
                if (telaGoogle(a)) sessaoScanner.destruida(rodada, a, a.isFinishing(), a.isChangingConfigurations());
            }
            public void onActivityResumed(Activity a) {}
            public void onActivityPaused(Activity a) {}
            public void onActivityStarted(Activity a) {}
            public void onActivityStopped(Activity a) {}
            public void onActivitySaveInstanceState(Activity a, Bundle b) {}
        };
        getActivity().getApplication().registerActivityLifecycleCallbacks(observadorCaptura);
    }

    private void pararObservacaoCaptura() {
        if (observadorCaptura == null) return;
        getActivity().getApplication().unregisterActivityLifecycleCallbacks(observadorCaptura);
        observadorCaptura = null;
    }

    @PluginMethod
    public void diagnosticoSessaoNativa(PluginCall call) {
        if (!BuildConfig.DEBUG) { call.reject("Diagnóstico disponível apenas no APK de teste.", "qr/indisponivel"); return; }
        getActivity().runOnUiThread(() -> {
            boolean ativar = Boolean.TRUE.equals(call.getBoolean("ativo", true));
            if (ativar && !diagnosticoAtivo) {
                criadas = retomadas = pausadas = destruidas = cancelamentos = conclusoes = recuperacoes = 0;
                getActivity().getApplication().registerActivityLifecycleCallbacks(observador);
            } else if (!ativar && diagnosticoAtivo) {
                getActivity().getApplication().unregisterActivityLifecycleCallbacks(observador);
            }
            diagnosticoAtivo = ativar;
            JSObject value = new JSObject();
            value.put("travaAtiva", sessaoScanner.aberta());
            value.put("chamadaPendente", leituraPendente != null);
            value.put("taskPendente", tarefaScanner != null && !tarefaScanner.isComplete());
            value.put("taskConcluida", tarefaScanner != null && tarefaScanner.isComplete());
            value.put("janelaComFoco", getActivity().hasWindowFocus());
            value.put("telaEncerradaDefinitiva", sessaoScanner.telaEncerrada());
            value.put("sessoesRecuperadas", recuperacoes);
            value.put("telasCriadas", criadas);
            value.put("telasRetomadas", retomadas);
            value.put("telasPausadas", pausadas);
            value.put("telasDestruidas", destruidas);
            value.put("cancelamentosSolicitados", cancelamentos);
            value.put("tasksConcluidas", conclusoes);
            call.resolve(value);
        });
    }

    private GmsBarcodeScanner scanner() {
        GmsBarcodeScannerOptions options = new GmsBarcodeScannerOptions.Builder()
            .setBarcodeFormats(Barcode.FORMAT_QR_CODE).enableAutoZoom().build();
        return GmsBarcodeScanning.getClient(getActivity(), options);
    }

    private boolean autorizarScanner(PluginCall call) {
        if (GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(getContext()) != ConnectionResult.SUCCESS) {
            call.reject("Google Play services indisponível. Use o leitor atual.", "qr/servicos"); return false;
        }
        return true;
    }

    @PluginMethod
    public void estadoScannerNativo(PluginCall call) {
        if (!autorizarScanner(call)) return;
        ModuleInstall.getClient(getContext()).areModulesAvailable(scanner())
            .addOnSuccessListener(r -> { JSObject value = new JSObject(); value.put("disponivel", r.areModulesAvailable()); call.resolve(value); })
            .addOnFailureListener(e -> call.reject("Não foi possível verificar o módulo. Use o leitor atual.", "qr/modulo"));
    }

    // Download somente por gesto explícito; não há metadado de download automático.
    @PluginMethod
    public void prepararScannerNativo(PluginCall call) {
        if (!autorizarScanner(call)) return;
        ModuleInstallRequest request = ModuleInstallRequest.newBuilder().addApi(scanner()).build();
        ModuleInstall.getClient(getContext()).installModules(request)
            .addOnSuccessListener(r -> call.resolve())
            .addOnFailureListener(e -> call.reject("Preparação indisponível. Conecte-se e tente novamente, ou use o leitor atual.", "qr/modulo"));
    }

    @PluginMethod
    public void escanearNativo(PluginCall call) {
        if (!autorizarScanner(call)) return;
        getActivity().runOnUiThread(() -> {
            // Só o gesto de nova leitura pode recuperar uma tela comprovadamente encerrada.
            // Pausa, falta de foco, rotação ou tela não observada mantêm a trava.
            boolean taskPendente = tarefaScanner != null && !tarefaScanner.isComplete();
            if (sessaoScanner.recuperar(getActivity().hasWindowFocus(), taskPendente)) {
                if (diagnosticoAtivo) recuperacoes++;
                pararObservacaoCaptura();
                PluginCall anterior = leituraPendente;
                leituraPendente = null; tarefaScanner = null;
                if (anterior != null) anterior.reject("Sessão anterior encerrada.", "qr/cancelado");
            }
            final long rodada = sessaoScanner.iniciar();
            if (rodada == 0) { call.reject("Já existe uma leitura nativa aberta.", "qr/ocupado"); return; }
            leituraPendente = call;
            try {
                observarCaptura(rodada);
                tarefaScanner = scanner().startScan();
                tarefaScanner
                    .addOnSuccessListener(barcode -> {
                        if (leituraPendente != call) return;
                        if (!sessaoScanner.vigente(rodada)) return;
                        String texto = barcode.getRawValue();
                        if (texto == null || texto.trim().isEmpty() || texto.length() > 4096) {
                            call.reject("QR vazio ou grande demais.", "qr/invalido"); return;
                        }
                        JSObject value = new JSObject(); value.put("textoBruto", texto); call.resolve(value);
                    })
                    .addOnCanceledListener(() -> { if (sessaoScanner.vigente(rodada) && leituraPendente == call) call.reject("Leitura cancelada.", "qr/cancelado"); })
                    .addOnFailureListener(e -> { if (sessaoScanner.vigente(rodada) && leituraPendente == call) call.reject("Leitor nativo indisponível. Use o leitor atual.", "qr/leitura"); })
                    .addOnCompleteListener(t -> {
                        if (diagnosticoAtivo) conclusoes++;
                        if (!sessaoScanner.encerrar(rodada)) return;
                        pararObservacaoCaptura();
                        if (leituraPendente == call) leituraPendente = null;
                        tarefaScanner = null;
                    });
            } catch (Exception ignored) {
                sessaoScanner.encerrar(rodada); pararObservacaoCaptura();
                leituraPendente = null; tarefaScanner = null;
                call.reject("Não foi possível abrir o leitor nativo.", "qr/leitura");
            }
        });
    }

    @PluginMethod
    public void cancelarScannerNativo(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (diagnosticoAtivo) cancelamentos++;
            PluginCall anterior = leituraPendente;
            leituraPendente = null;
            if (anterior != null) anterior.reject("Resultado descartado.", "qr/cancelado");
            // O SDK não oferece fechamento remoto: o usuário fecha a tela Google com Voltar.
            // A trava permanece até o Task terminar ou uma nova tentativa comprovar tela encerrada.
            call.resolve();
        });
    }

    @Override
    protected void handleOnDestroy() {
        sessaoScanner.invalidar();
        pararObservacaoCaptura();
        if (diagnosticoAtivo) getActivity().getApplication().unregisterActivityLifecycleCallbacks(observador);
        diagnosticoAtivo = false;
        tarefaScanner = null;
        PluginCall anterior = leituraPendente;
        leituraPendente = null;
        if (anterior != null) anterior.reject("Sessão encerrada.", "qr/cancelado");
        super.handleOnDestroy();
    }

    @PluginMethod
    public void abrirConfiguracoes(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception ignored) {
            call.reject("Não foi possível abrir as configurações do aplicativo.");
        }
    }
}
