const {HttpsError}=require('firebase-functions/v2/https');
const {bancoDoUsuario}=require('./grupos-contexto.cjs');
const falha=(c,m)=>{throw new HttpsError(c,m);};
function validarMiniatura(base64) {
  if(typeof base64!=='string'||base64.length>32768||! /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64))falha('invalid-argument','Escolha outra foto. A miniatura deve ter até 24 KB.');
  const b=Buffer.from(base64,'base64');
  if(b.length<20||b.length>24576||b[0]!==255||b[1]!==216||b.at(-2)!==255||b.at(-1)!==217)falha('invalid-argument','Miniatura JPEG inválida.');
  let pos=2,dimensoes=false;
  while(pos<b.length-2){
    if(b[pos++]!==255)falha('invalid-argument','JPEG inválido.');
    const m=b[pos++];
    if(m===218){if(!dimensoes)falha('invalid-argument','Dimensões ausentes.');return b;}
    if(pos+2>b.length)falha('invalid-argument','JPEG incompleto.');
    const len=b.readUInt16BE(pos);
    if(len<2||pos+len>b.length)falha('invalid-argument','JPEG incompleto.');
    // Reencodificação do navegador remove EXIF/GPS. Recusar metadados privados enviados diretamente.
    if(m===225||m===254)falha('invalid-argument','Prepare a foto novamente para remover metadados.');
    if(m===192||m===194){
      if(len<8)falha('invalid-argument','Dimensões inválidas.');
      const h=b.readUInt16BE(pos+3),w=b.readUInt16BE(pos+5);
      if(!w||!h||w>192||h>192)falha('invalid-argument','Use a miniatura preparada pelo aplicativo.');
      dimensoes=true;
    }
    pos+=len;
  }
  falha('invalid-argument','JPEG incompleto.');
}
async function operarFoto(raiz,request) {
  const uid=request.auth?.uid,d=request.data||{};
  if(!uid)falha('unauthenticated','Entre na sua conta.');
  if(Object.keys(d).some(k=>!['acao','foto','usuarioId'].includes(k)))falha('invalid-argument','Dados inválidos.');
  const alvo=d.usuarioId||uid;
  if(typeof alvo!=='string'||! /^[\w-]{1,128}$/.test(alvo))falha('invalid-argument','Conta inválida.');
  if(d.acao!=='fotoPerfilConsultar'&&alvo!==uid)falha('permission-denied','Você só pode alterar a própria foto.');
  const bytes=d.acao==='fotoPerfilSalvar'?validarMiniatura(d.foto):null;
  const db=await bancoDoUsuario(raiz,uid);
  return db.runTransaction(async tx=>{
    const [viewer,dono,foto]=await tx.getAll(db.doc('users/'+uid),db.doc('users/'+alvo),db.doc('fotosPerfis/'+alvo));
    if(!viewer.exists||viewer.data().ativo===false||!dono.exists||dono.data().ativo===false||(alvo!==uid&&viewer.data().role!=='admin'))falha('permission-denied','Foto indisponível para esta conta.');
    if(d.acao==='fotoPerfilConsultar')return {foto:foto.exists?foto.data().bytes.toString('base64'):null,versao:dono.data().fotoPerfilVersao||0};
    if(!['fotoPerfilSalvar','fotoPerfilRemover'].includes(d.acao))falha('invalid-argument','Ação inválida.');
    const fid=['funcionario','funcionaria'].includes(dono.data().role)?dono.data().funcionarioId:null;
    const f=typeof fid==='string'&&/^[\w-]{1,128}$/.test(fid)?await tx.get(db.doc('funcionarios/'+fid)):null;
    const versao=(Number(dono.data().fotoPerfilVersao)||0)+1,temFoto=Boolean(bytes);
    if(bytes)tx.set(foto.ref,{bytes,versao,mime:'image/jpeg'});else tx.delete(foto.ref);
    tx.update(dono.ref,{temFotoPerfil:temFoto,fotoPerfilVersao:versao});
    if(f?.exists)tx.update(f.ref,{fotoPerfilUid:uid,temFotoPerfil:temFoto,fotoPerfilVersao:versao});
    return {ok:true,versao,temFoto};
  });
}
module.exports={operarFoto,validarMiniatura};
