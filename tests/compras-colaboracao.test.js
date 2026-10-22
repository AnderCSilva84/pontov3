import test from 'node:test';
import assert from 'node:assert/strict';
import { produtosEmOutrasListas } from '../src/utils/comprasColaboracao.js';
test('avisa apenas produtos do mesmo catálogo em outras listas não finalizadas',()=>{
  const listas=[{id:'atual',titulo:'Atual',status:'rascunho'},{id:'paralela',titulo:'Jantar',status:'rascunho'},{id:'compra',titulo:'Mercado',status:'em_compra'},{id:'fim',titulo:'Antiga',status:'finalizada'}];
  const dados={atual:[{produtoId:'a'}],paralela:[{produtoId:'a',estado:'pendente'},{produtoId:'b',estado:'nao_comprado'},{produtoId:'a',estado:'comprado'}],compra:[{produtoId:'a',estado:'comprado'},{produtoId:'outro-pacote',estado:'pendente'}],fim:[{produtoId:'c',estado:'comprado'}]};
  const r=produtosEmOutrasListas(listas,dados,'atual');
  assert.deepEqual(r.a.map(l=>l.titulo),['Jantar','Mercado']);assert.equal(r.b,undefined);assert.equal(r.c,undefined);assert.equal(r['outro-pacote'].length,1);
  assert.equal(produtosEmOutrasListas(listas.map(l=>({...l,status:'finalizada'})),dados,'atual').a,undefined);
  const especial=produtosEmOutrasListas([{id:'toString',titulo:'Em preparação',status:'rascunho'}],{},'atual');
  assert.deepEqual(Object.keys(especial),[]);
  const chave=produtosEmOutrasListas([{id:'lista',titulo:'Outra',status:'rascunho'}],{lista:[{produtoId:'__proto__',estado:'pendente'}]},'atual');
  assert.equal(chave.__proto__[0].titulo,'Outra');
});
