const { exigirOperacaoCompartilhada } = require('./compartilhamento.cjs');
const { encerramentoAposConclusao } = require('./lembretes-conclusao.cjs');
const { prepararCota } = require('./assinaturas-cotas.cjs');
const {HttpsError}=require('firebase-functions/v2/https');
const {Timestamp,FieldValue}=require('firebase-admin/firestore');
const {proximoDisparo,dataValida,dataLocal}=require('./lembretes-dominio.cjs');
const {createHash}=require('node:crypto');
const assinatura=d=>createHash('sha256').update(JSON.stringify([d.usuarioId,String(d.titulo||'').trim(),String(d.observacao||'').trim(),d.dataInicio,d.horario,d.repeticao,d.repeticao==='dias'&&Array.isArray(d.diasSemana)?[...d.diasSemana].sort():[]])).digest('hex');
const id=v=>typeof v==='string'&&/^[\w-]{1,128}$/.test(v);
const pasta=(l,uid)=>Object.hasOwn(l?.organizacao||{},uid)?l.organizacao[uid]:'entrada';
const ativo=p=>p?.ativo!==false&&['admin','funcionario','consulta'].includes(p?.role);
const fail=(c,m)=>{throw new HttpsError(c,m);};
function validar(d,agora){
 const titulo=typeof d.titulo==='string'?d.titulo.trim():'',observacao=typeof d.observacao==='string'?d.observacao.trim():'';
 if(!titulo||titulo.length>120||observacao.length>300)fail('invalid-argument','Informe título de até 120 caracteres e detalhes de até 300.');
 if(!dataValida(d.dataInicio)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.horario||'')||!['uma_vez','diario','dias'].includes(d.repeticao))fail('invalid-argument','Confira a data, o horário e a repetição.');
 const diasSemana=d.repeticao==='dias'?d.diasSemana:[];
 if(!Array.isArray(diasSemana)||d.repeticao==='dias'&&!diasSemana.length||diasSemana.some(n=>!Number.isInteger(n)||n<0||n>6)||new Set(diasSemana).size!==diasSemana.length)fail('invalid-argument','Selecione os dias da semana.');
 const dados={titulo,observacao,dataInicio:d.dataInicio,horario:d.horario,horarios:[d.horario],repeticao:d.repeticao,diasSemana};
 const proximo=proximoDisparo(dados,agora);if(!proximo)fail('invalid-argument','Escolha um horário futuro.');
 return {...dados,proximoDisparoEm:Timestamp.fromMillis(proximo)};
}
const resumo=(doc,uid)=>{const l=doc.data();return {id:doc.id,titulo:l.titulo,observacao:l.observacao||'',usuarioId:l.usuarioId,usuarioNome:l.usuarioNome,criadaPor:l.criadaPor,criadaPorNome:l.criadaPorNome,ativo:l.ativo,versao:l.versao,dataInicio:l.dataInicio,horario:l.horario,horarios:l.horarios,repeticao:l.repeticao,diasSemana:l.diasSemana,proximoDisparoEmMs:l.proximoDisparoEm?.toMillis()||null,ultimaOcorrencia:l.ultimaOcorrencia||null,ultimaConclusao:l.ultimaConclusao||(l.ultimaOcorrencia?.status==='concluido'?l.ultimaOcorrencia:null),adiamento:l.adiamento||null,podeGerenciar:l.criadaPor===uid,anexosQuantidade:l.anexosQuantidade||0,anexosVersao:l.anexosVersao||0,pasta:pasta(l,uid),criadaEmMs:l.criadaEm?.toMillis()||null};};
async function operarGerais(db,request,agora=Date.now()){
 const uid=request.auth?.uid,d=request.data||{};if(!uid)fail('unauthenticated','Entre no aplicativo.');
 return db.runTransaction(async tx=>{
    await exigirOperacaoCompartilhada(tx, db, uid);
  const perfil=(await tx.get(db.doc('users/'+uid))).data();if(!ativo(perfil))fail('permission-denied','Conta sem acesso.');
  if(d.operacao==='geralLidos'){
   if(!Number.isSafeInteger(d.marcador)||d.marcador<0)fail('invalid-argument','Marcador inválido.');
   const ref=db.doc('lembretesEstado/'+uid),estado=(await tx.get(ref)).data()||{};
   tx.set(ref,{lidos:Math.max(estado.lidos||0,Math.min(d.marcador,estado.recebidos||0))},{merge:true});return {ok:true};
  }
  if(d.operacao==='geralPessoas'){

   const snap=await tx.get(db.collection('users').limit(201));if(snap.size>200)fail('resource-exhausted','O grupo excede o limite desta seleção.');
   return {pessoas:snap.docs.filter(p=>ativo(p.data())).map(p=>({id:p.id,nome:p.data().nome||'Usuário do grupo'}))};
  }
  if(d.operacao==='geralListar'){
   if(!['recebidos','criados'].includes(d.visao)||!['entrada','arquivado','excluido'].includes(d.pasta||'entrada')||d.cursor&&!id(d.cursor))fail('invalid-argument','Consulta inválida.');
   let q=db.collection('lembretes').where('dominio','==','geral').where(d.visao==='criados'?'criadaPor':'usuarioId','==',uid).orderBy('__name__');
   if(d.cursor)q=q.startAfter(d.cursor);
   const s=await tx.get(q.limit(31)),docs=s.docs.slice(0,30);
   const estado=d.visao==='recebidos'?(await tx.get(db.doc('lembretesEstado/'+uid))).data()||{}:{};
   const lembretes=docs.filter(p=>pasta(p.data(),uid)===(d.pasta||'entrada')).map(p=>resumo(p,uid));
   const {fotosInteracoes,atoresLembretes}=require('./fotos-interacoes.cjs');
   return {lembretes,...(d.fotosInteracoes===true?{pessoasInteracoes:await fotosInteracoes(tx,db,atoresLembretes(lembretes))}:{}),cursor:s.size>30?docs.at(-1).id:null,marcador:estado.recebidos||0,lidos:estado.lidos||0};
  }
  if(!id(d.id))fail('invalid-argument','Identificador de lembrete inválido.');
  const ref=db.doc('lembretes/'+d.id),l=(await tx.get(ref)).data();
  if(d.operacao==='geralSalvar'){
   // ID escolhido uma vez pelo cliente: repetir após resposta incerta não duplica o lembrete.
   if(l){if(l.dominio!=='geral'||l.criadaPor!==uid)fail('permission-denied','Lembrete indisponível.');if(l.assinatura!==assinatura(d))fail('aborted','Este envio já foi recebido com outros dados. Atualize a tela antes de criar outro.');return {id:ref.id,jaCriado:true};}
   if(!id(d.usuarioId))fail('invalid-argument','Escolha uma pessoa do grupo.');
   const alvo=(await tx.get(db.doc('users/'+d.usuarioId))).data();if(!ativo(alvo))fail('permission-denied','Destinatário indisponível neste grupo.');
   const campos=validar(d,agora);
   const limite=await tx.get(db.collection('lembretes').where('dominio','==','geral').where('criadaPor','==',uid).where('ativo','==',true).limit(101));
   if(limite.size>=100)fail('resource-exhausted','Limite de 100 lembretes ativos criados. Pause os que não serão mais utilizados.');
   const estadoRef=db.doc('lembretesEstado/'+d.usuarioId),estado=(await tx.get(estadoRef)).data()||{};
   const confirmarCota = await prepararCota(tx, db, uid, 'lembretes');
   confirmarCota();
   tx.set(estadoRef,{recebidos:(estado.recebidos||0)+1},{merge:true});
   tx.create(db.doc('avisosEnvios/novo_'+d.id),{uid:d.usuarioId,lembreteId:d.id,titulo:campos.titulo,tipo:'novo',pendente:true,criadaEm:FieldValue.serverTimestamp()});
   tx.create(ref,{...campos,dominio:'geral',assinatura:assinatura(d),tipo:'outro',usuarioId:d.usuarioId,usuarioNome:alvo.nome||'Usuário do grupo',criadaPor:uid,criadaPorNome:perfil.nome||'Usuário do grupo',criadaEm:FieldValue.serverTimestamp(),ativo:true,versao:1,ultimaOcorrencia:null});return {id:ref.id};
  }
  if(!l||l.dominio!=='geral')fail('not-found','Lembrete não encontrado.');
  if(d.operacao==='geralOrganizar'){
   if(l.criadaPor!==uid&&l.usuarioId!==uid)fail('permission-denied','Somente autor e destinatário organizam este lembrete.');
   if(!['entrada','arquivado','excluido'].includes(d.pasta))fail('invalid-argument','Escolha uma pasta válida.');
   if(pasta(l,uid)===d.pasta)return {ok:true};
   const estadoRef=db.doc('lembretesEstado/'+uid),estado=(await tx.get(estadoRef)).data()||{};
   tx.update(ref,{['organizacao.'+uid]:d.pasta});tx.set(estadoRef,{organizacao:(estado.organizacao||0)+1},{merge:true});return {ok:true};
  }
  if(['geralConcluir','geralAdiar'].includes(d.operacao)){
   if(pasta(l,uid)!=='entrada')fail('failed-precondition','Restaure o lembrete para adiar ou concluir.');
   if(l.usuarioId!==uid)fail('permission-denied','Somente quem recebeu pode concluir.');
   if(!id(d.ocorrenciaId)||!d.ocorrenciaId.startsWith(l.versao+'_'))fail('failed-precondition','Atualize o lembrete.');
   const r=ref.collection('ocorrencias').doc(d.ocorrenciaId),anterior=(await tx.get(r)).data(),ms=l.proximoDisparoEm?.toMillis();
   if(d.operacao==='geralAdiar'&&l.adiamento&&l.adiamento.operacaoId===d.operacaoId)return {ok:true,ateMs:l.adiamento.ateMs};
   if(anterior?.status==='concluido'){if(d.operacao==='geralAdiar')fail('failed-precondition','Este aviso já foi concluído.');return {ok:true};}
   const previsto=Number.isFinite(ms)&&(d.ocorrenciaId===`${l.versao}_${ms}`||l.adiamento?.ocorrenciaId===d.ocorrenciaId&&l.adiamento.ateMs===ms);
   if(!l.ativo||(!previsto&&!anterior)|| (previsto?ms:anterior.horarioMs)>agora)fail('failed-precondition','Este lembrete ainda não está disponível para conclusão.');
   const horarioMs=previsto?ms:anterior.horarioMs;
   const retomarEmMs=l.adiamento?.ocorrenciaId===d.ocorrenciaId?l.adiamento.retomarEmMs:previsto?proximoDisparo(l,ms):ms||null;
   if(d.operacao==='geralAdiar'){
    if(!id(d.operacaoId)||![5,15,30,60].includes(d.minutos))fail('invalid-argument','Escolha 5, 15, 30 ou 60 minutos.');
    if(l.adiamento&&l.adiamento.ocorrenciaId!==d.ocorrenciaId)fail('failed-precondition','Conclua o aviso já adiado antes de adiar outro.');
    const ateMs=agora+d.minutos*60000;
    if(retomarEmMs&&ateMs>=retomarEmMs)fail('failed-precondition','Há outro aviso agendado antes desse adiamento. Escolha um prazo menor.');
    const adiamento={ocorrenciaId:d.ocorrenciaId,originalMs:l.adiamento?.originalMs||horarioMs,ateMs,retomarEmMs:retomarEmMs||null,operacaoId:d.operacaoId};
    tx.set(r,{id:d.ocorrenciaId,horarioMs:ateMs,status:'adiado',leaseAteMs:0,adiadaPor:uid},{merge:true});
    tx.update(ref,{adiamento,proximoDisparoEm:Timestamp.fromMillis(ateMs),ultimaOcorrencia:{id:d.ocorrenciaId,horarioMs:ateMs,status:'adiado'}});return {ok:true,ateMs};
   }
   const feedback=d.feedback===undefined?'':d.feedback;
   if(typeof feedback!=='string'||feedback.length>500||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(feedback))fail('invalid-argument','O feedback deve ser um texto de até 500 caracteres.');
   const autorEstadoRef=db.doc('lembretesEstado/'+l.criadaPor),autorEstado=(await tx.get(autorEstadoRef)).data()||{};
   const encerramento = await encerramentoAposConclusao(tx, ref, l, d.ocorrenciaId, previsto ? retomarEmMs : ms);
   tx.set(autorEstadoRef,{conclusoes:(autorEstado.conclusoes||0)+1},{merge:true});
   tx.create(db.doc('avisosEnvios/concluido_'+d.id+'_'+d.ocorrenciaId),{uid:l.criadaPor,lembreteId:d.id,titulo:l.titulo,tipo:'concluido',concluidaPorNome:perfil.nome||'Destinatário',pendente:true,criadaEm:FieldValue.serverTimestamp()});
   const registro={id:d.ocorrenciaId,horarioMs,status:'concluido',concluidaPor:uid,concluidaPorNome:perfil.nome||'Destinatário',concluidaEmMs:agora,feedback:feedback.replace(/\r\n?/g,'\n').trim()};
   tx.set(r,{...registro,leaseAteMs:0},{merge:true});
   tx.update(ref,{...encerramento,ultimaConclusao:registro});
   if(previsto){const proximo=retomarEmMs;tx.update(ref,{adiamento:null,ultimaOcorrencia:registro,proximoDisparoEm:proximo?Timestamp.fromMillis(proximo):null});}
   else if(l.ultimaOcorrencia?.id===d.ocorrenciaId)tx.update(ref,{ultimaOcorrencia:registro});
   return {ok:true};
  }
  if(d.operacao!=='geralPausar'||l.criadaPor!==uid)fail('permission-denied','Somente o autor gerencia este lembrete.');
  if(l.versao!==d.versao||typeof d.ativo!=='boolean')fail('aborted','Atualize a tela antes de alterar.');
  const proximo=d.ativo?proximoDisparo(l,agora):null;if(d.ativo&&!proximo)fail('failed-precondition','Crie outro lembrete com data futura.');
  const confirmarCota = await prepararCota(tx, db, uid, 'lembretes', d.ativo && l.ativo !== true ? 1 : 0);
  confirmarCota();
  tx.update(ref,{ativo:d.ativo,versao:l.versao+1,proximoDisparoEm:proximo?Timestamp.fromMillis(proximo):null,ultimaOcorrencia:null,adiamento:null});return {ok:true};
 });
}
async function processarGeral(db,ref,enviar,agora,relogio=()=>agora){
 const reserva=await db.runTransaction(async tx=>{
  const l=(await tx.get(ref)).data(),ms=l?.proximoDisparoEm?.toMillis();if(l?.dominio!=='geral'||!l.ativo||!Number.isFinite(ms)||ms>agora)return null;
  const ocorrenciaId=l.adiamento?.ateMs===ms?l.adiamento.ocorrenciaId:`${l.versao}_${ms}`,oc=ref.collection('ocorrencias').doc(ocorrenciaId),anterior=(await tx.get(oc)).data();if(anterior?.leaseAteMs>agora||anterior?.status==='concluido')return null;
  tx.set(oc,{horarioMs:ms,status:'processando',leaseAteMs:agora+90000},{merge:true});return {...l,ms,ocorrenciaId,oc};
 });if(!reserva)return 0;
 try{
  const [snap,p]=await Promise.all([ref.get(),db.doc('users/'+reserva.usuarioId).get()]);const atual=snap.data();
  let status=!atual?.ativo||atual.versao!==reserva.versao||atual.proximoDisparoEm?.toMillis()!==reserva.ms?'cancelado':!ativo(p.data())?'sem_acesso':pasta(atual,reserva.usuarioId)!=='entrada'?'silenciado':relogio()-reserva.ms>15*60000?'atrasado':'enviado';
  if(status==='enviado'){
   const enviados=await enviar('Tá no Ponto · Lembrete',`${reserva.horario} · ${reserva.titulo}`,'/avisos',`lembrete-geral:${ref.id}:${reserva.ocorrenciaId}${reserva.adiamento?':adiado:'+reserva.ms:''}`,reserva.usuarioId,false,{ttl:300,urgency:'high',contarConfirmados:true,acao:{categoria:'tarefas'}});
   if(!enviados)status='sem_dispositivo';
  }
  await db.runTransaction(async tx=>{
   const l=(await tx.get(ref)).data(),o=(await tx.get(reserva.oc)).data();if(o?.status==='concluido')return;
   tx.set(reserva.oc,{status,leaseAteMs:0},{merge:true});
   if(l?.versao!==reserva.versao||l.proximoDisparoEm?.toMillis()!==reserva.ms)return;
   const proximo=reserva.adiamento?reserva.adiamento.retomarEmMs:proximoDisparo(l,dataLocal(reserva.ms)===dataLocal(agora)?reserva.ms:agora);
   tx.update(ref,{adiamento:null,proximoDisparoEm:proximo?Timestamp.fromMillis(proximo):null,ultimaOcorrencia:{id:reserva.ocorrenciaId,horarioMs:reserva.ms,status}});
  });return 1;
 }catch{await db.runTransaction(async tx=>{const o=(await tx.get(reserva.oc)).data();if(o?.status!=='concluido')tx.set(reserva.oc,{leaseAteMs:0,status:'tentar_novamente'},{merge:true});});return 0;}
}
async function processarEnviosGerais(db,enviar,agora=Date.now()){
 const snap=await db.collection('avisosEnvios').where('pendente','==',true).limit(100).get();let enviados=0;
 for(const doc of snap.docs){
  const item=await db.runTransaction(async tx=>{
   const d=(await tx.get(doc.ref)).data();if(!d?.pendente||d.leaseAteMs>agora)return null;
   const lembreteId=d.lembreteId||(d.tipo==='novo'?doc.id.slice('novo_'.length):doc.id.slice('concluido_'.length).replace(/_\d+_\d+$/,''));
   const l=id(lembreteId)?(await tx.get(db.doc('lembretes/'+lembreteId))).data():null;
   if(!l||l.dominio!=='geral'||(d.tipo==='novo'?d.uid!==l.usuarioId:d.tipo==='anexo'?![l.usuarioId,l.criadaPor].includes(d.uid):d.uid!==l.criadaPor)||pasta(l,d.uid)!=='entrada'){tx.update(doc.ref,{pendente:false,leaseAteMs:0,silenciado:true});return null;}
   tx.update(doc.ref,{leaseAteMs:agora+90000});return d;
  });
  if(!item)continue;
  try{const titulo=item.tipo==='anexo'?'Novo anexo no lembrete':item.tipo==='concluido'?'Lembrete concluído':'Novo lembrete para você';const body=item.tipo==='anexo'?item.anexadoPorNome+' adicionou um anexo: '+item.titulo:item.tipo==='concluido'?item.concluidaPorNome+' concluiu: '+item.titulo:item.titulo;
   await enviar(titulo,body,'/avisos','aviso-evento:'+doc.id,item.uid,false,{ttl:86400,contarConfirmados:true,acao:{categoria:'tarefas'}});
   await doc.ref.update({pendente:false,leaseAteMs:0,enviadaEm:FieldValue.serverTimestamp()});enviados++;
  }catch{await doc.ref.update({leaseAteMs:0});}
 }return enviados;
}
module.exports={operarGerais,processarGeral,processarEnviosGerais};
