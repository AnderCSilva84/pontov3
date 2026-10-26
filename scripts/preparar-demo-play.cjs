const {GRUPO_DEMO}=require('../functions/demonstracao.cjs');
async function prepararDemo(app,segredos,{permitirProducao=false}={}){
 const projeto=app.options.projectId,local=projeto.startsWith('demo-')||projeto==='ap1303-android-push-teste';
 const loopback=v=>/^(127\.0\.0\.1|localhost):\d+$/.test(v||'');
 if(local?(!loopback(process.env.FIRESTORE_EMULATOR_HOST)||!loopback(process.env.FIREBASE_AUTH_EMULATOR_HOST)):(!permitirProducao||projeto!=='ponto-app-1c55a'||process.env.FIRESTORE_EMULATOR_HOST||process.env.FIREBASE_AUTH_EMULATOR_HOST))throw Error('Destino de demonstracao nao autorizado.');
 const db=app.firestore(),auth=app.auth(),ids={admin:'demo_play_ap1303_admin_v1',funcionario:'demo_play_ap1303_func_v1'};
 for(const role of Object.keys(ids))if(typeof segredos?.[role]?.senha!=='string'||segredos[role].senha.length<20||segredos[role].email!==`ap1303-review-${role}@example.test`)throw Error('Use credenciais ficticias proprias geradas fora do repositorio.');
 const grupoRef=db.doc(`grupos/${GRUPO_DEMO}`),grupo=await grupoRef.get();
 if(grupo.exists&&grupo.data().demonstracao!==true)throw Error('Destino ocupado. Nenhum dado existente sera substituido.');
 for(const role of Object.keys(ids)){
  const uid=ids[role],email=segredos[role].email;
  const [v,p]=await db.getAll(db.doc(`vinculosUsuarios/${uid}`),db.doc(`users/${uid}`));
  if(p.exists||v.exists&&v.data().grupoId!==GRUPO_DEMO)throw Error('Conta possui contexto diferente. Operacao interrompida.');
  let u=await auth.getUser(uid).catch(e=>{if(e.code==='auth/user-not-found')return null;throw e;});
  if(u&&(u.email!==email||u.customClaims?.ap1303DemoGrupo!==GRUPO_DEMO))throw Error('Conta existente nao reconhecida como demonstrativa. Revisao manual necessaria.');
  if(!u){u=await auth.createUser({uid,email,password:segredos[role].senha,displayName:role==='admin'?'Administrador demonstrativo':'Funcionário demonstrativo'});await auth.setCustomUserClaims(uid,{ap1303DemoGrupo:GRUPO_DEMO});}
 }
 const agora=new Date(),data=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Fortaleza'}).format(agora),base=`grupos/${GRUPO_DEMO}`;
 const docs={
  [base]:{nome:'AP1303 — DEMONSTRAÇÃO FICTÍCIA',ativo:true,demonstracao:true,contasDemo:Object.values(ids),funcionarioDemoUid:ids.funcionario,titularUid:ids.admin,schemaVersion:1},
  [`${base}/funcionarios/${ids.funcionario}`]:{nome:'Funcionário demonstrativo',email:segredos.funcionario.email,ativo:true,locaisPermitidos:[],cargaSegSexMin:480,cargaSabadoMin:0},
  [`${base}/tarefasSemanais/revisao`]:{titulo:'DEMO: organizar a bancada',ativa:true,diaSemana:agora.getDay(),turno:'manha',horario:'09:00',criadoPor:ids.admin,criadoEm:agora},
  [`${base}/tarefas/revisao`]:{titulo:'DEMO: conferir materiais',dataAgendada:data,turno:'manha',horario:'10:00',concluida:false,criadoPor:ids.admin,criadoEm:agora},
  [`${base}/categoriasCompras/demo`]:{nome:'Demonstração',icone:'shopping-cart',ativo:true},
  [`${base}/catalogoCompras/demo_arroz`]:{nome:'Arroz fictício 1 kg',categoriaId:'demo',categoria:'Demonstração',unidadeCompra:'un',apresentacao:'Pacote de 1 kg',marca:'Marca fictícia',ativo:true},
  [`${base}/comprasListas/demo_aberta`]:{titulo:'DEMO: compras da semana',status:'rascunho',tipoCompra:'supermercado',versao:1,criadaPor:ids.admin,criadaPorNome:'Administrador demonstrativo',criadaEm:agora,atualizadaEm:agora,quantidadeItens:1,schemaVersion:1},
  [`${base}/comprasListas/demo_aberta/itens/demo_arroz`]:{produtoId:'demo_arroz',nomeSnapshot:'Arroz fictício 1 kg',categoriaId:'demo',apresentacao:'Pacote de 1 kg',quantidadePlanejada:1,unidadeCompra:'un',estado:'pendente',versao:1,solicitadaPor:ids.admin,solicitadaPorNome:'Administrador demonstrativo',adicionadaEm:agora},
  [`${base}/pessoasCuidados/demo_pessoa`]:{nome:'Pessoa fictícia',tipo:'adulto',destinatarios:'todos',ativo:true,versao:1},
  [`${base}/lembretes/demo_cuidado`]:{titulo:'DEMO: oferecer água',tipo:'cuidado',cuidadoId:'demo_pessoa',nomeCuidado:'Pessoa fictícia',destinatarioCuidado:'adulto',usuarioId:ids.funcionario,destinatarios:'todos',ativo:true,dataInicio:data,repeticao:'dias',horario:'09:00',horarios:['09:00','15:00'],diasSemana:[0,1,2,3,4,5,6],criadoPor:ids.admin,criadoPorNome:'Administrador demonstrativo',proximoDisparoEm:null,criadoEm:agora},
  [`${base}/demonstracaoPonto/${ids.funcionario}`]:{ficticio:true,registros:[],operacoes:[]}
 };
 for(let i=1;i<=2;i++){
  const dia=new Date(agora.getTime()-i*86400000),loja=`demo_loja_${i}`,lista=`demo_historico_${i}`,valor=500+i*50;
  docs[`${base}/supermercados/${loja}`]={nome:`Mercado fictício ${i}`,filial:'Demonstração',cidade:'Cidade fictícia',ativo:true};
  docs[`${base}/comprasListas/${lista}`]={titulo:`DEMO: compra fictícia ${i}`,status:'finalizada',tipoCompra:'supermercado',versao:2,criadaPor:ids.admin,criadaPorNome:'Administrador demonstrativo',criadaEm:dia,finalizadaPor:ids.admin,finalizadaEm:dia,totalCentavos:valor,quantidadeComprados:1,quantidadeItens:1,schemaVersion:1};
  const item={produtoId:'demo_arroz',nomeSnapshot:'Arroz fictício 1 kg',categoriaId:'demo',apresentacao:'Pacote de 1 kg',marca:'Marca fictícia',quantidadePlanejada:1,quantidadeComprada:1,unidadeCompra:'un',estado:'comprado',versao:2,precoUnitarioCentavos:valor,totalCentavos:valor,supermercadoId:loja,supermercadoNome:`Mercado fictício ${i}`,compradoEm:dia};
  docs[`${base}/comprasListas/${lista}/itens/demo_arroz`]=item;
  docs[`${base}/comprasPrecos/${lista}_demo_arroz`]={...item,tipoCompra:'supermercado',listaId:lista,itemId:'demo_arroz',valido:true,finalizadaEm:dia};
 }
 for(let dia=0;dia<7;dia++)docs[`${base}/tarefasSemanais/demo_dia_${dia}`]={titulo:'DEMO: organizar materiais do dia',diaSemana:dia,turno:'manha',horario:'09:00',ativa:true,criadoPor:ids.admin,criadoEm:agora};
 for(const role of Object.keys(ids)){
  docs[`vinculosUsuarios/${ids[role]}`]={grupoId:GRUPO_DEMO,ativo:true};
  docs[`${base}/users/${ids[role]}`]={nome:role==='admin'?'Administrador demonstrativo':'Funcionário demonstrativo',email:segredos[role].email,role,ativo:true,funcionarioId:role==='funcionario'?ids.funcionario:null,babaCuidadora:true,lembretesHabilitados:true,permissions:{accessPonto:true,accessAdmin:role==='admin',manageUsers:role==='admin',createTasks:role==='admin',realizarCompras:role==='admin'}};
 }
 await db.runTransaction(async tx=>{const refs=Object.keys(docs).map(p=>db.doc(p)),existentes=await tx.getAll(...refs);existentes.forEach((s,i)=>{if(!s.exists)tx.create(refs[i],docs[refs[i].path]);});});
 return {grupoId:GRUPO_DEMO,contas:ids,documentosPrevistos:Object.keys(docs).length};
}
module.exports={prepararDemo};
if(require.main===module){
 (async()=>{const fs=require('node:fs'),path=require('node:path');const arquivo=process.argv[2];if(arquivo!=='-'&&(!arquivo||!path.isAbsolute(arquivo)||path.resolve(arquivo).toLowerCase().startsWith(path.resolve(__dirname,'..').toLowerCase()+path.sep)))throw Error('Informe entrada privada fora do repositorio.');
 const autorizado=process.argv.includes('--producao-autorizada')&&process.env.AP1303_AUTORIZAR_DEMO==='ponto-app-1c55a';
 const admin=require('../functions/node_modules/firebase-admin');const app=admin.initializeApp({projectId:process.env.GCLOUD_PROJECT});try{const r=await prepararDemo(app,JSON.parse(fs.readFileSync(arquivo==='-'?0:arquivo,'utf8')),{permitirProducao:autorizado});console.log('Demonstracao preparada no destino explicitamente selecionado; '+r.documentosPrevistos+' documentos previstos.');}finally{await app.delete();}})().catch(()=>{console.error('Preparacao interrompida. Verifique destino e entrada privada; nenhum segredo sera exibido.');process.exitCode=1;});
}
