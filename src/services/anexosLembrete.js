import {httpsCallable} from 'firebase/functions';
import {auth,functions} from './firebase';
import {obterGrupoAtual} from './dadosGrupo';
import {registrarPdf} from './pdfArquivos';
let geracao=0;
if(typeof window!=='undefined')for(const e of ['ap1303-ponto-sair','ap1303-contexto-alterado'])window.addEventListener(e,()=>{geracao++;});
const contexto=()=>({uid:auth.currentUser?.uid,grupo:obterGrupoAtual(),geracao});
const validar=c=>{if(!c.uid||c.uid!==auth.currentUser?.uid||c.grupo!==obterGrupoAtual()||c.geracao!==geracao)throw new Error('A sessão mudou. Abra os anexos novamente.');};
async function chamar(dados){
 if(!navigator.onLine)throw new Error('Reconecte para consultar ou enviar anexos. Nenhum arquivo foi confirmado.');
 const c=contexto();validar(c);const r=await httpsCallable(functions,'lembretesAnexos',{timeout:120000})(dados);validar(c);return r.data;
}
export const listarAnexos=lembreteId=>chamar({acao:'listar',lembreteId});
export const adicionarLink=(lembreteId,d)=>chamar({acao:'adicionarLink',lembreteId,...d});
export const removerAnexo=(lembreteId,anexoId)=>chamar({acao:'remover',lembreteId,anexoId});
export async function enviarAnexo(lembreteId,arquivo,anexoId,respostaDe=''){
 const c=contexto();validar(c);if(arquivo.size>5*1024*1024||!arquivo.size)throw new Error('Cada arquivo deve ter até 5 MB.');
 if(!/\.(pdf|jpe?g|png|webp)$/i.test(arquivo.name))throw new Error('Use PDF, JPEG, PNG ou WebP.');
 const bytes=new Uint8Array(await arquivo.arrayBuffer());validar(c);let texto='';for(let i=0;i<bytes.length;i+=8192)texto+=String.fromCharCode(...bytes.subarray(i,i+8192));
 const r=await chamar({acao:'enviarArquivo',lembreteId,anexoId,nome:arquivo.name,base64:btoa(texto),respostaDe});validar(c);return r;
}
export async function baixarAnexo(lembreteId,anexoId){
 const c=contexto(),r=await chamar({acao:'baixar',lembreteId,anexoId});validar(c);
 const s=atob(r.base64),bytes=new Uint8Array(s.length);for(let i=0;i<s.length;i++)bytes[i]=s.charCodeAt(i);
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');validar(c);
 if(digest!==r.sha256)throw new Error('Não foi possível confirmar a integridade do arquivo.');
 return registrarPdf(new File([bytes],r.nome,{type:r.mime}));
}
