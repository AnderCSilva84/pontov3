const test = require('node:test'), assert = require('node:assert/strict'), { randomUUID } = require('node:crypto');
test('terminal Free: seleção, autoria, concorrência, continuidade e titularidade', { skip: !process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST }, async t => {
  assert.match(process.env.GCLOUD_PROJECT, /^demo-/); process.env.FIREBASE_CONFIG = JSON.stringify({ projectId: process.env.GCLOUD_PROJECT });
  const admin = require('../functions/node_modules/firebase-admin'), api = require('../functions/index.js'), raiz = admin.firestore();
  const { bancoDoGrupo } = require('../functions/grupos-contexto.cjs'), { operarPontoTitular } = require('../functions/ponto-titular.cjs');
  const { cadastrarFuncionario } = require('../functions/funcionarios-cadastro.cjs'), { operarConta } = require('../functions/conta.cjs');
  const { partesOperacionais } = require('../functions/ponto-operacoes.cjs');
  t.after(() => admin.app().delete());
  async function fixture(quantidade = 2) {
    const uid = 'titular_' + randomUUID(), destino = 'destino_' + randomUUID(), grupoId = 'g_' + uid, db = bancoDoGrupo(raiz, grupoId);
    for (const id of [uid,destino]) await admin.auth().createUser({ uid:id, email:id+'@example.test', password:'Ficticia-123456' });
    await raiz.doc('grupos/' + grupoId).set({ ativo:true,titularUid:uid,assinaturasAtivas:true });
    for (const [id,role] of [[uid,'admin'],[destino,'consulta']]) {
      await raiz.doc('vinculosUsuarios/' + id).set({ grupoId,ativo:true });
      await db.doc('users/' + id).set({ nome:'Pessoa fictícia',role,ativo:true });
    }
    for (let i=1;i<=quantidade;i++) await db.doc('funcionarios/f'+i).set({ nome:'Funcionário '+i,ativo:true,locaisPermitidos:['casa'],desconsiderarIntervalo:true,intervaloPrevistoMin:0 });
    await db.doc('locais/casa').set({ ativo:true,raioMetros:100,localizacao:{latitude:0,longitude:0} });
    const agora = Date.now(), dia = partesOperacionais(agora).dataKey;
    const op = (data, tempo = agora, ator = uid) => operarPontoTitular(raiz, { auth:{uid:ator}, data }, tempo);
    const selecionar = ids => op({acao:'selecionar',funcionarioIds:ids,operacaoId:randomUUID()});
    const payload = (fid='f1',tipo='ENTRADA',mais={}) => ({acao:'registrar',funcionarioId:fid,tipo,operacaoId:randomUUID(),latitude:0,longitude:0,confirmouFuncionario:true,dataEsperada:dia,...mais});
    const conta = (data, ator=uid) => operarConta(raiz,admin.auth(),{auth:{uid:ator,token:{auth_time:Math.floor(Date.now()/1000)}},data});
    return {uid,destino,grupoId,db,agora,dia,op,selecionar,payload,conta};
  }
  await t.test('seleção é explícita e limitada a dois, mesmo com excesso herdado', async () => {
    const f=await fixture(3), antes=await f.op({acao:'consultar'});
    assert.equal(antes.selecaoConfirmada,false); assert.equal(antes.funcionarios.length,3);
    const recusada=await f.op(f.payload()); assert.equal(recusada.status,'rejeitada');
    assert.equal((await f.db.collection('dias').get()).size,0);
    await assert.rejects(f.selecionar(['f1','f2','f3']),{code:'invalid-argument'});
    await assert.rejects(f.selecionar(['f1','f1']),{code:'invalid-argument'});
    await assert.rejects(f.selecionar(['externo']),{code:'failed-precondition'});
    await f.selecionar(['f1','f2']); assert.equal((await f.op(f.payload('f3'))).status,'rejeitada');
    assert.deepEqual((await f.op({acao:'consultar'})).funcionarioIds,['f1','f2']);
  });
  await t.test('registro concorrente é único e identifica titular e funcionário sem login individual', async () => {
    const f=await fixture(); await f.selecionar(['f1','f2']); const p=f.payload();
    const rs=await Promise.all([f.op(p),f.op(p)]); assert.deepEqual(rs[0],rs[1]); assert.equal(rs[0].status,'confirmado');
    const registros=await f.db.collection('registros').get(); assert.equal(registros.size,1);
    assert.equal(registros.docs[0].data().registradoPor,f.uid); assert.equal(registros.docs[0].data().funcionarioId,'f1');
    assert.equal(registros.docs[0].data().autoria.titularUid,f.uid);
    assert.equal((await f.db.doc('users/f1').get()).exists,false);
    await assert.rejects(f.op({...p,tipo:'SAIDA'}),{code:'already-exists'});
    await assert.rejects(f.op(f.payload(),f.agora,f.destino),{code:'permission-denied'});
    await assert.rejects(f.op({...f.payload(),uid:f.uid}),{code:'invalid-argument'});
  });
  await t.test('localização, confirmação e dia não são contornáveis; recusa é estável', async () => {
    const f=await fixture(); await f.selecionar(['f1']);
    const p=f.payload('f1','ENTRADA',{latitude:20});
    assert.equal((await f.op(p)).status,'rejeitada'); assert.deepEqual(await f.op(p),await f.op(p));
    await assert.rejects(f.op({...f.payload(),confirmouFuncionario:false}),{code:'invalid-argument'});
    const antes=f.payload('f1','ENTRADA',{dataEsperada:'2000-01-01'}); assert.equal((await f.op(antes)).status,'rejeitada');
    assert.equal((await f.db.collection('dias').get()).size,0);
    const valida=f.payload(); const resultado=await f.op(valida);
    assert.deepEqual(await f.op(valida,f.agora+86400000),resultado); // Repetição em outro dia não inventa horário.
  });
  await t.test('retirada da seleção não bloqueia saída de jornada aberta nem libera nova entrada', async () => {
    const f=await fixture(3); await f.selecionar(['f1','f2']); await f.op(f.payload());
    await f.selecionar(['f2','f3']);
    assert.equal((await f.op(f.payload('f1','SAIDA'),f.agora+60000)).status,'confirmado');
    assert.equal((await f.op(f.payload('f1','ENTRADA'),f.agora+120000)).status,'rejeitada');
    assert.equal((await f.db.collection('registros').get()).size,2);
  });
  await t.test('arquivamento no servidor impede jornada aberta e o cadastro Free não cria login', async () => {
    const f=await fixture(1);
    const cadastrar=(operacao,id,nome)=>cadastrarFuncionario(raiz,{auth:{uid:f.uid},data:{operacao,id,...(nome?{nome}:{})}});
    await cadastrar('criar','f2','Segundo sem login'); assert.equal((await f.db.doc('funcionarios/f2').get()).data().nome,'Segundo sem login');
    await assert.rejects(cadastrar('criar','f3','Excesso'),{code:'resource-exhausted'});
    await f.selecionar(['f1','f2']); await f.op(f.payload());
    await assert.rejects(cadastrar('arquivar','f1'),{code:'failed-precondition'});
    await f.op(f.payload('f1','SAIDA'),f.agora+60000); await cadastrar('arquivar','f1');
    assert.equal((await f.db.doc('funcionarios/f1').get()).data().ativo,false);
    assert.ok((await f.db.doc('dias/f1_'+f.dia).get()).data().saida);
    await cadastrar('reativar','f1'); assert.equal((await f.db.doc('funcionarios/f1').get()).data().ativo,true);
  });
  await t.test('transferência Free mantém um administrador, exige nova seleção e preserva recibo do titular anterior', async () => {
    const f=await fixture(); await f.selecionar(['f1','f2']); const p=f.payload(); await f.op(p);
    const zero={onlineIncerto:0,offlineNaoEnviado:0,recebidas:0,conflitos:0,confirmadas:0};
    await f.conta({acao:'solicitar',confirmacao:true,pendencias:zero});
    assert.ok((await f.conta({acao:'administradores'})).administradores.some(p=>p.uid===f.destino));
    const dados={acao:'transferir',confirmacao:true,destinatario:f.destino};
    assert.equal((await f.conta(dados)).transferida,true); assert.equal((await f.conta(dados)).repetida,true);
    assert.equal((await f.db.doc('users/'+f.uid).get()).data().role,'consulta');
    assert.equal((await f.db.doc('users/'+f.destino).get()).data().role,'admin');
    assert.equal((await raiz.doc('pontoTitularConfiguracao/'+f.grupoId).get()).exists,false);
    const novo=await f.op({acao:'consultar'},f.agora,f.destino); assert.equal(novo.selecaoConfirmada,false);
    assert.equal((await f.op({acao:'reconciliar',operacaoId:p.operacaoId})).status,'confirmado');
    assert.equal((await f.op({acao:'reconciliar',operacaoId:randomUUID()})).status,'nao_aplicada');
    assert.equal((await f.op(f.payload('f1','SAIDA'),f.agora+60000,f.destino)).status,'confirmado');
    await assert.rejects(f.op(f.payload('f2')),{code:'permission-denied'});
  });
  await t.test('mudança da assinatura exige nova confirmação da seleção Free', async () => {
    const f=await fixture(); await f.selecionar(['f1']);
    assert.equal((await f.op({acao:'consultar'})).selecaoConfirmada,true);
    await raiz.doc('assinaturasGrupos/'+f.grupoId).set({versao:1,verificado:true,provedor:'google_play',plano:'prata',estado:'expirado',inicioEm:f.agora-600000,validoAte:f.agora-1000});
    assert.equal((await f.op({acao:'consultar'})).selecaoConfirmada,false);
    assert.equal((await f.op(f.payload())).status,'rejeitada');
    await f.selecionar(['f1']); assert.equal((await f.op(f.payload())).status,'confirmado');
  });
  await t.test('cobrança paga exige assistência e não muda assinatura nem titular', async () => {
    const f=await fixture(); const pago={versao:1,verificado:true,provedor:'google_play',plano:'prata',estado:'ativo',inicioEm:Date.now()-10000,validoAte:Date.now()+600000,renovacaoAutomatica:true};
    await raiz.doc('assinaturasGrupos/'+f.grupoId).set(pago);
    await f.conta({acao:'solicitar',confirmacao:true,pendencias:{onlineIncerto:0,offlineNaoEnviado:0,recebidas:0,conflitos:0,confirmadas:0}});
    assert.equal((await f.conta({acao:'administradores'})).assistida,true);
    await assert.rejects(f.conta({acao:'transferir',confirmacao:true,destinatario:f.destino}),{code:'failed-precondition'});
    assert.equal((await raiz.doc('grupos/'+f.grupoId).get()).data().titularUid,f.uid);
    assert.deepEqual((await raiz.doc('assinaturasGrupos/'+f.grupoId).get()).data(),pago);
    assert.equal((await f.op({acao:'consultar'})).habilitado,false);
  });
  await t.test('destinatário em jornada ou em exclusão não recebe titularidade automaticamente', async () => {
    const f=await fixture(); await f.db.doc('users/'+f.destino).update({role:'funcionario',funcionarioId:'f1'});
    await f.db.doc('dias/f1_'+f.dia).set({funcionarioId:'f1',dataKey:f.dia,entrada:'08:00'});
    await f.conta({acao:'solicitar',confirmacao:true,pendencias:{onlineIncerto:0,offlineNaoEnviado:0,recebidas:0,conflitos:0,confirmadas:0}});
    const transferir=()=>f.conta({acao:'transferir',confirmacao:true,destinatario:f.destino});
    await assert.rejects(transferir(),{code:'failed-precondition'});
    await f.db.doc('dias/f1_'+f.dia).update({saida:'09:00'});
    await raiz.doc('contaSolicitacoes/'+f.destino).set({status:'aguardando_analise'});
    await assert.rejects(transferir(),{code:'failed-precondition'});
  });
});
