// Ferramenta local de suporte. Não exportada por index.js; não cria endpoint/rotina.
const {createHash, randomUUID}=require('node:crypto');
const {FieldPath, FieldValue}=require('firebase-admin/firestore');
const PAGINA=25, MAX_DOCS=200, MAX_PASSOS=250;
const id=v=>typeof v==='string'&&/^[\w-]{1,128}$/.test(v);
const erro=m=>{throw Error(m);};
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const stamp=s=>s.updateTime?.toDate().toISOString()+':'+s.updateTime?.nanoseconds;
const privadas=new Set(['funcionarios','registros','dias','financeiro','folhasPagamento','documentosTrabalhistas','financeiroAuditoria','ajustesPonto']);
const integridade=new Set(['pontoOperacoes','pontoPendencias','pontoDecisoes','contaSolicitacoes','contaExecucoes']);
const camposId=new Set(['uid','usuarioId','funcionarioId']);
const objeto=v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
function folhas(v,p=[],r=[]){
 if(typeof v==='string')r.push({campo:p,valor:v});
 else if(Array.isArray(v))v.forEach((x,i)=>folhas(x,[...p,String(i)],r));
 else if(objeto(v))Object.entries(v).forEach(([k,x])=>folhas(x,[...p,k],r));
 return r;
}
const igual=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const noEscopo=(c,caminho)=>typeof caminho==='string'&&(caminho===`grupos/${c.grupoId}`||caminho.startsWith(`grupos/${c.grupoId}/`)||caminho===`contaSolicitacoes/${c.uid}`||caminho.startsWith(`contaExecucoes/${c.uid}_`)&&/^\d+$/.test(caminho.slice(`contaExecucoes/${c.uid}_`.length)));
const filaInicial=c=>[{caminho:`grupos/${c.grupoId}`,tipo:'doc',herdado:false},
 ...(c.funcionarioId?[{caminho:`grupos/${c.grupoId}/funcionarios/${c.funcionarioId}`,tipo:'doc',herdado:true}]:[]),
 {caminho:`grupos/${c.grupoId}/users/${c.uid}`,tipo:'doc',herdado:true},
 {caminho:`contaSolicitacoes/${c.uid}`,tipo:'doc',herdado:true},
 {caminho:'contaExecucoes',tipo:'colecao',porUid:true}];
