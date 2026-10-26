package br.dev.acstech.ap1303.dev;
import org.junit.Test;
import static org.junit.Assert.*;
public class PushFiltroTest {
 @Test public void edicaoLojaRecusaAvisosAntigosSemAfetarTarefas(){
  assertFalse(PushFiltro.recursoPermitido(false,"cuidados","","/ponto"));
  assertFalse(PushFiltro.recursoPermitido(false,"ponto","lembrete","/ponto"));
  assertFalse(PushFiltro.recursoPermitido(false,"ponto","","/lembretes"));
  assertTrue(PushFiltro.recursoPermitido(false,"tarefas","tarefa","/ponto"));
  assertTrue(PushFiltro.recursoPermitido(false,"ponto","","/admin"));
  assertTrue(PushFiltro.recursoPermitido(true,"cuidados","lembrete","/lembretes"));
 }
 @Test public void separaPushFinalDoDemo(){
  assertTrue(PushFiltro.ambiente(false,"br.dev.acstech.ap1303","producao","ponto-app-1c55a","ponto-app-1c55a",false,""));
  assertTrue(PushFiltro.ambiente(true,"br.dev.acstech.ap1303.dev","teste","teste-ficticio","teste-ficticio",true,"127.0.0.1"));
  assertFalse(PushFiltro.ambiente(true,"br.dev.acstech.ap1303.dev","producao","ponto-app-1c55a","ponto-app-1c55a",false,""));
  assertFalse(PushFiltro.ambiente(false,"br.dev.acstech.ap1303","producao","ponto-app-1c55a","outro",false,""));
  assertFalse(PushFiltro.ambiente(false,"br.dev.acstech.ap1303","producao","ponto-app-1c55a","ponto-app-1c55a",true,"127.0.0.1"));
 }
 private final String evento=new String(new char[64]).replace('\0','a');
 @Test public void isolaSessaoGrupoVersaoExpiracao(){
  assertTrue(PushFiltro.aceita(true,"u","g","u","g","1",evento,"2000",1000));
  assertFalse(PushFiltro.aceita(false,"u","g","u","g","1",evento,"2000",1000));
  assertFalse(PushFiltro.aceita(true,"u","g","outro","g","1",evento,"2000",1000));
  assertFalse(PushFiltro.aceita(true,"u","g","u","outro","1",evento,"2000",1000));
  assertFalse(PushFiltro.aceita(true,"u","g","u","g","2",evento,"2000",1000));
  assertFalse(PushFiltro.aceita(true,"u","g","u","g","1",evento,"NaN",1000));
  assertFalse(PushFiltro.aceita(true,"u","g","u","g","1",evento,"999",1000));
 }
 @Test public void deduplicaSemCrescimentoIlimitado(){String vistos=PushFiltro.registrar("",evento);assertNull(PushFiltro.registrar(vistos,evento));for(int i=0;i<120;i++)vistos=PushFiltro.registrar(vistos,"id"+i);assertEquals(100,vistos.split(",").length);}
}
