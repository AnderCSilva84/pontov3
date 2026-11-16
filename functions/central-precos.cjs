const {FieldValue}=require('firebase-admin/firestore');
const {bancoDoUsuario,bancoDoGrupo}=require('./grupos-contexto.cjs');
const D=require('./central-precos-dominio.cjs');
const {exigirConsultaCompartilhada,exigirOperacaoCompartilhada}=require('./compartilhamento.cjs');
const config=db=>db.doc('centralConfiguracao/consentimento');
const grupo=db=>db.grupoId||'legado';
const raiz=db=>db.raiz||db;
const metrica=m=>{
 const leituras=new WeakMap();
 return {get:async(tx,r)=>{let cache=leituras.get(tx);if(!cache){cache=new Map();leituras.set(tx,cache);}const chave=typeof r.collection==='function'?r.path:null;if(chave&&cache.has(chave))return cache.get(chave);const s=await tx.get(r);if(m)m.leituras+=(s.docs?Math.max(1,s.size):1);if(chave)cache.set(chave,s);return s;},set:(tx,r,d)=>{if(m)m.escritas++;tx.set(r,d);},del:(tx,r)=>{if(m)m.escritas++;tx.delete(r);}};
};
function intervalo(d){const fim=Date.now(),dias=d.dias??30;if(!Number.isInteger(dias)||dias<1||dias>3650)D.erro('Escolha de 1 a 3650 dias.');return {inicio:fim-dias*86400000,fim,dias};}
function limite(d){const n=d.limite??20;if(!Number.isInteger(n)||n<1||n>40)D.erro('Página deve ter de 1 a 40 resultados.');return n;}
const fonteRef=(db,id)=>db.doc('centralContribuicoes/'+id);

async function avaliar(tx,db,precoId,M){
 let p=(await M.get(tx,db.doc('comprasPrecos/'+precoId))).data();
 if(!p)return {motivo:'Observação removida'};
 const lista=D.id(p.listaId)?(await M.get(tx,db.doc('comprasListas/'+p.listaId))).data():null;
 if(!lista||lista.status!=='finalizada'||p.valido===false)return {motivo:'Compra não confirmada ou anulada',p};
 const tipo=lista.tipoCompra||'supermercado';
 if(!D.TIPOS.includes(tipo)||(p.tipoCompra||'supermercado')!==tipo)return {motivo:'Categoria não elegível ou divergente',p};
 if(!D.id(p.produtoId)||!D.id(p.supermercadoId))return {motivo:'Produto ou estabelecimento sem referência',p};
 const correcoes=(await M.get(tx,db.doc('comprasAssociacoes/estado'))).data(),correcao=correcoes?.itens?.[precoId];
 if(correcao){const revisao=(await M.get(tx,db.doc('centralItens/'+precoId))).data();if(!revisao||revisao.assinatura!==D.hash(correcao))return {motivo:'Associação do item corrigida: revisar vínculo específico',p};p={...p,...correcao};}
 const [produto,vinculo,local]=await Promise.all([
  M.get(tx,db.doc('catalogoCompras/'+p.produtoId)),M.get(tx,db.doc('centralVinculos/'+p.produtoId)),M.get(tx,db.doc('centralLocais/'+p.supermercadoId))]);
 const pr=produto.data(),v=vinculo.data(),l=local.data();
 if(!pr||!v||v.retirado||v.assinatura!==D.identidadePrivada(pr)||v.tipo!==tipo||pr.unidadeCompra!==p.unidadeCompra)return {motivo:'Correspondência do produto pendente de revisão',p};
 if((p.apresentacao||'')!==(pr.apresentacao||''))return {motivo:'Apresentação da compra difere do cadastro revisado',p};
 if(!l||l.retirado)return {motivo:'CNPJ comercial e município da filial pendentes de confirmação',p};
 const mercado=(await M.get(tx,db.doc('supermercados/'+p.supermercadoId))).data();
 if(!mercado||mercado.ativo===false||l.assinatura!==D.hash([mercado.nome,mercado.filial,mercado.cidade]))return {motivo:'Estabelecimento alterado: confirmar novamente',p};
 if(lista.emitenteCnpj&&lista.emitenteCnpj!==l.cnpj)return {motivo:'CNPJ da nota diferente da filial confirmada',p};
 const canonico=(await M.get(tx,raiz(db).doc('centralProdutos/'+v.centralId))).data();
 if(!canonico||canonico.tipo!==tipo||canonico.unidadeComercial!==p.unidadeCompra)return {motivo:'Apresentação comercial incompatível',p};
 if(p.marca&&p.marca.toLocaleUpperCase('pt-BR')!==canonico.marca.toLocaleUpperCase('pt-BR'))return {motivo:'Marca da compra difere da especificação revisada',p};
 const valor=D.precoPago(p,lista),data=D.instante(p.compradoEm);
 if(valor===null)return {motivo:'Preço líquido por item não comprovado; desconto global não será rateado',p};
 if(!Number.isFinite(data)||data>Date.now()+60000||data<Date.UTC(2000,0,1))return {motivo:'Data da compra inválida',p};
 let origem=['manual',grupo(db),precoId];
 if(lista.origem==='cupom'){
  const linha=p.linhaFiscal??p.itemId?.match(/(?:^|_)linha_(\d+)$/)?.[1];
  if(!/^\d{44}$/.test(lista.cupomChave||'')||!linha)return {motivo:'Linha fiscal original ausente: deduplicação entre grupos não comprovada',p};
  origem=['fiscal',lista.cupomChave,String(linha)];
 }
 const municipio=D.cidade(l.codigo,l.uf),bucketId=`${municipio.codigo}_${tipo}_${v.centralId}`,lojaId=D.hash([l.cnpj,municipio.codigo]),resumoId=D.hash([bucketId,lojaId]);
 const medida=['kg','l'].includes(p.unidadeCompra)?p.unidadeCompra:canonico.conteudo?canonico.unidadeMedida:null;
 const civil=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Fortaleza',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(data));
 // Publicar somente o dia, nunca o horário preciso da compra. A ordenação
 // exata permanece interna, inclusive para duas compras na mesma data.
 const dados={produto:canonico,categoria:tipo,precoCentavos:valor,precoMedidaCentavos:medida?(p.unidadeCompra==='un'?valor/canonico.conteudo:valor):null,medida,estabelecimento:{nome:l.nome,filial:l.filial},municipio,dataMs:Date.parse(civil+'T00:00:00-03:00'),atualizadoMs:Date.now()};
 return {p,dados:D.publicacao(dados),instanteMs:data,observacaoId:D.hash(origem),bucketId,lojaId,resumoId,centralId:v.centralId,assinatura:D.hash([origem,v.centralId,l,valor,data,tipo])};
}

