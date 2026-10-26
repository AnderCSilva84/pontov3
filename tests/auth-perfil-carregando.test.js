import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

test('cache vazio não encerra sessão nem assume legado antes do servidor; ausência real e inatividade continuam negadas',()=>{
 const source=readFileSync('src/services/auth.js','utf8').replace(/^import[\s\S]*?from\s+["'][^"']+["'];?\r?\n/gm,'').replace(/export /g,'');
 const listeners=[],estados=[],grupos=[];let iniciarAuth,paradas=0;
 const auth={currentUser:{uid:'ficticia-a'}};
 const c={auth,db:{},firebaseConfig:{projectId:'demo-perfil'},criarCadastroTitular:()=>({}),doc:(_db,...partes)=>partes.join('/'),definirGrupoAtual:g=>grupos.push(g),onAuthStateChanged:(_auth,fn)=>{iniciarAuth=fn;return()=>paradas++;},onSnapshot:(ref,fn,erro)=>{listeners.push({ref,fn,erro});return()=>paradas++;},console:{error:()=>{}}};
 runInNewContext(source,c);const parar=c.observeAuth(u=>estados.push(u));iniciarAuth(auth.currentUser);
 const snap=(exists,data={},fromCache=false)=>({exists:()=>exists,data:()=>data,metadata:{fromCache}});
 assert.equal(estados.at(-1),undefined);
 listeners[0].fn(snap(false,{},true));assert.equal(estados.at(-1),undefined);assert.equal(listeners.length,1);assert.equal(grupos.length,0);
 listeners[0].fn(snap(true,{ativo:true,grupoId:'grupo-a'}));assert.equal(grupos.at(-1),'grupo-a');assert.equal(listeners[1].ref,'grupos/grupo-a/users/ficticia-a');
 listeners[1].fn(snap(false,{},true));assert.equal(estados.at(-1),undefined);
 listeners[1].fn(snap(true,{ativo:true,role:'funcionario'}));assert.equal(estados.at(-1).uid,'ficticia-a');assert.equal(estados.at(-1).grupoId,'grupo-a');
 listeners[1].fn(snap(false));assert.equal(estados.at(-1),null);
 listeners[1].fn(snap(true,{ativo:false}));assert.equal(estados.at(-1),null);
 const total=estados.length;auth.currentUser={uid:'ficticia-b'};listeners[1].fn(snap(true,{ativo:true}));assert.equal(estados.length,total);
 iniciarAuth(null);assert.equal(estados.at(-1),null);assert.equal(grupos.at(-1),null);parar();assert.ok(paradas>=3);
});
