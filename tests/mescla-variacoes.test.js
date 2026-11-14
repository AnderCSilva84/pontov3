import test from 'node:test';
import assert from 'node:assert/strict';
import {politicaMesclaManual} from '../functions/mescla-politica.mjs';
import {compararCompras} from '../src/utils/comparacaoCompras.js';

test('admin pode confirmar variações; unidades e medicamentos distintos permanecem bloqueados',()=>{
 const a={id:'a',nome:'BATATA PRINGLES CHURRASCO',apresentacao:'109G',unidadeCompra:'un'},b={id:'b',nome:'BATATA PRINGLES ORIGINAL',apresentacao:'104G',unidadeCompra:'un'};
 const p=politicaMesclaManual([a,b],'a','supermercado');assert.ok(p.conflitos.length);assert.equal(p.podeReunirVariacoes,true);assert.equal(p.bloqueada,false);
 assert.equal(politicaMesclaManual([a,{...b,unidadeCompra:'kg'}],'a','supermercado').bloqueada,true);
 assert.equal(politicaMesclaManual([a,b],'a','farmacia').bloqueada,true);
 const registro=(id,loja,p)=>({id,produtoId:'principal',supermercadoId:loja,nomeOriginal:p.nome,apresentacao:p.apresentacao,unidadeCompra:'un',precoUnitarioCentavos:925,compradoEmMs:1000});
 assert.equal(compararCompras([registro('r1','x',a),registro('r2','y',b)],{a:'x',b:'y'}).length,0);
 assert.equal(compararCompras([registro('r1','x',a),registro('r2','y',a)],{a:'x',b:'y'}).length,1);
});
