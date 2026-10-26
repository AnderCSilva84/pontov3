import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {criarFilaPonto,escopoPonto} from '../src/services/pontoFila.js';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
test('revisão atualiza somente captura própria, preserva payload e não é revertida por resposta antiga',async()=>{
  const fila=criarFilaPonto({indexedDB:new IDBFactory()});
  const contexto={tipo:'grupo',id:'a'},escopo=escopoPonto('u',contexto);
  const p={uid:'u',contexto,funcionarioId:'f',operacaoId:crypto.randomUUID(),jornadaData:'2026-10-20',capturadoEmMs:1,modalidade:'offline_pendente'};
  await fila.inserir(p);await fila.assumir(escopo,'aba');
  const r={origem:'revisao_offline',operacaoId:p.operacaoId,jornadaData:p.jornadaData,status:'confirmado',hora:'09:00'};
  assert.equal(await fila.aplicarRevisao(escopoPonto('outra',contexto),r),false);
  assert.equal(await fila.aplicarRevisao(escopoPonto('u',{tipo:'grupo',id:'b'}),r),false);
  await assert.rejects(fila.aplicarRevisao(escopo,{...r,jornadaData:'2026-10-21'}),/incompatível/);
  await fila.aplicarRevisao(escopo,r);
  await fila.concluir(escopo,'aba',p.operacaoId,{status:'recebida',resultado:{status:'recebida'}});
  const o=(await fila.listar(escopo))[0];assert.deepEqual(o.payload,p);assert.equal(o.status,'confirmado');assert.deepEqual(o.resultado,r);
  assert.equal(await fila.assumir(escopo,'outra-aba'),null);
  await fila.limparFinalizados(escopo);assert.equal(await fila.aplicarRevisao(escopo,r),false);
  await fila.fechar();
});
test('ajuste administrativo não aciona push online nem lê destinatários',async()=>{
  const {criarPush}=require('../functions/push.cjs');
  const handlers=criarPush({admin:{},db:{collection(){throw Error('Não deve consultar banco para ajuste administrativo.');}},somenteHandlers:true});
  await handlers.alertaRegistroPonto({data:{data:()=>({origem:'revisao_offline',tipo:'ENTRADA'})}});
});
