const {HttpsError}=require('firebase-functions/v2/https');
const {FieldValue}=require('firebase-admin/firestore');
const {hash,id}=require('./push-contrato.cjs');
async function registrarNativo(raiz,db,uid,d) {
 if(d.versao!==1||d.plataforma!=='android'||!id(d.instalacaoId))throw new HttpsError('invalid-argument','Contrato Android inválido.');
 const instalacao=raiz.doc('pushInstalacoes/'+hash(d.instalacaoId)),tok=raiz.doc('pushTokensNativos/'+hash(d.token));
 const ref=db.collection('pushDispositivos').doc('android_'+hash(d.instalacaoId));
 return raiz.runTransaction(async tx=>{
  const exclusao=await tx.get(raiz.doc('contaSolicitacoes/'+uid));
  if(exclusao.data()?.etapa)throw new HttpsError('permission-denied','Exclusão de conta iniciada.');
  const [i,t,atual]=await Promise.all([tx.get(instalacao),tx.get(tok),tx.get(ref)]);
  for(const vinculo of [i.data(),t.data(),atual.data()])if(vinculo&&(vinculo.uid!==uid||vinculo.grupoId!==(db.grupoId||'')))throw new HttpsError('permission-denied','Desative o vínculo anterior deste aparelho antes de cadastrar outra conta.');
  const dados={uid,grupoId:db.grupoId||'',transporte:'fcm-android',plataforma:'android',versao:1,instalacaoHash:hash(d.instalacaoId),token:d.token};
  if(atual.data()?.token===d.token&&atual.data()?.uid===uid)return {ok:true,alterado:false};
  tx.set(ref,{...dados,atualizadoEm:FieldValue.serverTimestamp()});tx.set(instalacao,{uid,grupoId:dados.grupoId,tokenHash:hash(d.token)});tx.set(tok,{uid,grupoId:dados.grupoId});
  if(atual.data()?.token&&atual.data().token!==d.token)tx.delete(raiz.doc('pushTokensNativos/'+hash(atual.data().token)));
  return {ok:true,alterado:true};
 });
}
async function removerNativo(raiz,db,uid,d) {
 if(!id(d.instalacaoId))throw new HttpsError('invalid-argument','Instalação inválida.');
 const ref=db.collection('pushDispositivos').doc('android_'+hash(d.instalacaoId)),inst=raiz.doc('pushInstalacoes/'+hash(d.instalacaoId));
 return raiz.runTransaction(async tx=>{const [snap,i]=await Promise.all([tx.get(ref),tx.get(inst)]);if(snap.data()?.uid===uid){tx.delete(ref);tx.delete(raiz.doc('pushTokensNativos/'+hash(snap.data().token)));}if(i.data()?.uid===uid&&i.data()?.grupoId===(db.grupoId||''))tx.delete(inst);return {ok:true};});
}
module.exports={registrarNativo,removerNativo};
