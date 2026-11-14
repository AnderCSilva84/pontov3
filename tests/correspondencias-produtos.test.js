import test from 'node:test';import assert from 'node:assert/strict';import {sugerirCorrespondencias} from '../src/utils/correspondenciasProdutos.js';import {compararCompras,reaplicarCorrespondencias} from '../src/utils/comparacaoCompras.js';import {atributosProduto,termosProduto} from '../functions/produtos-identidade.mjs';
const r=(id,loja,extra={})=>({id,produtoId:id,supermercadoId:loja,listaId:loja,nomeSnapshot:'LEITE DEMO',nomeOriginal:'LEITE DEMO',marca:'',apresentacao:'',unidadeCompra:'un',quantidadeComprada:1,precoUnitarioCentavos:500,compradoEmMs:1000,...extra});
test('sugestão com abreviação e dado ausente exige confirmação; conflito conhecido não é sugerido',()=>{
 const a=r('a','x',{nomeOriginal:'LEITE INTEG DEMO 1L',apresentacao:'Caixa 1 litro',marca:'Demo'}),b=r('b','y',{nomeOriginal:'LEITE DEMO'});
 const pares=sugerirCorrespondencias([a,b],{a:'x',b:'y'});assert.equal(pares.length,1);assert.ok(pares[0].faltantes.length);assert.equal(compararCompras([a,b],{a:'x',b:'y'}).length,0);
 for(const e of [{unidadeCompra:'kg'},{marca:'Outra'},{nomeOriginal:'LEITE DEMO 500ML'},{nomeOriginal:'LEITE DESN DEMO 1L'}])assert.equal(sugerirCorrespondencias([a,{...b,...e}],{a:'x',b:'y'}).length,0);
 const ac=atributosProduto({nome:'LEITE INTEGRAL DEMO 1 L',marca:'Demo'}),mapa={vinculos:{b:'a'},nomes:{a:'LEITE DEMO'},identidades:{a:{...ac,unidadeCompra:'un'}}};
 const juntos=reaplicarCorrespondencias([a,b],mapa);assert.equal(compararCompras(juntos,{a:'x',b:'y'}).length,1);assert.equal(sugerirCorrespondencias(juntos,{a:'x',b:'y'}).length,0);assert.equal(compararCompras(reaplicarCorrespondencias([a,b],{}),{a:'x',b:'y'}).length,0);
 assert.equal(compararCompras(reaplicarCorrespondencias([a,{...b,marca:'Outra'}],mapa),{a:'x',b:'y'}).length,0);
});
test('medidas equivalentes, famílias separadas e sugestões únicas por observação mais recente',()=>{
 for(const nome of ['1 litro','1litro','1L','1000ML'])assert.deepEqual(atributosProduto({nome}).medidas,['1000ml']);
 assert.equal(termosProduto('1L'),'1 l');
 const a=r('a','x',{nomeOriginal:'BISC DEMO 200G'}),b=r('b','y',{nomeOriginal:'BISCOITO DEMO 200G'}),antigo={...a,id:'old',compradoEmMs:1};
 assert.equal(sugerirCorrespondencias([antigo,a,b],{a:'x',b:'y'}).length,1);
 assert.equal(sugerirCorrespondencias([a,b],{modo:'listas',a:'x',b:'y'}).length,1);
 assert.deepEqual(sugerirCorrespondencias([a,b],{a:'x',b:'x'}),[]);
});

test('nome aprendido só reconhece cadastro único e compatível na importação',async()=>{const {reconhecerCupom}=await import('../src/utils/cupomRevisao.js');const i={nomeOriginal:'LEITE DEMO',unidadeCompra:'un'},p={id:'principal',nome:'LEITE INTEGRAL DEMO 1 L',apresentacao:'Caixa 1 litro',unidadeCompra:'un',tiposCompra:['supermercado'],aliasesNomes:['LEITE DEMO']};assert.equal(reconhecerCupom([i],[p],'supermercado')[0].produtoId,'principal');assert.equal(reconhecerCupom([i],[p,{...p,id:'outro'}],'supermercado')[0].produtoId,undefined);assert.equal(reconhecerCupom([{...i,nomeOriginal:'LEITE DEMO 500ML'}],[{...p,aliasesNomes:['LEITE DEMO 500ML']}],'supermercado')[0].produtoId,undefined);});
