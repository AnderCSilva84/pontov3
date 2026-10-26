const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {permiteEnvio}=require('../functions/push-contrato.cjs');
test('servidor exclui inscrições Android antigas e novas de cuidados; preserva web, ponto e tarefas',()=>{
 for(const device of [{transporte:'fcm-android'},{transporte:'fcm-android',edicao:'completa'}]){
  assert.equal(permiteEnvio(device,'/lembretes?lembreteId=a'),false);
  assert.equal(permiteEnvio(device,'/ponto',{tipo:'lembrete'}),false);
  assert.equal(permiteEnvio(device,'/admin'),true);
  assert.equal(permiteEnvio(device,'/ponto',{tipo:'tarefa'}),true);
 }
 for(const device of [{},{transporte:'webpush'}])assert.equal(permiteEnvio(device,'/lembretes?lembreteId=a'),true);
});
test('edição loja recusa rotas e intenções antigas antes de consultar; edição completa preservada',async()=>{
 const carregar=async(arquivo,completa)=>{
  let s=fs.readFileSync(arquivo,'utf8').replace(/^import .*edicaoBuild.*;\r?\n/m,`const cuidadosDisponiveis=${completa};\n`);
  if(arquivo.endsWith('rotas.js'))s=s.replace(/^import .*roles.js.*;\r?\n/m,"const normalizeRole=r=>r,ROLE_FUNCIONARIO='funcionario',canAccessPonto=()=>true;\n");
  return import('data:text/javascript;base64,'+Buffer.from(s).toString('base64'));
 };
 const u={uid:'ficticio',grupoId:'grupo-fixture',role:'admin'},d={versao:'1',uid:u.uid,grupoId:u.grupoId,expiraEm:String(Date.now()+300000),eventId:'a'.repeat(64),rota:'/lembretes',tipo:'lembrete',itemId:'a',ocorrenciaId:'1_123',canal:'cuidados'};
 for(const completa of [true,false]){
  const r=await carregar('src/utils/rotas.js',completa),p=await carregar('src/utils/pushAndroid.js',completa);
  assert.equal(r.resolverRotaUsuario(u,'/lembretes'),completa?'/lembretes':'/tarefas');
  assert.equal(p.destinoAviso(d,u),completa?'/lembretes':null);
  assert.equal(p.destinoAviso({...d,rota:'/admin',tipo:undefined,canal:'ponto'},u),'/admin');
  assert.equal(p.destinoAviso(d,{...u,grupoId:'outro'}),null);
 }
});
test('envio emulado filtra cuidados sem regravar tokens ou afetar o grupo vizinho',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async t=>{
 assert.ok(process.env.GCLOUD_PROJECT?.startsWith('demo-'));
 const admin=require('../functions/node_modules/firebase-admin'),app=admin.initializeApp({projectId:process.env.GCLOUD_PROJECT},'sem-cuidados-'+Date.now());t.after(()=>app.delete());
 const raiz=app.firestore(),{bancoDoGrupo}=require('../functions/grupos-contexto.cjs'),{criarPush}=require('../functions/push.cjs');
 const db=bancoDoGrupo(raiz,'edicao-fixture-'+Date.now()),outro=bancoDoGrupo(raiz,'outro-fixture-'+Date.now());
 await db.doc('users/admin').set({ativo:true,role:'admin'});await outro.doc('users/admin').set({ativo:true,role:'admin'});
 for(const [id,transporte]of [['antigo','fcm-android'],['novo','fcm-android'],['web','webpush']])await db.doc('pushDispositivos/'+id).set({uid:'admin',transporte,token:'ficticio-'+id});
 await outro.doc('pushDispositivos/web').set({uid:'admin',transporte:'webpush',token:'nao-enviar'});
 const mensagens=[],mock={firestore:()=>raiz,messaging:()=>({sendEach:async ms=>{mensagens.push(...ms);return{responses:ms.map(()=>({success:true}))};}})};
 const enviar=criarPush({admin:mock,db,somenteEnvio:true});
 assert.equal(await enviar('Fixture','Fixture','/lembretes?lembreteId=a','cuidado-fixture','admin'),1);
 assert.deepEqual(mensagens.map(x=>x.token),['ficticio-web']);
 assert.equal(await enviar('Fixture','Fixture','/lembretes?lembreteId=a','cuidado-fixture','admin'),0);
 assert.equal(await enviar('Fixture','Fixture','/admin','ponto-fixture','admin'),3);
 assert.equal((await db.collection('pushDispositivos').get()).size,3);
 assert.equal((await outro.collection('pushEnvios').get()).size,0);
});
