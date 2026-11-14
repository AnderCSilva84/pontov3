const {HttpsError}=require('firebase-functions/v2/https');
const {FieldValue}=require('firebase-admin/firestore');
const {createHash,randomUUID}=require('node:crypto');
const BUCKET='ponto-app-1c55a-lembretes-anexos';
const LIMITES={arquivoBytes:5*1024*1024,lembreteBytes:25*1024*1024,arquivos:10,links:10};
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(v);
const hash=b=>createHash('sha256').update(b).digest('hex');
const falha=(c,m)=>{throw new HttpsError(c,m);};
const pasta=(l,uid)=>Object.hasOwn(l.organizacao||{},uid)?l.organizacao[uid]:'entrada';
function validarUrl(v){
 if(typeof v!=='string'||v.length>2048)falha('invalid-argument','Informe um link HTTPS de até 2048 caracteres.');
 let u;try{u=new URL(v.trim());}catch{falha('invalid-argument','Link inválido.');}
 if(u.protocol!=='https:'||u.username||u.password||!u.hostname||/[\u0000-\u0020]/.test(v.trim()))falha('invalid-argument','Use um link HTTPS sem usuário ou senha.');
 return u.href;
}
function validarArquivo(base64,nome){
 if(typeof base64!=='string'||base64.length>Math.ceil(LIMITES.arquivoBytes/3)*4||!base64.length)falha('invalid-argument','Cada arquivo deve ter até 5 MB.');
 const bytes=Buffer.from(base64,'base64');if(bytes.toString('base64')!==base64||bytes.length>LIMITES.arquivoBytes||bytes.length<12)falha('invalid-argument','Arquivo inválido ou maior que 5 MB.');
 let mime,ext;
 if(bytes.subarray(0,5).toString()==='%PDF-'&&bytes.subarray(-2048).includes(Buffer.from('%%EOF'))){mime='application/pdf';ext=/\.pdf$/i;}
 else if(bytes[0]===255&&bytes[1]===216&&bytes.at(-2)===255&&bytes.at(-1)===217){mime='image/jpeg';ext=/\.jpe?g$/i;}
 else if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&bytes.length>=33&&bytes.subarray(12,16).toString()==='IHDR'){
  const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20);if(!w||!h||w*h>40000000)falha('invalid-argument','Imagem com dimensões excessivas.');mime='image/png';ext=/\.png$/i;
 }else if(bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP'&&bytes.readUInt32LE(4)+8===bytes.length){mime='image/webp';ext=/\.webp$/i;}
 else falha('invalid-argument','Escolha um PDF, JPEG, PNG ou WebP válido.');
 const n=typeof nome==='string'?nome.normalize('NFC').trim():'';
 if(!n||n.length>160||/[\\/\u0000-\u001f\u007f]/.test(n)||!ext.test(n))falha('invalid-argument','Confira o nome e a extensão do arquivo.');
 return {bytes,mime,nome:n,tamanhoBytes:bytes.length,sha256:hash(bytes)};
}
const publico=(doc,uid)=>{const a=doc.data();return {id:doc.id,tipo:a.tipo,nome:a.nome,mime:a.mime||'',tamanhoBytes:a.tamanhoBytes||0,sha256:a.sha256||'',url:a.tipo==='link'?a.url:undefined,status:a.status,aguardarAteMs:a.criadaPor===uid?a.leaseAteMs||0:0,criadaPor:a.criadaPor,criadaPorNome:a.criadaPorNome,criadaEmMs:a.criadaEm?.toMillis?.()||null,respostaDe:a.respostaDe||'',respostaNome:a.respostaNome||'',podeRemover:a.criadaPor===uid};};
async function acesso(tx,db,uid,lembreteId,escrita=false){
 const perfil=(await tx.get(db.doc('users/'+uid))).data(),ref=db.doc('lembretes/'+lembreteId),snap=await tx.get(ref),l=snap.data();
 if(!perfil||perfil.ativo===false||!['admin','funcionario','consulta'].includes(perfil.role)||!l||l.dominio!=='geral'||![l.criadaPor,l.usuarioId].includes(uid)||pasta(l,uid)==='excluido')falha('permission-denied','Anexos indisponíveis para esta conta.');
 if(escrita&&pasta(l,uid)!=='entrada')falha('failed-precondition','Restaure o lembrete para adicionar ou remover anexos.');
 return {perfil,ref,l};
}
async function estados(tx,db,l){return Promise.all([...new Set([l.criadaPor,l.usuarioId])].map(async uid=>{const ref=db.doc('lembretesEstado/'+uid);return {ref,data:(await tx.get(ref)).data()||{}};}));}
function atualizarEstados(tx,lista){for(const s of lista)tx.set(s.ref,{anexos:(s.data.anexos||0)+1},{merge:true});}
const caminho=(db,lid,aid)=>`${db.grupoId?'grupos/'+db.grupoId:'legado'}/lembretes/${lid}/anexos/${aid}`;
async function operarAnexos(db,request,{bucket,validarContexto=async()=>{}}={}){
 const uid=request.auth?.uid,d=request.data||{};if(!uid)falha('unauthenticated','Entre no aplicativo.');
 if(!id(d.lembreteId))falha('invalid-argument','Lembrete inválido.');
 const colecao=db.collection('lembretes/'+d.lembreteId+'/anexos');
 if(d.acao==='listar')return db.runTransaction(async tx=>{
  const {l}=await acesso(tx,db,uid,d.lembreteId);const s=await tx.get(colecao.where('status','in',['pronto','enviando','falhou','removendo']).limit(21));
  return {anexos:s.docs.filter(p=>p.data().status==='pronto'||p.data().criadaPor===uid).map(p=>publico(p,uid)).sort((a,b)=>(a.criadaEmMs||0)-(b.criadaEmMs||0)||a.id.localeCompare(b.id)),podeEnviar:pasta(l,uid)==='entrada',limites:LIMITES,arquivosTotal:l.arquivosTotal||0,linksTotal:l.linksTotal||0,bytesTotal:l.anexosBytes||0};
 });
 if(!id(d.anexoId))falha('invalid-argument','Anexo inválido.');const ref=colecao.doc(d.anexoId);
 if(d.acao==='baixar'){
  const a=await db.runTransaction(async tx=>{await acesso(tx,db,uid,d.lembreteId);const p=(await tx.get(ref)).data();if(!p||p.status!=='pronto'||p.tipo!=='arquivo')falha('not-found','Arquivo indisponível.');return p;});
  if(!bucket)falha('unavailable','Armazenamento de arquivos não configurado neste ambiente.');
  let bytes;try{[bytes]=await bucket.file(caminho(db,d.lembreteId,d.anexoId)).download();}catch{falha('unavailable','Não foi possível baixar o arquivo. Tente novamente.');}
  if(bytes.length!==a.tamanhoBytes||hash(bytes)!==a.sha256)falha('data-loss','A integridade do arquivo não pôde ser confirmada.');
  await validarContexto();await db.runTransaction(async tx=>{await acesso(tx,db,uid,d.lembreteId);if((await tx.get(ref)).data()?.status!=='pronto')falha('not-found','Este anexo foi removido.');});
  return {base64:bytes.toString('base64'),mime:a.mime,nome:a.nome,sha256:a.sha256};
 }
 if(d.acao==='remover'){
  const a=await db.runTransaction(async tx=>{
   const {l,ref:lr}=await acesso(tx,db,uid,d.lembreteId,true),doc=await tx.get(ref),a=doc.data();
   if(!a||a.criadaPor!==uid)falha('permission-denied','Você só pode remover os anexos que enviou.');
   if(a.status==='removido')return a;
   if(a.status==='enviando'&&a.leaseAteMs>Date.now())falha('failed-precondition','Aguarde o envio terminar antes de remover o arquivo.');
   if(a.status!=='removendo'){
    const lista=await estados(tx,db,l);tx.update(ref,{status:a.tipo==='link'?'removido':'removendo',quotaLiberada:a.tipo==='link',removidaEm:FieldValue.serverTimestamp()});
    tx.update(lr,{anexosQuantidade:Math.max(0,(l.anexosQuantidade||0)-1),anexosVersao:(l.anexosVersao||0)+1,...(a.tipo==='link'?{linksTotal:Math.max(0,(l.linksTotal||0)-1)}:{})});atualizarEstados(tx,lista);
   }
   return a;
  });
  if(a.tipo==='link'||a.status==='removido')return {ok:true};
  if(!bucket)falha('unavailable','Remoção de acesso registrada. Reconecte para finalizar a exclusão do arquivo.');
  // Marcador vazio impede um upload atrasado com ifGenerationMatch:0 de recriar o conteúdo.
  try{await bucket.file(caminho(db,d.lembreteId,d.anexoId)).save(Buffer.alloc(0),{resumable:false,validation:'crc32c',metadata:{contentType:'application/octet-stream',cacheControl:'private, no-store',metadata:{removido:'true'}}});}catch{falha('unavailable','O arquivo está oculto. Tente Remover novamente para finalizar a exclusão.');}
  await db.runTransaction(async tx=>{const doc=(await tx.get(ref)).data(),lr=db.doc('lembretes/'+d.lembreteId),l=(await tx.get(lr)).data();if(doc?.quotaLiberada)return;tx.update(ref,{status:'removido',quotaLiberada:true});tx.update(lr,{arquivosTotal:Math.max(0,(l.arquivosTotal||0)-1),anexosBytes:Math.max(0,(l.anexosBytes||0)-a.tamanhoBytes)});});
  return {ok:true};
 }
 if(d.acao==='enviarArquivo'&&!bucket)falha('unavailable','Armazenamento de arquivos não configurado neste ambiente.');
 if(!['adicionarLink','enviarArquivo'].includes(d.acao))falha('invalid-argument','Ação inválida.');
 const arquivo=d.acao==='enviarArquivo'?validarArquivo(d.base64,d.nome):null,url=arquivo?null:validarUrl(d.url);
 const nome=arquivo?arquivo.nome:typeof d.nome==='string'?d.nome.trim():'';if(!nome||nome.length>160||/[\u0000-\u001f]/.test(nome))falha('invalid-argument','Informe o nome do anexo (até 160 caracteres).');
 if(d.respostaDe&&!id(d.respostaDe))falha('invalid-argument','Referência da resposta inválida.');
 const tentativaId=randomUUID();
 const assinatura=hash(JSON.stringify([nome,url,arquivo?.sha256||'',d.respostaDe||'']));
 const existente=await db.runTransaction(async tx=>{
  const {l,ref:lr,perfil}=await acesso(tx,db,uid,d.lembreteId,true),atual=(await tx.get(ref)).data();
  if(atual){if(atual.criadaPor!==uid||atual.assinatura!==assinatura)falha('already-exists','Este envio já foi recebido com outros dados.');if(['removendo','removido'].includes(atual.status))falha('failed-precondition','Este anexo foi removido. Selecione outro envio.');if(atual.status==='pronto')return true;if(atual.status==='enviando'&&atual.leaseAteMs>Date.now())falha('aborted','O mesmo arquivo está sendo enviado. Aguarde e atualize os anexos.');tx.update(ref,{status:'enviando',tentativaId,leaseAteMs:Date.now()+180000});return false;}
  const resposta=d.respostaDe?(await tx.get(colecao.doc(d.respostaDe))).data():null;if(d.respostaDe&&(!resposta||resposta.status!=='pronto'))falha('failed-precondition','O anexo original está indisponível.');
  if(arquivo&&((l.arquivosTotal||0)>=LIMITES.arquivos||(l.anexosBytes||0)+arquivo.tamanhoBytes>LIMITES.lembreteBytes)||!arquivo&&(l.linksTotal||0)>=LIMITES.links)falha('resource-exhausted','Limite de anexos atingido: 10 arquivos, 25 MB e 10 links por lembrete.');
  const lista=arquivo?null:await estados(tx,db,l);
  const dados={tipo:arquivo?'arquivo':'link',nome,mime:arquivo?.mime||'',tamanhoBytes:arquivo?.tamanhoBytes||0,sha256:arquivo?.sha256||'',...(url?{url}:{}),assinatura,status:arquivo?'enviando':'pronto',...(arquivo?{tentativaId,leaseAteMs:Date.now()+180000}:{}),criadaPor:uid,criadaPorNome:perfil.nome||'Usuário do grupo',criadaEm:FieldValue.serverTimestamp(),respostaDe:d.respostaDe||'',respostaNome:resposta?.nome||''};
  tx.create(ref,dados);tx.update(lr,{anexosQuantidade:(l.anexosQuantidade||0)+1,...(arquivo?{arquivosTotal:(l.arquivosTotal||0)+1,anexosBytes:(l.anexosBytes||0)+arquivo.tamanhoBytes}:{linksTotal:(l.linksTotal||0)+1,anexosVersao:(l.anexosVersao||0)+1})});
  if(lista){atualizarEstados(tx,lista);enfileirar(tx,db,l,uid,perfil.nome,d.lembreteId,d.anexoId);}
  return false;
 });
 if(existente||!arquivo)return {ok:true,id:d.anexoId};
 if(!bucket)falha('unavailable','Armazenamento de arquivos não configurado neste ambiente.');
 try{
  const objeto=bucket.file(caminho(db,d.lembreteId,d.anexoId));
  try{await objeto.save(arquivo.bytes,{resumable:false,validation:'crc32c',preconditionOpts:{ifGenerationMatch:0},metadata:{contentType:arquivo.mime,cacheControl:'private, no-store',metadata:{sha256:arquivo.sha256}}});}
  catch(e){if(Number(e.code)!==412)throw e;const [m]=await objeto.getMetadata();if(m.metadata?.sha256!==arquivo.sha256)falha('already-exists','Arquivo de envio divergente.');}
  await validarContexto();
  await db.runTransaction(async tx=>{
   const {l,ref:lr,perfil}=await acesso(tx,db,uid,d.lembreteId,true),a=(await tx.get(ref)).data();
   if(a?.status==='pronto')return;if(!a||a.assinatura!==assinatura||a.tentativaId!==tentativaId||!['enviando','falhou'].includes(a.status))falha('failed-precondition','O envio foi alterado ou removido.');
   const lista=await estados(tx,db,l);tx.update(ref,{status:'pronto',leaseAteMs:0});tx.update(lr,{anexosVersao:(l.anexosVersao||0)+1});atualizarEstados(tx,lista);enfileirar(tx,db,l,uid,perfil.nome,d.lembreteId,d.anexoId);
  });
 }catch(e){await db.runTransaction(async tx=>{const a=(await tx.get(ref)).data();if(a&&a.tentativaId===tentativaId&&['enviando','falhou'].includes(a.status))tx.update(ref,{status:'falhou',leaseAteMs:0});});if(e instanceof HttpsError)throw e;falha('unavailable','O envio não foi concluído. Tente novamente com o mesmo arquivo.');}
 return {ok:true,id:d.anexoId};
}
function enfileirar(tx,db,l,uid,nome,lid,aid){const outro=l.criadaPor===uid?l.usuarioId:l.criadaPor;if(outro===uid)return;tx.create(db.doc('avisosEnvios/anexo_'+lid+'_'+aid),{uid:outro,lembreteId:lid,titulo:l.titulo,tipo:'anexo',anexadoPorNome:nome||'Usuário do grupo',pendente:true,criadaEm:FieldValue.serverTimestamp()});}
module.exports={BUCKET,LIMITES,validarUrl,validarArquivo,operarAnexos};
