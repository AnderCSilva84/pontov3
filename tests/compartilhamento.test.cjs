const test = require('node:test'), assert = require('node:assert/strict');
const { permiteCompartilhamento } = require('../functions/compartilhamento.cjs');
const agora = 100000, grupo = { ativo: true, assinaturasAtivas: true, titularUid: 'titular' };
const pago = { versao: 1, verificado: true, provedor: 'google_play', plano: 'prata', estado: 'ativo', inicioEm: agora - 1000, validoAte: agora + 1000 };
test('titular mantém recursos compartilhados próprios no Free, membro não recebe operação ou push', () => {
  assert.equal(permiteCompartilhamento(grupo, { ativo: true }, null, 'titular', agora), true);
  assert.equal(permiteCompartilhamento(grupo, { ativo: true }, null, 'membro', agora), false);
});
test('suspensão e expiração removem destinatário operacional sem desativar sua identidade', () => {
  const perfil = { ativo: true, acessoCompartilhado: false };
  assert.equal(permiteCompartilhamento(grupo, perfil, pago, 'membro', agora), false);
  assert.equal(perfil.ativo, true);
  assert.equal(permiteCompartilhamento(grupo, { ativo: true }, pago, 'membro', pago.validoAte), false);
  assert.equal(permiteCompartilhamento(grupo, { ativo: true }, pago, 'membro', agora), true);
});
test('cancelamento vigente e carência verificada preservam acesso; recibo não verificado não preserva', () => {
  for (const estado of ['cancelamento_agendado','carencia']) assert.equal(permiteCompartilhamento(grupo, {}, { ...pago, estado }, 'membro', agora), true);
  assert.equal(permiteCompartilhamento(grupo, {}, { ...pago, verificado: false }, 'membro', agora), false);
});
test('transição preservada; conta e grupo inativos não recebem autorização', () => {
  assert.equal(permiteCompartilhamento({ ...grupo, assinaturasAtivas: false }, {}, null, 'membro', agora), true);
  assert.equal(permiteCompartilhamento(grupo, { ativo: false }, pago, 'titular', agora), false);
  assert.equal(permiteCompartilhamento({ ...grupo, ativo: false }, {}, pago, 'titular', agora), false);
});
