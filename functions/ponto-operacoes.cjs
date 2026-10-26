const {HttpsError} = require('firebase-functions/v2/https');
const {FieldValue} = require('firebase-admin/firestore');
const {createHash} = require('node:crypto');
const {bancoDoGrupo,grupoValido} = require('./grupos-contexto.cjs');
const {aplicarAcao, distanciaMetros, dataValida} = require('./ponto-validacao.cjs');
const falha = (code, message, details) => { throw new HttpsError(code, message, details); };
const id = v => typeof v === 'string' && /^[\w-]{1,128}$/.test(v);
function exatos(obj, campos) {
  return obj && typeof obj === 'object' && !Array.isArray(obj) &&
    Object.keys(obj).length === campos.length && campos.every(c => Object.hasOwn(obj,c));
}
function validarOperacao(d) {
  if (!exatos(d,['versao','operacaoId','uid','contexto','funcionarioId','tipo','modalidade','jornadaData','capturadoEmMs','fuso','offsetMin','amostra']) || d.versao !== 1 ||
      typeof d.operacaoId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(d.operacaoId) ||
      !id(d.uid) || !id(d.funcionarioId) || !['ENTRADA','SAIDA_INTERVALO','ENTRADA_INTERVALO','SAIDA'].includes(d.tipo) ||
      !['online','offline_pendente'].includes(d.modalidade) || !dataValida(d.jornadaData) ||
      !Number.isSafeInteger(d.capturadoEmMs) || d.capturadoEmMs < 0 || d.capturadoEmMs > 8640000000000000 ||
      typeof d.fuso !== 'string' || !d.fuso || d.fuso.length > 100 || !Number.isInteger(d.offsetMin) || Math.abs(d.offsetMin) > 840) {
    falha('invalid-argument','Contrato de ponto inválido. Atualize o aplicativo.');
  }
  const c=d.contexto, a=d.amostra;
  if (!(exatos(c,['tipo']) && c.tipo==='legado') && !(exatos(c,['tipo','id']) && c.tipo==='grupo' && id(c.id))) falha('invalid-argument','Contexto de ponto inválido.');
  if (!exatos(a,['latitude','longitude','precisaoMetros','instanteMs']) || !Number.isFinite(a.latitude) || Math.abs(a.latitude)>90 ||
      !Number.isFinite(a.longitude) || Math.abs(a.longitude)>180 ||
      a.precisaoMetros!==null && (!Number.isFinite(a.precisaoMetros) || a.precisaoMetros<0 || a.precisaoMetros>1e7) ||
      a.instanteMs!==null && (!Number.isSafeInteger(a.instanteMs) || a.instanteMs<0 || a.instanteMs>8640000000000000)) falha('invalid-argument','Amostra de localização inválida.');
  // Ordem explícita e objetos reconstruídos: a ordem das chaves do JSON recebido não muda o hash.
  return {versao:1,operacaoId:d.operacaoId,uid:d.uid,contexto:c.tipo==='grupo'?{tipo:'grupo',id:c.id}:{tipo:'legado'},funcionarioId:d.funcionarioId,
    tipo:d.tipo,modalidade:d.modalidade,jornadaData:d.jornadaData,capturadoEmMs:d.capturadoEmMs,fuso:d.fuso,offsetMin:d.offsetMin,
    amostra:{latitude:a.latitude,longitude:a.longitude,precisaoMetros:a.precisaoMetros,instanteMs:a.instanteMs}};
}
function partesOperacionais(ms) {
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Fortaleza',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(ms)).map(p=>[p.type,p.value]));
  return {dataKey:`${p.year}-${p.month}-${p.day}`,hora:`${p.hour}:${p.minute}`};
}
async function registrarOperacao(raiz,request,agoraMs=Date.now()) {
  if (!request.auth?.uid) falha('unauthenticated','Entre novamente para reconciliar o ponto.');
  const p=validarOperacao(request.data), uid=request.auth.uid;
  if (p.uid!==uid) falha('permission-denied','Esta operação pertence a outra conta.');
  const hash=createHash('sha256').update(JSON.stringify(p)).digest('hex'), chave=`${uid}_${p.operacaoId}`;
  return raiz.runTransaction(async tx=>{
    // Resolve e valida uma vez, dentro da mesma transação, inclusive durante replay.
    const vinculo=(await tx.get(raiz.doc('vinculosUsuarios/'+uid))).data();
    if(vinculo&&(!grupoValido(vinculo.grupoId)||vinculo.ativo!==true))falha('permission-denied','Vínculo sem acesso.');
    const grupo=vinculo?.grupoId||null,db=grupo?bancoDoGrupo(raiz,grupo):raiz;
    if ((grupo && (p.contexto.tipo!=='grupo'||p.contexto.id!==grupo)) || (!grupo && p.contexto.tipo!=='legado')) falha('permission-denied','O vínculo de grupo mudou. A operação foi preservada para orientação administrativa.');
    const reciboRef=db.collection('pontoOperacoes').doc(chave),registroRef=db.collection('registros').doc(chave);
    if (grupo) {
      const g=(await tx.get(raiz.doc('grupos/'+grupo))).data();
      if(vinculo?.grupoId!==grupo||vinculo.ativo!==true||g?.ativo!==true) falha('permission-denied','O contexto de acesso mudou. Entre novamente.');
    } else if (vinculo || (await tx.get(raiz.doc('migracoesGrupos/legado'))).data()?.bloqueada) falha('permission-denied','O contexto legado mudou. Entre novamente.');
    const perfil=(await tx.get(db.collection('users').doc(uid))).data();
    if (!perfil||perfil.ativo===false||perfil.role!=='funcionario'||perfil.funcionarioId!==p.funcionarioId) falha('permission-denied','Conta inativa ou sem autorização para registrar este funcionário.');
    const anterior=(await tx.get(reciboRef)).data();
    if(anterior) {
      if(anterior.uid!==uid||anterior.hash!==hash) falha('already-exists','Conflito: o ID desta operação já possui outro conteúdo. Não crie uma substituição automática.');
      return anterior.resultado;
    }
    const timestamp=FieldValue.serverTimestamp();
    const gravarRecibo=resultado=>{tx.create(reciboRef,{uid,contexto:p.contexto,hash,resultado,criadoEm:timestamp});return resultado;};
    // A recusa também precisa de commit: lançar erro após uma leitura vazia não
    // serializaria contra outra chamada que acabasse de confirmar o mesmo ID.
    const recusar=(mensagem,motivo='CONDICAO')=>gravarRecibo({operacaoId:p.operacaoId,status:motivo==='JORNADA_PENDENTE'?'conflito':'rejeitada',motivo,mensagem,jornadaData:p.jornadaData,recebidoEmMs:agoraMs});
    const funcionario=(await tx.get(db.collection('funcionarios').doc(p.funcionarioId))).data();
    if(!funcionario||funcionario.ativo===false)return recusar('Funcionário inativo ou inexistente.');
    const diariaRef=db.collection('pontoPendencias').doc(`${p.funcionarioId}_${p.jornadaData}`);
    const diaria=(await tx.get(diariaRef)).data();
    const atual=diaria?.pendenciaAtivaId?(await tx.get(db.collection('pontoPendencias').doc(diaria.pendenciaAtivaId))).data():diaria;
    if(diaria&&!['aprovada','rejeitada'].includes(atual?.status))return recusar('Esta jornada já possui uma pendência de captura. Solicite orientação administrativa. Jornadas futuras continuam disponíveis.','JORNADA_PENDENTE');
    // O primeiro documento diário também indexa a captura ativa, sem duplicar seu payload.
    // Capturas posteriores têm identidade própria; nenhuma captura/decisão anterior é apagada.
    const pendenciaRef=diaria?db.collection('pontoPendencias').doc(chave):diariaRef;
    const tempo=partesOperacionais(agoraMs);
    let resultado;
    if(p.modalidade==='offline_pendente') {
      resultado={operacaoId:p.operacaoId,status:'recebida',jornadaData:p.jornadaData,recebidoEmMs:agoraMs};
      tx.create(pendenciaRef,{uid,funcionarioId:p.funcionarioId,contexto:p.contexto,payload:p,status:'aguardando_analise',recebidoEm:timestamp,localizacaoValidada:false});
      if(diaria)tx.update(diariaRef,{pendenciaAtivaId:pendenciaRef.id});
    } else {
      if(p.jornadaData!==tempo.dataKey||partesOperacionais(p.capturadoEmMs).dataKey!==p.jornadaData)return recusar('A data da tentativa não corresponde ao dia atual. Turnos atravessando meia-noite não são suportados. Solicite orientação administrativa.');
      let localId=null,distancia=null;
      for(const local of Array.isArray(funcionario.locaisPermitidos)?funcionario.locaisPermitidos:[]) {
        if(!id(local))continue;
        const l=(await tx.get(db.collection('locais').doc(local))).data();
        if(!l?.ativo||!Number.isFinite(l.localizacao?.latitude)||!Number.isFinite(l.localizacao?.longitude)||!Number.isFinite(Number(l.raioMetros))||Number(l.raioMetros)<=0)continue;
        const metros=distanciaMetros(p.amostra.latitude,p.amostra.longitude,l.localizacao.latitude,l.localizacao.longitude);
        if(metros<=Number(l.raioMetros)){localId=local;distancia=Math.round(metros);break;}
      }
      if(!localId)return recusar('Você está fora do local autorizado.');
      const diaRef=db.collection('dias').doc(`${p.funcionarioId}_${tempo.dataKey}`),dia=(await tx.get(diaRef)).data();
      let alteracoes;try{alteracoes=aplicarAcao(dia,p.tipo,tempo.hora,funcionario,new Date(tempo.dataKey+'T12:00Z').getUTCDay());}
      catch(e){return recusar(e.message);}
      resultado={operacaoId:p.operacaoId,status:'confirmado',dataKey:tempo.dataKey,hora:tempo.hora,recebidoEmMs:agoraMs};
      tx.set(diaRef,{...alteracoes,funcionarioId:p.funcionarioId,dataKey:tempo.dataKey,atualizadoEm:timestamp},{merge:true});
      tx.create(registroRef,{funcionarioId:p.funcionarioId,funcionarioNome:funcionario.nome||'',tipo:p.tipo,dataKey:tempo.dataKey,hora:tempo.hora,timestamp,
        latitude:p.amostra.latitude,longitude:p.amostra.longitude,localId,distanciaMetros:distancia,registradoPor:uid,operacaoId:p.operacaoId,declarado:p});
    }
    return gravarRecibo(resultado);
  });
}
module.exports={validarOperacao,registrarOperacao,partesOperacionais};
