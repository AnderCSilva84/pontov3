const test=require('node:test'),assert=require('node:assert/strict');
test('importação monetária: zeros extras não mudam compra; valor significativo inválido não cria rascunho',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async t=>{
 assert.match(process.env.GCLOUD_PROJECT,/^demo-/);const admin=require('../functions/node_modules/firebase-admin'),app=admin.initializeApp({projectId:process.env.GCLOUD_PROJECT+'-monetario'},'monetario');t.after(()=>app.delete());const db=app.firestore(),{operarCupom}=require('../functions/cupom-operacoes.cjs');
 await db.doc('users/admin').set({role:'admin',ativo:true,nome:'Teste fictício'});await db.doc('categoriasCompras/limpeza').set({ativo:true,nome:'Limpeza'});await db.doc('supermercados/demo').set({ativo:true,nome:'Loja fictícia',filial:'Teste',cidade:'Teste'});
 const op=(operacao,d)=>operarCupom(db,{auth:{uid:'admin'},data:{operacao,...d}}),f=require('./fixtures/cupom-pa.cjs')('000000943');
 await assert.rejects(op('cupomPreparar',{texto:f.texto.replace('Vl. Unit.: 10,00','Vl. Unit.: 10,00000000001')}),e=>e.code==='invalid-argument'&&/preço unitário da linha 1/.test(e.message));assert.equal((await db.collection('comprasCuponsRascunhos').get()).size,0);
 const r=await op('cupomPreparar',{texto:f.texto.replace(/(\d+,\d{2})(?!\d)/g,'$10000')});assert.equal(r.nota.totalPagoCentavos,5000);assert.equal(r.nota.itens[0].precoUnitarioCentavos,1000);
 const dados={rascunhoId:r.rascunhoId,supermercadoId:'demo',versaoIdentidade:1,itens:r.nota.itens.map(i=>({...i,descartar:false,novoConfirmado:true,categoriaId:'limpeza',apresentacao:'Exemplo fictício'}))};
 const a=await op('cupomConfirmar',dados),b=await op('cupomConfirmar',dados);assert.equal(a.listaId,b.listaId);const l=(await db.doc('comprasListas/'+a.listaId).get()).data();assert.equal(l.totalOriginalCentavos,5356);assert.equal(l.descontoCentavos,356);assert.equal(l.totalCentavos,5000);assert.equal((await db.collection('comprasCupons').get()).size,1);
});
test('139 linhas com precisão fiscal: confirmação atômica com 139 produtos novos e retry sem duplicidade',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async t=>{
 assert.match(process.env.GCLOUD_PROJECT,/^demo-/);const admin=require('../functions/node_modules/firebase-admin'),app=admin.initializeApp({projectId:process.env.GCLOUD_PROJECT+'-139'},'monetario-139');t.after(()=>app.delete());const db=app.firestore(),{operarCupom}=require('../functions/cupom-operacoes.cjs');
 await db.doc('users/admin').set({role:'admin',ativo:true,nome:'Teste fictício'});await db.doc('categoriasCompras/teste').set({ativo:true,nome:'Categoria fictícia'});await db.doc('supermercados/demo').set({ativo:true,nome:'Loja fictícia',filial:'Teste',cidade:'Teste'});
 const op=(operacao,d)=>operarCupom(db,{auth:{uid:'admin'},data:{operacao,...d}}),f=require('./fixtures/cupom-precisao-139.cjs')();
 const r=await op('cupomPreparar',{texto:f.texto});assert.equal(r.nota.itens.length,139);assert.equal(r.nota.totalPagoCentavos,107748);
 const dados={rascunhoId:r.rascunhoId,supermercadoId:'demo',versaoIdentidade:1,itens:r.nota.itens.map(i=>({...i,descartar:false,novoConfirmado:true,categoriaId:'teste',apresentacao:'Exemplo fictício'}))};
 dados.itens[3].precoUnitarioOriginalFiscal='999,999';dados.itens[3].precoUnitarioCentavos=999999;dados.itens[3].totalCentavos=1;
 const a=await op('cupomConfirmar',dados),b=await op('cupomConfirmar',dados);assert.equal(a.listaId,b.listaId);
 const itens=await db.collection('comprasListas/'+a.listaId+'/itens').get(),precos=await db.collection('comprasPrecos').get();assert.equal(itens.size,139);assert.equal(precos.size,139);assert.equal((await db.collection('catalogoCompras').get()).size,139);assert.equal((await db.collection('comprasCupons').get()).size,1);
 const item=itens.docs.find(d=>d.data().linhaFiscal===4).data(),preco=precos.docs.find(d=>d.data().linhaFiscal===4).data();assert.equal(item.precoUnitarioOriginalFiscal,'26,6666666667');assert.equal(preco.precoUnitarioOriginalFiscal,item.precoUnitarioOriginalFiscal);assert.equal(item.totalCentavos,2288);assert.equal((await db.doc('comprasListas/'+a.listaId).get()).data().totalCentavos,107748);
});
