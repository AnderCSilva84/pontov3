import test from 'node:test';
import assert from 'node:assert/strict';
import {produtosPrincipais,filtrarCatalogoContexto,opcoesAssociacaoCupom} from '../src/utils/catalogoProdutos.js';

test('mescla exibe um principal e busca nomes antigos sem alterar documentos',()=>{
 const produtos=[{id:'a',nome:'Álcool',marca:'Demo',categoriaId:'limpeza',membrosIds:['b','c','d']},
  ...['Álcool líquido','ALCOOL 70','Álcool limpeza'].map((nome,i)=>({id:['b','c','d'][i],nome,principalId:'a'}))];
 const antes=JSON.stringify(produtos);
 assert.deepEqual(produtosPrincipais(produtos).map(p=>p.id),['a']);
 for(const busca of ['alcool liquido','ALCOOL 70','álcool limpeza','Demo'])assert.deepEqual(produtosPrincipais(produtos,{busca}).map(p=>p.id),['a']);
 assert.equal(produtosPrincipais(produtos,{categoriaId:'outra'}).length,0);
 assert.equal(produtosPrincipais(produtos,{categoriaId:'limpeza'}).length,1);
 assert.equal(JSON.stringify(produtos),antes);
 assert.equal(produtosPrincipais(produtos.map(p=>({...p,principalId:''}))).length,4);
 assert.equal(produtosPrincipais(produtos.map(p=>p.id==='a'?{...p,ativo:false}:p)).length,0);
});

test('busca e sugestões isolam cinco tipos, nomes iguais, múltiplos vínculos e catálogo vazio',async()=>{
 const {sugerirProdutos}=await import('../functions/produtos-identidade.mjs');
 const tipos=['supermercado','farmacia','material_construcao','oficina','pet'];
 const catalogo=tipos.map(tipo=>({id:tipo,nome:'PRODUTO TESTE',tiposCompra:[tipo]}));
 catalogo.push({id:'multi',nome:'PRODUTO TESTE',tiposCompra:['supermercado','pet']},{id:'sem',nome:'PRODUTO TESTE'},{id:'legado',nome:'PRODUTO TESTE',contextoComprovado:'oficina'});
 for(const tipo of tipos){
  const esperado=[tipo,...(['supermercado','pet'].includes(tipo)?['multi']:[]),...(tipo==='oficina'?['legado']:[])];
  const filtrado=filtrarCatalogoContexto(catalogo,tipo);
  assert.deepEqual(filtrado.map(p=>p.id),esperado);
  assert.deepEqual(produtosPrincipais(catalogo,{tipoCompra:tipo,busca:'produto'}).map(p=>p.id),esperado);
  assert.deepEqual(sugerirProdutos({nome:'PRODUTO TESTE'},filtrado).map(c=>c.produto.id).sort(),[...esperado].sort());
 }
 assert.deepEqual(produtosPrincipais([{id:'sem',nome:'TESTE'}],{tipoCompra:'pet'}),[]);
 assert.deepEqual(filtrarCatalogoContexto([],'pet'),[]);
});

test('cupom: busca nomes antigos, marca e embalagem sem esconder incompatibilidade de unidade',()=>{
 const catalogo=[{id:'principal',nome:'PÃO FRANCÊS',marca:'PADARIA DEMO',apresentacao:'A granel',unidadeCompra:'kg',tiposCompra:['supermercado']},{id:'antigo',nome:'PAO FRANCES KG',principalId:'principal',tiposCompra:['supermercado']},{id:'unidade',nome:'PÃO FRANCÊS',apresentacao:'Pacote',unidadeCompra:'un',tiposCompra:['supermercado']},{id:'pet',nome:'PÃO FRANCÊS',unidadeCompra:'kg',tiposCompra:['pet']},{id:'incerto',nome:'PÃO FRANCÊS',unidadeCompra:'kg'}];
 const antes=JSON.stringify(catalogo);
 const r=opcoesAssociacaoCupom(catalogo,{tipoCompra:'supermercado',unidadeCompra:'un',busca:'pao frances'});
 assert.deepEqual(r.compativeis.map(x=>x.id),['unidade']);assert.deepEqual(r.incompativeis.map(x=>x.id),['principal']);
 assert.deepEqual(opcoesAssociacaoCupom(catalogo,{tipoCompra:'supermercado',unidadeCompra:'kg',busca:'padaria demo'}).compativeis.map(x=>x.id),['principal']);
 assert.deepEqual(opcoesAssociacaoCupom(catalogo,{tipoCompra:'supermercado',unidadeCompra:'kg',busca:'pao frances kg'}).compativeis.map(x=>x.id),['principal']);
 assert.equal(JSON.stringify(catalogo),antes);
});

test('cupom sugere pequena diferença de escrita e espaços sem associar nem cruzar categorias',()=>{
 const cat=[{id:'existente',nome:'Alegocort',tiposCompra:['farmacia'],unidadeCompra:'un',apresentacao:'Frasco'},{id:'fora',nome:'Alegorcort',tiposCompra:['pet'],unidadeCompra:'un'},{id:'inativo',nome:'Alegorcort',tiposCompra:['farmacia'],unidadeCompra:'un',ativo:false},{id:'composto',nome:'Produto Composto',tiposCompra:['farmacia'],unidadeCompra:'un'}];
 const antes=JSON.stringify(cat);
 const r=opcoesAssociacaoCupom(cat,{tipoCompra:'farmacia',unidadeCompra:'un',busca:'Alegorcort'});assert.equal(r.buscaAproximada,true);assert.deepEqual(r.compativeis.map(p=>p.id),['existente']);assert.equal(JSON.stringify(cat),antes);
 assert.equal(opcoesAssociacaoCupom(cat,{tipoCompra:'farmacia',unidadeCompra:'un',busca:'alegocort'}).buscaAproximada,false);
 assert.deepEqual(opcoesAssociacaoCupom(cat,{tipoCompra:'farmacia',unidadeCompra:'un',busca:'produtocomposto'}).compativeis.map(p=>p.id),['composto']);
 assert.deepEqual(opcoesAssociacaoCupom(cat,{tipoCompra:'farmacia',unidadeCompra:'kg',busca:'Alegorcort'}).incompativeis.map(p=>p.id),['existente']);
});
