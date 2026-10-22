const test=require('node:test'),assert=require('node:assert/strict');
test('pratos: autoria, programação, fotos, permissões e isolamento entre grupos',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async t=>{
 assert.ok(process.env.GCLOUD_PROJECT?.startsWith('demo-'));
 process.env.GCLOUD_PROJECT+='-pratos';process.env.FIREBASE_CONFIG=JSON.stringify({projectId:process.env.GCLOUD_PROJECT});
 const admin=require('../functions/node_modules/firebase-admin'),api=require('../functions/index.js'),db=admin.firestore();t.after(()=>admin.app().delete());
 for(const [g,adm,f,colega]of[['a','adm-a','func-a','colega-a'],['b','adm-b','func-b','colega-b']]){
  await db.doc('grupos/'+g).set({ativo:true,titularUid:adm});
  for(const [uid,role]of[[adm,'admin'],[f,'funcionario'],[colega,'funcionario']]){await db.doc('vinculosUsuarios/'+uid).set({grupoId:g,ativo:true});await db.doc(`grupos/${g}/users/${uid}`).set({role,ativo:true,nome:uid,babaCuidadora:false});}
 }
 const op=(uid,operacao,d={})=>api.lembretesOperacao.run({auth:{uid},data:{operacao,...d}});
 const base={titulo:'Prato fictício',usuarioId:'func-a',modo:'data',data:'2026-10-22',receita:'Preparação de teste',linkReceita:'https://example.test/receita',foto:'data:image/jpeg;base64,AA==',criadaPorNome:'Forjado'};
 const {id}=await op('adm-a','salvarPrato',base);
 let gravado=(await db.doc(`grupos/a/pratosDia/${id}`).get()).data();assert.equal(gravado.criadaPorNome,'adm-a');assert.equal(gravado.versao,1);
 assert.equal((await db.doc('pratosDia/'+id).get()).exists,false);
 assert.equal((await op('func-a','listarPratos',{dia:'2026-10-22'})).pratos.length,1);
 assert.equal((await op('func-a','listarPratos',{dia:'2026-10-23'})).pratos.length,0);
 assert.equal((await op('colega-a','listarPratos')).pratos.length,0);
 assert.equal((await op('adm-a','listarPratos')).pratos[0].temFoto,true);
 assert.equal((await op('adm-a','listarPratos')).pratos[0].foto,undefined);
 assert.equal((await op('func-a','obterPrato',{id})).foto,base.foto);
 await assert.rejects(op('colega-a','obterPrato',{id}),/outra/);
 await assert.rejects(op('adm-b','obterPrato',{id,grupoId:'a'}),/encontrado/);
 await assert.rejects(op('func-a','salvarPrato',base),/administradores/);
 await assert.rejects(op('func-a','arquivarPrato',{id,versao:1}),/administradores/);
 await assert.rejects(op('adm-a','salvarPrato',{...base,id,versao:0}),/alterado/);
 await assert.rejects(op('adm-a','salvarPrato',{...base,usuarioId:'func-b'}),/ativa/);
 await op('adm-a','salvarPrato',{...base,id,versao:1,modo:'semanal',diasSemana:[4],foto:''});
 gravado=(await db.doc(`grupos/a/pratosDia/${id}`).get()).data();assert.equal(gravado.foto,'');assert.equal(gravado.versao,2);
 assert.equal((await op('func-a','listarPratos',{dia:'2026-10-29'})).pratos.length,1);
 await op('adm-a','arquivarPrato',{id,versao:2});assert.equal((await op('adm-a','listarPratos')).pratos.length,0);
});
