const {HttpsError}=require('firebase-functions/v2/https');
const {FieldValue}=require('firebase-admin/firestore');
const falha=(c,m)=>{throw new HttpsError(c,m);};
const idValido=v=>typeof v==='string'&&/^[\w-]{1,128}$/.test(v);
const dataValida=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T12:00Z'))&&new Date(v+'T12:00Z').toISOString().slice(0,10)===v;
function validarPrato(d){
 const titulo=typeof d.titulo==='string'?d.titulo.trim():'',receita=typeof d.receita==='string'?d.receita.trim():'',linkReceita=typeof d.linkReceita==='string'?d.linkReceita.trim():'';
 if(!titulo||titulo.length>120||receita.length>8000||linkReceita.length>1500)falha('invalid-argument','Informe o prato (até 120 caracteres) e uma receita de até 8.000 caracteres.');
 if(linkReceita){let u;try{u=new URL(linkReceita);}catch{falha('invalid-argument','Informe um link HTTPS válido para a receita.');}if(u.protocol!=='https:'||u.username||u.password)falha('invalid-argument','Use um link HTTPS sem credenciais.');}
 if(!idValido(d.usuarioId)||!['data','semanal'].includes(d.modo))falha('invalid-argument','Selecione a funcionária e quando preparar o prato.');
 const diasSemana=d.modo==='semanal'?d.diasSemana:[];
 if(d.modo==='data'&&!dataValida(d.data)||!Array.isArray(diasSemana)||d.modo==='semanal'&&!diasSemana.length||diasSemana.some(n=>!Number.isInteger(n)||n<0||n>6)||new Set(diasSemana).size!==diasSemana.length)falha('invalid-argument','Escolha uma data válida ou os dias da semana.');
 if(d.foto!==undefined&&(typeof d.foto!=='string'||d.foto.length>180000||d.foto!==''&&!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(d.foto)))falha('invalid-argument','Use uma foto JPEG, PNG ou WebP reduzida (até 180 KB).');
 return {titulo,receita,linkReceita,usuarioId:d.usuarioId,modo:d.modo,data:d.modo==='data'?d.data:'',diasSemana:[...diasSemana].sort(),...(d.foto!==undefined?{foto:d.foto}:{})};
}
function pratoNoDia(p,dia){return p.ativo!==false&&(p.modo==='data'?p.data===dia:p.diasSemana.includes(new Date(dia+'T12:00Z').getUTCDay()));}
async function operarPratos(db,request){
 const uid=request.auth?.uid,d=request.data||{};if(!uid)falha('unauthenticated','Entre no app.');
 return db.runTransaction(async tx=>{
  const perfil=(await tx.get(db.doc('users/'+uid))).data();
  if(!perfil||perfil.ativo===false||!['admin','funcionario'].includes(perfil.role))falha('permission-denied','Acesso não autorizado aos pratos do dia.');
  const admin=perfil.role==='admin';
  if(d.operacao==='listarPratos'){
   if(d.dia!==undefined&&!dataValida(d.dia))falha('invalid-argument','Data inválida.');
   let q=db.collection('pratosDia').where('ativo','==',true);if(!admin)q=q.where('usuarioId','==',uid);
   const snap=await tx.get(q.limit(101));if(snap.size>100)falha('resource-exhausted','Há muitos pratos cadastrados. Arquive os antigos.');
   return {pratos:snap.docs.filter(doc=>!d.dia||pratoNoDia(doc.data(),d.dia)).map(doc=>{const p=doc.data();return {id:doc.id,titulo:p.titulo,receita:p.receita,linkReceita:p.linkReceita,usuarioId:p.usuarioId,usuarioNome:p.usuarioNome,modo:p.modo,data:p.data,diasSemana:p.diasSemana,temFoto:Boolean(p.foto),versao:p.versao,criadaPorNome:p.criadaPorNome};})};
  }
  if(d.id!==undefined&&!idValido(d.id))falha('invalid-argument','Prato inválido.');
  if(d.operacao!=='salvarPrato'&&!idValido(d.id))falha('invalid-argument','Selecione o prato.');
  const ref=d.id?db.doc('pratosDia/'+d.id):db.collection('pratosDia').doc(),anterior=(await tx.get(ref)).data();
  if(d.operacao==='obterPrato'){
   if(!anterior||anterior.ativo===false)falha('not-found','Prato não encontrado.');
   if(!admin&&anterior.usuarioId!==uid)falha('permission-denied','Este prato é de outra funcionária.');
   return {foto:anterior.foto||''};
  }
  if(!admin)falha('permission-denied','Somente administradores cadastram ou editam pratos.');
  if(d.id&&!anterior)falha('not-found','Prato não encontrado.');
  if(anterior&&d.versao!==anterior.versao)falha('aborted','O prato foi alterado. Atualize a tela.');
  if(d.operacao==='arquivarPrato'){tx.update(ref,{ativo:false,versao:anterior.versao+1,atualizadaPor:uid,atualizadaEm:FieldValue.serverTimestamp()});return {ok:true};}
  if(d.operacao!=='salvarPrato')falha('invalid-argument','Operação inválida.');
  const campos=validarPrato(d),alvo=(await tx.get(db.doc('users/'+campos.usuarioId))).data();
  if(alvo?.role!=='funcionario'||alvo.ativo===false)falha('failed-precondition','Escolha uma funcionária ativa.');
  if(!anterior&&(await tx.get(db.collection('pratosDia').where('ativo','==',true).limit(100))).size>=100)falha('failed-precondition','Arquive pratos antigos antes de cadastrar mais.');
  tx.set(ref,{...campos,foto:campos.foto??anterior?.foto??'',usuarioNome:alvo.nome||alvo.email||'Funcionária',ativo:true,versao:(anterior?.versao||0)+1,criadaPor:anterior?.criadaPor||uid,criadaPorNome:anterior?.criadaPorNome||perfil.nome||perfil.email||'',criadaEm:anterior?.criadaEm||FieldValue.serverTimestamp(),atualizadaPor:uid,atualizadaEm:FieldValue.serverTimestamp()});return {id:ref.id};
 });
}
module.exports={operarPratos,validarPrato,pratoNoDia};
