function urlLembrete(id,ocorrenciaId,uid) {
  const valido=v=>typeof v==='string'&&/^[\w-]{1,128}$/.test(v);
  if(![id,ocorrenciaId,uid].every(valido))throw Error('Identificação de lembrete inválida.');
  return '/lembretes?'+new URLSearchParams({lembreteId:id,ocorrenciaId,destinatario:uid}).toString();
}
module.exports={urlLembrete};
