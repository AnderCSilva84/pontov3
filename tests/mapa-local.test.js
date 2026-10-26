import test from 'node:test';
import assert from 'node:assert/strict';
import {buscarEndereco,coordenadasValidas,projetar,desprojetar,blocosMapa} from '../src/utils/mapaLocal.js';
test('mapa transforma toque em coordenadas válidas e carrega somente blocos do viewport',()=>{
 for(const [lat,lon] of [[0,0],[-23,-46],[80,179]])for(const z of [2,16,18]){const p=projetar(lat,lon,z),r=desprojetar(p.x,p.y,z);assert.ok(Math.abs(r.latitude-lat)<1e-6);assert.ok(Math.abs(r.longitude-lon)<1e-6);assert.ok(blocosMapa(lat,lon,z).length<=9);}
 for(const [lat,lon] of [['',''],[null,0],[undefined,0],[91,0],[0,181]])assert.equal(coordenadasValidas(lat,lon),false);
 assert.equal(coordenadasValidas(0,0),true);
});
test('endereço faz uma busca limitada, sem credenciais, e rejeita coordenadas inválidas',async()=>{
 let chamadas=0;const controller=new AbortController();
 const r=await buscarEndereco('Rua fictícia, cidade fictícia',{signal:controller.signal,fetchImpl:async(url,o)=>{
  chamadas++;assert.equal(url.origin,'https://photon.komoot.io');assert.equal(url.searchParams.get('limit'),'5');assert.equal(o.credentials,'omit');assert.equal(o.signal,controller.signal);
  return {ok:true,json:async()=>({features:[{geometry:{type:'Point',coordinates:[0,0]},properties:{name:'Praça fictícia',city:'Cidade fictícia'}},{geometry:{type:'Point',coordinates:[null,null]}}]})};
 }});assert.equal(chamadas,1);assert.equal(r.length,1);assert.equal(r[0].endereco,'Praça fictícia, Cidade fictícia');
 await assert.rejects(buscarEndereco('curt',{fetchImpl:()=>{throw Error('Não deve consultar');}}),/endereço/);
 let erros=0;await assert.rejects(buscarEndereco('Rua fictícia',{fetchImpl:async()=>{erros++;return {ok:false};}}),/indisponível/);assert.equal(erros,1);
});
