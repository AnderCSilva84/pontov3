package br.dev.acstech.ap1303.dev;

import org.junit.Test;
import static org.junit.Assert.*;

public class ScannerQrSessaoTest {
    @Test public void pausaOuTelaAindaVivaNaoPermitemSegundaCaptura() {
        ScannerQrSessao s = new ScannerQrSessao();
        long a = s.iniciar(); s.criada(a, new Object());
        assertFalse(s.recuperar(true, true)); assertEquals(0, s.iniciar());
        assertTrue(s.vigente(a));
    }

    @Test public void destruicaoDefinitivaExigeFocoEProcessoAindaPendente() {
        ScannerQrSessao s = new ScannerQrSessao(); Object tela = new Object();
        long a = s.iniciar(); s.criada(a, tela); s.destruida(a, tela, true, false);
        assertFalse(s.recuperar(false, true)); assertFalse(s.recuperar(true, false));
        assertTrue(s.recuperar(true, true)); assertFalse(s.vigente(a));
        long b = s.iniciar(); assertNotEquals(a, b); assertTrue(s.vigente(b));
        assertEquals(0, s.iniciar());
    }

    @Test public void callbackAntigoNaoEntregaResultadoNemLiberaSessaoNova() {
        ScannerQrSessao s = new ScannerQrSessao(); Object tela = new Object();
        long a = s.iniciar(); s.criada(a, tela); s.destruida(a, tela, true, false);
        assertTrue(s.recuperar(true, true)); long b = s.iniciar();
        assertFalse(s.vigente(a)); assertFalse(s.encerrar(a));
        assertTrue(s.aberta()); assertTrue(s.vigente(b));
        assertTrue(s.encerrar(b)); assertFalse(s.aberta());
    }

    @Test public void rotacaoNaoConfundidaComEncerramentoDefinitivo() {
        for (boolean finalizando : new boolean[]{false, true}) {
            ScannerQrSessao s = new ScannerQrSessao(); Object tela = new Object();
            long a = s.iniciar(); s.criada(a, tela); s.destruida(a, tela, finalizando, true);
            assertFalse(s.recuperar(true, true));
            Object recriada = new Object(); s.criada(a, recriada);
            s.destruida(a, recriada, true, false); assertTrue(s.recuperar(true, true));
        }
    }

    @Test public void destruicaoDeOutraTelaOuOutraGeracaoNaoLiberaCaptura() {
        ScannerQrSessao s = new ScannerQrSessao(); Object tela = new Object();
        long a = s.iniciar(); s.criada(a, tela);
        s.destruida(a, new Object(), true, false); assertFalse(s.recuperar(true, true));
        s.destruida(a - 1, tela, true, false); assertFalse(s.recuperar(true, true));
    }

    @Test public void capturaSemTelaObservadaFalhaFechada() {
        ScannerQrSessao s = new ScannerQrSessao(); long a = s.iniciar();
        s.destruida(a, new Object(), true, false);
        assertFalse(s.recuperar(true, true)); assertEquals(0, s.iniciar());
    }

    @Test public void conclusaoNormalLiberaNovaTentativaSemRecuperacao() {
        ScannerQrSessao s = new ScannerQrSessao(); long a = s.iniciar();
        assertTrue(s.encerrar(a)); assertFalse(s.recuperar(true, true));
        long b = s.iniciar(); assertTrue(b > a); assertTrue(s.vigente(b));
    }

    @Test public void destruirPluginInvalidaCallbacksELimpaReferenciaDaTela() {
        ScannerQrSessao s = new ScannerQrSessao(); long a = s.iniciar();
        s.criada(a, new Object()); s.invalidar();
        assertFalse(s.aberta()); assertFalse(s.vigente(a)); assertFalse(s.telaEncerrada());
        assertFalse(s.encerrar(a)); assertFalse(s.recuperar(true, true));
    }
}
