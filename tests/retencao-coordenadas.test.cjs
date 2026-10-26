const test=require('node:test'),assert=require('node:assert/strict');
const {loteCoordenadas}=require('../functions/retencao-coordenadas.cjs');
test('retencao bloqueia execucao real e limites antes de acessar dados',async()=>{
 await assert.rejects(loteCoordenadas({projectId:'ponto-app-1c55a'},{grupoId:'g',atorUid:'a',executar:true}),/REAL_BLOQUEADA/);
 const host=process.env.FIRESTORE_EMULATOR_HOST;delete process.env.FIRESTORE_EMULATOR_HOST;
 try{await assert.rejects(loteCoordenadas({projectId:'demo-x'},{grupoId:'g',atorUid:'a',executar:true}),/REAL_BLOQUEADA/);}finally{if(host)process.env.FIRESTORE_EMULATOR_HOST=host;}
 await assert.rejects(loteCoordenadas({projectId:'demo-x'},{grupoId:'../outro',atorUid:'a'}),/ESCOPO_INVALIDO/);
 await assert.rejects(loteCoordenadas({projectId:'demo-x'},{grupoId:'g',atorUid:'a',limite:21}),/ESCOPO_INVALIDO/);
});
test('lote emulado: dry run, aprovacao, excecao, replay e idempotencia',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async()=>{
 assert.match(process.env.GCLOUD_PROJECT,/^demo-/);
 const admin=require('../functions/node_modules/firebase-admin');const app=admin.initializeApp({projectId:process.env.GCLOUD_PROJECT}),db=app.firestore(),base='grupos/retencao_ficticia',T=admin.firestore.Timestamp;
 try{
 await db.doc(base).set({titularUid:'admin',ativo:true});await db.doc(base+'/users/admin').set({role:'admin',ativo:true});await db.doc(base+'/users/func').set({role:'funcionario',ativo:true});
 const dados={latitude:1,longitude:2,timestamp:T.fromMillis(0),retencaoCoordenadasEm:T.fromMillis(90*86400000)};
 for(const [id,extra]of Object.entries({legado:{},moderno:{operacaoId:'ficticio',declarado:{amostra:{latitude:1,longitude:2}}},disputa:{retencaoExcepcional:true}}))await db.doc(base+'/registros/'+id).set({...dados,...extra});
 const op={grupoId:'retencao_ficticia',atorUid:'admin',agora:100*86400000};
 await assert.rejects(loteCoordenadas(db,{...op,atorUid:'func'}),/NAO_AUTORIZADO/);
 let r=await loteCoordenadas(db,op);assert.equal(r.examinados,3);assert.equal(r.contagens.politica_nao_aprovada,1);assert.equal((await db.doc(base+'/registros/legado').get()).data().latitude,1);
 await db.doc(base+'/retencaoPoliticas/coordenadas').set({aprovada:true,categoria:'coordenadas_legadas',versao:1,prazoDias:90});
 r=await loteCoordenadas(db,op);assert.equal(r.contagens.elegivel,1);assert.equal((await db.doc(base+'/registros/legado').get()).data().latitude,1);
 r=await loteCoordenadas(db,{...op,executar:true});assert.equal(r.contagens.tratado,1);assert.equal(r.contagens.preservado_idempotencia,1);assert.equal(r.contagens.preservado_excecao,1);
 const salvo=(await db.doc(base+'/registros/legado').get()).data();assert.equal(salvo.latitude,undefined);assert.equal(salvo.coordenadasRemovidasPor,'admin');
 r=await loteCoordenadas(db,{...op,executar:true});assert.equal(r.contagens.ja_tratado,1);
 await db.doc(base).update({retencaoExcepcional:true});assert.equal((await loteCoordenadas(db,op)).contagens.preservado_excecao,3);
 }finally{await app.delete();}
});
