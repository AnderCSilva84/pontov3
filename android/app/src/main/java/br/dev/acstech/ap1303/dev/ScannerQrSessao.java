package br.dev.acstech.ap1303.dev;

// Estado em memória, acessado somente na thread principal. Sem conteúdo de QR.
final class ScannerQrSessao {
    private long geracao;
    private boolean aberta, telaEncerrada;
    private Object tela;

    long iniciar() {
        if (aberta) return 0;
        aberta = true; telaEncerrada = false; tela = null;
        return ++geracao;
    }

    boolean vigente(long rodada) { return aberta && rodada == geracao; }
    boolean aberta() { return aberta; }
    boolean telaEncerrada() { return telaEncerrada; }

    void criada(long rodada, Object novaTela) {
        if (vigente(rodada) && tela == null && !telaEncerrada) tela = novaTela;
    }

    void destruida(long rodada, Object anterior, boolean finalizando, boolean mudandoConfiguracao) {
        if (!vigente(rodada) || tela == null || tela != anterior) return;
        tela = null;
        telaEncerrada = finalizando && !mudandoConfiguracao;
    }

    boolean recuperar(boolean janelaComFoco, boolean taskPendente) {
        if (!aberta || !telaEncerrada || !janelaComFoco || !taskPendente) return false;
        encerrar(geracao);
        return true;
    }

    boolean encerrar(long rodada) {
        if (!vigente(rodada)) return false;
        invalidar();
        return true;
    }

    void invalidar() {
        aberta = false; tela = null; telaEncerrada = false;
        geracao++;
    }
}
