const test=require('node:test'),assert=require('node:assert/strict');
test('feedback de conclusão: opcional, privado e idempotente',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async t=>{
 assert.match(process.env.GCLOUD_PROJECT,/^demo-/);
 const admin=require('../functions/node_modules/firebase-admin'),app=admin.initializeApp({projectId:process.env.GCLOUD_PROJECT+'-feedback'},'feedback');t.after(()=>app.delete());
 const {bancoDoGrupo}=require('../functions/grupos-contexto.cjs'),{operarLembretes}=require('../functions/lembretes.cjs'),{processarGeral}=require('../functions/lembretes-gerais.cjs');
 const db=bancoDoGrupo(app.firestore(),'teste');for(const uid of ['autor','destino','terceiro'])await db.doc('users/'+uid).set({role:'admin',ativo:true,nome:uid});
 const antes=Date.parse('2026-11-05T11:00:00Z'),hora=antes+3600000;
 const op=(operacao,d={},uid='autor',agora=hora)=>operarLembretes(db,{auth:{uid},data:{operacao,...d}},agora);
 const criar=id=>op('geralSalvar',{id,usuarioId:'destino',titulo:'Documento fictício',dataInicio:'2026-11-05',horario:'09:00',repeticao:'diario'},'autor',antes);
 const concluir=(id,feedback,uid='destino')=>op('geralConcluir',{id,ocorrenciaId:'1_'+hora,...(feedback===undefined?{}:{feedback})},uid);
 await t.test('somente destinatário conclui; terceiros não consultam a mensagem',async()=>{
  await criar('restrito');await assert.rejects(concluir('restrito','teste','autor'),e=>e.code==='permission-denied');await assert.rejects(concluir('restrito','teste','terceiro'),e=>e.code==='permission-denied');
  await concluir('restrito','Documento assinado e anexado.');const a=await op('geralListar',{visao:'criados'});assert.equal(a.lembretes[0].ultimaConclusao.feedback,'Documento assinado e anexado.');assert.equal((await op('geralListar',{visao:'criados'},'terceiro')).lembretes.length,0);
 });
 await t.test('compatível com cliente antigo e texto vazio; rejeita tipo, controles e excesso sem concluir',async()=>{
  for(const id of ['sem','vazio']){await criar(id);await concluir(id,id==='sem'?undefined:'   ');assert.equal((await db.doc('lembretes/'+id).get()).data().ultimaConclusao.feedback,'');}
  await criar('invalido');for(const feedback of [null,7,{},'x'.repeat(501),'texto\u0000'])await assert.rejects(concluir('invalido',feedback),e=>e.code==='invalid-argument');assert.equal((await db.doc('lembretes/invalido/ocorrencias/1_'+hora).get()).exists,false);
 });
 await t.test('normaliza espaços e quebras, preserva primeiro feedback no retry e não duplica notificação',async()=>{
  await criar('repetido');await concluir('repetido','  PDF assinado.\r\nSegue em anexo.  ');await concluir('repetido','outro texto');
  const l=(await db.doc('lembretes/repetido').get()).data(),o=(await db.doc('lembretes/repetido/ocorrencias/1_'+hora).get()).data();assert.equal(o.feedback,'PDF assinado.\nSegue em anexo.');assert.equal(l.ultimaConclusao.feedback,o.feedback);assert.equal(l.ultimaOcorrencia.feedback,o.feedback);assert.equal(o.concluidaPorNome,'destino');
  const q=await db.collection('avisosEnvios').where('lembreteId','==','repetido').where('tipo','==','concluido').get();assert.equal(q.size,1);assert.equal(q.docs[0].data().feedback,undefined);
 });
 await t.test('nova ocorrência e pausa preservam última conclusão para consulta do autor',async()=>{
  await processarGeral(db,db.doc('lembretes/repetido'),async()=>1,hora+86400000);let l=(await db.doc('lembretes/repetido').get()).data();assert.notEqual(l.ultimaOcorrencia.status,'concluido');assert.equal(l.ultimaConclusao.feedback,'PDF assinado.\nSegue em anexo.');
  await op('geralPausar',{id:'repetido',versao:1,ativo:false});l=(await db.doc('lembretes/repetido').get()).data();assert.equal(l.ultimaConclusao.feedback,'PDF assinado.\nSegue em anexo.');
 });
 await t.test('duas conclusões simultâneas guardam apenas uma mensagem e um evento',async()=>{
  await criar('concorrente');await Promise.all([concluir('concorrente','Mensagem A'),concluir('concorrente','Mensagem B')]);const l=(await db.doc('lembretes/concorrente').get()).data();assert.ok(['Mensagem A','Mensagem B'].includes(l.ultimaConclusao.feedback));const q=await db.collection('avisosEnvios').where('lembreteId','==','concorrente').where('tipo','==','concluido').get();assert.equal(q.size,1);
 });
});
