const CATEGORIAS = [
  ['hortifruti', 'Hortifrúti', '🥬'], ['padaria', 'Padaria', '🥖'], ['acougue', 'Açougue', '🥩'],
  ['frios', 'Frios e laticínios', '🧀'], ['mercearia', 'Mercearia', '🌾'], ['bebidas', 'Bebidas', '🥤'],
  ['limpeza', 'Limpeza', '🧹'], ['perfumaria', 'Perfumaria e higiene', '🧴'], ['farmacia', 'Farmácia', '💊'],
  ['construcao', 'Material de construção', '🔨'], ['diversos', 'Diversos', '📦'],
  ['pet', 'Pet', '🐾'], ['geladeira', 'Geladeira', '❄️'], ['despensa', 'Despensa', '🥫'], ['jardinagem', 'Jardinagem', '🌱'],
].map(([id, nome, icone], ordem) => ({ id, nome, icone, ordem, ativo: true }));
const normalizar = valor => String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
function categoriaLegada(valor) {
  const nome = normalizar(valor);
  const aliases = { carnes: 'acougue', banheiro: 'perfumaria', outros: 'diversos' };
  return aliases[nome] || CATEGORIAS.find(c => normalizar(c.nome) === nome || c.id === nome)?.id || 'diversos';
}
function podeMontar(perfil) { return perfil && perfil.ativo !== false && ['admin', 'funcionario', 'funcionaria'].includes(perfil.role); }
function podeComprar(perfil) { return Boolean(perfil && perfil.ativo !== false && perfil.role === 'admin'); }
function quantidade(valor) {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0 || valor > 10000 || Math.abs(valor * 1000 - Math.round(valor * 1000)) > 0.00001) throw new Error('Informe uma quantidade positiva, com até três casas decimais.');
  return valor;
}
function totalItem(preco, qtd) {
  quantidade(qtd);
  if (!Number.isSafeInteger(preco) || preco <= 0 || preco > 100000000) throw new Error('Informe um preço válido, maior que zero.');
  return Math.round(preco * Math.round(qtd * 1000) / 1000);
}
function prepararFechamento(itens, aceitarPendentes) {
  if (!itens.length || itens.length > 200) throw new Error('A lista precisa ter de 1 a 200 itens.');
  const comprados = itens.filter(i => i.estado === 'comprado');
  if (!comprados.length) throw new Error('Registre ao menos um produto comprado.');
  if (!aceitarPendentes && itens.some(i => i.estado === 'pendente')) throw new Error('Confirme os itens que não foram comprados antes de finalizar.');
  let totalCentavos = 0;
  for (const item of comprados) {
    if (!item.supermercadoId || !item.produtoId || !item.compradoEm) throw new Error('Há item comprado sem supermercado ou data.');
    totalCentavos += totalItem(item.precoUnitarioCentavos, item.quantidadeComprada);
  }
  return { comprados, totalCentavos };
}
function calcularRelatorios(registros) {
  const produtos = new Map();
  for (const r of registros.filter(r => r.valido !== false)) {
    if (!produtos.has(r.produtoId)) produtos.set(r.produtoId, { produtoId: r.produtoId, nome: r.nomeSnapshot, apresentacao: r.apresentacao || '', unidade: r.unidadeCompra, listas: new Set(), mercados: new Map() });
    const p = produtos.get(r.produtoId);
    p.listas.add(r.listaId);
    // A unidade faz parte do agrupamento para não comparar kg com unidade.
    const chave = `${r.supermercadoId}:${r.unidadeCompra}`;
    if (!p.mercados.has(chave)) p.mercados.set(chave, []);
    p.mercados.get(chave).push(r);
  }
  const frequencias = [], precos = [], variacoes = [];
  for (const p of produtos.values()) {
    const base = { produtoId: p.produtoId, nome: p.nome, apresentacao: p.apresentacao };
    frequencias.push({ ...base, compras: p.listas.size });
    let maiorPreco = null, maiorVariacao = null;
    for (const pontos of p.mercados.values()) {
      pontos.sort((a, b) => a.compradoEmMs - b.compradoEmMs || a.id.localeCompare(b.id));
      const primeiro = pontos[0], ultimo = pontos.at(-1);
      const preco = { ...base, precoCentavos: ultimo.precoUnitarioCentavos, supermercado: ultimo.supermercadoNome, unidade: ultimo.unidadeCompra, dataMs: ultimo.compradoEmMs };
      if (!maiorPreco || preco.precoCentavos > maiorPreco.precoCentavos) maiorPreco = preco;
      if (primeiro.compradoEmMs === ultimo.compradoEmMs || primeiro.precoUnitarioCentavos <= 0) continue;
      const variacao = { ...base, percentual: (ultimo.precoUnitarioCentavos / primeiro.precoUnitarioCentavos - 1) * 100, diferencaCentavos: ultimo.precoUnitarioCentavos - primeiro.precoUnitarioCentavos, inicialCentavos: primeiro.precoUnitarioCentavos, finalCentavos: ultimo.precoUnitarioCentavos, inicioMs: primeiro.compradoEmMs, fimMs: ultimo.compradoEmMs, supermercado: ultimo.supermercadoNome, unidade: ultimo.unidadeCompra };
      if (!maiorVariacao || Math.abs(variacao.percentual) > Math.abs(maiorVariacao.percentual)) maiorVariacao = variacao;
    }
    if (maiorPreco) precos.push(maiorPreco);
    if (maiorVariacao) variacoes.push(maiorVariacao);
  }
  const desempate = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR') || a.produtoId.localeCompare(b.produtoId);
  return {
    frequencias: frequencias.sort((a, b) => b.compras - a.compras || desempate(a, b)).slice(0, 10),
    precos: precos.sort((a, b) => b.precoCentavos - a.precoCentavos || desempate(a, b)).slice(0, 10),
    variacoes: variacoes.sort((a, b) => Math.abs(b.percentual) - Math.abs(a.percentual) || desempate(a, b)).slice(0, 10),
  };
}
module.exports = { CATEGORIAS, categoriaLegada, podeMontar, podeComprar, quantidade, totalItem, prepararFechamento, calcularRelatorios };
