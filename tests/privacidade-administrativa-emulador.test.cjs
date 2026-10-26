const test=require('node:test'),assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const api=require('../functions/privacidade-administrativa.cjs');
const {operarConta}=require('../functions/conta.cjs');
test('suporte: dry-run, exclusão após Auth e preservação de terceiros',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async t=>{
 assert.match(process.env.FIRESTORE_EMULATOR_HOST,/^(127\.0\.0\.1|localhost):/);
 assert.match(process.env.FIREBASE_AUTH_EMULATOR_HOST,/^(127\.0\.0\.1|localhost):/);
 const admin=require('../functions/node_modules/firebase-admin');
 const app=admin.initializeApp({projectId:'demo-privacidade-'+Date.now()},'privacidade'),db=app.firestore(),auth=app.auth();t.after(()=>app.delete());
 const uid='p_'+randomUUID(),outro='p_'+randomUUID(),grupo='privado',nome='Pessoa fictícia removível';
 const revisao=new Date(Date.now()+86400000).toISOString();
 await auth.createUser({uid,email:uid+'@example.test',password:randomUUID()});
 await db.doc('grupos/'+grupo).set({ativo:true,titularUid:outro});
 await db.doc('vinculosUsuarios/'+uid).set({ativo:true,grupoId:grupo});
 await db.doc(`grupos/${grupo}/users/${uid}`).set({ativo:true,role:'funcionario',funcionarioId:uid,nome});
 await db.doc(`grupos/${grupo}/funcionarios/${uid}`).set({nome,ativo:true});
 const prefix=`grupos/${grupo}/`;
 await db.doc(prefix+'financeiro/dispensavel').set({funcionarioId:uid,valor:25});
 await db.doc(prefix+'registros/pessoal').set({funcionarioId:uid,uid,localizacao:{latitude:0,longitude:0}});
 await db.doc(prefix+'documentosTrabalhistas/prova').set({funcionarioId:uid,titulo:'Documento fictício sob análise'});
 await db.doc(prefix+'funcionarios/'+uid+'/conclusoesRotina/uma').set({tarefaId:'fixa',concluidaPor:uid});
 await db.doc(prefix+'comprasListas/compartilhada').set({criadaPor:uid,criadaPorNome:nome,totalCentavos:1000,titulo:'Lista do grupo'});
 await db.doc(prefix+'comprasListas/compartilhada/itens/item').set({produtoId:'banana',solicitadaPor:uid,solicitadaPorNome:nome,preco:10});
 await db.doc(prefix+'pessoasCuidados/terceiro').set({usuarioId:uid,nome:'Paciente fictício de terceiro',medicamento:'Dado fictício'});
 await db.doc(prefix+'financeiro/deOutro').set({funcionarioId:outro,valor:90});
 await db.doc('grupos/outro/financeiro/intocado').set({funcionarioId:uid,valor:88});
 const protegidos=await Promise.all([db.doc(prefix+'financeiro/deOutro').get(),db.doc('grupos/outro/financeiro/intocado').get()]);
 const fila={onlineIncerto:0,offlineNaoEnviado:0,recebidas:0,conflitos:0,confirmadas:0};
 const call=data=>operarConta(db,auth,{auth:{uid,token:{auth_time:Math.floor(Date.now()/1000)}},data});
 const pedido=await call({acao:'solicitar',confirmacao:true,pendencias:fila});
 assert.equal(pedido.solicitacao.protocolo,uid);
 assert.equal((await call({acao:'concluir',confirmacao:true,pendencias:fila})).solicitacao.status,'concluida');
 await assert.rejects(auth.getUser(uid),{code:'auth/user-not-found'});
 assert.equal((await db.doc(prefix+'financeiro/dispensavel').get()).exists,true,'histórico sobrevive à exclusão Auth');
 const entrada={uid,grupoId:grupo,operador:'suporte-ficticio',verificacaoRef:'atendimento-ficticio-verificado',revisarEm:revisao,criterioRevisao:'Reavaliar necessidade do comprovante deste atendimento fictício.'};
 await assert.rejects(api.registrarCaso(db,auth,{...entrada,grupoId:'outro'}),/Protocolo\/grupo/);
 const {caso}=await api.registrarCaso(db,auth,entrada);
 assert.equal((await api.registrarCaso(db,auth,entrada)).caso,caso,'registro idempotente sem login');
 await assert.rejects(api.previa(db,caso),/incompleto/);
 let rodada;for(let n=0;n<10;n++){rodada=await api.inventariar(db,caso);assert.ok(rodada.lidos<=200);if(!rodada.continuar)break;}
 assert.equal(rodada.continuar,false);
 let p=await api.previa(db,caso);
 const caseRef=db.doc('privacidadeCasos/'+caso);
 await caseRef.collection('itens').doc('fora-do-escopo').set({caminho:'grupos/outro/financeiro/intocado',geracao:(await caseRef.get()).data().geracao});
 await assert.rejects(api.previa(db,caso),/fora do grupo/);
 await caseRef.collection('itens').doc('fora-do-escopo').delete();
 assert.ok(p.itens.some(e=>e.caminho.endsWith('financeiro/dispensavel')));
 assert.ok(p.itens.some(e=>e.caminho.endsWith('conclusoesRotina/uma')));
 assert.ok(p.itens.some(e=>e.caminho==='contaSolicitacoes/'+uid));
 assert.ok(p.itens.some(e=>e.caminho.startsWith('contaExecucoes/')));
 assert.ok(!p.itens.some(e=>e.caminho==='grupos/outro/financeiro/intocado'));
 assert.ok(!p.itens.some(e=>e.caminho.endsWith('financeiro/deOutro')));
 assert.ok(!JSON.stringify(p).includes(nome),'prévia não carrega valores pessoais');
 assert.equal((await db.doc(prefix+'registros/pessoal').get()).exists,true,'dry-run não apaga domínio');
 function decisoes(quem){return Object.fromEntries(quem.itens.map(e=>[e.id,e.integridade||e.caminho.endsWith('documentosTrabalhistas/prova')?{
  acao:'conservar',justificativa:e.integridade?'Recibo fictício necessário à comprovação desta exclusão, sujeito à revisão.':'Documento fictício desta pessoa necessário à verificação de um pagamento contestado.',
  revisarEm:revisao,criterioRevisao:'Revisar a necessidade concreta após conclusão da análise fictícia.'
 }:e.podeExcluir?{acao:'excluir',justificativa:'Registro pessoal fictício dispensável após o encerramento confirmado.'}:{acao:'retirarCampos',campos:e.campos,justificativa:'Retirar autoria/destinatário desta conta, preservando o conteúdo dos terceiros.'}]));}
 const d=decisoes(p),base={caso,digest:p.digest,decisoes:d,operador:'suporte-ficticio',confirmar:true};
 await assert.rejects(api.executar(db,auth,{...base,confirmar:false}),/Confirmação/);
 await assert.rejects(api.executar(db,auth,{...base,digest:'alterada'}),/Prévia/);
 const autoria=p.itens.find(e=>e.caminho.endsWith('comprasListas/compartilhada'));
 await assert.rejects(api.executar(db,auth,{...base,decisoes:{...d,[autoria.id]:{...d[autoria.id],campos:[autoria.campos[0],autoria.campos[0]]}}}),/Todos os campos/);
 const item=p.itens.find(e=>e.caminho.endsWith('pessoasCuidados/terceiro'));
 await assert.rejects(api.executar(db,auth,{...base,decisoes:{...d,[item.id]:{acao:'excluir',justificativa:'Tentativa fictícia de apagar conteúdo de um paciente terceiro.'}}}),/compartilhado/);
 const retido=p.itens.find(e=>e.integridade);
 await assert.rejects(api.executar(db,auth,{...base,decisoes:{...d,[retido.id]:{acao:'conservar',justificativa:'Conservar tudo sem explicar por quê.'}}}),/Conservação/);
 await db.doc(prefix+'comprasListas/compartilhada').update({totalCentavos:1500});
 await assert.rejects(api.executar(db,auth,base),/Dados mudaram/);
 assert.equal((await db.doc(prefix+'registros/pessoal').get()).exists,true,'conflito não produz exclusão parcial');
 // Uma nova prévia requer revisão operacional explícita; o teste reinicia só o inventário do caso fictício.
 await api.reinventariar(db,caso,'suporte-ficticio','Atualização concorrente fictícia exige nova revisão.');
 for(let n=0;n<10;n++){rodada=await api.inventariar(db,caso);if(!rodada.continuar)break;}
 p=await api.previa(db,caso);
 await db.doc(prefix+'users/vinculo-concorrente').set({funcionarioId:uid,ativo:true});
 await assert.rejects(api.executar(db,auth,{caso,digest:p.digest,decisoes:decisoes(p),operador:'suporte-ficticio',confirmar:true}),/Outra conta passou/);
 await db.doc(prefix+'users/vinculo-concorrente').delete();
 const resultado=await api.executar(db,auth,{caso,digest:p.digest,decisoes:decisoes(p),operador:'suporte-ficticio',confirmar:true});
 t.diagnostic(JSON.stringify({cenario:'dados-ficticios-pos-Auth',excluidos:resultado.excluidos,camposRetiradosEmDocumentos:resultado.retirados,conservacoesJustificadas:resultado.conservados}));
 assert.ok(resultado.excluidos>=4);assert.ok(resultado.retirados>=3);assert.ok(resultado.conservados>=3);
 for(const suffix of ['financeiro/dispensavel','registros/pessoal','funcionarios/'+uid,'funcionarios/'+uid+'/conclusoesRotina/uma'])assert.equal((await db.doc(prefix+suffix).get()).exists,false,suffix);
 const compra=(await db.doc(prefix+'comprasListas/compartilhada').get()).data();assert.equal(compra.totalCentavos,1500);assert.equal(compra.criadaPor,undefined);assert.equal(compra.criadaPorNome,undefined);
 const paciente=(await db.doc(prefix+'pessoasCuidados/terceiro').get()).data();assert.equal(paciente.nome,'Paciente fictício de terceiro');assert.equal(paciente.medicamento,'Dado fictício');assert.equal(paciente.usuarioId,undefined);
 for(const s of protegidos)assert.deepEqual((await s.ref.get()).data(),s.data());
 assert.equal((await db.doc('privacidadeCasos/'+caso).get()).data().status,'executada');
 assert.equal((await api.conferir(db,caso,'suporte-ficticio')).status,'concluida');
 const c=(await db.doc('privacidadeCasos/'+caso).get()).data();assert.equal(c.status,'concluida');assert.equal(c.protocoloAcesso,pedido.solicitacao.protocolo);assert.equal(c.identificadores,undefined);
 assert.equal((await db.doc(prefix+'documentosTrabalhistas/prova').get()).exists,true);
 assert.equal((await api.executar(db,auth,{caso,operador:'suporte-ficticio',confirmar:true})).repetida,true);
 await t.test('cadastro trabalhista ligado a outro login não é removido',async()=>{
  const alvo='compartilhado_'+randomUUID(),fid='cadastro-compartilhado';
  await db.doc('contaSolicitacoes/'+alvo).set({uid:alvo,grupoId:grupo,funcionarioId:fid,status:'concluida'});
  await db.doc(prefix+'users/outro-ativo').set({ativo:true,funcionarioId:fid,role:'funcionario'});
  await assert.rejects(api.registrarCaso(db,auth,{...entrada,uid:alvo}),/outra conta/);
  assert.equal((await db.doc(prefix+'users/outro-ativo').get()).data().ativo,true);
 });
 await t.test('cliente comum, inclusive administrador do grupo, não acessa o caso privado',async()=>{
  const fs=require('node:fs');
  const resposta=await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${app.options.projectId}:securityRules`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({rules:{files:[{content:fs.readFileSync('firestore.rules','utf8')}]}})});
  assert.equal(resposta.ok,true,'regras do repositório carregadas só no projeto fictício isolado');
  const {initializeApp,deleteApp}=await import('firebase/app');
  const {getFirestore,connectFirestoreEmulator,getDoc,doc,terminate}=await import('firebase/firestore');
  const web=initializeApp({projectId:app.options.projectId,apiKey:'demo-key'},'privacidade-cliente'),b=getFirestore(web);
  const [host,porta]=process.env.FIRESTORE_EMULATOR_HOST.split(':');connectFirestoreEmulator(b,host,Number(porta));
  try{
   await assert.rejects(getDoc(doc(b,'privacidadeCasos',caso)),{code:'permission-denied'});
   const membro='admin-regras-'+randomUUID();
   await db.doc('vinculosUsuarios/'+membro).set({ativo:true,grupoId:grupo});
   await db.doc(prefix+'users/'+membro).set({ativo:true,role:'admin'});
   // Identidade simulada exclusivamente no SDK do emulador para testar regras.
   const webAdmin=initializeApp({projectId:app.options.projectId,apiKey:'demo-key'},'privacidade-cliente-admin'),bAdmin=getFirestore(webAdmin);
   connectFirestoreEmulator(bAdmin,host,Number(porta),{mockUserToken:{sub:membro}});
   try{
    assert.equal((await getDoc(doc(bAdmin,prefix+'users/'+membro))).exists(),true,'regras permitem ler o próprio perfil');
    await assert.rejects(getDoc(doc(bAdmin,'privacidadeCasos',caso)),{code:'permission-denied'});
   }finally{await terminate(bAdmin);await deleteApp(webAdmin);}
  }finally{await terminate(b);await deleteApp(web);}
 });
 await t.test('CLI real usa arquivo privado, prévia e confirmação; nenhum segredo no stdout',async()=>{
  const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
  const pasta=fs.mkdtempSync(path.join(os.tmpdir(),'ap1303-privacidade-'));
  assert.ok(path.resolve(pasta).startsWith(path.resolve(os.tmpdir())+path.sep));
  t.after(()=>{for(const f of fs.readdirSync(pasta))fs.unlinkSync(path.join(pasta,f));fs.rmdirSync(pasta);});
  if(process.platform==='win32'){
   execFileSync('powershell.exe',['-NoProfile','-Command',"$p=$env:AP1303_PRIVACIDADE_ARQUIVO;$a=Get-Acl -LiteralPath $p;$a.SetAccessRuleProtection($true,$false);foreach($sid in @([Security.Principal.WindowsIdentity]::GetCurrent().User,(New-Object Security.Principal.SecurityIdentifier('S-1-5-18')))){$a.SetAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow')))};Set-Acl -LiteralPath $p -AclObject $a"],{windowsHide:true,env:{...process.env,AP1303_PRIVACIDADE_ARQUIVO:pasta}});
  }else fs.chmodSync(pasta,0o700);
  const alvo='cli_'+randomUUID(),gid='grupo-cli';
  await db.doc('grupos/'+gid).set({ativo:true});
  await db.doc('contaSolicitacoes/'+alvo).set({uid:alvo,grupoId:gid,funcionarioId:alvo,status:'concluida'});
  await db.doc(`grupos/${gid}/financeiro/apagar`).set({funcionarioId:alvo,valor:7});
  const entradaPrivada=path.join(pasta,'entrada.json'),planoPrivado=path.join(pasta,'plano.json');
  const escrever=d=>fs.writeFileSync(entradaPrivada,JSON.stringify(d),{mode:0o600});
  const cli=(acao,saida)=>JSON.parse(execFileSync(process.execPath,['scripts/privacidade-conta.cjs',acao,entradaPrivada,...(saida?[saida]:[])],{env:{...process.env,GCLOUD_PROJECT:app.options.projectId},encoding:'utf8',timeout:30000}));
  escrever({...entrada,uid:alvo,grupoId:gid});const registrado=cli('registrar');
  escrever({caso:registrado.caso,operador:'suporte-ficticio'});
  let r;for(let n=0;n<10;n++){r=cli('inventariar');if(!r.continuar)break;}
  assert.equal(r.continuar,false);assert.equal(cli('previa',planoPrivado).previaGravada,true);
  const plano=JSON.parse(fs.readFileSync(planoPrivado,'utf8'));
  escrever({...plano,operador:'suporte-ficticio',confirmar:true,decisoes:decisoes(plano)});
  assert.equal(cli('executar').excluidos,1);assert.equal(cli('conferir').status,'concluida');
  assert.equal(cli('status').status,'concluida');assert.equal((await db.doc(`grupos/${gid}/financeiro/apagar`).get()).exists,false);
 });
});
