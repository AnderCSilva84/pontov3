import test from 'node:test';
import assert from 'node:assert/strict';
import { jornadasParaExibicao, removerProgramacaoFutura } from '../src/utils/programacaoJornada.js';
test('exibição deduplica vigência sem mudar a versão usada pelo resolvedor nem o cadastro original', () => {
  const primeiro = { vigencia: '2026-11-01', horasSemanais: 44 }, duplicado = { vigencia: '2026-11-01', horasSemanais: 40 };
  const entrada = [{ vigencia: '2026-12-01', horasSemanais: 42 }, primeiro, duplicado];
  const saida = jornadasParaExibicao(entrada);
  assert.equal(saida.length, 2); assert.equal(saida[0], primeiro); assert.equal(entrada.length, 3);
});
test('exclusão só remove a programação futura escolhida e conserva todas as versões do histórico', () => {
  const entrada = [{ vigencia: '2026-11-01' }, { vigencia: '2026-11-01' }, { vigencia: '2026-12-01' }, { vigencia: '2027-01-01' }];
  assert.throws(() => removerProgramacaoFutura(entrada, '2026-11-01', '2026-11-16'));
  assert.throws(() => removerProgramacaoFutura(entrada, '2026-11-16', '2026-11-16'));
  assert.deepEqual(removerProgramacaoFutura(entrada, '2026-12-01', '2026-11-16'), [entrada[0], entrada[1], entrada[3]]);
  assert.equal(entrada.length, 4);
});
