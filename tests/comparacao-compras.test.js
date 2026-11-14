import test from 'node:test';import assert from 'node:assert/strict';import {compararCompras,precoComparavel,moedaComparacao} from '../src/utils/comparacaoCompras.js';
const r=(id,loja,preco,extra={})=>({id,produtoId:'leite',nomeSnapshot:'LEITE DEMO',apresentacao:'Garrafa 1 L',marca:'DEMO',unidadeCompra:'un',supermercadoId:loja,supermercadoNome:loja,precoUnitarioCentavos:preco,compradoEmMs:1000,quantidadeComprada:1,listaId:loja,...extra});
test('duas filiais: último preço válido, desempate estável e somente interseção de produtos',()=>{
 const registros=[r('antigo','a',400,{compradoEmMs:1}),r('novo1','a',700),r('novo2','a',750),r('b','b',650),r('somente','a',100,{produtoId:'exclusivo'}),r('anulado','b',100,{valido:false}),r('outra','c',1)];
 const antes=structuredClone(registros),[l]=compararCompras([...registros,registros[3]],{a:'a',b:'b'});assert.equal(l.a.id,'novo2');assert.equal(l.b.id,'b');assert.equal(l.menor,'b');assert.equal(moedaComparacao(l.diferenca),'R$ 1,00');assert.deepEqual(registros,antes);
 assert.deepEqual(compararCompras(registros,{a:'a',b:'a'}),[]);assert.deepEqual(compararCompras(registros,{a:'a'}),[]);
});
test('mesmo nome não une IDs; unidades, embalagens e marcas distintas ficam separadas',()=>{
 const a=r('a','a',500),b=r('b','b',500,{apresentacao:'Garrafa 1000 ml',marca:'démó'});
 assert.equal(compararCompras([a,b],{a:'a',b:'b'})[0].menor,'empate');
 for(const extra of [{produtoId:'outro'},{unidadeCompra:'l'},{apresentacao:'Garrafa 500 ml'},{marca:'OUTRA'},{marca:''},{nomeOriginal:'Leite sem lactose 1 L'}])assert.deepEqual(compararCompras([a,{...b,...extra}],{a:'a',b:'b'}),[]);
});
test('listas: média ponderada, quantidades diferentes e linhas repetidas sem duplicar observação',()=>{
 const registros=[r('a1','x',1000,{listaId:'a',quantidadeComprada:1}),r('a2','x',2000,{listaId:'a',quantidadeComprada:3}),r('b1','y',1900,{listaId:'b',quantidadeComprada:8})];
 const [l]=compararCompras([...registros,registros[0]],{modo:'listas',a:'a',b:'b'});assert.equal(l.a.quantidade,4);assert.equal(l.b.quantidade,8);assert.equal(moedaComparacao(l.a.preco),'R$ 17,50');assert.equal(l.menor,'a');assert.equal(moedaComparacao(l.diferenca),'R$ 1,50');
});
test('precisão fiscal significativa preservada, inclusive diferença inferior a centavo',()=>{
 const a=r('a','a',2667,{precoUnitarioOriginalFiscal:'26,6666666667'}),b=r('b','b',2667,{precoUnitarioOriginalFiscal:'26,6666666668'});
 const [l]=compararCompras([a,b],{a:'a',b:'b'});assert.equal(l.menor,'a');assert.equal(moedaComparacao(l.a.preco),'R$ 26,6666666667');assert.equal(moedaComparacao(l.diferenca),'R$ 0,0000000001');
 assert.equal(moedaComparacao(precoComparavel({...a,precoUnitarioOriginalFiscal:'1.234,50'})),'R$ 1.234,50');
 for(const p of ['26,66666666671','NaN','-1','0','10.00','1.2.3'])assert.equal(precoComparavel({...a,precoUnitarioOriginalFiscal:p}),null);
 assert.equal(precoComparavel(r('zero','a',0)),null);
});
