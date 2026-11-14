import test from 'node:test';import assert from 'node:assert/strict';import {procurarParesCatalogo,aplicarMapaCatalogo} from '../src/utils/catalogoParecidos.js';
const p=(id,nome,extra={})=>({id,nome,unidadeCompra:'un',apresentacao:'',marca:'',tiposCompra:['supermercado'],ativo:true,...extra});
test('pente fino sugere abreviação/typo e medida equivalente sem confundir variações',()=>{
 const produtos=[p('a','BISC DEMO 200G',{marca:'DEMO'}),p('b','BISCOITO DEMO',{apresentacao:'Pacote 0,2 kg'}),p('menor','BISCOITO DEMO 100G'),p('marca','BISCOITO DEMO 200G',{marca:'OUTRA'}),p('unidade','BISCOITO DEMO 200G',{unidadeCompra:'kg'}),p('inativo','BISCOITO DEMO 200G',{ativo:false}),p('filho','BISCOITO DEMO 200G',{principalId:'a'}),p('sem','BISCOITO DEMO 200G',{unidadeCompra:''}),p('x','BANANA'),p('y','BANAANA')];
 const antes=structuredClone(produtos),r=procurarParesCatalogo(produtos);assert.ok(r.pares.some(p=>p.produtoIds.join(',')==='a,b'));assert.ok(r.pares.some(p=>p.produtoIds.join(',')==='x,y'));assert.equal(r.semUnidade,1);
 assert.ok(!r.pares.some(p=>p.produtoIds.includes('a')&&['menor','marca','unidade','inativo','filho','sem'].some(id=>p.produtoIds.includes(id))));assert.deepEqual(produtos,antes);
});
test('GTIN válido também encontra nomes distintos e exclui GTIN conhecido diferente',()=>{
 const r=procurarParesCatalogo([p('a','NOME COMERCIAL',{gtin:'7894900011517'}),p('b','CADASTRO INTERNO',{gtin:7894900011517}),p('c','NOME COMERCIAL',{gtin:'7891000315507'})]);assert.ok(r.pares.some(p=>p.produtoIds.join(',')==='a,b'&&p.motivo==='Código de barras coincidente'));assert.ok(!r.pares.some(p=>p.produtoIds.join(',')==='a,c'));
});
test('catálogo relido após mesclar é restaurado ao desfazer e paginação não limita os candidatos',()=>{
 const dados=Array.from({length:230},(_,i)=>p('p'+String(i).padStart(3,'0'),'ARROZ DEMO FAMILIA'+i));dados.push(p('ultimo','ARROZ DEMO FAMILIA229'));const r=procurarParesCatalogo(dados);assert.ok(r.pares.some(p=>p.produtoIds.includes('ultimo')&&p.produtoIds.includes('p229')));assert.ok(r.pares.length>10);
 assert.equal(aplicarMapaCatalogo([p('b','ARROZ',{principalId:'a'})],{vinculos:{},catalogoIds:['a','b']})[0].principalId,'');
});