// Releitura transacional da origem atual: eventos repetidos/fora de ordem não
// reaplicam payload antigo. Todos os reads precedem as escritas.
async function processarFonte(db,precoId,{retirar=false,versaoConsentimento,metricas,uidAutorizado}={}){
 if(!D.id(precoId))D.erro('Referência inválida.');const root=raiz(db),M=metrica(metricas);
 return root.runTransaction(async tx=>{
  if(uidAutorizado)await exigirOperacaoCompartilhada(tx,db,uidAutorizado);
  const consent=(await M.get(tx,config(db))).data();
  if(!consent)return {status:'desligado'};
  if(versaoConsentimento!==undefined&&((retirar?consent.ativo:!consent.ativo)||consent.versao!==versaoConsentimento))D.erro('A contribuição mudou. Prepare um novo lote para este aceite.','failed-precondition');
  if(retirar&&consent.ativo)D.erro('Desative a contribuição antes de retirar.','failed-precondition');
  const fr=fonteRef(db,precoId),anterior=(await M.get(tx,fr)).data();
  if(retirar&&!anterior?.ativa)return {status:'retirada'};
  const aval=retirar?{motivo:'Retirada solicitada'}:await avaliar(tx,db,precoId,M);
  if(!consent.ativo&&!retirar&&!anterior?.ativa)return {status:'desligado'};
  if(!consent.ativo&&!retirar&&aval.assinatura===anterior?.assinatura)return {status:'preservada'};
  if(!consent.ativo&&!retirar)aval.dados=null;
  if(!aval.dados&&!anterior?.ativa&&anterior?.motivo===aval.motivo)return {status:'pendente',motivo:aval.motivo};
  if(aval.dados&&anterior?.ativa&&anterior.assinatura===aval.assinatura)return {status:'publicada'};
  const sid=D.hash([grupo(db),precoId]),ids=[...new Set([anterior?.observacaoId,aval.dados?aval.observacaoId:null].filter(Boolean))],observacoes=new Map(),apoios=new Map();
  for(const oid of ids){
   observacoes.set(oid,(await M.get(tx,root.doc('centralObservacoes/'+oid))).data());
   const s=await M.get(tx,root.collection('centralObservacoes/'+oid+'/apoios').limit(21));
   apoios.set(oid,s.docs.filter(x=>x.id!==sid).map(x=>x.data()));
  }
  if(aval.dados){const outros=apoios.get(aval.observacaoId)||[];if(outros.length>=20||outros.some(x=>x.bucketId!==aval.bucketId)){aval.dados=null;aval.motivo='Linha fiscal com identidade divergente ou limite de origens: revisão necessária';}}
  const substitutos=new Map(),resumos=new Map();
  for(const oid of ids){
   const restantes=[...(apoios.get(oid)||[])];if(aval.dados&&oid===aval.observacaoId)restantes.push({dados:aval.dados,instanteMs:aval.instanteMs,bucketId:aval.bucketId,lojaId:aval.lojaId,resumoId:aval.resumoId,centralId:aval.centralId});
   restantes.sort((a,b)=>b.instanteMs-a.instanteMs||D.hash(a.dados).localeCompare(D.hash(b.dados)));
   const escolhido=restantes[0]||null;substitutos.set(oid,escolhido);
   for(const o of [observacoes.get(oid),escolhido])if(o)resumos.set(o.resumoId,o);
  }
  const recomposicoes=[];
  for(const [rid,o]of resumos){
   const existentes=await M.get(tx,root.collection('centralObservacoes').where('resumoId','==',rid).orderBy('dataMs','desc').limit(3));
   const candidatos=existentes.docs.filter(x=>!substitutos.has(x.id)).map(x=>x.data());
   for(const v of substitutos.values())if(v?.resumoId===rid)candidatos.push({...v,dataMs:v.instanteMs});
   candidatos.sort((a,b)=>b.dataMs-a.dataMs);recomposicoes.push({o,valor:candidatos[0]||null});
  }
  const catalogos=[];
  for(const bucket of new Set(recomposicoes.map(x=>x.o.bucketId))){
   const alterados=recomposicoes.filter(x=>x.o.bucketId===bucket),s=await M.get(tx,root.collection(`centralResumos/${bucket}/estabelecimentos`).limit(3));
   const sobra=s.docs.some(x=>!alterados.some(a=>a.o.lojaId===x.id))||alterados.some(x=>x.valor);
   const o=alterados[0].o,c=o.dados.municipio;catalogos.push({ref:root.doc(`centralCidades/${c.codigo}_${o.dados.categoria}/produtos/${o.centralId}`),sobra});
  }
  for(const oid of ids){
   const ar=root.doc(`centralObservacoes/${oid}/apoios/${sid}`);
   if(aval.dados&&oid===aval.observacaoId)M.set(tx,ar,{grupoId:grupo(db),precoId,dados:aval.dados,instanteMs:aval.instanteMs,bucketId:aval.bucketId,resumoId:aval.resumoId,lojaId:aval.lojaId,centralId:aval.centralId});else M.del(tx,ar);
   const v=substitutos.get(oid),r=root.doc('centralObservacoes/'+oid);
   if(v)M.set(tx,r,{dados:v.dados,bucketId:v.bucketId,resumoId:v.resumoId,lojaId:v.lojaId,centralId:v.centralId,dataMs:v.instanteMs,instanteMs:v.instanteMs,precoOrdenacao:v.dados.precoCentavos});else M.del(tx,r);
  }
  for(const {o,valor}of recomposicoes){
   const ref=root.doc(`centralResumos/${o.bucketId}/estabelecimentos/${o.lojaId}`);
   if(valor){M.set(tx,ref,{dados:valor.dados,dataMs:valor.dataMs,precoOrdenacao:valor.dados.precoCentavos});const c=valor.dados.municipio;M.set(tx,root.doc(`centralCidades/${c.codigo}_${valor.dados.categoria}/produtos/${valor.centralId}`),{produto:valor.dados.produto});}else M.del(tx,ref);
  }
  for(const cat of catalogos)if(!cat.sobra)M.del(tx,cat.ref);
  M.set(tx,fr,{ativa:Boolean(aval.dados),observacaoId:aval.dados?aval.observacaoId:anterior?.observacaoId||null,assinatura:aval.assinatura||null,produtoId:aval.p?.produtoId||anterior?.produtoId||null,listaId:aval.p?.listaId||anterior?.listaId||null,supermercadoId:aval.p?.supermercadoId||anterior?.supermercadoId||null,motivo:aval.dados?'':aval.motivo||'Contribuição desativada',atualizadaEm:FieldValue.serverTimestamp()});
  return {status:aval.dados?'publicada':'pendente',motivo:aval.motivo||null};
 });
}

