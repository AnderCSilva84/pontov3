const test=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
test('consultas de preços respeitam compartilhamento e preservam transição', {skip:!process.env.FIRESTORE_EMULATOR_HOST},async t=>{
  assert.match(process.env.GCLOUD_PROJECT,/^demo-/);
  const admin=require('../functions/node_modules/firebase-admin');
  const app=admin.initializeApp({projectId:'demo-consultas-'+Date.now()},'consultas-'+randomUUID()),raiz=app.firestore();
  const padrao=admin.initializeApp({projectId:app.options.projectId});
  const {comprasRelatorio}=require('../functions/compras.cjs');
  const {bancoDoGrupo}=require('../functions/grupos-contexto.cjs');
  const {consultarNoBolso}=require('../functions/no-bolso-consulta.cjs');
  const {estimarCompras}=require('../functions/compras-estimativa.cjs');
  t.after(()=>app.delete());
  t.after(()=>padrao.delete());
  async function fixture(){
    const grupoId='g_'+randomUUID(),titular='t_'+randomUUID(),membro='m_'+randomUUID(),db=bancoDoGrupo(raiz,grupoId);
    await raiz.doc('grupos/'+grupoId).set({ativo:true,assinaturasAtivas:true,titularUid:titular});
    for(const [uid,role]of [[titular,'admin'],[membro,'consulta']]){
      await raiz.doc('vinculosUsuarios/'+uid).set({ativo:true,grupoId});
      await db.doc('users/'+uid).set({ativo:true,role});
    }
    await db.doc('comprasListas/lista').set({status:'rascunho',titulo:'Fictícia'});
    const assinatura=raiz.doc('assinaturasGrupos/'+grupoId);
    const pagar=()=>assinatura.set({versao:1,verificado:true,provedor:'google_play',plano:'prata',estado:'ativo',inicioEm:Date.now()-10000,validoAte:Date.now()+600000});
    const consultar=(uid=membro,consulta='status')=>consultarNoBolso(raiz,{auth:{uid},data:{consulta,...(consulta==='produto'?{produtoId:'arroz'}:{})}});
    const estimar=(uid=membro)=>estimarCompras(db,{auth:{uid},data:{listaId:'lista'}});
    return{db,grupoId,titular,membro,assinatura,pagar,consultar,estimar};
  }
  await t.test('membro Free não consulta status/ranking/produto nem existência de lista',async()=>{
    const f=await fixture();
    for(const consulta of ['status','rankings','produto'])await assert.rejects(f.consultar(f.membro,consulta),{code:'failed-precondition'});
    await assert.rejects(f.estimar(),{code:'failed-precondition'});
    await assert.rejects(estimarCompras(f.db,{auth:{uid:f.membro},data:{listaId:'inexistente'}}),{code:'failed-precondition'});
  });
  await t.test('titular Free e membro pago mantêm consultas sem escrever dados',async()=>{
    const f=await fixture(),antes=(await f.db.doc('comprasListas/lista').get()).updateTime.toMillis();
    assert.equal((await f.consultar(f.titular)).allowed,true);assert.deepEqual((await f.estimar(f.titular)).referencias,{});
    await f.pagar();assert.equal((await f.consultar()).allowed,true);assert.deepEqual((await f.estimar()).referencias,{});
    assert.equal((await f.db.doc('comprasListas/lista').get()).updateTime.toMillis(),antes);
  });
  await t.test('suspensão e expiração interrompem consultas novas, sem apagar cadastro/histórico',async()=>{
    const f=await fixture();await f.pagar();
    await f.db.doc('users/'+f.membro).update({acessoCompartilhado:false});
    await assert.rejects(f.consultar(),{code:'failed-precondition'});await assert.rejects(f.estimar(),{code:'failed-precondition'});
    await f.db.doc('users/'+f.membro).update({acessoCompartilhado:true});await f.assinatura.update({validoAte:Date.now()-1});
    await assert.rejects(f.consultar(),{code:'failed-precondition'});await assert.rejects(f.estimar(),{code:'failed-precondition'});
    assert.equal((await f.db.doc('users/'+f.membro).get()).data().ativo,true);assert.equal((await f.db.doc('comprasListas/lista').get()).exists,true);
  });
  await t.test('grupo em transição não ganha bloqueio comercial',async()=>{
    const f=await fixture();await raiz.doc('grupos/'+f.grupoId).update({assinaturasAtivas:false});
    assert.equal((await f.consultar()).allowed,true);assert.deepEqual((await f.estimar()).referencias,{});
  });
  await t.test('relatório callable bloqueia Free/suspenso/expirado e preserva titular, pago e transição',async()=>{
    const f=await fixture();
    const consultar=uid=>comprasRelatorio.run({auth:{uid},data:{inicioMs:0,fimMs:1000}});
    await assert.rejects(consultar(f.membro),{code:'failed-precondition'});
    assert.deepEqual((await consultar(f.titular)).registros,[]);
    await f.pagar();assert.deepEqual((await consultar(f.membro)).registros,[]);
    await f.db.doc('users/'+f.membro).update({acessoCompartilhado:false});
    await assert.rejects(consultar(f.membro),{code:'failed-precondition'});
    await f.db.doc('users/'+f.membro).update({acessoCompartilhado:true});
    await f.assinatura.update({validoAte:Date.now()-1});
    await assert.rejects(consultar(f.membro),{code:'failed-precondition'});
    await raiz.doc('grupos/'+f.grupoId).update({assinaturasAtivas:false});
    assert.deepEqual((await consultar(f.membro)).registros,[]);
  });
  await t.test('suspensão durante leitura da estimativa impede devolver dados do grupo',async()=>{
    const f=await fixture();await f.pagar();
    const db=new Proxy(f.db,{get(base,k){
      if(k==='doc')return p=>{
        const ref=base.doc(p);if(p!=='comprasListas/lista')return ref;
        return new Proxy(ref,{get(r,chave){
          if(chave==='get')return async()=>{const s=await r.get();await f.db.doc('users/'+f.membro).update({acessoCompartilhado:false});return s;};
          const v=r[chave];return typeof v==='function'?v.bind(r):v;
        }});
      };
      return base[k];
    }});
    await assert.rejects(estimarCompras(db,{auth:{uid:f.membro},data:{listaId:'lista'}}),{code:'failed-precondition'});
  });
  await t.test('suspensão durante consulta No Bolso impede retorno de ranking',async()=>{
    const f=await fixture();await f.pagar();
    const envolver=q=>new Proxy(q,{get(base,k){
      if(['where','orderBy','limit'].includes(k))return(...a)=>envolver(base[k](...a));
      if(k==='get')return async()=>{const s=await base.get();await f.db.doc('users/'+f.membro).update({acessoCompartilhado:false});return s;};
      const v=base[k];return typeof v==='function'?v.bind(base):v;
    }});
    const banco=new Proxy(raiz,{get(base,k){
      if(k==='collection')return p=>p===`grupos/${f.grupoId}/comprasPrecos`?envolver(base.collection(p)):base.collection(p);
      const v=base[k];return typeof v==='function'?v.bind(base):v;
    }});
    await assert.rejects(consultarNoBolso(banco,{auth:{uid:f.membro},data:{consulta:'rankings'}}),{code:'failed-precondition'});
  });
});
