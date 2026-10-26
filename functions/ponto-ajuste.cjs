const {HttpsError}=require('firebase-functions/v2/https');
const {FieldValue}=require('firebase-admin/firestore');
const {createHash}=require('node:crypto');
const {aplicarAcao,dataValida}=require('./ponto-validacao.cjs');
const fail=(c,m)=>{throw new HttpsError(c,m);};
const campos=['entrada','saidaIntervalo','entradaIntervalo','saida'];
function calcularAjuste(d,f){
 const semana=new Date(d.dataKey+'T12:00Z').getUTCDay();
 const nomes=['domingo','segunda','terca','quarta','quinta','sexta','sabado'];
 const carga=Number(f.escala?.[nomes[semana]]?.cargaMin??(semana===0?0:semana===6?f.cargaSabadoMin??0:f.cargaSegSexMin??480));
 if(!Number.isFinite(carga)||carga<0||carga>1440)fail('failed-precondition','Carga de trabalho inválida. Revise o cadastro.');
 const base={entrada:null,saidaIntervalo:null,entradaIntervalo:null,saida:null,ajusteAbonoMin:null};
 if(['atestado','dispensa','ferias','falta'].includes(d.tipo)){
  const abono=d.tipo==='falta'?0:d.abonoMin==null?carga:d.abonoMin;
  if(!Number.isInteger(abono)||abono<0||abono>carga)fail('invalid-argument','Abono deve ser um número de minutos entre zero e a carga diária.');
  return {...base,totalMin:abono,saldoMin:abono-carga,encerrado:true,calculoVersao:1,ajusteAbonoMin:d.tipo==='falta'?null:abono};
 }
 if(!['manual','saida_mais_cedo'].includes(d.tipo))fail('invalid-argument','Tipo de ajuste inválido.');
 const semIntervalo=semana===6||f.desconsiderarIntervalo===true;
 if(semIntervalo&&(d.saidaIntervalo||d.entradaIntervalo))fail('invalid-argument','A jornada configurada não registra intervalo. Deixe esses campos vazios.');
 let dia={...base};
 try{
  for(const [tipo,campo] of [['ENTRADA','entrada'],...(!semIntervalo?[['SAIDA_INTERVALO','saidaIntervalo'],['ENTRADA_INTERVALO','entradaIntervalo']]:[]),['SAIDA','saida']]){
   if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(d[campo]||''))fail('invalid-argument','Preencha os horários completos conforme a jornada.');
   dia={...dia,...aplicarAcao(dia,tipo,d[campo],f,semana)};
  }
 }catch(e){if(e instanceof HttpsError)throw e;fail('invalid-argument',e.message);}
 if(d.tipo==='saida_mais_cedo')dia.saldoMin=0;
 return dia;
}
async function operarAjuste(tx,c,d,uid){
 if(c.p.role!=='admin')fail('permission-denied','Somente administradores podem corrigir o ponto.');
 if(typeof d.funcionarioId!=='string'||!/^[-\w]{1,128}$/.test(d.funcionarioId)||!dataValida(d.dataKey))fail('invalid-argument','Selecione funcionária e data válidas.');
 const {db}=c,ref=db.doc(`dias/${d.funcionarioId}_${d.dataKey}`);
 let reciboRef,assinatura;
 if(d.acao==='ajustarDia'){
  if(!/^[a-f\d-]{36}$/i.test(d.operacaoId||'')||typeof d.revisaoDia!=='string'||typeof d.justificativa!=='string'||d.justificativa.trim().length<5||d.justificativa.length>1000)fail('invalid-argument','Informe justificativa de 5 a 1000 caracteres e confira a jornada antes de salvar.');
  assinatura=createHash('sha256').update(JSON.stringify([uid,d.funcionarioId,d.dataKey,d.tipo,d.justificativa.trim(),d.abonoMin??null,...campos.map(k=>d[k]||''),d.revisaoDia])).digest('hex');
  reciboRef=db.doc(`ajustesPonto/${uid}_${d.operacaoId}`);
  const anterior=(await tx.get(reciboRef)).data();
  if(anterior){if(anterior.assinatura!==assinatura)fail('already-exists','Tentativa já usada com outro conteúdo.');return anterior.resultado;}
 }
 const f=(await tx.get(db.doc('funcionarios/'+d.funcionarioId))).data();
 if(!f||f.ativo===false)fail('not-found','Funcionária não encontrada ou inativa neste grupo.');
 const snap=await tx.get(ref),dia=snap.data()||null;
 const folhaRef=db.doc(`folhasPagamento/${d.funcionarioId}_${d.dataKey.slice(0,7)}`),folha=(await tx.get(folhaRef)).data();
 const revisao=snap.exists?snap.updateTime.toMillis()+':'+snap.updateTime.nanoseconds:'ausente';
 const bloqueio=folha&&folha.status!=='em_andamento'?'Folha fechada. A correção não reabre a folha automaticamente.':'';
 if(d.acao==='detalheDia')return {dia,revisaoDia:revisao,bloqueio,semIntervalo:new Date(d.dataKey+'T12:00Z').getUTCDay()===6||f.desconsiderarIntervalo===true};
 if(bloqueio)fail('failed-precondition',bloqueio);
 if(d.revisaoDia!==revisao)fail('aborted','O ponto mudou. Reabra a jornada e confira antes de salvar.');
 const valores=calcularAjuste(d,f),agora=FieldValue.serverTimestamp();
 const resultado={ok:true,dataKey:d.dataKey,funcionarioId:d.funcionarioId,ajusteId:reciboRef.id,dia:{...valores,funcionarioId:d.funcionarioId,dataKey:d.dataKey,ajusteManual:true,ajusteTipo:d.tipo,ajusteObservacao:d.justificativa.trim()}};
 tx.set(ref,{...valores,funcionarioId:d.funcionarioId,dataKey:d.dataKey,ajusteManual:true,ajusteTipo:d.tipo,ajusteObservacao:d.justificativa.trim(),origemUltimaAlteracao:'ajuste_administrativo',atualizadoPor:uid,atualizadoEm:agora},{merge:true});
 tx.create(reciboRef,{acao:'salvar',origem:'ajuste_administrativo',funcionarioId:d.funcionarioId,dataKey:d.dataKey,ajusteTipo:d.tipo,ajusteObservacao:d.justificativa.trim(),antes:dia,depois:valores,criadoPor:uid,nomeAutor:c.p.nome||'',criadoEm:agora,assinatura,resultado});
 if(folha)tx.update(folhaRef,{pontoRevisaoPendente:true,versao:(folha.versao||0)+1});
 return resultado;
}
module.exports={operarAjuste,calcularAjuste};
