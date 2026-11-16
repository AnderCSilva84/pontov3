const { HttpsError } = require('firebase-functions/v2/https');
const { resolverAssinatura } = require('./assinaturas-dominio.cjs');

function permiteCompartilhamento(grupo, perfil, assinatura, uid, agora = Date.now()) {
  if (grupo?.ativo !== true || !perfil || perfil.ativo === false) return false;
  return grupo.assinaturasAtivas !== true || grupo.titularUid === uid
    || perfil.acessoCompartilhado !== false && resolverAssinatura(assinatura, agora).direitos.compartilhamento;
}

async function exigirOperacaoCompartilhada(tx, banco, uid, { continuidade = false, agora = Date.now(), grupoVerificado } = {}) {
  if (!banco.grupoId) return;
  const raiz = banco.raiz;
  const grupo = grupoVerificado || await tx.get(raiz.doc(`grupos/${banco.grupoId}`));
  if (grupo.data()?.ativo !== true) throw new HttpsError('permission-denied', 'Grupo sem acesso.');
  if (grupo.data().assinaturasAtivas !== true) return;
  const [perfil, vinculo, exclusao, assinatura] = await tx.getAll(banco.doc(`users/${uid}`),
    raiz.doc(`vinculosUsuarios/${uid}`), raiz.doc(`contaSolicitacoes/${uid}`), raiz.doc(`assinaturasGrupos/${banco.grupoId}`));
  if (!perfil.exists || perfil.data().ativo === false || vinculo.data()?.ativo !== true || vinculo.data()?.grupoId !== banco.grupoId || exclusao.data()?.etapa) throw new HttpsError('permission-denied', 'O acesso ao grupo mudou.');
  if (grupo.data().titularUid === uid) return;
  if (continuidade) return; // Somente o handler de ponto passa isto após ler jornada própria aberta no servidor.
  if (permiteCompartilhamento(grupo.data(), perfil.data(), assinatura.data(), uid, agora)) return;
  throw new HttpsError('failed-precondition', 'Novas ações compartilhadas estão indisponíveis. Seu histórico próprio permanece acessível.', { recurso: 'compartilhamento' });
}
// Guarda somente de leitura para consultas que não possuem transação de escrita.
// Chamar antes de ler dados do grupo e novamente antes de retornar consultas longas.
async function exigirConsultaCompartilhada(banco, uid) {
  if (!banco.grupoId) return;
  await banco.runTransaction(tx => exigirOperacaoCompartilhada(tx, banco, uid));
}
module.exports = { exigirOperacaoCompartilhada, permiteCompartilhamento, exigirConsultaCompartilhada };
