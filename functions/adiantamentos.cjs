const { exigirRecurso } = require('./assinaturas-recursos.cjs');
const {HttpsError}=require('firebase-functions/v2/https'),{FieldValue}=require('firebase-admin/firestore'),{createHash}=require('node:crypto');
const falha=(c,m)=>{throw new HttpsError(c,m);};
const id=v=>typeof v==='string'&&/^[\w-]{1,128}$/.test(v);
const controle=(db,fid)=>db.doc('adiantamentosControle/'+fid);
async function conferirAdmin(tx,db,uid){await exigirRecurso(tx,db,uid,'escritorioContabil');if(!uid)falha('unauthenticated','Entre no app.');const p=(await tx.get(db.doc('users/'+uid))).data();if(p?.role!=='admin'||p.ativo===false)falha('permission-denied','Somente administradores registram vales e parcelas.');}
async function conferirFolhas(tx,db,fid,parcelas){
 const s=await tx.getAll(...parcelas.map(p=>db.doc(`folhasPagamento/${fid}_${p.competencia}`)));
 const fechada=s.find(x=>x.exists&&x.data().status!=='em_andamento');
 if(fechada)falha('failed-precondition',`A folha de ${fechada.data().competencia} já está fechada. Escolha outra primeira competência ou cancele somente parcelas de folhas abertas.`);
}
async function criarAdiantamento(db,d,uid){
 if(!id(d.funcionarioId)||typeof d.chaveOperacao!=='string'||!/^[\w-]{16,80}$/.test(d.chaveOperacao)||!['vale','adiantamento'].includes(d.tipo)||d.descontoFolha!==true)falha('invalid-argument','Reabra o formulário e selecione a funcionária e o desconto em folha.');
 const {montarParcelas,competenciaValida}=await import('./adiantamentos-calculos.mjs');let parcelas;
 try{parcelas=montarParcelas(d.valor,d.quantidadeParcelas,d.primeiraCompetencia,d.intervaloMeses??1);}catch(e){falha('invalid-argument',e.message);}
 const quando=d.dataPagamento;
 if(typeof quando!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(quando)||!Number.isFinite(Date.parse(quando+'T12:00:00Z'))||new Date(quando+'T12:00:00Z').toISOString().slice(0,10)!==quando||!competenciaValida(d.competenciaMes)||Number(d.descontos||0)!==0||typeof d.descricao!=='string'||!d.descricao.trim()||d.descricao.length>300)falha('invalid-argument','Informe a data, o mês e o motivo. Vale parcelado não recebe outro desconto no lançamento.');
 const entrada={tipo:d.tipo,funcionarioId:d.funcionarioId,valor:Number(d.valor),dataPagamento:quando,competenciaMes:d.competenciaMes,descricao:d.descricao.trim(),quantidade:d.quantidadeParcelas,primeiraCompetencia:d.primeiraCompetencia,intervaloMeses:d.intervaloMeses??1};
 const assinatura=createHash('sha256').update(JSON.stringify(entrada)).digest('hex');
 return db.runTransaction(async tx=>{
  await conferirAdmin(tx,db,uid);
  const ref=db.doc('financeiro/adiantamento_'+createHash('sha256').update(uid+'|'+d.chaveOperacao).digest('hex')),anterior=(await tx.get(ref)).data();
  if(anterior){if(anterior.assinaturaAdiantamento!==assinatura)falha('already-exists','Este pagamento já foi salvo com outros dados. Confira os recibos antes de abrir um novo lançamento.');return {id:ref.id,jaRegistrado:true};}
  const f=(await tx.get(db.doc('funcionarios/'+d.funcionarioId))).data();if(!f||f.ativo===false)falha('not-found','Funcionária indisponível neste grupo.');
  const cr=controle(db,d.funcionarioId),c=(await tx.get(cr)).data();
  await conferirFolhas(tx,db,d.funcionarioId,parcelas);
  tx.create(ref,{tipo:d.tipo,tipoLabel:d.tipo==='vale'?'Vale':'Adiantamento de salário',funcionarioId:d.funcionarioId,funcionarioNome:f.nome||'',valor:entrada.valor,valorLiquido:entrada.valor,descontos:0,dataPagamento:quando,competenciaMes:d.competenciaMes,descricao:entrada.descricao,parcelamento:{versao:1,quantidade:entrada.quantidade,primeiraCompetencia:entrada.primeiraCompetencia,intervaloMeses:entrada.intervaloMeses,parcelas},assinaturaAdiantamento:assinatura,criadoPor:uid,criadoEm:FieldValue.serverTimestamp()});
  tx.set(cr,{versao:(c?.versao||0)+1,atualizadaEm:FieldValue.serverTimestamp()});
  return {id:ref.id};
 });
}
async function cancelarParcelas(db,d,uid){
 if(!id(d.id)||typeof d.motivo!=='string'||d.motivo.trim().length<5||d.motivo.length>300)falha('invalid-argument','Informe o lançamento e o motivo do cancelamento.');
 const {montarParcelas,competenciaValida}=await import('./adiantamentos-calculos.mjs');if(!competenciaValida(d.aPartir))falha('invalid-argument','Selecione a primeira competência a cancelar.');
 return db.runTransaction(async tx=>{
  await conferirAdmin(tx,db,uid);const ref=db.doc('financeiro/'+d.id),r=(await tx.get(ref)).data();if(!r?.parcelamento||!['vale','adiantamento'].includes(r.tipo))falha('not-found','Parcelamento não encontrado neste grupo.');
  if(r.parcelamento.canceladoAPartir){if(r.parcelamento.canceladoAPartir===d.aPartir)return {ok:true};falha('failed-precondition','Este parcelamento já teve as parcelas futuras canceladas.');}
  const ps=montarParcelas(r.valor,r.parcelamento.quantidade,r.parcelamento.primeiraCompetencia,r.parcelamento.intervaloMeses).filter(p=>p.competencia>=d.aPartir);
  if(!ps.length)falha('invalid-argument','Não há parcelas previstas a partir desse mês.');
  const cr=controle(db,r.funcionarioId),c=(await tx.get(cr)).data();await conferirFolhas(tx,db,r.funcionarioId,ps);
  tx.update(ref,{'parcelamento.canceladoAPartir':d.aPartir,'parcelamento.canceladoPor':uid,'parcelamento.canceladoEm':FieldValue.serverTimestamp()});
  tx.create(db.collection('financeiroAuditoria').doc(),{acao:'cancelar_parcelas_futuras',lancamentoId:d.id,aPartir:d.aPartir,motivo:d.motivo.trim(),executadoPor:uid,executadoEm:FieldValue.serverTimestamp()});
  tx.set(cr,{versao:(c?.versao||0)+1,atualizadaEm:FieldValue.serverTimestamp()});return {ok:true};
 });
}
// Reutilizado pela exclusão existente. Nenhuma folha fechada pode perder a origem.
async function protegerExclusao(tx,db,r,lancamentoId){
 const {montarParcelas}=await import('./adiantamentos-calculos.mjs');
 const cr=controle(db,r.funcionarioId),c=(await tx.get(cr)).data();
 const parcelas=montarParcelas(r.valor,r.parcelamento.quantidade,r.parcelamento.primeiraCompetencia,r.parcelamento.intervaloMeses).filter(p=>!r.parcelamento.canceladoAPartir||p.competencia<r.parcelamento.canceladoAPartir);
 if(parcelas.length){const fs=await tx.getAll(...parcelas.map(p=>db.doc(`folhasPagamento/${r.funcionarioId}_${p.competencia}`)));if(fs.some(f=>f.exists&&f.data().status!=='em_andamento'&&f.data().parcelasAdiantamentos?.some(p=>p.lancamentoId===lancamentoId)))falha('failed-precondition','Este adiantamento integra uma folha fechada. Preserve o pagamento e use Cancelar parcelas futuras.');}
 return ()=>tx.set(cr,{versao:(c?.versao||0)+1,atualizadaEm:FieldValue.serverTimestamp()});
}
module.exports={criarAdiantamento,cancelarParcelas,protegerExclusao};
