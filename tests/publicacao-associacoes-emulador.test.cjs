const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
test('publicação: contrato de supermercado exclui farmácia sem alterar originais',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async t=>{
 assert.match(process.env.GCLOUD_PROJECT,/^demo-/);
 const source=path.resolve(process.env.AP1303_TEST_PACKAGE||'functions');
 const admin=require(path.join(source,'node_modules/firebase-admin'));
 const app=admin.initializeApp({projectId:process.env.GCLOUD_PROJECT+'-publicacao14'}),db=app.firestore();t.after(()=>app.delete());
 const now=admin.firestore.Timestamp.now();
 for(const [id,tipoCompra]of [['legada',undefined],['mercado','supermercado'],['farmacia','farmacia']]){
  await db.doc('comprasListas/'+id).set({titulo:id,status:'finalizada',criadaEm:now,finalizadaEm:now,totalCentavos:1000,...(tipoCompra?{tipoCompra}:{})});
  await db.doc('comprasPrecos/'+id).set({produtoId:id,listaId:id,nomeSnapshot:id,unidadeCompra:'un',quantidadeComprada:1,precoUnitarioCentavos:1000,supermercadoId:'loja',supermercadoNome:'Loja fictícia',compradoEm:now,valido:true,...(tipoCompra?{tipoCompra}:{})});
 }
 const {criarHandlerComprasApi}=require(path.join(source,'compras-api.cjs'));
 const handler=criarHandlerComprasApi({db:()=>db,verificar:async()=>({email:'no-bolso-runtime@organizanderson.iam.gserviceaccount.com',email_verified:true})});
 async function get(route){const res={codigo:200,set(){},status(c){this.codigo=c;return this;},json(v){this.body=v;return this;}};await handler({method:'GET',path:route,query:{},get:()=> 'Bearer '+'x'.repeat(30)},res);return res;}
 const list=await get('/v1/listas');assert.equal(list.codigo,200);assert.deepEqual(list.body.listas.map(l=>l.id).sort(),['legada','mercado']);
 assert.equal((await get('/v1/listas/farmacia')).codigo,404);
 const ranking=await get('/v1/rankings');assert.equal(ranking.codigo,200);assert.ok(!JSON.stringify(ranking.body).includes('farmacia'));
 assert.equal((await db.collection('comprasListas').get()).size,3);assert.equal((await db.collection('comprasPrecos').get()).size,3);
 assert.equal((await db.doc('comprasListas/farmacia').get()).data().totalCentavos,1000);
});
