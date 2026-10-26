const {FieldValue}=require('firebase-admin/firestore');
// Ferramenta administrativa manual, sem export callable, scheduler ou TTL.
// Primeira categoria limitada: coordenadas de registros legados sem payload idempotente.
async function loteCoordenadas(db,{grupoId,atorUid,cursor=null,limite=20,executar=false,agora=Date.now()}){
 if(!/^[\w-]{1,128}$/.test(grupoId||'')||!/^[\w-]{1,128}$/.test(atorUid||'')||!Number.isInteger(limite)||limite<1||limite>20||cursor!==null&&!/^[\w-]{1,256}$/.test(cursor))throw Error('ESCOPO_INVALIDO');
 if(executar&&(!String(db.projectId).startsWith('demo-')||!/^(127\.0\.0\.1|localhost):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST||'')))throw Error('EXECUCAO_REAL_BLOQUEADA');
 const base=`grupos/${grupoId}`;
 const contexto=async tx=>{
  const [g,p,a]=await tx.getAll(db.doc(base),db.doc(`${base}/retencaoPoliticas/coordenadas`),db.doc(`${base}/users/${atorUid}`));
  if(!g.exists||a.data()?.role!=='admin'||a.data()?.ativo!==true||g.data()?.titularUid!==atorUid)throw Error('NAO_AUTORIZADO');
  return {grupo:g.data(),politica:p.data()};
 };
 const c=await db.runTransaction(contexto);
 const avaliar=(r,c)=>{
  if(c.grupo.retencaoExcepcional===true||r.retencaoExcepcional===true)return 'preservado_excecao';
  if(r.operacaoId||r.declarado||r.payload)return 'preservado_idempotencia';
  if(r.coordenadasRemovidasEm)return 'ja_tratado';
  const fim=r.retencaoCoordenadasEm?.toMillis?.(),inicio=r.timestamp?.toMillis?.();
  if(!Number.isFinite(fim)||!Number.isFinite(inicio)||fim>agora)return 'sem_expiracao_aprovada';
  if(!c.politica?.aprovada||c.politica.categoria!=='coordenadas_legadas'||!Number.isSafeInteger(c.politica.versao)||!Number.isInteger(c.politica.prazoDias)||c.politica.prazoDias<1||fim<inicio+c.politica.prazoDias*86400000)return 'politica_nao_aprovada';
  return Number.isFinite(r.latitude)||Number.isFinite(r.longitude)?'elegivel':'sem_coordenadas';
 };
 let q=db.collection(`${base}/registros`).orderBy('__name__').limit(limite);if(cursor)q=q.startAfter(cursor);
 const docs=await q.get(),contagens={};
 for(const s of docs.docs){let estado=avaliar(s.data(),c);
  if(executar&&estado==='elegivel')estado=await db.runTransaction(async tx=>{const atual=await contexto(tx),doc=await tx.get(s.ref),status=avaliar(doc.data()||{},atual);if(status!=='elegivel')return status;tx.update(s.ref,{latitude:FieldValue.delete(),longitude:FieldValue.delete(),distanciaMetros:FieldValue.delete(),coordenadasRemovidasEm:FieldValue.serverTimestamp(),coordenadasRemovidasPor:atorUid,retencaoPoliticaVersao:atual.politica.versao});return 'tratado';});
  contagens[estado]=(contagens[estado]||0)+1;
 }
 return {dryRun:!executar,examinados:docs.size,contagens,proximoCursor:docs.size===limite?docs.docs.at(-1).id:null,escopo:'lote limitado de coordenadas legadas; não representa todo o histórico'};
}
module.exports={loteCoordenadas};
