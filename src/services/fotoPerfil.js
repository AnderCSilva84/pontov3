import {httpsCallable} from 'firebase/functions';
import {auth,functions} from './firebase';
import {obterGrupoAtual} from './dadosGrupo';
const cache=new Map();let geracao=0;
for(const evento of ['ap1303-central-sessao','ap1303-contexto-alterado','ap1303-ponto-sair'])window.addEventListener(evento,()=>{geracao++;cache.clear();});
const contexto=()=>({uid:auth.currentUser?.uid,grupo:obterGrupoAtual(),geracao});
const validar=c=>{if(!c.uid||c.uid!==auth.currentUser?.uid||c.grupo!==obterGrupoAtual()||c.geracao!==geracao)throw Error('A sessão mudou. Abra sua conta e escolha a foto novamente.');};
async function chamarFoto(dados){
 const c=contexto();validar(c);
 if(!navigator.onLine)throw Error('Você está sem conexão. Reconecte e toque em Salvar foto novamente.');
 try{const r=await httpsCallable(functions,'contaOperacao',{timeout:25000})(dados);validar(c);return r.data;}
 catch(e){validar(c);if(['functions/deadline-exceeded','functions/unavailable','functions/internal'].includes(e.code))throw Error('Não foi possível confirmar o salvamento. Confira a conexão e tente novamente; sua prévia foi mantida.');throw e;}
}
export function consultarFotoPerfil(sessao,usuario) {
 if(!sessao?.uid||!usuario?.uid||!usuario.temFotoPerfil)return Promise.resolve(null);
 const c=contexto();if(c.uid!==sessao.uid||(sessao.grupoId||'')!==(c.grupo||''))return Promise.resolve(null);
 const chave=JSON.stringify([c.uid,c.grupo||'',usuario.uid,usuario.fotoPerfilVersao,c.geracao]);
 if(!cache.has(chave))cache.set(chave,chamarFoto({acao:'fotoPerfilConsultar',usuarioId:usuario.uid}).then(r=>r.foto?'data:image/jpeg;base64,'+r.foto:null).catch(e=>{cache.delete(chave);throw e;}));
 return cache.get(chave).then(foto=>{validar(c);return foto;});
}
export async function salvarFotoPerfil(foto){
 const c=contexto();validar(c);
 const r=await chamarFoto({acao:foto?'fotoPerfilSalvar':'fotoPerfilRemover',...(foto?{foto}:{})});
 if(r?.ok!==true||!Number.isSafeInteger(r.versao)||r.temFoto!==Boolean(foto))throw Error('O servidor não confirmou a alteração. Tente novamente; sua prévia foi mantida.');
 cache.clear();
 if(foto){const chave=JSON.stringify([c.uid,c.grupo||'',c.uid,r.versao,c.geracao]);cache.set(chave,Promise.resolve('data:image/jpeg;base64,'+foto));}
 return r;
}