async function criarLote(db,d,uid,metricas,uidAutorizado){
 const ref=db.collection('centralLotes').doc(d.id||D.hash([d.tipo,d.alvo||'',d.evento||'']));
 const M=metrica(metricas),pedido={tipo:d.tipo,alvo:d.alvo||null,inicio:d.inicio||null,fim:d.fim||null,categorias:d.categorias||D.TIPOS,versaoConsentimento:d.versaoConsentimento??null},assinatura=D.hash(pedido);
 await db.runTransaction(async tx=>{if(uidAutorizado)await exigirOperacaoCompartilhada(tx,db,uidAutorizado);const anterior=(await M.get(tx,ref)).data();if(anterior){if(anterior.assinatura!==assinatura)D.erro('Este lote já foi criado com outro período ou aceite.','already-exists');return;}M.set(tx,ref,{...pedido,assinatura,cursor:null,processados:0,status:'pendente',criadoPor:uid||'evento',criadoEm:FieldValue.serverTimestamp()});});return ref.id;
}
async function executarLote(db,loteId,metricas,uidAutorizado){
 const ref=db.doc('centralLotes/'+loteId),token=D.hash([Date.now(),Math.random()]),M=metrica(metricas);
 let job=await db.runTransaction(async tx=>{if(uidAutorizado)await exigirOperacaoCompartilhada(tx,db,uidAutorizado);const s=(await M.get(tx,ref)).data();if(!s)D.erro('Lote não encontrado.','not-found');if(s.status==='concluido')return null;if(s.travaAte>Date.now())D.erro('Lote já em processamento.','aborted');M.set(tx,ref,{...s,status:'processando',trava:token,travaAte:Date.now()+120000});return s;});
 if(!job)return {status:'concluido'};
 try{
  if(job.tipo==='fonte'){
   await processarFonte(db,job.alvo.id,{metricas,uidAutorizado});await ref.set({status:'concluido',processados:1,trava:null,travaAte:0},{merge:true});if(metricas)metricas.escritas++;return {id:loteId,status:'concluido',processados:1};
  }
  let q=job.tipo==='historico'?db.collection('comprasPrecos').where('compradoEm','>=',new Date(job.inicio)).where('compradoEm','<=',new Date(job.fim)).orderBy('compradoEm').orderBy('__name__'):job.alvo?db.collection('centralContribuicoes').where(job.alvo.campo,'==',job.alvo.id).orderBy('__name__'):db.collection('centralContribuicoes').where('ativa','==',true).orderBy('__name__');
  if(job.cursor)q=job.tipo==='historico'?q.startAfter(new Date(job.cursor.dataMs),job.cursor.id):q.startAfter(job.cursor.id);
  const pagina=await q.limit(10).get();if(metricas)metricas.leituras+=Math.max(1,pagina.size);
  for(const item of pagina.docs){
   const p=item.data();if((job.tipo==='historico'&&job.categorias.includes(p.tipoCompra||'supermercado'))||(job.tipo!=='historico'&&(p.ativa||(job.alvo&&p.motivo!=='Contribuição desativada')))){
    if(!job.alvo||p[job.alvo.campo]===job.alvo.id)await processarFonte(db,item.id,{retirar:job.tipo==='retirada',versaoConsentimento:['historico','retirada'].includes(job.tipo)?job.versaoConsentimento:undefined,metricas,uidAutorizado});
   }
   job={...job,cursor:{id:item.id,...(job.tipo==='historico'?{dataMs:D.instante(p.compradoEm)}:{})},processados:job.processados+1};
   await db.runTransaction(async tx=>{const atual=(await M.get(tx,ref)).data();if(atual.trava!==token)D.erro('Lote retomado em outra sessão.','aborted');M.set(tx,ref,{...job,status:'processando',trava:token,travaAte:Date.now()+120000});});
  }
  const status=pagina.size<10?'concluido':'pendente';await ref.set({...job,status,trava:null,travaAte:0},{merge:true});if(metricas)metricas.escritas++;
  return {id:loteId,status,processados:job.processados,cursor:job.cursor};
 }catch(e){await ref.set({status:'interrompido',trava:null,travaAte:0,erro:e.code||'falha'},{merge:true});if(metricas)metricas.escritas++;throw e;}
}