function inspecionar(s,c,inherited=false){
 const d=s.data(),f=folhas(d),chaves=new Set([c.uid,c.funcionarioId,...c.identificadores].filter(Boolean));
 const achados=f.filter(x=>chaves.has(x.valor)||[...chaves].some(i=>i.length>=5&&x.valor.toLocaleLowerCase('pt-BR').includes(i.toLocaleLowerCase('pt-BR'))));
 const pessoal=inherited||s.id===c.funcionarioId&&s.ref.parent.id==='funcionarios'||f.some(x=>camposId.has(x.campo.at(-1))&&[c.uid,c.funcionarioId].includes(x.valor));
 if(!achados.length&&!pessoal&&![...chaves].some(i=>i.length>=5&&s.id.includes(i)))return null;
 const terceiros=f.some(x=>camposId.has(x.campo.at(-1))&&![c.uid,c.funcionarioId,'todos','global',''].includes(x.valor));
 const categoria=s.ref.path.startsWith('grupos/')?s.ref.path.split('/')[2]:s.ref.path.split('/')[0],protegido=integridade.has(categoria);
 return {caminho:s.ref.path,versao:stamp(s),campos:achados.map(x=>({partes:x.campo})),pessoal,terceiros,
  podeExcluir:pessoal&&!terceiros&&privadas.has(categoria),
  podeConservar:privadas.has(categoria)||protegido,
  integridade:protegido,exatos:achados.filter(x=>chaves.has(x.valor)).map(x=>({partes:x.campo}))};
}
async function contexto(db,caso){
 const s=await db.doc('privacidadeCasos/'+caso).get();if(!s.exists)erro('Caso inexistente.');
 const c=s.data(),pedido=await db.doc('contaSolicitacoes/'+c.uid).get();
 if(!pedido.exists||pedido.data().grupoId!==c.grupoId||pedido.data().status!=='concluida')erro('Conclua a exclusão de acesso antes de tratar históricos.');
 return c;
}
async function registrarCaso(db,auth,{uid,grupoId,verificacaoRef,operador,identificadores=[],revisarEm,criterioRevisao}){
 if(!id(uid)||!id(grupoId)||!id(operador)||typeof verificacaoRef!=='string'||verificacaoRef.length<8||verificacaoRef.length>120||!Array.isArray(identificadores)||identificadores.length>12||identificadores.some(v=>typeof v!=='string'||v.trim().length<3||v.length>180))erro('Informe alvo, grupo, operador e referência privada da identidade verificada.');
 if(!Number.isFinite(Date.parse(revisarEm))||Date.parse(revisarEm)<=Date.now()||typeof criterioRevisao!=='string'||criterioRevisao.length<15)erro('O próprio caso exige uma data e critério de revisão, sem prazo automático.');
 const p=await db.doc('contaSolicitacoes/'+uid).get();
 if(!p.exists||p.data().grupoId!==grupoId||p.data().status!=='concluida')erro('Protocolo/grupo não corresponde a uma exclusão concluída.');
 const conta=await auth.getUser(uid).catch(e=>{if(e.code==='auth/user-not-found')return null;throw e;});
 if(conta)erro('O login ainda existe. Use o fluxo atual de exclusão de acesso.');
 // Referência determinística permite retomar sem criar um segundo caso.
 const caso=hash(['privacidade-v1',grupoId,uid]).slice(0,32),ref=db.doc('privacidadeCasos/'+caso);
 await db.runTransaction(async tx=>{
  const s=await tx.get(ref);if(s.exists){if(s.data().uid!==uid||s.data().grupoId!==grupoId)erro('Caso incompatível.');return;}
  const fid=p.data().funcionarioId||null;
  const f=fid?await tx.get(db.doc(`grupos/${grupoId}/funcionarios/${fid}`)):null;
  if(fid){const vinculos=await tx.get(db.collection(`grupos/${grupoId}/users`).where('funcionarioId','==',fid).limit(2));if(vinculos.docs.some(s=>s.id!==uid))erro('Cadastro trabalhista vinculado a outra conta: exige revisão antes da limpeza.');}
  const nomes=[f?.data()?.nome,f?.data()?.email].filter(v=>typeof v==='string'&&v.trim().length>=3);
  tx.create(ref,{uid,grupoId,funcionarioId:fid,protocoloAcesso:uid,operador,verificacaoRef,
   identificadores:[...new Set([...identificadores.map(x=>x.trim()),...nomes])],
   status:'inventariando',criadoEm:FieldValue.serverTimestamp(),revisao:0,geracao:1,revisarEm,criterioRevisao,
   fila:filaInicial({grupoId,uid,funcionarioId:fid}),visitados:[],pendentes:[],inventariados:0});
 });
 return {caso};
}
async function inventariar(db,caso){
 const c=await contexto(db,caso);if(c.status!=='inventariando')erro('Caso não está em inventário.');
 let fila=[...c.fila],pendentes=[...c.pendentes],vistos=0,passos=0;
 const visitados=new Set(c.visitados||[]);
 const entradas=[];
 async function documento(s,herdado){
  if(visitados.has(s.ref.path))return;
  if(visitados.size>=5000)erro('Limite de escopo: particione o atendimento antes de continuar.');
  visitados.add(s.ref.path);vistos++;
  if(s.exists){const e=inspecionar(s,c,herdado);if(e)entradas.push(e);}
  if(s.ref.path.split('/').length>=10)erro('Profundidade exige revisão específica.');
  for(const sub of await s.ref.listCollections())fila.push({caminho:sub.path,tipo:'colecao',herdado:herdado||s.ref.path===`grupos/${c.grupoId}/funcionarios/${c.funcionarioId}`});
 }
 while(fila.length&&vistos<MAX_DOCS&&passos++<MAX_PASSOS){
  const t=fila.shift();if(!t.caminho.startsWith(`grupos/${c.grupoId}/`)&&t.caminho!==`grupos/${c.grupoId}`&&t.caminho!==`contaSolicitacoes/${c.uid}`&&t.caminho!=='contaExecucoes')erro('Escopo inválido.');
  if(t.tipo==='doc'){
   if(visitados.has(t.caminho))continue;
   await documento(await db.doc(t.caminho).get(),t.herdado);
  }else{
   const limite=Math.min(PAGINA,MAX_DOCS-vistos);
   let q=db.collection(t.caminho);if(t.porUid)q=q.where('uid','==',c.uid);
   q=q.orderBy(FieldPath.documentId()).limit(limite);
   if(t.cursor)q=q.startAfter(t.cursor);
   const snap=await q.get();
   for(const s of snap.docs)await documento(s,t.herdado);
   if(snap.size===limite)fila.push({...t,cursor:snap.docs.at(-1).id});
  }
 }
 const ref=db.doc('privacidadeCasos/'+caso),lote=randomUUID();
 await db.runTransaction(async tx=>{
  const s=await tx.get(ref);if(s.data().revisao!==c.revisao||s.data().status!=='inventariando')erro('Inventário mudou; repita a rodada.');
  for(const e of entradas){const chave=hash(e.caminho);tx.set(ref.collection('itens').doc(chave),{...e,geracao:c.geracao});if(!pendentes.includes(chave))pendentes.push(chave);}
  tx.update(ref,{fila,visitados:[...visitados],pendentes,inventariados:c.inventariados+vistos,revisao:c.revisao+1,status:fila.length?'inventariando':'em_revisao',ultimaRodada:lote});
 });
 return {caso,lidos:vistos,candidatos:entradas.length,continuar:fila.length>0};
}
async function previa(db,caso){
 const c=await contexto(db,caso);if(c.status==='inventariando')erro('Inventário incompleto; continue pelas rodadas.');
 const docs=await db.doc('privacidadeCasos/'+caso).collection('itens').where('geracao','==',c.geracao).orderBy(FieldPath.documentId()).limit(201).get();
 if(docs.size>200)erro('Mais de 200 candidatos: exige particionamento específico, sem exclusão.');
 const itens=docs.docs.map(s=>({id:s.id,...s.data()}));
 if(itens.some(e=>!noEscopo(c,e.caminho)))erro('Item fora do grupo/protocolo autorizado.');
 return {caso,revisao:c.revisao,itens,digest:hash([caso,c.revisao,itens]),status:c.status};
}
function validarDecisao(e,d,agora){
 if(!d||Object.keys(d).some(k=>!['acao','justificativa','campos','revisarEm','criterioRevisao'].includes(k))||!['excluir','retirarCampos','conservar'].includes(d.acao)||typeof d.justificativa!=='string'||d.justificativa.trim().length<15||d.justificativa.length>1000)erro('Cada registro exige ação e justificativa específica.');
 if(d.acao==='excluir'&&!e.podeExcluir)erro('Documento compartilhado/ambíguo: não pode ser excluído inteiro.');
 if(d.acao==='retirarCampos'&&(e.integridade||!Array.isArray(d.campos)||!d.campos.length||d.campos.length!==e.campos.length||!e.campos.every(p=>d.campos.some(v=>igual(v,p)))||d.campos.some(p=>!e.exatos.some(v=>igual(v,p))||p.partes.some(k=>/^\d+$/.test(k)))))erro('Todos os campos devem ser exatos; texto livre, arrays e recibos exigem tratamento específico.');
 if(d.acao==='conservar'&&(!e.podeConservar||typeof d.revisarEm!=='string'||!Number.isFinite(Date.parse(d.revisarEm))||Date.parse(d.revisarEm)<=agora||typeof d.criterioRevisao!=='string'||d.criterioRevisao.length<15||d.criterioRevisao.length>1000))erro('Conservação exige acesso já restrito, justificativa, data e critério de revisão.');
}
async function executar(db,auth,{caso,digest,decisoes,operador,confirmar=false},agora=Date.now()){
 if(!confirmar||!id(operador))erro('Confirmação e operador são obrigatórios.');
 const p=await previa(db,caso),c=await contexto(db,caso);
 if(['executada','concluida'].includes(c.status))return {caso,repetida:true,status:c.status};
 if(digest!==p.digest||!objeto(decisoes)||Object.keys(decisoes).length!==p.itens.length||p.itens.some(e=>!decisoes[e.id]))erro('Prévia ou decisões incompletas/alteradas.');
 for(const e of p.itens)validarDecisao(e,decisoes[e.id],agora);
 if(await auth.getUser(c.uid).catch(e=>{if(e.code==='auth/user-not-found')return null;throw e;}))erro('Login reativado; interrompa a limpeza.');
 // Uma transação limitada: nenhuma remoção parcial se qualquer versão divergir.
 return db.runTransaction(async tx=>{
  const ref=db.doc('privacidadeCasos/'+caso),atual=await tx.get(ref);
  if(['executada','concluida'].includes(atual.data().status))return {caso,repetida:true,status:atual.data().status};
  if(atual.data().revisao!==p.revisao||atual.data().status!=='em_revisao')erro('Caso alterado.');
  const pedido=await tx.get(db.doc('contaSolicitacoes/'+c.uid));
  if(pedido.data()?.status!=='concluida'||pedido.data()?.grupoId!==c.grupoId)erro('Protocolo alterado.');
  if(c.funcionarioId){const vinculos=await tx.get(db.collection(`grupos/${c.grupoId}/users`).where('funcionarioId','==',c.funcionarioId).limit(2));if(vinculos.docs.some(s=>s.id!==c.uid))erro('Outra conta passou a usar o cadastro: interrompa e revise.');}
  const snaps=p.itens.length?await tx.getAll(...p.itens.map(e=>db.doc(e.caminho))):[];
  for(let i=0;i<snaps.length;i++)if(!snaps[i].exists||stamp(snaps[i])!==p.itens[i].versao)erro('Dados mudaram após a prévia; refaça o inventário.');
  // A decisão de apagar um pai deve abranger todas as subcoleções inventariadas.
  for(const e of p.itens.filter(e=>decisoes[e.id].acao==='excluir')){
   const subs=await db.doc(e.caminho).listCollections();
   for(const sub of subs){
    const children=await tx.get(sub.limit(201));
    if(children.size>200||children.docs.some(s=>!p.itens.some(i=>i.caminho===s.ref.path&&decisoes[i.id].acao==='excluir')))erro('Subcoleção não coberta; não apagar o pai.');
   }
  }
  let excluidos=0,retirados=0,conservados=0;
  for(const e of p.itens){
   const d=decisoes[e.id],r=db.doc(e.caminho);
   if(d.acao==='excluir'){tx.delete(r);excluidos++;}
   if(d.acao==='retirarCampos'){
    const pares=d.campos.flatMap(p=>[new FieldPath(...p.partes),FieldValue.delete()]);tx.update(r,...pares);retirados++;
   }
   if(d.acao==='conservar')conservados++;
   tx.update(ref.collection('itens').doc(e.id),{decisao:d,executadoPor:operador,executadoEm:FieldValue.serverTimestamp()});
  }
  tx.update(ref,{status:'executada',executadaEm:FieldValue.serverTimestamp(),excluidos,retirados,conservados});
  return {caso,excluidos,retirados,conservados};
 });
}
async function reinventariar(db,caso,operador,motivo){
 const c=await contexto(db,caso);if(!id(operador)||typeof motivo!=='string'||motivo.length<15||!['em_revisao','inventariando'].includes(c.status))erro('Reinício exige operador, motivo e caso ainda não executado.');
 await db.runTransaction(async tx=>{
  const ref=db.doc('privacidadeCasos/'+caso),s=await tx.get(ref);if(s.data().revisao!==c.revisao||s.data().status!==c.status)erro('Caso alterado.');
  tx.create(ref.collection('revisoes').doc(),{operador,motivo,geracaoAnterior:c.geracao,em:FieldValue.serverTimestamp()});
  tx.update(ref,{status:'inventariando',geracao:c.geracao+1,revisao:c.revisao+1,fila:filaInicial(c),visitados:[],pendentes:[],inventariados:0});
 });return {caso,reiniciado:true};
}
async function conferir(db,caso,operador){
 const c=await contexto(db,caso);if(!id(operador)||!['executada','concluida'].includes(c.status))erro('Confira somente uma execução existente.');
 if(c.status==='concluida')return {caso,status:'concluida',repetida:true};
 const p=await previa(db,caso);
 await db.runTransaction(async tx=>{
  const ref=db.doc('privacidadeCasos/'+caso),s=await tx.get(ref);
  if(s.data().status!=='executada'||s.data().revisao!==c.revisao)erro('Caso alterado.');
  const snaps=p.itens.length?await tx.getAll(...p.itens.map(e=>db.doc(e.caminho))):[];
  for(let n=0;n<snaps.length;n++){
   const e=p.itens[n],r=snaps[n],d=e.decisao;if(!d)erro('Decisão não registrada.');
   if(d.acao==='excluir'&&r.exists)erro('Registro reapareceu: não encerre o atendimento.');
   if(d.acao==='conservar'&&(!r.exists||stamp(r)!==e.versao))erro('Conservação mudou: revisar antes de encerrar.');
   if(d.acao==='retirarCampos'&&(!r.exists||d.campos.some(p=>p.partes.reduce((v,k)=>v?.[k],r.data())!==undefined)))erro('Campo pessoal ainda presente: não encerrar.');
  }
  tx.update(ref,{status:'concluida',conferidaPor:operador,concluidaEm:FieldValue.serverTimestamp(),
   identificadores:FieldValue.delete(),fila:FieldValue.delete(),pendentes:FieldValue.delete(),visitados:FieldValue.delete()});
 });return {caso,status:'concluida',conferidos:p.itens.length};
}
module.exports={registrarCaso,inventariar,previa,executar,reinventariar,conferir,PAGINA,MAX_DOCS};
