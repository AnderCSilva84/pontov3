const { exigirOperacaoCompartilhada } = require('./compartilhamento.cjs');
const contextoCatalogo=require('./catalogo-contexto.cjs');
const {tipoCompra,validarTipoCompra}=require('./compras-tipo.cjs');
const {HttpsError}=require('firebase-functions/v2/https');
const {FieldValue}=require('firebase-admin/firestore');
const {createHash}=require('node:crypto');
const falha=(c,m)=>{throw new HttpsError(c,m);};
const id=v=>typeof v==='string'&&/^[\w-]{1,128}$/.test(v);
const refMapa=db=>db.doc('comprasAssociacoes/estado');
const vazio=()=>({versao:0,vinculos:{},nomes:{},itens:{}});
function raiz(m,id){return m.vinculos?.[id]||id;}
function estado(p){return {tiposCompra:contextoCatalogo.tiposProduto(p),principalId:p.principalId||'',membrosIds:p.membrosIds||[],ultimaMesclaId:p.ultimaMesclaId||''};}
async function lerMapa(db){return (await refMapa(db).get()).data()||vazio();}
function conferirTamanho(m){if(Object.keys(m.vinculos).length>500||Object.keys(m.itens).length>500||Buffer.byteLength(JSON.stringify(m))>500000)falha('resource-exhausted','Limite de associações deste grupo atingido. Solicite revisão assistida.');}
async function operarAssociacoes(db,request){
 const d=request.data||{},contexto=validarTipoCompra(d.tipoCompra),uid=request.auth?.uid;if(!uid)falha('unauthenticated','Entre no app.');
 const lib=await import('./produtos-identidade.mjs'),{politicaMesclaManual}=await import('./mescla-politica.mjs');
 const assinaturaMescla=produtos=>createHash('sha256').update(JSON.stringify({contexto,produtos:[...produtos].sort((a,b)=>a.id.localeCompare(b.id))},(_chave,valor)=>valor&&typeof valor==='object'&&!Array.isArray(valor)?Object.fromEntries(Object.keys(valor).sort().map(k=>[k,valor[k]])):valor)).digest('hex');
 return db.runTransaction(async tx=>{
    await exigirOperacaoCompartilhada(tx, db, uid);
  const perfil=(await tx.get(db.doc('users/'+uid))).data();if(perfil?.ativo===false||perfil?.role!=='admin')falha('permission-denied','Somente administradores podem revisar associações.');
  const mr=refMapa(db),m=(await tx.get(mr)).data()||vazio();m.itens||={};m.nomes||={};m.vinculos||={};
  if(d.operacao==='catalogoParecidosPagina'){
   if(d.cursor!==undefined&&!id(d.cursor))falha('invalid-argument','Cursor de catálogo inválido.');
   let q=db.collection('catalogoCompras').orderBy('__name__');if(d.cursor)q=q.startAfter(d.cursor);
   const snap=await tx.get(q.limit(101)),pagina=snap.docs.slice(0,100);
   const elegiveis=[];for(const s of pagina){const p=s.data();if(p.ativo===false||p.excluidoEm||m.vinculos?.[s.id]||p.principalId)continue;if(await contextoCatalogo.compativel(tx,db,{...p,id:s.id},contexto))elegiveis.push(s);}
   const produtos=elegiveis.map(s=>{const p=s.data(),texto=v=>typeof v==='string'?v:'';return {id:s.id,nome:texto(p.nome),marca:texto(p.marca),apresentacao:texto(p.apresentacao),unidadeCompra:texto(p.unidadeCompra),gtin:typeof p.gtin==='number'&&Number.isSafeInteger(p.gtin)?String(p.gtin):texto(p.gtin),principioAtivo:texto(p.principioAtivo),dosagem:texto(p.dosagem),aliasesNomes:Array.isArray(p.aliasesNomes)?p.aliasesNomes.filter(v=>typeof v==='string').slice(0,20):[],tiposCompra:contextoCatalogo.tiposProduto(p),contextoComprovado:contexto,principalId:m.vinculos?.[s.id]||p.principalId||'',...(m.identidades?.[s.id]?{identidadeComparacao:m.identidades[s.id]}:{})};});
   return {produtos,examinados:pagina.length,cursor:snap.size>100?pagina.at(-1).id:null,versao:m.versao||0};
  }
  if(d.operacao==='mesclasListar'){

   if(d.cursor!==undefined&&!id(d.cursor))falha('invalid-argument','Cursor inválido.');
   let q=db.collection('comprasAssociacoesOperacoes').orderBy('__name__');if(d.cursor)q=q.startAfter(d.cursor);
   const s=await tx.get(q.limit(21));return {versao:m.versao,itens:s.docs.slice(0,20).map(x=>({id:x.id,...x.data()})),cursor:s.size>20?s.docs[19].id:null};
  }
  if(d.operacao==='mesclaPrevia'){
   if(!Array.isArray(d.produtoIds)||d.produtoIds.length<2||d.produtoIds.length>20||d.produtoIds.some(v=>!id(v))||!id(d.principalId)||!d.produtoIds.includes(d.principalId))falha('invalid-argument','Selecione de 2 a 20 produtos e o principal.');
   const roots=new Set(d.produtoIds.map(v=>raiz(m,v))),ids=[...new Set([...d.produtoIds,...roots,...Object.keys(m.vinculos).filter(k=>roots.has(m.vinculos[k]))])].sort();if(ids.length>20)falha('resource-exhausted','Uma associação pode reunir até 20 cadastros.');
   const snaps=await tx.getAll(...ids.map(v=>db.doc('catalogoCompras/'+v)));if(snaps.some(s=>!s.exists))falha('not-found','Produto não encontrado neste grupo.');
   const produtos=snaps.map(s=>({id:s.id,...s.data()})),principal=produtos.find(p=>p.id===d.principalId);
   for(const p of produtos)await contextoCatalogo.exigirCompativel(tx,db,p,contexto);
   const politica=politicaMesclaManual(produtos,principal.id,contexto),{conflitos}=politica;
   const amostra=[];for(const p of produtos){const s=await tx.get(db.collection('comprasPrecos').where('produtoId','==',p.id).limit(6));amostra.push({produtoId:p.id,aoMenos:s.size,limitada:s.size===6,registros:s.docs.slice(0,5).map(r=>({id:r.id,...r.data()}))});}
   return {versao:m.versao,produtoIds:ids,principalId:d.principalId,produtos,...politica,assinatura:assinaturaMescla(produtos),amostra,escopo:'Até 5 observações por cadastro, sem contagem total. Não altera notas, quantidades ou valores.'};
  }
  if(!id(d.operacaoId))falha('invalid-argument','Identificador da operação inválido.');
  const opRef=db.doc('comprasAssociacoesOperacoes/'+d.operacaoId),anterior=(await tx.get(opRef)).data();
  const hash=createHash('sha256').update(JSON.stringify(d)).digest('hex');if(anterior){if(anterior.uid!==uid||anterior.hash!==hash)falha('already-exists','Este identificador já possui outra operação.');if(anterior.resultado.catalogoAtualizado){const atuais=await tx.getAll(...anterior.resultado.catalogoIds.map(id=>db.doc('catalogoCompras/'+id)));return {...anterior.resultado,catalogoAtualizado:atuais.filter(s=>s.exists).map(s=>({...s.data(),id:s.id})),versao:m.versao,associacoes:require('./compras-correspondencias.cjs').publico(m)};}return anterior.resultado.associacoes?{...anterior.resultado,versao:m.versao,associacoes:require('./compras-correspondencias.cjs').publico(m)}:anterior.resultado;}
  if(d.operacao!=='aliasCatalogo'&&d.versao!==m.versao)falha('aborted','As associações mudaram. Atualize a prévia.');
  const agora=FieldValue.serverTimestamp(),auditoria={uid,nomeAutor:perfil.nome||'',criadaEm:agora,hash,tipo:d.operacao};
  if(d.operacao==='mesclarProdutos'){
   if(d.confirmado!==true||!id(d.principalId)||!Array.isArray(d.produtoIds)||d.produtoIds.length<2||d.produtoIds.length>20||new Set(d.produtoIds).size!==d.produtoIds.length||d.produtoIds.some(v=>!id(v))||!d.produtoIds.includes(d.principalId))falha('invalid-argument','Confirme de 2 a 20 cadastros e o produto principal.');
   const selecionados=new Set(d.produtoIds),roots=new Set(d.produtoIds.map(v=>raiz(m,v)));
   if([...Object.keys(m.vinculos),...roots].some(k=>roots.has(raiz(m,k))&&!selecionados.has(k)))falha('failed-precondition','Inclua todos os membros da associação na prévia.');
   const snaps=await tx.getAll(...d.produtoIds.map(v=>db.doc('catalogoCompras/'+v)));if(snaps.some(s=>!s.exists||s.data().ativo===false))falha('not-found','Produto indisponível neste grupo.');
   for(const p of snaps)await contextoCatalogo.exigirCompativel(tx,db,{...p.data(),id:p.id},contexto);
   const produtos=snaps.map(s=>({...s.data(),id:s.id})),principal=snaps.find(s=>s.id===d.principalId).data(),politica=politicaMesclaManual(produtos,d.principalId,contexto),conflitos=politica.conflitos.map(c=>c.mensagem);
   if(conflitos.length&&(politica.bloqueada||d.aceitarVariacoes!==true))falha('failed-precondition','Confira as diferenças e confirme reunir as variações: '+[...new Set(conflitos)].join('; '));
   if(d.aceitarVariacoes===true&&d.assinatura!==assinaturaMescla(produtos))falha('aborted','Os cadastros mudaram. Abra uma nova prévia e confira as diferenças.');
   if(d.aceitarVariacoes===true){auditoria.variacoesConfirmadas=politica.conflitos;auditoria.aceitarVariacoes=true;}
   const antes=Object.fromEntries(snaps.map(s=>[s.id,estado(s.data())])),ids=[...d.produtoIds].sort();
   if(m.identidades){auditoria.identidadesAntes=Object.fromEntries(ids.map(v=>[v,m.identidades[v]||null]));auditoria.nomesAntes=Object.fromEntries(ids.map(v=>[v,m.nomes[v]||null]));for(const id of ids)delete m.identidades[id];}
   for(const s of snaps){const dados=s.id===d.principalId?{principalId:'',membrosIds:ids.filter(x=>x!==s.id)}:{principalId:d.principalId,membrosIds:[]};tx.update(s.ref,{...dados,tiposCompra:s.id===d.principalId?[...new Set([contexto,...snaps.flatMap(x=>contextoCatalogo.tiposProduto(x.data()))])]:contextoCatalogo.tiposProduto(s.data()),ultimaMesclaId:d.operacaoId});if(s.id===d.principalId)delete m.vinculos[s.id];else m.vinculos[s.id]=d.principalId;}
   const catalogoAtualizado=produtos.map(p=>({...p,principalId:p.id===d.principalId?'':d.principalId,membrosIds:p.id===d.principalId?ids.filter(id=>id!==p.id):[],tiposCompra:p.id===d.principalId?[...new Set([contexto,...snaps.flatMap(x=>contextoCatalogo.tiposProduto(x.data()))])]:contextoCatalogo.tiposProduto(p),ultimaMesclaId:d.operacaoId}));
   auditoria.origem='manual';auditoria.tipoCompra=contexto;
   m.nomes[d.principalId]=principal.nome;m.versao++;conferirTamanho(m);const resultado={ok:true,tipoCompra:contexto,catalogoAtualizado,catalogoIds:ids,associacoes:require('./compras-correspondencias.cjs').publico(m),versao:m.versao,principalId:d.principalId};tx.set(mr,m);tx.create(opRef,{...auditoria,antes,produtoIds:ids,principalId:d.principalId,resultado});return resultado;
  }
  if(d.operacao==='desfazerMescla'){
   if(!id(d.mesclaId)||d.confirmado!==true)falha('invalid-argument','Confirme qual mesclagem desfazer.');
   const originalRef=db.doc('comprasAssociacoesOperacoes/'+d.mesclaId),original=(await tx.get(originalRef)).data();if(!original||original.tipo!=='mesclarProdutos')falha('not-found','Mesclagem não encontrada neste grupo.');
   if(original.desfeitaPor)falha('failed-precondition','Esta mesclagem já foi desfeita.');
   const snaps=await tx.getAll(...original.produtoIds.map(v=>db.doc('catalogoCompras/'+v)));
   if(snaps.some(s=>!s.exists||s.data().ultimaMesclaId!==d.mesclaId))falha('failed-precondition','Há mesclagem posterior. Desfaça primeiro a mais recente.');
   for(const s of snaps){const antes=original.antes[s.id];tx.update(s.ref,antes);if(antes.principalId)m.vinculos[s.id]=antes.principalId;else delete m.vinculos[s.id];}
   for(const [id,valor]of Object.entries(original.aliasesAntes||{}))tx.update(db.doc('catalogoCompras/'+id),{aliasesNomes:valor===null?FieldValue.delete():valor});
   if(original.identidadesAntes){m.identidades||={};for(const [id,valor]of Object.entries(original.identidadesAntes)){if(valor)m.identidades[id]=valor;else delete m.identidades[id];}for(const [id,valor]of Object.entries(original.nomesAntes||{})){if(valor)m.nomes[id]=valor;else delete m.nomes[id];}}
   const catalogoAtualizado=snaps.map(s=>{const p={...s.data(),...original.antes[s.id],id:s.id};if(Object.hasOwn(original.aliasesAntes||{},s.id)){if(original.aliasesAntes[s.id]===null)delete p.aliasesNomes;else p.aliasesNomes=original.aliasesAntes[s.id];}return p;});
   m.versao++;const resultado={ok:true,versao:m.versao,...(['comparacao','pente_fino','manual'].includes(original.origem)?{catalogoAtualizado,tipoCompra:original.tipoCompra||contexto,catalogoIds:original.produtoIds,associacoes:require('./compras-correspondencias.cjs').publico(m)}:{})};tx.set(mr,m);tx.update(originalRef,{desfeitaPor:uid,desfeitaEm:agora});tx.create(opRef,{...auditoria,mesclaId:d.mesclaId,resultado});return resultado;
  }
  if(d.operacao==='aliasCatalogo'){
   if(!id(d.produtoId)||typeof d.descricao!=='string'||d.descricao.trim().length<2||d.descricao.length>200||d.confirmado!==true)falha('invalid-argument','Confirme a descrição alternativa.');
   const pr=db.doc('catalogoCompras/'+d.produtoId),produto=(await tx.get(pr)).data();if(!produto||produto.ativo===false)falha('not-found','Produto não encontrado.');
   await contextoCatalogo.exigirCompativel(tx,db,{...produto,id:d.produtoId},contexto);
   if(lib.conflitosProdutos({nome:d.descricao,apresentacao:d.apresentacao||'',unidadeCompra:d.unidadeCompra||'',marca:d.marca||''},produto).length)falha('failed-precondition','Descrição incompatível com o cadastro.');
   const aliases=[...new Set([...(produto.aliasesNomes||[]),d.descricao.trim()])];if(aliases.length>20)falha('resource-exhausted','Limite de 20 descrições alternativas por produto.');
   tx.update(pr,{aliasesNomes:aliases});const resultado={ok:true};tx.create(opRef,{...auditoria,produtoId:d.produtoId,descricao:d.descricao,resultado});return resultado;
  }
  if(d.operacao==='corrigirItemProduto'||d.operacao==='corrigirAliasProduto'){
   if(!id(d.precoId)||!id(d.produtoId)||d.confirmado!==true||typeof d.justificativa!=='string'||d.justificativa.trim().length<5||d.justificativa.length>300)falha('invalid-argument','Confirme o produto e informe uma justificativa.');
   const preco=(await tx.get(db.doc('comprasPrecos/'+d.precoId))).data(),produto=(await tx.get(db.doc('catalogoCompras/'+d.produtoId))).data();if(!preco||!produto||produto.ativo===false)falha('not-found','Registro ou produto não encontrado neste grupo.');
   await contextoCatalogo.exigirCompativel(tx,db,{...produto,id:d.produtoId},tipoCompra(preco));
   if(lib.conflitosProdutos({nome:preco.nomeOriginalFiscal||preco.nomeOriginal||preco.nomeSnapshot,apresentacao:preco.origem==='cupom'?'':preco.apresentacao,unidadeCompra:preco.unidadeCompra,marca:preco.marca},produto).length)falha('failed-precondition','Apresentação, unidade ou identidade incompatível.');
   const anteriorProduto=m.itens[d.precoId]||preco.produtoId;
   m.nomes[d.produtoId]=produto.nome;
   if(d.operacao==='corrigirItemProduto')m.itens[d.precoId]={produtoId:d.produtoId,apresentacao:produto.apresentacao,unidadeCompra:produto.unidadeCompra,marca:produto.marca||preco.marca||''};
   else {
    if(!preco.nomeOriginalFiscal&&!preco.nomeOriginal)falha('failed-precondition','Este registro não possui descrição fiscal original para criar alias.');
    const lista=(await tx.get(db.doc('comprasListas/'+preco.listaId))).data();
    const chaveFiscal=preco.aliasFiscal|| (lista?.emitenteCnpj&&preco.codigoFiscal?require('./cupom-dominio.cjs').chaveAlias(lista.emitenteCnpj,{codigo:preco.codigoFiscal,nomeOriginal:preco.nomeOriginalFiscal||preco.nomeOriginal,unidadeOriginal:preco.unidadeOriginalFiscal}):null);
    if(!chaveFiscal)falha('failed-precondition','Referência fiscal incompleta; não será criado alias amplo por nome.');
    const ar=db.doc('comprasAliases/'+contextoCatalogo.aliasNoTipo(tipoCompra(preco),chaveFiscal));
    const antigo=(await tx.get(ar)).data()||null;
    tx.set(ar,{...antigo,produtoId:d.produtoId,descricaoOriginal:preco.nomeOriginalFiscal||preco.nomeOriginal,unidadeCompra:preco.unidadeCompra,atualizadaPor:uid,atualizadaEm:agora});
    auditoria.aliasAnterior=antigo;auditoria.aliasId=ar.id;
   }
   m.versao++;conferirTamanho(m);const resultado={ok:true,versao:m.versao};tx.set(mr,m);tx.create(opRef,{...auditoria,precoId:d.precoId,produtoId:d.produtoId,anteriorProduto,justificativa:d.justificativa.trim(),resultado});return resultado;
  }
  falha('invalid-argument','Operação de associação inválida.');
 });
}
function aplicarAssociacoes(registros,m){const vistos=new Set();return registros.filter(r=>!vistos.has(r.id)&&vistos.add(r.id)).map(r=>{const correcao=m.itens?.[r.id],associado=correcao?.produtoId||r.produtoId,principal=raiz(m,associado);return {...r,...(correcao||{}),apresentacaoOriginal:r.apresentacao,produtoOriginalId:r.produtoId,produtoId:principal,nomeCanonico:m.nomes?.[principal]||r.nomeSnapshot,associacaoCorrigida:!!m.itens?.[r.id],...(m.identidades?.[principal]?{identidadeComparacao:m.identidades[principal]}:{})};});}
module.exports={operarAssociacoes,lerMapa,aplicarAssociacoes};
