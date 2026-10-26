const test=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
test('Script10: revisão transacional e autorizações',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async t=>{
  assert.match(process.env.GCLOUD_PROJECT,/^demo-/);
  const admin=require('../functions/node_modules/firebase-admin');
  const app=admin.initializeApp({projectId:process.env.GCLOUD_PROJECT+'-revisao'},'revisao10'),db=app.firestore();
  const {registrarOperacao}=require('../functions/ponto-operacoes.cjs');
  const {operarRevisao}=require('../functions/ponto-revisao.cjs');
  t.after(()=>app.delete());
  const raiz='grupos/a/',data='2026-10-20',ms=Date.parse(data+'T12:00Z');
  for(const g of ['a','b']){
    await db.doc('grupos/'+g).set({ativo:true});
    for(const [uid,role,ativo]of[['adm-'+g,'admin',true],['adm2-'+g,'admin',true],['consulta-'+g,'consulta',true],['inativo-'+g,'admin',false]]){
      await db.doc('vinculosUsuarios/'+uid).set({grupoId:g,ativo:true});await db.doc(`grupos/${g}/users/${uid}`).set({role,ativo});
    }
  }
  const req=(d,uid='adm-a',grupoId='a')=>operarRevisao(db,{auth:uid?{uid}:null,data:{...d,grupoId}});
  async function captura(tipo='ENTRADA'){
    const uid='f-'+randomUUID(),fid=uid;
    await db.doc('vinculosUsuarios/'+uid).set({grupoId:'a',ativo:true});
    await db.doc(raiz+'users/'+uid).set({role:'funcionario',ativo:true,funcionarioId:fid});
    await db.doc(raiz+'funcionarios/'+fid).set({nome:'Pessoa fictícia',ativo:true,desconsiderarIntervalo:true,cargaHorariaMin:480});
    const payload={versao:1,operacaoId:randomUUID(),uid,contexto:{tipo:'grupo',id:'a'},funcionarioId:fid,tipo,modalidade:'offline_pendente',jornadaData:data,capturadoEmMs:ms,fuso:'America/Fortaleza',offsetMin:180,amostra:{latitude:0,longitude:0,precisaoMetros:8,instanteMs:ms}};
    await registrarOperacao(db,{auth:{uid},data:payload},ms);
    return {uid,fid,payload,id:fid+'_'+data};
  }
  const detalhe=x=>req({acao:'detalhe',pendenciaId:x.id});
  async function pedido(x,resultado='aprovada',mais={}){const d=await detalhe(x);return {acao:'decidir',versao:1,pendenciaId:x.id,decisaoId:randomUUID(),resultado,horaRevisada:'09:10',justificativa:'Conferido pelo administrador fictício.',revisaoDia:d.revisaoDia,...mais};}
  await t.test('aprovação preserva original, registra horário revisado/autoria e replay sem duplicar',async()=>{
    const x=await captura(),d=await pedido(x),r=await req(d);
    assert.equal(r.status,'confirmado');assert.equal(r.hora,'09:10');assert.equal(r.origem,'revisao_offline');
    assert.deepEqual(await req(d),r);
    const p=(await db.doc(raiz+'pontoPendencias/'+x.id).get()).data();assert.deepEqual(p.payload,x.payload);assert.equal(p.status,'aprovada');assert.ok(p.decisao.decididaEm.toMillis());
    const registro=(await db.doc(raiz+'registros/'+p.decisao.registroId).get()).data();assert.equal(registro.registradoPor,'adm-a');assert.equal(registro.autorOriginal,x.uid);
    assert.equal((await db.doc(raiz+'dias/'+x.id).get()).data().entrada,'09:10');
    assert.deepEqual(await registrarOperacao(db,{auth:{uid:x.uid},data:x.payload},ms+1e8),r);
    await assert.rejects(req({...d,horaRevisada:'09:11'}),{code:'already-exists'});
    const outra=await captura();await assert.rejects(req({...await pedido(outra),decisaoId:d.decisaoId}),{code:'already-exists'});
  });
  await t.test('rejeição exige motivo e não cria dia, registro ou folha',async()=>{
    const x=await captura(),d=await pedido(x,'rejeitada');
    await assert.rejects(req({...d,justificativa:''}),{code:'invalid-argument'});
    assert.equal((await req(d)).status,'rejeitada');assert.equal((await db.doc(raiz+'dias/'+x.id).get()).exists,false);
    assert.deepEqual((await db.doc(raiz+'pontoPendencias/'+x.id).get()).data().payload,x.payload);
    assert.equal((await db.doc(raiz+'folhasPagamento/'+x.fid+'_2026-10').get()).exists,false);
  });
  await t.test('concorrência aprovação/aprovação e aprovação/rejeição: somente uma decisão',async()=>{
    for(const tipo of ['aprovada','rejeitada']){
      const x=await captura(),a=await pedido(x),b={...a,decisaoId:randomUUID(),resultado:tipo};
      const r=await Promise.allSettled([req(a),req(b,'adm2-a')]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.find(x=>x.status==='rejected').reason.code,'already-exists');
      const vencedora=r.find(x=>x.status==='fulfilled').value;
      assert.equal((await db.collection(raiz+'registros').where('funcionarioId','==',x.fid).get()).size,vencedora.status==='confirmado'?1:0);
    }
  });
  await t.test('funcionário, consulta, inativo, sem sessão e outro grupo não decidem',async()=>{
    const x=await captura(),d=await pedido(x);
    for(const uid of [x.uid,'consulta-a','inativo-a'])await assert.rejects(req(d,uid),{code:'permission-denied'});
    await assert.rejects(req(d,null),{code:'unauthenticated'});
    await assert.rejects(req(d,'adm-b'),{code:'permission-denied'});
    await assert.rejects(req(d,'adm-b','b'),{code:'not-found'});
    const y=await captura();await assert.rejects(req({acao:'detalhe',pendenciaId:x.id},y.uid),{code:'permission-denied'});
    assert.equal((await req({acao:'detalhe',pendenciaId:x.id},x.uid)).id,x.id);
  });
  await t.test('jornada alterada, encerrada, sobreposição e sequência inválida bloqueadas',async()=>{
    for(const [dia,codigo]of [[{entrada:'08:00'},'aborted'],[{entrada:'08:00',saida:'18:00',encerrado:true},'failed-precondition']]){
      const x=await captura(),d=await pedido(x);await db.doc(raiz+'dias/'+x.id).set(dia);await assert.rejects(req(d),{code:codigo});
    }
    const x=await captura();await db.doc(raiz+'dias/'+x.id).set({entrada:'10:00'});
    const d=await pedido(x);await assert.rejects(req(d),{code:'failed-precondition'});
    await assert.rejects(req({...d,horaRevisada:'11:00'}),{code:'failed-precondition'});
    const afastada=await captura();await db.doc(raiz+'dias/'+afastada.id).set({ajusteManual:true,ajusteTipo:'ferias',totalMin:480,saldoMin:0});
    await assert.rejects(req(await pedido(afastada)),/ajuste administrativo ou afastamento/);
    await req(await pedido(afastada,'rejeitada'));
    assert.equal((await db.doc(raiz+'dias/'+afastada.id).get()).data().totalMin,480);
  });
  await t.test('folha fechada não muda; folha aberta exige nova conferência e versão',async()=>{
    for(const status of ['pronta_pagamento','paga','em_andamento']){
      const x=await captura(),ref=db.doc(raiz+'folhasPagamento/'+x.fid+'_2026-10');await ref.set({status,versao:2,liquido:100});
      const d=await pedido(x);
      if(status==='em_andamento'){await req(d);const f=(await ref.get()).data();assert.equal(f.versao,3);assert.equal(f.pontoRevisaoPendente,true);assert.equal(f.liquido,100);}
      else {await assert.rejects(req(d),{code:'failed-precondition'});assert.deepEqual((await ref.get()).data(),{status,versao:2,liquido:100});}
    }
  });
  await t.test('fechamento concorrente não ignora revisão e confirmação explícita é necessária',async()=>{
    const {salvarFolha}=require('../functions/folha-pagamento.cjs');
    const {bancoDoGrupo}=require('../functions/grupos-contexto.cjs');
    const banco=bancoDoGrupo(db,'a'),x=await captura();
    const folha={competencia:'2026-10',salarioBase:1621,divisorHoras:220,inssAutomatico:true,observacao:''};
    const antes=await salvarFolha(banco,{funcionarioId:x.fid,folha,versao:0},'adm-a');
    await req(await pedido(x));
    await assert.rejects(salvarFolha(banco,{funcionarioId:x.fid,folha,versao:antes.versao,fechar:true},'adm-a'),{code:'aborted'});
    await assert.rejects(salvarFolha(banco,{funcionarioId:x.fid,folha,versao:2,fechar:true},'adm-a'),{code:'failed-precondition'});
    const salva=await salvarFolha(banco,{funcionarioId:x.fid,folha:{...folha,confirmarRevisaoPonto:true},versao:2},'adm-a');assert.equal(salva.versao,3);
    assert.equal((await db.doc(raiz+'folhasPagamento/'+x.fid+'_2026-10').get()).data().pontoRevisaoPendente,undefined);
  });
  await t.test('conta excluída: aprovação bloqueada, consulta e rejeição preservadas, sem recriação',async()=>{
    const x=await captura(),d=await pedido(x);await db.doc(raiz+'users/'+x.uid).delete();await db.doc('vinculosUsuarios/'+x.uid).delete();
    await assert.rejects(req(d),{code:'failed-precondition'});assert.equal((await detalhe(x)).status,'aguardando_analise');
    await req({...d,resultado:'rejeitada'});assert.equal((await db.doc(raiz+'users/'+x.uid).get()).exists,false);assert.equal((await db.doc('vinculosUsuarios/'+x.uid).get()).exists,false);
  });
  await t.test('vínculo original inativo e captura em outra data não autorizam aprovação',async()=>{
    const x=await captura();await db.doc('vinculosUsuarios/'+x.uid).update({ativo:false});
    await assert.rejects(req(await pedido(x)),/Conta original sem acesso/);
    await req(await pedido(x,'rejeitada'));
    const y=await captura(),p={...y.payload,jornadaData:'2026-10-19',operacaoId:randomUUID()};
    await registrarOperacao(db,{auth:{uid:y.uid},data:p},ms);y.id=y.fid+'_2026-10-19';
    await assert.rejects(req(await pedido(y)),/Turno noturno/);
    await req(await pedido(y,'rejeitada'));
  });
  await t.test('mesmo pedido simultâneo devolve o mesmo recibo, sem duplicar registro',async()=>{
    const x=await captura(),d=await pedido(x);const r=await Promise.all([req(d),req(d)]);assert.deepEqual(r[0],r[1]);
    assert.equal((await db.collection(raiz+'registros').where('funcionarioId','==',x.fid).get()).size,1);
  });
  await t.test('nova captura após decisão mantém histórico e bloqueio diário ativo',async()=>{
    const x=await captura();await req(await pedido(x,'rejeitada'));
    const novo={...x.payload,operacaoId:randomUUID()};assert.equal((await registrarOperacao(db,{auth:{uid:x.uid},data:novo},ms)).status,'recebida');
    assert.equal((await db.doc(raiz+'pontoPendencias/'+x.id).get()).data().status,'rejeitada');
    assert.equal((await registrarOperacao(db,{auth:{uid:x.uid},data:{...novo,operacaoId:randomUUID()}},ms)).status,'conflito');
  });
  await t.test('paginação, período e resultados próprios sem histórico completo',async()=>{
    const x=await captura();
    const filtros={acao:'listar',inicio:data,fim:data,estado:'todos',limite:2};
    const a=await req(filtros);assert.equal(a.itens.length,2);assert.ok(a.cursor);
    const b=await req({...filtros,cursor:a.cursor});assert.ok(b.itens.every(x=>!a.itens.some(y=>y.id===x.id)));
    const propria=await req(filtros,x.uid);assert.equal(propria.itens.length,1);assert.equal(propria.itens[0].uid,x.uid);
    assert.equal((await req({...filtros,inicio:'2026-10-21',fim:'2026-10-22'})).itens.length,0);
    await assert.rejects(req({...filtros,limite:100}),{code:'invalid-argument'});
  });
  await t.test('saída administrativa usa domínio existente e não recalcula outra jornada',async()=>{
    const x=await captura('SAIDA');
    await db.doc(raiz+'dias/'+x.id).set({entrada:'08:00',funcionarioId:x.fid,dataKey:data});
    await db.doc(raiz+'dias/intocavel').set({totalMin:123});
    await req(await pedido(x,'aprovada',{horaRevisada:'17:00'}));const dia=(await db.doc(raiz+'dias/'+x.id).get()).data();
    assert.equal(dia.encerrado,true);assert.equal(dia.totalMin,480);assert.equal((await db.doc(raiz+'dias/intocavel').get()).data().totalMin,123);
  });
});
