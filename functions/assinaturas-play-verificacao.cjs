const { randomUUID } = require('node:crypto');
const { HttpsError } = require('firebase-functions/v2/https');
const { bancoDoUsuario } = require('./grupos-contexto.cjs');
const { conferirToken, interpretarCompraPlay, criarClientePlay, hash, config } = require('./assinaturas-play.cjs');

// Etapa de homologação: registra prova privada, sem escrever direitos/confirmar compra na loja.
async function verificarCompraPlayTeste(raiz, request, { cliente = criarClientePlay(), relogio = Date.now, novoId = randomUUID } = {}) {
  const dados = request.data;
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)
    || Object.keys(dados).length !== 1 || !Object.hasOwn(dados, 'token')) {
    throw new HttpsError('invalid-argument', 'A verificação recebe somente o token da compra.');
  }
  conferirToken(dados.token);
  const uid = request.auth?.uid;
  const banco = await bancoDoUsuario(raiz, uid);
  if (!banco.grupoId) throw new HttpsError('failed-precondition', 'Conclua a migração do grupo antes de testar assinaturas.');
  const grupoId = banco.grupoId;
  const refs = [raiz.doc('assinaturasConfiguracao/google_play'), raiz.doc(`grupos/${grupoId}`),
    raiz.doc(`vinculosUsuarios/${uid}`), banco.doc(`users/${uid}`), raiz.doc(`contaSolicitacoes/${uid}`)];
  function autorizar(docs) {
    const [habilitacao, grupo, vinculo, perfil, exclusao] = docs.map(s => s.data());
    if (grupo?.ativo !== true || grupo.titularUid !== uid || vinculo?.ativo !== true || vinculo.grupoId !== grupoId
      || !perfil || perfil.ativo === false || perfil.role !== 'admin' || exclusao?.etapa != null) {
      throw new HttpsError('permission-denied', 'Somente o titular ativo deste grupo pode verificar compras.');
    }
    if (habilitacao?.homologacaoAtiva !== true || !Array.isArray(habilitacao.gruposPermitidos)
      || !habilitacao.gruposPermitidos.includes(grupoId)) {
      throw new HttpsError('failed-precondition', 'A homologação de compras não está habilitada para este grupo.');
    }
  }
  const limiteRef = raiz.doc(`assinaturasEventos/limite_play_${hash(uid)}`);
  await raiz.runTransaction(async tx => {
    const docs = await tx.getAll(...refs, limiteRef);
    autorizar(docs);
    const agora = relogio(), limite = docs.at(-1).data();
    const janela = Number.isSafeInteger(limite?.inicioEm) && Number.isSafeInteger(limite.contagem) && limite.contagem >= 0
      && limite.inicioEm <= agora && agora - limite.inicioEm < 60000;
    if (janela && limite.contagem >= 5) throw new HttpsError('resource-exhausted', 'Aguarde um minuto antes de verificar novamente.');
    tx.set(limiteRef, { inicioEm: janela ? limite.inicioEm : agora, contagem: janela ? limite.contagem + 1 : 1 });
  });
  const resposta = await cliente.consultar(dados.token);
  const consultadoEm = relogio();
  const prova = interpretarCompraPlay(resposta, { uid, grupoId, agora: consultadoEm });
  if (!prova.teste) throw new HttpsError('failed-precondition', 'Esta etapa aceita somente compras de teste da Google Play.');
  const reciboRef = raiz.doc(`assinaturasCompras/google_play_${hash(dados.token)}`);
  const tentativaRef = reciboRef.collection('validacoes').doc(novoId());
  await raiz.runTransaction(async tx => {
    const docs = await tx.getAll(...refs, reciboRef);
    // Confere novamente após a consulta externa: titular, vínculo ou habilitação podem ter mudado.
    autorizar(docs);
    const anterior = docs.at(-1).data();
    if (anterior && (anterior.grupoId !== grupoId || anterior.uid !== uid || anterior.provedor !== 'google_play'
      || anterior.token !== dados.token || anterior.pacote !== config.pacote)) {
      throw new HttpsError('permission-denied', 'A compra já está associada a outro vínculo.');
    }
    // Vínculo imutável. Tentativas são append-only: resposta lenta não sobrescreve estado mais recente.
    if (!anterior) tx.create(reciboRef, { versao: 1, provedor: 'google_play', pacote: config.pacote,
      uid, grupoId, token: dados.token, criadoEm: consultadoEm, teste: true });
    tx.create(tentativaRef, { versao: 1, consultadoEm, ...prova, direitosConcedidos: false });
  });
  // Não expõe recibos, conta ofuscada, IDs de pedidos ou detalhes de pagamento.
  return { verificadaNaLoja: true, teste: true, plano: prova.plano, estado: prova.estado,
    vigente: prova.vigente, reconhecida: prova.reconhecida, validoAte: prova.validoAte,
    direitosConcedidos: false, contratacaoDisponivel: false };
}

module.exports = { verificarCompraPlayTeste };
