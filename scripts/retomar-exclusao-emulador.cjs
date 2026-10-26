// Ferramenta operacional LOCAL, sem endpoint administrativo e sem credenciais no cliente.
const admin=require('../functions/node_modules/firebase-admin');
const {processarExclusao}=require('../functions/conta-exclusao.cjs');
async function main(){
 const [uid,acao='status']=process.argv.slice(2),projeto=process.env.GCLOUD_PROJECT;
 if(!/^[\w-]{1,128}$/.test(uid||'')||!['status','retomar'].includes(acao)||!(/^(demo-[\w-]+|ap1303-android-push-teste)$/.test(projeto||''))||![process.env.FIRESTORE_EMULATOR_HOST,process.env.FIREBASE_AUTH_EMULATOR_HOST].every(v=>/^(127\.0\.0\.1|localhost):\d+$/.test(v||'')))throw Error('Exige UID de teste, projeto permitido e ambos os emuladores em loopback.');
 admin.initializeApp({projectId:projeto});const db=admin.firestore(),ref=db.doc('contaSolicitacoes/'+uid);
 if(acao==='retomar'){
  await db.runTransaction(async tx=>{const s=await tx.get(ref),p=s.data();if(!p?.etapa||!['falha_recuperavel','processando'].includes(p.status)||p.leaseAte>Date.now())throw Error('Pedido não retomável ou execução ainda ativa.');tx.update(ref,{status:'processando',lease:null,leaseAte:0,rodada:(p.rodada||0)+1});});
  await processarExclusao(db,admin.auth(),uid);
 }
 const p=(await ref.get()).data();console.log(JSON.stringify({encontrado:!!p,status:p?.status,etapa:p?.etapa,codigoFalha:p?.codigoFalha,authRemovido:p?.authRemovido===true}));
}
main().catch(()=>{console.error('Não foi possível concluir a operação local. Confira projeto, protocolo, lease e estado do pedido.');process.exitCode=1;});
