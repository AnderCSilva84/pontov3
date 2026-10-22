import test from 'node:test';
import assert from 'node:assert/strict';
import { acoesPendentesDoDia } from '../src/utils/lembretesSequencia.js';
const ms = (hora, dia = '2026-10-20') => Date.parse(`${dia}T${hora}:00-03:00`);
const base = { id: 'remedio', versao: 1, titulo: 'Lembrete de teste', medicamento: 'Fictício', ativo: true, horarios: ['07:00', '19:00'], dataInicio: '2026-10-20', repeticao: 'diario', proximoDisparoEmMs: ms('07:00') };
test('sequência mostra uma dose por horário, oculta concluída e avança sem perder o dia', () => {
  const l = { ...base, ocorrencias: [{ id: `1_${ms('07:00')}`, horarioMs: ms('07:00'), status: 'enviado' }] };
  assert.deepEqual(acoesPendentesDoDia([l], ms('08:00')).map(a => [a.hora, a.liberada]), [['07:00', true], ['19:00', false]]);
  l.ocorrencias[0].status = 'concluido';
  assert.equal(acoesPendentesDoDia([l], ms('08:00'))[0].hora, '19:00');
  l.ocorrencias.push({ id: `1_${ms('19:00')}`, status: 'concluido' });
  assert.equal(acoesPendentesDoDia([l], ms('20:00')).length, 0);
  l.proximoDisparoEmMs = ms('07:00', '2026-10-21');
  assert.equal(acoesPendentesDoDia([l], ms('00:01', '2026-10-21')).length, 2);
});
test('respeita dias, pausas, datas únicas e não inventa doses anteriores ao cadastro', () => {
  assert.equal(acoesPendentesDoDia([{ ...base, ativo: false }], ms('08:00')).length, 0);
  assert.equal(acoesPendentesDoDia([{ ...base, repeticao: 'dias', diasSemana: [1] }], ms('08:00')).length, 0);
  assert.equal(acoesPendentesDoDia([{ ...base, repeticao: 'uma_vez' }], ms('08:00', '2026-10-21')).length, 0);
  assert.deepEqual(acoesPendentesDoDia([{ ...base, proximoDisparoEmMs: ms('19:00') }], ms('13:00')).map(a => a.hora), ['19:00']);
  const falha = { ...base, proximoDisparoEmMs: ms('19:00'), ocorrencias: [{ id: `1_${ms('07:00')}`, status: 'sem_dispositivo' }] };
  assert.equal(acoesPendentesDoDia([falha], ms('08:00'))[0].hora, '07:00');
});
