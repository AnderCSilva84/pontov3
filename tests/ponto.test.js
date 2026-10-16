import test from 'node:test';
import assert from 'node:assert/strict';
import validacao from '../functions/ponto-validacao.cjs';
const { aplicarAcao, distanciaMetros } = validacao;

test('rejeita datas inexistentes e aceita ano bissexto', () => {
  assert.equal(validacao.dataValida('2026-02-29'), false);
  assert.equal(validacao.dataValida('2028-02-29'), true);
  assert.equal(validacao.dataValida('2026-13-01'), false);
  assert.equal(validacao.dataValida('2026-04-31'), false);
});

test('impede saltar etapas, repetir entrada e reabrir dia encerrado', () => {
  assert.throws(() => aplicarAcao(null, 'SAIDA', '08:00', {}, 1));
  assert.throws(() => aplicarAcao({ entrada: '08:00' }, 'ENTRADA', '08:01', {}, 1));
  assert.throws(() => aplicarAcao({ entrada: '08:00', saida: '17:00' }, 'ENTRADA', '17:01', {}, 1));
});

test('calcula jornada com intervalo e rejeita regressão de horário', () => {
  const dia = { entrada: '08:00', saidaIntervalo: '12:00', entradaIntervalo: '13:00' };
  const resultado = aplicarAcao(dia, 'SAIDA', '17:00', { cargaSegSexMin: 480 }, 1);
  assert.equal(resultado.totalMin, 480);
  assert.equal(resultado.saldoMin, 0);
  assert.equal(resultado.encerrado, true);
  assert.throws(() => aplicarAcao(dia, 'SAIDA', '12:59', {}, 1));
  assert.throws(() => aplicarAcao(dia, 'SAIDA', '25:00', {}, 1));
});

test('respeita carga zero no sábado e desconto de intervalo configurado', () => {
  assert.equal(aplicarAcao({ entrada: '08:00' }, 'SAIDA', '12:00', { cargaSabadoMin: 0 }, 6).saldoMin, 240);
  const resultado = aplicarAcao({ entrada: '08:00' }, 'SAIDA', '17:00', { desconsiderarIntervalo: true, intervaloPrevistoMin: 60 }, 1);
  assert.equal(resultado.totalMin, 480);
  assert.throws(() => aplicarAcao({ entrada: '08:00' }, 'SAIDA', '17:00', { desconsiderarIntervalo: true, intervaloPrevistoMin: -1 }, 1));
});

test('calcula distância para verificar o raio do local autorizado', () => {
  assert.equal(distanciaMetros(-3.7, -38.5, -3.7, -38.5), 0);
  assert.ok(distanciaMetros(0, 0, 0, 1) > 111000);
  assert.ok(distanciaMetros(0, 0, 0, 1) < 112000);
});
