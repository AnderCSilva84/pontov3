import test from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,createUserWithEmailAndPassword,signInWithEmailAndPassword,reauthenticateWithCredential,EmailAuthProvider,signOut} from 'firebase/auth';
import {getFunctions,connectFunctionsEmulator,httpsCallable} from 'firebase/functions';
import {getFirestore,connectFirestoreEmulator,doc,getDoc,setDoc,terminate} from 'firebase/firestore';
test('Script09 HTTP: caminho web sem APK, Auth removido e regra nega acesso',{skip:process.env.AP1303_TEST_EXCLUSAO_HTTP!=='1'},async()=>{
 const projectId='ap1303-android-push-teste';
 const app=initializeApp({projectId,apiKey:'teste-local',appId:'teste-local'},'exclusao-http-'+crypto.randomUUID());
 const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9098',{disableWarnings:true});const f=getFunctions(app);connectFunctionsEmulator(f,'127.0.0.1',5007);const db=getFirestore(app);connectFirestoreEmulator(db,'127.0.0.1',8877);
 const email=`excluir09-${crypto.randomUUID()}@example.test`,senha='Ficticia-09-12345',p={onlineIncerto:0,offlineNaoEnviado:0,recebidas:0,conflitos:0,confirmadas:0};
 const admin=await import('../functions/node_modules/firebase-admin/lib/index.js');const servidor=admin.default.initializeApp({projectId},'exclusao-http-admin'),raiz=servidor.firestore();
 try{
  const uid=(await createUserWithEmailAndPassword(auth,email,senha)).user.uid;
  const call=httpsCallable(f,'contaOperacao',{timeout:120000});
  await assert.rejects(call({acao:'concluir',uid:'outro',pendencias:p,confirmacao:true}),e=>e.code==='functions/invalid-argument');
  await reauthenticateWithCredential(auth.currentUser,EmailAuthProvider.credential(email,senha));await auth.currentUser.getIdToken(true);
  await call({acao:'solicitar',confirmacao:true,pendencias:p});
  await assert.rejects(getDoc(doc(db,'contaSolicitacoes',uid)),e=>e.code==='permission-denied');
  // Observador somente do ensaio, cancelado em conclusão/timeout; o produto não tem listener de status.
  let parar;const concluido=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{parar?.();reject(Error('Processamento local excedeu espera do ensaio'));},30000);parar=raiz.doc('contaSolicitacoes/'+uid).onSnapshot(s=>{if(s.data()?.status==='concluida'){clearTimeout(timer);parar();resolve();}if(s.data()?.status==='falha_recuperavel'){clearTimeout(timer);parar();reject(Error('Falha recuperável no ensaio HTTP'));}});});
  await call({acao:'concluir',confirmacao:true,pendencias:p,encerrarGrupoVazio:false});await concluido;
  await assert.rejects(servidor.auth().getUser(uid),e=>e.code==='auth/user-not-found');
  await assert.rejects(setDoc(doc(db,'users',uid),{ativo:true,role:'admin'}),e=>e.code==='permission-denied');
  await signOut(auth);await assert.rejects(signInWithEmailAndPassword(auth,email,senha));
 }finally{await signOut(auth);await terminate(db);await deleteApp(app);await servidor.delete();}
});
