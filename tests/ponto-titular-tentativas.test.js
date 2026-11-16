import test from 'node:test';
import assert from 'node:assert/strict';
import { criarTentativasTitular } from '../src/utils/pontoTitularTentativas.js';
function armazenamento() { const mapa = new Map(); return { get length() { return mapa.size; }, key: i => [...mapa.keys()][i], getItem: k => mapa.get(k) ?? null, setItem: (k,v) => mapa.set(k,v), removeItem: k => mapa.delete(k) }; }
const payload = { acao: 'registrar', operacaoId: 'tentativa-1', funcionarioId: 'f', dataEsperada: '2026-11-15' };
test('tentativa sobrevive à recriação do serviço e é isolada por conta/grupo', () => {
  const storage = armazenamento(), a = criarTentativasTitular(storage);
  a.salvar('a','g',payload);
  const b = criarTentativasTitular(storage);
  assert.deepEqual(b.ler('a','g').payload, payload);
  assert.equal(b.ler('b','g'), null); assert.equal(b.listar('a').length, 1);
  assert.throws(() => b.salvar('a','g',{ ...payload, operacaoId: 'outra' }), /Reconcilie/);
});
test('resposta desconhecida ou de outra tentativa não apaga captura', () => {
  const a = criarTentativasTitular(armazenamento()); a.salvar('a','g',payload);
  for (const r of [{ operacaoId:'outra', status:'confirmado' }, { operacaoId:payload.operacaoId,status:'pendente' }]) assert.throws(() => a.concluir('a','g',payload.operacaoId,r), /preservada/);
  assert.ok(a.ler('a','g'));
  a.concluir('a','g',payload.operacaoId,{operacaoId:payload.operacaoId,status:'rejeitada'});
  assert.equal(a.ler('a','g'), null);
});
test('armazenamento indisponível falha antes de permitir envio sem proteção local', () => {
  const a = criarTentativasTitular({ getItem: () => null, setItem: () => { throw Error('Sem armazenamento'); } });
  assert.throws(() => a.salvar('a','g',payload), /Sem armazenamento/);
});
