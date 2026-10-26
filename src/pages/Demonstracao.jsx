import {useRef,useState} from 'react';
import {httpsCallable} from 'firebase/functions';
import {functions,auth} from '../services/firebase';
export default function Demonstracao({user,onNavigate}){
 const [dados,setDados]=useState(null),[erro,setErro]=useState(''),[ocupado,setOcupado]=useState(false),[id,setId]=useState(null);
 const trava=useRef(false);
 async function chamar(acao){if(trava.current)return;const uid=auth.currentUser?.uid;if(uid!==user?.uid)return;trava.current=true;setOcupado(true);setErro('');const operacaoId=id||crypto.randomUUID();if(acao==='avancar')setId(operacaoId);
  try{const r=(await httpsCallable(functions,'demonstracaoOperacao')({acao,...(acao==='avancar'?{operacaoId}:{})})).data;if(auth.currentUser?.uid!==uid)return;setDados(r);if(acao==='avancar')setId(null);}catch(e){if(auth.currentUser?.uid===uid)setErro(e.message||'Não foi possível consultar. Repita para recuperar o mesmo resultado.');}finally{trava.current=false;setOcupado(false);}}
 return <div className="page-bg"><main className="page-shell"><section className="card"><h1>Demonstração do AP1303</h1><p><strong>Dados fictícios · Sem GPS · Sem registro trabalhista · Sem notificações.</strong></p><p>Esta simulação é restrita ao grupo de revisão. O ponto normal mantém a validação de localização.</p><button className="btn btn-secondary" disabled={ocupado} onClick={()=>chamar('consultar')}>Consultar simulação</button>{user?.role==='funcionario'&&<button className="btn btn-primary" disabled={ocupado} onClick={()=>chamar('avancar')}>{ocupado?'Processando…':'Simular próxima marcação'}</button>}{dados&&<><p role="status">{dados.mensagem}</p><ul>{dados.registros.map((r,i)=><li key={i}>{r.hora} · {r.tipo.replaceAll('_',' ')}</li>)}</ul></>}{erro&&<p role="alert">{erro}</p>}<button className="compras-link" onClick={()=>onNavigate('/ponto')}>Voltar ao ponto</button></section></main></div>;
}
