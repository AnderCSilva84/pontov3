const {HttpsError}=require('firebase-functions/v2/https');
const {FieldValue}=require('firebase-admin/firestore');
const GRUPO_DEMO='demo_play_ap1303_v1';
async function operarDemonstracao(db,request){
 const uid=request.auth?.uid,claim=request.auth?.token?.ap1303DemoGrupo,d=request.data||{};
 if(!uid)throw new HttpsError('unauthenticated','Entre na conta demonstrativa.');
 if(claim!==GRUPO_DEMO)throw new HttpsError('permission-denied','Recurso exclusivo das contas demonstrativas.');
 if(Object.keys(d).some(k=>!['acao','operacaoId'].includes(k))||!['consultar','avancar'].includes(d.acao)||d.acao==='avancar'&&!/^[a-f0-9-]{36}$/.test(d.operacaoId||''))throw new HttpsError('invalid-argument','Operação demonstrativa inválida.');
 return db.runTransaction(async tx=>{
  const base=`grupos/${GRUPO_DEMO}`, [g,v,p]=await tx.getAll(db.doc(base),db.doc(`vinculosUsuarios/${uid}`),db.doc(`${base}/users/${uid}`));
  if(g.data()?.demonstracao!==true||g.data()?.ativo!==true||!g.data()?.contasDemo?.includes(uid)||v.data()?.grupoId!==GRUPO_DEMO||v.data()?.ativo!==true||p.data()?.ativo!==true||!['admin','funcionario'].includes(p.data()?.role))throw new HttpsError('permission-denied','Contexto demonstrativo não autorizado.');
  const ref=db.doc(`${base}/demonstracaoPonto/${uid}`),s=(await tx.get(ref)).data()||{registros:[],operacoes:[]};
  if(d.acao==='avancar'){
   if(p.data().role!=='funcionario')throw new HttpsError('permission-denied','Administrador apenas consulta. Use a conta de funcionário demo.');
   if(!s.operacoes.includes(d.operacaoId)){
    const tipos=['ENTRADA','SAIDA_INTERVALO','ENTRADA_INTERVALO','SAIDA'];
    if(s.registros.length>=4)throw new HttpsError('failed-precondition','Ciclo fictício concluído. O histórico continua disponível para revisão.');
    s.registros.push({tipo:tipos[s.registros.length],hora:['08:00','12:00','13:00','17:00'][s.registros.length]});s.operacoes.push(d.operacaoId);
    tx.set(ref,{...s,ficticio:true,atualizadoEm:FieldValue.serverTimestamp()});
   }
  }
  // Não acessa registros/dias/folha nem recebe coordenadas.
  const registros=p.data().role==='admin'?(await tx.get(db.doc(`${base}/demonstracaoPonto/${g.data().funcionarioDemoUid}`))).data()?.registros||[]:s.registros;
  return {demonstracao:true,mensagem:'Simulação sem GPS, sem registro trabalhista e sem notificações.',registros};
 });
}
module.exports={GRUPO_DEMO,operarDemonstracao};
