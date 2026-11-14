import {useEffect,useRef,useState} from 'react';
export default function ConcluirAviso({lembrete,ocupado,erro,onConfirmar,onFechar}){
 const ref=useRef(null),trava=useRef(false),[feedback,setFeedback]=useState('');
 useEffect(()=>{const dialog=ref.current,anterior=document.activeElement,overflow=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';dialog.showModal();return()=>{dialog.close();document.documentElement.style.overflow=overflow;anterior?.focus();};},[]);
 const fechar=()=>{if(!ocupado&&!trava.current)onFechar();};
 async function enviar(e){e.preventDefault();if(trava.current)return;trava.current=true;try{if(await onConfirmar(feedback))onFechar();}finally{trava.current=false;}}
 return <dialog ref={ref} className="aviso-conclusao-dialog" aria-labelledby="concluir-aviso-titulo" onCancel={e=>{e.preventDefault();fechar();}}>
  <header><h2 id="concluir-aviso-titulo">Concluir lembrete</h2><p>{lembrete.titulo}</p></header>
  <form onSubmit={enviar}>
   <label className="field">Mensagem de feedback <span className="text-muted">Opcional · visível para quem criou o lembrete</span><textarea autoFocus value={feedback} onChange={e=>setFeedback(e.target.value)} maxLength={500} rows={4} disabled={ocupado} placeholder="Ex.: Documento assinado e anexado. Tudo certo!" aria-describedby="feedback-limite"/></label>
   <small id="feedback-limite">{feedback.length}/500 caracteres. Você também pode concluir sem mensagem.</small>
   {erro&&<p className="mensagem erro" role="alert">{erro}</p>}
   <footer><button type="button" className="btn btn-secondary" disabled={ocupado} onClick={fechar}>Cancelar</button><button className="btn btn-success" disabled={ocupado}>{ocupado?'Concluindo…':'Confirmar conclusão'}</button></footer>
  </form>
 </dialog>;
}
