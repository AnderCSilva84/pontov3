import {Capacitor,registerPlugin} from '@capacitor/core';
import {httpsCallable} from 'firebase/functions';
import {auth,functions} from './firebase';
import {obterGrupoAtual} from './dadosGrupo';
import {criarControlePushAndroid} from '../utils/pushAndroid';
export const androidPush=()=>Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='android';
export const pontePush=registerPlugin('PushNativo');
const contexto=()=>auth.currentUser?{uid:auth.currentUser.uid,grupoId:obterGrupoAtual()||''}:null;
export const controlePush=criarControlePushAndroid({ponte:pontePush,chamar:(nome,dados)=>httpsCallable(functions,nome)(dados),contexto,armazenamento:typeof localStorage!=='undefined'?localStorage:{getItem:()=>null,setItem:()=>{}}});
export async function suspenderPushAndroid(remoto=true){if(!androidPush())return;await controlePush.suspender(false,remoto);}
