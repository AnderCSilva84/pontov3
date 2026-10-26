import test from 'node:test';
import assert from 'node:assert/strict';
import {produtosPrincipais} from '../src/utils/catalogoProdutos.js';

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
