export function resumirPendencias(operacoes) {
  const r={onlineIncerto:0,offlineNaoEnviado:0,recebidas:0,conflitos:0,confirmadas:0};
  for(const o of operacoes){
    if(['pendente','incerta','enviando'].includes(o.status))r[o.payload.modalidade==='offline_pendente'&&!(o.tentativas>0)?'offlineNaoEnviado':'onlineIncerto']++;
    else if(o.status==='recebida')r.recebidas++;
    else if(o.status==='conflito')r.conflitos++;
    else if(o.status==='confirmado')r.confirmadas++;
  }
  return r;
}
export const textoPendencias=r=>`Envios sem resultado conhecido: ${r.onlineIncerto}. Capturas offline não enviadas: ${r.offlineNaoEnviado}. Recebidas pelo servidor: ${r.recebidas}. Conflitos: ${r.conflitos}. Confirmadas: ${r.confirmadas}.`;
export function criarRecuperacaoSenha(enviar) {
  let pendente;
  return email=>{
    if(pendente)return pendente;
    if(typeof email!=='string'||email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email.trim()))return Promise.reject(Error('Informe um email válido.'));
    pendente=(async()=>{
      try{await enviar(email.trim());}
      catch(e){if(!['auth/user-not-found','auth/invalid-email'].includes(e.code))throw Error(e.code==='auth/network-request-failed'?'Sem conexão. Confira a rede e tente novamente.':e.code==='auth/too-many-requests'?'Muitas tentativas. Aguarde antes de solicitar novamente.':'Não foi possível solicitar a recuperação agora. Tente novamente mais tarde.');}
      return 'Se houver uma conta com este email, você receberá instruções para redefinir a senha. Depois, volte ao AP1303 e entre com a nova senha.';
    })().finally(()=>{pendente=null;});return pendente;
  };
}
