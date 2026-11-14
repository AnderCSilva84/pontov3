import {useCallback,useEffect,useState} from 'react';
import {operarCompras} from './compras';
// Eventos locais e deduplicação de pedidos simultâneos; sem listener Firestore ou polling.
const pendentes=new Map();
const evento='ap1303-categorias-compras';
export function useCategoriasCompras(user){
 const chave=`${user?.uid||''}:${user?.grupoId||'legado'}`;
 const [estado,setEstado]=useState({chave,config:null,erro:'',carregando:true});
 const aplicar=useCallback(config=>window.dispatchEvent(new CustomEvent(evento,{detail:{chave,config}})),[chave]);
 const consultar=useCallback(async()=>{
  if(!user?.uid)return;
  if(!pendentes.has(chave))pendentes.set(chave,operarCompras('consultarCategoriasCompras').finally(()=>pendentes.delete(chave)));
  try{const config=await pendentes.get(chave);aplicar(config);}catch(e){window.dispatchEvent(new CustomEvent(evento,{detail:{chave,erro:e.message}}));}
 },[chave,user?.uid,aplicar]);
 const atualizar=useCallback(()=>{setEstado(v=>({...v,carregando:true,erro:''}));return consultar();},[consultar]);
 useEffect(()=>{
  let ativo=true;
  const receber=e=>{if(ativo&&e.detail.chave===chave)setEstado(anterior=>e.detail.config&&anterior.chave===chave&&anterior.config?.versao>e.detail.config.versao?anterior:{chave,config:e.detail.config??null,erro:e.detail.erro||'',carregando:false});};
  window.addEventListener(evento,receber);consultar();
  return()=>{ativo=false;window.removeEventListener(evento,receber);};
 },[chave,consultar]);
 return {config:estado.chave===chave?estado.config:null,erro:estado.chave===chave?estado.erro:'',carregando:estado.chave!==chave||estado.carregando,atualizar,aplicar};
}
