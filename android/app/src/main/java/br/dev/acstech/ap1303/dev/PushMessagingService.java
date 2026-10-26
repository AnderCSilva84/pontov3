package br.dev.acstech.ap1303.dev;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import org.json.JSONObject;
public class PushMessagingService extends FirebaseMessagingService {
 @Override public void onMessageReceived(RemoteMessage message){
  PushDiagnostico.etapa("recebida");
  // Sem notification payload: este serviço é o único exibidor em background.
  if(!PushEstado.configurado(this)){PushDiagnostico.etapa("descartada_configuracao");return;}
  if(message.getNotification()!=null){PushDiagnostico.etapa("descartada_transporte");return;}
  PushEstado.receber(this,new JSONObject(message.getData()));
 }
 @Override public void onNewToken(String token){
  if(!PushEstado.configurado(this))return;
  PushEstado.prefs(this).edit().putString("token",token).apply();
  PushNativoPlugin.emitir("token",new com.getcapacitor.JSObject());
 }
}
