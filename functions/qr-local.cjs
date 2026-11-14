// Entrada opt-in local: não carrega gatilhos, agendamentos, push ou integrações.
const { exigirEmuladoresLocais, validarOperacaoQrLocal } = require('./teste-local.cjs');
const projectId = exigirEmuladoresLocais();
const admin = require('firebase-admin');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
admin.initializeApp({ projectId });
const compras = require('./compras.cjs');
exports.comprasOperacao = onCall({ timeoutSeconds: 60 }, request => {
  exigirEmuladoresLocais();
  try { validarOperacaoQrLocal(request.data); }
  catch (e) { throw new HttpsError('failed-precondition', e.message); }
  return compras.comprasOperacao.run(request);
});
