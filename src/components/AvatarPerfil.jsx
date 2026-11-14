import {useContext,useEffect,useState} from 'react';
import {SessaoContext} from './ui/SessaoContext';
import {consultarFotoPerfil} from '../services/fotoPerfil';
export default function AvatarPerfil({usuario,className='sessao-avatar'}) {
  const sessao=useContext(SessaoContext),u=usuario||sessao;
  const [foto,setFoto]=useState(null),[falhou,setFalhou]=useState(null);
  const chave=JSON.stringify([sessao?.uid,sessao?.grupoId,u?.uid,u?.fotoPerfilVersao,u?.temFotoPerfil]);
  const embutida=Object.hasOwn(u||{},'fotoInteracao');
  useEffect(()=>{if(embutida)return;let ativa=true;consultarFotoPerfil(sessao,u).then(src=>{if(ativa)setFoto({chave,src});}).catch(()=>{});return()=>{ativa=false;};},[chave,sessao,u,embutida]);
  const nome=u?.nome||'Conta',iniciais=nome.trim().split(/\s+/).filter((_,i,a)=>i===0||i===a.length-1).map(p=>p[0]).join('').slice(0,2);
  const src=embutida?u.fotoInteracao:foto?.chave===chave?foto.src:null;
  return <span className={className} aria-label={'Perfil de '+nome}>{src&&falhou!==chave?<img src={src} alt="" onError={()=>setFalhou(chave)}/>:<span aria-hidden="true">{iniciais}</span>}</span>;
}
