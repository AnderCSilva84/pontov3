const test=require('node:test'),assert=require('node:assert/strict');
test('comparação consulta listas completas somente no grupo e mantém relatório antigo',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async t=>{
 assert.match(process.env.GCLOUD_PROJECT,/^demo-/);process.env.GCLOUD_PROJECT+='-comparacao';process.env.FIREBASE_CONFIG=JSON.stringify({projectId:process.env.GCLOUD_PROJECT});
 const admin=require('../functions/node_modules/firebase-admin'),api=require('../functions/index.js'),db=admin.firestore();t.after(()=>admin.app().delete());
 for(const [u,g,role,ativo]of [['adm','a','admin',true],['func','a','funcionario',true],['consulta','a','consulta',true],['inativo','a','admin',false],['outro','b','admin',true]]){await db.doc('grupos/'+g).set({ativo:true});await db.doc('vinculosUsuarios/'+u).set({grupoId:g,ativo:true});await db.doc('grupos/'+g+'/users/'+u).set({role,ativo,nome:'Teste'});}
 const base='grupos/a/',agora=Date.now(),ts=admin.firestore.Timestamp;
 for(const id of ['listaA','listaB','anulada','farmacia'])await db.doc(base+'comprasListas/'+id).set({titulo:'Compra fictícia '+id,status:id==='anulada'?'anulada':'finalizada',tipoCompra:id==='farmacia'?'farmacia':'supermercado',finalizadaEm:ts.fromMillis(agora)});
 await db.doc('grupos/b/comprasListas/secreta').set({titulo:'Outra família',status:'finalizada',tipoCompra:'supermercado'});
 const registros=[['a','listaA','p',agora,1234],['fora','listaA','p',agora-400*86400000,1234],['b','listaB','alias',agora,1500],['invalidado','anulada','p',agora,500],['farma','farmacia','p',agora,100]];
 for(const [id,listaId,produtoId,ms,preco]of registros)await db.doc(base+'comprasPrecos/'+id).set({listaId,produtoId,nomeSnapshot:'Produto fictício',apresentacao:'Pacote 1 kg',marca:'Demo',unidadeCompra:'un',supermercadoId:listaId,supermercadoNome:listaId,quantidadeComprada:1,precoUnitarioCentavos:preco,precoUnitarioOriginalFiscal:'12,3456789012',compradoEm:ts.fromMillis(ms),valido:id!=='invalidado',tipoCompra:listaId==='farmacia'?'farmacia':'supermercado'});
 await db.doc(base+'comprasAssociacoes/estado').set({versao:1,vinculos:{alias:'p'},nomes:{p:'PRODUTO CANÔNICO'}});
 const parametros={inicioMs:agora-86400000,fimMs:agora+1000,tipoCompra:'supermercado'},op=(d={},uid='adm')=>api.comprasRelatorio.run({auth:uid?{uid}:undefined,data:{...parametros,...d}});
 await assert.rejects(api.comprasRelatorio.run({auth:{uid:'adm'},data:null}),{code:'invalid-argument'});
 const antigo=await op();assert.equal(Object.hasOwn(antigo,'listas'),false);assert.equal(antigo.registros.length,2);assert.equal(antigo.registros[0].precoUnitarioOriginalFiscal,'12,3456789012');assert.ok(antigo.rankings);
 const opcoes=await op({incluirListas:true});assert.deepEqual(opcoes.listas.map(l=>l.id).sort(),['listaA','listaB']);
 for(const uid of ['adm','func','consulta']){const r=await op({listaIds:['listaA','listaB']},uid);assert.equal(r.registros.length,3);assert.ok(r.registros.some(r=>r.id==='fora'));assert.ok(r.registros.every(r=>r.produtoId==='p'));}
 for(const listaIds of [['listaA','secreta'],['listaA','anulada'],['listaA','farmacia']])await assert.rejects(op({listaIds}),{code:'failed-precondition'});
 for(const listaIds of [['listaA','listaA'],['listaA','../b'],['listaA']])await assert.rejects(op({listaIds}),{code:'invalid-argument'});
 await assert.rejects(op({},''),{code:'unauthenticated'});await assert.rejects(op({},'inativo'),{code:'permission-denied'});await assert.rejects(op({listaIds:['listaA','listaB']},'outro'),{code:'failed-precondition'});
 assert.equal((await db.collection(base+'comprasPrecos').get()).size,5);assert.equal((await db.collection(base+'comprasListas').get()).size,4);
});
