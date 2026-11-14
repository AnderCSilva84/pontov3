import {useEffect,useMemo,useState} from 'react';
import {buscarDiasPorPeriodo} from '../services/ponto';
import {somarBancoHoras} from '../utils/pontoSaldo';

export default function useResumoPonto({funcionarioId,hoje,dia,jornadaCarregada,funcionario,inicioContagem}){
 const [periodo,setPeriodo]=useState(null),[erro,setErro]=useState('');
 const mes=hoje.slice(0,7),[ano,numeroMes]=mes.split('-').map(Number);
 const anterior=new Date(Date.UTC(ano,numeroMes-2,1)).toISOString().slice(0,7);
 useEffect(()=>{
  let ativo=true;
  if(funcionarioId)buscarDiasPorPeriodo(funcionarioId,anterior+'-01',mes+'-31',65).then(registros=>{
   if(registros.length>=65)throw Error('Período excedido');
   if(ativo){setPeriodo({funcionarioId,mes,registros});setErro('');}
  }).catch(()=>{if(ativo){setPeriodo(null);setErro('Não foi possível carregar o resumo. Os registros de hoje continuam disponíveis.');}});
  return()=>{ativo=false;};
 },[funcionarioId,anterior,mes,hoje]);
 useEffect(()=>{
  function corrigiu(e){const r=e.detail;if(r?.funcionarioId!==funcionarioId||!r.dia||r.dataKey<anterior+'-01'||r.dataKey>mes+'-31')return;
   setPeriodo(p=>p?.funcionarioId===funcionarioId&&p.mes===mes?{...p,registros:[...p.registros.filter(d=>d.dataKey!==r.dataKey),r.dia]}:p);
  }
  window.addEventListener('ap1303-jornada-corrigida',corrigiu);
  return()=>window.removeEventListener('ap1303-jornada-corrigida',corrigiu);
 },[funcionarioId,anterior,mes]);
 return useMemo(()=>{
  const registros=periodo?.funcionarioId===funcionarioId&&periodo.mes===mes?periodo.registros:[];
  // Reutiliza a jornada em tempo real, sem reler o mês após cada marcação.
  const atuais=jornadaCarregada?[...registros.filter(r=>r.dataKey!==hoje),...(dia?[dia]:[])]:registros;
  const segunda=new Date(hoje+'T12:00Z'),semanaDia=segunda.getUTCDay();
  segunda.setUTCDate(segunda.getUTCDate()-(semanaDia===0?6:semanaDia-1));
  const inicioSemana=segunda.toISOString().slice(0,10);
  return {carregando:Boolean(funcionarioId&&!erro&&(periodo?.funcionarioId!==funcionarioId||periodo?.mes!==mes)),bancoHoras:somarBancoHoras(atuais,funcionario,mes,inicioContagem),horasPendentesAnterior:Math.max(0,-somarBancoHoras(atuais,funcionario,anterior,inicioContagem)),
   trabalhadoMin:atuais.filter(r=>r.dataKey?.startsWith(mes)&&r.dataKey<=hoje).reduce((n,r)=>n+(Number(r.totalMin)||0),0),
   diasSemana:semanaDia===0?[]:atuais.filter(r=>r.dataKey>=inicioSemana&&r.dataKey<=hoje),erro};
 },[periodo,funcionarioId,mes,anterior,hoje,dia,jornadaCarregada,funcionario,inicioContagem,erro]);
}
