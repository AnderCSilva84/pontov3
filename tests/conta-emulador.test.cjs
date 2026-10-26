const test=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
test('conta: solicitações duráveis, próprias, idempotentes e sem cascata',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async t=>{
  assert.match(process.env.GCLOUD_PROJECT,/^demo-/);
  const admin=require('../functions/node_modules/firebase-admin');const app=admin.initializeApp({projectId:process.env.GCLOUD_PROJECT+'-conta-'+Date.now()},'conta-test');const db=app.firestore(),auth=app.auth();t.after(()=>app.delete());
  const {operarConta}=require('../functions/conta.cjs');
  const r={onlineIncerto:1,offlineNaoEnviado:1,recebidas:1,conflitos:0,confirmadas:2};
  const a='a-'+randomUUID(),b='b-'+randomUUID(),c='c-'+randomUUID(),g='g_'+a;
  for(const uid of [a,b,c])await auth.createUser({uid,email:uid+'@example.test',password:'Ficticia-123456'});
  await db.doc('grupos/'+g).set({ativo:true,titularUid:a});
  for(const [uid,role,gid]of [[a,'admin',g],[b,'funcionario',g],[c,'admin','outro']]){await db.doc('vinculosUsuarios/'+uid).set({ativo:true,grupoId:gid});await db.doc(`grupos/${gid}/users/${uid}`).set({ativo:true,role,nome:'Pessoa fictícia'});}
  await db.doc('grupos/outro').set({ativo:true,titularUid:c});await db.doc(`grupos/${g}/financeiro/preservado`).set({valor:123});
  const chamar=(uid,dados,token={auth_time:Math.floor(Date.now()/1000)})=>operarConta(db,auth,{auth:{uid,token},data:dados});
  let resposta;
  await t.test('confirmação/reauth recentes obrigatórias; payload não escolhe UID',async()=>{
    await assert.rejects(chamar(a,{acao:'solicitar',confirmacao:true,pendencias:r,uid:b}),{code:'invalid-argument'});
    await assert.rejects(chamar(a,{acao:'solicitar',confirmacao:false,pendencias:r}),{code:'invalid-argument'});
    await assert.rejects(chamar(a,{acao:'solicitar',confirmacao:true,pendencias:r},{auth_time:1}),{code:'failed-precondition'});
    assert.equal((await db.collection('contaSolicitacoes').get()).size,0);
  });
  await t.test('concorrência/replay retornam mesmo protocolo, grupo e históricos intactos',async()=>{
    const resultados=await Promise.all([1,2,3].map(()=>chamar(a,{acao:'solicitar',confirmacao:true,pendencias:r})));resposta=resultados[0];
    assert.ok(resultados.every(x=>x.solicitacao.protocolo===a));assert.equal((await db.collection('contaSolicitacoes').get()).size,1);
    assert.ok(resposta.solicitacao.motivos.includes('ultimo_administrador'));assert.ok(resposta.solicitacao.motivos.includes('online_incerto'));
    assert.equal((await db.doc(`grupos/${g}/financeiro/preservado`).get()).data().valor,123);assert.ok(await auth.getUser(a));
    assert.equal((await chamar(a,{acao:'status'})).solicitacao.status,'aguardando_analise');assert.equal((await chamar(b,{acao:'status'})).solicitacao,null);
  });
  await t.test('transferência não deixa membros sem admin e não atinge outro grupo; replay seguro',async()=>{
    for(const destino of [b,c])await assert.rejects(chamar(a,{acao:'transferir',confirmacao:true,destinatario:destino}),{code:'failed-precondition'});
    assert.equal((await db.doc('grupos/'+g).get()).data().titularUid,a);
    await db.doc(`grupos/${g}/users/${b}`).update({role:'admin'});
    await auth.updateUser(b,{disabled:true});await assert.rejects(chamar(a,{acao:'transferir',confirmacao:true,destinatario:b}),{code:'failed-precondition'});await auth.updateUser(b,{disabled:false});
    const dados={acao:'transferir',confirmacao:true,destinatario:b};assert.equal((await chamar(a,dados)).transferida,true);assert.equal((await chamar(a,dados)).repetida,true);
    assert.equal((await db.doc('grupos/'+g).get()).data().titularUid,b);assert.equal((await db.doc(`grupos/${g}/users/${b}`).get()).data().role,'admin');
  });
  await t.test('conta Auth sem cadastro também fica em análise honesta, sem alegar limpeza integral',async()=>{
    const uid='sem-cadastro-'+randomUUID();await auth.createUser({uid});
    const resultado=await chamar(uid,{acao:'solicitar',confirmacao:true,pendencias:r});assert.equal(resultado.solicitacao.status,'aguardando_analise');assert.ok(await auth.getUser(uid));
    const outro='fila-indisponivel-'+randomUUID();await auth.createUser({uid:outro});
    assert.ok((await chamar(outro,{acao:'solicitar',confirmacao:true,pendencias:null})).solicitacao.motivos.includes('fila_local_nao_verificada'));
  });
  await t.test('inativo, removido ou vínculo alterado não ganha acesso por uma sessão antiga',async()=>{
    await auth.updateUser(c,{disabled:true});await assert.rejects(chamar(c,{acao:'solicitar',confirmacao:true,pendencias:r}),{code:'permission-denied'});
    await auth.deleteUser(c);await assert.rejects(chamar(c,{acao:'solicitar',confirmacao:true,pendencias:r}),{code:'unauthenticated'});
    await db.doc(`grupos/${g}/users/${a}`).update({ativo:false});await assert.rejects(chamar(a,{acao:'solicitar',confirmacao:true,pendencias:r}),{code:'permission-denied'});
    assert.equal((await chamar(a,{acao:'status'})).solicitacao.protocolo,a);
    await db.doc(`grupos/${g}/users/${a}`).update({ativo:true});await db.doc('vinculosUsuarios/'+a).update({grupoId:'outro'});
    await assert.rejects(chamar(a,{acao:'transferir',confirmacao:true,destinatario:c}),{code:'permission-denied'});
  });
});
