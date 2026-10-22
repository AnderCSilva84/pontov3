import { collection, doc } from '../services/dadosGrupo';
import { useEffect, useState } from 'react';
import { onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { dataIsoLocal, feriadosBrasil } from '../utils/feriados';
import { normalizeRole } from '../utils/roles';
import { Icon, Segmented } from './ui';
const dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
export default function AgendaTarefas({ user, fixas, avulsas, editar, podeEditar, carregando }) {
  const [visao,setVisao] = useState('hoje'), [data,setData] = useState(dataIsoLocal), [conclusoes,setConclusoes] = useState({ chave:'', ids:new Set() }), [salvando,setSalvando] = useState(''), [erro,setErro] = useState('');
  const funcionarioId = user.funcionarioId || user.uid;
  const podeConcluir = ['admin','funcionario'].includes(normalizeRole(user.role));
  useEffect(() => {
    if (!podeConcluir) return;
    return onSnapshot(query(collection(db,'funcionarios',funcionarioId,'conclusoesRotina'),where('dataKey','==',data)), snap => setConclusoes({chave:funcionarioId+'_'+data,ids:new Set(snap.docs.map(d=>d.data().tarefaId))}),()=>setErro('Não foi possível consultar as conclusões.'));
  },[funcionarioId,data,podeConcluir]);
  const selecionada = new Date(data+'T12:00:00'), hoje = dataIsoLocal();
  const itens = [...fixas.filter(t=>Number(t.diaSemana)===selecionada.getDay()).map(t=>({...t,tipoAgenda:'fixa',feita:conclusoes.chave===funcionarioId+'_'+data&&conclusoes.ids.has(t.id)})),...avulsas.filter(t=>t.dataAgendada===data).map(t=>({...t,tipoAgenda:'avulsa',feita:t.concluida===true}))];
  const concluidas = itens.filter(t=>t.feita).length;
  const inicio = new Date(selecionada); inicio.setDate(inicio.getDate()-((inicio.getDay()+6)%7));
  const semana = Array.from({length:7},(_,i)=>{const d=new Date(inicio);d.setDate(d.getDate()+i);return d;});
  const mes = new Date(selecionada.getFullYear(),selecionada.getMonth(),1), feriados = feriadosBrasil(mes.getFullYear());
  async function concluir(t) {
    if (salvando || t.feita || !podeConcluir || data!==hoje) return;
    setSalvando(t.id);setErro('');
    try { if(t.tipoAgenda==='fixa') await setDoc(doc(db,'funcionarios',funcionarioId,'conclusoesRotina',`${data}_${t.id}`),{tarefaId:t.id,dataKey:data,concluidaEm:serverTimestamp(),concluidaPor:funcionarioId});
      else await updateDoc(doc(db,'tarefas',t.id),{concluida:true,concluidaEm:serverTimestamp(),concluidaPor:funcionarioId});
    }catch{setErro('Não foi possível concluir a tarefa. Tente novamente.');}finally{setSalvando('');}
  }
  if (erro) return <p className="mensagem erro" role="alert">{erro}</p>;
  if (carregando || podeConcluir && conclusoes.chave !== funcionarioId+'_'+data) return <p role="status">Carregando tarefas…</p>;
  return <section className="agenda-dia" aria-label="Agenda de tarefas"><Segmented value={visao} onChange={v=>{setVisao(v);if(v==='hoje')setData(hoje);}} label="Visualização das tarefas" options={[["hoje","Hoje"],["semana","Semana"],["mes","Mês"]]}/>
    <label className="field"><span>Data das tarefas</span><input type="date" value={data} onChange={e=>{if(e.target.value)setData(e.target.value);}}/></label>
    {visao==='semana' && <div className="agenda-datas">{semana.map(d=><button key={dataIsoLocal(d)} className={data===dataIsoLocal(d)?'active':''} onClick={()=>setData(dataIsoLocal(d))}><small>{dias[d.getDay()]}</small><b>{d.getDate()}</b></button>)}</div>}
    {visao==='mes' && <section className="card"><div className="section-header"><button className="icon-button" aria-label="Mês anterior" onClick={()=>setData(dataIsoLocal(new Date(mes.getFullYear(),mes.getMonth()-1,1)))}>‹</button><h2>{mes.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</h2><button className="icon-button" aria-label="Próximo mês" onClick={()=>setData(dataIsoLocal(new Date(mes.getFullYear(),mes.getMonth()+1,1)))}>›</button></div><div className="calendario-grid calendario-semana">{dias.map(d=><span key={d}>{d}</span>)}</div><div className="calendario-grid">{Array.from({length:mes.getDay()},(_,i)=><span key={'v'+i}/>)}{Array.from({length:new Date(mes.getFullYear(),mes.getMonth()+1,0).getDate()},(_,i)=>{const d=new Date(mes.getFullYear(),mes.getMonth(),i+1),key=dataIsoLocal(d),q=fixas.filter(t=>Number(t.diaSemana)===d.getDay()).length+avulsas.filter(t=>t.dataAgendada===key).length;return <button className={'agenda-mes-dia '+(key===data?'active':'')} key={key} aria-label={`${i+1}: ${q} tarefas${feriados[key]?', '+feriados[key]:''}`} onClick={()=>setData(key)}><b>{i+1}</b>{q>0&&<small>{q}</small>}{feriados[key]&&<span title={feriados[key]}>•</span>}</button>;})}</div></section>}
    <div><h2>{selecionada.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}</h2><p>{concluidas} de {itens.length} tarefas concluídas</p><progress className="agenda-progresso" aria-label="Progresso das tarefas" max={Math.max(itens.length,1)} value={concluidas}/></div>
    {erro&&<p className="mensagem erro" role="alert">{erro}</p>}
    {itens.length===0&&<p className="card">Nenhuma tarefa para esta data.</p>}
    {['manha','tarde','noite'].map(turno=>{const grupo=itens.filter(t=>(t.turno||'manha')===turno);return grupo.length>0&&<section key={turno}><h2>{{manha:'Manhã',tarde:'Tarde',noite:'Noite'}[turno]}</h2><div className="card">{grupo.map(t=><div className="agenda-linha" key={t.tipoAgenda+t.id}><button className={'check-button '+(t.feita?'done':'')} aria-label={t.feita?`${t.titulo}: concluída`:`Concluir ${t.titulo}`} disabled={t.feita||!podeConcluir||data!==hoje||Boolean(salvando)} onClick={()=>concluir(t)}>{t.feita&&<Icon name="check"/>}</button><div><strong>{t.titulo}</strong><small>{t.horario ? t.horario+' · ':''}{t.tipoAgenda==='fixa'?'Rotina fixa':'Tarefa avulsa'} · {t.feita?'Concluída':'Pendente'}</small></div>{podeEditar&&<button className="icon-button" aria-label={`Detalhes de ${t.titulo}`} onClick={()=>editar(t,t.tipoAgenda)}><Icon name="chevron"/></button>}</div>)}</div></section>;})}
  </section>;
}
