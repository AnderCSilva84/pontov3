import test from 'node:test';
import assert from 'node:assert/strict';
import { montarEscala } from '../src/utils/exportarPdfLembretes.js';
test('PDF organiza horários por pessoa ou pet e preserva a posologia e os dias cadastrados', () => {
  const base = { ativo: true, titulo: 'Cuidado', tipo: 'remedio', medicamento: 'Fictício', posologia: 'Texto cadastrado', destinatarioCuidado: 'crianca', nomeCuidado: 'Pessoa fictícia', horarios: ['20:00', '08:00'], repeticao: 'dias', diasSemana: [1, 3], dataInicio: '2026-10-19' };
  const grupos = montarEscala([base, { ...base, ativo: false }, { ...base, repeticao: 'uma_vez' }, { ...base, destinatarioCuidado: 'gato', nomeCuidado: 'Pet fictício', horarios: ['12:00'] }], new Date('2026-10-20T12:00:00Z'));
  assert.equal(grupos.length, 2);
  const pessoa = grupos.find(g => g.titulo.startsWith('Criança'));
  assert.deepEqual(pessoa.itens.map(i => i.horario), ['08:00', '20:00']);
  assert.deepEqual(pessoa.itens[0].diasSemana, [1, 3]);
  assert.equal(pessoa.itens[0].posologia, 'Texto cadastrado');
  assert.equal(grupos.find(g => g.titulo.startsWith('Gato')).itens.length, 1);
});

test('cadastros homônimos têm escalas separadas e responsáveis próprios', () => {
  const base = { ativo: true, titulo: 'Cuidado', destinatarioCuidado: 'crianca', nomeCuidado: 'Pessoa fictícia', horarios: ['08:00'], repeticao: 'diario', dataInicio: '2026-10-20' };
  const grupos = montarEscala([
    { ...base, cuidadoId: 'crianca-a', responsavelDescricao: 'Responsável A' },
    { ...base, cuidadoId: 'crianca-b', responsavelDescricao: 'Todos os usuários habilitados' },
  ], new Date('2026-10-20T12:00:00Z'));
  assert.equal(grupos.length, 2);
  assert.deepEqual(grupos.map(g => g.responsavel), ['Responsável A', 'Todos os usuários habilitados']);
});
