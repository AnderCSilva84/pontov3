import process from 'node:process';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
test('callables Android acessíveis por HTTP demo validam autenticação e grupo, sem transporte FCM',{skip:process.env.AP1303_TEST_CALLABLE!=='1'},async t=>{
 assert.equal(process.env.GCLOUD_PROJECT,'demo-ap1303');assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8877');
 const admin=require('../functions/node_modules/firebase-admin');const app=admin.initializeApp({projectId:'demo-ap1303'},'push07-http-'+Date.now());t.after(()=>app.delete());const db=app.firestore();
 const s=Date.now().toString(36),grupo='push-http-'+s;
 const criacao=await fetch('http://127.0.0.1:9098/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:`push07-${s}@example.test`,password:'Senha-ficticia-123',returnSecureToken:true})});assert.equal(criacao.status,200);const sessao=await criacao.json();
 await db.doc('grupos/'+grupo).set({ativo:true});await db.doc('vinculosUsuarios/'+sessao.localId).set({grupoId:grupo,ativo:true});await db.doc(`grupos/${grupo}/users/${sessao.localId}`).set({ativo:true,role:'admin'});
 for(const caminho of ['pushInstalacoes','pushTokensNativos',`grupos/${grupo}/pushDispositivos`]){const resposta=await fetch('http://127.0.0.1:8877/v1/projects/demo-ap1303/databases/(default)/documents/'+caminho,{headers:{Authorization:'Bearer '+sessao.idToken}});assert.equal(resposta.status,403);}
 const chamar=async(nome,data,token=sessao.idToken)=>{const r=await fetch(`http://127.0.0.1:5007/demo-ap1303/us-central1/${nome}`,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({data})});return {status:r.status,body:await r.json()};};
 let r=await chamar('acaoNotificacaoLembrete',{grupoId:'outro',operacao:'consultarOcorrencia',id:'id',ocorrenciaId:'1_123'});assert.equal(r.status,403);assert.equal(r.body.error.status,'PERMISSION_DENIED');
 r=await chamar('acaoNotificacaoLembrete',{grupoId:grupo,operacao:'consultarOcorrencia',id:'id',ocorrenciaId:'1_123'},null);assert.equal(r.status,401);
 r=await chamar('testarNotificacaoPush',{});assert.equal(r.status,400);assert.equal(r.body.error.details.motivo,'sem-dispositivo');
 await db.doc(`grupos/${grupo}/users/${sessao.localId}`).update({ativo:false});r=await chamar('testarNotificacaoPush',{});assert.equal(r.status,403);
});
