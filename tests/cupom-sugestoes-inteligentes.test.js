import test from 'node:test';
import assert from 'node:assert/strict';
import {sugerirCatalogo,opcoesAssociacaoCupom} from '../src/utils/catalogoProdutos.js';

test('abreviações fiscais aproximam o produto existente sem mudar os registros',()=>{
 const entrada={nomeOriginal:'BEB LAC FLAMBOYANT',unidadeCompra:'un'};
 const catalogo=[{id:'a',nome:'Bebida láctea Flamboyant',unidadeCompra:'un',tiposCompra:['supermercado']},{id:'b',nome:'Bebida de soja',unidadeCompra:'un'}];
 const antes=JSON.stringify({entrada,catalogo});
 assert.equal(sugerirCatalogo(entrada,catalogo)[0].produto,catalogo[0]);
 assert.equal(JSON.stringify({entrada,catalogo}),antes);
});

test('aliases normalizados apontam só ao principal ativo e preservam conflitos',()=>{
 const catalogo=[{id:'a',nome:'Queijo mussarela',aliasesNomes:['QJ MUSS NAT MINAS'],unidadeCompra:'kg'}, {id:'b',nome:'QJ MUSS NAT MINAS',principalId:'a',unidadeCompra:'kg'}, {id:'c',nome:'QJ MUSS NAT MINAS',ativo:false,unidadeCompra:'kg'}];
 const sugestoes=sugerirCatalogo({nomeOriginal:'Queijo mussarela NAT MINAS',unidadeCompra:'un'},catalogo);
 assert.equal(sugestoes[0].produto.id,'a');
 assert.ok(sugestoes[0].conflitos.includes('Unidades de compra diferentes'));
 assert.ok(sugestoes.every(s=>s.produto.id==='a'));
});

test('busca fiscal expandida mantém categoria e apresentação compatíveis',()=>{
 const catalogo=[{id:'a',nome:'Sabão em pó',apresentacao:'1kg',unidadeCompra:'un',tiposCompra:['supermercado']},{id:'b',nome:'Sabão em pó',apresentacao:'2kg',unidadeCompra:'un',tiposCompra:['supermercado']},{id:'c',nome:'Sabão em pó',unidadeCompra:'un',tiposCompra:['farmacia']}];
 const r=opcoesAssociacaoCupom(catalogo,{tipoCompra:'supermercado',unidadeCompra:'un',busca:'sab',entrada:{nomeOriginal:'Sabão em pó 1kg',unidadeCompra:'un'}});
 assert.deepEqual(r.compativeis.map(p=>p.id),['a']);
 assert.deepEqual(r.incompativeis.map(p=>p.id),['b']);
});
