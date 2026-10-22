// IDs do catálogo distinguem embalagens; não confundir produtos de nomes parecidos.
export function produtosEmOutrasListas(listas, itensPorLista, listaAtual) {
  const mapa = Object.create(null);
  for (const lista of listas) {
    if (lista.id === listaAtual || !['rascunho','em_compra'].includes(lista.status)) continue;
    const itens = Object.hasOwn(itensPorLista, lista.id) ? itensPorLista[lista.id] : [];
    for (const item of Array.isArray(itens) ? itens : []) {
      if (!item.produtoId || item.estado === 'nao_comprado') continue;
      if (!mapa[item.produtoId]) mapa[item.produtoId] = [];
      if (!mapa[item.produtoId].some(l => l.id === lista.id)) mapa[item.produtoId].push({id:lista.id,titulo:lista.titulo});
    }
  }
  return mapa;
}
