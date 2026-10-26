package br.dev.acstech.ap1303.dev;

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

// Ponte local apenas para estado/permissão e configurações. Decodificação continua no JS.
@CapacitorPlugin(name = "CameraQr", permissions = {
    @Permission(alias = "camera", strings = { Manifest.permission.CAMERA })
})
public class CameraQrPlugin extends Plugin {
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
