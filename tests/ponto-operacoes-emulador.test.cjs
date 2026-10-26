const test=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
test('ponto v1: atomicidade, idempotência, pendências e contexto',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async t=>{
  assert.match(process.env.GCLOUD_PROJECT,/^demo-/);
  process.env.GCLOUD_PROJECT+='-pontoop';process.env.FIREBASE_CONFIG=JSON.stringify({projectId:process.env.GCLOUD_PROJECT});
  const admin=require('../functions/node_modules/firebase-admin'),api=require('../functions/index.js'),db=admin.firestore();
  const {registrarOperacao,validarOperacao}=require('../functions/ponto-operacoes.cjs');
  t.after(()=>admin.app().delete());
  const hoje='2026-10-22',agora=Date.parse(hoje+'T13:00Z');
  const payload=(uid='func-a',mais={})=>({versao:1,operacaoId:randomUUID(),uid,contexto:{tipo:'grupo',id:'a'},funcionarioId:uid,tipo:'ENTRADA',modalidade:'online',jornadaData:hoje,capturadoEmMs:agora,fuso:'America/Fortaleza',offsetMin:180,amostra:{latitude:0,longitude:0,precisaoMetros:10,instanteMs:agora},...mais});
  for(const g of ['a','b']){
    await db.doc('grupos/'+g).set({ativo:true,titularUid:'adm-'+g});
    for(const [uid,role]of[['func-'+g,'funcionario'],['adm-'+g,'admin'],['consulta-'+g,'consulta']]){
      await db.doc('vinculosUsuarios/'+uid).set({grupoId:g,ativo:true});
      await db.doc(`grupos/${g}/users/${uid}`).set({role,ativo:true,funcionarioId:uid});
      await db.doc(`grupos/${g}/funcionarios/${uid}`).set({nome:'Fictícia',ativo:true,locaisPermitidos:['local']});
    }
    await db.doc(`grupos/${g}/locais/local`).set({ativo:true,raioMetros:100,localizacao:{latitude:0,longitude:0}});
  }
  const op=(p,uid=p.uid,tempo=agora)=>registrarOperacao(db,{auth:uid?{uid}:null,data:p},tempo);
  let original=payload(),recibo;
  await t.test('mesmo payload concorrente: uma marcação, um recibo e mesmo resultado',async()=>{
    const r=await Promise.all([op(original),op(original),op(original)]);recibo=r[0];assert.deepEqual(r,[recibo,recibo,recibo]);
    assert.equal(recibo.status,'confirmado');assert.equal((await db.collection('grupos/a/registros').get()).size,1);
    assert.equal((await db.collection('grupos/a/pontoOperacoes').get()).size,1);
    assert.equal((await db.doc('grupos/a/dias/func-a_'+hoje).get()).data().entrada,'10:00');
  });
  await t.test('resposta descartada: replay em outro horário/dia recupera o resultado original',async()=>{
    assert.deepEqual(await op({...original,amostra:{...original.amostra}},original.uid,agora+86400000),recibo);
    assert.equal((await db.collection('grupos/a/registros').get()).size,1);
    const inverso=Object.fromEntries(Object.entries(original).reverse());assert.deepEqual(await op(inverso),recibo);
  });
  await t.test('recusa de sequência é recibo transacional estável, não um erro ambíguo',async()=>{
    const p=payload();const r=await Promise.all([op(p),op(p),op(p)]);
    assert.equal(r[0].status,'rejeitada');assert.deepEqual(r,[r[0],r[0],r[0]]);
    assert.deepEqual(await op(p),r[0]);assert.equal((await db.collection('grupos/a/registros').get()).size,1);
  });
  await t.test('mesmo ID alterado é conflito, não grava novo efeito',async()=>{
    await assert.rejects(op({...original,tipo:'SAIDA_INTERVALO'}),{code:'already-exists'});
    assert.equal((await db.collection('grupos/a/registros').get()).size,1);
  });
  await t.test('offline recebe uma pendência deduplicada, sem jornada, folha ou notificações',async()=>{
    const p=payload('func-a',{operacaoId:randomUUID(),jornadaData:'2026-10-21',modalidade:'offline_pendente'});
    const dia=(await db.doc('grupos/a/dias/func-a_'+hoje).get()).data();
    await db.doc('grupos/a/folhasPagamento/ficticia').set({liquido:123});
    const rs=await Promise.all([op(p),op(p)]);assert.deepEqual(rs[0],rs[1]);assert.equal(rs[0].status,'recebida');
    assert.equal((await db.collection('grupos/a/pontoPendencias').get()).size,1);
    assert.equal((await db.collection('grupos/a/registros').get()).size,1);
    assert.equal((await db.doc('grupos/a/dias/func-a_2026-10-21').get()).exists,false);
    assert.deepEqual((await db.doc('grupos/a/dias/func-a_'+hoje).get()).data(),dia);
    assert.equal((await db.doc('grupos/a/folhasPagamento/ficticia').get()).data().liquido,123);
    assert.equal((await db.collection('grupos/a/notificacoes').get()).size,0);
  });
  await t.test('outro UID/grupo não consulta, reutiliza ou escolhe o contexto de recibo',async()=>{
    await assert.rejects(op(original,'func-b'),{code:'permission-denied'});
    await assert.rejects(op({...original,uid:'func-b',funcionarioId:'func-b'}),{code:'permission-denied'});
    await db.doc('vinculosUsuarios/func-a').update({grupoId:'b'});
    await assert.rejects(op(original),{code:'permission-denied'});
    await db.doc('vinculosUsuarios/func-a').update({grupoId:'a'});
  });
  await t.test('uma pendência por jornada no servidor; dia futuro não fica bloqueado',async()=>{
    const p=payload('func-a',{jornadaData:'2026-10-21',modalidade:'offline_pendente'});
    assert.equal((await op(p)).status,'conflito');
    assert.equal((await op({...p,operacaoId:randomUUID(),modalidade:'online'})).status,'conflito');
    assert.equal((await op({...p,operacaoId:randomUUID(),jornadaData:'2026-10-23'})).status,'recebida');
    assert.equal((await db.collection('grupos/a/pontoPendencias').get()).size,2);
  });
  await t.test('inativa, admin, consulta, data incompatível, localização e campos extras são recusados',async()=>{
    await db.doc('grupos/a/users/func-a').update({ativo:false});
    await assert.rejects(op(original),{code:'permission-denied'});
    await assert.rejects(op(payload()),{code:'permission-denied'});
    await db.doc('grupos/a/users/func-a').update({ativo:true});
    for(const uid of ['adm-a','consulta-a'])await assert.rejects(op(payload(uid)),{code:'permission-denied'});
    assert.equal((await op(payload('func-a',{jornadaData:'2026-10-21'}))).status,'conflito');
    const fora=payload('func-a',{amostra:{...original.amostra,latitude:1}}),recusa=await op(fora);assert.equal(recusa.status,'rejeitada');assert.match(recusa.mensagem,/fora do local/);assert.deepEqual(await op(fora),recusa);
    assert.equal((await op(payload('func-a',{jornadaData:'2026-10-20'}))).status,'rejeitada');
    assert.throws(()=>validarOperacao({...original,token:'proibido'}),{code:'invalid-argument'});
    await assert.rejects(op(original,null),{code:'unauthenticated'});
  });
  await t.test('compatibilidade: endpoint antigo mantém validação e gravação no legado',async()=>{
    await db.doc('users/legado').set({role:'funcionario',ativo:true,funcionarioId:'legado'});
    await db.doc('funcionarios/legado').set({nome:'Legado fictício',ativo:true,locaisPermitidos:['local']});
    await db.doc('locais/local').set({ativo:true,raioMetros:100,localizacao:{latitude:0,longitude:0}});
    const data={funcionarioId:'legado',tipo:'ENTRADA',latitude:0,longitude:0};
    assert.equal((await api.registrarPonto.run({auth:{uid:'legado'},data})).ok,true);
    await assert.rejects(api.registrarPonto.run({auth:{uid:'legado'},data}),{code:'failed-precondition'});
    assert.equal(typeof api.registrarOperacaoPonto.run,'function');
    const p=payload('legado',{contexto:{tipo:'legado'},modalidade:'offline_pendente'});
    assert.equal((await op(p)).status,'recebida');
  });
  await t.test('contagem de operações de banco por fluxo, sem consultas prévias redundantes',async()=>{
    const contador={leituras:0,escritas:0};
    const contado=new Proxy(db,{get(alvo,k){
      if(k==='runTransaction')return fn=>alvo.runTransaction(tx=>fn(new Proxy(tx,{get(t,p){
        if(p==='get')return ref=>{contador.leituras++;return t.get(ref);};
        if(['create','set','update','delete'].includes(p))return(...args)=>{contador.escritas++;return t[p](...args);};
        const v=t[p];return typeof v==='function'?v.bind(t):v;
      }})));
      const v=alvo[k];return typeof v==='function'?v.bind(alvo):v;
    }});
    const p=payload('func-b',{contexto:{tipo:'grupo',id:'b'}});
    const chamar=async d=>{contador.leituras=0;contador.escritas=0;await registrarOperacao(contado,{auth:{uid:'func-b'},data:d},agora);return{...contador};};
    assert.deepEqual(await chamar(p),{leituras:8,escritas:3});
    assert.deepEqual(await chamar(p),{leituras:4,escritas:0});
    assert.deepEqual(await chamar({...p,operacaoId:randomUUID(),modalidade:'offline_pendente',jornadaData:'2026-10-24'}),{leituras:6,escritas:2});
  });
  await t.test('regras negam leitura e escrita diretas dos recibos e pendências',async()=>{
    const {initializeApp,deleteApp}=await import('firebase/app');const {getAuth,connectAuthEmulator,createUserWithEmailAndPassword,signOut}=await import('firebase/auth');
    const {getFirestore,connectFirestoreEmulator,doc,getDoc,setDoc,terminate}=await import('firebase/firestore');
    const app=initializeApp({projectId:process.env.GCLOUD_PROJECT,apiKey:'demo-key'},'ponto-op-regras');const auth=getAuth(app),client=getFirestore(app);
    connectAuthEmulator(auth,`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`,{disableWarnings:true});connectFirestoreEmulator(client,process.env.FIRESTORE_EMULATOR_HOST.split(':')[0],Number(process.env.FIRESTORE_EMULATOR_HOST.split(':')[1]));
    const u=(await createUserWithEmailAndPassword(auth,`operacao-${randomUUID()}@example.test`,'Ficticia-123456')).user.uid;
    await db.doc('vinculosUsuarios/'+u).set({grupoId:'a',ativo:true});await db.doc('grupos/a/users/'+u).set({role:'admin',ativo:true});
    for(const c of ['pontoOperacoes','pontoPendencias']){
      await assert.rejects(getDoc(doc(client,'grupos','a',c,'func-a_'+original.operacaoId)),/permission/i);
      await assert.rejects(setDoc(doc(client,'grupos','a',c,'forjada'),{uid:u}),/permission/i);
    }
    await signOut(auth);await terminate(client);await deleteApp(app);
  });
});
