const test=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
test('vales parcelados: autorização, idempotência, fechamento, cancelamento e concorrência',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async t=>{
 assert.match(process.env.GCLOUD_PROJECT,/^demo-/);const admin=require('../functions/node_modules/firebase-admin'),app=admin.initializeApp({projectId:process.env.GCLOUD_PROJECT+'-adiantamentos'}),root=app.firestore();t.after(()=>app.delete());
 const {bancoDoGrupo,bancoDoUsuario}=require('../functions/grupos-contexto.cjs'),{criarAdiantamento,cancelarParcelas,protegerExclusao}=require('../functions/adiantamentos.cjs'),{salvarFolha,pagarFolhaFechada}=require('../functions/folha-pagamento.cjs');
 for(const g of ['a','b']){await root.doc('grupos/'+g).set({ativo:true});for(const role of ['admin','funcionario','consulta']){const u=g+role;await root.doc('vinculosUsuarios/'+u).set({grupoId:g,ativo:true});await root.doc(`grupos/${g}/users/${u}`).set({role,ativo:true});}}
 const db=bancoDoGrupo(root,'a');await db.doc('funcionarios/f').set({nome:'Funcionária fictícia',ativo:true});await root.doc('grupos/b/funcionarios/privado').set({nome:'Outro grupo',ativo:true});
 const base={tipo:'adiantamento',funcionarioId:'f',valor:3000,descontos:0,descontoFolha:true,dataPagamento:'2026-10-28',competenciaMes:'2026-10',descricao:'Celular fictício',quantidadeParcelas:10,primeiraCompetencia:'2026-11',intervaloMeses:1,chaveOperacao:randomUUID()};
 await assert.rejects(criarAdiantamento(db,base,'afuncionario'),{code:'permission-denied'});await assert.rejects(criarAdiantamento(db,base,'aconsulta'),{code:'permission-denied'});await assert.rejects(criarAdiantamento(db,{...base,funcionarioId:'privado'},'aadmin'),{code:'not-found'});
 const bancoB=await bancoDoUsuario(root,'badmin');await assert.rejects(criarAdiantamento(bancoB,base,'badmin'),{code:'not-found'});
 const [a,b]=await Promise.all([criarAdiantamento(db,base,'aadmin'),criarAdiantamento(db,base,'aadmin')]);assert.equal(a.id,b.id);assert.equal((await db.collection('financeiro').get()).size,1);assert.equal((await db.doc('adiantamentosControle/f').get()).data().versao,1);
 await assert.rejects(criarAdiantamento(db,{...base,valor:3001},'aadmin'),{code:'already-exists'});
 await criarAdiantamento(db,{...base,tipo:'vale',valor:100,descricao:'Vale fictício',quantidadeParcelas:3,chaveOperacao:randomUUID()},'aadmin');
 await db.doc('financeiro/legado').set({tipo:'vale',valor:90,funcionarioId:'f',competenciaMes:'2026-11'});
 const folha={competencia:'2026-11',salarioBase:2500,divisorHoras:220,inssAutomatico:false,inss:0,adiantamentos:50,proporcaoVt:100,observacao:''};
 let s=await salvarFolha(db,{folha,funcionarioId:'f',versao:0},'aadmin');assert.equal(s.totais.adiantamentosAutomaticos,333.34);assert.equal(s.totais.descontos,383.34);assert.equal((await db.doc('folhasPagamento/f_2026-11').get()).data().adiantamentos,50);
 await criarAdiantamento(db,{...base,valor:5,quantidadeParcelas:1,chaveOperacao:randomUUID()},'aadmin');
 await assert.rejects(salvarFolha(db,{folha,funcionarioId:'f',versao:1,fechar:true,revisao:s.totais},'aadmin'),{code:'aborted'});
 s=await salvarFolha(db,{folha,funcionarioId:'f',versao:1},'aadmin');assert.equal(s.totais.adiantamentosAutomaticos,338.34);
 await assert.rejects(salvarFolha(db,{folha,funcionarioId:'f',versao:2,fechar:true,revisao:{...s.totais,parcelasAdiantamentos:[]}},'aadmin'),{code:'aborted'});
 const fechada=await salvarFolha(db,{folha,funcionarioId:'f',versao:2,fechar:true,revisao:s.totais},'aadmin');assert.equal(fechada.status,'pronta_pagamento');
 await assert.rejects(criarAdiantamento(db,{...base,chaveOperacao:randomUUID()},'aadmin'),{code:'failed-precondition'});
 await assert.rejects(cancelarParcelas(db,{id:a.id,aPartir:'2026-11',motivo:'Cancelamento fictício'},'aadmin'),{code:'failed-precondition'});
 await cancelarParcelas(db,{id:a.id,aPartir:'2026-12',motivo:'Cancelamento fictício'},'aadmin');await cancelarParcelas(db,{id:a.id,aPartir:'2026-12',motivo:'Repetição fictícia'},'aadmin');assert.equal((await db.collection('financeiroAuditoria').get()).size,1);
 const antes=(await db.doc('folhasPagamento/f_2026-11').get()).data();assert.equal(antes.adiantamentosAutomaticos,338.34);
 const dezembro=await salvarFolha(db,{folha:{...folha,competencia:'2026-12',adiantamentos:0},funcionarioId:'f',versao:0},'aadmin');assert.equal(dezembro.totais.adiantamentosAutomaticos,33.33);
 const dados={tipo:'salario',folhaId:'f_2026-11',dataPagamento:'2026-12-05'},[p1,p2]=await Promise.all([pagarFolhaFechada(db,dados,'aadmin'),pagarFolhaFechada(db,dados,'aadmin')]);assert.equal(p1.id,p2.id);const pago=(await db.doc('financeiro/'+p1.id).get()).data();assert.equal(pago.adiantamentosAutomaticos,338.34);assert.equal(pago.parcelasAdiantamentos.length,3);assert.equal(pago.valorLiquido,2111.66);
 await assert.rejects(db.runTransaction(async tx=>{const r=(await tx.get(db.doc('financeiro/'+a.id))).data();await protegerExclusao(tx,db,r,a.id);}),{code:'failed-precondition'});
 // O fechamento e a criação de nova parcela compartilham o controle transacional.
 await db.doc('funcionarios/y').set({nome:'Concorrência fictícia',ativo:true});const fy={...folha,competencia:'2026-10',adiantamentos:0},rascunho=await salvarFolha(db,{folha:fy,funcionarioId:'y',versao:0},'aadmin');
 const concorrentes=await Promise.allSettled([criarAdiantamento(db,{...base,funcionarioId:'y',primeiraCompetencia:'2026-10',chaveOperacao:randomUUID()},'aadmin'),salvarFolha(db,{folha:fy,funcionarioId:'y',versao:1,fechar:true,revisao:rascunho.totais},'aadmin')]);
 assert.ok(concorrentes.some(x=>x.status==='rejected'));const y=(await db.doc('folhasPagamento/y_2026-10').get()).data();if(y.status==='pronta_pagamento')assert.equal((await db.collection('financeiro').where('funcionarioId','==','y').get()).size,0);
 await t.test('regra exige o cálculo no servidor quando há controle de parcelamento',async()=>{
  const {initializeApp,deleteApp}=await import('firebase/app'),{getAuth,connectAuthEmulator,createUserWithEmailAndPassword,signOut}=await import('firebase/auth'),{getFirestore,connectFirestoreEmulator,setDoc,updateDoc,getDoc,doc,serverTimestamp,terminate}=await import('firebase/firestore');
  const cliente=initializeApp({projectId:process.env.GCLOUD_PROJECT,apiKey:'demo-key'},'adiantamentos-regra'),auth=getAuth(cliente),fire=getFirestore(cliente);connectAuthEmulator(auth,'http://'+process.env.FIREBASE_AUTH_EMULATOR_HOST,{disableWarnings:true});const [host,porta]=process.env.FIRESTORE_EMULATOR_HOST.split(':');connectFirestoreEmulator(fire,host,Number(porta));
  const usuario=(await createUserWithEmailAndPassword(auth,'parcelas-regra@example.invalid','SenhaSomenteFicticia123!')).user,backend=admin.initializeApp({projectId:process.env.GCLOUD_PROJECT},'adiantamentos-regras-admin'),dados=backend.firestore();
  const fid='regra-parcelas';await dados.doc('users/'+usuario.uid).set({role:'admin',ativo:true});await dados.doc('funcionarios/'+fid).set({nome:'Funcionária fictícia',ativo:true});
  const docRef=doc(fire,'folhasPagamento',fid+'_2026-10'),legado={competencia:'2026-10',salarioBase:2500,bonus:0,horasExtras:0,adicionais:0,horasDevidas:0,divisorHoras:220,bonusBaseDesconto:false,faltas:0,inss:0,adiantamentos:0,outrosDescontos:0,observacao:'',proventos:2500,descontos:0,descontoHoras:0,valorHora:2500/220,liquido:2500,funcionarioId:fid,funcionarioNome:'Funcionária fictícia',status:'em_andamento',versao:1,criadaPor:usuario.uid,criadaEm:serverTimestamp(),atualizadaPor:usuario.uid,atualizadaEm:serverTimestamp()};
  try{
   await setDoc(docRef,legado);await dados.doc('adiantamentosControle/'+fid).set({versao:1});
   await assert.rejects(updateDoc(docRef,{status:'pronta_pagamento',versao:2,fechadaPor:usuario.uid,fechadaEm:serverTimestamp(),atualizadaPor:usuario.uid,atualizadaEm:serverTimestamp()}),/permission/i);
   assert.equal((await getDoc(docRef)).data().status,'em_andamento');
   await assert.rejects(setDoc(doc(fire,'adiantamentosControle',fid),{versao:0}),/permission/i);
   const f={competencia:'2026-10',salarioBase:2500,divisorHoras:220,inssAutomatico:false,observacao:''},salva=await salvarFolha(dados,{folha:f,funcionarioId:fid,versao:1},usuario.uid);
   assert.equal((await salvarFolha(dados,{folha:f,funcionarioId:fid,versao:2,fechar:true,revisao:salva.totais},usuario.uid)).status,'pronta_pagamento');
  }finally{await signOut(auth);await terminate(fire);await deleteApp(cliente);await backend.delete();}
 });
});
