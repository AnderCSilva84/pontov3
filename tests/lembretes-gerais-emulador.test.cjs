const test=require('node:test'),assert=require('node:assert/strict');
test('lembretes gerais: qualquer perfil ativo, autoria, isolamento, envio e conclusão idempotentes',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async t=>{
 assert.match(process.env.GCLOUD_PROJECT,/^demo-/);
 const admin=require('../functions/node_modules/firebase-admin');const app=admin.initializeApp({projectId:process.env.GCLOUD_PROJECT+'-gerais'},'gerais');t.after(()=>app.delete());
 const {bancoDoGrupo,bancoDoUsuario}=require('../functions/grupos-contexto.cjs'),{operarLembretes,processarLembretes}=require('../functions/lembretes.cjs'),{montarMensagem,permiteEnvio}=require('../functions/push-contrato.cjs');
 const root=app.firestore(),db=bancoDoGrupo(root,'a'),other=bancoDoGrupo(root,'b');
 for(const [u,role]of [['anderson','admin'],['aline','admin'],['func','funcionario'],['consulta','consulta'],['inativo','admin']])await db.doc('users/'+u).set({role,ativo:u!=='inativo',nome:u});
 await root.doc('grupos/a').set({ativo:true});await root.doc('grupos/b').set({ativo:true});await root.doc('vinculosUsuarios/anderson').set({ativo:true,grupoId:'a'});await other.doc('users/fora').set({ativo:true,role:'admin',nome:'Fora'});
 const inicio=Date.parse('2026-11-04T11:59:00Z'),vencimento=Date.parse('2026-11-04T12:00:00Z');
 const base={id:'um',usuarioId:'aline',titulo:'Aviso fictício',observacao:'Lembrete geral',dataInicio:'2026-11-04',horario:'09:00',repeticao:'uma_vez'};
 const op=(operacao,d={},uid='anderson',agora=inicio)=>operarLembretes(db,{auth:{uid},data:{...d,operacao}},agora);
 await t.test('qualquer perfil cria; autoria não pode ser forjada; retry não duplica',async()=>{
  for(const uid of ['anderson','func','consulta']){const d={...base,id:uid,criadaPor:'forjada'};const a=await op('geralSalvar',d,uid);await op('geralSalvar',d,uid,vencimento+1000);assert.equal((await db.doc('lembretes/'+a.id).get()).data().criadaPor,uid);}
  await assert.rejects(op('geralSalvar',{...base,id:'func',titulo:'Outro'},'func'),e=>e.code==='aborted');
  await assert.rejects(op('geralSalvar',{...base,id:'inativo'},'inativo'),e=>e.code==='permission-denied');
  await assert.rejects(op('geralSalvar',{...base,id:'fora',usuarioId:'fora'}),e=>e.code==='permission-denied');
  assert.equal((await op('geralPessoas')).pessoas.some(p=>p.id==='inativo'||p.id==='fora'),false);
 });
 await t.test('atribuídos e criados separados; outro grupo não recebe dados',async()=>{
  assert.equal((await op('geralListar',{visao:'recebidos'},'aline')).lembretes.length,3);
  assert.equal((await op('geralListar',{visao:'recebidos'},'anderson')).lembretes.length,0);
  assert.equal((await op('geralListar',{visao:'criados'},'func')).lembretes.length,1);
  assert.equal((await op('geralListar',{visao:'criados',usuarioId:'anderson'},'consulta')).lembretes[0].criadaPor,'consulta');
  const scoped=await bancoDoUsuario(root,'anderson');assert.equal(scoped.grupoId,'a');
  await assert.rejects(operarLembretes(other,{auth:{uid:'anderson'},data:{operacao:'geralListar',visao:'recebidos'}}),e=>e.code==='permission-denied');
 });
 await t.test('aviso chega somente ao destinatário, sem depender de flag de cuidados',async()=>{
  const envios=[];await processarLembretes(db,async(...args)=>{envios.push(args);return 1;},vencimento);
  assert.equal(envios.filter(e=>e[3].startsWith('lembrete-geral:')).length,3);assert.equal(envios.filter(e=>e[3].startsWith('aviso-evento:novo_')).length,3);assert.ok(envios.every(e=>e[4]==='aline'&&e[2]==='/avisos'));
  await processarLembretes(db,async()=>{throw Error('Não deveria repetir');},vencimento+1000);
  const m=montarMensagem({transporte:'fcm-android',uid:'aline',token:'ficticio'},{titulo:'Lembrete',mensagem:'Fictício',url:'/avisos',eventoId:'um',grupoId:'a',acao:{categoria:'tarefas'},agora:vencimento});
  assert.equal(m.data.rota,'/avisos');assert.equal(m.data.canal,'tarefas');assert.equal(m.data.tipo,undefined);assert.equal(m.notification,undefined);
  assert.equal(permiteEnvio({transporte:'fcm-android'},'/avisos'),true);assert.equal(permiteEnvio({transporte:'fcm-android'},'/lembretes?x=1'),false);
 });
 await t.test('somente destinatário conclui, inclusive admins; caminhos de cuidados não contornam autorização',async()=>{
  const d={id:'anderson',ocorrenciaId:`1_${vencimento}`};
  await assert.rejects(op('geralConcluir',d,'anderson',vencimento),e=>e.code==='permission-denied');
  await assert.rejects(op('concluir',d,'anderson',vencimento),e=>e.code==='permission-denied');
  await op('geralConcluir',d,'aline',vencimento);await op('geralConcluir',d,'aline',vencimento+1000);
  assert.equal((await db.doc('lembretes/anderson').get()).data().ultimaOcorrencia.status,'concluido');
  await db.doc('users/aline').update({lembretesHabilitados:true});
  await assert.rejects(op('salvar',{...base,id:'anderson',versao:1,tipo:'outro'},'anderson'),e=>e.code==='permission-denied');
 });
 await t.test('autor gerencia seus lembretes; conclusão não pode ser antecipada',async()=>{
  await op('geralSalvar',{...base,id:'futuro',dataInicio:'2026-11-05',repeticao:'diario'},'consulta');
  await assert.rejects(op('geralConcluir',{id:'futuro',ocorrenciaId:`1_${vencimento+86400000}`},'aline'),e=>e.code==='failed-precondition');
  await assert.rejects(op('geralPausar',{id:'futuro',versao:1,ativo:false},'aline'),e=>e.code==='permission-denied');
  await op('geralPausar',{id:'futuro',versao:1,ativo:false},'consulta');
  await assert.rejects(op('geralPausar',{id:'futuro',versao:1,ativo:true},'consulta'),e=>e.code==='aborted');
 });
 await t.test('novidades são por destinatário e leitura antiga não apaga uma chegada nova',async()=>{
  const antes=(await op('geralListar',{visao:'recebidos'},'aline')).marcador;
  await op('geralSalvar',{...base,id:'chegada-nova'},'func');
  await op('geralLidos',{marcador:antes},'aline');
  const estado=(await db.doc('lembretesEstado/aline').get()).data();assert.equal(estado.recebidos-estado.lidos,1);
  await op('geralLidos',{marcador:9999},'aline');assert.equal((await db.doc('lembretesEstado/aline').get()).data().lidos,estado.recebidos);
  assert.equal((await db.doc('lembretesEstado/anderson').get()).data()?.recebidos||0,0);
 });
 await t.test('adiar preserva a recorrência, não conclui e repete envio com identidade própria',async()=>{
  await op('geralSalvar',{...base,id:'adiar-diario',repeticao:'diario'},'anderson');
  const ocorrenciaId='1_'+vencimento,d={id:'adiar-diario',ocorrenciaId,minutos:15,operacaoId:'tentativa-adiar'};
  await assert.rejects(op('geralAdiar',d,'anderson',vencimento),e=>e.code==='permission-denied');
  const a=await op('geralAdiar',d,'aline',vencimento);await op('geralAdiar',d,'aline',vencimento+1000);
  assert.equal(a.ateMs,vencimento+15*60000);
  await assert.rejects(op('geralConcluir',{id:d.id,ocorrenciaId},'aline',vencimento+1000),e=>e.code==='failed-precondition');
  const envios=[];const {processarGeral}=require('../functions/lembretes-gerais.cjs');
  await processarGeral(db,db.doc('lembretes/'+d.id),async(...args)=>{envios.push(args);return 1;},a.ateMs);
  assert.equal(envios.length,1);assert.match(envios[0][3],/:adiado:/);
  assert.equal((await db.doc('lembretes/'+d.id).get()).data().proximoDisparoEm.toMillis(),vencimento+86400000);
  await op('geralConcluir',{id:d.id,ocorrenciaId},'aline',a.ateMs);await op('geralConcluir',{id:d.id,ocorrenciaId},'aline',a.ateMs+1000);
  assert.equal((await db.collection('avisosEnvios').where('tipo','==','concluido').get()).docs.filter(p=>p.id.includes('adiar-diario')).length,1);
 });
 await t.test('conclusão avisa somente o autor; fila é reservada e não repete após sucesso',async()=>{
  const {processarEnviosGerais}=require('../functions/lembretes-gerais.cjs'),envios=[];
  await Promise.all([processarEnviosGerais(db,async(...a)=>{envios.push(a);return 1;},vencimento+86400000),processarEnviosGerais(db,async(...a)=>{envios.push(a);return 1;},vencimento+86400000)]);
  const concluidos=envios.filter(a=>a[0]==='Lembrete concluído');assert.equal(concluidos.length,2);assert.equal((await db.doc('lembretesEstado/anderson').get()).data().conclusoes,2);assert.ok(concluidos.every(a=>a[4]==='anderson'));
  assert.equal(await processarEnviosGerais(db,async()=>{throw Error('Repetição');},vencimento+86400000),0);
 });

 await t.test('regras do indicador permitem somente leitura do próprio estado no grupo ativo',async()=>{
  const {initializeApp,deleteApp}=await import('firebase/app'),{getAuth,connectAuthEmulator,createUserWithEmailAndPassword}=await import('firebase/auth'),{getFirestore,connectFirestoreEmulator,doc,getDoc,setDoc,collection,getDocs,terminate}=await import('firebase/firestore');
  const client=initializeApp({projectId:process.env.GCLOUD_PROJECT,apiKey:'demo-key'},'badge-client'),auth=getAuth(client),store=getFirestore(client);
  connectAuthEmulator(auth,'http://'+process.env.FIREBASE_AUTH_EMULATOR_HOST,{disableWarnings:true});const [host,port]=process.env.FIRESTORE_EMULATOR_HOST.split(':');connectFirestoreEmulator(store,host,Number(port));
  const rulesApp=admin.initializeApp({projectId:process.env.GCLOUD_PROJECT},'badge-rules'),rulesDb=rulesApp.firestore();
  try{const uid=(await createUserWithEmailAndPassword(auth,'badge@example.test','Senha-ficticia-123!')).user.uid;
   await rulesDb.doc('grupos/badge').set({ativo:true});await rulesDb.doc('vinculosUsuarios/'+uid).set({ativo:true,grupoId:'badge'});await rulesDb.doc('grupos/badge/users/'+uid).set({ativo:true,role:'admin'});await rulesDb.doc('grupos/badge/lembretesEstado/'+uid).set({recebidos:1,lidos:0});
   assert.equal((await getDoc(doc(store,'grupos/badge/lembretesEstado/'+uid))).data().recebidos,1);
   for(const action of [()=>getDoc(doc(store,'grupos/badge/lembretesEstado/aline')),()=>setDoc(doc(store,'grupos/badge/lembretesEstado/'+uid),{recebidos:999}),()=>getDocs(collection(store,'grupos/badge/lembretesEstado')),()=>getDoc(doc(store,'grupos/b/lembretesEstado/anderson'))])await assert.rejects(action(),e=>e.code==='permission-denied');
   await rulesDb.doc('vinculosUsuarios/'+uid).update({ativo:false});await assert.rejects(getDoc(doc(store,'grupos/badge/lembretesEstado/'+uid)),e=>e.code==='permission-denied');
  }finally{await terminate(store);await deleteApp(client);await rulesApp.delete();}
 });

 await t.test('falha de envio concorrente não desfaz conclusão já confirmada',async()=>{
  await op('geralSalvar',{...base,id:'corrida-falha'},'func');const ocorrenciaId='1_'+vencimento;
  await require('../functions/lembretes-gerais.cjs').processarGeral(db,db.doc('lembretes/corrida-falha'),async()=>{await op('geralConcluir',{id:'corrida-falha',ocorrenciaId},'aline',vencimento);throw Error('Falha após confirmação');},vencimento);
  assert.equal((await db.doc('lembretes/corrida-falha/ocorrencias/'+ocorrenciaId).get()).data().status,'concluido');
  await op('geralConcluir',{id:'corrida-falha',ocorrenciaId},'aline',vencimento+1000);
  assert.equal((await db.doc('lembretesEstado/func').get()).data().conclusoes,1);
 });

 await t.test('autor e destinatário arquivam, excluem e restauram somente a própria lista',async()=>{
  const d={...base,id:'organizacao-fluxo',titulo:'Organização fictícia',repeticao:'diario'};await op('geralSalvar',d);
  await db.doc('users/terceiro').set({role:'admin',ativo:true});
  await assert.rejects(op('geralOrganizar',{id:d.id,pasta:'excluido',uid:'aline'},'terceiro'),e=>e.code==='permission-denied');
  await assert.rejects(op('geralOrganizar',{id:d.id,pasta:'invalida'}),e=>e.code==='invalid-argument');
  await op('geralOrganizar',{id:d.id,pasta:'arquivado'});
  assert.equal((await op('geralListar',{visao:'criados'})).lembretes.some(l=>l.id===d.id),false);
  assert.equal((await op('geralListar',{visao:'criados',pasta:'arquivado'})).lembretes.some(l=>l.id===d.id),true);
  assert.equal((await op('geralListar',{visao:'recebidos'},'aline')).lembretes.some(l=>l.id===d.id),true);
  const evento=db.doc('avisosEnvios/novo_'+d.id);await evento.update({lembreteId:admin.firestore.FieldValue.delete()});
  const envios=[];const {processarEnviosGerais,processarGeral}=require('../functions/lembretes-gerais.cjs');
  await processarEnviosGerais(db,async(...a)=>{envios.push(a);return 1;},vencimento);
  assert.equal(envios.filter(a=>a[3]==='aviso-evento:novo_'+d.id&&a[4]==='aline').length,1);
  await op('geralOrganizar',{id:d.id,pasta:'arquivado'},'aline');
  await assert.rejects(op('geralConcluir',{id:d.id,ocorrenciaId:'1_'+vencimento},'aline',vencimento),e=>e.code==='failed-precondition');
  await processarGeral(db,db.doc('lembretes/'+d.id),async()=>{throw Error('Não pode notificar arquivado');},vencimento);
  const salvo=(await db.doc('lembretes/'+d.id).get()).data();assert.equal(salvo.ativo,true);assert.equal(salvo.versao,1);assert.equal(salvo.ultimaOcorrencia.status,'silenciado');
  assert.equal(salvo.proximoDisparoEm.toMillis(),vencimento+86400000);
  await op('geralOrganizar',{id:d.id,pasta:'entrada'},'aline');
  await op('geralConcluir',{id:d.id,ocorrenciaId:'1_'+vencimento},'aline',vencimento+1000);
  await processarEnviosGerais(db,async(...a)=>{assert.notEqual(a[1],'aline concluiu: '+d.titulo);return 1;},vencimento+2000);
  assert.equal((await db.doc('avisosEnvios/concluido_'+d.id+'_1_'+vencimento).get()).data().silenciado,true);
  await op('geralOrganizar',{id:d.id,pasta:'entrada'});
  await op('geralOrganizar',{id:d.id,pasta:'excluido'},'aline');
  assert.equal((await op('geralListar',{visao:'recebidos'},'aline')).lembretes.some(l=>l.id===d.id),false);
  assert.equal((await op('geralListar',{visao:'recebidos',pasta:'excluido'},'aline')).lembretes.some(l=>l.id===d.id),true);
  const autor=(await op('geralListar',{visao:'criados'})).lembretes.find(l=>l.id===d.id);assert.equal(autor.pasta,'entrada');assert.equal(autor.ultimaOcorrencia.status,'concluido');assert.equal(autor.organizacao,undefined);
  const revisao=(await db.doc('lembretesEstado/aline').get()).data().organizacao;
  await op('geralOrganizar',{id:d.id,pasta:'excluido'},'aline');assert.equal((await db.doc('lembretesEstado/aline').get()).data().organizacao,revisao);
  await op('geralOrganizar',{id:d.id,pasta:'entrada'},'aline');assert.equal((await db.doc('lembretes/'+d.id).get()).data().ultimaOcorrencia.status,'concluido');
 });
 await t.test('lixeira silencia aviso inicial e paginação não perde itens após páginas filtradas',async()=>{
  const d={...base,id:'silenciar-inicial'};await op('geralSalvar',d);await op('geralOrganizar',{id:d.id,pasta:'excluido'},'aline');
  await require('../functions/lembretes-gerais.cjs').processarEnviosGerais(db,async(...a)=>{assert.notEqual(a[3],'aviso-evento:novo_'+d.id);return 1;},vencimento);
  assert.equal((await db.doc('avisosEnvios/novo_'+d.id).get()).data().silenciado,true);
  const pag=bancoDoGrupo(root,'pagina'),batch=root.batch();batch.set(root.doc('grupos/pagina'),{ativo:true});batch.set(pag.doc('users/aline'),{role:'admin',ativo:true});
  for(let n=0;n<31;n++)batch.set(pag.doc('lembretes/'+String(n).padStart(3,'0')),{dominio:'geral',titulo:'Fictício',usuarioId:'aline',criadaPor:'autor',ativo:true,versao:1,organizacao:{aline:n<30?'excluido':'entrada'}});
  await batch.commit();const pedir=cursor=>operarLembretes(pag,{auth:{uid:'aline'},data:{operacao:'geralListar',visao:'recebidos',cursor}});
  const primeira=await pedir();assert.equal(primeira.lembretes.length,0);assert.equal(primeira.cursor,'029');const segunda=await pedir(primeira.cursor);assert.equal(segunda.lembretes[0].id,'030');assert.equal(segunda.cursor,null);
 });

});
