import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeApp,deleteApp} from 'firebase/app';
import process from 'node:process';
import {getFunctions,connectFunctionsEmulator,httpsCallable} from 'firebase/functions';
import {criarCadastroTitular} from '../src/services/cadastroTitular.js';

test('cadastro demo pela rede: Auth → callable real; retoma resposta perdida sem novo login/grupo', {skip:process.env.AP1303_TEST_CALLABLE!=='1'},async()=>{
  const fetchOriginal=globalThis.fetch,requisicoes=[];
  globalThis.fetch=async(input,opcoes)=>{
    const url=new URL(typeof input==='string'?input:input.url);
    const r=await fetchOriginal(input,opcoes);
    if(url.pathname.endsWith('accounts:signUp')||url.pathname.endsWith('/criarGrupo'))requisicoes.push({path:url.pathname,port:url.port,status:r.status});
    return r;
  };
  const {getAuth,connectAuthEmulator,createUserWithEmailAndPassword,signOut}=await import('firebase/auth');
  const app=initializeApp({projectId:'demo-ap1303',apiKey:'demo-key',appId:'demo-ap1303'},'cadastro-http-'+crypto.randomUUID());
  const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9098',{disableWarnings:true});
  const f=getFunctions(app);connectFunctionsEmulator(f,'127.0.0.1',5007);
  const map=new Map();let contas=0,primeira=true,grupoConfirmado;
  const deps={projeto:'demo-ap1303',sessao:()=>auth.currentUser,armazenamento:{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)},
    criarConta:async(...args)=>{contas++;return createUserWithEmailAndPassword(auth,...args);},
    criarGrupo:async dados=>{const r=(await httpsCallable(f,'criarGrupo',{timeout:30000})(dados)).data;if(primeira){primeira=false;grupoConfirmado=r.grupoId;throw Object.assign(Error('Resposta descartada deliberadamente após commit'),{code:'functions/unavailable'});}return r;}};
  try {
    const inicial=criarCadastroTitular(deps);
    await assert.rejects(inicial.cadastrar({nome:'Cadastro HTTP fictício',nomeGrupo:'Grupo HTTP fictício',email:`http-${crypto.randomUUID()}@example.test`,senha:'somente-demo-123'}),e=>e.etapaCadastro==='grupo');
    assert.equal(contas,1);assert.ok(auth.currentUser);
    const retomada=await criarCadastroTitular(deps).cadastrar();
    assert.equal(retomada.grupoId,grupoConfirmado);assert.equal(retomada.jaCriado,true);assert.equal(contas,1);assert.equal(map.size,0);
    const doc=await fetch(`http://127.0.0.1:8877/v1/projects/demo-ap1303/databases/(default)/documents/grupos/${grupoConfirmado}`,{headers:{Authorization:'Bearer owner'}});
    assert.equal(doc.status,200);assert.equal((await doc.json()).fields.titularUid.stringValue,auth.currentUser.uid);
    assert.ok(requisicoes.some(r=>r.path.endsWith('accounts:signUp')&&r.port==='9098'&&r.status===200));
    assert.equal(requisicoes.filter(r=>r.path==='/demo-ap1303/us-central1/criarGrupo'&&r.port==='5007'&&r.status===200).length,2);
  } finally {globalThis.fetch=fetchOriginal;await signOut(auth);await deleteApp(app);}
});

test('Auth inacessível retorna auth/network-request-failed antes de chamar criarGrupo', {skip:process.env.AP1303_TEST_CALLABLE!=='1'},async()=>{
  const {getAuth,connectAuthEmulator,createUserWithEmailAndPassword}=await import('firebase/auth');
  const app=initializeApp({projectId:'demo-ap1303',apiKey:'demo-key',appId:'demo-ap1303'},'auth-indisponivel-'+crypto.randomUUID());
  const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:1',{disableWarnings:true});
  let grupos=0;
  const cadastro=criarCadastroTitular({projeto:'demo-ap1303',sessao:()=>auth.currentUser,criarConta:(...a)=>createUserWithEmailAndPassword(auth,...a),criarGrupo:async()=>grupos++,armazenamento:{}});
  try {
    await assert.rejects(cadastro.cadastrar({nome:'Teste',nomeGrupo:'Demo',email:'inacessivel@example.test',senha:'ficticia-demo-123'}),e=>e.code==='auth/network-request-failed'&&e.etapaCadastro==='auth');
    assert.equal(grupos,0);assert.equal(auth.currentUser,null);
  } finally{await deleteApp(app);}
});
