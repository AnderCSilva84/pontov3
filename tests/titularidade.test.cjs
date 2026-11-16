const test = require('node:test'), assert = require('node:assert/strict');
const { transferenciaAutomatica } = require('../functions/titularidade.cjs');
const agora = 100000, pago = { versao:1,verificado:true,provedor:'google_play',plano:'prata',estado:'ativo',inicioEm:90000,validoAte:110000 };
test('transferência automática apenas no Free, sem cobrança paga pendente ou renovável', () => {
  assert.equal(transferenciaAutomatica(null,agora),true);
  assert.equal(transferenciaAutomatica(pago,agora),false);
  assert.equal(transferenciaAutomatica({...pago,estado:'suspenso',validoAte:99000},agora),false);
  assert.equal(transferenciaAutomatica({...pago,estado:'pendente',verificado:false},agora),false);
  assert.equal(transferenciaAutomatica({...pago,estado:'expirado',validoAte:99000,renovacaoAutomatica:true},agora),false);
  assert.equal(transferenciaAutomatica({...pago,estado:'expirado',validoAte:99000,renovacaoAutomatica:false},agora),true);
});
