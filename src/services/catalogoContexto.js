import {useCallback,useEffect,useRef,useState} from 'react';
import {operarCompras} from './compras';
import {atualizarCatalogoCarregado} from '../utils/catalogoAtualizacao';
const cache=new Map(),pendentes=new Map(),revisoes=new Map();
export function useCatalogoContexto(user,tipo){
 const carregamentos=useRef(new Map()),lotes=useRef(new Map());
 const [lote,setLote]=useState({chave:null,carregando:false});
 const chave=`${user?.uid||''}:${user?.grupoId||'legado'}:${tipo||''}`;
 const [estado,setEstado]=useState({chave,produtos:[],carregando:true});
 const carregar=useCallback(async(mais=false,forcar=false)=>{
  if(!user?.uid||!tipo||(!forcar&&carregamentos.current.has(chave)))return;
  if(!revisoes.has(chave))revisoes.set(chave,0);
  if(forcar){const prefixo=chave.slice(0,chave.lastIndexOf(':')+1);for(const k of cache.keys())if(k.startsWith(prefixo))cache.delete(k);for(const k of revisoes.keys())if(k.startsWith(prefixo))revisoes.set(k,revisoes.get(k)+1);}
  const revisao=revisoes.get(chave),token=Symbol();
  carregamentos.current.set(chave,token);
  setEstado(v=>({...v,chave,produtos:v.chave===chave?v.produtos:[],carregando:true,erro:''}));
  const anterior=mais?cache.get(chave):null;
  const pedido={tipoCompra:tipo,...(anterior?{cursor:anterior.cursor,cursorHistorico:anterior.cursorHistorico,fimExplicitos:!anterior.cursor,fimHistorico:!anterior.cursorHistorico}:{})};
  const chavePedido=chave+JSON.stringify(pedido)+':'+revisao;
  try{
   let resultado=!mais&&!forcar?cache.get(chave):null;
   if(!resultado){if(!pendentes.has(chavePedido))pendentes.set(chavePedido,operarCompras('catalogoPorTipo',pedido).finally(()=>pendentes.delete(chavePedido)));const r=await pendentes.get(chavePedido);if(revisoes.get(chave)!==revisao)return;resultado={...r,paginas:(anterior?.paginas||0)+1,produtos:[...new Map([...(anterior?.produtos||[]),...r.produtos].map(p=>[p.id,p])).values()]};cache.set(chave,resultado);}
   setEstado({chave,...resultado,carregando:false,erro:''});return resultado;
  }catch(e){if(revisoes.get(chave)===revisao)setEstado(v=>({...v,chave,carregando:false,erro:e.message}));}finally{if(carregamentos.current.get(chave)===token)carregamentos.current.delete(chave);}
 },[chave,user?.uid,tipo]);
 useEffect(()=>{let ativo=true;Promise.resolve().then(()=>{if(ativo)carregar();});return()=>{ativo=false;};},[carregar]);
 useEffect(()=>{const controles=lotes.current;return()=>{controles.delete(chave);setLote(v=>v.chave===chave?{chave,carregando:false}:v);};},[chave]);
 async function carregarSequencia(tudo=false,forcar=false){
  if(lotes.current.has(chave))return;const token=Symbol();lotes.current.set(chave,token);setLote({chave,carregando:true});
  const antes=cache.get(chave),completo=tudo||Boolean(antes&&!antes.cursor&&!antes.cursorHistorico),paginas=antes?.paginas||1;
  try{let r=forcar?await carregar(false,true):antes||await carregar();let n=forcar?1:r?.paginas||1;
   while(r&&(r.cursor||r.cursorHistorico)&&lotes.current.get(chave)===token&&(completo||n<paginas)){
    const assinatura=JSON.stringify([r.cursor,r.cursorHistorico]);const proximo=await carregar(true);if(!proximo||JSON.stringify([proximo.cursor,proximo.cursorHistorico])===assinatura)break;r=proximo;n++;
   }
  }finally{if(lotes.current.get(chave)===token){lotes.current.delete(chave);setLote({chave,carregando:false});}}
 }
 function aplicarMescla(resposta){
  if(!Array.isArray(resposta?.catalogoAtualizado))return carregarSequencia(false,true);
  const prefixo=chave.slice(0,chave.lastIndexOf(':')+1);for(const k of revisoes.keys())if(k.startsWith(prefixo))revisoes.set(k,revisoes.get(k)+1);
  for(const [k,valor]of cache)if(k.startsWith(prefixo))cache.set(k,atualizarCatalogoCarregado(valor,resposta,k.slice(k.lastIndexOf(':')+1)));
  const atual=cache.get(chave);if(atual)setEstado({chave,...atual,carregando:false,erro:''});else return carregarSequencia(false,true);
 }
 const atual=estado.chave===chave?estado:{produtos:[],carregando:Boolean(tipo)};
 const carregandoTodos=lote.chave===chave&&lote.carregando;
 return {...atual,carregando:atual.carregando||carregandoTodos,carregandoTodos,mais:()=>carregar(true),todos:()=>carregarSequencia(true),parar:()=>{lotes.current.delete(chave);setLote({chave,carregando:false});},atualizar:()=>carregarSequencia(false,true),aplicarMescla,temMais:Boolean(atual.cursor||atual.cursorHistorico)};
}
