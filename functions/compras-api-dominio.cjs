const { totalItem, chaveMarca } = require('./compras-dominio.cjs');
function ultimosPrecos(registros) {
  const mapa = new Map();
  for (const p of registros) {
    if (p.valido === false) continue;
    const chave = JSON.stringify([p.produtoId, p.supermercadoId, p.unidadeCompra, p.apresentacao || '', chaveMarca(p.marca)]);
    const anterior = mapa.get(chave);
    if (!anterior || p.compradoEmMs > anterior.compradoEmMs || (p.compradoEmMs === anterior.compradoEmMs && p.id.localeCompare(anterior.id) > 0)) mapa.set(chave, p);
  }
  return [...mapa.values()];
}
function oferta(p, quantidade = 1) {
  return { supermercadoId: p.supermercadoId, supermercado: p.supermercadoNome, marca: p.marca || '', apresentacao: `${p.apresentacao || ''}${p.marca ? ` · Marca: ${p.marca}` : ''}`, precoUnitarioCentavos: p.precoUnitarioCentavos, unidade: p.unidadeCompra, registradoEm: new Date(p.compradoEmMs).toISOString(), totalEstimadoCentavos: totalItem(p.precoUnitarioCentavos, quantidade) };
}
function compararProduto(registros, produtoId) {
  return ultimosPrecos(registros.filter(p => p.produtoId === produtoId)).map(p => ({ produtoId: p.produtoId, nome: p.nomeSnapshot, apresentacao: p.apresentacao, ...oferta(p) })).sort((a, b) => a.precoUnitarioCentavos - b.precoUnitarioCentavos);
}
function melhorPrecoLista(itens, registros) {
  const precos = ultimosPrecos(registros);
  const produtos = itens.filter(i => i.estado !== 'nao_comprado').map(i => {
    const qtd = i.estado === 'comprado' ? i.quantidadeComprada : i.quantidadePlanejada;
    const ofertas = precos.filter(p => p.produtoId === i.produtoId && p.unidadeCompra === i.unidadeCompra && (p.apresentacao || '') === (i.apresentacao || '') && ((i.estado !== 'comprado' && !i.marca) || chaveMarca(p.marca) === chaveMarca(i.marca))).map(p => oferta(p, qtd)).sort((a, b) => a.precoUnitarioCentavos - b.precoUnitarioCentavos || a.supermercadoId.localeCompare(b.supermercadoId));
    return { produtoId: i.produtoId, nome: i.nomeSnapshot, apresentacao: i.apresentacao || '', unidade: i.unidadeCompra, quantidade: qtd, ofertas, menorOferta: ofertas[0] || null };
  });
  const mercados = new Map();
  for (const p of produtos) for (const o of [...new Map([...p.ofertas].reverse().map(o => [o.supermercadoId, o])).values()]) {
    if (!mercados.has(o.supermercadoId)) mercados.set(o.supermercadoId, { supermercadoId: o.supermercadoId, supermercado: o.supermercado, itensComPreco: 0, totalParcialCentavos: 0, totalItens: produtos.length });
    const m = mercados.get(o.supermercadoId); m.itensComPreco++; m.totalParcialCentavos += o.totalEstimadoCentavos;
  }
  const supermercados = [...mercados.values()].map(m => ({ ...m, completo: m.itensComPreco === produtos.length, totalCentavos: m.itensComPreco === produtos.length ? m.totalParcialCentavos : null })).sort((a, b) => Number(b.completo) - Number(a.completo) || (a.totalCentavos ?? Infinity) - (b.totalCentavos ?? Infinity) || a.supermercado.localeCompare(b.supermercado));
  return { produtos, supermercados, melhorSupermercado: supermercados.find(m => m.completo) || null, itensSemPreco: produtos.filter(p => !p.menorOferta).map(p => p.produtoId), totalDistribuidoCentavos: produtos.length && produtos.every(p => p.menorOferta) ? produtos.reduce((s, p) => s + p.menorOferta.totalEstimadoCentavos, 0) : null };
}
function caminhoApi(path) {
  const caminho = path.replace(/\/+$/, '') || '/';
  if (caminho === '/v1/listas') return { tipo: 'listas' };
  if (caminho === '/v1/rankings') return { tipo: 'rankings' };
  let match = caminho.match(/^\/v1\/listas\/([\w-]{1,128})(\/melhor-preco)?$/);
  if (match) return { tipo: match[2] ? 'melhor-preco' : 'lista', id: match[1] };
  match = caminho.match(/^\/v1\/produtos\/([\w-]{1,128})\/comparacao$/);
  return match ? { tipo: 'produto', id: match[1] } : null;
}
module.exports = { ultimosPrecos, compararProduto, melhorPrecoLista, caminhoApi };
