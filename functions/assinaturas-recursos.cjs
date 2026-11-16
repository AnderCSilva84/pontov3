const { HttpsError } = require('firebase-functions/v2/https');
const { resolverAssinatura } = require('./assinaturas-dominio.cjs');

// Somente leituras: pode ser usado antes da rede e dentro da transação final.
async function exigirRecurso(tx, banco, uid, recurso, agora = Date.now()) {
  if (!['importacaoQr', 'escritorioContabil', 'compartilhamento'].includes(recurso)) throw new Error('Recurso inválido.');
  if (!banco.grupoId) return;
  const raiz = banco.raiz;
  const grupo = await tx.get(raiz.doc(`grupos/${banco.grupoId}`));
  if (grupo.data()?.ativo !== true) throw new HttpsError('permission-denied', 'O grupo está sem acesso.');
  if (grupo.data()?.assinaturasAtivas !== true) return;
  const [vinculo, perfil, exclusao, assinatura] = await tx.getAll(
    raiz.doc(`vinculosUsuarios/${uid}`), banco.doc(`users/${uid}`),
    raiz.doc(`contaSolicitacoes/${uid}`), raiz.doc(`assinaturasGrupos/${banco.grupoId}`));
  if (grupo.data().ativo !== true || vinculo.data()?.ativo !== true || vinculo.data()?.grupoId !== banco.grupoId
    || !perfil.exists || perfil.data().ativo === false || exclusao.data()?.etapa) {
    throw new HttpsError('permission-denied', 'O acesso ao grupo mudou. Entre novamente.');
  }
  if (grupo.data().titularUid !== uid && perfil.data().acessoCompartilhado === false) throw new HttpsError('failed-precondition', 'O acesso compartilhado está suspenso.');
  const { direitos } = resolverAssinatura(assinatura.data(), agora);
  if (!direitos[recurso]) {
    const mensagem = recurso === 'importacaoQr' ? 'A importação fiscal está disponível nos planos Ouro e Diamante. Compras manuais e notas já importadas continuam disponíveis.'
      : recurso === 'escritorioContabil' ? 'O Escritório contábil está disponível a partir do plano Prata.'
        : 'O compartilhamento está disponível a partir do plano Prata.';
    throw new HttpsError('failed-precondition', mensagem, { recurso });
  }
}
module.exports = { exigirRecurso };
