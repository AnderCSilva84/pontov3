const {HttpsError}=require('firebase-functions/v2/https');
const {FieldValue,FieldPath}=require('firebase-admin/firestore');
const {createHash}=require('node:crypto');
const {bancoDoGrupo,grupoValido}=require('./grupos-contexto.cjs');
const {aplicarAcao,dataValida}=require('./ponto-validacao.cjs');
const {partesOperacionais,validarOperacao}=require('./ponto-operacoes.cjs');
const falhar=(code,message)=>{throw new HttpsError(code,message);};
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const id=v=>typeof v==='string'&&/^[\w-]{1,200}$/.test(v);
const admin=p=>p.role==='admin';
const revisaoDia=s=>s.exists?s.updateTime.toMillis()+':'+s.updateTime.nanoseconds:'ausente';
const serializar=v=>v?.toMillis?v.toMillis():Array.isArray(v)?v.map(serializar):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,serializar(x)])):v;
async function contexto(raiz,tx,uid,esperado){
  if(!uid)falhar('unauthenticated','Entre novamente.');
  const v=(await tx.get(raiz.doc('vinculosUsuarios/'+uid))).data();
  if(v&&(!grupoValido(v.grupoId)||v.ativo!==true))falhar('permission-denied','Vínculo inativo.');
  const gid=v?.grupoId||null,db=gid?bancoDoGrupo(raiz,gid):raiz;
  if(gid!==esperado)falhar('permission-denied','O contexto da sessão mudou.');
  const g=await tx.get(raiz.doc(gid?'grupos/'+gid:'migracoesGrupos/legado'));
  if(gid?g.data()?.ativo!==true:g.data()?.bloqueada)falhar('permission-denied','Contexto indisponível.');
  const p=(await tx.get(db.doc('users/'+uid))).data();
  if(!p||p.ativo===false||!['admin','funcionario'].includes(p.role))falhar('permission-denied','Acesso não autorizado.');
  return {db,p,gid};
}
function conferir(p,c,uid){
  if(!p||p.contexto?.tipo!==(c.gid?'grupo':'legado')||(p.contexto.id||null)!==c.gid)falhar('not-found','Pendência não encontrada neste contexto.');
  if(!admin(c.p)&&(p.uid!==uid||p.funcionarioId!==c.p.funcionarioId))falhar('permission-denied','Somente pendências próprias.');
}
function bloqueio(p,dia,f,folha){
  if(!f||f.ativo===false)return 'Funcionário inativo ou removido. Aprovação bloqueada; a rejeição justificada continua disponível.';
  if(folha&&folha.status!=='em_andamento')return 'Folha fechada. Não será reaberta automaticamente.';
  if(dia?.encerrado||dia?.saida)return 'Jornada encerrada. Examine o ajuste administrativo existente; esta revisão não sobrescreve marcações.';
  if(dia?.ajusteManual||dia?.ajusteTipo)return 'Jornada possui ajuste administrativo ou afastamento. Examine o ajuste existente; aprovação direta bloqueada.';
  if(partesOperacionais(p.payload.capturadoEmMs).dataKey!==p.payload.jornadaData)return 'Captura atravessa outra data. Turno noturno não suportado.';
  return '';
}
async function operarRevisao(raiz,request){
  const d=request.data||{},uid=request.auth?.uid;
  if(!['listar','detalhe','decidir','detalheDia','ajustarDia'].includes(d.acao)||!(d.grupoId===null||grupoValido(d.grupoId)))falhar('invalid-argument','Pedido de revisão inválido.');
  return raiz.runTransaction(async tx=>{
    const c=await contexto(raiz,tx,uid,d.grupoId),{db,p}=c;
    if(['detalheDia','ajustarDia'].includes(d.acao))return serializar(await require('./ponto-ajuste.cjs').operarAjuste(tx,c,d,uid));
    if(d.acao==='listar'){
      if(!dataValida(d.inicio)||!dataValida(d.fim)||d.inicio>d.fim)falhar('invalid-argument','Selecione um período válido.');
      const limite=d.limite??20;
      if(!Number.isInteger(limite)||limite<1||limite>50||!['todos','aguardando_analise','aprovada','rejeitada'].includes(d.estado))falhar('invalid-argument','Filtro inválido.');
      let q=db.collection('pontoPendencias');
      if(!admin(p))q=q.where('uid','==',uid);
      if(d.estado!=='todos')q=q.where('status','==',d.estado);
      q=q.where('payload.jornadaData','>=',d.inicio).where('payload.jornadaData','<=',d.fim).orderBy('payload.jornadaData','desc').orderBy(FieldPath.documentId(),'desc');
      if(d.cursor){if(!dataValida(d.cursor.data)||!id(d.cursor.id))falhar('invalid-argument','Cursor inválido.');q=q.startAfter(d.cursor.data,d.cursor.id);}
      const s=await tx.get(q.limit(limite+1)),docs=s.docs.slice(0,limite);
      const itens=docs.map(s=>{const x=s.data();conferir(x,c,uid);return serializar({id:s.id,...x});});
      const ultimo=docs.at(-1);
      return {itens,cursor:s.size>limite?{data:ultimo.data().payload.jornadaData,id:ultimo.id}:null};
    }
    if(!id(d.pendenciaId))falhar('invalid-argument','Pendência inválida.');
    const ref=db.doc('pontoPendencias/'+d.pendenciaId),s=await tx.get(ref),pendencia=s.data();
    conferir(pendencia,c,uid);
    if(d.acao==='decidir'&&!admin(p))falhar('permission-denied','Somente administradores podem decidir.');
    if(d.acao==='decidir'){
      if(d.versao!==1||typeof d.decisaoId!=='string'||!/^[a-f\d-]{36}$/i.test(d.decisaoId)||!['aprovada','rejeitada'].includes(d.resultado)||typeof d.justificativa!=='string'||d.justificativa.trim().length<5||d.justificativa.length>1000||typeof d.revisaoDia!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.horaRevisada||''))falhar('invalid-argument','Informe horário revisado e justificativa (5 a 1000 caracteres).');
      const assinatura=hash([uid,d.pendenciaId,d.decisaoId,d.resultado,d.justificativa.trim(),d.horaRevisada,d.revisaoDia]);
      const anterior=(await tx.get(db.doc(`pontoDecisoes/${uid}_${d.decisaoId}`))).data();
      if(anterior){if(anterior.assinatura===assinatura)return anterior.resultado;falhar('already-exists','ID de decisão já utilizado com outro conteúdo.');}
      if(pendencia.decisao){
        if(pendencia.decisao.decisaoId===d.decisaoId&&pendencia.decisao.assinatura===assinatura)return pendencia.decisao.resultado;
        falhar('already-exists','Esta pendência já tem uma decisão. Atualize para consultar o resultado.');
      }
    }
    const original=pendencia.payload,fid=pendencia.funcionarioId,data=original.jornadaData;
    const diaRef=db.doc(`dias/${fid}_${data}`),diaSnap=await tx.get(diaRef),dia=diaSnap.data()||null;
    const folhaRef=db.doc(`folhasPagamento/${fid}_${data.slice(0,7)}`),folha=(await tx.get(folhaRef)).data();
    const funcionario=(await tx.get(db.doc('funcionarios/'+fid))).data();
    let alerta=bloqueio(pendencia,dia,funcionario,folha);
    if(d.acao==='detalhe')return serializar({id:s.id,...pendencia,funcionarioNome:funcionario?.nome||fid,dia,revisaoDia:revisaoDia(diaSnap),alerta});
    if(pendencia.status!=='aguardando_analise')falhar('failed-precondition','Estado da pendência incompatível.');
    const reciboRef=db.doc(`pontoOperacoes/${pendencia.uid}_${original.operacaoId}`),recibo=(await tx.get(reciboRef)).data();
    if(!recibo||recibo.uid!==pendencia.uid||recibo.resultado?.status!=='recebida')falhar('failed-precondition','Recibo original inconsistente; procure suporte.');
    if(hash(validarOperacao(original))!==recibo.hash||original.uid!==pendencia.uid||original.funcionarioId!==fid||original.modalidade!=='offline_pendente')falhar('failed-precondition','Captura original inconsistente com o recibo. Nenhuma marcação foi alterada.');
    let alteracoes;
    const registroId=`revisao_${pendencia.uid}_${original.operacaoId}`;
    if(d.resultado==='aprovada'){
      const perfilOriginal=(await tx.get(db.doc('users/'+pendencia.uid))).data();
      const vinculoOriginal=(await tx.get(raiz.doc('vinculosUsuarios/'+pendencia.uid))).data();
      if(!perfilOriginal||perfilOriginal.ativo===false||perfilOriginal.role!=='funcionario'||perfilOriginal.funcionarioId!==fid||(c.gid?(vinculoOriginal?.ativo!==true||vinculoOriginal.grupoId!==c.gid):Boolean(vinculoOriginal)))alerta='Conta original sem acesso ativo. Não recrie a identidade. É possível rejeitar com justificativa.';
      if(alerta)falhar('failed-precondition',alerta);
      if(d.revisaoDia!==revisaoDia(diaSnap))falhar('aborted','A jornada mudou após abrir o detalhe. Atualize e examine novamente.');
      if(Object.values({entrada:dia?.entrada,saidaIntervalo:dia?.saidaIntervalo,entradaIntervalo:dia?.entradaIntervalo}).some(h=>h&&h>=d.horaRevisada))falhar('failed-precondition','Horário sobreposto ou anterior à última marcação.');
      if(data>partesOperacionais(Date.now()).dataKey)falhar('failed-precondition','Não aprove uma jornada futura.');
      try{alteracoes=aplicarAcao(dia,original.tipo,d.horaRevisada,funcionario,new Date(data+'T12:00Z').getUTCDay(),data);}catch(e){falhar('failed-precondition',e.message);}
      if((await tx.get(db.doc('registros/'+registroId))).exists)falhar('failed-precondition','Registro administrativo já existente; procure suporte.');
    }
    const aprovado=d.resultado==='aprovada',timestamp=FieldValue.serverTimestamp();
    const resultado={operacaoId:original.operacaoId,status:aprovado?'confirmado':'rejeitada',origem:'revisao_offline',pendenciaId:s.id,jornadaData:data,dataKey:data,hora:aprovado?d.horaRevisada:null,justificativa:d.justificativa.trim(),decididoPor:uid,decisaoId:d.decisaoId,versao:1};
    const decisao={versao:1,decisaoId:d.decisaoId,assinatura:hash([uid,d.pendenciaId,d.decisaoId,d.resultado,d.justificativa.trim(),d.horaRevisada,d.revisaoDia]),responsavelUid:uid,decididaEm:timestamp,justificativa:d.justificativa.trim(),horaRevisada:d.horaRevisada,revisaoDia:d.revisaoDia,resultado,jornadaId:`${fid}_${data}`,registroId:aprovado?registroId:null};
    // A decisão no documento protegido é a auditoria autoritativa e imutável.
    tx.update(ref,{status:d.resultado,decisao});
    tx.create(db.doc(`pontoDecisoes/${uid}_${d.decisaoId}`),{...decisao,pendenciaId:s.id,autorOriginal:pendencia.uid,funcionarioId:fid,contexto:pendencia.contexto});
    tx.update(reciboRef,{resultado});
    if(aprovado){
      tx.set(diaRef,{...alteracoes,funcionarioId:fid,dataKey:data,origemUltimaAlteracao:'revisao_offline',pendenciaId:s.id,atualizadoEm:timestamp},{merge:true});
      tx.create(db.doc('registros/'+registroId),{funcionarioId:fid,funcionarioNome:funcionario.nome||'',tipo:original.tipo,dataKey:data,hora:d.horaRevisada,timestamp,origem:'revisao_offline',registradoPor:uid,autorOriginal:pendencia.uid,operacaoId:original.operacaoId,pendenciaId:s.id,decisaoId:d.decisaoId});
      if(folha)tx.update(folhaRef,{pontoRevisaoPendente:true,versao:(folha.versao||0)+1});
    }
    return resultado;
  });
}
module.exports={operarRevisao};
