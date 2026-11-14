export function estadoAviso(l,agora=Date.now()){
 if(!l.ativo)return {estado:'pausado',rotulo:'Pausado',podeAgir:false};
 const ultima=l.ultimaOcorrencia,proximo=l.proximoDisparoEmMs;
 if(l.adiamento){const ms=l.adiamento.ateMs;return {estado:ms<=agora?'atrasado':'pendente',rotulo:ms<=agora?'Atrasado':'Adiado',horarioMs:ms,ocorrenciaId:l.adiamento.ocorrenciaId,podeAgir:ms<=agora};}
 if(ultima?.status==='concluido'&&(!Number.isFinite(proximo)||proximo>agora))return {estado:'concluido',rotulo:'Concluído',horarioMs:ultima.horarioMs,podeAgir:false};
 const pendente=ultima&&!['concluido','cancelado','sem_acesso'].includes(ultima.status)?ultima:null;
 const ms=pendente?.horarioMs??proximo;
 if(!Number.isFinite(ms))return {estado:'pendente',rotulo:'Sem próximos avisos',podeAgir:false};
 return {estado:ms<=agora?'atrasado':'pendente',rotulo:ms<=agora?'Atrasado':'Pendente',horarioMs:ms,ocorrenciaId:pendente?.id||`${l.versao}_${ms}`,podeAgir:ms<=agora};
}
