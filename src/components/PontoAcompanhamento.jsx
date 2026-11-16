import PontoTitular from './PontoTitular';
import {useState} from 'react';
import EscalaAcompanhamento from './EscalaAcompanhamento';
import {PageHeader} from './ui';
import BottomNav from './BottomNav';
import {dataExibicao} from '../utils/datasExibicao';
import '../styles/ponto-acompanhamento.css';

const horas=min=>{const n=Math.round(Math.abs(Number(min)||0));return `${Math.floor(n/60)}h ${String(n%60).padStart(2,'0')}min`;};
function InteracoesPonto({hoje,dia,diasSemana,pronto}){
 const [expandido,setExpandido]=useState(false);
 const atual={...(dia||{}),dataKey:hoje};
 const registros=expandido?[...diasSemana.filter(d=>d.dataKey!==hoje&&d.dataKey<=hoje),atual].sort((a,b)=>b.dataKey.localeCompare(a.dataKey)):[];
 return <section className="card">{expandido&&<h2>Interações no ponto nesta semana</h2>}<button type="button" className="btn btn-secondary" disabled={!pronto} aria-expanded={expandido} onClick={()=>setExpandido(v=>!v)}>{expandido?'Recolher semana':'Expandir semana completa'}</button>{pronto&&registros.map(r=><article className="ponto-acompanhamento-dia" key={r.dataKey}><h3>{dataExibicao(r.dataKey)}</h3><dl className="ponto-acompanhamento-horarios">{[['Entrada',r.entrada],['Saída para intervalo',r.saidaIntervalo],['Volta do intervalo',r.entradaIntervalo],['Saída',r.saida]].map(([label,h])=><div key={label}><dt>{label}</dt><dd>{h||'Não registrado'}</dd></div>)}</dl>{!['entrada','saidaIntervalo','entradaIntervalo','saida'].some(k=>r[k])&&<p>Nenhuma interação registrada neste dia.</p>}</article>)}</section>;
}

export default function PontoAcompanhamento({user,onNavigate,funcionarios,funcionarioId,selecionar,nome,hoje,dia,diasSemana,bancoHoras,horasHoje,horasSemana,horasMes,carregando,erro,escala}){
 const pronto=funcionarioId&&!carregando&&!erro;
 return <div className="page-bg"><main className="page-shell ponto-acompanhamento"><PageHeader title="Acompanhamento de ponto" subtitle="Registros de horário, banco de horas e horas trabalhadas da equipe."/>
  <PontoTitular user={user}/>
  <section className="card"><label className="field"><span>Pessoa da equipe</span><select value={funcionarioId} onChange={e=>selecionar(e.target.value)}><option value="">Escolha quem deseja acompanhar</option>{funcionarios.map(f=><option key={f.id} value={f.id}>{f.nome}</option>)}</select></label></section>
  {!funcionarioId?<section className="card"><h2>Selecione uma pessoa da equipe</h2><p>Os registros de ponto aparecerão aqui após a seleção.</p></section>:<>
   <section className="card"><h2>Ponto de {nome}</h2><p className="text-muted">{dataExibicao(hoje)} · Acompanhamento da jornada</p>{carregando&&<p role="status">Consultando registros e totais…</p>}{erro&&<p role="alert">{erro}</p>}</section>
   <div className="ponto-acompanhamento-resumo"><section className="card"><span>Banco de horas</span><strong className={bancoHoras<0?'negativo':bancoHoras>0?'positivo':''}>{pronto?(bancoHoras<0?'−':bancoHoras>0?'+':'')+horas(bancoHoras):'—'}</strong></section><section className="card"><span>Trabalhado hoje</span><strong>{pronto?horas(horasHoje):'—'}</strong></section><section className="card"><span>Trabalhado na semana</span><strong>{pronto?horas(horasSemana):'—'}</strong></section><section className="card"><span>Trabalhado no mês</span><strong>{pronto?horas(horasMes):'—'}</strong></section></div>
   {pronto&&<EscalaAcompanhamento key={funcionarioId+hoje} funcionarioId={funcionarioId} escala={escala} hoje={hoje}/>}<InteracoesPonto key={funcionarioId+hoje} hoje={hoje} dia={dia} diasSemana={diasSemana} pronto={pronto}/>
  </>}
 </main><BottomNav activePath="/ponto" user={user} onNavigate={onNavigate}/></div>;
}
