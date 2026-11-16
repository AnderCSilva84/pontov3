const { exigirOperacaoCompartilhada } = require('./compartilhamento.cjs');
﻿const {HttpsError}=require('firebase-functions/v2/https');
const {FieldValue}=require('firebase-admin/firestore');
const {bancoDoUsuario}=require('./grupos-contexto.cjs');
const {id,revisaoTarefa,hash}=require('./push-contrato.cjs');
async function acaoTarefa(raiz,request,agora=Date.now()) {
 if(!request.auth?.uid)throw new HttpsError('unauthenticated','Entre no app.');
 const d=request.data||{},uid=request.auth.uid;
 if(!['consultar','concluir'].includes(d.operacao)||!['tarefa','tarefa_fixa'].includes(d.tipo)||!id(d.id)||!/^\d{4}-\d{2}-\d{2}$/.test(d.dataKey||'')||!/^[a-f0-9]{64}$/.test(d.revisao||''))throw new HttpsError('invalid-argument','Aviso inválido.');
 const db=await bancoDoUsuario(raiz,uid);
 if((d.grupoId||'')!==(db.grupoId||''))throw new HttpsError('permission-denied','O grupo mudou.');
 const hoje=new Date(agora-3*3600000).toISOString().slice(0,10);
 return db.runTransaction(async tx=>{
    await exigirOperacaoCompartilhada(tx, db, uid);
  const perfil=(await tx.get(db.doc('users/'+uid))).data();
  if(!perfil||perfil.ativo===false||!['admin','funcionario'].includes(perfil.role))throw new HttpsError('permission-denied','Acesso não autorizado.');
  if(perfil.role!=='admin') {const funcionario=id(perfil.funcionarioId)?(await tx.get(db.doc('funcionarios/'+perfil.funcionarioId))).data():null;if(!funcionario||funcionario.ativo===false)throw new HttpsError('permission-denied','Funcionária sem acesso.');}
  const ref=db.doc((d.tipo==='tarefa'?'tarefas/':'tarefasSemanais/')+d.id),t=(await tx.get(ref)).data();
  if(!t||t.ativa===false)throw new HttpsError('not-found','Tarefa removida ou inativa.');
  if(revisaoTarefa(t)!==d.revisao)throw new HttpsError('failed-precondition','A tarefa mudou. Consulte a tela atual.');
  if(d.dataKey!==hoje||d.tipo==='tarefa'&&t.dataAgendada!==d.dataKey||d.tipo==='tarefa_fixa'&&Number(t.diaSemana)!==new Date(hoje+'T12:00:00-03:00').getUTCDay())throw new HttpsError('failed-precondition','Esta ação não corresponde à tarefa de hoje.');
  const autor=perfil.role==='funcionario'?perfil.funcionarioId:uid;
  // Rotina fixa permanece individual por funcionária; administrador só consulta o ponto.
  if(d.tipo==='tarefa_fixa'&&perfil.role!=='funcionario')throw new HttpsError('permission-denied','A rotina fixa deve ser confirmada pela funcionária.');
  const conclusao=d.tipo==='tarefa_fixa'?db.doc(`funcionarios/${perfil.funcionarioId}/conclusoesRotina/${d.dataKey}_${d.id}`):ref;
  const anterior=d.tipo==='tarefa_fixa'?(await tx.get(conclusao)).exists:t.concluida===true;
  if(d.operacao==='consultar')return {titulo:t.titulo,concluida:anterior};
  if(anterior)return {ok:true,jaConcluida:true};
  const acaoId=hash(`${uid}:${db.grupoId||''}:${d.tipo}:${d.id}:${d.dataKey}:${d.revisao}`);
  const declarada=Number(d.declaradaEmMs);if(!Number.isSafeInteger(declarada)||declarada>agora+60000||declarada<agora-86400000)throw new HttpsError('invalid-argument','Horário da ação inválido.');
  if(d.tipo==='tarefa_fixa')tx.set(conclusao,{tarefaId:d.id,dataKey:d.dataKey,concluidaEm:FieldValue.serverTimestamp(),concluidaPor:autor,concluidaPorUid:uid,acaoNotificacaoId:acaoId,acaoDeclaradaEmMs:declarada});
  else tx.update(ref,{concluida:true,concluidaEm:FieldValue.serverTimestamp(),concluidaPor:autor,concluidaPorUid:uid,acaoNotificacaoId:acaoId,acaoDeclaradaEmMs:declarada});
  return {ok:true,jaConcluida:false};
 });
}
module.exports={acaoTarefa};
