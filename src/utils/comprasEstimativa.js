export function calcularEstimativa(itens, referencias = {}, base = 'ultimo') {
  let subtotalInformadoCentavos = 0, subtotalEstimadoCentavos = 0, pendentesComPreco = 0, comprados = 0;
  const semPreco = [], porItem = {};
  for (const item of itens) {
    if (item.estado === 'nao_comprado') continue;
    if (item.estado === 'comprado') { subtotalInformadoCentavos += item.totalCentavos || 0; comprados++; continue; }
    const r = referencias[item.id], preco = base === 'media' ? r?.mediaCentavos : r?.ultimoCentavos;
    if (!Number.isSafeInteger(preco) || preco <= 0 || r.unidade !== (item.unidadePlanejada || item.unidadeCompra)) { semPreco.push(item.id); continue; }
    const totalCentavos = Math.round(preco * item.quantidadePlanejada);
    porItem[item.id] = { precoCentavos: preco, totalCentavos, ...r };
    subtotalEstimadoCentavos += totalCentavos; pendentesComPreco++;
  }
  return { totalCentavos: comprados + pendentesComPreco ? subtotalInformadoCentavos + subtotalEstimadoCentavos : null, subtotalInformadoCentavos, subtotalEstimadoCentavos, pendentesComPreco, semPreco, porItem, considerados: comprados + pendentesComPreco + semPreco.length };
}
