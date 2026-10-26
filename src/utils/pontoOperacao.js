export function criarOperacaoPonto({user,contexto,funcionarioId,tipo,jornadaData,modalidade,amostra,agora=Date.now(),operacaoId=crypto.randomUUID()}) {
  return {versao:1,operacaoId,uid:user.uid,contexto,funcionarioId,tipo,modalidade,jornadaData,capturadoEmMs:agora,
    fuso:Intl.DateTimeFormat().resolvedOptions().timeZone||'desconhecido',offsetMin:new Date(agora).getTimezoneOffset(),
    amostra:{latitude:amostra.latitude,longitude:amostra.longitude,precisaoMetros:Number.isFinite(amostra.accuracy)?amostra.accuracy:null,instanteMs:Number.isFinite(amostra.instanteMs)?Math.trunc(amostra.instanteMs):null}};
}
export function resultadoErroPonto(erro,tentativas,agora=Date.now(),aleatorio=Math.random) {
  const code=String(erro?.code||'').replace('functions/','');
  if(code==='already-exists'||code==='invalid-argument')return {status:'conflito',ultimoErro:erro.message,proximaTentativaMs:0};
  return {status:'incerta',ultimoErro:'Confirmação ainda não recebida. A mesma operação será reconciliada ao recuperar o acesso.',proximaTentativaMs:agora+Math.round(Math.min(300000,2000*2**Math.min(tentativas,8))*(.75+aleatorio()*.5))};
}
export const mensagemOperacao = o => ({confirmado:`Ponto confirmado${o.resultado?.hora?' às '+o.resultado.hora:''}.`,recebida:'Pendência recebida pelo servidor, aguardando análise. Não altera sua jornada.',pendente:'Captura salva no aparelho, pendente de envio.',enviando:'Enviando a operação original; aguarde a confirmação.',incerta:'Confirmação ainda não recebida. Não registre uma substituição.',conflito:'Operação conflitante. Solicite orientação administrativa.',rejeitada:'Operação rejeitada. Confira a orientação antes de tentar novamente.'}[o.status]||o.status);
export async function atualizarResumoSeguro(atualizar) {
  try { await atualizar(); return true; } catch { return false; }
}
