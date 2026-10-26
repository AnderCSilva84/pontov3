import test from 'node:test';
import assert from 'node:assert/strict';
import {criarRecuperacaoSenha,resumirPendencias,textoPendencias} from '../src/utils/cicloConta.js';
test('recuperação neutra usa apenas Auth, valida email e compartilha toques simultâneos',async()=>{
  let chamadas=0,liberar;
  const recuperar=criarRecuperacaoSenha(async()=>{chamadas++;await new Promise(r=>{liberar=r;});});
  await assert.rejects(recuperar('invalido'),/válido/);assert.equal(chamadas,0);
  const a=recuperar('demo@example.test'),b=recuperar('demo@example.test');assert.equal(a,b);assert.equal(chamadas,1);liberar();const msg=await a;
  assert.equal(await criarRecuperacaoSenha(async()=>{throw{code:'auth/user-not-found'};})('desconhecida@example.test'),msg);
  await assert.rejects(criarRecuperacaoSenha(async()=>{throw{code:'auth/network-request-failed'};})('demo@example.test'),/Sem conexão/);
  await assert.rejects(criarRecuperacaoSenha(async()=>{throw{code:'auth/too-many-requests'};})('demo@example.test'),/Muitas tentativas/);
});
test('logout separa resultado desconhecido, offline não enviado, recebido e confirmado',()=>{
  const o=(status,modalidade='online')=>({status,payload:{modalidade}});
  const r=resumirPendencias([o('incerta'),o('pendente','offline_pendente'),o('recebida'),o('confirmado'),o('conflito'),o('rejeitada')]);
  assert.deepEqual(r,{onlineIncerto:1,offlineNaoEnviado:1,recebidas:1,confirmadas:1,conflitos:1});assert.match(textoPendencias(r),/Recebidas pelo servidor: 1/);
});
