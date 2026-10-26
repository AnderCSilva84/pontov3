import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBObjectStore} from 'fake-indexeddb';
import {randomUUID} from 'node:crypto';
import {criarFilaPonto,escopoPonto} from '../src/services/pontoFila.js';
import {criarSincronizadorPonto} from '../src/services/pontoSincronizacao.js';
import {criarOperacaoPonto,resultadoErroPonto,mensagemOperacao,atualizarResumoSeguro} from '../src/utils/pontoOperacao.js';
import {dataOperacional,agoraNoFusoPonto} from '../src/utils/dataPonto.js';
const contexto={tipo:'grupo',id:'casa'},sessao={uid:'func',contexto},escopo=escopoPonto(sessao.uid,contexto);
function p(mais={}){return criarOperacaoPonto({user:{uid:'func'},contexto,funcionarioId:'f',tipo:'ENTRADA',jornadaData:'2026-10-22',modalidade:'online',amostra:{latitude:0,longitude:0,accuracy:7,instanteMs:123},agora:123,operacaoId:randomUUID(),...mais});}
test('IndexedDB: operação imutável, contexto isolado, limite e uma pendência por jornada',async()=>{
  const indexedDB=new IDBFactory(),fila=criarFilaPonto({indexedDB,limite:2});const payload=p();
  await fila.inserir(payload);payload.tipo='SAIDA';
  assert.equal((await fila.listar(escopo))[0].payload.tipo,'ENTRADA');
  assert.equal((await fila.listar(escopoPonto('outra',contexto))).length,0);
  await assert.rejects(fila.inserir(p()),/jornada/);
  await fila.inserir(p({jornadaData:'2026-10-23'}));await assert.rejects(fila.inserir(p({jornadaData:'2026-10-24'})),/limite/);
  await fila.fechar();
});
test('IndexedDB adapter: fechar/reabrir conexão recupera operação em trânsito após expirar lease',async()=>{
  const indexedDB=new IDBFactory();let agora=100;
  let fila=criarFilaPonto({indexedDB,relogio:()=>agora});const payload=p();await fila.inserir(payload);
  await fila.assumir(escopo,'aba1');await fila.fechar();fila=criarFilaPonto({indexedDB,relogio:()=>agora});
  assert.equal((await fila.listar(escopo))[0].status,'enviando');assert.equal(await fila.assumir(escopo,'aba2'),null);
  agora+=60001;const recuperada=await fila.assumir(escopo,'aba2');assert.deepEqual(recuperada.payload,payload);assert.equal(recuperada.tentativas,2);
  await fila.fechar();
});
test('duas conexões/abas: lease transacional impede envios concorrentes',async()=>{
  const indexedDB=new IDBFactory(),a=criarFilaPonto({indexedDB}),b=criarFilaPonto({indexedDB});await a.inserir(p());
  let liberar;const aguardar=new Promise(resolve=>{liberar=resolve;});let chamados=0;
  const enviar=async payload=>{chamados++;await aguardar;return{operacaoId:payload.operacaoId,status:'confirmado'};};
  const sa=criarSincronizadorPonto({fila:a,enviar,sessaoAtual:()=>sessao,dono:'a'}),sb=criarSincronizadorPonto({fila:b,enviar,sessaoAtual:()=>sessao,dono:'b'});
  const primeiro=sa(sessao);await new Promise(resolve=>setTimeout(resolve,20));await sb(sessao);assert.equal(chamados,1);
  liberar();await primeiro;assert.equal((await a.listar(escopo))[0].status,'confirmado');await a.fechar();await b.fechar();
});
test('resposta perdida: retry conserva ID/payload/modalidade e confirmação não depende do resumo',async()=>{
  const indexedDB=new IDBFactory();let agora=100;const fila=criarFilaPonto({indexedDB,relogio:()=>agora});const payload=p(),enviados=[];
  await fila.inserir(payload);let falhou=false;
  const sync=criarSincronizadorPonto({fila,sessaoAtual:()=>sessao,relogio:()=>agora,enviar:async p=>{enviados.push(p);if(!falhou){falhou=true;throw{code:'functions/deadline-exceeded'};}return{operacaoId:p.operacaoId,status:'confirmado',hora:'10:00'};}});
  await sync(sessao);assert.equal((await fila.listar(escopo))[0].status,'incerta');agora+=600000;await sync(sessao);
  assert.deepEqual(enviados,[payload,payload]);
  assert.equal(await atualizarResumoSeguro(async()=>{throw Error('resumo indisponível');}),false);assert.equal((await fila.listar(escopo))[0].status,'confirmado');await fila.fechar();
});
test('persistência indisponível não envia nem anuncia armazenamento',async()=>{
  const fila=criarFilaPonto({indexedDB:null});await assert.rejects(fila.inserir(p()),/Nenhuma tentativa foi salva/);
});
test('logout antes do envio preserva fila; outra conta/contexto não a envia ou visualiza',async()=>{
  const fila=criarFilaPonto({indexedDB:new IDBFactory()});await fila.inserir(p());let atual=null,chamados=0;
  const sync=criarSincronizadorPonto({fila,sessaoAtual:()=>atual,enviar:async()=>{chamados++;}});
  await sync(sessao);atual={uid:'outro',contexto};await sync(atual);atual={uid:'func',contexto:{tipo:'grupo',id:'outro'}};await sync(sessao);
  assert.equal(chamados,0);assert.equal((await fila.listar(escopo))[0].status,'pendente');await fila.fechar();
});
test('captura offline recebida não é confirmação, bloqueia só jornada afetada, nunca é limpa como finalizada',async()=>{
  const fila=criarFilaPonto({indexedDB:new IDBFactory()});const payload=p({modalidade:'offline_pendente'});await fila.inserir(payload);
  const sync=criarSincronizadorPonto({fila,sessaoAtual:()=>sessao,enviar:async p=>({operacaoId:p.operacaoId,status:'recebida'})});await sync(sessao);
  assert.match(mensagemOperacao((await fila.listar(escopo))[0]),/Não altera sua jornada/);
  await assert.rejects(fila.inserir(p()),/jornada/);await fila.inserir(p({jornadaData:'2026-10-23'}));await fila.limparFinalizados(escopo);assert.equal((await fila.listar(escopo)).length,2);await fila.fechar();
});
test('erros desconhecidos mantêm incerteza/backoff; conflito é distinto',()=>{
  assert.equal(resultadoErroPonto(Error('desconhecido'),1).status,'incerta');assert.equal(resultadoErroPonto({code:'functions/already-exists'},1).status,'conflito');
  assert.equal(resultadoErroPonto({code:'functions/unauthenticated'},1).status,'incerta');const r=resultadoErroPonto({},999,100,()=>1);assert.equal(r.proximaTentativaMs,375100);
  assert.equal(resultadoErroPonto({code:'functions/permission-denied'},1).status,'incerta');
  assert.equal(resultadoErroPonto({code:'functions/failed-precondition'},1).status,'incerta');
});
test('data operacional centralizada, virada de dia e rótulo no fuso de Fortaleza',()=>{
  assert.equal(dataOperacional(Date.parse('2026-10-23T02:59:59Z')),'2026-10-22');assert.equal(dataOperacional(Date.parse('2026-10-23T03:00:00Z')),'2026-10-23');
  assert.equal(agoraNoFusoPonto(Date.parse('2026-10-23T02:00Z')).getDate(),22);
});
test('retries automáticos param em cinco tentativas; nova ação manual mantém identidade',async()=>{
  let agora=100,envios=0;const fila=criarFilaPonto({indexedDB:new IDBFactory(),relogio:()=>agora}),payload=p();await fila.inserir(payload);
  const sync=criarSincronizadorPonto({fila,sessaoAtual:()=>sessao,relogio:()=>agora,enviar:async()=>{envios++;throw Error('sem servidor');}});
  for(let n=0;n<8;n++){await sync(sessao);agora+=600000;}
  assert.equal(envios,5);const o=(await fila.listar(escopo))[0];assert.equal(o.pausada,true);assert.equal(o.status,'incerta');
  await fila.retomarPausadas(escopo);await sync(sessao);assert.equal(envios,6);assert.deepEqual((await fila.listar(escopo))[0].payload,payload);await fila.fechar();
});
test('troca de conta enquanto resposta viaja só persiste recibo do dono original',async()=>{
  const fila=criarFilaPonto({indexedDB:new IDBFactory()});const payload=p();await fila.inserir(payload);let atual=sessao;
  const sync=criarSincronizadorPonto({fila,sessaoAtual:()=>atual,enviar:async p=>{atual={uid:'outra',contexto};return{operacaoId:p.operacaoId,status:'confirmado'};}});
  await sync(sessao);assert.equal((await fila.listar(escopo))[0].status,'confirmado');assert.equal((await fila.listar(escopoPonto('outra',contexto))).length,0);await fila.fechar();
});
test('logout após adquirir lease mas antes de enviar não faz chamada',async()=>{
  const fila=criarFilaPonto({indexedDB:new IDBFactory()});await fila.inserir(p());let atual=sessao,envios=0;
  const wrapper={...fila,assumir:async(...args)=>{const o=await fila.assumir(...args);atual=null;return o;}};
  await criarSincronizadorPonto({fila:wrapper,sessaoAtual:()=>atual,enviar:async()=>envios++})(sessao);
  assert.equal(envios,0);assert.equal((await fila.listar(escopo))[0].status,'incerta');await fila.fechar();
});
test('fila vazia ou somente recebida não invoca Functions',async()=>{
  const fila=criarFilaPonto({indexedDB:new IDBFactory()});let envios=0;
  const sync=criarSincronizadorPonto({fila,sessaoAtual:()=>sessao,enviar:async p=>{envios++;return{operacaoId:p.operacaoId,status:p.modalidade==='online'?'rejeitada':'recebida',mensagem:'Resultado fictício'};}});
  await sync(sessao);assert.equal(envios,0);await fila.inserir(p({modalidade:'offline_pendente'}));await sync(sessao);assert.equal(envios,1);await sync(sessao);assert.equal(envios,1);
  await fila.inserir(p({jornadaData:'2026-10-23'}));await sync(sessao);assert.equal((await fila.listar(escopo)).find(o=>o.payload.jornadaData==='2026-10-23').status,'rejeitada');await fila.fechar();
});
test('falha da escrita transacional não persiste nem inicia envio',async()=>{
  const fila=criarFilaPonto({indexedDB:new IDBFactory()}),add=IDBObjectStore.prototype.add;let envios=0;
  IDBObjectStore.prototype.add=function(){throw new DOMException('Quota de teste','QuotaExceededError');};
  try {
    await assert.rejects(async()=>{await fila.inserir(p());await criarSincronizadorPonto({fila,sessaoAtual:()=>sessao,enviar:async()=>envios++})(sessao);},/Quota/);
    assert.equal(envios,0);assert.equal((await fila.listar(escopo)).length,0);
  } finally {IDBObjectStore.prototype.add=add;await fila.fechar();}
});
