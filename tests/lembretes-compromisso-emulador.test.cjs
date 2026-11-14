const test=require('node:test'),assert=require('node:assert/strict');
test('consulta: salvar, listar e editar por cliente antigo preserva compromisso sem alterar aviso',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async t=>{
 assert.ok(process.env.GCLOUD_PROJECT?.startsWith('demo-'));
 const admin=require('../functions/node_modules/firebase-admin');const app=admin.initializeApp({projectId:process.env.GCLOUD_PROJECT},'compromisso-pdf');t.after(()=>app.delete());
 const {bancoDoGrupo}=require('../functions/grupos-contexto.cjs'),{operarLembretes}=require('../functions/lembretes.cjs');
 const a=bancoDoGrupo(app.firestore(),'pdf-compromisso-a'),b=bancoDoGrupo(app.firestore(),'pdf-compromisso-b');
 for(const db of [a,b]){await db.doc('users/adm').set({role:'admin',nome:'Administrador fictício',ativo:true,lembretesHabilitados:true});await db.doc('users/func').set({role:'funcionario',ativo:true,babaCuidadora:true});}
 const agora=Date.parse('2026-10-29T12:00Z'),base={titulo:'Consulta fictícia',tipo:'consulta',destinatarios:'usuario',usuarioId:'adm',destinatarioCuidado:'adulto',nomeCuidado:'Pessoa fictícia',horarios:['18:00'],dataInicio:'2026-10-29',dataCompromisso:'2026-11-06',horarioCompromisso:'13:30',repeticao:'uma_vez'};
 const op=(data,uid='adm',db=a)=>operarLembretes(db,{auth:{uid},data},agora);
 const id=(await op({...base,operacao:'salvar'})).id;
 let l=(await op({operacao:'listar',usuarioId:'adm'})).lembretes.find(x=>x.id===id);
 assert.equal(l.dataCompromisso,'2026-11-06');assert.equal(l.horarioCompromisso,'13:30');assert.equal(l.horario,'18:00');
 const antigo={...base,operacao:'salvar',id,versao:l.versao};delete antigo.dataCompromisso;delete antigo.horarioCompromisso;
 await op(antigo);l=(await op({operacao:'listar',usuarioId:'adm'})).lembretes.find(x=>x.id===id);
 assert.equal(l.horarioCompromisso,'13:30');assert.equal(l.dataCompromisso,'2026-11-06');assert.equal(l.horario,'18:00');
 await assert.rejects(op({...base,operacao:'salvar',id,versao:l.versao,horarioCompromisso:'25:00'}),/compromisso/);
 await assert.rejects(op({...base,operacao:'salvar'},'func'),/administrador/);
 assert.equal((await op({operacao:'listar',usuarioId:'adm'},'adm',b)).lembretes.length,0);
 await assert.rejects(op({...base,operacao:'salvar',id,versao:l.versao},'adm',b),/encontrado/);
 const armazenado=(await a.doc('lembretes/'+id).get()).data();assert.equal(armazenado.versao,l.versao);assert.equal(armazenado.proximoDisparoEm.toMillis(),Date.parse('2026-10-29T21:00Z'));
});
