const { HttpsError } = require('firebase-functions/v2/https');
const { FieldValue } = require('firebase-admin/firestore');
const { resolverAssinatura, verificarCota } = require('./assinaturas-dominio.cjs');

// Apenas leituras até retornar. Chamar confirmar() depois de TODAS as leituras
// da operação e antes das escritas, na mesma transação.
async function prepararCota(tx, banco, uid, cota, incremento = 1) {
  if (!banco.grupoId) return () => {};
  if (!['listas', 'tarefas', 'lembretes'].includes(cota)) throw new Error('Cota desconhecida.');
  const raiz = banco.raiz;
  const grupo = await tx.get(raiz.doc(`grupos/${banco.grupoId}`));
  if (grupo.data()?.assinaturasAtivas !== true) return () => {};
  const [vinculo, perfil, exclusao, assinatura] = await tx.getAll(
    raiz.doc(`vinculosUsuarios/${uid}`),
    banco.doc(`users/${uid}`), raiz.doc(`contaSolicitacoes/${uid}`), raiz.doc(`assinaturasGrupos/${banco.grupoId}`));
  if (grupo.data()?.ativo !== true || vinculo.data()?.ativo !== true || vinculo.data()?.grupoId !== banco.grupoId
    || !perfil.exists || perfil.data().ativo === false || exclusao.data()?.etapa) {
    throw new HttpsError('permission-denied', 'O acesso ao grupo mudou. Entre novamente.');
  }
  const { direitos } = resolverAssinatura(assinatura.data());
  let uso;
  if (cota === 'listas') {
    uso = (await tx.get(banco.collection('comprasListas').where('status', 'in', ['rascunho', 'em_compra']))).size;
  } else if (cota === 'tarefas') {
    const fixas = await tx.get(banco.collection('tarefasSemanais'));
    const avulsas = await tx.get(banco.collection('tarefas'));
    uso = fixas.docs.filter(d => d.data().ativa !== false).length
      + avulsas.docs.filter(d => d.data().concluida !== true).length;
  } else {
    uso = (await tx.get(banco.collection('lembretes').where('ativo', '==', true))).size;
  }
  const resultado = verificarCota(direitos, cota, uso, incremento);
  if (!resultado.permitido) throw new HttpsError('resource-exhausted', `O limite do seu plano para ${cota} é ${resultado.limite}. Conclua ou desative registros antes de adicionar outros.`, { cota, ...resultado });
  return () => tx.update(grupo.ref, { cotasRevisao: FieldValue.increment(1) });
}
module.exports = { prepararCota };
