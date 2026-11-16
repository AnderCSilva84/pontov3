const { HttpsError } = require('firebase-functions/v2/https');
const { FieldValue } = require('firebase-admin/firestore');
const { resolverAssinatura, verificarCota } = require('./assinaturas-dominio.cjs');

// Executar dentro da mesma transação do cadastro, antes de qualquer escrita.
async function validarNovoMembro(tx, raiz, banco, grupo, ator, role, agora = Date.now()) {
  if (grupo.assinaturasAtivas !== true) return;
  if (grupo.titularUid !== ator) throw new HttpsError('permission-denied', 'Somente o titular cadastra contas neste grupo.');
  if (role === 'admin') throw new HttpsError('failed-precondition', 'O grupo possui somente um administrador: o titular.');
  const assinatura = await tx.get(raiz.doc(`assinaturasGrupos/${banco.grupoId}`));
  const { direitos } = resolverAssinatura(assinatura.data(), agora);
  if (!direitos.compartilhamento) throw new HttpsError('failed-precondition', 'O plano Free não permite contas compartilhadas. Use o aparelho do titular para registrar o ponto.');
  if (role === 'funcionario') {
    // Inclui cadastros antigos sem "ativo"; somente ativo:false libera a vaga.
    const funcionarios = await tx.get(banco.collection('funcionarios'));
    const uso = funcionarios.docs.filter(doc => doc.data().ativo !== false).length;
    const cota = verificarCota(direitos, 'funcionarios', uso);
    if (!cota.permitido) throw new HttpsError('resource-exhausted', `Seu plano permite até ${cota.limite} funcionários cadastrados.`, cota);
  }
  // Serializa inclusões concorrentes, inclusive consultas sem nenhum documento.
  tx.update(raiz.doc(`grupos/${banco.grupoId}`), { cotasRevisao: FieldValue.increment(1) });
}

module.exports = { validarNovoMembro };
