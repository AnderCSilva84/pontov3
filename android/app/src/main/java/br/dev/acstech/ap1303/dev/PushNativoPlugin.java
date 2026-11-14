package br.dev.acstech.ap1303.dev;
import android.Manifest;
import android.os.Build;
import android.content.Intent;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;
import org.json.JSONObject;
import java.lang.ref.WeakReference;
import java.util.UUID;

@CapacitorPlugin(name="PushNativo",permissions={@Permission(alias="avisos",strings={Manifest.permission.POST_NOTIFICATIONS})})
public class PushNativoPlugin extends Plugin {
 private static WeakReference<PushNativoPlugin> instancia=new WeakReference<>(null);
 private boolean visivel=false;
 @Override public void load(){instancia=new WeakReference<>(this);if(!BuildConfig.CUIDADOS_DISPONIVEIS){if(android.os.Build.VERSION.SDK_INT>=26)((android.app.NotificationManager)getContext().getSystemService(android.content.Context.NOTIFICATION_SERVICE)).deleteNotificationChannel("cuidados");try{org.json.JSONObject anterior=new org.json.JSONObject(PushEstado.prefs(getContext()).getString("pendente","{}"));if(anterior.optString("canal").equals("cuidados")||anterior.optString("tipo").equals("lembrete")||anterior.optString("rota").startsWith("/lembretes"))PushEstado.prefs(getContext()).edit().remove("pendente").apply();}catch(Exception ignored){}}if(!configurado())PushEstado.limpar(getContext());PushEstado.capturar(getContext(),getActivity().getIntent());}
 @Override protected void handleOnNewIntent(Intent intent){PushEstado.capturar(getContext(),intent);}
 @Override protected void handleOnResume(){visivel=true;}
 @Override protected void handleOnPause(){visivel=false;}
 @Override protected void handleOnDestroy(){visivel=false;instancia.clear();}
 static boolean emPrimeiroPlano(){PushNativoPlugin p=instancia.get();return p!=null&&p.visivel;}
 static void emitir(String nome,JSONObject dados){PushNativoPlugin p=instancia.get();if(p!=null)p.getActivity().runOnUiThread(()->{try{p.notifyListeners(nome,JSObject.fromJSONObject(dados));}catch(Exception ignored){}});}
 private boolean configurado(){return PushEstado.configurado(getContext());}
 @PluginMethod public void estado(PluginCall call){JSObject d=new JSObject();d.put("configurado",configurado());d.put("permitido",NotificationManagerCompat.from(getContext()).areNotificationsEnabled());d.put("permissao",Build.VERSION.SDK_INT<33?"granted":getPermissionState("avisos").toString());d.put("ativo",PushEstado.prefs(getContext()).getBoolean("ativo",false));call.resolve(d);}
 @PluginMethod public void permissao(PluginCall call){if(Build.VERSION.SDK_INT<33){estado(call);return;}requestPermissionForAlias("avisos",call,"permissaoResultado");}
 @PermissionCallback private void permissaoResultado(PluginCall call){estado(call);}
 @PluginMethod public void contexto(PluginCall call){
  String uid=call.getString("uid",""),grupo=call.getString("grupoId","");
  if(!uid.matches("[A-Za-z0-9_-]{1,128}")||!grupo.matches("[A-Za-z0-9_-]{0,128}")){call.reject("Contexto inválido.");return;}
  if(!uid.equals(PushEstado.prefs(getContext()).getString("uid",""))||!grupo.equals(PushEstado.prefs(getContext()).getString("grupoId",""))){
   PushEstado.limpar(getContext());
   PushEstado.prefs(getContext()).edit().remove("instalacao").remove("registradoToken").remove("registradoUid").remove("registradoGrupo").putBoolean("rotacionar",true).apply();
  }
  PushEstado.prefs(getContext()).edit().putString("uid",uid).putString("grupoId",grupo).apply();call.resolve();
 }
 @PluginMethod public void token(PluginCall call){
  if(!configurado()){call.reject("FCM de teste não configurado neste APK demo.","PUSH_CONFIG");return;}
  if(!NotificationManagerCompat.from(getContext()).areNotificationsEnabled()){call.reject("Permita avisos nas configurações.","PUSH_PERMISSION");return;}
  if(PushEstado.prefs(getContext()).getBoolean("rotacionar",false)){
   FirebaseMessaging.getInstance().deleteToken().addOnCompleteListener(t->{if(!t.isSuccessful()){call.reject("Reconecte para renovar o registro de avisos.");return;}PushEstado.prefs(getContext()).edit().putBoolean("rotacionar",false).apply();token(call);});return;
  }
  FirebaseMessaging.getInstance().getToken().addOnCompleteListener(t->{if(!t.isSuccessful()){call.reject("Não foi possível obter o registro FCM.","PUSH_TOKEN");return;}String install=PushEstado.prefs(getContext()).getString("instalacao",null);if(install==null){install=UUID.randomUUID().toString();PushEstado.prefs(getContext()).edit().putString("instalacao",install).apply();}PushEstado.prefs(getContext()).edit().putString("token",t.getResult()).apply();JSObject d=new JSObject();d.put("token",t.getResult());d.put("instalacaoId",install);d.put("registrado",t.getResult().equals(PushEstado.prefs(getContext()).getString("registradoToken","")) && PushEstado.prefs(getContext()).getString("uid","").equals(PushEstado.prefs(getContext()).getString("registradoUid","")) && PushEstado.prefs(getContext()).getString("grupoId","").equals(PushEstado.prefs(getContext()).getString("registradoGrupo","")));call.resolve(d);});
 }
 @PluginMethod public void invalidarCadastro(PluginCall call){PushEstado.prefs(getContext()).edit().remove("registradoToken").apply();call.resolve();}
 @PluginMethod public void confirmarCadastro(PluginCall call){
  android.content.SharedPreferences p=PushEstado.prefs(getContext());
  if(!p.getString("uid","").equals(call.getString("uid"))||!p.getString("grupoId","").equals(call.getString("grupoId"))||!p.getString("token","").equals(call.getString("token"))){call.reject("Sessão alterada.");return;}
  p.edit().putString("registradoToken",call.getString("token")).putString("registradoUid",call.getString("uid")).putString("registradoGrupo",call.getString("grupoId")).apply();call.resolve();
 }
 @PluginMethod public void ativar(PluginCall call){android.content.SharedPreferences p=PushEstado.prefs(getContext());if(!p.getString("uid","").equals(call.getString("uid"))||!p.getString("grupoId","").equals(call.getString("grupoId"))||!p.getString("registradoToken","").equals(call.getString("token"))){call.reject("Sessão alterada.");return;}if(!configurado()){call.reject("FCM de teste não configurado.");return;}PushEstado.prefs(getContext()).edit().putBoolean("ativo",true).apply();call.resolve();}
 @PluginMethod public void suspender(PluginCall call){
  android.content.SharedPreferences p=PushEstado.prefs(getContext());
  String install=p.getString("instalacao","");boolean tinhaToken=!p.getString("token","").isEmpty();
  if(!install.isEmpty())p.edit().putString("revogada",install).putString("revogadaUid",p.getString("uid","")).putString("revogadaGrupo",p.getString("grupoId","")).remove("instalacao").apply();
  JSObject d=new JSObject();String uid=call.getString("uid","");
  d.put("instalacaoId",!uid.isEmpty()&&uid.equals(p.getString("revogadaUid",""))&&call.getString("grupoId","").equals(p.getString("revogadaGrupo",""))?p.getString("revogada",""):"");
  PushEstado.limpar(getContext());
  p.edit().remove("registradoToken").remove("registradoUid").remove("registradoGrupo").remove("token").putBoolean("rotacionar",true).apply();
  if(tinhaToken&&configurado())FirebaseMessaging.getInstance().deleteToken().addOnSuccessListener(v->p.edit().putBoolean("rotacionar",false).apply());call.resolve(d);
 }
 @PluginMethod public void confirmarRevogacao(PluginCall call){android.content.SharedPreferences p=PushEstado.prefs(getContext());if(p.getString("revogada","").equals(call.getString("instalacaoId","")))p.edit().remove("revogada").remove("revogadaUid").remove("revogadaGrupo").apply();call.resolve();}
 @PluginMethod public void pendente(PluginCall call){String raw=PushEstado.prefs(getContext()).getString("pendente",null);JSObject d=new JSObject();try{if(raw!=null){JSONObject obj=new JSONObject(raw);if(PushEstado.aceita(getContext(),obj))d.put("aviso",obj);}}catch(Exception ignored){}call.resolve(d);}
 @PluginMethod public void limparPendente(PluginCall call){PushEstado.prefs(getContext()).edit().remove("pendente").apply();call.resolve();}
 @PluginMethod public void removerAviso(PluginCall call){NotificationManagerCompat.from(getContext()).cancel(call.getString("eventId",""),PushEstado.numero(call.getString("eventId","")));call.resolve();}
 @PluginMethod public void configuracoes(PluginCall call){try{getActivity().startActivity(new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,getContext().getPackageName()));call.resolve();}catch(Exception e){call.reject("Abra as configurações do Android e permita as notificações do Tá no Ponto.");}}
}
