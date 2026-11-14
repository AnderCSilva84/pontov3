package br.dev.acstech.ap1303.dev;

import android.app.*;
import com.google.firebase.FirebaseApp;
import android.content.*;
import android.os.Build;
import android.net.Uri;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import org.json.JSONObject;
import java.util.*;

// Estado privado mínimo; não contém credenciais Firebase nem conteúdo de cuidados.
final class PushEstado {
 static boolean configurado(Context contexto){
  try(java.io.InputStream in=contexto.getAssets().open("public/mobile-build.json")){
   java.io.ByteArrayOutputStream b=new java.io.ByteArrayOutputStream();byte[] bytes=new byte[1024];int n;while((n=in.read(bytes))!=-1)b.write(bytes,0,n);
   JSONObject stamp=new JSONObject(b.toString("UTF-8"));
   return !FirebaseApp.getApps(contexto).isEmpty()&&PushFiltro.ambiente(BuildConfig.DEBUG,contexto.getPackageName(),stamp.optString("destino"),stamp.optString("projectId"),FirebaseApp.getInstance().getOptions().getProjectId(),stamp.optBoolean("emuladores",true),stamp.optString("host"));
  }catch(Exception ignored){return false;}
 }
 static android.content.SharedPreferences prefs(Context c){return c.getSharedPreferences("ap1303-push",Context.MODE_PRIVATE);}
 static synchronized void limpar(Context c){prefs(c).edit().putBoolean("ativo",false).remove("uid").remove("grupoId").remove("pendente").remove("vistos").apply();NotificationManagerCompat.from(c).cancelAll();}
 static boolean aceita(Context c,JSONObject d){return PushFiltro.recursoPermitido(BuildConfig.CUIDADOS_DISPONIVEIS,d.optString("canal"),d.optString("tipo"),d.optString("rota"))&&configurado(c)&&PushFiltro.aceita(prefs(c).getBoolean("ativo",false),prefs(c).getString("uid",""),prefs(c).getString("grupoId",""),d.optString("uid"),d.optString("grupoId"),d.optString("versao"),d.optString("eventId"),d.optString("expiraEm"),System.currentTimeMillis());}
 static int numero(String id){return id.hashCode()&0x7fffffff;}
 static synchronized void receber(Context c,JSONObject d){
  if(!aceita(c,d)){PushDiagnostico.etapa("descartada_contexto");return;}
  if(!NotificationManagerCompat.from(c).areNotificationsEnabled()){PushDiagnostico.etapa("descartada_permissao");return;}
  String id=d.optString("eventId");String vistos=PushFiltro.registrar(prefs(c).getString("vistos",""),id);if(vistos==null)return;
  prefs(c).edit().putString("vistos",vistos).apply();
  if(PushNativoPlugin.emPrimeiroPlano()){PushDiagnostico.etapa("primeiro_plano");PushNativoPlugin.emitir("mensagem",d);return;}
  String canal=d.optString("canal");if(!Arrays.asList("tarefas","cuidados","compras","ponto").contains(canal))canal="ponto";
  NotificationManager manager=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
  if(Build.VERSION.SDK_INT>=26)manager.createNotificationChannel(new NotificationChannel(canal,"Tá no Ponto · "+canal,NotificationManager.IMPORTANCE_DEFAULT));
  NotificationCompat.Builder n=new NotificationCompat.Builder(c,canal).setSmallIcon(R.drawable.ic_notificacao).setContentTitle("Tá no Ponto").setContentText("Há uma atualização no aplicativo.").setVisibility(NotificationCompat.VISIBILITY_PRIVATE).setOnlyAlertOnce(true).setAutoCancel(false).setTimeoutAfter(Math.max(1,d.optLong("expiraEm")-System.currentTimeMillis()));
  if("alimentacao".equals(d.optString("conteudo"))&&"tarefas".equals(canal)&&Arrays.asList("/tarefas","/alimentacao").contains(d.optString("rota"))){
   String titulo=d.optString("title","Hora da refeição"),texto=d.optString("body","");
   titulo=titulo.substring(0,Math.min(100,titulo.length()));texto=texto.substring(0,Math.min(300,texto.length()));
   n.setContentTitle(titulo).setContentText(texto).setStyle(new NotificationCompat.BigTextStyle().bigText(texto));
  }
  n.setContentIntent(intent(c,d,false));
  if(Arrays.asList("tarefa","tarefa_fixa","lembrete").contains(d.optString("tipo"))){
   NotificationCompat.Action.Builder action=new NotificationCompat.Action.Builder(R.drawable.ic_notificacao,d.optString("tipo").equals("lembrete")?"Confirmar cuidado":"Concluir tarefa",intent(c,d,true));
   // Abre Activity sem showWhenLocked: autenticação/confirmação ocorre após desbloqueio.
   if(Build.VERSION.SDK_INT>=31)action.setAuthenticationRequired(true);
   n.addAction(action.build());
  }
  try{NotificationManagerCompat.from(c).notify(id,numero(id),n.build());PushDiagnostico.etapa("exibida");}catch(SecurityException ignored){PushDiagnostico.etapa("descartada_permissao");/* Recusa não impede o uso do app. */}
 }
 static PendingIntent intent(Context c,JSONObject d,boolean acao){
  Intent i=new Intent(c,MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP|Intent.FLAG_ACTIVITY_CLEAR_TOP).setData(Uri.parse("ap1303-interno://aviso/"+d.optString("eventId")+"/"+acao));
  i.putExtra("ap1303Aviso",d.toString()).putExtra("ap1303Acao",acao);
  return PendingIntent.getActivity(c,numero(d.optString("eventId")+acao),i,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
 }
 static synchronized void capturar(Context c,Intent i){
  String raw=i.getStringExtra("ap1303Aviso");if(raw==null)return;i.removeExtra("ap1303Aviso");
  try{JSONObject d=new JSONObject(raw);if(!aceita(c,d))return;d.put("acao",i.getBooleanExtra("ap1303Acao",false));prefs(c).edit().putString("pendente",d.toString()).apply();PushNativoPlugin.emitir("toque",d);}catch(Exception ignored){}
 }
}
