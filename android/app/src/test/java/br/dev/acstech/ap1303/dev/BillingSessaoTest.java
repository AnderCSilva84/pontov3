package br.dev.acstech.ap1303.dev;
import org.junit.Test;
import static org.junit.Assert.*;

public class BillingSessaoTest {
    private final String a = "a".repeat(64), b = "b".repeat(64);
    @Test public void trocaDeGrupoInvalidaCallbackMesmoAoVoltarParaContaOriginal() {
        BillingSessao s = new BillingSessao();
        long primeira = s.definir(a); assertTrue(s.atual(primeira));
        s.definir(b); long terceira = s.definir(a);
        assertFalse(s.atual(primeira)); assertTrue(s.atual(terceira));
        assertFalse(s.pertence(b)); assertTrue(s.pertence(a));
    }
    @Test public void encerrarImpedeEntregaDeCompraPendente() {
        BillingSessao s = new BillingSessao(); long rodada = s.definir(a);
        s.encerrar(); assertFalse(s.atual(rodada)); assertFalse(s.pertence(a));
        assertNull(s.conta());
    }
    @Test public void naoAceitaIdentificadorPessoalOuContextoSemHash() {
        for (String c : new String[]{null, "", "uid:grupo", "a".repeat(63), "Z".repeat(64)}) {
            try { new BillingSessao().definir(c); fail(); } catch (IllegalArgumentException esperado) {}
        }
    }
}
