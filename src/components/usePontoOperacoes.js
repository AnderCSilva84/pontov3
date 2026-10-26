import {useEffect,useRef,useState} from 'react';
import {httpsCallable} from 'firebase/functions';
import {auth,functions} from '../services/firebase';
import {obterGrupoAtual} from '../services/dadosGrupo';
import {filaPonto,escopoPonto} from '../services/pontoFila';
import {criarSincronizadorPonto} from '../services/pontoSincronizacao';

export default function usePontoOperacoes(user) {
  const [estado,setEstado]=useState({escopo:null,operacoes:[],erro:'',pronta:false});
  const controlador=useRef(null);
  const uid=user?.role==='funcionario'?user.uid:null,grupo=user?.grupoId||null;
  useEffect(()=>{
    let ativo=true,retomando=false,suspensa=false,timer;
    const contexto=grupo?{tipo:'grupo',id:grupo}:{tipo:'legado'};
    const escopo=uid?escopoPonto(uid,contexto):null;
    const canal=uid&&'BroadcastChannel' in window?new BroadcastChannel('ap1303-ponto'):null;
    const valida=()=>ativo&&!suspensa&&uid&&auth.currentUser?.uid===uid&&obterGrupoAtual()===grupo;
    async function atualizar(){
      if(!uid)return [];
      const operacoes=await filaPonto.listar(escopo);
      if(valida())setEstado({escopo,operacoes,erro:'',pronta:true});
      return operacoes;
    }
    const sincronizar=criarSincronizadorPonto({fila:filaPonto,enviar:p=>httpsCallable(functions,'registrarOperacaoPonto',{timeout:25000})(p).then(r=>r.data),sessaoAtual:()=>valida()?{uid,contexto}:null});
    async function retomar(manual=false){
      if(!valida()||retomando)return;
      retomando=true;clearTimeout(timer);
      try {
        if(manual)await filaPonto.retomarPausadas(escopo);
        if(navigator.onLine){const n=await sincronizar({uid,contexto});if(n)canal?.postMessage('alterada');}
        const operacoes=await atualizar();
        // Temporizador único de operação existente: não é polling de fila ou rede.
        const aguardando=operacoes.filter(o=>!o.pausada&&['pendente','incerta','enviando'].includes(o.status));
        if(valida()&&navigator.onLine&&aguardando.length){
          const quando=Math.min(...aguardando.map(o=>o.status==='enviando'?o.atualizadaEmMs+60100:Math.max(Date.now()+1000,o.proximaTentativaMs)));
          timer=setTimeout(()=>retomar(),Math.max(1000,quando-Date.now()));
        }
      } catch(e){if(valida())setEstado(s=>({...s,escopo,erro:e.message,pronta:false}));}
      finally{retomando=false;}
    }
    const voltar=()=>{if(document.visibilityState==='visible')retomar();};
    const online=()=>retomar();
    const revisada=()=>{atualizar().catch(()=>{});};
    const sair=()=>{suspensa=true;clearTimeout(timer);};
    controlador.current={uid,contexto,escopo,atualizar,retomar,valida,avisar:()=>canal?.postMessage('alterada')};
    if(canal)canal.onmessage=()=>retomar();
    if(uid)retomar();
    window.addEventListener('ap1303-ponto-revisado',revisada);
    window.addEventListener('online',online);window.addEventListener('ap1303-retomar',online);window.addEventListener('ap1303-ponto-sair',sair);document.addEventListener('visibilitychange',voltar);
    return()=>{ativo=false;clearTimeout(timer);canal?.close();window.removeEventListener('ap1303-ponto-revisado',revisada);window.removeEventListener('online',online);window.removeEventListener('ap1303-retomar',online);window.removeEventListener('ap1303-ponto-sair',sair);document.removeEventListener('visibilitychange',voltar);};
  },[uid,grupo]);
  const corresponde=uid&&estado.escopo===escopoPonto(uid,grupo?{tipo:'grupo',id:grupo}:{tipo:'legado'});
  return {
    ...(corresponde?estado:{operacoes:[],erro:'',pronta:false}),
    salvar:async payload=>{
      const c=controlador.current;
      if(!c?.valida()||c.uid!==payload.uid||escopoPonto(payload.uid,payload.contexto)!==c.escopo)throw Error('A sessão mudou. Nenhuma nova tentativa foi enviada.');
      await filaPonto.inserir(payload);await c.atualizar();c.avisar();await c.retomar();
    },
    retomar:()=>controlador.current?.retomar(true),
    limpar:async()=>{const c=controlador.current;if(c?.valida()){await filaPonto.limparFinalizados(c.escopo);await c.atualizar();c.avisar();}},
  };
}
