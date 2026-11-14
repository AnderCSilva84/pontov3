const test=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
test('Script09: exclusão efetiva, recuperação e isolamento nos emuladores',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async t=>{
 assert.match(process.env.FIRESTORE_EMULATOR_HOST,/^(127\.0\.0\.1|localhost):/);assert.match(process.env.FIREBASE_AUTH_EMULATOR_HOST,/^(127\.0\.0\.1|localhost):/);
 const admin=require('../functions/node_modules/firebase-admin');const app=admin.initializeApp({projectId:'demo-exclusao-'+Date.now()},'exclusao09');const db=app.firestore(),auth=app.auth();t.after(()=>app.delete());
 const {operarConta}=require('../functions/conta.cjs'),{processarExclusao,autorizarExclusao}=require('../functions/conta-exclusao.cjs');
 const fila={onlineIncerto:0,offlineNaoEnviado:0,recebidas:1,conflitos:0,confirmadas:1};
 const call=(uid,data)=>operarConta(db,auth,{auth:{uid,token:{auth_time:Math.floor(Date.now()/1000)}},data});
 const solicitar=uid=>call(uid,{acao:'solicitar',confirmacao:true,pendencias:fila});
 const concluir=(uid,mais={})=>call(uid,{acao:'concluir',confirmacao:true,pendencias:fila,...mais});
 async function conta(gid,role='funcionario') {const uid='e09_'+randomUUID();await auth.createUser({uid,email:uid+'@example.test',password:'Ficticia-09-123'});if(gid){await db.doc('vinculosUsuarios/'+uid).set({ativo:true,grupoId:gid});await db.doc(`grupos/${gid}/users/${uid}`).set({ativo:true,role,funcionarioId:role==='funcionario'?uid:null,nome:'Ficticio'});if(role==='funcionario')await db.doc(`grupos/${gid}/funcionarios/${uid}`).set({nome:'Ficticio',ativo:true});}return uid;}
 await t.test('Auth removido, dados pessoais e integrações revogados; terceiros e histórico preservados',async()=>{
  const g='a',uid=await conta(g),adminUid=await conta(g,'admin');await db.doc('grupos/'+g).set({ativo:true,titularUid:adminUid});
  await db.doc(`grupos/${g}/fotosPerfis/${uid}`).set({bytes:Buffer.from('miniatura fictícia')});
  await db.doc(`grupos/${g}/funcionarios/${uid}`).set({fotoPerfilUid:uid,temFotoPerfil:true},{merge:true});
  await db.doc(`grupos/${g}/financeiro/historia`).set({funcionarioId:uid,valor:50});await db.doc(`grupos/${g}/comprasPrecos/preco`).set({criadoPor:uid,valor:10});
  await db.doc(`grupos/${g}/pontoPendencias/remota`).set({uid,status:'aguardando_analise'});
  for(let i=0;i<27;i++)await db.doc(`grupos/${g}/pushDispositivos/d${i}`).set({uid,token:'ficticio'});
  await db.doc('pushInstalacoes/reserva').set({uid});await db.doc('pushTokensNativos/reserva').set({uid});await db.doc('pushTokensNativos/alheio').set({uid:adminUid});
  await db.doc('noBolsoOwners/'+uid).set({noBolsoUids:['bolso']});await db.doc('noBolsoLinks/bolso').set({apUids:[uid,adminUid],createdAt:new Date()});await db.doc('noBolsoGrants/'+uid).set({hash:'ficticio'});
  await solicitar(uid);const r=await concluir(uid);assert.equal(r.solicitacao.status,'concluida');
  await assert.rejects(auth.getUser(uid),{code:'auth/user-not-found'});
  assert.equal((await db.doc(`grupos/${g}/fotosPerfis/${uid}`).get()).exists,false);
  assert.equal((await db.doc(`grupos/${g}/funcionarios/${uid}`).get()).data().fotoPerfilUid,undefined);
  for(const path of [`grupos/${g}/users/${uid}`,'vinculosUsuarios/'+uid,'pushInstalacoes/reserva','pushTokensNativos/reserva','noBolsoOwners/'+uid,'noBolsoGrants/'+uid])assert.equal((await db.doc(path).get()).exists,false,path);
  assert.equal((await db.collection(`grupos/${g}/pushDispositivos`).where('uid','==',uid).get()).size,0);
  assert.equal((await db.doc('pushTokensNativos/alheio').get()).data().uid,adminUid);assert.deepEqual((await db.doc('noBolsoLinks/bolso').get()).data().apUids,[adminUid]);
  assert.equal((await db.doc(`grupos/${g}/financeiro/historia`).get()).data().valor,50);assert.equal((await db.doc(`grupos/${g}/comprasPrecos/preco`).get()).data().valor,10);assert.equal((await db.doc(`grupos/${g}/pontoPendencias/remota`).get()).data().status,'aguardando_analise');
  assert.equal((await db.doc(`grupos/${g}/funcionarios/${uid}`).get()).data().ativo,false);assert.ok(await auth.getUser(adminUid));
  assert.equal((await processarExclusao(db,auth,uid)).solicitacao.status,'concluida');
  await assert.rejects(concluir(uid),{code:'unauthenticated'});
 });
 await t.test('próprio UID/grupo e reauth; nenhum alvo arbitrário',async()=>{
  const uid=await conta();await solicitar(uid);
  await assert.rejects(call(uid,{acao:'concluir',confirmacao:true,pendencias:fila,uid:'outro'}),{code:'invalid-argument'});
  await assert.rejects(concluir(uid,{pendencias:{...fila,onlineIncerto:1}}),{code:'failed-precondition'});
  await assert.rejects(concluir(uid,{pendencias:null}),{code:'failed-precondition'});assert.ok(await auth.getUser(uid));
  const r=await concluir(uid);assert.equal(r.solicitacao.status,'concluida');
 });
 await t.test('falha antes e depois do Auth, retomada por servidor e concorrência sem duplicação',async()=>{
  for(const falhar of ['perfil','auth_removido']) {
   const uid=await conta();await solicitar(uid);await autorizarExclusao(db,uid,{pendencias:fila});let apagamentos=0;
   const authContado={deleteUser:async u=>{apagamentos++;return auth.deleteUser(u);}};
   const r=await processarExclusao(db,authContado,uid,{aposEtapa:async etapa=>{if(etapa===falhar)throw Error('FALHA_FICTICIA');}});assert.equal(r.solicitacao.status,'falha_recuperavel');
   if(falhar==='auth_removido')await assert.rejects(auth.getUser(uid),{code:'auth/user-not-found'});else assert.ok(await auth.getUser(uid));
   if(falhar==='auth_removido'){
    const saida=require('node:child_process').execFileSync(process.execPath,['scripts/retomar-exclusao-emulador.cjs',uid,'retomar'],{env:{...process.env,GCLOUD_PROJECT:app.options.projectId},encoding:'utf8'});assert.equal(JSON.parse(saida).status,'concluida');
   }else await db.doc('contaSolicitacoes/'+uid).update({status:'processando'});
   const resultados=await Promise.all([processarExclusao(db,authContado,uid),processarExclusao(db,authContado,uid)]);
   assert.ok(resultados.some(x=>x.solicitacao.status==='concluida'));assert.equal((await db.doc('contaSolicitacoes/'+uid).get()).data().status,'concluida');assert.ok(apagamentos<=2);
  }
 });
 await t.test('último administrador, titularidade e grupo vazio explícito',async()=>{
  const g='titular',a=await conta(g,'admin'),b=await conta(g);await db.doc('grupos/'+g).set({ativo:true,titularUid:a});await solicitar(a);
  await assert.rejects(concluir(a),{code:'failed-precondition'});await db.doc(`grupos/${g}/users/${b}`).update({role:'admin'});
  await call(a,{acao:'transferir',destinatario:b,confirmacao:true});assert.equal((await concluir(a)).solicitacao.status,'concluida');assert.ok(await auth.getUser(b));assert.equal((await db.doc('grupos/'+g).get()).data().titularUid,b);
  const g2='vazio',c=await conta(g2,'admin');await db.doc('grupos/'+g2).set({ativo:true,titularUid:c});await solicitar(c);await assert.rejects(concluir(c),{code:'failed-precondition'});
  assert.equal((await concluir(c,{encerrarGrupoVazio:true})).solicitacao.status,'concluida');assert.equal((await db.doc('grupos/'+g2).get()).data().ativo,false);assert.equal((await db.doc('grupos/'+g2).get()).exists,true);
 });
 await t.test('paginação e continuação limitadas preservam progresso sem reprocessar páginas',async()=>{
  const g='paginas',u=await conta(g),a=await conta(g,'admin');await db.doc('grupos/'+g).set({ativo:true,titularUid:a});
  const lote=db.batch();for(let n=0;n<151;n++)lote.set(db.doc(`grupos/${g}/pushDispositivos/d${String(n).padStart(3,'0')}`),{uid:u});await lote.commit();
  await solicitar(u);await autorizarExclusao(db,u,{pendencias:fila});const primeiro=await processarExclusao(db,auth,u);assert.equal(primeiro.solicitacao.status,'processando');
  const pedido=(await db.doc('contaSolicitacoes/'+u).get()).data();assert.ok(pedido.rodada>1);assert.equal((await db.collection(`grupos/${g}/pushDispositivos`).where('uid','==',u).get()).size,0);
  assert.equal((await processarExclusao(db,auth,u)).solicitacao.status,'concluida');await assert.rejects(auth.getUser(u),{code:'auth/user-not-found'});
 });
 await t.test('perfil legado sem ativo não é ignorado na proteção de titularidade',async()=>{
  const g='sem-ativo',a=await conta(g,'admin'),b=await conta(g);await db.doc('grupos/'+g).set({ativo:true,titularUid:a});await db.doc(`grupos/${g}/users/${b}`).update({ativo:admin.firestore.FieldValue.delete()});await solicitar(a);
  await assert.rejects(concluir(a,{encerrarGrupoVazio:true}),{code:'failed-precondition'});assert.ok(await auth.getUser(a));assert.equal((await db.doc('grupos/'+g).get()).data().ativo,true);
 });
 await t.test('transferência concorrente com exclusão do destinatário mantém administrador',async()=>{
  const g='concorrencia',a=await conta(g,'admin'),b=await conta(g,'admin');await db.doc('grupos/'+g).set({ativo:true,titularUid:a});await solicitar(a);await solicitar(b);
  await Promise.allSettled([call(a,{acao:'transferir',destinatario:b,confirmacao:true}),concluir(b)]);
  const grupo=(await db.doc('grupos/'+g).get()).data(),titular=(await db.doc(`grupos/${g}/users/${grupo.titularUid}`).get()).data();assert.equal(titular.ativo,true);assert.equal(titular.role,'admin');assert.ok(await auth.getUser(grupo.titularUid));
 });
 await t.test('outro administrador com Auth desativado não substitui responsável ativo',async()=>{
  const g='auth-inativo',a=await conta(g,'admin'),b=await conta(g,'admin');await db.doc('grupos/'+g).set({ativo:true,titularUid:a});await auth.updateUser(a,{disabled:true});await solicitar(b);
  await assert.rejects(concluir(b),{code:'failed-precondition'});assert.ok(await auth.getUser(b));assert.equal((await db.doc(`grupos/${g}/users/${b}`).get()).data().ativo,true);
 });
 await t.test('cadastro trabalhista compartilhado com outro perfil permanece ativo',async()=>{
  const g='func-compartilhado',a=await conta(g,'admin'),b=await conta(g),c=await conta(g);await db.doc('grupos/'+g).set({ativo:true,titularUid:a});await db.doc(`grupos/${g}/users/${c}`).update({funcionarioId:b});await solicitar(b);assert.equal((await concluir(b)).solicitacao.status,'concluida');assert.equal((await db.doc(`grupos/${g}/funcionarios/${b}`).get()).data().ativo,true);assert.ok(await auth.getUser(c));
 });
 await t.test('exclusão administrativa concorre com transferência sem remover o novo titular',async()=>{
  process.env.GCLOUD_PROJECT=app.options.projectId;process.env.FIREBASE_CONFIG=JSON.stringify({projectId:app.options.projectId});
  const api=require('../functions/index.js');t.after(()=>admin.app().delete());
  const g='admin-concorrente',a=await conta(g,'admin'),b=await conta(g,'admin'),c=await conta(g,'admin');await db.doc('grupos/'+g).set({ativo:true,titularUid:a});await solicitar(a);
  await Promise.allSettled([call(a,{acao:'transferir',confirmacao:true,destinatario:b}),api.excluirUsuario.run({auth:{uid:c,token:{}},data:{uid:b}})]);
  const grupo=(await db.doc('grupos/'+g).get()).data();assert.ok(await auth.getUser(grupo.titularUid));assert.equal((await db.doc(`grupos/${g}/users/${grupo.titularUid}`).get()).data().ativo,true);
 });
});