async function operarCentral(root,request,metricas){
 if(!request.auth)D.erro('Entre no app para consultar.','unauthenticated');
 const db=await bancoDoUsuario(root,request.auth.uid),uid=request.auth.uid,d=request.data||{},M=metrica(metricas);
 // O resolvedor existente faz três leituras para grupos vinculados.
 if(metricas)metricas.leituras+=db.grupoId?3:2;
 const perfil=await db.doc('users/'+uid).get();if(metricas)metricas.leituras++;
 if(!perfil.exists||perfil.data().ativo===false||!['admin','funcionario','consulta'].includes(perfil.data().role))D.erro('Acesso não autorizado.','permission-denied');
 const exigirAdmin=()=>{if(perfil.data().role!=='admin')D.erro('Somente administradores podem alterar contribuições.','permission-denied');};
 // Consulta agregada não ganha exclusividade comercial; a gestão privada exige acesso ao grupo.
 const privada=!['produtos','consultar','historico'].includes(d.acao);
 if(privada)await exigirConsultaCompartilhada(db,uid);
 const resultado=await (async()=>{
 if(d.acao==='configurar'){
  exigirAdmin();if(typeof d.ativo!=='boolean'||(d.ativo&&d.aviso!==D.AVISO))D.erro('Confira o aviso da contribuição.');
  return db.runTransaction(async tx=>{await exigirOperacaoCompartilhada(tx,db,uid);const ref=config(db),a=(await M.get(tx,ref)).data()||{ativo:false,versao:0};if(d.versao!==a.versao)D.erro('A configuração mudou. Atualize.','aborted');if(a.ativo===d.ativo)return {ativo:a.ativo,versao:a.versao};const n={ativo:d.ativo,versao:a.versao+1,aviso:d.ativo?D.AVISO:a.aviso||null,por:uid,em:FieldValue.serverTimestamp()};M.set(tx,ref,n);M.set(tx,db.collection('centralConsentimentos').doc(),n);return {ativo:n.ativo,versao:n.versao};});
 }
 if(d.acao==='configuracao'){exigirAdmin();const s=await config(db).get();if(metricas)metricas.leituras++;const c=s.data()||{ativo:false,versao:0};return {ativo:c.ativo,versao:c.versao,aviso:D.AVISO};}
 if(d.acao==='revisarLocais'){
  exigirAdmin();if(d.cursor&&!D.id(d.cursor))D.erro('Cursor inválido.');let q=db.collection('supermercados').orderBy('__name__');if(d.cursor)q=q.startAfter(d.cursor);const s=await q.limit(21).get();if(metricas)metricas.leituras+=Math.max(1,s.size);return {itens:s.docs.slice(0,20).map(x=>({id:x.id,nome:x.data().nome,filial:x.data().filial,cidade:x.data().cidade})),cursor:s.size>20?s.docs[19].id:null};
 }
 if(d.acao==='revisarItem'){
  exigirAdmin();if(!D.id(d.id)||d.confirmado!==true)D.erro('Confirme o item corrigido.');
  return db.runTransaction(async tx=>{await exigirOperacaoCompartilhada(tx,db,uid);const p=(await M.get(tx,db.doc('comprasPrecos/'+d.id))).data(),mapa=(await M.get(tx,db.doc('comprasAssociacoes/estado'))).data(),correcao=mapa?.itens?.[d.id];if(!p||!correcao)D.erro('Este item não tem associação corrigida para revisar.');const v=(await M.get(tx,db.doc('centralVinculos/'+correcao.produtoId))).data();if(!v||v.retirado)D.erro('Revise primeiro a especificação compartilhada do produto de destino.');M.set(tx,db.doc('centralItens/'+d.id),{assinatura:D.hash(correcao),por:uid,em:FieldValue.serverTimestamp()});return {ok:true};});
 }
 if(['vincularProduto','confirmarLocal'].includes(d.acao)){
  exigirAdmin();if(d.confirmado!==true||!D.id(d.id))D.erro('Confirme a revisão.');
  return db.runTransaction(async tx=>{await exigirOperacaoCompartilhada(tx,db,uid);
   if(d.acao==='vincularProduto'){
    const p=(await M.get(tx,db.doc('catalogoCompras/'+d.id))).data();if(!p||p.ativo===false)D.erro('Produto não encontrado.','not-found');
    const ref=db.doc('centralVinculos/'+d.id);
    if(d.retirar===true){M.set(tx,ref,{retirado:true,por:uid,em:FieldValue.serverTimestamp()});return {ok:true};}
    const v=D.produto(d.produto);if(p.unidadeCompra!==v.unidadeComercial||(p.gtin&&p.gtin!==v.gtin)||(p.marca&&p.marca.toLocaleUpperCase('pt-BR')!==v.marca.toLocaleUpperCase('pt-BR')))D.erro('Unidade, GTIN ou marca não correspondem ao cadastro privado.');
    const cid=D.chaveProduto(v),global=root.doc('centralProdutos/'+cid),anterior=(await M.get(tx,global)).data();if(anterior&&D.hash(anterior)!==D.hash(v))D.erro('Especificação divergente.','failed-precondition');
    if(!anterior)M.set(tx,global,v);M.set(tx,ref,{centralId:cid,tipo:v.tipo,assinatura:D.identidadePrivada(p),por:uid,em:FieldValue.serverTimestamp(),retirado:false});return {ok:true,centralId:cid};
   }
   const mercado=(await M.get(tx,db.doc('supermercados/'+d.id))).data();if(!mercado)D.erro('Estabelecimento não encontrado.','not-found');
   const ref=db.doc('centralLocais/'+d.id);if(d.retirar===true){M.set(tx,ref,{retirado:true,por:uid,em:FieldValue.serverTimestamp()});return {ok:true};}
   const c=D.cidade(d.codigo,d.uf),n={nome:D.texto(d.nome),filial:D.texto(d.filial),cnpj:D.cnpj(d.cnpj),codigo:c.codigo,uf:c.uf,assinatura:D.hash([mercado.nome,mercado.filial,mercado.cidade]),por:uid,em:FieldValue.serverTimestamp(),retirado:false};M.set(tx,ref,n);return {ok:true};
  });
 }
 if(d.acao==='previaHistorico'){
  exigirAdmin();const n=limite(d);if(!Number.isFinite(d.inicio)||!Number.isFinite(d.fim)||d.fim<d.inicio||d.fim-d.inicio>366*86400000||d.inicio<Date.UTC(2000,0,1)||d.fim>Date.now()+60000)D.erro('Escolha até 366 dias passados.');
  if(d.cursor&&(!D.id(d.cursor.id)||!Number.isFinite(d.cursor.dataMs)))D.erro('Cursor inválido.');
  let q=db.collection('comprasPrecos').where('compradoEm','>=',new Date(d.inicio)).where('compradoEm','<=',new Date(d.fim)).orderBy('compradoEm').orderBy('__name__');if(d.cursor)q=q.startAfter(new Date(d.cursor.dataMs),d.cursor.id);
  const s=await q.limit(n+1).get();if(metricas)metricas.leituras+=Math.max(1,s.size);
  const itens=await db.runTransaction(async tx=>{const linhas=[];for(const x of s.docs.slice(0,n)){const a=await avaliar(tx,db,x.id,M);linhas.push({id:x.id,nome:x.data().nomeSnapshot||'',apto:Boolean(a.dados),motivo:a.motivo||'Apto após confirmação',dados:a.dados||null});}return linhas;});
  return {itens,cursor:s.size>n?{id:s.docs[n-1].id,dataMs:D.instante(s.docs[n-1].data().compradoEm)}:null};
 }
 if(d.acao==='criarLote'){
  exigirAdmin();if(!D.id(d.id)||d.confirmado!==true||!['historico','retirada'].includes(d.tipo))D.erro('Confirme o processamento.');
  const c=(await config(db).get()).data();if(metricas)metricas.leituras++;
  if(d.tipo==='historico'&&(!c?.ativo||!Number.isFinite(d.inicio)||!Number.isFinite(d.fim)||d.fim<d.inicio||d.fim-d.inicio>366*86400000||d.inicio<Date.UTC(2000,0,1)||d.fim>Date.now()+60000||!Array.isArray(d.categorias)||!d.categorias.length||d.categorias.some(x=>!D.TIPOS.includes(x))))D.erro('Ative a contribuição e confira período/categorias.');
  if(d.tipo==='retirada'&&c?.ativo)D.erro('Desative antes de retirar contribuições.');
  return {id:await criarLote(db,{id:d.id,tipo:d.tipo,inicio:d.inicio,fim:d.fim,categorias:d.categorias,versaoConsentimento:c?.versao},uid,metricas,uid)};
 }
 if(d.acao==='executarLote'){exigirAdmin();if(!D.id(d.id))D.erro('Lote inválido.');return executarLote(db,d.id,metricas,uid);}
 if(d.acao==='lotes'){exigirAdmin();if(d.cursor&&!D.id(d.cursor))D.erro('Cursor inválido.');let q=db.collection('centralLotes').orderBy('__name__');if(d.cursor)q=q.startAfter(d.cursor);const s=await q.limit(21).get();if(metricas)metricas.leituras+=Math.max(1,s.size);return {itens:s.docs.slice(0,20).map(x=>({id:x.id,tipo:x.data().tipo,status:x.data().status,processados:x.data().processados})),cursor:s.size>20?s.docs[19].id:null};}
 if(!['produtos','consultar','historico'].includes(d.acao))D.erro('Ação inválida.');
 const c=D.cidade(d.codigo,d.uf);if(!D.TIPOS.includes(d.tipo))D.erro('Categoria não elegível.');
 if(d.ordem!==undefined&&!['recentes','menor'].includes(d.ordem))D.erro('Ordenação inválida.');
 const n=limite(d),periodo=intervalo(d),recentesDias=d.recentesDias??30;
 if(!Number.isInteger(recentesDias)||recentesDias<1||recentesDias>365)D.erro('Janela recente deve ter de 1 a 365 dias.');
 const contextoCursor=D.hash([uid,grupo(db),d.acao,c.codigo,d.tipo,d.produtoId||'',periodo.dias,recentesDias,d.ordem||'recentes']);
 // Proteção por usuário/janela, independente do grupo e sem rotina periódica.
 const rate=root.doc('centralLimites/'+D.hash(uid));await root.runTransaction(async tx=>{const a=(await M.get(tx,rate)).data(),janela=Math.floor(Date.now()/60000),usos=a?.janela===janela?a.usos:0;if(usos>=30)D.erro('Muitas consultas. Aguarde um minuto.','resource-exhausted');M.set(tx,rate,{janela,usos:usos+1});});
 let cursor=null;
 if(d.cursor){
  if(typeof d.cursor!=='string'||!/^([0-9]|1[0-5])_[a-f0-9]{32}$/.test(d.cursor))D.erro('Cursor inválido.');
  const cr=root.doc(`centralCursores/${D.hash(uid)}/paginas/${d.cursor.split('_')[0]}`),s=await cr.get();if(metricas)metricas.leituras++;
  cursor=s.data();if(!cursor||cursor.token!==d.cursor||cursor.contexto!==contextoCursor||cursor.expiraMs<Date.now())D.erro('Esta página expirou. Faça a busca novamente.','failed-precondition');
  if(cursor.inicioMs!==undefined){periodo.inicio=cursor.inicioMs;periodo.fim=cursor.fimMs;}
 }
 async function proxima(s){
  if(s.size<=n)return null;
  const ultimo=s.docs[n-1],slot=parseInt(D.hash([contextoCursor,ultimo.id]).slice(0,6),16)%16,token=slot+'_'+require('node:crypto').randomUUID().replaceAll('-','');
  await root.doc(`centralCursores/${D.hash(uid)}/paginas/${slot}`).set({token,contexto:contextoCursor,id:ultimo.id,dataMs:ultimo.data().dataMs??null,precoCentavos:ultimo.data().precoOrdenacao??null,inicioMs:periodo.inicio,fimMs:periodo.fim,expiraMs:Date.now()+15*60000});if(metricas)metricas.escritas++;
  return token;
 }

 if(d.acao==='produtos'){
  let q=root.collection(`centralCidades/${c.codigo}_${d.tipo}/produtos`).orderBy('__name__');if(cursor)q=q.startAfter(cursor.id);const s=await q.limit(n+1).get();if(metricas)metricas.leituras+=Math.max(1,s.size);return {itens:s.docs.slice(0,n).map(x=>({id:x.id,...D.publicacao({produto:x.data().produto,categoria:d.tipo,estabelecimento:{},municipio:c}).produto})),cursor:await proxima(s),atualizadoMs:Date.now()};
 }
 if(!D.id(d.produtoId))D.erro('Selecione um produto revisado.');
 const bucket=`${c.codigo}_${d.tipo}_${d.produtoId}`;
 let q=d.acao==='historico'?root.collection('centralObservacoes').where('bucketId','==',bucket):root.collection(`centralResumos/${bucket}/estabelecimentos`);
 q=q.where('dataMs','>=',periodo.inicio).where('dataMs','<=',periodo.fim);
 // A faixa adicional de preço permite ordenação indexada por preço mantendo
 // o filtro temporal no servidor (sem baixar todos os estabelecimentos).
 if(d.ordem==='menor')q=q.where('precoOrdenacao','>=',0).orderBy('precoOrdenacao','asc');
 q=q.orderBy('dataMs','desc').orderBy('__name__','desc');
 if(cursor)q=d.ordem==='menor'?q.startAfter(cursor.precoCentavos,cursor.dataMs,cursor.id):q.startAfter(cursor.dataMs,cursor.id);
 const s=await q.limit(n+1).get();if(metricas)metricas.leituras+=Math.max(1,s.size);
 const itens=s.docs.slice(0,n).map(x=>D.publicacao(x.data().dados));
 return {itens,cursor:await proxima(s),atualizadoMs:Date.now(),inicioMs:periodo.inicio,fimMs:periodo.fim,ordenacao:d.ordem==='menor'?'Menor preço encontrado no período selecionado':'Observações recentes',recentesDias};
 })();
 if(privada)await exigirConsultaCompartilhada(db,uid);
 return resultado;
}

