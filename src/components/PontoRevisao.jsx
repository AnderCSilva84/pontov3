import {useRef,useState,useEffect} from 'react';
import {revisarPendencia} from '../services/pontoRevisao';
import {dataOperacional} from '../utils/dataPonto';
const estados={aguardando_analise:'Aguardando análise',aprovada:'Aprovada',rejeitada:'Rejeitada'};
const tipos={ENTRADA:'Entrada',SAIDA:'Saída',SAIDA_INTERVALO:'Saída para intervalo',ENTRADA_INTERVALO:'Retorno do intervalo'};
const dataHora=ms=>ms?new Date(ms).toLocaleString('pt-BR',{timeZone:'America/Fortaleza'}):'Não informado';
export default function PontoRevisao({user}){
  const adm=user.role==='admin',hoje=dataOperacional(),mes=hoje.slice(0,7);
  const [aberta,setAberta]=useState(false),[inicio,setInicio]=useState(mes+'-01'),[fim,setFim]=useState(hoje);
  const [estado,setEstado]=useState('todos'),[pagina,setPagina]=useState({itens:[],cursor:null}),[detalhe,setDetalhe]=useState(null);
  const [hora,setHora]=useState(''),[justificativa,setJustificativa]=useState(''),[erro,setErro]=useState(''),[ocupado,setOcupado]=useState(false),[pedido,setPedido]=useState(null),[aviso,setAviso]=useState('');
  const viva=useRef(true);useEffect(()=>{viva.current=true;return()=>{viva.current=false;};},[]);
  async function executar(fn){setOcupado(true);setErro('');try{await fn();}catch(e){if(viva.current)setErro(e.message||'Não foi possível consultar. Tente novamente.');}finally{if(viva.current)setOcupado(false);}}
  async function listar(cursor=null){const r=await revisarPendencia({acao:'listar',inicio,fim,estado:adm?estado:'todos',limite:20,cursor});if(viva.current){setPagina(r);setDetalhe(null);setPedido(null);}}
  async function abrir(item){const r=await revisarPendencia({acao:'detalhe',pendenciaId:item.id});if(viva.current){setDetalhe(r);setHora(new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Fortaleza',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(r.payload.capturadoEmMs)));setJustificativa('');setPedido(null);setAviso('');}}
  async function decidir(resultado){
    let atual=pedido;
    if(!atual){
      if(justificativa.trim().length<5)throw Error('Informe uma justificativa com pelo menos 5 caracteres.');
      if(!window.confirm(`${resultado==='aprovada'?'Aprovar':'Rejeitar'}: ${detalhe.funcionarioNome} · ${tipos[detalhe.payload.tipo]} · ${detalhe.payload.jornadaData} às ${hora}?`))return;
      atual={acao:'decidir',versao:1,pendenciaId:detalhe.id,decisaoId:crypto.randomUUID(),resultado,horaRevisada:hora,justificativa,revisaoDia:detalhe.revisaoDia};setPedido(atual);
    }
    try{const r=await revisarPendencia(atual);if(viva.current){setDetalhe(d=>({...d,status:r.status==='confirmado'?'aprovada':'rejeitada',decisao:{resultado:r,justificativa:r.justificativa}}));setPedido(null);setAviso('Decisão confirmada no servidor. Atualize a lista para consultar.');}}
    catch(e){if(viva.current&&!['functions/unavailable','functions/deadline-exceeded','functions/internal'].includes(e.code))setPedido(null);throw e;}
  }
  return <section className="card ponto-operacoes" aria-label="Revisão de capturas offline">
    <button type="button" className="btn btn-secondary" onClick={()=>{if(!aberta){setAberta(true);executar(()=>listar());}else setAberta(false);}}>{aberta?'Ocultar':adm?'Revisar capturas offline':'Minhas capturas e decisões'}</button>
    {aberta&&<>
      <h2>{adm?'Revisão administrativa':'Resultados das minhas capturas'}</h2>
      <fieldset disabled={ocupado||Boolean(pedido)}><label className="field"><span>De</span><input type="date" value={inicio} onChange={e=>setInicio(e.target.value)}/></label><label className="field"><span>Até</span><input type="date" value={fim} onChange={e=>setFim(e.target.value)}/></label>
        {adm&&<label className="field"><span>Estado</span><select value={estado} onChange={e=>setEstado(e.target.value)}><option value="todos">Todos</option>{Object.entries(estados).map(([id,nome])=><option key={id} value={id}>{nome}</option>)}</select></label>}
        <button type="button" className="btn btn-secondary" onClick={()=>executar(()=>listar())}>Consultar / atualizar</button>
      </fieldset>
      {ocupado&&<p role="status">Aguarde…</p>}{erro&&<p role="alert">{erro}</p>}{aviso&&<p role="status">{aviso}</p>}
      {!ocupado&&!pagina.itens.length&&<p>Nenhuma captura neste período.</p>}
      {pagina.itens.map(item=><article key={item.id}><strong>{item.payload.jornadaData} · {tipos[item.payload.tipo]}</strong><p>{estados[item.status]} · {item.funcionarioId}</p><button type="button" className="btn btn-secondary" disabled={ocupado||Boolean(pedido)} onClick={()=>executar(()=>abrir(item))}>Examinar captura</button></article>)}
      {pagina.cursor&&<button type="button" className="btn btn-secondary" disabled={ocupado||Boolean(pedido)} onClick={()=>executar(()=>listar(pagina.cursor))}>Próxima página</button>}
      {detalhe&&<article className="card"><h3>{detalhe.funcionarioNome} · {tipos[detalhe.payload.tipo]}</h3><p>{estados[detalhe.status]}</p>
        <p>Horário informado pelo dispositivo — sujeito à revisão: {dataHora(detalhe.payload.capturadoEmMs)}</p><p>Recebido no servidor: {dataHora(detalhe.recebidoEm)}</p>
        <p>Localização declarada: {detalhe.payload.amostra.latitude}, {detalhe.payload.amostra.longitude} · precisão: {detalhe.payload.amostra.precisaoMetros??'não informada'} m. Não constitui prova incontestável de presença.</p>
        <h4>Jornada oficial atual</h4>{[['entrada','Entrada'],['saidaIntervalo','Saída para intervalo'],['entradaIntervalo','Retorno'],['saida','Saída']].map(([k,n])=><p key={k}>{n}: {detalhe.dia?.[k]||'—'}</p>)}
        {detalhe.alerta&&<p role="alert">{detalhe.alerta} Não há resolução automática pelo ajuste existente; mantenha a captura para análise ou rejeite justificadamente.</p>}
        {detalhe.decisao&&<p>Origem administrativa · {detalhe.decisao.resultado?.decididoPor} · {detalhe.decisao.justificativa}</p>}
        {adm&&detalhe.status==='aguardando_analise'&&<><fieldset disabled={ocupado||Boolean(pedido)}><label className="field"><span>Horário explicitamente revisado</span><input type="time" value={hora} onChange={e=>setHora(e.target.value)}/></label><label className="field"><span>Justificativa da decisão</span><textarea maxLength={1000} value={justificativa} onChange={e=>setJustificativa(e.target.value)}/></label><button type="button" className="btn btn-primary" disabled={Boolean(detalhe.alerta)} onClick={()=>executar(()=>decidir('aprovada'))}>Aprovar ajuste</button><button type="button" className="btn btn-secondary" onClick={()=>executar(()=>decidir('rejeitada'))}>Rejeitar captura</button></fieldset>
          {pedido&&<><p>Resposta não confirmada. Reenvie a mesma decisão para recuperar seu recibo.</p><button type="button" className="btn btn-secondary" disabled={ocupado} onClick={()=>executar(()=>decidir(pedido.resultado))}>Recuperar decisão original</button></>}
        </>}
      </article>}
    </>}
  </section>;
}
