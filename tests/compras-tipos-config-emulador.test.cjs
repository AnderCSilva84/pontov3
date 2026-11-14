const test=require('node:test'),assert=require('node:assert/strict');
test('categorias por grupo: padrão, permissão, concorrência, legado e fechamento desabilitado',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async t=>{
 assert.match(process.env.GCLOUD_PROJECT,/^demo-/);
 const admin=require('../functions/node_modules/firebase-admin'),app=admin.initializeApp({projectId:process.env.GCLOUD_PROJECT+'-tipos'}),db=app.firestore();t.after(()=>app.delete());
 const {comprasOperacao,comprasRelatorio}=require('../functions/compras.cjs');
 const {TIPOS,PADRAO}=require('../functions/compras-tipo.cjs');
 for(const [uid,role,g]of [['adm','admin','a'],['func','funcionario','a'],['leitor','consulta','a'],['outro','admin','b']]){
  await db.doc('grupos/'+g).set({ativo:true});await db.doc('vinculosUsuarios/'+uid).set({grupoId:g,ativo:true});await db.doc(`grupos/${g}/users/${uid}`).set({ativo:true,role,nome:'Pessoa fictícia'});
 }
 const op=(operacao,d={},uid='adm')=>comprasOperacao.run({auth:{uid},data:{operacao,...d}});
 for(const uid of ['adm','func','leitor','outro'])assert.deepEqual((await op('consultarCategoriasCompras',{},uid)).habilitadas,PADRAO);
 assert.equal((await db.doc('grupos/a/comprasConfiguracao/tipos').get()).exists,false);
 await assert.rejects(op('salvarCategoriasCompras',{habilitadas:['pet'],versao:0},'func'),{code:'permission-denied'});
 await assert.rejects(op('salvarCategoriasCompras',{habilitadas:['pet'],versao:0},'leitor'),{code:'permission-denied'});
 await assert.rejects(op('salvarCategoriasCompras',{habilitadas:[],versao:0}),{code:'invalid-argument'});
 await assert.rejects(op('salvarCategoriasCompras',{habilitadas:['injetada'],versao:0}),{code:'invalid-argument'});
 await assert.rejects(op('criar',{listaId:'pet-proibido',titulo:'Teste',tipoCompra:'pet'}),{code:'failed-precondition'});
 await op('salvarCategoriasCompras',{habilitadas:Object.keys(TIPOS),versao:0});
 await assert.rejects(op('salvarCategoriasCompras',{habilitadas:['pet'],versao:0}),{code:'aborted'});
 assert.equal((await op('salvarCategoriasCompras',{habilitadas:Object.keys(TIPOS),versao:1})).versao,1);
 assert.equal((await op('consultarCategoriasCompras',{},'func')).habilitadas.length,5);
 assert.deepEqual((await op('consultarCategoriasCompras',{grupoId:'a'},'outro')).habilitadas,PADRAO);
 const p='grupos/a/';await db.doc(p+'catalogoCompras/prod').set({tiposCompra:Object.keys(TIPOS),nome:'Produto fictício',categoriaId:'outros',apresentacao:'Pacote',unidadeCompra:'un',ativo:true});await db.doc(p+'supermercados/loja').set({nome:'Loja fictícia',filial:'Teste',cidade:'Teste',ativo:true});
 for(const tipo of Object.keys(TIPOS)){await op('criar',{listaId:tipo,titulo:tipo,tipoCompra:tipo});await op('adicionar',{listaId:tipo,produtoId:'prod',quantidadePlanejada:1},'func');}
 await op('criar',{listaId:'pet-cupom',titulo:'Compra pet a importar',tipoCompra:'pet'});
 // Depois de desabilitar, as cinco listas anteriores ainda podem ser concluídas.
 await op('salvarCategoriasCompras',{habilitadas:['supermercado'],versao:1});
 for(const tipo of Object.keys(TIPOS)){
  if(tipo!=='supermercado')await assert.rejects(op('criar',{listaId:tipo+'-nova',titulo:tipo,tipoCompra:tipo}),{code:'failed-precondition'});
  await op('iniciar',{listaId:tipo});await op('item',{listaId:tipo,itemId:'prod',versao:1,estado:'comprado',precoUnitarioCentavos:100,quantidadeComprada:1,supermercadoId:'loja'});
  const l=(await db.doc(p+'comprasListas/'+tipo).get()).data();await op('finalizar',{listaId:tipo,versao:l.versao,aceitarPendentes:true});
  assert.equal((await db.doc(p+'comprasListas/'+tipo).get()).data().tipoCompra,tipo);
  const rel=await comprasRelatorio.run({auth:{uid:'adm'},data:{inicioMs:Date.now()-86400000,fimMs:Date.now()+86400000,tipoCompra:tipo}});assert.equal(rel.registros.length,1);
 }
 await op('criar',{listaId:'legado-sem-campo',titulo:'Cliente antigo'});assert.equal((await db.doc(p+'comprasListas/legado-sem-campo').get()).data().tipoCompra,'supermercado');
 // Reenvio idempotente da criação não é bloqueado por mudança posterior na configuração.
 assert.equal((await op('criar',{listaId:'pet',titulo:'Pet',tipoCompra:'pet'})).listaId,'pet');
 const fixture=require('./fixtures/cupom-pa.cjs')('000000951');
 await assert.rejects(op('cupomPreparar',{tipoCompra:'pet',link:fixture.link,texto:fixture.texto}),{code:'failed-precondition'});
 await db.doc(p+'categoriasCompras/outros').set({nome:'Outros',ativo:true});
 const nota=await op('cupomPreparar',{listaDestinoId:'pet-cupom',link:fixture.link,texto:fixture.texto});
 const itens=nota.nota.itens.map(i=>({linha:i.linha,descartar:false,nome:i.nome,marca:'',categoriaId:'outros',apresentacao:i.unidadeCompra==='kg'?'A granel':'Embalagem',unidadeConfirmada:true,novoConfirmado:true}));
 await op('cupomConfirmar',{rascunhoId:nota.rascunhoId,supermercadoId:'loja',itens,versaoIdentidade:1});
 const importada=(await db.doc(p+'comprasListas/pet-cupom').get()).data();assert.equal(importada.tipoCompra,'pet');assert.equal(importada.totalCentavos,5000);
 const {criarHandlerComprasApi}=require('../functions/compras-api.cjs'),{bancoDoGrupo}=require('../functions/grupos-contexto.cjs');
 const h=criarHandlerComprasApi({db:async()=>bancoDoGrupo(db,'a'),verificar:async()=>({email:'no-bolso-runtime@organizanderson.iam.gserviceaccount.com',email_verified:true})});
 const res={set(){return this;},status(n){this.codigo=n;return this;},json(x){this.dados=x;return this;}};
 await h({get:()=> 'Bearer '+ 'x'.repeat(32),method:'GET',path:'/v1/listas',query:{}},res);
 assert.equal(res.codigo,undefined);
 assert.ok(Array.isArray(res.dados.listas));
 assert.ok(res.dados.listas.every(l=>['supermercado','legado-sem-campo'].includes(l.id)));
 for(const tipo of ['farmacia','material_construcao','oficina','pet']){await h({get:()=> 'Bearer '+ 'x'.repeat(32),method:'GET',path:'/v1/listas/'+tipo,query:{}},res);assert.equal(res.codigo,404);}
 const {consultarNoBolso}=require('../functions/no-bolso-consulta.cjs');
 const consulta=await consultarNoBolso(db,{auth:{uid:'adm'},data:{consulta:'rankings',dias:30}});assert.equal(consulta.produtos.length,1);
 const concorrentes=await Promise.allSettled([op('salvarCategoriasCompras',{habilitadas:['supermercado','pet'],versao:2}),op('salvarCategoriasCompras',{habilitadas:['supermercado','oficina'],versao:2})]);
 assert.equal(concorrentes.filter(r=>r.status==='fulfilled').length,1);assert.equal(concorrentes.filter(r=>r.status==='rejected'&&r.reason.code==='aborted').length,1);
});
