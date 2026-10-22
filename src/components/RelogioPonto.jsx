import {useEffect,useState} from 'react';
export default function RelogioPonto(){
 const [agora,setAgora]=useState(()=>new Date());
 useEffect(()=>{const atualizar=()=>setAgora(new Date());const timer=setInterval(atualizar,1000);document.addEventListener('visibilitychange',atualizar);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',atualizar);};},[]);
 const partes=Object.fromEntries(new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Fortaleza',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(agora).map(p=>[p.type,p.value]));
 return <div className="ponto-relogio-digital" aria-label="Relógio, horário atual de Brasília"><span className="ponto-relogio-legenda">Horário atual</span><div><strong>{partes.hour}<span className="ponto-relogio-separador">:</span>{partes.minute}</strong><span className="ponto-relogio-segundos">{partes.second}</span></div><small>Brasília · UTC−3</small></div>;
}
