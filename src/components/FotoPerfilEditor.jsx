import {useContext,useEffect,useRef,useState} from 'react';
import {SessaoContext} from './ui/SessaoContext';
import AvatarPerfil from './AvatarPerfil';
import {prepararFotoPerfil} from '../utils/fotoPerfil';
import {salvarFotoPerfil} from '../services/fotoPerfil';
import '../styles/foto-perfil.css';
export default function FotoPerfilEditor(){
 const sessao=useContext(SessaoContext);
 return sessao?.uid?<Editor key={sessao.uid+':'+(sessao.grupoId||'')} sessao={sessao}/>:null;
}
function Editor({sessao}){
 const [foto,setFoto]=useState(null),[salva,setSalva]=useState(undefined),[ocupado,setOcupado]=useState(false),[erro,setErro]=useState(''),[aviso,setAviso]=useState('');
 const ativo=useRef(true),trava=useRef(false);
 useEffect(()=>{ativo.current=true;return()=>{ativo.current=false;};},[]);
 async function salvar(valor){
  if(trava.current)return;trava.current=true;setOcupado(true);setErro('');setAviso('');
  try{const resultado=await salvarFotoPerfil(valor);if(!ativo.current)return;setSalva({foto:valor,versao:resultado.versao});setFoto(null);setAviso(valor?'Foto de perfil salva com sucesso.':'Foto removida. Suas iniciais serão exibidas.');}
  catch(e){if(ativo.current)setErro(e.message||'Não foi possível salvar. Sua prévia foi mantida. Tente novamente.');}
  finally{trava.current=false;if(ativo.current)setOcupado(false);}
 }
 const usarSalva=salva!==undefined&&(Number(sessao.fotoPerfilVersao)||0)<salva.versao,atual=foto||(usarSalva?salva.foto:null);
 return <section className="card foto-perfil-editor"><h2>Minha foto de perfil</h2>
  <div className="foto-perfil-previa">{atual?<img src={'data:image/jpeg;base64,'+atual} alt={foto?'Prévia da nova foto':'Sua foto salva'}/>:usarSalva&&salva.foto===null?<span className="sessao-avatar" aria-label="Foto removida">{sessao.nome?.[0]||'?'}</span>:<AvatarPerfil/>}<div><strong>{foto?'Nova foto selecionada':'Foto atual'}</strong><p>{foto?'A prévia ainda não está salva. Confirme abaixo.':'Visível no seu grupo, em interações autorizadas e para os administradores.'}</p></div></div>
  {aviso&&<p className="foto-perfil-sucesso" role="status">{aviso}</p>}{erro&&<p className="mensagem erro" role="alert">{erro}</p>}
  <label className="field"><span>Escolher foto do dispositivo</span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={ocupado} onChange={async e=>{const f=e.target.files?.[0];e.target.value='';if(!f||trava.current)return;trava.current=true;setOcupado(true);setErro('');setAviso('');try{const resultado=await prepararFotoPerfil(f);if(ativo.current)setFoto(resultado);}catch(error){if(ativo.current)setErro(error.message);}finally{trava.current=false;if(ativo.current)setOcupado(false);}}}/></label>
  {foto&&<div className="foto-perfil-confirmacao"><button type="button" className="btn btn-primary" disabled={ocupado} onClick={()=>salvar(foto)}>{ocupado?'Salvando foto…':'Salvar foto no perfil'}</button><button type="button" className="btn btn-secondary" disabled={ocupado} onClick={()=>{setFoto(null);setErro('');}}>Cancelar troca</button></div>}
  {(usarSalva?Boolean(salva.foto):sessao.temFotoPerfil)&&<button type="button" className="btn btn-secondary" disabled={ocupado} onClick={()=>salvar(null)}>Remover minha foto</button>}
  {ocupado&&<p role="status">Preparando ou salvando foto. Aguarde a confirmação.</p>}
 </section>;
}
