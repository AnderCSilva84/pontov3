import { dataExibicao } from '../utils/datasExibicao.js';
import {mensagemOperacao} from '../utils/pontoOperacao';
import {useState} from 'react';
export default function PontoOperacoes({fila}) {
  const [limite,setLimite]=useState(10);
  const ordenadas=[...fila.operacoes].reverse();
  if(!fila.operacoes.length&&!fila.erro)return null;
  return <section className="card ponto-operacoes" aria-label="Tentativas de ponto"><h2>Tentativas e pendências</h2>{fila.erro&&<p role="alert">{fila.erro}</p>}
    {ordenadas.slice(0,limite).map(o=><article key={o.payload.operacaoId}><strong>{dataExibicao(o.payload.jornadaData)} · {({ENTRADA:'Entrada',SAIDA:'Saída',SAIDA_INTERVALO:'Início do intervalo',ENTRADA_INTERVALO:'Retorno do intervalo'})[o.payload.tipo]}</strong><p role="status">{mensagemOperacao(o)}</p>{o.ultimoErro&&<small>{o.ultimoErro}</small>}{o.status==='recebida'&&<small>Aguarde a revisão administrativa e consulte “Minhas capturas e decisões”.</small>}{o.resultado?.origem==='revisao_offline'&&<small>Decisão administrativa: {o.resultado.justificativa}</small>}</article>)}
    {ordenadas.length>limite&&<button type="button" className="compras-link" onClick={()=>setLimite(n=>n+10)}>Mostrar mais 10 tentativas</button>}
    {fila.operacoes.some(o=>o.pausada)&&<p role="status">As tentativas automáticas foram pausadas. Confira sua conexão e login e toque em reconciliar; o ID original será mantido.</p>}
    <button type="button" className="btn btn-secondary" onClick={fila.retomar}>Reconciliar tentativas originais</button>
    {fila.operacoes.some(o=>['confirmado','rejeitada'].includes(o.status))&&<button type="button" className="compras-link" onClick={()=>{if(window.confirm('Limpar somente o histórico local confirmado ou rejeitado? Pendências e comprovantes salvos no Tá no Ponto serão preservados.'))fila.limpar();}}>Limpar históricos locais finalizados</button>}
  </section>;
}
