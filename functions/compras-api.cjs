const { catalogoProdutos } = require('./no-bolso-product-catalog.cjs');
const { onRequest } = require('firebase-functions/v2/https');
const { getFirestore, Timestamp, FieldPath } = require('firebase-admin/firestore');
const { OAuth2Client } = require('google-auth-library');
const { calcularRelatorios } = require('./compras-dominio.cjs');
const { melhorPrecoLista, compararProduto, caminhoApi } = require('./compras-api-dominio.cjs');
const AUDIENCE = 'https://us-central1-ponto-app-1c55a.cloudfunctions.net/comprasApi';
const SERVICE_ACCOUNT = 'no-bolso-runtime@organizanderson.iam.gserviceaccount.com';
const verifier = new OAuth2Client();
const problema = (status, mensagem) => Object.assign(new Error(mensagem), { status });
const iso = timestamp => timestamp?.toDate().toISOString() || null;

async function precosPeriodo(db, dias, agora) {
  const snap = await db.collection('comprasPrecos').where('compradoEm', '>=', new Date(agora - dias * 86400000)).where('compradoEm', '<=', new Date(agora)).orderBy('compradoEm').limit(5001).get();
  if (snap.size > 5000) throw problema(422, 'Selecione um período menor: limite de 5.000 observações por consulta.');
  return snap.docs.filter(d => d.data().valido !== false).map(d => {
    const p = d.data();
    return { id: d.id, listaId: p.listaId, produtoId: p.produtoId, nomeSnapshot: p.nomeSnapshot, marca: p.marca || '', apresentacao: p.apresentacao || '', unidadeCompra: p.unidadeCompra, supermercadoId: p.supermercadoId, supermercadoNome: p.supermercadoNome, quantidadeComprada: p.quantidadeComprada, precoUnitarioCentavos: p.precoUnitarioCentavos, compradoEmMs: p.compradoEm.toMillis() };
  });
}
function resumoLista(d) {
  const l = d.data();
  return { id: d.id, titulo: l.titulo, status: l.status, quantidadeItens: l.quantidadeItens || 0, totalCentavos: l.status === 'finalizada' ? l.totalCentavos : null, criadaEm: iso(l.criadaEm), finalizadaEm: iso(l.finalizadaEm), ...(l.origem === 'cupom' ? { origem: 'cupom', totalOriginalCentavos: l.totalOriginalCentavos, descontoCentavos: l.descontoCentavos, quantidadeItensCupom: l.quantidadeItensCupom, quantidadeDescartados: l.quantidadeDescartados, itensCompletos: l.quantidadeDescartados === 0 } : {}) };
}
async function bancoComprasOriginal() {
  const raiz=getFirestore(), migracao=(await raiz.doc('migracoesGrupos/legado').get()).data();
  if(migracao?.bloqueada) throw problema(503,'Compras em manutenção. Tente novamente em alguns minutos.');
  return migracao?.concluida ? require('./grupos-contexto.cjs').bancoDoGrupo(raiz,migracao.grupoId) : raiz;
}
function criarHandlerComprasApi({ db = bancoComprasOriginal, verificar = async token => (await verifier.verifyIdToken({ idToken: token, audience: AUDIENCE })).getPayload(), agora = Date.now } = {}) {
  return async (req, res) => {
    res.set('Cache-Control', 'private, no-store'); res.set('X-Content-Type-Options', 'nosniff');
    try {
      const auth = req.get('authorization') || '';
      if (!/^Bearer [^\s]{20,12000}$/.test(auth)) throw problema(401, 'Autenticação do servidor necessária.');
      let identidade;
      try { identidade = await verificar(auth.slice(7)); } catch { throw problema(401, 'Identidade inválida ou expirada.'); }
      if (identidade?.email !== SERVICE_ACCOUNT || identidade.email_verified !== true) throw problema(403, 'Servidor não autorizado.');
      if (await require('./no-bolso-functions.cjs').handleNoBolsoRoute(req,res)) return;
      if (req.method !== 'GET') { res.set('Allow', 'GET'); throw problema(405, 'API somente de leitura.'); }
      const rota = caminhoApi(req.path);
      if (!rota) throw problema(404, 'Consulta não encontrada.');
      const nomes = Object.keys(req.query || {});
      if (nomes.some(k => !['dias', 'limite', 'cursor'].includes(k))) throw problema(400, 'Parâmetro desconhecido.');
      const dias = req.query.dias === undefined ? 90 : Number(req.query.dias);
      if (!Number.isInteger(dias) || dias < 1 || dias > 366) throw problema(400, 'O período deve ter entre 1 e 366 dias.');
      const banco = await db(), momento = agora(), meta = { versao: 1, moeda: 'BRL', consultadoEm: new Date(momento).toISOString(), periodoDias: dias, aviso: 'Preços de compras registradas. Confira a data e a disponibilidade no estabelecimento.' };
      if (rota.tipo === 'listas') {
        const limite = req.query.limite === undefined ? 20 : Number(req.query.limite);
        if (!Number.isInteger(limite) || limite < 1 || limite > 50) throw problema(400, 'Limite deve estar entre 1 e 50.');
        let consulta = banco.collection('comprasListas').orderBy('criadaEm', 'desc').orderBy(FieldPath.documentId(), 'desc');
        if (req.query.cursor) {
          try {
            if (typeof req.query.cursor !== 'string' || req.query.cursor.length > 600) throw new Error();
            const cursor = JSON.parse(Buffer.from(req.query.cursor, 'base64url').toString('utf8'));
            if (!Number.isSafeInteger(cursor.s) || !Number.isInteger(cursor.n) || cursor.n < 0 || cursor.n >= 1000000000 || !/^[\w-]{1,128}$/.test(cursor.id)) throw new Error();
            consulta = consulta.startAfter(new Timestamp(cursor.s, cursor.n), cursor.id);
          } catch { throw problema(400, 'Cursor inválido.'); }
        }
        const snap = await consulta.limit(limite + 1).get(), docs = snap.docs.slice(0, limite), ultimo = docs.at(-1);
        const ts = ultimo?.data().criadaEm;
        const nextCursor = snap.size > limite ? Buffer.from(JSON.stringify({ s: ts.seconds, n: ts.nanoseconds, id: ultimo.id })).toString('base64url') : null;
        return res.json({ ...meta, listas: docs.filter(d => d.data().status !== 'excluida').map(resumoLista), nextCursor });
      }
      if (rota.tipo === 'rankings' || rota.tipo === 'produto') {
        const registros = await precosPeriodo(banco, dias, momento);
        return res.json({ ...meta, ...(rota.tipo === 'rankings' ? { rankings: calcularRelatorios(registros), produtos: catalogoProdutos(registros) } : { ofertas: compararProduto(registros, rota.id) }) });
      }
      const dados = await banco.runTransaction(async tx => {
        const ref = banco.doc(`comprasListas/${rota.id}`), lista = await tx.get(ref);
        if (!lista.exists || lista.data().status === 'excluida') throw problema(404, 'Lista não encontrada.');
        const snap = await tx.get(ref.collection('itens'));
        const itens = snap.docs.map(d => {
          const p = d.data();
          return { id: d.id, produtoId: p.produtoId, nomeSnapshot: `${p.nomeSnapshot}${p.marca ? ` · ${p.marca}` : ''}`, marca: p.marca || '', apresentacao: p.apresentacao || '', categoriaId: p.categoriaId, unidadeCompra: p.unidadeCompra, estado: p.estado, quantidadePlanejada: p.quantidadePlanejada, ...(p.estado === 'comprado' ? { quantidadeComprada: p.quantidadeComprada, precoUnitarioCentavos: p.precoUnitarioCentavos, totalCentavos: p.totalCentavos, supermercado: p.supermercadoNome, registradoEm: iso(p.compradoEm) } : {}) };
        });
        return { lista: resumoLista(lista), itens };
      }, { readOnly: true });
      if (rota.tipo === 'lista') return res.json({ ...meta, ...dados });
      if (dados.lista.status === 'anulada') throw problema(409, 'Uma lista anulada não pode ser usada como referência de compra.');
      const registros = await precosPeriodo(banco, dias, momento);
      return res.json({ ...meta, lista: dados.lista, ...melhorPrecoLista(dados.itens, registros) });
    } catch (erro) {
      if (!erro.status) console.error('Falha na API de compras', { codigo: erro.code || 'unknown' });
      return res.status(erro.status || 503).json({ erro: erro.status ? erro.message : 'Consulta indisponível. Tente novamente.' });
    }
  };
}
exports.criarHandlerComprasApi = criarHandlerComprasApi;
exports.comprasApi = onRequest({ region: 'us-central1', timeoutSeconds: 60, maxInstances: 2, cors: false, invoker: 'public' }, criarHandlerComprasApi());
