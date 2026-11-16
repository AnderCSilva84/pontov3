export function avisarAcao(mensagem) {
  window.dispatchEvent(new CustomEvent('ap1303-acao-confirmada', { detail: mensagem }));
}
