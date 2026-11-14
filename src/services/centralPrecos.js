import {httpsCallable} from 'firebase/functions';
import {functions} from './firebase';
import {criarCacheCentral} from '../utils/centralCache';
export const operarCentral=async d=>(await httpsCallable(functions,'centralPrecos',{timeout:125000})(d)).data;
export const cacheCentral=criarCacheCentral({consultar:operarCentral,storage:typeof localStorage==='undefined'?null:localStorage,online:()=>navigator.onLine});
if(typeof window!=='undefined')for(const evento of ['ap1303-ponto-sair','ap1303-contexto-alterado','ap1303-central-sessao'])window.addEventListener(evento,()=>cacheCentral.limpar());
