const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('avatares: fotos somente de participantes de registros autorizados',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async t=>{
 assert.match(process.env.GCLOUD_PROJECT,/^demo-/);const admin=require('../functions/node_modules/firebase-admin'),app=admin.initializeApp({projectId:process.env.GCLOUD_PROJECT+'-avatares'},'avatares');t.after(()=>app.delete());
 const {bancoDoGrupo}=require('../functions/grupos-contexto.cjs'),{operarLembretes}=require('../functions/lembretes.cjs'),{operarFoto}=require('../functions/foto-perfil.cjs'),db=bancoDoGrupo(app.firestore(),'a'),outro=bancoDoGrupo(app.firestore(),'b');
 const bytes=fs.readFileSync('tests/fixtures/avatar-demo.jpg'),hora=Date.parse('2026-11-05T12:00Z');
 for(const uid of ['autor','destino','terceiro','semfoto','inativo']){await db.doc('users/'+uid).set({nome:uid,role:uid==='destino'?'funcionario':'admin',babaCuidadora:true,lembretesHabilitados:true,ativo:uid!=='inativo',temFotoPerfil:uid!=='semfoto',fotoPerfilVersao:1});if(uid!=='semfoto')await db.doc('fotosPerfis/'+uid).set({bytes,versao:1});}
 await app.firestore().doc('grupos/a').set({ativo:true});for(const uid of ['autor','destino','terceiro','semfoto','inativo'])await app.firestore().doc('vinculosUsuarios/'+uid).set({ativo:true,grupoId:'a'});
 await outro.doc('users/autor').set({nome:'Outro grupo',role:'admin',ativo:true,temFotoPerfil:true});await outro.doc('fotosPerfis/autor').set({bytes:Buffer.from('não deve vazar')});
 const op=(operacao,d={},uid='autor',b=db,agora=hora)=>operarLembretes(b,{auth:{uid},data:{operacao,...d}},agora);
 await op('geralSalvar',{id:'geral',usuarioId:'destino',titulo:'Teste fictício',dataInicio:'2026-11-05',horario:'09:00',repeticao:'uma_vez'},'autor',db,hora-3600000);
 await t.test('destinatário vê foto do autor pela interação sem ganhar leitura genérica de perfil',async()=>{
  const r=await op('geralListar',{visao:'recebidos',fotosInteracoes:true},'destino');assert.deepEqual(Object.keys(r.pessoasInteracoes).sort(),['autor','destino']);assert.equal(r.pessoasInteracoes.autor.fotoInteracao,'data:image/jpeg;base64,'+bytes.toString('base64'));assert.equal(r.pessoasInteracoes.terceiro,undefined);
  await assert.rejects(operarFoto(app.firestore(),{auth:{uid:'destino'},data:{acao:'fotoPerfilConsultar',usuarioId:'autor'}}),e=>e.code==='permission-denied');
  assert.equal((await op('geralListar',{visao:'recebidos'},'destino')).pessoasInteracoes,undefined);
 });
 await t.test('terceiro, outro grupo e conta inativa não recebem fotos por ids forjados',async()=>{
  const r=await op('geralListar',{visao:'criados',fotosInteracoes:true,usuarioId:'autor'},'terceiro');assert.equal(Object.keys(r.pessoasInteracoes).length,0);
  assert.equal(Object.keys((await op('geralListar',{visao:'criados',fotosInteracoes:true},'autor',outro)).pessoasInteracoes).length,0);
  await assert.rejects(op('geralListar',{visao:'recebidos',fotosInteracoes:true},'inativo'),e=>e.code==='permission-denied');
 });
 await t.test('conclusão sem feedback ainda tem identidade e foto; remoção/inativação usa iniciais',async()=>{
  await op('geralConcluir',{id:'geral',ocorrenciaId:'1_'+hora},'destino');let r=await op('geralListar',{visao:'criados',fotosInteracoes:true});assert.equal(r.lembretes[0].ultimaConclusao.concluidaPor,'destino');assert.ok(r.pessoasInteracoes.destino.fotoInteracao);
  await db.doc('fotosPerfis/destino').delete();await db.doc('users/destino').update({temFotoPerfil:false,fotoPerfilVersao:2});await db.doc('users/autor').update({ativo:false});
  r=await op('geralListar',{visao:'recebidos',fotosInteracoes:true},'destino');assert.equal(r.pessoasInteracoes.destino.fotoInteracao,null);assert.equal(r.pessoasInteracoes.autor.fotoInteracao,null);await db.doc('users/autor').update({ativo:true});
 });
 let cuidadoId;
 await t.test('cuidados retornam autor e quem concluiu, inclusive na abertura pela notificação',async()=>{
  cuidadoId=(await op('salvar',{titulo:'Cuidado fictício',tipo:'outro',destinatarios:'usuario',usuarioId:'destino',destinatarioCuidado:'adulto',nomeCuidado:'Pessoa fictícia',horarios:['09:00'],dataInicio:'2026-11-05',repeticao:'uma_vez'},'autor',db,hora-3600000)).id;
  await op('concluir',{id:cuidadoId,ocorrenciaId:'1_'+hora},'destino');const r=await op('listar',{visao:'cuidados',fotosInteracoes:true},'destino');const l=r.lembretes.find(l=>l.id===cuidadoId);assert.equal(l.ocorrencias[0].concluidaPor,'destino');assert.equal(l.ultimaConclusao.concluidaPorNome,'destino');assert.ok(r.pessoasInteracoes.autor.fotoInteracao);
  const n=await op('consultarOcorrencia',{id:cuidadoId,ocorrenciaId:'1_'+hora,fotosInteracoes:true},'destino');assert.equal(n.concluidaPor,'destino');assert.ok(n.pessoasInteracoes.autor.fotoInteracao);
  await db.doc('users/semfoto').update({role:'funcionario',babaCuidadora:true});await assert.rejects(op('consultarOcorrencia',{id:cuidadoId,ocorrenciaId:'1_'+hora,fotosInteracoes:true},'semfoto'),e=>e.code==='permission-denied');
 });
});
test('lote deduplica atores e não lê a coleção inteira de fotos',async()=>{
 const {fotosInteracoes}=require('../functions/fotos-interacoes.cjs'),leituras=[];
 const db={doc:path=>({path})},tx={getAll:async(...refs)=>refs.map(ref=>{leituras.push(ref.path);const uid=ref.path.split('/')[1];return{id:uid,exists:true,data:()=>ref.path.startsWith('users/')?{ativo:true,temFotoPerfil:uid==='a',nome:uid}:{bytes:Buffer.from('foto')},ref};})};
 const r=await fotosInteracoes(tx,db,['a','a','b',null,'todos']);assert.deepEqual(leituras,['users/a','users/b','fotosPerfis/a']);assert.equal(r.b.fotoInteracao,null);
});
