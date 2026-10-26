import {useRef,useState} from 'react';
import {revisarPendencia} from '../services/pontoRevisao';
import {dataOperacional} from '../utils/dataPonto';
const horarios=[['entrada','Entrada'],['saidaIntervalo','Saída para intervalo'],['entradaIntervalo','Retorno do intervalo'],['saida','Saída']];
export default function PontoAjuste({funcionarioId,nome}){
 const [data,setData]=useState(dataOperacional()),[detalhe,setDetalhe]=useState(null),[tipo,setTipo]=useState('manual'),[horas,setHoras]=useState({}),[motivo,setMotivo]=useState(''),[abono,setAbono]=useState('');
 const [ocupado,setOcupado]=useState(false),[erro,setErro]=useState(''),[aviso,setAviso]=useState('');
 const trava=useRef(false),pedido=useRef(null);
 async function executar(fn){if(trava.current)return;trava.current=true;setOcupado(true);setErro('');setAviso('');try{await fn();}catch(e){setErro((e.message||'Não foi possível confirmar.')+' Seus campos foram mantidos.');}finally{trava.current=false;setOcupado(false);}}
 async function abrir(){const r=await revisarPendencia({acao:'detalheDia',funcionarioId,dataKey:data});setDetalhe(r);setHoras(Object.fromEntries(horarios.map(([k])=>[k,r.dia?.[k]||''])));setTipo(r.dia?.ajusteTipo||'manual');setMotivo('');setAbono('');pedido.current=null;}
 async function salvar(){
  if(motivo.trim().length<5)throw Error('Informe uma justificativa com pelo menos 5 caracteres.');
  const dados={acao:'ajustarDia',funcionarioId,dataKey:data,revisaoDia:detalhe.revisaoDia,tipo,...horas,justificativa:motivo.trim(),abonoMin:abono===''?null:Number(abono)};
  const chave=JSON.stringify(dados);
  if(pedido.current?.chave!==chave){
   if(!window.confirm(`Confirmar correção administrativa de ${nome} em ${data}? Os registros originais serão preservados na auditoria.`))return;
   pedido.current={chave,dados:{...dados,operacaoId:crypto.randomUUID()}};
  }
  await revisarPendencia(pedido.current.dados);pedido.current=null;setDetalhe(null);setAviso('Correção salva com justificativa e autoria do administrador. Os registros originais foram preservados.');
 }
 return <details className="card"><summary>Corrigir e justificar ponto — {nome}</summary><p>Correção administrativa auditada. Isso não registra uma batida em nome da funcionária.</p>
  <label className="field"><span>Data da jornada</span><input type="date" value={data} disabled={ocupado} onChange={e=>{setData(e.target.value);setDetalhe(null);pedido.current=null;setErro('');setAviso('');}}/></label>
  <button type="button" className="btn btn-secondary" disabled={ocupado||!data} onClick={()=>executar(abrir)}>Carregar jornada para corrigir</button>
  {detalhe&&<form className="compras-form" onSubmit={e=>{e.preventDefault();executar(salvar);}}><fieldset disabled={ocupado||Boolean(detalhe.bloqueio)}>
   <label className="field"><span>Tipo de correção</span><select value={tipo} onChange={e=>setTipo(e.target.value)}>{[['manual','Corrigir horários'],['saida_mais_cedo','Saída antecipada abonada'],['falta','Falta'],['atestado','Atestado'],['dispensa','Dispensa'],['ferias','Férias (dia selecionado)']].map(([id,n])=><option key={id} value={id}>{n}</option>)}</select></label>
   {['manual','saida_mais_cedo'].includes(tipo)?horarios.filter(([k])=>!detalhe.semIntervalo||!k.includes('Intervalo')).map(([k,n])=><label className="field" key={k}><span>{n}</span><input type="time" required value={horas[k]||''} onChange={e=>setHoras(h=>({...h,[k]:e.target.value}))}/></label>):tipo!=='falta'&&<label className="field"><span>Abono em minutos (vazio = carga completa do dia)</span><input type="number" min="0" step="1" value={abono} onChange={e=>setAbono(e.target.value)}/></label>}
   <label className="field"><span>Justificativa obrigatória</span><textarea required minLength={5} maxLength={1000} value={motivo} onChange={e=>setMotivo(e.target.value)}/></label>
   <button type="submit" className="btn btn-primary">Salvar correção com justificativa</button>
  </fieldset>{detalhe.bloqueio&&<p role="alert">{detalhe.bloqueio}</p>}</form>}
  {ocupado&&<p role="status">Aguarde…</p>}{erro&&<p role="alert">{erro}</p>}{aviso&&<p role="status">{aviso}</p>}
 </details>;
}
