import {httpsCallable} from 'firebase/functions';
import {auth,functions} from './firebase';
import {obterGrupoAtual} from './dadosGrupo';
export async function operarAviso(operacao,dados={}){
 if(!navigator.onLine)throw new Error('Reconecte para consultar, criar ou concluir lembretes. Nenhuma alteração foi enviada.');
 const uid=auth.currentUser?.uid,grupo=obterGrupoAtual();if(!uid)throw new Error('Entre no aplicativo.');
 const r=await httpsCallable(functions,'lembretesOperacao')({...dados,operacao});
 if(auth.currentUser?.uid!==uid||obterGrupoAtual()!==grupo)throw new Error('A sessão mudou. Consulte novamente na conta atual.');
 return r.data;
}
