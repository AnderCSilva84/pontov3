import { dataHoraExibicao } from '../utils/datasExibicao.js';
import {useEffect,useRef,useState} from 'react';
import {httpsCallable} from 'firebase/functions';
import {auth,functions} from '../services/firebase';
import {obterGrupoAtual} from '../services/dadosGrupo';
import {pontePush,controlePush} from '../services/pushNativo';
import {destinoAviso} from '../utils/pushAndroid';
export default function NotificacoesAndroid({user}) {
 const [aviso,setAviso]=useState(null),[dados,setDados]=useState(null),[erro,setErro]=useState(''),[ocupado,setOcupado]=useState(false),[feito,setFeito]=useState(false),[bloqueado,setBloqueado]=useState(false);
 const semSessao=user===null,perfilInativo=user?.ativo===false;
 const atual=useRef(user),trava=useRef(false);atual.current=user;
 useEffect(()=>{
  let vivo=true;const listeners=[];
  function receber(d){if(!vivo)return;if(d?.canal==='cuidados'||d?.tipo==='lembrete'||d?.rota?.startsWith('/lembretes')){pontePush.limparPendente().catch(()=>{});return;}if(!atual.current){setAviso(d);return;}if(!destinoAviso(d,atual.current)){setErro('Este aviso não está disponível para a conta atual.');setAviso(null);return;}setAviso(d);setDados(null);setFeito(false);setBloqueado(false);setErro('');}
  const registrar=async()=>{for(const [nome,fn]of [['mensagem',receber],['toque',receber],['token',()=>{if(controlePush.preferencia())controlePush.ativar(false).catch(()=>{});}]]){const h=await pontePush.addListener(nome,fn);if(vivo)listeners.push(h);else h.remove();}const r=await pontePush.pendente();if(r.aviso)receber(r.aviso);};registrar().catch(()=>{});
  return()=>{vivo=false;listeners.forEach(h=>h.remove());};
 },[]);
 useEffect(()=>{
  const u=atual.current;let vivo=true;
  if(semSessao||perfilInativo){pontePush.pendente().then(r=>{if(vivo&&r.aviso)setAviso(r.aviso);return pontePush.suspender();}).catch(()=>{});return()=>{vivo=false;};}
  if(!u)return;
  pontePush.contexto({uid:u.uid,grupoId:u.grupoId||''}).then(()=>{if(vivo&&controlePush.preferencia())return controlePush.ativar(false);}).catch(()=>{});
  return()=>{vivo=false;controlePush.invalidar();};
 },[user?.uid,user?.grupoId,semSessao,perfilInativo]); // Perfil pronto antes de restaurar o vínculo.
 useEffect(()=>{
  let vivo=true;
  const limpar=()=>{controlePush.invalidar();setAviso(null);setDados(null);setErro('');pontePush.suspender().catch(()=>{});};
  const grupoMudou=()=>{
   controlePush.invalidar();setAviso(null);setDados(null);setErro('');
   const uid=auth.currentUser?.uid,grupoId=obterGrupoAtual()||'';if(!uid){limpar();return;}
   // A primeira resolução do mesmo grupo não deve apagar o toque recebido a frio.
   pontePush.contexto({uid,grupoId}).then(()=>pontePush.pendente()).then(r=>{if(vivo&&auth.currentUser?.uid===uid&&(obterGrupoAtual()||'')===grupoId&&r.aviso&&(!atual.current||destinoAviso(r.aviso,atual.current)))setAviso(r.aviso);}).catch(()=>{});
  };
  window.addEventListener('ap1303-ponto-sair',limpar);window.addEventListener('ap1303-contexto-alterado',grupoMudou);
  return()=>{vivo=false;window.removeEventListener('ap1303-ponto-sair',limpar);window.removeEventListener('ap1303-contexto-alterado',grupoMudou);};
 },[]);
 useEffect(()=>{
  if(!aviso||aviso.acao!==false||!user)return;
  const rota=destinoAviso(aviso,user);
  if(!rota)return;
  window.history.pushState({},'',rota);window.dispatchEvent(new PopStateEvent('popstate'));
  setAviso(null);pontePush.limparPendente().catch(()=>{});
 },[aviso,user]);
 function falhar(e){setErro(e.message);if(['functions/not-found','functions/permission-denied','functions/failed-precondition'].includes(e.code)){setBloqueado(true);pontePush.removerAviso({eventId:aviso.eventId}).catch(()=>{});}}
 function validar(){if(!user||auth.currentUser?.uid!==user.uid||!destinoAviso(aviso,atual.current))throw new Error('Entre na conta que recebeu este aviso.');}
 async function consultar(){if(trava.current)return;trava.current=true;setOcupado(true);setErro('');try{validar();if(!navigator.onLine)throw new Error('Reconecte para consultar e confirmar. Nada foi concluído.');const d=(await httpsCallable(functions,'acaoNotificacaoTarefa')({...alvo(),operacao:'consultar'})).data;validar();setDados(d);if(d.concluida)await pontePush.removerAviso({eventId:aviso.eventId});}catch(e){falhar(e);}finally{trava.current=false;setOcupado(false);}}
 function alvo(){return {id:aviso.itemId,tipo:aviso.tipo,dataKey:aviso.dataKey,revisao:aviso.revisao,grupoId:user.grupoId||''};}
 async function concluir(){if(trava.current)return;trava.current=true;setOcupado(true);setErro('');try{validar();if(!navigator.onLine)throw new Error('Reconecte para confirmar. A conclusão não foi registrada.');if(!window.confirm('Confirmar a conclusão desta tarefa?'))return;
  await httpsCallable(functions,'acaoNotificacaoTarefa')({...alvo(),operacao:'concluir',declaradaEmMs:Date.now()});validar();setFeito(true);await pontePush.removerAviso({eventId:aviso.eventId});await pontePush.limparPendente();
 }catch(e){falhar(e);if(!['functions/not-found','functions/permission-denied','functions/failed-precondition'].includes(e.code))setErro(e.message+' Se o resultado ficou incerto, consulte novamente ou repita a mesma confirmação ao reconectar.');}finally{trava.current=false;setOcupado(false);}}
 function fechar(){setAviso(null);setDados(null);setErro('');pontePush.limparPendente().catch(()=>{});}
 if(!aviso&&!erro)return null;
 if(user===undefined)return null;
 if(user===null&&aviso)return <aside className="card" role="status" style={{position:'fixed',bottom:16,left:'5%',right:'5%',zIndex:10000}}><p>Entre na conta que recebeu o aviso. A intenção será revalidada após o login.</p></aside>;
 const permitido=destinoAviso(aviso,user);
 return <section className="card" role="dialog" aria-label="Aviso do aplicativo" style={{position:'fixed',top:16,left:'5%',right:'5%',maxHeight:'85vh',overflow:'auto',zIndex:10000}}><h2>Aviso Tá no Ponto</h2>{erro&&<p role="alert">{erro}</p>}{!user?<p>Entre na conta que recebeu o aviso para continuar.</p>:permitido?<>{!dados&&!feito&&<div>{aviso.conteudo==='alimentacao'&&['/tarefas','/alimentacao'].includes(aviso.rota)?<><h3>{aviso.title}</h3><p>{aviso.body}</p></>:<p>Há uma atualização disponível.</p>}</div>}{aviso.tipo&&!dados&&!feito&&!bloqueado&&<button className="btn btn-primary" disabled={ocupado} onClick={consultar}>{'Revisar tarefa'}</button>}{dados&&!feito&&!bloqueado&&<><h3>{dados.titulo}</h3>{Number.isFinite(dados.horarioMs)&&<p>{dataHoraExibicao(new Date(dados.horarioMs), {timeZone:'America/Fortaleza',dateStyle:'short',timeStyle:'short'})}</p>}{dados.concluida?<p>Este item já foi concluído.</p>:<button className="btn btn-success" disabled={ocupado||dados.liberada===false} onClick={concluir}>{ocupado?'Confirmando…':'Concluir tarefa'}</button>}</>}{feito&&<p role="status">Concluído com sucesso.</p>}<button className="btn btn-secondary" disabled={ocupado} onClick={()=>{window.history.pushState({},'',permitido);window.dispatchEvent(new PopStateEvent('popstate'));fechar();}}>Abrir tela</button></>:null}<button className="btn btn-secondary" disabled={ocupado} onClick={fechar}>Fechar</button></section>;
}
export function ConfigurarAvisosAndroid(){
 const [estado,setEstado]=useState(null),[erro,setErro]=useState(''),[ocupado,setOcupado]=useState(false);
 useEffect(()=>{let vivo=true;const atualizar=()=>pontePush.estado().then(r=>{if(vivo)setEstado(r);}).catch(()=>{});atualizar();window.addEventListener('ap1303-retomar',atualizar);return()=>{vivo=false;window.removeEventListener('ap1303-retomar',atualizar);};},[]);
 async function executar(acao){setOcupado(true);setErro('');try{await acao();}catch(e){if(e.details?.motivo==='sem-dispositivo'){await pontePush.invalidarCadastro();controlePush.invalidar();setErro('Ative os avisos novamente para receber notificações.');}else setErro(e.message);}finally{try{setEstado(await pontePush.estado());}catch{/* A leitura local não deve ocultar o resultado da operação. */}setOcupado(false);}}
 return <section className="card conta-notificacoes"><h2>Notificações Android</h2>{estado&&!estado.configurado&&<p>Este APK demo ainda não possui configuração Firebase de teste para entrega de avisos.</p>}{erro&&<p role="alert">{erro}</p>}<p>{estado&&!estado.permitido?'Avisos bloqueados pela permissão do Android.':estado?.ativo?'Avisos ativados neste aparelho.':'Avisos desativados neste aparelho.'}</p><div className="conta-notificacoes-acoes"><button className="btn btn-primary" disabled={ocupado} onClick={()=>executar(()=>controlePush.ativar(true))}>Ativar avisos</button><button className="btn btn-secondary" disabled={ocupado} onClick={()=>executar(()=>controlePush.suspender(true))}>Desativar avisos</button><button className="btn btn-secondary" disabled={ocupado} onClick={()=>executar(()=>pontePush.configuracoes())}>Configurações do Android</button><button className="btn btn-secondary" disabled={ocupado||!estado?.ativo||!estado?.permitido} onClick={()=>executar(()=>httpsCallable(functions,'testarNotificacaoPush')({}))}>Testar aviso nesta conta</button></div></section>;
}
