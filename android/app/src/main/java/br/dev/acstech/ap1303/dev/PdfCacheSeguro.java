package br.dev.acstech.ap1303.dev;
import java.io.File;
import java.io.IOException;

/** Apenas temporários reconhecidos da pasta privada ap1303-pdf; nunca recursivo. */
final class PdfCacheSeguro {
    static final long PRAZO = 86400000L;
    static boolean reconhecido(String nome) {
        String uuid = "[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}";
        return nome.matches(uuid + "\\.pdf") || nome.matches("u_[0-9]{1,3}_[A-Za-z0-9_-]+_" + uuid + "(_entregue)?\\.(pdf|jpg|png|webp)");
    }
    static boolean podeApagar(File pasta, File arquivo, long agora, boolean logout) throws IOException {
        if (!arquivo.isFile() || !reconhecido(arquivo.getName()) || !arquivo.getCanonicalFile().equals(new File(pasta.getCanonicalFile(), arquivo.getName()))) return false;
        if (arquivo.getName().matches(".*_entregue\\.(pdf|jpg|png|webp)")) return agora - arquivo.lastModified() > PRAZO;
        return logout || agora - arquivo.lastModified() > PRAZO;
    }
    static void limparAntigos(File pasta, long agora) {
        limparAntigos(pasta, agora, java.util.Collections.emptySet());
    }
    static void limparAntigos(File pasta, long agora, java.util.Set<String> ativos) {
        File[] arquivos = pasta.listFiles();
        if (arquivos == null) return;
        for (File f : arquivos) try { if (!ativos.contains(f.getName()) && podeApagar(pasta, f, agora, false)) f.delete(); } catch (IOException ignored) { /* Falha fechada: preservar desconhecidos. */ }
    }
}
