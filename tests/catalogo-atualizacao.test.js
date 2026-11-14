import test from 'node:test';import assert from 'node:assert/strict';import {atualizarCatalogoCarregado} from '../src/utils/catalogoAtualizacao.js';import {produtosPrincipais} from '../src/utils/catalogoProdutos.js';
const p=(id,nome)=>({id,nome,ativo:true,tiposCompra:['supermercado'],unidadeCompra:'un',apresentacao:'Pacote'});
test('mesclar/desfazer mantém páginas completas e produtos fora da primeira página',()=>{
 const produtos=Array.from({length:70},(_,i)=>p('p'+i,i===60?'ARROZ BRANCO DEMO':i===61?'QJ MUSS DEMO':'PRODUTO '+i)),antes={produtos,paginas:3,cursor:null,cursorHistorico:null};
 const mesclado=atualizarCatalogoCarregado(antes,{tipoCompra:'supermercado',catalogoIds:['p1','p2'],catalogoAtualizado:[{...produtos[1],membrosIds:['p2']},{...produtos[2],principalId:'p1'}]},'supermercado');
 assert.equal(mesclado.produtos.length,70);assert.equal(mesclado.paginas,3);assert.equal(mesclado.cursor,null);assert.equal(produtosPrincipais(mesclado.produtos,{tipoCompra:'supermercado'}).length,69);assert.equal(produtosPrincipais(mesclado.produtos,{tipoCompra:'supermercado',busca:'arroz'})[0].id,'p60');assert.equal(produtosPrincipais(mesclado.produtos,{tipoCompra:'supermercado',busca:'queijo mussarela'})[0].id,'p61');
 const desfeito=atualizarCatalogoCarregado(mesclado,{tipoCompra:'supermercado',catalogoIds:['p1','p2'],catalogoAtualizado:[produtos[1],produtos[2]]},'supermercado');assert.equal(produtosPrincipais(desfeito.produtos,{tipoCompra:'supermercado'}).length,70);assert.equal(antes.produtos[2].principalId,undefined);
});
test('busca aceita abreviações e palavras separadas, sem mudar classificação',()=>{
 const produtos=[p('q','QJ MUSS NAT MINAS KG'),p('m','Queijo muçarela'),{...p('f','QJ MUSS'),tiposCompra:['farmacia']}];
 assert.deepEqual(produtosPrincipais(produtos,{tipoCompra:'supermercado',busca:'queijo mussarela'}).map(p=>p.id),['q','m']);assert.deepEqual(produtosPrincipais(produtos,{tipoCompra:'supermercado',busca:'mussarela queijo'}).map(p=>p.id),['q','m']);
});
