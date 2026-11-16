// Uma ocorrência recorrente não encerra o lembrete. Na ocorrência final de um
// aviso único, aguardar também as demais doses/horários pendentes da versão.
async function encerramentoAposConclusao(tx, ref, lembrete, ocorrenciaId, proximoMs) {
  if (lembrete.repeticao !== 'uma_vez' || proximoMs) return {};
  const registros = await tx.get(ref.collection('ocorrencias'));
  const pendente = registros.docs.some(d => d.id !== ocorrenciaId
    && d.id.startsWith(`${lembrete.versao}_`)
    && !['concluido', 'cancelado', 'sem_acesso'].includes(d.data().status));
  return pendente ? {} : { ativo: false };
}
module.exports = { encerramentoAposConclusao };
