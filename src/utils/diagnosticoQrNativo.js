// Lista fechada: não aceita conteúdo do QR, mensagens do SDK ou identificadores.
export function filtrarDiagnosticoNativo(estado = {}) {
  const resultado = {};
  for (const chave of ['travaAtiva', 'chamadaPendente', 'taskPendente', 'taskConcluida', 'janelaComFoco', 'telaEncerradaDefinitiva']) {
    resultado[chave] = estado[chave] === true;
  }
  for (const chave of ['telasCriadas', 'telasRetomadas', 'telasPausadas', 'telasDestruidas', 'cancelamentosSolicitados', 'tasksConcluidas', 'sessoesRecuperadas']) {
    resultado[chave] = Number.isSafeInteger(estado[chave]) && estado[chave] >= 0 ? estado[chave] : 0;
  }
  return resultado;
}
