import {resultadoErroPonto} from '../utils/pontoOperacao.js';
import {escopoPonto} from './pontoFila.js';
// Sessão capturada é conferida antes de cada envio; recibos tardios permanecem na fila original.
export function criarSincronizadorPonto({fila,enviar,sessaoAtual,relogio=Date.now,dono=crypto.randomUUID()}) {
  let ativo=false;
  return async function sincronizar(sessao) {
    const escopo=escopoPonto(sessao.uid,sessao.contexto);
    const confere=()=>{const atual=sessaoAtual();return atual?.uid===sessao.uid&&escopoPonto(atual.uid,atual.contexto)===escopo;};
    if(ativo||!confere())return 0;
    ativo=true;
    let processadas=0;
    try {
      for(let n=0;n<200&&confere();n++) {
        const o=await fila.assumir(escopo,dono);if(!o)break;
        // Logout entre aquisição da lease e a chamada: devolve a tentativa sem transmiti-la.
        if(!confere()){await fila.concluir(escopo,dono,o.payload.operacaoId,{status:'incerta',proximaTentativaMs:0});break;}
        let alteracoes;
        try {
          const resultado=await enviar(o.payload);
          if(resultado?.operacaoId!==o.payload.operacaoId||!['confirmado','recebida','rejeitada','conflito'].includes(resultado.status))throw Error('Resposta não reconhecida.');
          alteracoes={status:resultado.status,resultado,ultimoErro:resultado.mensagem||'',proximaTentativaMs:0};
        } catch(e){alteracoes=resultadoErroPonto(e,o.tentativas,relogio());
          if(alteracoes.status==='incerta'&&(o.tentativasCiclo>=5||['unauthenticated','permission-denied'].some(c=>String(e?.code).endsWith(c))))alteracoes.pausada=true;
        }
        await fila.concluir(escopo,dono,o.payload.operacaoId,alteracoes);
        processadas++;
        if(alteracoes.status==='incerta')break;
      }
    } finally{ativo=false;}
    return processadas;
  };
}
