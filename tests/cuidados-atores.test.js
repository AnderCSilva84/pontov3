import test from 'node:test';import assert from 'node:assert/strict';import {atorDoLembrete,listarAtoresCuidados} from '../src/utils/cuidadosPorAtor.js';
test('lista pessoas e pets por cadastro, incluindo nomes antigos sem juntar homônimos',()=>{
 const cad=[{id:'a',nome:'Ana',tipo:'adulto'},{id:'b',nome:'Ana',tipo:'crianca'},{id:'p',nome:'Greg',tipo:'cao'},{id:'c',nome:'Sem lembretes',tipo:'idoso'}];
 const ls=[{cuidadoId:'a',nomeCuidado:'Nome anterior',destinatarioCuidado:'gato'},{cuidadoId:'a'},{cuidadoId:'b'},{cuidadoId:'p'},{nomeCuidado:'Lia',destinatarioCuidado:'adulto'},{nomeCuidado:'Lia',destinatarioCuidado:'adulto'}];
 const pessoas=listarAtoresCuidados(cad,ls,'pessoas');assert.equal(pessoas.length,4);assert.equal(pessoas.find(a=>a.id==='cadastro:a').quantidade,2);assert.equal(pessoas.find(a=>a.nome==='Lia').quantidade,2);assert.equal(pessoas.find(a=>a.id==='cadastro:c').quantidade,0);
 assert.deepEqual(listarAtoresCuidados(cad,ls,'pets').map(a=>a.nome),['Greg']);assert.equal(atorDoLembrete(ls[0],cad).nome,'Ana');assert.notEqual(atorDoLembrete(ls[0],cad).id,atorDoLembrete(ls[2],cad).id);
 assert.deepEqual(ls.filter(l=>atorDoLembrete(l,cad).id==='cadastro:p'),[ls[3]]);
});
