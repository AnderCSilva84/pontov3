import {EmailAuthProvider,reauthenticateWithCredential,sendPasswordResetEmail,signOut} from 'firebase/auth';
import {httpsCallable} from 'firebase/functions';
import {auth,functions,firebaseConfig} from './firebase';
import {suspenderPushLocal} from './push';
import {filaPonto,escopoPonto} from './pontoFila';
import {obterGrupoAtual} from './dadosGrupo';
import {criarRecuperacaoSenha,resumirPendencias} from '../utils/cicloConta';
export const recuperarSenha=criarRecuperacaoSenha(email=>sendPasswordResetEmail(auth,email));
export async function resumoLocalConta() {
  const uid=auth.currentUser?.uid;if(!uid)throw Error('Entre na sua conta.');
  const grupo=obterGrupoAtual();
  const resumo=resumirPendencias(await filaPonto.listarConta(uid));
  if(auth.currentUser?.uid!==uid||obterGrupoAtual()!==grupo)throw Error('A sessão mudou. Abra a tela novamente.');
  return resumo;
}
export const operarConta=dados=>httpsCallable(functions,'contaOperacao')(dados).then(r=>r.data);
export async function confirmarIdentidade(senha) {
  const u=auth.currentUser;if(!u)throw Error('Entre na sua conta.');
  if(!u.providerData.some(p=>p.providerId==='password'))throw Error('A confirmação deste provedor ainda não está disponível. Nenhuma solicitação foi enviada.');
  await reauthenticateWithCredential(u,EmailAuthProvider.credential(u.email,senha));
  await u.getIdToken(true);
  if(auth.currentUser?.uid!==u.uid)throw Error('A sessão mudou. Nenhuma solicitação foi enviada.');
  return u.uid;
}
export async function solicitarExclusao(senha,confirmacao) {
  if(!confirmacao)throw Error('Confirme a solicitação.');
  const uid=await confirmarIdentidade(senha);let pendencias;
  try{pendencias=await resumoLocalConta();}catch{pendencias=null;}
  if(auth.currentUser?.uid!==uid)throw Error('A sessão mudou.');
  return operarConta({acao:'solicitar',confirmacao:true,pendencias});
}
export async function transferirAdministracao(senha,destinatario) {
  const uid=await confirmarIdentidade(senha);
  if(auth.currentUser?.uid!==uid)throw Error('A sessão mudou. Nenhuma transferência foi enviada.');
  return operarConta({acao:'transferir',confirmacao:true,destinatario});
}

