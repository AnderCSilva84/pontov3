// Recebe exclusivamente atores extraídos de registros já autorizados pelo chamador.
async function fotosInteracoes(tx,db,atores){
 const ids=[...new Set(atores.filter(v=>typeof v==='string'&&/^[\w-]{1,128}$/.test(v)&&v!=='todos'))],pessoas=Object.create(null);
 for(let inicio=0;inicio<ids.length;inicio+=100){
  const grupo=ids.slice(inicio,inicio+100),perfis=await tx.getAll(...grupo.map(uid=>db.doc('users/'+uid)));
  const comFoto=perfis.filter(p=>p.exists&&p.data().ativo!==false&&p.data().temFotoPerfil===true);
  const fotos=comFoto.length?await tx.getAll(...comFoto.map(p=>db.doc('fotosPerfis/'+p.id))):[];
  const porId=new Map(fotos.map(f=>[f.id,f.data()]));
  for(const p of perfis){const perfil=p.data(),foto=porId.get(p.id);pessoas[p.id]={uid:p.id,nome:perfil?.ativo!==false?perfil?.nome||'':'',fotoPerfilVersao:perfil?.fotoPerfilVersao||0,fotoInteracao:foto?.bytes&&perfil?.ativo!==false?'data:image/jpeg;base64,'+foto.bytes.toString('base64'):null};}
 }
 return pessoas;
}
const atoresLembretes=lista=>lista.flatMap(l=>[l.criadaPor,l.usuarioId,l.ultimaConclusao?.concluidaPor,l.ultimaOcorrencia?.concluidaPor,...(l.ocorrencias||[]).map(o=>o.concluidaPor)]);
module.exports={fotosInteracoes,atoresLembretes};
