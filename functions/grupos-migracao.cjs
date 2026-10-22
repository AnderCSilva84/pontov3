const { createHash } = require('node:crypto');
const { FieldValue } = require('firebase-admin/firestore');
const { grupoValido, bancoDoGrupo } = require('./grupos-contexto.cjs');
const COLECOES = ['users','funcionarios','filiais','locais','registros','dias','catalogoCompras','categoriasCompras','supermercados','comprasListas','comprasPrecos','listaCompras','tarefas','tarefasSemanais','notificacoes','pushDispositivos','pushEnvios','pushEventos','financeiro','financeiroAuditoria','documentosTrabalhistas','folhasPagamento','ajustesPonto','comprasCupons','comprasCuponsRascunhos','comprasAliases','lembretes','pessoasCuidados','usuariosAuditoria'];
// Dados dos canais descontinuados também são preservados, sem reativar integrações.
COLECOES.push('botState','telegramNotificacoes','pratosDia');
const INFRA = new Set(['grupos','vinculosUsuarios','migracoesGrupos','noBolsoLinks','noBolsoOwners','noBolsoGrants']);
async function inventariar(raiz) {
  const colecoes = await raiz.listCollections(), desconhecidas = colecoes.map(c => c.id).filter(id => !COLECOES.includes(id) && !INFRA.has(id));
  const documentos = [];
  async function ler(colecao) {
    const snap = await colecao.get();
    documentos.push(...snap.docs);
    for (let i=0;i<snap.docs.length;i+=12) await Promise.all(snap.docs.slice(i,i+12).map(async d=>{for(const filha of await d.ref.listCollections()) await ler(filha);}));
  }
  for (const nome of COLECOES) await ler(raiz.collection(nome));
  documentos.sort((a,b) => a.ref.path.localeCompare(b.ref.path));
  const assinatura = createHash('sha256').update(documentos.map(d => `${d.ref.path}:${d.updateTime.seconds}:${d.updateTime.nanoseconds}`).join('\n')).digest('hex');
  return { documentos, assinatura, desconhecidas };
}
async function planejarMigracao(raiz, { titularUid, grupoId, nomeGrupo }) {
  if (!grupoValido(grupoId) || typeof titularUid !== 'string' || !titularUid || titularUid.includes('/') || !nomeGrupo?.trim()) throw Error('Informe o UID exato do titular, o identificador e o nome do grupo.');
  const dono = (await raiz.doc(`users/${titularUid}`).get()).data();
  if (dono?.role !== 'admin' || dono.ativo === false) throw Error('O titular precisa ser um administrador ativo do conjunto atual.');
  if ((await raiz.doc(`grupos/${grupoId}`).get()).exists) throw Error('O identificador do grupo já está em uso.');
  const inventario = await inventariar(raiz), pessoas = inventario.documentos.filter(d => d.ref.parent.id === 'users' && d.ref.path.split('/').length === 2);
  if (pessoas.length > 200) throw Error('Mais de 200 contas exigem migração assistida para preservar a troca atômica.');
  for (const p of pessoas) {
    if (!['admin', 'funcionario', 'consulta'].includes(p.data().role)) throw Error('Revise os perfis de acesso existentes antes de migrar.');
    if ((await raiz.doc(`vinculosUsuarios/${p.id}`).get()).exists) throw Error('Há uma conta já vinculada; não será movimentada automaticamente.');
  }
  if (inventario.desconhecidas.length) throw Error('Revise as coleções fora do inventário antes de migrar: ' + inventario.desconhecidas.join(', '));
  const contagens = {};
  for (const d of inventario.documentos) { const nome = d.ref.path.split('/')[0]; contagens[nome] = (contagens[nome] || 0) + 1; }
  return { grupoId, nomeGrupo: nomeGrupo.trim(), titularUid, contas: pessoas.length, documentos: inventario.documentos.length, contagens, assinatura: inventario.assinatura };
}
async function migrarLegado(raiz, dados, { confirmarAssinatura, aguardar = ms => new Promise(resolve => setTimeout(resolve, ms)), quiescenciaMs = 360000 } = {}) {
  const plano = await planejarMigracao(raiz, dados);
  if (confirmarAssinatura !== plano.assinatura) throw Error('Confirme a assinatura do inventário revisado antes da migração.');
  if (quiescenciaMs < 360000 && !String(raiz.projectId).startsWith('demo-')) throw Error('A pausa de segurança só pode ser abreviada no emulador.');
  const trava = raiz.doc('migracoesGrupos/legado'), destino = raiz.doc(`grupos/${plano.grupoId}`);
  await raiz.runTransaction(async tx => {
    if ((await tx.get(trava)).data()?.bloqueada) throw Error('Já existe uma migração em andamento.');
    tx.set(trava, { bloqueada: true, grupoId: plano.grupoId, iniciadaEm: FieldValue.serverTimestamp() });
  });
  let concluida = false;
  try {
    await aguardar(quiescenciaMs); // Aguarda os requests anteriores à manutenção terminarem.
    const atual = await inventariar(raiz);
    if (atual.assinatura !== plano.assinatura) throw Error('Os dados mudaram desde o plano. Gere e revise um novo inventário.');
    await destino.create({ nome: plano.nomeGrupo, titularUid: plano.titularUid, ativo: false, estado: 'preparando', criadoEm: FieldValue.serverTimestamp(), schemaVersion: 1 });
    const escopo = bancoDoGrupo(raiz, plano.grupoId);
    for (let i = 0; i < atual.documentos.length; i += 400) {
      const lote = raiz.batch();
      for (const doc of atual.documentos.slice(i, i + 400)) lote.create(escopo.doc(doc.ref.path), doc.data());
      await lote.commit();
    }
    if ((await inventariar(raiz)).assinatura !== plano.assinatura) throw Error('Os dados de origem mudaram durante a cópia. O grupo preparado continuará inativo.');
    const contas = atual.documentos.filter(d => d.ref.path.split('/').length === 2 && d.ref.parent.id === 'users');
    const troca = raiz.batch();
    for (const pessoa of contas) {
      troca.create(raiz.doc(`vinculosUsuarios/${pessoa.id}`), { grupoId: plano.grupoId, ativo: true, criadoEm: FieldValue.serverTimestamp() });
      troca.update(pessoa.ref, { ativo: false, migradoParaGrupo: plano.grupoId });
    }
    troca.update(destino, { ativo: true, estado: 'ativo', migradoEm: FieldValue.serverTimestamp() });
    troca.set(trava, { bloqueada: false, concluida: true, grupoId: plano.grupoId, assinatura: plano.assinatura, concluidaEm: FieldValue.serverTimestamp() });
    await troca.commit(); concluida = true;
    return plano;
  } finally { if (!concluida) await trava.set({ bloqueada: false, falhou: true }, { merge: true }); }
}
module.exports = { planejarMigracao, migrarLegado };
