import {useEffect,useState} from 'react';
import {onSnapshot} from 'firebase/firestore';
import {db} from '../services/firebase';
import {doc} from '../services/dadosGrupo';
import {AvisosNovosContext} from '../context/AvisosNovosContext';
export default function AvisosNovosProvider({user,children}){
 const inicial={novos:0,recebidos:0,conclusoes:0,organizacao:0,anexos:0};
 const [estado,setEstado]=useState(inicial);
 useEffect(()=>{
  if(!user?.uid||user.ativo===false)return;
  let ativo=true;
  const parar=onSnapshot(doc(db,'lembretesEstado',user.uid),snap=>{if(!ativo)return;const d=snap.data()||{},recebidos=Number.isSafeInteger(d.recebidos)?d.recebidos:0,lidos=Number.isSafeInteger(d.lidos)?d.lidos:0;setEstado({recebidos,anexos:Number.isSafeInteger(d.anexos)?d.anexos:0,organizacao:Number.isSafeInteger(d.organizacao)?d.organizacao:0,conclusoes:Number.isSafeInteger(d.conclusoes)?d.conclusoes:0,novos:Math.max(0,recebidos-lidos)});},()=>{if(ativo)setEstado({novos:0,recebidos:0,conclusoes:0,organizacao:0,anexos:0});});
  return()=>{ativo=false;parar();};
 },[user?.uid,user?.grupoId,user?.ativo]);
 return <AvisosNovosContext.Provider value={estado}>{children}</AvisosNovosContext.Provider>;
}