export async function reconciliarConta() {
  const uid=auth.currentUser?.uid,grupo=obterGrupoAtual();if(!uid)throw Error('Entre na própria conta.');
  window.dispatchEvent(new Event('ap1303-ponto-sair'));
  const ops=await filaPonto.listarConta(uid);
  for(const o of ops){
    if(auth.currentUser?.uid!==uid||obterGrupoAtual()!==grupo)throw Error('A sessão mudou.');
    if(!['pendente','incerta','enviando'].includes(o.status)||o.payload.modalidade==='offline_pendente'&&o.tentativas===0)continue;
    if((o.payload.contexto.id||null)!==grupo)throw Error('Há uma tentativa de outro vínculo. Preserve-a e solicite recuperação ao responsável antes de excluir.');
    // Reenvia o payload original idempotente; não consulta recibo antes nem recaptura GPS.
    const escopo=escopoPonto(uid,o.payload.contexto),dono=crypto.randomUUID();
    const original=await filaPonto.assumirReconciliacao(escopo,dono,o.payload.operacaoId);if(!original)continue;
    try{
      if(auth.currentUser?.uid!==uid||obterGrupoAtual()!==grupo)throw Error('A sessão mudou.');
      const resultado=await httpsCallable(functions,'registrarOperacaoPonto',{timeout:25000})(original.payload).then(r=>r.data);
      if(resultado?.operacaoId!==o.payload.operacaoId||!['confirmado','recebida','rejeitada','conflito'].includes(resultado.status))throw Error('Resposta de reconciliação inválida.');
      await filaPonto.concluir(escopo,dono,o.payload.operacaoId,{status:resultado.status,resultado,pausada:true});
    }catch(e){await filaPonto.concluir(escopo,dono,o.payload.operacaoId,{status:'incerta',pausada:true});throw e;}
  }
  if(auth.currentUser?.uid!==uid||obterGrupoAtual()!==grupo)throw Error('A sessão mudou.');
  return resumoLocalConta();
}
export async function descartarCapturasConta() {
  const uid=auth.currentUser?.uid;if(!uid)throw Error('Entre na própria conta.');
  window.dispatchEvent(new Event('ap1303-ponto-sair'));
  const grupo=obterGrupoAtual(),escopo=escopoPonto(uid,grupo?{tipo:'grupo',id:grupo}:{tipo:'legado'});
  if(!window.confirm('Descartar somente capturas offline deste vínculo que nunca foram enviadas? Esta ação é irreversível. Marcações confirmadas e resultados desconhecidos não serão apagados.'))return resumoLocalConta();
  if(auth.currentUser?.uid!==uid||obterGrupoAtual()!==grupo)throw Error('A sessão mudou.');
  await filaPonto.descartarNaoEnviadas(escopo);
  if(auth.currentUser?.uid!==uid||obterGrupoAtual()!==grupo)throw Error('A sessão mudou.');
  return resumoLocalConta();
}
const reciboChave='ap1303-exclusao-recibo';
let reciboEmMemoria=null;
function guardarRecibo(recibo){reciboEmMemoria=recibo;try{sessionStorage.setItem(reciboChave,JSON.stringify(recibo));return true;}catch{reciboEmMemoria={...recibo,reciboTemporario:true};return false;}}
export function lerReciboExclusao(){try{return reciboEmMemoria||JSON.parse(sessionStorage.getItem(reciboChave))||null;}catch{return reciboEmMemoria;}}
export async function limparContaLocal(uid,recibo) {
  // Todas as etapas são restritas ao dono; uma resposta atrasada não sai da conta seguinte.
  let limpezaPendente=false;
  try{await filaPonto.limparConta(uid);}catch{limpezaPendente=true;}
  try{
    for(const k of [`ap1303-cadastro:${firebaseConfig.projectId}:${uid}`,`pushAtivado:${uid}`,`pushDesativadoManualmente:${uid}`])localStorage.removeItem(k);
    for(const k of Object.keys(localStorage))if(k.startsWith(`pushAndroid:${uid}:`))localStorage.removeItem(k);
    await (await import('./pdfArquivos')).limparPdfsConta(uid);
  }catch{limpezaPendente=true;}
  if(auth.currentUser&&auth.currentUser.uid!==uid)return;
  const reciboSalvo=guardarRecibo({protocolo:recibo.protocolo,status:'concluida',limpezaPendente});
  window.dispatchEvent(new Event('ap1303-ponto-sair'));
  try{await suspenderPushLocal({remoto:false});}finally{
    if(auth.currentUser?.uid===uid)await signOut(auth);
    // Reinicia o runtime e o cache Firestore em memória, sem apagar caches de outras contas.
    if(!auth.currentUser&&reciboSalvo)window.location.replace('/conta');
  }
}
export async function concluirExclusao(senha,confirmacao,encerrarGrupoVazio) {
  if(!confirmacao)throw Error('Confirme a exclusão.');
  const uid=await confirmarIdentidade(senha);
  window.dispatchEvent(new Event('ap1303-ponto-sair'));
  const pendencias=await resumoLocalConta();
  if(auth.currentUser?.uid!==uid)throw Error('A sessão mudou.');
  guardarRecibo({protocolo:uid,status:'resultado_desconhecido'});
  const r=await operarConta({acao:'concluir',confirmacao:true,pendencias,encerrarGrupoVazio:!!encerrarGrupoVazio});
  if(auth.currentUser?.uid===uid)guardarRecibo({protocolo:uid,status:r.solicitacao?.status||'resultado_desconhecido'});
  if(r.solicitacao?.status==='concluida')await limparContaLocal(uid,r.solicitacao);
  return r;
}
export async function atualizarContaAtual() {
  const uid=auth.currentUser?.uid,grupo=obterGrupoAtual();if(!uid)throw Error('Entre na própria conta.');
  const [r,f]=await Promise.all([operarConta({acao:'status'}),resumoLocalConta().catch(()=>null)]);
  if(auth.currentUser?.uid!==uid||obterGrupoAtual()!==grupo)throw Error('A sessão mudou.');
  if(r.solicitacao?.status==='concluida')await limparContaLocal(uid,r.solicitacao);
  return [r,f];
}
