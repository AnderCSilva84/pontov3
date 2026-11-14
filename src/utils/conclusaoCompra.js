export function camposFaltantesCupom(i) {
  const faltam = [];
  if (i.unidadePendente || (i.unidadeConferir && !i.unidadeConfirmada)) faltam.push('conferir a unidade');
  if (!i.produtoId && !i.itemPlanejadoId && !i.novoConfirmado) faltam.push('escolher o produto ou confirmar como novo');
  if (!i.nome?.trim() || i.nome.length > 120) faltam.push('nome');
  if (!i.apresentacao?.trim() || i.apresentacao.length > 120) faltam.push('embalagem');
  if (!i.categoriaId) faltam.push('categoria');
  if (!['un','kg','l','m'].includes(i.unidadeCompra)) faltam.push('unidade válida');
  if (!(i.quantidade > 0) || !(i.precoUnitarioCentavos > 0) || !(i.totalCentavos > 0)) faltam.push('quantidade e preço');
  if ((i.marca || '').length > 80) faltam.push('marca com até 80 caracteres');
  if (i.erroRevisao) faltam.push('corrigir o aviso do produto');
  return faltam;
}
export const assinaturaConferencia = i => JSON.stringify([i.produtoId || '',i.itemPlanejadoId || '',i.novoConfirmado === true,i.nome,i.marca || '',i.apresentacao,i.categoriaId,i.unidadeCompra,i.unidadeConfirmada === true,i.quantidade,i.precoUnitarioCentavos,i.totalCentavos]);
export const cupomConferido = (i, assinatura) => !i.descartar && !camposFaltantesCupom(i).length && assinatura === assinaturaConferencia(i);
export const compraConcluida = (i, enviando = false) => !enviando && i.estado === 'comprado' && Boolean(i.nomeSnapshot?.trim() && i.apresentacao?.trim() && i.categoriaId && i.supermercadoId) && ['un','kg','l','m'].includes(i.unidadeCompra) && i.quantidadeComprada > 0 && i.precoUnitarioCentavos > 0 && i.totalCentavos > 0;
