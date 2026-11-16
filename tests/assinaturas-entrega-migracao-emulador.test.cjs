const test = require('node:test'), assert = require('node:assert/strict'), {randomUUID} = require('node:crypto');
test('entrega Play de teste e inventário de migração', {skip:!process.env.FIRESTORE_EMULATOR_HOST}, async t => {
  assert.match(process.env.GCLOUD_PROJECT,/^demo-/);
  const admin = require('../functions/node_modules/firebase-admin');
  const app=admin.initializeApp({projectId:'demo-entrega-'+Date.now()},'entrega-'+randomUUID()), db=app.firestore();
  const {processarCompraPlayTeste,entregarCompraPlayTeste}=require('../functions/assinaturas-play-entrega.cjs');
  const {enfileirarEntregaPlay,reconciliarCompraPlayTeste}=require('../functions/assinaturas-play-reconciliacao.cjs');
  const {inventariarAssinaturas}=require('../functions/assinaturas-migracao.cjs');
  const {contaPlay,hash}=require('../functions/assinaturas-play.cjs');
  t.after(()=>app.delete());
  async function fixture() {
    const uid='u_'+randomUUID(),grupoId='g_'+uid,token='teste_'+randomUUID(),compraId='google_play_'+hash(token),agora=Date.now();
    await db.doc('grupos/'+grupoId).set({ativo:true,titularUid:uid,assinaturasAtivas:true});
    await db.doc('vinculosUsuarios/'+uid).set({ativo:true,grupoId});
    await db.doc(`grupos/${grupoId}/users/${uid}`).set({role:'admin',ativo:true});
    await db.doc('assinaturasConfiguracao/google_play').set({homologacaoAtiva:true,entregaTesteAtiva:true,direitosHomologados:true,reconhecimentoTesteAtivo:true,gruposPermitidos:[grupoId]});
    let ack=false,posts=0;
    const resposta=()=>({kind:'androidpublisher#subscriptionPurchaseV2',startTime:new Date(agora-10000).toISOString(),testPurchase:{},
      acknowledgementState:ack?'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED':'ACKNOWLEDGEMENT_STATE_PENDING',subscriptionState:'SUBSCRIPTION_STATE_ACTIVE',
      externalAccountIdentifiers:{obfuscatedExternalAccountId:contaPlay(uid,grupoId)},
      lineItems:[{productId:'ta_no_ponto_ouro',expiryTime:new Date(agora+600000).toISOString(),offerDetails:{basePlanId:'mensal'},autoRenewingPlan:{autoRenewEnabled:true}}]});
    const opcoes={relogio:()=>agora,cliente:{consultar:async()=>resposta(),reconhecer:async()=>{posts++;ack=true;}}};
    const request={auth:{uid},data:{token}}, caminho=`assinaturasGrupos/${grupoId}`;
    return {uid,grupoId,token,compraId,agora,opcoes,request,caminho,resposta,posts:()=>posts};
  }
  await t.test('verifica, entrega atomicamente, reconhece e repete sem duplicar ou renovar direito',async()=>{
    const f=await fixture();
    assert.equal((await processarCompraPlayTeste(db,f.request,f.opcoes)).direitosConcedidos,true);
    const direito=(await db.doc(f.caminho).get()).data(); assert.equal(direito.plano,'ouro');assert.equal(direito.teste,true);
    assert.equal(f.posts(),0); // ACK apenas depois da entrega durável.
    await enfileirarEntregaPlay(db,f.compraId,f.opcoes);assert.equal(f.posts(),1);
    assert.equal((await entregarCompraPlayTeste(db,f.compraId,f.opcoes)).repetida,true);
    await reconciliarCompraPlayTeste(db,f.compraId,f.opcoes);assert.equal(f.posts(),1);
    assert.equal((await db.doc(f.caminho).get()).data().validoAte,direito.validoAte);
    assert.equal((await db.doc('assinaturasEntregas/'+f.compraId).get()).data().confirmada,true);
    await db.doc(f.caminho).update({estado:'expirado',validoAte:f.agora-1});
    assert.equal((await entregarCompraPlayTeste(db,f.compraId,f.opcoes)).direitosConcedidos,false);
    assert.equal((await db.doc(f.caminho).get()).data().estado,'expirado');
  });
  await t.test('pendente, real e outro canal não recebem direito nem ACK',async()=>{
    for (const tipo of ['pendente','real','canal']) {
      const f=await fixture(),resposta=f.resposta();
      if(tipo==='pendente')resposta.subscriptionState='SUBSCRIPTION_STATE_PENDING';
      if(tipo==='real')delete resposta.testPurchase;
      if(tipo==='canal')await db.doc(f.caminho).set({provedor:'mercado_pago',compraId:'outra'});
      f.opcoes.cliente.consultar=async()=>resposta;
      await assert.rejects(processarCompraPlayTeste(db,f.request,f.opcoes),{code:'failed-precondition'});
      assert.equal((await db.doc('assinaturasEntregas/'+f.compraId).get()).exists,false);assert.equal(f.posts(),0);
      assert.equal((await db.doc(f.caminho).get()).exists,tipo==='canal');
    }
  });
  await t.test('desligamento, transferência e lease vencido durante API impedem entrega',async()=>{
    for(const caso of ['config','titular','lease']) {
      const f=await fixture();let consultas=0;
      f.opcoes.cliente.consultar=async()=>{
        if(++consultas===2) {
          if(caso==='config')await db.doc('assinaturasConfiguracao/google_play').update({entregaTesteAtiva:false});
          if(caso==='titular')await db.doc('grupos/'+f.grupoId).update({titularUid:'outro'});
          if(caso==='lease')await db.doc('assinaturasCompras/'+f.compraId).update({reconciliacaoLease:{rodada:'outra',ate:f.agora+90000}});
        }return f.resposta();
      };
      await assert.rejects(processarCompraPlayTeste(db,f.request,f.opcoes));
      assert.equal((await db.doc(f.caminho).get()).exists,false);
      if(caso==='lease')assert.equal((await db.doc('assinaturasCompras/'+f.compraId).get()).data().reconciliacaoLease.rodada,'outra');
    }
  });
  await t.test('compra concorrente do mesmo grupo não substitui a primeira entrega',async()=>{
    const f=await fixture();
    const outro={...f.request,data:{token:'outra_compra_'+randomUUID()}};
    const resultados=await Promise.allSettled([processarCompraPlayTeste(db,f.request,f.opcoes),processarCompraPlayTeste(db,outro,f.opcoes)]);
    assert.equal(resultados.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(resultados.filter(r=>r.status==='rejected'&&r.reason.code==='failed-precondition').length,1);
    const id=(await db.doc(f.caminho).get()).data().compraId;
    assert.ok([f.compraId,'google_play_'+hash(outro.data.token)].includes(id));
    assert.equal((await db.doc('assinaturasEntregas/'+id).get()).data().confirmada,true);
  });
  await t.test('inventário usa cotas reais, preserva dados e detecta mudança posterior',async()=>{
    const f=await fixture();await db.doc('grupos/'+f.grupoId).update({assinaturasAtivas:false});
    for(let i=0;i<3;i++)await db.doc(`grupos/${f.grupoId}/funcionarios/f${i}`).set({nome:'Fictício',ativo:true,locaisPermitidos:['casa']});
    await db.doc(`grupos/${f.grupoId}/dias/f0_dia`).set({funcionarioId:'f0',entrada:'08:00'});
    await db.doc(`grupos/${f.grupoId}/tarefas/t1`).set({concluida:false});
    await db.doc(`grupos/${f.grupoId}/tarefasSemanais/t2`).set({ativa:true});
    const a=await inventariarAssinaturas(db,f.grupoId,f.agora),b=await inventariarAssinaturas(db,f.grupoId,f.agora);
    assert.deepEqual(a,b);assert.equal(a.uso.funcionarios,3);assert.equal(a.excedentes.funcionarios,1);assert.equal(a.uso.tarefas,2);
    assert.equal(a.jornadasAbertas,1);assert.equal(a.ativacaoDisponivel,false);assert.deepEqual(a.bloqueios,[]);
    assert.equal((await db.doc('grupos/'+f.grupoId).get()).data().assinaturasAtivas,false);
    await db.doc(`grupos/${f.grupoId}/users/outro`).set({role:'admin',ativo:true});
    const c=await inventariarAssinaturas(db,f.grupoId,f.agora);assert.notEqual(c.assinaturaInventario,a.assinaturaInventario);
    assert.ok(c.bloqueios.includes('revisar_administrador_unico'));assert.ok(c.bloqueios.includes('vinculo_inconsistente'));
    await assert.rejects(inventariarAssinaturas(db,'inexistente'));
  });
});
