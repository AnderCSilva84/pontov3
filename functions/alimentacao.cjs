const { exigirOperacaoCompartilhada } = require('./compartilhamento.cjs');
const { prepararCota } = require('./assinaturas-cotas.cjs');
const {HttpsError}=require('firebase-functions/v2/https');
const {Timestamp,FieldValue}=require('firebase-admin/firestore');
const {createHash}=require('node:crypto');
const {proximoDisparo,dataValida,dataLocal}=require('./lembretes-dominio.cjs');
const id=v=>typeof v==='string'&&/^[\w-]{1,100}$/.test(v);
const ativo=p=>p?.ativo!==false&&['admin','funcionario','consulta'].includes(p?.role);
const falha=(c,m)=>{throw new HttpsError(c,m);};
const {validarOpcoes,validarChoRefeicao,resumoRefeicao}=require('./alimentacao-opcoes.cjs');
function validarPlano(d){
 const titulo=typeof d.titulo==='string'?d.titulo.trim():'';
 if(!titulo||titulo.length>100)falha('invalid-argument','Dê um nome à programação (até 100 caracteres).');
 if(!dataValida(d.dataInicio)||d.dataFim&&(!dataValida(d.dataFim)||d.dataFim<d.dataInicio)||!['diario','dias','uma_vez'].includes(d.repeticao))falha('invalid-argument','Confira o início, o término e a repetição.');
 const diasSemana=d.repeticao==='dias'?d.diasSemana:[];
 if(!Array.isArray(diasSemana)||d.repeticao==='dias'&&!diasSemana.length||diasSemana.some(n=>!Number.isInteger(n)||n<0||n>6)||new Set(diasSemana).size!==diasSemana.length)falha('invalid-argument','Escolha os dias da semana.');
 if(!['todos','selecionados'].includes(d.destinatarios))falha('invalid-argument','Escolha quem receberá os avisos.');
 const usuarioIds=d.destinatarios==='todos'?[]:d.usuarioIds;
 if(!Array.isArray(usuarioIds)||d.destinatarios==='selecionados'&&!usuarioIds.length||usuarioIds.length>200||usuarioIds.some(v=>!id(v))||new Set(usuarioIds).size!==usuarioIds.length)falha('invalid-argument','Selecione de 1 a 200 integrantes do grupo.');
 if(!Array.isArray(d.refeicoes)||!d.refeicoes.length||d.refeicoes.length>12)falha('invalid-argument','Cadastre de 1 a 12 refeições.');
 const refeicoes=d.refeicoes.map(r=>{
  if(!r||typeof r!=='object'||Array.isArray(r))falha('invalid-argument','Confira os dados de cada refeição.');
  const nome=typeof r.nome==='string'?r.nome.trim():'';let sugestao=typeof r.sugestao==='string'?r.sugestao.trim():'',opcoes;
  let cho;try{cho=validarChoRefeicao(r);}catch(e){falha('invalid-argument',e.message);}
  if(r.opcoes!==undefined){
   try{opcoes=validarOpcoes(r.opcoes);}catch(e){falha('invalid-argument',e.message);}
   const resumo=resumoRefeicao(opcoes,cho);
   if(d.opcoesPorRefeicao!==true&&sugestao!==resumo)falha('failed-precondition','Esta refeição tem opções em linhas. Atualize o aplicativo antes de editar.');
   sugestao=resumo;
  }
  if(!id(r.id)||!nome||nome.length>60||!sugestao||sugestao.length>240||!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.horario||''))falha('invalid-argument','Cada refeição precisa de nome, horário e sugestão do que comer (até 240 caracteres).');
  let imagemUrl='';
  if(r.imagemUrl!==undefined&&typeof r.imagemUrl!=='string')falha('invalid-argument','Informe uma URL HTTPS para a foto da refeição.');
  if(r.imagemUrl?.trim())try{imagemUrl=require('./receita-imagem.cjs').urlPublica(r.imagemUrl.trim()).href;}catch{falha('invalid-argument','Use um link HTTPS público e direto para a foto da refeição.');}
  return {id:r.id,nome,horario:r.horario,sugestao,imagemUrl,...cho,...(opcoes?{opcoes}:{})};
 }).sort((a,b)=>a.horario.localeCompare(b.horario)||a.id.localeCompare(b.id));
 if(new Set(refeicoes.map(r=>r.id)).size!==refeicoes.length)falha('invalid-argument','Há refeições repetidas na programação.');
 return {titulo,dataInicio:d.dataInicio,dataFim:d.dataFim||'',repeticao:d.repeticao,diasSemana:[...diasSemana].sort(),destinatarios:d.destinatarios,usuarioIds:[...usuarioIds].sort(),refeicoes};
}
function proximaRefeicao(p,r,apos){
 const ms=proximoDisparo({...p,horario:r.horario,horarios:[r.horario]},apos);
 return ms&&(!p.dataFim||dataLocal(ms)<=p.dataFim)?ms:null;
}
const podeVer=(p,uid,perfil)=>perfil.role==='admin'||p.destinatarios==='todos'||p.usuarioIds.includes(uid);
async function operarAlimentacao(db,request,agora=Date.now()){
 const uid=request.auth?.uid,d=request.data||{};if(!uid)falha('unauthenticated','Entre no aplicativo.');
 return db.runTransaction(async tx=>{
    await exigirOperacaoCompartilhada(tx, db, uid);
  const perfil=(await tx.get(db.doc('users/'+uid))).data();if(!ativo(perfil))falha('permission-denied','Conta sem acesso.');
  if(d.operacao==='alimentacaoListar'){
   if(d.visao!==undefined&&!['minhas','criadas'].includes(d.visao))falha('invalid-argument','Escolha suas refeições ou as programações que criou.');
   if(d.visao==='criadas'&&perfil.role!=='admin')falha('permission-denied','Somente administradores gerenciam programações criadas.');
   const snap=await tx.get(db.collection('planosAlimentares').where('ativo','==',true).limit(21));
   if(snap.size>20)falha('resource-exhausted','Há muitas programações ativas. Arquive as anteriores.');
   const visiveis=snap.docs.filter(s=>d.visao==='minhas'?(s.data().destinatarios==='todos'||s.data().usuarioIds.includes(uid)):d.visao==='criadas'?s.data().criadaPor===uid:podeVer(s.data(),uid,perfil));
   let todos=[];
   if(d.fotosInteracoes===true&&visiveis.some(s=>s.data().destinatarios==='todos')){
    const usuarios=await tx.get(db.collection('users').limit(201));
    if(usuarios.size>200)falha('resource-exhausted','O grupo excede o limite de integrantes desta programação.');
    todos=usuarios.docs.filter(s=>ativo(s.data())).map(s=>({id:s.id,nome:s.data().nome||'Integrante do grupo'}));
   }
   const planos=visiveis.map(s=>{const p=s.data();return {id:s.id,titulo:p.titulo,dataInicio:p.dataInicio,dataFim:p.dataFim,repeticao:p.repeticao,diasSemana:p.diasSemana,destinatarios:p.destinatarios,usuarioIds:p.usuarioIds,destinatariosNomes:p.destinatarios==='todos'?todos:p.destinatariosNomes,refeicoes:p.refeicoes,versao:p.versao,criadaPorNome:p.criadaPorNome};});
   // Miniaturas somente dos destinatários de planos autorizados, deduplicadas por consulta.
   const pessoasInteracoes=d.fotosInteracoes===true?await require('./fotos-interacoes.cjs').fotosInteracoes(tx,db,planos.flatMap(p=>p.destinatariosNomes.map(x=>x.id))):undefined;
   return {planos,...(pessoasInteracoes?{pessoasInteracoes}:{})};
  }
  if(perfil.role!=='admin')falha('permission-denied','Somente administradores gerenciam a programação alimentar.');
  if(!id(d.id)||!id(d.operacaoId))falha('invalid-argument','Identificador da programação inválido.');
  const ref=db.doc('planosAlimentares/'+d.id),anterior=(await tx.get(ref)).data();
  if(d.operacao==='alimentacaoSalvar'&&d.choPorRefeicao!==true&&(anterior?.refeicoes||[]).some(r=>r.choModo==='total'||r.choTotalGramas!=null))falha('failed-precondition','Atualize o aplicativo antes de editar o CHO total desta programação.');
  const campos=d.operacao==='alimentacaoSalvar'?validarPlano(d):null;
  const assinatura=createHash('sha256').update(JSON.stringify([d.operacao,d.versao,campos])).digest('hex');
  if(anterior?.operacaoId===d.operacaoId){if(anterior.assinatura!==assinatura)falha('aborted','Esta tentativa já foi salva com outros dados.');return {id:ref.id,versao:anterior.versao};}
  if((anterior?.versao||0)!==d.versao||anterior?.ativo===false)falha('aborted','A programação mudou. Atualize a tela.');
  if(!['alimentacaoSalvar','alimentacaoArquivar'].includes(d.operacao)||!anterior&&!campos)falha('invalid-argument','Programação indisponível.');
  const antigos=anterior?.refeicoes||[],lembretesIds=[...new Set([...antigos,...(campos?.refeicoes||[])].map(r=>`alimentacao_${d.id}_${r.id}`))];
  const lembretes=lembretesIds.length?await tx.getAll(...lembretesIds.map(id=>db.doc('lembretes/'+id))):[];
  let destinatariosNomes=[];
  if(campos?.destinatarios==='selecionados'){
   const pessoas=await tx.getAll(...campos.usuarioIds.map(id=>db.doc('users/'+id)));
   if(pessoas.some(s=>!ativo(s.data())))falha('failed-precondition','Um dos integrantes não está ativo neste grupo. Confira os destinatários.');
   destinatariosNomes=pessoas.map(s=>({id:s.id,nome:s.data().nome||'Integrante do grupo'}));
  }
  if(!anterior){const planos=await tx.get(db.collection('planosAlimentares').where('ativo','==',true).limit(21));if(planos.size>=20)falha('resource-exhausted','Arquive uma programação antes de criar outra (limite de 20).');}
  if(campos&&!campos.refeicoes.some(r=>proximaRefeicao(campos,r,agora)))falha('invalid-argument','Escolha pelo menos uma refeição com horário futuro dentro do período.');
  const delta = lembretes.reduce((total, s) => total + (campos?.refeicoes.some(r => s.id === `alimentacao_${d.id}_${r.id}`) ? 1 : 0) - (s.data()?.ativo === true ? 1 : 0), 0);
  const confirmarCota = await prepararCota(tx, db, uid, 'lembretes', Math.max(0, delta));
  confirmarCota();
  const versao=(anterior?.versao||0)+1;
  // Todas as leituras precedem as escritas: plano e avisos mudam atomicamente.
  for(const s of lembretes){
   const refeicao=campos?.refeicoes.find(r=>s.id===`alimentacao_${d.id}_${r.id}`),proximo=refeicao?proximaRefeicao(campos,refeicao,agora):null;
   if(refeicao)tx.set(s.ref,{dominio:'alimentacao',planoId:d.id,refeicaoId:refeicao.id,titulo:refeicao.nome,sugestao:refeicao.sugestao,horario:refeicao.horario,horarios:[refeicao.horario],dataInicio:campos.dataInicio,dataFim:campos.dataFim,repeticao:campos.repeticao,diasSemana:campos.diasSemana,ativo:true,versao,proximoDisparoEm:proximo?Timestamp.fromMillis(proximo):null});
   else if(s.exists)tx.update(s.ref,{ativo:false,versao,proximoDisparoEm:null});
  }
  tx.set(ref,{...(campos||anterior),destinatariosNomes:campos?destinatariosNomes:anterior.destinatariosNomes,ativo:Boolean(campos),versao,operacaoId:d.operacaoId,assinatura,criadaPor:anterior?.criadaPor||uid,criadaPorNome:anterior?.criadaPorNome||perfil.nome||'Administrador',atualizadaEm:FieldValue.serverTimestamp()});
  return {id:ref.id,versao};
 });
}
async function processarAlimentacao(db,ref,enviar,agora,relogio=()=>agora){
 const reserva=await db.runTransaction(async tx=>{
  const l=(await tx.get(ref)).data(),ms=l?.proximoDisparoEm?.toMillis();if(l?.dominio!=='alimentacao'||!l.ativo||!Number.isFinite(ms)||ms>agora)return null;
  const plano=(await tx.get(db.doc('planosAlimentares/'+l.planoId))).data(),oc=ref.collection('ocorrencias').doc(`${l.versao}_${ms}`),anterior=(await tx.get(oc)).data();
  if(anterior?.leaseAteMs>agora)return null;
  tx.set(oc,{horarioMs:ms,leaseAteMs:agora+90000,status:'processando'},{merge:true});
  return {...l,ms,oc,plano};
 });if(!reserva)return 0;
 try{
  let status='cancelado';
  if(reserva.plano?.ativo&&reserva.plano.versao===reserva.versao){
   status=relogio()-reserva.ms>15*60000?'atrasado':'enviado';
   if(status==='enviado'){
    const pessoas=reserva.plano.destinatarios==='todos'?(await db.collection('users').limit(201).get()).docs:await db.getAll(...reserva.plano.usuarioIds.map(id=>db.doc('users/'+id)));
    if(pessoas.length>200)throw Error('Grupo excede limite de destinatários.');
    let enviados=0;
    for(const pessoa of pessoas){
     if(!ativo(pessoa.data()))continue;
     const atual=(await db.doc('planosAlimentares/'+reserva.planoId).get()).data();
     if(!atual?.ativo||atual.versao!==reserva.versao){status='cancelado';break;}
     if(relogio()-reserva.ms>15*60000){status='atrasado';break;}
     enviados+=await enviar(`Hora de ${reserva.titulo}`,`${reserva.horario} · ${reserva.sugestao}`,'/alimentacao',`alimentacao:${ref.id}:${reserva.versao}:${reserva.ms}`,pessoa.id,false,{ttl:300,urgency:'high',contarConfirmados:true,acao:{categoria:'alimentacao'}});
    }
    if(status==='enviado'&&!enviados)status='sem_dispositivo';
   }
  }
  await db.runTransaction(async tx=>{
   const l=(await tx.get(ref)).data();tx.set(reserva.oc,{status,leaseAteMs:0},{merge:true});
   if(l?.versao!==reserva.versao||l.proximoDisparoEm?.toMillis()!==reserva.ms)return;
   const proximo=status==='cancelado'?null:proximaRefeicao(l,{horario:l.horario},dataLocal(reserva.ms)===dataLocal(agora)?reserva.ms:agora);
   tx.update(ref,{proximoDisparoEm:proximo?Timestamp.fromMillis(proximo):null,ultimaOcorrencia:{horarioMs:reserva.ms,status}});
  });return 1;
 }catch{await reserva.oc.set({leaseAteMs:0,status:'tentar_novamente'},{merge:true});return 0;}
}
module.exports={validarPlano,proximaRefeicao,operarAlimentacao,processarAlimentacao};
