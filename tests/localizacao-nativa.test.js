import test from 'node:test';
import assert from 'node:assert/strict';
import {criarLocalizacaoNativa} from '../src/utils/localizacaoNativa.js';
const precisa={location:'granted',coarseLocation:'granted'};
test('pede somente no gesto, uma vez; preserva amostra e não reutiliza fix anterior',async()=>{
  let pedidos=0,capturas=0;const opcoes=[];
  const gps=criarLocalizacaoNativa({checkPermissions:async()=>({location:'prompt'}),requestPermissions:async p=>{pedidos++;assert.deepEqual(p,{permissions:['location']});return precisa;},getCurrentPosition:async p=>{capturas++;opcoes.push(p);return{coords:{latitude:-1,longitude:-48,accuracy:8},timestamp:12345};}});
  assert.equal(pedidos,0);
  const a=gps.obter(),b=gps.obter();assert.equal(a,b);
  assert.deepEqual(await a,{latitude:-1,longitude:-48,accuracy:8,instanteMs:12345});assert.equal(pedidos,1);assert.equal(capturas,1);
  await gps.obter();assert.equal(capturas,2);assert.ok(opcoes.every(p=>p.maximumAge===0&&p.enableHighAccuracy&&p.timeout===10000));
});
test('aproximada e recusa permanente orientam sem repetir pedido ou obter coordenadas',async()=>{
  for(const [p,erro] of [[{location:'prompt-with-rationale',coarseLocation:'granted'},'aproximada'],[{location:'denied',coarseLocation:'granted'},'aproximada'],[{location:'denied',coarseLocation:'denied'},'bloqueada']]){
    const gps=criarLocalizacaoNativa({checkPermissions:async()=>p,requestPermissions:()=>assert.fail('Não deve pedir novamente'),getCurrentPosition:()=>assert.fail('Não deve obter fix')});
    await assert.rejects(gps.obter(),e=>e.code===`localizacao/${erro}`);await assert.rejects(gps.obter(),e=>e.code===`localizacao/${erro}`);
  }
});
test('recusa no diálogo não faz retry; classifica bloqueio após resposta Android',async()=>{
  let checks=0,pedidos=0;
  const gps=criarLocalizacaoNativa({checkPermissions:async()=>++checks===1?{location:'prompt'}:{location:'denied'},requestPermissions:async()=>{pedidos++;throw{code:'OS-PLUG-GLOC-0003'};}});
  await assert.rejects(gps.obter(),e=>e.code==='localizacao/bloqueada');assert.equal(pedidos,1);
});
test('resposta aproximada ou recusa inicial não inicia GPS nem repete o diálogo',async()=>{
  for(const [resposta,codigo] of [[{location:'prompt-with-rationale',coarseLocation:'granted'},'aproximada'],[{location:'prompt-with-rationale',coarseLocation:'prompt-with-rationale'},'permissao']]){
    let pedidos=0;
    const gps=criarLocalizacaoNativa({checkPermissions:async()=>({location:'prompt'}),requestPermissions:async()=>{pedidos++;return resposta;},getCurrentPosition:()=>assert.fail('Sem permissão precisa não captura')});
    await assert.rejects(gps.obter(),e=>e.code===`localizacao/${codigo}`);assert.equal(pedidos,1);
  }
});
test('localização desligada, timeout, Play Services e manifesto têm erros distintos, sem watch',async()=>{
  for(const [code,esperado] of [['0007','desligada'],['0009','desligada'],['0017','desligada'],['0010','timeout'],['0015','indisponivel'],['0018','configuracao']]){
    let chamadas=0;const gps=criarLocalizacaoNativa({checkPermissions:async()=>precisa,getCurrentPosition:async()=>{chamadas++;throw{code:'OS-PLUG-GLOC-'+code};}});
    await assert.rejects(gps.obter(5),e=>e.code===`localizacao/${esperado}`);assert.equal(chamadas,1);
  }
  const off=criarLocalizacaoNativa({checkPermissions:async()=>{throw{code:'OS-PLUG-GLOC-0007'};},requestPermissions:()=>assert.fail()});
  await assert.rejects(off.obter(),e=>e.code==='localizacao/desligada');
});
test('callback nativo sem resposta expira; amostra inválida não passa ao ponto',async()=>{
  const gps=criarLocalizacaoNativa({checkPermissions:async()=>precisa,getCurrentPosition:()=>new Promise(()=>{})});
  await assert.rejects(gps.obter(1),e=>e.code==='localizacao/timeout');
  const ruim=criarLocalizacaoNativa({checkPermissions:async()=>precisa,getCurrentPosition:async()=>({coords:{latitude:NaN,longitude:1},timestamp:1})});
  await assert.rejects(ruim.obter(),e=>e.code==='localizacao/indisponivel');
});
