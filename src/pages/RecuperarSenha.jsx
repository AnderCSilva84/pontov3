import {useRef,useState} from 'react';
import {recuperarSenha} from '../services/conta';
import {PageHeader} from '../components/ui';
export default function RecuperarSenha({onNavigate}) {
  const [ocupado,setOcupado]=useState(false),[erro,setErro]=useState(''),[mensagem,setMensagem]=useState('');const trava=useRef(false);
  return <div className="page-bg"><main className="page-shell"><PageHeader title="Recuperar senha" back={()=>onNavigate('/ponto')}/><section className="card"><form className="compras-form" onSubmit={async e=>{e.preventDefault();if(trava.current)return;trava.current=true;const email=new FormData(e.currentTarget).get('email');setOcupado(true);setErro('');setMensagem('');try{setMensagem(await recuperarSenha(email));}catch(e){setErro(e.message);}finally{trava.current=false;setOcupado(false);}}}><label className="field"><span>Email</span><input type="email" name="email" autoComplete="email" maxLength={254} required /></label><button className="btn btn-primary" disabled={ocupado}>{ocupado?'Solicitando…':'Enviar instruções'}</button></form>{mensagem&&<p role="status">{mensagem}</p>}{erro&&<p role="alert">{erro}</p>}<p>Siga as instruções enviadas por email. Depois volte ao aplicativo e entre com a nova senha.</p></section></main></div>;
}
