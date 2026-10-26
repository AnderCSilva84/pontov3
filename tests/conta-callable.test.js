import test from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,createUserWithEmailAndPassword,sendPasswordResetEmail,verifyPasswordResetCode,confirmPasswordReset,signInWithEmailAndPassword,reauthenticateWithCredential,EmailAuthProvider,signOut} from 'firebase/auth';
import {getFunctions,connectFunctionsEmulator,httpsCallable} from 'firebase/functions';
import {getFirestore,connectFirestoreEmulator,doc,getDoc,terminate} from 'firebase/firestore';
test('conta pela rede demo: link de recuperação, reauth e solicitação recuperável',{skip:process.env.AP1303_TEST_CALLABLE!=='1'},async()=>{
  const app=initializeApp({projectId:'demo-ap1303',apiKey:'demo-key',appId:'demo-ap1303'},'conta-http-'+crypto.randomUUID());
  const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9098',{disableWarnings:true});const f=getFunctions(app);connectFunctionsEmulator(f,'127.0.0.1',5007);const db=getFirestore(app);connectFirestoreEmulator(db,'127.0.0.1',8877);
  const email=`conta-${crypto.randomUUID()}@example.test`,senha='Somente-demo-123',nova='Nova-demo-123456',p={onlineIncerto:0,offlineNaoEnviado:0,recebidas:0,conflitos:0,confirmadas:0};
  try{
    const uid=(await createUserWithEmailAndPassword(auth,email,senha)).user.uid;
    await sendPasswordResetEmail(auth,email);
    const lista=await(await fetch('http://127.0.0.1:9098/emulator/v1/projects/demo-ap1303/oobCodes')).json();
    const codigo=lista.oobCodes.find(c=>c.email===email&&c.requestType==='PASSWORD_RESET');assert.ok(codigo);
    assert.equal(await verifyPasswordResetCode(auth,codigo.oobCode),email);await confirmPasswordReset(auth,codigo.oobCode,nova);await signOut(auth);
    await assert.rejects(signInWithEmailAndPassword(auth,email,senha));await signInWithEmailAndPassword(auth,email,nova);
    const call=httpsCallable(f,'contaOperacao');await assert.rejects(reauthenticateWithCredential(auth.currentUser,EmailAuthProvider.credential(email,senha)));
    assert.equal((await call({acao:'status'})).data.solicitacao,null);
    await reauthenticateWithCredential(auth.currentUser,EmailAuthProvider.credential(email,nova));await auth.currentUser.getIdToken(true);
    await assert.rejects(call({acao:'solicitar',uid:'outra-conta',confirmacao:true,pendencias:p}),e=>e.code==='functions/invalid-argument');
    const a=(await call({acao:'solicitar',confirmacao:true,pendencias:p})).data;
    const b=(await call({acao:'solicitar',confirmacao:true,pendencias:p})).data;
    assert.equal(a.solicitacao.protocolo,uid);assert.equal(b.repetida,true);assert.equal((await call({acao:'status'})).data.solicitacao.status,'aguardando_analise');
    await assert.rejects(getDoc(doc(db,'contaSolicitacoes',uid)),e=>e.code==='permission-denied');
  }finally{await signOut(auth);await terminate(db);await deleteApp(app);}
});
