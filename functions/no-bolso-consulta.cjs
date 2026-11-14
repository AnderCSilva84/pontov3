const {ehSupermercado}=require('./compras-tipo.cjs');
const { HttpsError } = require('firebase-functions/v2/https');
const { bancoDoUsuario } = require('./grupos-contexto.cjs');
const { calcularRelatorios } = require('./compras-dominio.cjs');
const { compararProduto } = require('./compras-api-dominio.cjs');
const { catalogoProdutos } = require('./no-bolso-product-catalog.cjs');

// Entrada de capacidade mínima. Nenhum comando de vínculo, compra ou financeiro é despachado aqui.
async function consultarNoBolso(raiz, request, agora = Date.now()) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Entre no Tá no Ponto.');
  const dados = request.data;
  if (!dados || typeof dados !== 'object' || Array.isArray(dados) || Object.keys(dados).some(k => !['consulta', 'dias', 'produtoId'].includes(k)) || !['status', 'rankings', 'produto'].includes(dados.consulta)) throw new HttpsError('invalid-argument', 'Integração somente de consulta de preços.');
  if ((dados.consulta !== 'produto' && dados.produtoId !== undefined) || (dados.consulta === 'produto' && (typeof dados.produtoId !== 'string' || !/^[\w-]{1,128}$/.test(dados.produtoId)))) throw new HttpsError('invalid-argument', 'Produto inválido.');
  const dias = dados.dias ?? 90;
  if (!Number.isInteger(dias) || dias < 1 || dias > 366) throw new HttpsError('invalid-argument', 'Período inválido.');
  const db = await bancoDoUsuario(raiz, request.auth.uid);
  // O resolver já leu/validou perfil e grupo quando há vínculo; não repetir essa leitura.
  if (!db.grupoId) {
    const perfil = (await db.doc(`users/${request.auth.uid}`).get()).data();
    if (!perfil || perfil.ativo === false) throw new HttpsError('permission-denied', 'Acesso não autorizado.');
  }
  const meta = { versao: 1, modo: 'consulta', moeda: 'BRL', consultadoEm: new Date(agora).toISOString(), periodoDias: dias, aviso: 'Histórico de preços registrados; não garante preço atual ou promoção vigente.' };
  if (dados.consulta === 'status') return { ...meta, allowed: true, consultas: ['rankings', 'produto'] };
  const snap = await db.collection('comprasPrecos').where('compradoEm', '>=', new Date(agora - dias * 86400000)).where('compradoEm', '<=', new Date(agora)).orderBy('compradoEm').limit(5001).get();
  if (snap.size > 5000) throw new HttpsError('resource-exhausted', 'Selecione um período menor.');
  const registros = snap.docs.filter(d => d.data().valido !== false && ehSupermercado(d.data())).map(d => {
    const p = d.data();
    return { id: d.id, produtoId: p.produtoId, nomeSnapshot: p.nomeSnapshot, marca: p.marca || '', apresentacao: p.apresentacao || '', unidadeCompra: p.unidadeCompra, supermercadoId: p.supermercadoId, supermercadoNome: p.supermercadoNome, quantidadeComprada: p.quantidadeComprada, precoUnitarioCentavos: p.precoUnitarioCentavos, compradoEmMs: p.compradoEm.toMillis() };
  });
  return { ...meta, ...(dados.consulta === 'rankings' ? { produtos: catalogoProdutos(registros), rankings: calcularRelatorios(registros) } : { ofertas: compararProduto(registros, dados.produtoId) }) };
}
module.exports = { consultarNoBolso };
