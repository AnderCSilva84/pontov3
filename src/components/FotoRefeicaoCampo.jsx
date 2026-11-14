import {useEffect,useRef,useState} from 'react';
import {operarAviso} from '../services/avisos';
import {resolverImagemRefeicao} from '../utils/imagemRefeicao';

export function FotoRefeicao({src,nome}){
 const [falhou,setFalhou]=useState(false);
 return falhou?<p className="alimentacao-foto-indisponivel" role="status">Não foi possível carregar a foto. Use outro link ou tente “Buscar foto” na edição.</p>:<img className="alimentacao-foto" src={src} alt={'Foto de '+nome} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setFalhou(true)}/>;
}

export default function FotoRefeicaoCampo({refeicao:r,indice,alterar,aoBuscar}){
 const [link,setLink]=useState(r.imagemUrl||''),[previa,setPrevia]=useState(r.imagemUrl||''),[erro,setErro]=useState(''),[aviso,setAviso]=useState(''),[buscando,setBuscando]=useState(false),[tentativa,setTentativa]=useState(0);
 const controlador=useRef(null),entrada=useRef(null);
 useEffect(()=>()=>{controlador.current?.abort();aoBuscar(r.id,false);},[r.id,aoBuscar]);
 function mudar(v){
  setLink(v);setErro('');setAviso('');
  entrada.current?.setCustomValidity(v.trim()&&v.trim()!==(r.imagemUrl||'')?'Clique em Buscar foto para aplicar o link antes de salvar.':'');
  if(!v.trim()){alterar(r.id,'imagemUrl','');setPrevia('');}
 }
 function manterAtual(){setLink(r.imagemUrl||'');setPrevia(r.imagemUrl||'');setErro('');setAviso('');entrada.current?.setCustomValidity('');}
 function remover(){setLink('');setPrevia('');setErro('');setAviso('');alterar(r.id,'imagemUrl','');entrada.current?.setCustomValidity('');}
 async function buscar(){
  if(controlador.current)return;
  const controle=new AbortController();controlador.current=controle;setBuscando(true);setErro('');setAviso('');aoBuscar(r.id,true);
  try{
   const foto=await resolverImagemRefeicao(link,{signal:controle.signal,buscarPagina:link=>operarAviso('buscarImagemReceita',{link})});
   if(controle.signal.aborted)return;
   alterar(r.id,'imagemUrl',foto.imagemUrl);setLink(foto.imagemUrl);setPrevia(foto.imagemUrl);setTentativa(n=>n+1);entrada.current?.setCustomValidity('');
   setAviso(foto.origem==='pagina'?'Encontrei a foto da página. Salve a programação para confirmar.':'Foto carregada. Salve a programação para confirmar.');
  }catch(e){if(!controle.signal.aborted)setErro((e.message||'Não foi possível encontrar a foto.')+(r.imagemUrl?' Sua foto atual foi mantida.':''));}
  finally{if(controlador.current===controle)controlador.current=null;if(!controle.signal.aborted){setBuscando(false);aoBuscar(r.id,false);}}
 }
 return <div className="alimentacao-foto-campo"><label className="field"><span>Link da foto ou da página (opcional)</span><input ref={entrada} aria-label={`Link da foto da refeição ${indice+1}`} type="url" maxLength={2000} disabled={buscando} value={link} placeholder="Cole aqui o link da foto ou da página" onChange={e=>mudar(e.target.value)}/><small>Pode usar o endereço da foto ou uma página que contenha a imagem, como uma receita.</small></label>
  <div className="prato-acoes"><button type="button" className="btn btn-secondary" disabled={buscando||!link.trim()} aria-label={`Buscar foto da refeição ${indice+1}`} onClick={buscar}>{buscando?'Buscando foto…':'Buscar foto'}</button>{r.imagemUrl&&<button type="button" className="compras-link" disabled={buscando} onClick={remover}>Remover foto da refeição {indice+1}</button>}{r.imagemUrl&&link!==(r.imagemUrl||'')&&<button type="button" className="compras-link" disabled={buscando} onClick={manterAtual}>Manter foto atual</button>}</div>
  {buscando&&<p role="status">Conferindo o link e procurando a imagem…</p>}{erro&&<p role="alert">{erro}</p>}{aviso&&<p role="status">{aviso}</p>}{previa&&<FotoRefeicao key={previa+tentativa} src={previa} nome={r.nome||'refeição'}/>}
 </div>;
}
