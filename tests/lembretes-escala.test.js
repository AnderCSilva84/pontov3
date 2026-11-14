import test from 'node:test';
import assert from 'node:assert/strict';
import { montarEscala,compromissoEscala } from '../src/utils/exportarPdfLembretes.js';
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

test('compromisso vem por data/hora próprias, sem confundir aviso ou interpretar observações',()=>{
 const base={ativo:true,tipo:'consulta',nomeCuidado:'Pessoa fictícia',destinatarioCuidado:'adulto',repeticao:'uma_vez',dataInicio:'2026-10-28',horarios:['08:00'],titulo:'Consulta fictícia',observacao:'Consulta às 13:30 no dia 06/11'};
 const g=montarEscala([{...base,dataCompromisso:'2026-11-06',horarioCompromisso:'13:30'},{...base,dataCompromisso:'2026-10-30',horarioCompromisso:'16:00'}],new Date('2026-10-29T12:00:00Z'));
 assert.equal(g[0].itens.length,2);assert.equal(g[0].itens[0].dataCompromisso,'2026-10-30');assert.equal(compromissoEscala(g[0].itens[1]).hora,'13:30');assert.equal(g[0].itens[1].horario,'08:00');assert.equal(compromissoEscala({...base,horario:'08:00'}).proprio,false);
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
