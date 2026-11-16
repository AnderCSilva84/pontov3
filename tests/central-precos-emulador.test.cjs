const test=require('node:test'),assert=require('node:assert/strict');
test('central: contribuição privada opcional, publicação mínima, deduplicação, retirada e lotes',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async t=>{
 assert.match(process.env.GCLOUD_PROJECT,/^demo-/);
 const admin=require('../functions/node_modules/firebase-admin');const app=admin.initializeApp({projectId:process.env.GCLOUD_PROJECT+'-central'}),root=app.firestore();t.after(()=>app.delete());
 const C=require('../functions/central-precos.cjs'),D=require('../functions/central-precos-dominio.cjs'),{bancoDoGrupo}=require('../functions/grupos-contexto.cjs');
 const bancos={a:bancoDoGrupo(root,'a'),b:bancoDoGrupo(root,'b')};
 for(const g of ['a','b']){
  await root.doc('grupos/'+g).set({ativo:true,cidade:'Fortaleza',uf:'CE'});
  for(const role of ['admin','funcionario','consulta']){const uid=g+role;await root.doc('vinculosUsuarios/'+uid).set({ativo:true,grupoId:g});await bancos[g].doc('users/'+uid).set({ativo:true,role,nome:'Pessoa fictícia',email:'ficticio@example.invalid'});}
  await bancos[g].doc('catalogoCompras/p').set({ativo:true,nome:'SUCO DEMO',marca:'DEMO',apresentacao:'GARRAFA 1L',unidadeCompra:'un'});
  await bancos[g].doc('supermercados/loja').set({ativo:true,nome:'LOJA DEMO',filial:'CENTRO',cidade:'Belém'});
 }
 const op=(acao,d={},g='a',role='admin',metricas)=>C.operarCentral(root,{auth:{uid:g+role},data:{acao,...d}},metricas);
 const canonico={tipo:'supermercado',nome:'SUCO DEMO',marca:'DEMO',variante:'UVA',embalagem:'GARRAFA 1L',unidadeComercial:'un',conteudo:1,unidadeMedida:'l'};
 const consulta={codigo:'1501402',uf:'PA',tipo:'supermercado',dias:30};
 const seed=async(g,id='l',extra={})=>{await bancos[g].doc('comprasListas/'+id).set({status:'finalizada',tipoCompra:'supermercado',origem:'cupom',cupomChave:'1'.repeat(44),emitenteCnpj:'11222333000181',descontoCentavos:0});await bancos[g].doc('comprasPrecos/'+id+'_p').set({listaId:id,itemId:'linha_1',linhaFiscal:1,produtoId:'p',supermercadoId:'loja',marca:'DEMO',nomeSnapshot:'SUCO DEMO',apresentacao:'GARRAFA 1L',unidadeCompra:'un',quantidadeComprada:2,precoUnitarioCentavos:600,compradoEm:admin.firestore.Timestamp.fromMillis(Date.now()-3600000),valido:true,cpf:'12345678900',observacao:'PRIVADO',...extra});};
 assert.equal((await op('configuracao')).ativo,false);await seed('a');const desligado={leituras:0,escritas:0};assert.equal((await C.processarFonte(bancos.a,'l_p',{metricas:desligado})).status,'desligado');assert.equal(desligado.escritas,0);
 await assert.rejects(op('configurar',{ativo:true,versao:0,aviso:D.AVISO},'a','funcionario'),{code:'permission-denied'});
 await assert.rejects(C.operarCentral(root,{data:{acao:'produtos',...consulta}}),{code:'unauthenticated'});
 assert.equal((await op('produtos',consulta,'b','consulta')).itens.length,0);
 const ids={};for(const g of ['a','b']){
  await op('configurar',{ativo:true,versao:0,aviso:D.AVISO},g);
  ids[g]=(await op('vincularProduto',{id:'p',produto:canonico,confirmado:true},g)).centralId;
  await op('confirmarLocal',{id:'loja',nome:'LOJA DEMO',filial:'CENTRO',cnpj:'11222333000181',codigo:'1501402',uf:'PA',confirmado:true},g);
 }
 assert.equal(ids.a,ids.b);
 await assert.rejects(op('confirmarLocal',{id:'loja',nome:'LOJA',filial:'CENTRO',cnpj:'11222333000181',codigo:'1501402',uf:'CE',confirmado:true}),{code:'invalid-argument'});
 const publicacao={leituras:0,escritas:0};assert.equal((await C.processarFonte(bancos.a,'l_p',{metricas:publicacao})).status,'publicada');
 const replay={leituras:0,escritas:0};await Promise.all([C.processarFonte(bancos.a,'l_p',{metricas:replay}),C.processarFonte(bancos.a,'l_p')]);assert.equal(replay.escritas,0);
 const medidas={leituras:0,escritas:0};let r=await op('consultar',{...consulta,produtoId:ids.a},'b','funcionario',medidas);assert.equal(r.itens.length,1);assert.equal(r.itens[0].municipio.nome,'Belém');assert.equal(r.itens[0].precoMedidaCentavos,600);
 const json=JSON.stringify(r);for(const segredo of ['12345678900','PRIVADO','ficticio@','cupomChave','grupoId','quantidadeComprada','listaId','precoId'])assert.ok(!json.includes(segredo));
 assert.deepEqual(Object.keys(r.itens[0]).sort(),['atualizadoMs','categoria','dataMs','estabelecimento','medida','municipio','precoCentavos','precoMedidaCentavos','produto'].sort());
 await seed('b');await C.processarFonte(bancos.b,'l_p');assert.equal((await root.collection('centralObservacoes').get()).size,1);
 // Desconto global: nem campo líquido avulso é prova. Compra privada intocada.
 await seed('a','desconto',{linhaFiscal:90,totalPagoItemCentavos:900});await bancos.a.doc('comprasListas/desconto').update({descontoCentavos:100});
 const antesDesconto=(await bancos.a.doc('comprasListas/desconto').get()).data();
 const impedido=await C.processarFonte(bancos.a,'desconto_p');assert.equal(impedido.status,'pendente');assert.match(impedido.motivo,/líquido/);
 const previaDesconto=await op('previaHistorico',{inicio:Date.now()-86400000,fim:Date.now()});assert.equal(previaDesconto.itens.find(x=>x.id==='desconto_p').apto,false);
 assert.deepEqual((await bancos.a.doc('comprasListas/desconto').get()).data(),antesDesconto);
 await bancos.a.doc('comprasListas/desconto').update({descontoCentavos:0});
 await C.eventoOrigem(root,'a','comprasListas','desconto',antesDesconto,{...antesDesconto,descontoCentavos:0},'evento-desconto');
 const lid=D.hash(['reconciliar',{campo:'listaId',id:'desconto'},'evento-desconto']);
 await C.eventoExecucao(root,root.doc('centralExecucoes/'+D.hash(['a',lid,'inicio'])));
 assert.equal((await bancos.a.doc('centralContribuicoes/desconto_p').get()).data().ativa,true);
 await bancos.a.doc('comprasPrecos/desconto_p').update({valido:false});await C.processarFonte(bancos.a,'desconto_p');

 // Outra categoria nunca participa, mesmo com consentimento.
 await seed('a','farmacia',{tipoCompra:'farmacia'});await bancos.a.doc('comprasListas/farmacia').update({tipoCompra:'farmacia'});assert.equal((await C.processarFonte(bancos.a,'farmacia_p')).status,'pendente');
 await assert.rejects(op('consultar',{...consulta,tipo:'pet',produtoId:ids.a}),{code:'invalid-argument'});
 // Corrigir/anular a origem retira apenas seu apoio, preservando a outra origem.
 await bancos.a.doc('comprasPrecos/l_p').update({valido:false});await C.processarFonte(bancos.a,'l_p');assert.equal((await root.collection('centralObservacoes').get()).size,1);
 await op('configurar',{ativo:false,versao:1},'b');assert.equal((await op('consultar',{...consulta,produtoId:ids.a})).itens.length,1);
 await op('criarLote',{id:'retirada',tipo:'retirada',confirmado:true},'b');await op('executarLote',{id:'retirada'},'b');assert.equal((await root.collection('centralObservacoes').get()).size,0);assert.equal((await bancos.b.doc('comprasListas/l').get()).data().status,'finalizada');
 // Histórico é apenas prévia até confirmar. Interrupção e revogação são persistidas.
 await bancos.a.doc('comprasPrecos/l_p').update({valido:true});const periodo={inicio:Date.now()-86400000,fim:Date.now()};
 let previa=await op('previaHistorico',periodo);assert.ok(previa.itens.some(p=>p.apto));assert.equal((await root.collection('centralObservacoes').get()).size,0);
 for(let i=0;i<12;i++){await seed('a','hist'+i,{itemId:'linha_'+(i+2),linhaFiscal:i+2});}
 await op('criarLote',{id:'historico',tipo:'historico',...periodo,fim:Date.now(),categorias:['supermercado'],confirmado:true});
 const lote=await op('executarLote',{id:'historico'});assert.equal(lote.status,'pendente');assert.equal(lote.processados,10);
 await op('configurar',{ativo:false,versao:1});await assert.rejects(op('executarLote',{id:'historico'}),{code:'failed-precondition'});assert.equal((await bancos.a.doc('centralLotes/historico').get()).data().status,'interrompido');
 await op('configurar',{ativo:true,versao:2,aviso:D.AVISO});await op('criarLote',{id:'historico2',tipo:'historico',...periodo,fim:Date.now(),categorias:['supermercado'],confirmado:true});
 let job=await op('executarLote',{id:'historico2'});while(job.status==='pendente')job=await op('executarLote',{id:'historico2'});assert.equal(job.status,'concluido');
 r=await op('consultar',{...consulta,produtoId:ids.a});assert.equal(r.itens.length,1);const detalhado=await op('historico',{...consulta,produtoId:ids.a,limite:2});assert.equal(detalhado.itens.length,2);assert.ok(detalhado.cursor);
 const pagina=await op('historico',{...consulta,produtoId:ids.a,limite:2,cursor:detalhado.cursor});assert.equal(pagina.itens.length,2);
 await assert.rejects(op('lotes',{},'b','funcionario'),{code:'permission-denied'});assert.equal((await op('lotes',{},'b')).itens.some(l=>l.id==='historico2'),false);
 await bancos.a.doc('comprasPrecos/l_p').delete();await C.processarFonte(bancos.a,'l_p');assert.equal((await bancos.a.doc('centralContribuicoes/l_p').get()).data().ativa,false);
 // Alterações de associação retiram a publicação e exigem revisão do item;
 // mesclagens/aliases privados não funcionam como uma união global.
 await bancos.a.doc('comprasAssociacoes/estado').set({itens:{hist0_p:{produtoId:'p',apresentacao:'GARRAFA 1L',unidadeCompra:'un',marca:'DEMO'}}});
 await C.eventoOrigem(root,'a','comprasAssociacoesOperacoes','op',null,{tipo:'corrigirItemProduto',precoId:'hist0_p'},'evento-correcao');
 assert.equal((await bancos.a.doc('centralContribuicoes/hist0_p').get()).data().ativa,false);
 await op('revisarItem',{id:'hist0_p',confirmado:true});assert.equal((await C.processarFonte(bancos.a,'hist0_p')).status,'publicada');
 // Localidade/identidade alterada é reconciliada por trabalho específico,
 // sem varrer preços de outros grupos; o evento pode ser repetido.
 await bancos.a.doc('centralLocais/loja').update({retirado:true});
 await C.eventoOrigem(root,'a','centralLocais','loja',{}, {retirado:true},'evento-local');
 const exec=(await root.collection('centralExecucoes').get()).docs[0];await C.eventoExecucao(root,exec.ref);await C.eventoExecucao(root,exec.ref);
 for(const e of (await root.collection('centralExecucoes').get()).docs)await C.eventoExecucao(root,e.ref);
 let pendentes=(await op('lotes')).itens.filter(x=>x.tipo==='reconciliar'&&x.status!=='concluido');for(const j of pendentes){let z=await op('executarLote',{id:j.id});if(z.status==='pendente')await op('executarLote',{id:j.id});}
 assert.equal((await root.collection('centralObservacoes').get()).size,0);
 assert.equal((await op('produtos',consulta)).itens.length,0);
 // Material de construção contribui com identidade própria e sem misturar a categoria.
 await bancos.a.doc('centralLocais/loja').update({retirado:false});
 await seed('a','construcao',{linhaFiscal:44,itemId:'linha_44',tipoCompra:'material_construcao'});await bancos.a.doc('comprasListas/construcao').update({tipoCompra:'material_construcao'});
 const construcao=(await op('vincularProduto',{id:'p',produto:{...canonico,tipo:'material_construcao'},confirmado:true})).centralId;
 assert.equal((await C.processarFonte(bancos.a,'construcao_p')).status,'publicada');
 assert.equal((await op('consultar',{...consulta,tipo:'material_construcao',produtoId:construcao})).itens.length,1);
 assert.equal((await op('consultar',{...consulta,produtoId:construcao})).itens.length,0);
 await bancos.a.doc('comprasPrecos/construcao_p').update({compradoEm:admin.firestore.Timestamp.fromMillis(Date.now()-80*86400000)});await C.processarFonte(bancos.a,'construcao_p');
 assert.equal((await op('consultar',{...consulta,tipo:'material_construcao',produtoId:construcao})).itens.length,0);
 assert.equal((await op('consultar',{...consulta,tipo:'material_construcao',produtoId:construcao,dias:90})).itens.length,1);
 await bancos.a.doc('supermercados/loja2').set({ativo:true,nome:'LOJA FICTÍCIA DOIS',filial:'SEGUNDA',cidade:'Belém'});
 await op('confirmarLocal',{id:'loja2',nome:'LOJA FICTÍCIA DOIS',filial:'SEGUNDA',cnpj:'11444777000161',codigo:'1501402',uf:'PA',confirmado:true});
 await seed('a','menor',{supermercadoId:'loja2',linhaFiscal:45,itemId:'linha_45',precoUnitarioCentavos:300,tipoCompra:'material_construcao'});await bancos.a.doc('comprasListas/menor').update({tipoCompra:'material_construcao',emitenteCnpj:'11444777000161',cupomChave:'2'.repeat(44)});await C.processarFonte(bancos.a,'menor_p');
 const menor=await op('consultar',{...consulta,tipo:'material_construcao',produtoId:construcao,dias:90,ordem:'menor',limite:1});assert.equal(menor.itens[0].precoCentavos,300);assert.ok(menor.cursor);
 const segundo=await op('consultar',{...consulta,tipo:'material_construcao',produtoId:construcao,dias:90,ordem:'menor',limite:1,cursor:menor.cursor});assert.equal(segundo.itens[0].precoCentavos,600);
 await t.test('regras negam escrita/leitura direta inclusive para administrador',async()=>{
  const {initializeApp,deleteApp}=await import('firebase/app'),{getAuth,connectAuthEmulator,createUserWithEmailAndPassword,signOut}=await import('firebase/auth'),{getFirestore,connectFirestoreEmulator,setDoc,getDoc,doc,terminate}=await import('firebase/firestore');
  const c=initializeApp({projectId:process.env.GCLOUD_PROJECT,apiKey:'demo-key',authDomain:'localhost'},'central-regras'),a=getAuth(c),f=getFirestore(c);connectAuthEmulator(a,'http://'+process.env.FIREBASE_AUTH_EMULATOR_HOST,{disableWarnings:true});const [host,porta]=process.env.FIRESTORE_EMULATOR_HOST.split(':');connectFirestoreEmulator(f,host,Number(porta));
  const u=(await createUserWithEmailAndPassword(a,'central-regra@example.invalid','SenhaFicticia123!')).user;const appRegras=admin.initializeApp({projectId:process.env.GCLOUD_PROJECT},'central-admin-regras'),base=appRegras.firestore();
  await base.doc('users/'+u.uid).set({ativo:true,role:'admin'});assert.equal((await getDoc(doc(f,'users',u.uid))).data().role,'admin');
  try{for(const path of ['centralObservacoes/x','centralResumos/x/estabelecimentos/x','centralProdutos/x','centralLimites/x','centralCursores/x/paginas/0','centralConfiguracao/consentimento','centralLotes/x','grupos/a/centralContribuicoes/x','grupos/a/centralLocais/x']){await assert.rejects(setDoc(doc(f,path),{ativo:true}),/permission/i);await assert.rejects(getDoc(doc(f,path)),/permission/i);}}
  finally{await signOut(a);await terminate(f);await deleteApp(c);await appRegras.delete();}
 });
 await t.test('gestão privada exige compartilhamento; catálogo agregado continua disponível',async()=>{
  const db=bancoDoGrupo(root,'comercial'),titular='central_titular',membro='central_admin_antigo';
  await root.doc('grupos/comercial').set({ativo:true,assinaturasAtivas:true,titularUid:titular});
  for(const uid of [titular,membro]){
   await root.doc('vinculosUsuarios/'+uid).set({ativo:true,grupoId:'comercial'});
   await db.doc('users/'+uid).set({ativo:true,role:'admin'});
  }
  const chamar=(acao,uid=membro,d={})=>C.operarCentral(root,{auth:{uid},data:{acao,...d}});
  for(const acao of ['configuracao','revisarLocais','lotes'])await assert.rejects(chamar(acao),{code:'failed-precondition'});
  await assert.rejects(chamar('configurar',membro,{ativo:true,versao:0,aviso:D.AVISO}),{code:'failed-precondition'});
  assert.equal((await db.doc('centralConfiguracao/consentimento').get()).exists,false);
  assert.equal((await chamar('configuracao',titular)).ativo,false);
  assert.ok(Array.isArray((await chamar('produtos',membro,consulta)).itens));
  const assinatura=root.doc('assinaturasGrupos/comercial');
  await assinatura.set({versao:1,verificado:true,provedor:'google_play',plano:'prata',estado:'ativo',inicioEm:Date.now()-1000,validoAte:Date.now()+600000});
  assert.equal((await chamar('configuracao')).ativo,false);
  await db.doc('users/'+membro).update({acessoCompartilhado:false});
  await assert.rejects(chamar('configuracao'),{code:'failed-precondition'});
  // A autorização precisa ser relida dentro da escrita, não só na entrada callable.
  await db.doc('users/'+membro).update({acessoCompartilhado:true});
  let transacoes=0;
  const concorrente=new Proxy(root,{get(base,k){
   if(k==='runTransaction')return async(fn,...args)=>{
    if(++transacoes===2)await db.doc('users/'+membro).update({acessoCompartilhado:false});
    return base.runTransaction(fn,...args);
   };
   const v=base[k];return typeof v==='function'?v.bind(base):v;
  }});
  await assert.rejects(C.operarCentral(concorrente,{auth:{uid:membro},data:{acao:'configurar',ativo:true,versao:0,aviso:D.AVISO}}),{code:'failed-precondition'});
  assert.equal((await db.doc('centralConfiguracao/consentimento').get()).exists,false);
  await db.doc('users/'+membro).update({acessoCompartilhado:true});await assinatura.update({validoAte:Date.now()-1});
  await assert.rejects(chamar('configuracao'),{code:'failed-precondition'});
  await root.doc('grupos/comercial').update({assinaturasAtivas:false});
  assert.equal((await chamar('configuracao')).ativo,false);
 });
 console.log('Métricas de código (não faturamento): '+JSON.stringify({desligado,publicacao,replay,consulta:medidas}));
});
