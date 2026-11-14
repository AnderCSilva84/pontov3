import {useEffect,useState} from 'react';
import {carregarDiaPorData} from '../services/ponto';
import {dataExibicao} from '../utils/datasExibicao';

const dias=[['domingo','Domingo'],['segunda','Segunda'],['terca','Terça'],['quarta','Quarta'],['quinta','Quinta'],['sexta','Sexta'],['sabado','Sábado']];
export default function EscalaAcompanhamento({funcionarioId,escala,hoje}){
 const [selecionado,setSelecionado]=useState(null),[log,setLog]=useState(null),[carregando,setCarregando]=useState(false),[erro,setErro]=useState('');
 useEffect(()=>{
  if(!selecionado)return;
  let ativo=true;
  carregarDiaPorData(funcionarioId,selecionado.data).then(d=>{if(ativo)setLog(d||{});}).catch(()=>{if(ativo)setErro('Não foi possível consultar as marcações deste dia. Selecione o dia novamente para tentar.');}).finally(()=>{if(ativo)setCarregando(false);});
  return()=>{ativo=false;};
 },[funcionarioId,selecionado]);
 function selecionar(indice,nome){setCarregando(true);setLog(null);setErro('');const data=new Date(hoje+'T12:00:00Z');data.setUTCDate(data.getUTCDate()-data.getUTCDay()+indice);setSelecionado({nome,data:data.toISOString().slice(0,10)});}
 return <section className="card"><h2>Escala semanal</h2><p className="text-muted">Horários previstos. Selecione um dia para consultar as marcações da semana atual.</p>
  <div className="acompanhamento-escala">{dias.map(([chave,nome],i)=>{const horario=escala?.[chave];return <button type="button" key={chave} aria-pressed={selecionado?.nome===nome} onClick={()=>selecionar(i,nome)}><strong>{nome}</strong><span>{horario?.inicio&&horario?.fim?`${horario.inicio} — ${horario.fim}`:'Sem horário cadastrado'}</span></button>;})}</div>
  <div aria-live="polite">{!selecionado?<p>Toque em um dia para abrir o log de interação.</p>:<><h3>Log de interação · {selecionado.nome} · {dataExibicao(selecionado.data)}</h3>{carregando?<p role="status">Consultando marcações…</p>:erro?<p role="alert">{erro}</p>:log&&<><dl className="ponto-acompanhamento-horarios">{[['Entrada',log.entrada],['Saída para intervalo',log.saidaIntervalo],['Volta do intervalo',log.entradaIntervalo],['Saída',log.saida]].map(([nome,hora])=><div key={nome}><dt>{nome}</dt><dd>{hora||'Não registrado'}</dd></div>)}</dl>{!['entrada','saidaIntervalo','entradaIntervalo','saida'].some(k=>log[k])&&<p>Nenhuma interação registrada neste dia.</p>}</>}</>}</div>
 </section>;
}

