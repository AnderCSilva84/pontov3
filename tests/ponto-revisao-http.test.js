import test from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,createUserWithEmailAndPassword,signOut} from 'firebase/auth';
import {getFunctions,connectFunctionsEmulator,httpsCallable} from 'firebase/functions';
import {getFirestore,connectFirestoreEmulator,doc,getDoc,setDoc,terminate} from 'firebase/firestore';
test('Script10 HTTP: callable autenticado, aprovação e regras protegidas',{skip:process.env.AP1303_TEST_REVISAO_HTTP!=='1'},async()=>{
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8877');assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST,'127.0.0.1:9098');
  const projectId='ap1303-android-push-teste',app=initializeApp({projectId,apiKey:'teste-local',appId:'teste-local'},'revisao-http-'+crypto.randomUUID());
  const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9098',{disableWarnings:true});
  const f=getFunctions(app);connectFunctionsEmulator(f,'127.0.0.1',5007);
  const client=getFirestore(app);connectFirestoreEmulator(client,'127.0.0.1',8877);
  const admin=(await import('../functions/node_modules/firebase-admin/lib/index.js')).default;
  const servidor=admin.initializeApp({projectId},'revisao-http-server-'+crypto.randomUUID()),db=servidor.firestore();
  try{
    const uid=(await createUserWithEmailAndPassword(auth,`revisao10-${crypto.randomUUID()}@example.test`,'Ficticia-10-12345')).user.uid;
    const grupoId='revisao10-'+crypto.randomUUID(),pfx=`grupos/${grupoId}/`,func='f-'+crypto.randomUUID();
    await db.doc('grupos/'+grupoId).set({ativo:true});
    await db.doc('vinculosUsuarios/'+uid).set({ativo:true,grupoId});await db.doc(pfx+'users/'+uid).set({role:'admin',ativo:true});
    await db.doc('vinculosUsuarios/'+func).set({ativo:true,grupoId});await db.doc(pfx+'users/'+func).set({role:'funcionario',ativo:true,funcionarioId:func});await db.doc(pfx+'funcionarios/'+func).set({nome:'Teste HTTP fictício',ativo:true});
    const {registrarOperacao}=await import('../functions/ponto-operacoes.cjs');
    const payload={versao:1,operacaoId:crypto.randomUUID(),uid:func,contexto:{tipo:'grupo',id:grupoId},funcionarioId:func,tipo:'ENTRADA',modalidade:'offline_pendente',jornadaData:'2026-10-20',capturadoEmMs:Date.parse('2026-10-20T12:00Z'),fuso:'America/Fortaleza',offsetMin:180,amostra:{latitude:0,longitude:0,precisaoMetros:8,instanteMs:null}};
    await registrarOperacao(db,{auth:{uid:func},data:payload});
    const call=httpsCallable(f,'revisarPendenciaPonto',{timeout:30000}),pendenciaId=func+'_2026-10-20';
    const detalhe=(await call({acao:'detalhe',grupoId,pendenciaId})).data;assert.equal(detalhe.status,'aguardando_analise');
    const pedido={acao:'decidir',grupoId,pendenciaId,versao:1,decisaoId:crypto.randomUUID(),resultado:'aprovada',justificativa:'Conferência HTTP fictícia',horaRevisada:'09:00',revisaoDia:detalhe.revisaoDia};
    const resultado=(await call(pedido)).data;assert.equal(resultado.status,'confirmado');assert.deepEqual((await call(pedido)).data,resultado);
    await assert.rejects(getDoc(doc(client,pfx+'pontoPendencias/'+pendenciaId)),e=>e.code==='permission-denied');
    await assert.rejects(getDoc(doc(client,pfx+'pontoDecisoes/'+uid+'_'+pedido.decisaoId)),e=>e.code==='permission-denied');
    await assert.rejects(setDoc(doc(client,pfx+'registros/indevido'),{hora:'09:00'}),e=>e.code==='permission-denied');
    assert.equal((await db.doc(pfx+'dias/'+pendenciaId).get()).data().entrada,'09:00');
  }finally{await signOut(auth);await terminate(client);await deleteApp(app);await servidor.delete();}
});