async function eventoOrigem(root,grupoId,colecao,id,antes,depois,eventoId){
 const db=grupoId?bancoDoGrupo(root,grupoId):root;
 if(colecao==='comprasPrecos')return processarFonte(db,id);
 const campos={comprasListas:'listaId',catalogoCompras:'produtoId',supermercados:'supermercadoId',centralVinculos:'produtoId',centralLocais:'supermercadoId'};
 if(colecao==='comprasAssociacoesOperacoes'){if(depois?.tipo!=='corrigirItemProduto')return;return processarFonte(db,depois.precoId);}
 if(!campos[colecao])return;
 if(colecao==='comprasListas'&&antes?.status!=='finalizada')return;
 const consent=(await config(db).get()).data();if(!consent)return;
 const loteId=await criarLote(db,{tipo:'reconciliar',alvo:{campo:campos[colecao],id},evento:eventoId});
 await enfileirar(root,D.hash([grupoId||'legado',loteId,'inicio']),{grupoId:grupoId||null,loteId,pagina:0,tentativas:0});
}
async function enfileirar(root,id,tarefa){try{await root.doc('centralExecucoes/'+id).create(tarefa);}catch(e){if(e.code!==6&&e.code!=='already-exists')throw e;}}
async function eventoExecucao(root,ref){
 const tarefa=(await ref.get()).data();if(!tarefa||tarefa.concluida||tarefa.tentativas>=3)return;
 const db=tarefa.grupoId?bancoDoGrupo(root,tarefa.grupoId):root;
 for(let i=tarefa.tentativas;i<3;i++){
  await ref.update({tentativas:i+1});
  try{const r=await executarLote(db,tarefa.loteId);await ref.update({concluida:true});if(r.status==='pendente'&&tarefa.pagina<99)await enfileirar(root,D.hash([tarefa.grupoId,tarefa.loteId,r.cursor]),{grupoId:tarefa.grupoId,loteId:tarefa.loteId,pagina:tarefa.pagina+1,tentativas:0});return r;}
  catch(e){if(e.code==='aborted')return;if(i===2){await ref.update({erro:e.code||'falha'});return;}await new Promise(resolve=>setTimeout(resolve,100*(2**i)+Math.floor(Math.random()*50)));}
 }
}
module.exports={operarCentral,processarFonte,avaliar,executarLote,eventoOrigem,eventoExecucao,criarLote};
