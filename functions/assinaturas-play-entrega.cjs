const { randomUUID } = require('node:crypto');
const { HttpsError } = require('firebase-functions/v2/https');
const { interpretarCompraPlay, criarClientePlay, hash, config } = require('./assinaturas-play.cjs');
const { verificarCompraPlayTeste } = require('./assinaturas-play-verificacao.cjs');
const { resolverAssinatura } = require('./assinaturas-dominio.cjs');
const falha = (codigo, mensagem) => { throw new HttpsError(codigo, mensagem); };

// Produtor interno: só entrega compras TESTE vinculadas pelo verificador autenticado.
// Não ativa grupos, produtos da loja nem contratação no aplicativo.
async function entregarCompraPlayTeste(raiz, compraId, { cliente = criarClientePlay(), relogio = Date.now, novoId = randomUUID } = {}) {
  if (!/^google_play_[a-f0-9]{64}$/.test(compraId)) falha('invalid-argument', 'Compra inválida.');
  const ref = raiz.doc(`assinaturasCompras/${compraId}`), r = (await ref.get()).data();
  if (!r || r.versao !== 1 || r.teste !== true || r.provedor !== 'google_play' || r.pacote !== config.pacote
    || !/^[\w-]{1,128}$/.test(r.grupoId || '') || typeof r.uid !== 'string' || !r.uid || r.uid.includes('/')
    || typeof r.token !== 'string' || compraId !== `google_play_${hash(r.token)}`) falha('failed-precondition', 'Compra de teste não vinculada.');
  const direitoRef = raiz.doc(`assinaturasGrupos/${r.grupoId}`), entregaRef = raiz.doc(`assinaturasEntregas/${compraId}`);
  const refs = [raiz.doc('assinaturasConfiguracao/google_play'), ref, raiz.doc(`grupos/${r.grupoId}`),
    raiz.doc(`vinculosUsuarios/${r.uid}`), raiz.doc(`grupos/${r.grupoId}/users/${r.uid}`), raiz.doc(`contaSolicitacoes/${r.uid}`), direitoRef, entregaRef];
  function conferir(docs) {
    const [c, recibo, grupo, vinculo, perfil, exclusao, direito, entrega] = docs.map(s => s.data());
    if (c?.homologacaoAtiva !== true || c.entregaTesteAtiva !== true || c.direitosHomologados !== true || c.reconhecimentoTesteAtivo !== true
      || !Array.isArray(c.gruposPermitidos) || !c.gruposPermitidos.includes(r.grupoId)
      || grupo?.ativo !== true || grupo.assinaturasAtivas !== true) falha('failed-precondition', 'Entrega de teste não habilitada para este grupo.');
    if (grupo.titularUid !== r.uid || vinculo?.ativo !== true || vinculo.grupoId !== r.grupoId
      || perfil?.role !== 'admin' || perfil.ativo === false || exclusao?.etapa != null
      || recibo?.uid !== r.uid || recibo.grupoId !== r.grupoId || recibo.token !== r.token || recibo.teste !== true
      || recibo.provedor !== r.provedor || recibo.pacote !== r.pacote || recibo.versao !== 1) falha('permission-denied', 'O vínculo da compra mudou.');
    // Troca de compra/canal exige reconciliação própria, mesmo após expiração.
    if (direito && (direito.compraId !== compraId || direito.provedor !== 'google_play' || direito.verificado !== true
      || direito.teste !== true)) falha('failed-precondition', 'Há outro vínculo comercial a revisar.');
    if (entrega && (entrega.versao !== 1 || entrega.confirmada !== true || entrega.teste !== true || entrega.uid !== r.uid
      || entrega.grupoId !== r.grupoId || entrega.compraId !== compraId || !direito || entrega.planoBase !== config.planoBase
      || !Object.hasOwn(config.produtos,entrega.produtoId) || direito.plano !== config.produtos[entrega.produtoId])) falha('failed-precondition', 'Entrega inconsistente.');
    if (direito && !entrega) falha('failed-precondition', 'Direito anterior sem entrega comprovada.');
    return { recibo, entrega, direito };
  }
  const rodada = novoId();
  const iniciar = await raiz.runTransaction(async tx => {
    const { recibo, entrega, direito } = conferir(await tx.getAll(...refs));
    if (entrega) return { direitosConcedidos:resolverAssinatura(direito,relogio()).plano !== 'free',repetida:true,teste:true }; // Não renova com resposta antiga.
    if (recibo.reconciliacaoLease?.ate > relogio()) falha('aborted', 'Compra em reconciliação. Tente novamente.');
    tx.update(ref, { reconciliacaoLease: { rodada, ate: relogio() + 90000 } });
    return true;
  });
  if (iniciar !== true) return iniciar;
  try {
    const prova = interpretarCompraPlay(await cliente.consultar(r.token), { uid: r.uid, grupoId: r.grupoId, agora: relogio() });
    if (!prova.teste || !prova.vigente || prova.estado !== 'ativo') falha('failed-precondition', 'A compra de teste ainda não está ativa.');
    await raiz.runTransaction(async tx => {
      const { recibo } = conferir(await tx.getAll(...refs));
      if (recibo.reconciliacaoLease?.rodada !== rodada || recibo.reconciliacaoLease.ate <= relogio()
        || prova.validoAte <= relogio()) falha('aborted', 'Entrega precisa ser consultada novamente.');
      tx.create(direitoRef, { versao: 1, verificado: true, teste: true, provedor: 'google_play', compraId,
        plano: prova.plano, estado: prova.estado, inicioEm: prova.inicioEm, validoAte: prova.validoAte,
        renovacaoAutomatica: prova.renovacaoAutomatica, entregueEm: relogio() });
      tx.create(entregaRef, { versao: 1, confirmada: true, teste: true, compraId, uid: r.uid, grupoId: r.grupoId,
        produtoId: prova.produtoId, planoBase: prova.planoBase, criadoEm: relogio() });
      tx.update(ref, { reconciliacaoLease: null });
    });
    return { direitosConcedidos: true, repetida: false, teste: true };
  } catch (e) {
    await raiz.runTransaction(async tx => {
      const s = await tx.get(ref);
      if (s.data()?.reconciliacaoLease?.rodada === rodada) tx.update(ref, { reconciliacaoLease: null });
    }).catch(() => {});
    const codigo = ['failed-precondition','permission-denied','aborted'].includes(e?.code) ? e.code : 'unavailable';
    falha(codigo, 'A entrega de teste precisa ser retomada ou revisada.');
  }
}

async function processarCompraPlayTeste(raiz, request, opcoes = {}) {
  await verificarCompraPlayTeste(raiz, request, opcoes);
  // O verificador deriva e fixa uid/grupo; o cliente nunca escolhe o destino do direito.
  return entregarCompraPlayTeste(raiz, `google_play_${hash(request.data.token)}`, opcoes);
}
module.exports = { entregarCompraPlayTeste, processarCompraPlayTeste };
