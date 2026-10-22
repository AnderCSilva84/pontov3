const test = require('node:test');
const assert = require('node:assert/strict');
const { validarLembrete, proximoDisparo, cuidadoraAtiva, destinatarioAtivo, dentroExpediente } = require('../functions/lembretes-dominio.cjs');
const base = { titulo: 'Cuidado de teste', tipo: 'remedio', medicamento: 'Medicamento fictício', posologia: 'Orientação fictícia', horario: '12:00', dataInicio: '2026-10-19', repeticao: 'uma_vez' };
test('lembretes para pets e consultas validam identificação e mantêm a lógica de doses', () => {
  const agora = Date.parse('2026-10-19T10:00:00Z');
  const pet = validarLembrete({ ...base, destinatarioCuidado: 'gato', nomeCuidado: 'Pet fictício', horarios: ['08:00', '20:00'] }, agora);
  assert.equal(pet.nomeCuidado, 'Pet fictício'); assert.equal(pet.horarios.length, 2);
  assert.throws(() => validarLembrete({ ...base, destinatarioCuidado: 'cao' }, agora), /pet/);
  assert.equal(validarLembrete({ ...base, tipo: 'consulta', medicamento: '', posologia: '' }, agora).tipo, 'consulta');
  assert.equal(destinatarioAtivo({ role: 'admin', lembretesHabilitados: true }), true);
  assert.equal(destinatarioAtivo({ role: 'admin' }), false);
  assert.equal(destinatarioAtivo({ role: 'admin', lembretesHabilitados: true, ativo: false }), false);
});
test('avisos respeitam escala local, folgas e jornada que atravessa a meia-noite; admin recebe 24h', () => {
  const pessoa = { role: 'funcionario' }, func = { escala: { segunda: { inicio: '08:00', fim: '17:00', cargaMin: 480 } } };
  const ms = hora => Date.parse(`2026-10-19T${hora}:00-03:00`);
  assert.equal(dentroExpediente(pessoa, func, ms('07:59')), false);
  assert.equal(dentroExpediente(pessoa, func, ms('08:00')), true);
  assert.equal(dentroExpediente(pessoa, func, ms('16:59')), true);
  assert.equal(dentroExpediente(pessoa, func, ms('17:00')), false);
  assert.equal(dentroExpediente(pessoa, func, ms('08:00') + 86400000), false);
  assert.equal(dentroExpediente(pessoa, null, ms('12:00')), false);
  assert.equal(dentroExpediente({ role: 'admin' }, null, ms('03:00')), true);
  const noite = { escala: { segunda: { inicio: '22:00', fim: '06:00', cargaMin: 480 } } };
  assert.equal(dentroExpediente(pessoa, noite, ms('23:00')), true);
  assert.equal(dentroExpediente(pessoa, noite, ms('05:00') + 86400000), true);
  assert.equal(dentroExpediente(pessoa, noite, ms('06:00') + 86400000), false);
});
test('várias doses preservam dias, ordenam horários e avançam dentro do mesmo dia', () => {
  const dados = validarLembrete({ ...base, horarios: ['20:00', '08:00'], repeticao: 'dias', diasSemana: [1, 3] }, Date.parse('2026-10-19T10:00:00Z'));
  assert.deepEqual(dados.horarios, ['08:00', '20:00']);
  assert.equal(dados.proximoMs, Date.parse('2026-10-19T11:00:00Z'));
  assert.equal(proximoDisparo(dados, dados.proximoMs), Date.parse('2026-10-19T23:00:00Z'));
  assert.equal(proximoDisparo(dados, Date.parse('2026-10-19T23:00:00Z')), Date.parse('2026-10-21T11:00:00Z'));
  assert.equal(proximoDisparo({ ...dados, repeticao: 'uma_vez' }, Date.parse('2026-10-19T23:00:00Z')), null);
  for (const horarios of [[], ['08:00', '08:00'], ['24:00'], Array(25).fill('08:00'), '08:00']) assert.throws(() => validarLembrete({ ...base, horarios }));
});
test('lembretes validam remédio e posologia sem inferir dose e mantêm horário UTC−3', () => {
  const r = validarLembrete(base, Date.parse('2026-10-19T14:59:00Z'));
  assert.equal(r.proximoMs, Date.parse('2026-10-19T15:00:00Z'));
  assert.equal(r.posologia, base.posologia);
  for (const alteracoes of [{ posologia: '' }, { medicamento: '' }, { posologia: 'x'.repeat(201) }, { horario: '25:00' }, { dataInicio: '2026-02-30' }]) assert.throws(() => validarLembrete({ ...base, ...alteracoes }));
  assert.throws(() => validarLembrete(base, Date.parse('2026-10-19T15:01:00Z')), /futuro/);
});
test('repetição avança dias e semanas, sem disparar de novo no mesmo minuto', () => {
  const agora = Date.parse('2026-10-19T15:00:00Z');
  assert.equal(proximoDisparo({ ...base, repeticao: 'diario' }, agora), Date.parse('2026-10-20T15:00:00Z'));
  assert.equal(proximoDisparo({ ...base, repeticao: 'dias', diasSemana: [1] }, agora), Date.parse('2026-10-26T15:00:00Z'));
  assert.equal(proximoDisparo(base, agora), null);
  assert.throws(() => validarLembrete({ ...base, repeticao: 'dias', diasSemana: [] }, agora), /dias/);
  assert.throws(() => validarLembrete({ ...base, repeticao: 'dias', diasSemana: [7] }, agora), /dias/);
  assert.equal(cuidadoraAtiva({ role: 'funcionario', babaCuidadora: true }), true);
  assert.equal(cuidadoraAtiva({ role: 'funcionario', babaCuidadora: true, ativo: false }), false);
  assert.equal(cuidadoraAtiva({ role: 'consulta', babaCuidadora: true }), false);
});
