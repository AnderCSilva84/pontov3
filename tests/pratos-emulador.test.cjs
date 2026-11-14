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
 const hoje=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Fortaleza'}).format(new Date()),amanha=new Date(Date.parse(hoje+'T12:00Z')+86400000).toISOString().slice(0,10);
 const base={titulo:'Prato fictício',usuarioId:'func-a',modo:'data',data:hoje,receita:'Preparação de teste',linkReceita:'https://example.test/receita',foto:'data:image/jpeg;base64,AA==',criadaPorNome:'Forjado'};
 const {id}=await op('adm-a','salvarPrato',base);
 let gravado=(await db.doc(`grupos/a/pratosDia/${id}`).get()).data();assert.equal(gravado.criadaPorNome,'adm-a');assert.equal(gravado.versao,1);
 assert.equal((await db.doc('pratosDia/'+id).get()).exists,false);
 assert.equal((await op('func-a','listarPratos',{dia:hoje})).pratos.length,1);
 assert.equal((await op('func-a','listarPratos',{dia:amanha})).pratos.length,0);
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
 await op('adm-a','salvarPrato',{...base,id,versao:2,imagemUrl:'https://example.com/foto.jpg',foto:''});
 let listado=(await op('adm-a','listarPratos')).pratos.find(p=>p.id===id);assert.equal(listado.imagemUrl,'https://example.com/foto.jpg');assert.equal(listado.temFoto,false);
 await op('adm-a','salvarPrato',{...base,id,versao:3,linkReceita:'https://example.com/outra',foto:''});
 gravado=(await db.doc(`grupos/a/pratosDia/${id}`).get()).data();assert.equal(gravado.imagemUrl,'https://example.com/foto.jpg');
 await assert.rejects(op('adm-a','salvarPrato',{...base,id,versao:4,imagemUrl:'https://127.0.0.1/foto'}),/imagem/);
 await op('adm-a','salvarPrato',{...base,id,versao:4,imagemUrl:'',foto:''});
 assert.equal((await db.doc(`grupos/a/pratosDia/${id}`).get()).data().imagemUrl,'');
 await op('adm-a','arquivarPrato',{id,versao:5});assert.equal((await op('adm-a','listarPratos')).pratos.length,0);
 const ontem=new Date(Date.parse(hoje+'T12:00Z')-86400000).toISOString().slice(0,10);
 const velho=await op('adm-a','salvarPrato',{...base,data:ontem});
 const futuro=await op('adm-a','salvarPrato',{...base,data:amanha,foto:''});
 const semanal=await op('adm-a','salvarPrato',{...base,modo:'semanal',diasSemana:[0,1,2,3,4,5,6],foto:''});
 let ativos=(await op('adm-a','listarPratos')).pratos;assert.ok(!ativos.some(p=>p.id===velho.id));assert.ok(ativos.some(p=>p.id===futuro.id));assert.ok(ativos.some(p=>p.id===semanal.id));
 const arquivado=(await db.doc(`grupos/a/pratosDia/${velho.id}`).get()).data();assert.equal(arquivado.ativo,false);assert.equal(arquivado.arquivamentoAutomatico,true);assert.equal(arquivado.versao,2);assert.equal(arquivado.receita,base.receita);assert.equal(arquivado.foto,base.foto);
 await op('adm-a','listarPratos');assert.equal((await db.doc(`grupos/a/pratosDia/${velho.id}`).get()).data().versao,2);
 assert.ok((await op('adm-a','listarPratos',{arquivados:true})).pratos.some(p=>p.id===velho.id));
 assert.equal((await op('colega-a','listarPratos',{arquivados:true})).pratos.length,0);
 assert.equal((await op('adm-b','listarPratos',{arquivados:true,grupoId:'a'})).pratos.length,0);
 assert.equal((await op('func-a','obterPrato',{id:velho.id})).foto,base.foto);
 await assert.rejects(op('colega-a','obterPrato',{id:velho.id}),/outra/);
 const direto=await op('adm-a','salvarPrato',{...base,data:ontem});const arquivoDireto=(await op('adm-a','listarPratos',{arquivados:true})).pratos;assert.ok(arquivoDireto.some(p=>p.id===direto.id&&p.versao===2));
 for(let n=0;n<27;n++)await db.doc(`grupos/a/pratosDia/arquivo_${String(n).padStart(2,'0')}`).set({...arquivado,usuarioId:'func-a'});
 const pagina=await op('adm-a','listarPratos',{arquivados:true});assert.equal(pagina.pratos.length,25);assert.ok(pagina.cursor);
 const proxima=await op('adm-a','listarPratos',{arquivados:true,cursor:pagina.cursor});assert.ok(proxima.pratos.length);assert.ok(!proxima.pratos.some(x=>pagina.pratos.some(y=>x.id===y.id)));

});
