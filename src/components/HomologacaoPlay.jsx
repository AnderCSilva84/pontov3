import { useEffect, useRef, useState } from 'react';
import { restaurarComprasTestePlay } from '../services/playBilling';

export default function HomologacaoPlay({user}) {
  const vivo=useRef(true),trava=useRef(false);
  const [ocupado,setOcupado]=useState(false),[mensagem,setMensagem]=useState('');
  useEffect(()=>{vivo.current=true;return()=>{vivo.current=false;};},[]);
  async function validar() {
    if(trava.current)return;
    trava.current=true;setOcupado(true);setMensagem('');
    try {
      const r=await restaurarComprasTestePlay(user);
      if(vivo.current)setMensagem(`${r.confirmadas} compra(s) de teste com acesso confirmado; ${r.pendentes} pendente(s). Atualize a consulta do plano para conferir os recursos.`);
    } catch {
      if(vivo.current)setMensagem('Não foi possível concluir a validação. Consulte novamente com a mesma conta; nenhuma nova compra foi iniciada.');
    } finally {trava.current=false;if(vivo.current)setOcupado(false);}
  }
  return <section className="card"><h2>Validação de compras de teste</h2><p>Disponível apenas para o grupo de homologação autorizado. Consulta compras existentes na loja e confirma o acesso pelo servidor.</p><button className="btn btn-secondary" disabled={ocupado} onClick={validar}>{ocupado?'Validando…':'Validar compras de teste'}</button>{mensagem&&<p role="status">{mensagem}</p>}</section>;
}
