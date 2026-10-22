export const moeda = centavos => (Number(centavos || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const dataPreco = ms => new Date(ms).toLocaleDateString('pt-BR', { timeZone: 'America/Fortaleza' });
export const numeroCompras = valor => Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: 4 });
export const chaveProdutoPreco = r => JSON.stringify([r.produtoId, (r.marca || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' '), r.apresentacao || '', r.unidadeCompra]);
export function lerPreco(texto) {
  const valor = String(texto).trim().replace(',', '.');
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(valor)) throw new Error('Informe o preço com até duas casas decimais.');
  const centavos = Math.round(Number(valor) * 100);
  if (centavos <= 0 || centavos > 100000000) throw new Error('O preço deve ser maior que zero.');
  return centavos;
}
export function compararMercados(registros) {
  const mapa = new Map();
  for (const r of registros) {
    const chave = `${r.supermercadoId}:${r.unidadeCompra}`;
    const anterior = mapa.get(chave);
    if (!anterior || r.compradoEmMs > anterior.compradoEmMs || (r.compradoEmMs === anterior.compradoEmMs && r.id.localeCompare(anterior.id) > 0)) mapa.set(chave, r);
  }
  return [...mapa.values()].sort((a, b) => a.precoUnitarioCentavos - b.precoUnitarioCentavos);
}
export function seriesPorMercado(registros) {
  const grupos = new Map();
  for (const r of registros) {
    const chave = `${r.supermercadoId}:${r.unidadeCompra}`;
    if (!grupos.has(chave)) grupos.set(chave, { chave, nome: r.supermercadoNome, unidade: r.unidadeCompra, pontos: [] });
    grupos.get(chave).pontos.push(r);
  }
  return [...grupos.values()].map(g => ({ ...g, pontos: g.pontos.sort((a, b) => a.compradoEmMs - b.compradoEmMs || a.id.localeCompare(b.id)) }));
}
