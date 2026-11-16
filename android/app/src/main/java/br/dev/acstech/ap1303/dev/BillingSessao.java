package br.dev.acstech.ap1303.dev;

// Isolamento de callbacks assíncronos entre contas/grupos e recriações do plugin.
final class BillingSessao {
    private long geracao = 0;
    private String conta;

    synchronized long definir(String nova) {
        if (nova == null || !nova.matches("[a-f0-9]{64}")) throw new IllegalArgumentException("Contexto inválido.");
        geracao++;
        conta = nova;
        return geracao;
    }
    synchronized long geracao() { return geracao; }
    synchronized String conta() { return conta; }
    synchronized boolean atual(long rodada) { return conta != null && rodada == geracao; }
    synchronized boolean pertence(String candidato) { return conta != null && conta.equals(candidato); }
    synchronized void encerrar() { geracao++; conta = null; }
}
