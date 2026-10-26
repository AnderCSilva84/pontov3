package br.dev.acstech.ap1303.dev;
import java.util.*;
final class PushFiltro {
 static boolean recursoPermitido(boolean cuidados,String canal,String tipo,String rota){return cuidados||!("cuidados".equals(canal)||"lembrete".equals(tipo)||rota.startsWith("/lembretes"));}
 static boolean ambiente(boolean debug,String pacote,String destino,String projeto,String projetoNativo,boolean emuladores,String host){
  if(!projeto.equals(projetoNativo))return false;
  if(debug)return "br.dev.acstech.ap1303.dev".equals(pacote)&&"teste".equals(destino)&&!"ponto-app-1c55a".equals(projeto);
  return "br.dev.acstech.ap1303".equals(pacote)&&"producao".equals(destino)&&"ponto-app-1c55a".equals(projeto)&&!emuladores&&host.isEmpty();
 }
 static boolean aceita(boolean ativo,String uid,String grupo,String dono,String destino,String versao,String evento,String expira,long agora){
  try{long fim=Long.parseLong(expira);return ativo&&!uid.isEmpty()&&uid.equals(dono)&&grupo.equals(destino)&&"1".equals(versao)&&evento.matches("[a-f0-9]{64}")&&fim>agora&&fim<=agora+86460000L;}catch(Exception ignored){return false;}
 }
 static String registrar(String vistos,String evento){
  ArrayList<String> ids=new ArrayList<>();if(!vistos.isEmpty())ids.addAll(Arrays.asList(vistos.split(",")));
  if(ids.contains(evento))return null;ids.add(evento);while(ids.size()>100)ids.remove(0);return String.join(",",ids);
 }
}
