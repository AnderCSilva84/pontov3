import process from 'node:process';
import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {initializeApp,deleteApp} from 'firebase/app';import {getAuth,connectAuthEmulator,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut} from 'firebase/auth';import {getFunctions,connectFunctionsEmulator,httpsCallable} from 'firebase/functions';import {getFirestore,connectFirestoreEmulator,doc,setDoc,getDoc,terminate} from 'firebase/firestore';
const require=createRequire(import.meta.url);
test('publicação ponto: callable HTTP real, folha, replay, mapa e isolamento',{skip:process.env.AP1303_PUBLICACAO_HTTP!=='1'},async()=>{
 const projectId=process.env.GCLOUD_PROJECT;assert.match(projectId,/^demo-/);assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8892');assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST,'127.0.0.1:9102');
 const app=initializeApp({projectId,apiKey:'demo-key',appId:'demo-http'},'ponto-http-'+crypto.randomUUID()),auth=getAuth(app),f=getFunctions(app),client=getFirestore(app);
 connectAuthEmulator(auth,'http://127.0.0.1:9102',{disableWarnings:true});connectFunctionsEmulator(f,'127.0.0.1',5012);connectFirestoreEmulator(client,'127.0.0.1',8892);
 const admin=require('../functions/node_modules/firebase-admin'),server=admin.initializeApp({projectId},'ponto-http-server-'+crypto.randomUUID()),db=server.firestore();
 const senha='Somente-ficticia-1234',tag=crypto.randomUUID(),grupo='grupo-'+tag,fid='func-'+tag;
 const call=httpsCallable(f,'ajustarJornadaPonto'),folhaCall=httpsCallable(f,'salvarFolhaPagamento');
 try{
  await assert.rejects(call({acao:'detalheDia',grupoId:grupo,funcionarioId:fid,dataKey:'2026-10-20'}),e=>e.code==='functions/unauthenticated');
  const contas={};for(const role of ['admin','funcionario','outro']){const email=`ponto-${role}-${tag}@example.test`,u=(await createUserWithEmailAndPassword(auth,email,senha)).user;contas[role]={uid:u.uid,email};const g=role==='outro'?'outro-'+grupo:grupo;await db.doc('grupos/'+g).set({ativo:true});await db.doc('vinculosUsuarios/'+u.uid).set({ativo:true,grupoId:g});await db.doc(`grupos/${g}/users/${u.uid}`).set({ativo:true,role:role==='funcionario'?'funcionario':'admin',funcionarioId:role==='funcionario'?fid:null,nome:'Pessoa fictícia'});await signOut(auth);}
  await db.doc(`grupos/${grupo}/funcionarios/${fid}`).set({ativo:true,nome:'Pessoa fictícia',desconsiderarIntervalo:true,intervaloPrevistoMin:60,cargaSegSexMin:480});
  await signInWithEmailAndPassword(auth,contas.admin.email,senha);
  const folha={competencia:'2026-10',salarioBase:1621,divisorHoras:220,observacao:'Ensaio fictício',inssAutomatico:true};
  const inicial=(await folhaCall({funcionarioId:fid,folha,versao:0})).data;assert.equal(inicial.versao,1);
  const alvo={grupoId:grupo,funcionarioId:fid,dataKey:'2026-10-20'};const detalhe=(await call({...alvo,acao:'detalheDia'})).data;assert.equal(detalhe.revisaoDia,'ausente');
  const pedido={...alvo,acao:'ajustarDia',operacaoId:crypto.randomUUID(),revisaoDia:detalhe.revisaoDia,tipo:'manual',entrada:'08:00',saida:'18:00',saidaIntervalo:'',entradaIntervalo:'',justificativa:'Conferência HTTP de jornada fictícia.'};
  const resultado=(await call(pedido)).data;assert.equal(resultado.dia.totalMin,540);assert.deepEqual((await call(pedido)).data,resultado);assert.equal((await db.collection(`grupos/${grupo}/ajustesPonto`).get()).size,1);
  const refFolha=db.doc(`grupos/${grupo}/folhasPagamento/${fid}_2026-10`);assert.equal((await refFolha.get()).data().pontoRevisaoPendente,true);
  await assert.rejects(folhaCall({funcionarioId:fid,folha,versao:1}),e=>e.code==='functions/aborted');
  await assert.rejects(folhaCall({funcionarioId:fid,folha,versao:2}),e=>e.code==='functions/failed-precondition');
  assert.equal((await folhaCall({funcionarioId:fid,folha:{...folha,confirmarRevisaoPonto:true},versao:2})).data.versao,3);
  assert.equal((await refFolha.get()).data().pontoRevisaoPendente,undefined);
  const local=doc(client,`grupos/${grupo}/locais/local-ficticio`);await setDoc(local,{nome:'Local fictício',endereco:'Endereço fictício',localizacao:{latitude:0,longitude:0},raioMetros:150,ativo:true});assert.equal((await getDoc(local)).data().endereco,'Endereço fictício');
  await assert.rejects(setDoc(doc(client,`grupos/${grupo}/dias/indevido`),{funcionarioId:fid,dataKey:'2026-10-20'}),e=>e.code==='permission-denied');
  await assert.rejects(call({...alvo,acao:'listar'}),e=>e.code==='functions/invalid-argument');
  await signOut(auth);await signInWithEmailAndPassword(auth,contas.funcionario.email,senha);
  await assert.rejects(call({...alvo,acao:'detalheDia'}),e=>e.code==='functions/permission-denied');
  await assert.rejects(setDoc(local,{nome:'Não autorizado'}),e=>e.code==='permission-denied');
  await signOut(auth);await signInWithEmailAndPassword(auth,contas.outro.email,senha);
  await assert.rejects(call({...alvo,acao:'detalheDia'}),e=>e.code==='functions/permission-denied');
  await assert.rejects(getDoc(local),e=>e.code==='permission-denied');
  assert.equal((await db.collection(`grupos/${grupo}/financeiro`).get()).size,0);
 }finally{await signOut(auth);await terminate(client);await deleteApp(app);await server.delete();}
});
