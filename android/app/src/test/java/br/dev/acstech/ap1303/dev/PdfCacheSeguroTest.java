package br.dev.acstech.ap1303.dev;
import org.junit.Test;
import static org.junit.Assert.*;
import java.io.File;
import java.nio.file.Files;
import java.util.Collections;
public class PdfCacheSeguroTest {
    private final String uuid="12345678-1234-1234-1234-123456789012";
    @Test public void imagensPrivadasRespeitamEntregaEArquivosDesconhecidos() throws Exception {
        File dir=Files.createTempDirectory("ap1303-anexos-test").toFile();long agora=System.currentTimeMillis();
        for(String ext:new String[]{"jpg","png","webp"}){
            File simples=new File(dir,"u_1_a_"+uuid+"."+ext),entregue=new File(dir,"u_1_a_"+uuid+"_entregue."+ext);
            simples.createNewFile();entregue.createNewFile();assertTrue(PdfCacheSeguro.podeApagar(dir,simples,agora,true));assertFalse(PdfCacheSeguro.podeApagar(dir,entregue,agora,true));
            entregue.setLastModified(agora-PdfCacheSeguro.PRAZO-5000);assertTrue(PdfCacheSeguro.podeApagar(dir,entregue,agora,true));simples.delete();entregue.delete();
        }
        assertFalse(PdfCacheSeguro.reconhecido("minha-foto.jpg"));assertFalse(PdfCacheSeguro.reconhecido("u_1_a_"+uuid+".exe"));dir.delete();
    }
    @Test public void limpezaLimitadaPreservaDesconhecidosEDocumentosPublicos() throws Exception {
        File root=Files.createTempDirectory("ap1303-pdf-test").toFile(),dir=new File(root,"ap1303-pdf");dir.mkdir();
        File legado=new File(dir,uuid+".pdf"),outro=new File(dir,"arquivo-escolhido.pdf"),publico=new File(root,uuid+".pdf");
        legado.createNewFile();outro.createNewFile();publico.createNewFile();
        long agora=System.currentTimeMillis();legado.setLastModified(agora-PdfCacheSeguro.PRAZO-5000);outro.setLastModified(legado.lastModified());publico.setLastModified(legado.lastModified());
        PdfCacheSeguro.limparAntigos(dir,agora);assertFalse(legado.exists());assertTrue(outro.exists());assertTrue(publico.exists());
        outro.delete();publico.delete();dir.delete();root.delete();
    }
    @Test public void logoutPreservaEntregaEAtivoAteFimDoPrazo() throws Exception {
        File dir=Files.createTempDirectory("ap1303-pdf-test").toFile();long agora=System.currentTimeMillis();
        File simples=new File(dir,"u_1_a_"+uuid+".pdf"),entregue=new File(dir,"u_1_a_"+uuid+"_entregue.pdf");
        simples.createNewFile();entregue.createNewFile();assertTrue(PdfCacheSeguro.podeApagar(dir,simples,agora,true));assertFalse(PdfCacheSeguro.podeApagar(dir,entregue,agora,true));
        entregue.setLastModified(agora-PdfCacheSeguro.PRAZO-5000);PdfCacheSeguro.limparAntigos(dir,agora,Collections.singleton(entregue.getName()));assertTrue(entregue.exists());
        PdfCacheSeguro.limparAntigos(dir,agora);assertFalse(entregue.exists());simples.delete();dir.delete();
    }
}
