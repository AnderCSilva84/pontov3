import {useEffect,useState} from 'react';
import {operarLembrete} from '../services/lembretes';
export default function LembreteNotificacao({user,aoConcluir}) {
 const [alvo,setAlvo]=useState(()=>{const p=new URLSearchParams(window.location.search);return p.has('lembreteId')?{id:p.get('lembreteId'),ocorrenciaId:p.get('ocorrenciaId'),destinatario:p.get('destinatario')}:null;});
 const [dados,setDados]=useState(null),[erro,setErro]=useState(''),[ocupado,setOcupado]=useState(false);
 useEffect(()=>{
  if(!alvo||alvo.destinatario!==user.uid)return;
  let ativa=true;operarLembrete('consultarOcorrencia',{id:alvo.id,ocorrenciaId:alvo.ocorrenciaId}).then(r=>{if(ativa)setDados(r);}).catch(e=>{if(ativa)setErro(e.message);});return()=>{ativa=false;};
 },[alvo,user.uid]);
 if(!alvo)return null;
 function fechar(){window.history.replaceState({},'',window.location.pathname);setAlvo(null);}
 async function concluir(){if(ocupado)return;setOcupado(true);setErro('');try{await operarLembrete('concluir',{id:alvo.id,ocorrenciaId:alvo.ocorrenciaId});setDados(d=>({...d,concluida:true}));aoConcluir();}catch(e){setErro(e.message);}finally{setOcupado(false);}}
 return <section className="card lembrete-notificacao" aria-label="Cuidado da notificação"><span className="ui-badge">Aberto pela notificação</span><h2>{dados?.titulo||'Lembrete de cuidado'}</h2>{alvo.destinatario!==user.uid?<p role="alert">Este aviso foi enviado para outra conta. Entre com a conta que recebeu a notificação.</p>:<>{erro&&<p role="alert" className="mensagem erro">{erro}</p>}{!dados&&!erro&&<p role="status">Consultando o cuidado…</p>}{dados&&<><p>{dados.nomeCuidado}</p><p>{new Date(dados.horarioMs).toLocaleString('pt-BR',{timeZone:'America/Fortaleza',dateStyle:'short',timeStyle:'short'})}</p>{dados.medicamento&&<p><strong>{dados.medicamento}</strong> · {dados.posologia}</p>}{dados.concluida?<p role="status">Este cuidado já foi concluído.</p>:<button className="btn btn-success" disabled={ocupado||!dados.liberada} onClick={concluir}>{ocupado?'Confirmando…':dados.liberada?`Confirmar cuidado realizado · ${user.nome||user.email}`:'Aguarde o horário do cuidado'}</button>}</>}</>}<button type="button" className="btn btn-secondary" disabled={ocupado} onClick={fechar}>Voltar à escala</button></section>;
}
