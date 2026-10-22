const { bancoDoUsuario } = require('./grupos-contexto.cjs');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { Timestamp } = require('firebase-admin/firestore');
const { resumirPreco } = require('./compras-estimativa-dominio.cjs');

async function estimarCompras(db, request, agora = Date.now()) {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Entre no app para consultar a estimativa.');
  const perfil = (await db.doc(`users/${request.auth.uid}`).get()).data();
  if (!perfil || perfil.ativo === false) throw new HttpsError('permission-denied', 'Acesso não autorizado.');
  const listaId = request.data?.listaId;
  if (typeof listaId !== 'string' || !/^[\w-]{1,128}$/.test(listaId)) throw new HttpsError('invalid-argument', 'Lista inválida.');
  const lista = db.doc(`comprasListas/${listaId}`);
  if (!(await lista.get()).exists) throw new HttpsError('not-found', 'Lista não encontrada.');
  const itens = await lista.collection('itens').limit(201).get();
  if (itens.size > 200) throw new HttpsError('resource-exhausted', 'Esta lista ultrapassa o limite de itens.');
  const pendentes = itens.docs.filter(d => ['pendente', 'comprado_sem_preco'].includes(d.data().estado)), consultas = new Map(), referencias = {};
  for (let i = 0; i < pendentes.length; i += 10) await Promise.all(pendentes.slice(i, i + 10).map(async doc => {
    const item = doc.data(), unidade = item.unidadePlanejada || item.unidadeCompra;
    if (typeof item.produtoId !== 'string' || !['un', 'kg', 'l', 'm'].includes(unidade)) { referencias[doc.id] = null; return; }
    const chave = JSON.stringify([item.produtoId, item.apresentacao || '', unidade]);
    if (!consultas.has(chave)) consultas.set(chave, db.collection('comprasPrecos').where('produtoId', '==', item.produtoId).where('valido', '==', true).where('apresentacao', '==', item.apresentacao || '').where('unidadeCompra', '==', unidade).where('compradoEm', '<=', Timestamp.fromMillis(agora)).orderBy('compradoEm', 'desc').limit(10).get());
    const snap = await consultas.get(chave);
    referencias[doc.id] = resumirPreco(snap.docs.map(d => ({ ...d.data(), id: d.id, compradoEmMs: d.data().compradoEm?.toMillis() })), item, agora);
  }));
  return { referencias, consultadoEmMs: agora };
}
module.exports = { estimarCompras, criarEstimativaCompras: ({ admin }) => ({ comprasEstimativa: onCall({ timeoutSeconds: 60 }, async request => estimarCompras(await bancoDoUsuario(admin.firestore(), request.auth?.uid), request)) }) };
