
// Opt-in de homologação local: desvia antes de inicializações e gatilhos normais.
if (process.env.AP1303_QR_LOCAL === 'true') {
  module.exports = require('./qr-local.cjs');
  return;
}

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { bancoDoUsuario } = require("./grupos-contexto.cjs");
const { FieldValue } = require("firebase-admin/firestore");


admin.initializeApp();
exports.demonstracaoOperacao=onCall({timeoutSeconds:30,minInstances:0,maxInstances:2},request=>require('./demonstracao.cjs').operarDemonstracao(admin.firestore(),request));
exports.contaOperacao = onCall({timeoutSeconds:120,minInstances:0,maxInstances:2},request=>require('./conta.cjs').operarConta(admin.firestore(),admin.auth(),request));
exports.processarExclusaoConta = require('firebase-functions/v2/firestore').onDocumentCreated({document:'contaExecucoes/{execucao}',timeoutSeconds:120,maxInstances:2,retry:false},async evento=>{
 const dados=evento.data?.data();if(!dados?.uid||evento.params.execucao!==`${dados.uid}_${dados.rodada}`)return;
 try{return await require('./conta-exclusao.cjs').processarExclusao(admin.firestore(),admin.auth(),dados.uid);}
 finally{await evento.data.ref.delete();}
});
exports.registrarOperacaoPonto = onCall({ timeoutSeconds: 30, minInstances: 0, maxInstances: 2 }, request => require('./ponto-operacoes.cjs').registrarOperacao(admin.firestore(), request));
exports.revisarPendenciaPonto = onCall({ timeoutSeconds: 30, minInstances: 0, maxInstances: 2 }, request => require('./ponto-revisao.cjs').operarRevisao(admin.firestore(), request));
exports.ajustarJornadaPonto = onCall({ timeoutSeconds:30,minInstances:0,maxInstances:2 },request=>{
  if(!['detalheDia','ajustarDia'].includes(request.data?.acao))throw new HttpsError('invalid-argument','Ação de correção inválida.');
  return require('./ponto-revisao.cjs').operarRevisao(admin.firestore(),request);
});
Object.assign(exports, require('./compras.cjs'));
exports.centralPrecos=onCall({timeoutSeconds:120,minInstances:0,maxInstances:4},request=>require('./central-precos.cjs').operarCentral(admin.firestore(),request));
// Eventos específicos: não há listener global de coleções nem agendamento novo.
for(const colecao of ['comprasPrecos','comprasListas','catalogoCompras','supermercados','centralVinculos','centralLocais','comprasAssociacoesOperacoes']){
 for(const agrupado of [true,false]){
  const nome='centralEvento'+colecao+(agrupado?'Grupo':'Legado');
  exports[nome]=require('firebase-functions/v2/firestore').onDocumentWritten({document:(agrupado?'grupos/{grupoId}/':'')+colecao+'/{id}',region:'southamerica-east1',timeoutSeconds:120,maxInstances:2,retry:false},async e=>{
   try{return await require('./central-precos.cjs').eventoOrigem(admin.firestore(),e.params.grupoId||null,colecao,e.params.id,e.data?.before.data(),e.data?.after.data(),e.id);}
   catch(error){
    // Falha persistida, sem payload privado nos logs; recuperação explícita.
    const db=e.params.grupoId?require('./grupos-contexto.cjs').bancoDoGrupo(admin.firestore(),e.params.grupoId):admin.firestore();
    await require('./central-precos.cjs').criarLote(db,{tipo:colecao==='comprasPrecos'?'fonte':'reconciliar',alvo:colecao==='comprasPrecos'?{campo:'precoId',id:e.params.id}:null,evento:e.id},'evento');
    console.warn('Central: processamento pendente',error.code||'falha');
   }
  });
 }
}
exports.centralExecutarLote=require('firebase-functions/v2/firestore').onDocumentCreated({document:'centralExecucoes/{id}',region:'southamerica-east1',timeoutSeconds:120,maxInstances:2,retry:false},e=>require('./central-precos.cjs').eventoExecucao(admin.firestore(),e.data.ref));
exports.comprasApi = require('./compras-api.cjs').comprasApi;

const { aplicarAcao, distanciaMetros, dataValida } = require("./ponto-validacao.cjs");

exports.registrarPonto = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Faça login para registrar o ponto.");
  const { funcionarioId, tipo, latitude, longitude } = request.data || {};
  if (typeof funcionarioId !== "string" || !funcionarioId || funcionarioId.includes("/") || funcionarioId.length > 128 ||
      !Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) {
    throw new HttpsError("invalid-argument", "Funcionário ou localização inválida.");
  }
  const db = await bancoDoUsuario(admin.firestore(), request.auth.uid);
  // Capturado uma vez para manter a mesma data e hora em tentativas da transação.
  const agora = new Date();
  const partes = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(agora).map(({ type, value }) => [type, value]));
  const dataKey = `${partes.year}-${partes.month}-${partes.day}`;
  const hora = `${partes.hour}:${partes.minute}`;
  const diaSemana = new Date(`${dataKey}T12:00:00Z`).getUTCDay();
  const diaRef = db.collection("dias").doc(`${funcionarioId}_${dataKey}`);
  const registroRef = db.collection("registros").doc();
  await db.runTransaction(async (transaction) => {
    const userSnap = await transaction.get(db.collection("users").doc(request.auth.uid));
    const user = userSnap.data();
    if (!user || user.ativo === false || (user.role !== "funcionario" || user.funcionarioId !== funcionarioId)) {
      throw new HttpsError("permission-denied", "Acesso não autorizado para registrar este ponto.");
    }
    const funcionarioSnap = await transaction.get(db.collection("funcionarios").doc(funcionarioId));
    const funcionario = funcionarioSnap.data();
    if (!funcionario || funcionario.ativo === false) throw new HttpsError("failed-precondition", "Funcionário inativo ou inexistente.");
    let localAutorizado = null;
    let distancia = null;
    for (const localId of Array.isArray(funcionario.locaisPermitidos) ? funcionario.locaisPermitidos : []) {
      if (typeof localId !== "string" || !localId || localId.includes("/")) continue;
      const local = (await transaction.get(db.collection("locais").doc(localId))).data();
      if (!local?.ativo || !Number.isFinite(local.localizacao?.latitude) || !Number.isFinite(local.localizacao?.longitude) || !Number.isFinite(Number(local.raioMetros)) || Number(local.raioMetros) <= 0) continue;
      const calculada = distanciaMetros(latitude, longitude, local.localizacao.latitude, local.localizacao.longitude);
      if (calculada <= Number(local.raioMetros)) { localAutorizado = localId; distancia = Math.round(calculada); break; }
    }
    if (!localAutorizado) throw new HttpsError("permission-denied", "Você está fora do local autorizado.");
    const dia = (await transaction.get(diaRef)).data();
    let alteracoes;
    try { alteracoes = aplicarAcao(dia, tipo, hora, funcionario, diaSemana, dataKey); }
    catch (error) { throw new HttpsError("failed-precondition", error.message); }
    const timestamp = FieldValue.serverTimestamp();
    transaction.set(diaRef, { ...alteracoes, funcionarioId, dataKey, atualizadoEm: timestamp }, { merge: true });
    transaction.set(registroRef, { funcionarioId, funcionarioNome: funcionario.nome || "", tipo, dataKey, hora, timestamp, latitude, longitude, localId: localAutorizado, distanciaMetros: distancia, registradoPor: request.auth.uid });
  });
  return { ok: true, dataKey, hora };
});

async function exigirAdmin(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Faça login para continuar.");
  const db = await bancoDoUsuario(admin.firestore(), request.auth.uid);
  const userSnap = await db.collection("users").doc(request.auth.uid).get();
  if (!userSnap.exists || userSnap.data()?.role !== "admin" || userSnap.data()?.ativo === false) {
    throw new HttpsError("permission-denied", "Acesso restrito ao administrador.");
  }
  return db;
}

exports.salvarFolhaPagamento = onCall(async request => require('./folha-pagamento.cjs').salvarFolha(await bancoDoUsuario(admin.firestore(), request.auth?.uid), request.data || {}, request.auth?.uid || ''));

exports.criarLancamentoFinanceiro = onCall(async (request) => {
  const db = await exigirAdmin(request);
  const dados = request.data || {};
  if (dados.folhaId) return require('./folha-pagamento.cjs').pagarFolhaFechada(db, dados, request.auth.uid);
  if((dados.tipo==='vale'&&dados.descontoFolha===true)||dados.tipo==='adiantamento')return require('./adiantamentos.cjs').criarAdiantamento(db,dados,request.auth.uid);
  const tipos = { transporte: "Transporte", salario: "Salário", vale: "Vale / adiantamento", decimo_terceiro: "13º salário", ferias: "Férias", rescisao: "Rescisão" };
  if (['decimo_terceiro','ferias','rescisao'].includes(dados.tipo)) return require('./pagamentos-especiais.cjs').pagarEspecial(db, dados, request.auth.uid);
  const valor = Number(dados.valor);
  if (!Object.hasOwn(tipos, dados.tipo) || !Number.isFinite(valor) || valor <= 0) {
    throw new HttpsError("invalid-argument", "Tipo ou valor inválido.");
  }
  const descontos = Number(dados.descontos ?? 0);
  if (!Number.isFinite(descontos) || descontos < 0 || descontos > valor) {
    throw new HttpsError("invalid-argument", "Descontos inválidos.");
  }
  for (const campo of ["salarioBase", "bonus", "horasExtras", "adicionais", "horasDevidas", "descontoHoras", "faltas", "inss", "adiantamentos", "outrosDescontos", "proventos"]) {
    if (dados[campo] != null && (!Number.isFinite(Number(dados[campo])) || Number(dados[campo]) < 0)) {
      throw new HttpsError("invalid-argument", `Valor inválido: ${campo}.`);
    }
  }
  if (typeof dados.funcionarioId !== "string" || !dados.funcionarioId || dados.funcionarioId.includes("/") || dados.funcionarioId.length > 128) {
    throw new HttpsError("invalid-argument", "Funcionário inválido.");
  }
  const funcionarioSnap = await db.collection("funcionarios").doc(dados.funcionarioId).get();
  if (!funcionarioSnap.exists) throw new HttpsError("not-found", "Funcionário não encontrado.");
  if (!dataValida(dados.dataPagamento)) {
    throw new HttpsError("invalid-argument", "Data de pagamento inválida.");
  }
  if (dados.tipo === "transporte") {
    if (!dataValida(dados.periodoInicio) || !dataValida(dados.periodoFim) || dados.periodoFim < dados.periodoInicio) {
      throw new HttpsError("invalid-argument", "Período de transporte inválido.");
    }
  }
  if (typeof dados.competenciaMes !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(dados.competenciaMes)) {
    throw new HttpsError("invalid-argument", "Mês de referência inválido.");
  }
  const permitido = {
    tipo: dados.tipo, tipoLabel: tipos[dados.tipo], valor,
    descontos,
    valorLiquido: valor - descontos,
    funcionarioId: String(dados.funcionarioId || ""),
    funcionarioNome: String(funcionarioSnap.data().nome || "").trim().slice(0, 120),
    dataPagamento: dados.dataPagamento,
    competenciaMes: String(dados.competenciaMes || ""),
    periodoInicio: String(dados.periodoInicio || ""),
    periodoFim: String(dados.periodoFim || ""),
    descricao: String(dados.descricao || "").trim().slice(0, 300),
    folhaId: String(dados.folhaId || ""),
    salarioBase: Math.max(0, Number(dados.salarioBase) || 0),
    bonus: Math.max(0, Number(dados.bonus) || 0),
    horasExtras: Math.max(0, Number(dados.horasExtras) || 0),
    adicionais: Math.max(0, Number(dados.adicionais) || 0),
    horasDevidas: Math.max(0, Number(dados.horasDevidas) || 0),
    descontoHoras: Math.max(0, Number(dados.descontoHoras) || 0),
    faltas: Math.max(0, Number(dados.faltas) || 0),
    inss: Math.max(0, Number(dados.inss) || 0),
    adiantamentos: Math.max(0, Number(dados.adiantamentos) || 0),
    outrosDescontos: Math.max(0, Number(dados.outrosDescontos) || 0),
    proventos: Math.max(0, Number(dados.proventos) || valor),
    observacao: String(dados.observacao || "").trim().slice(0, 300),
    criadoPor: request.auth.uid,
    criadoEm: FieldValue.serverTimestamp(),
  };
  const ref = await db.collection("financeiro").add(permitido);
  return { id: ref.id };
});

exports.excluirLancamentoFinanceiro = onCall(async (request) => {
  const db = await exigirAdmin(request);
  const id = String(request.data?.id || "");
  if (!/^[A-Za-z0-9_-]{10,}$/.test(id)) throw new HttpsError("invalid-argument", "Lançamento inválido.");
  const ref = db.collection("financeiro").doc(id);
  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "Lançamento não encontrado.");
    const concluirParcelamento=snap.data().parcelamento?.versao===1?await require('./adiantamentos.cjs').protegerExclusao(transaction,db,snap.data(),id):null;
    if (snap.data().tipo === 'transporte') {
      const folhas = await transaction.get(db.collection('folhasPagamento').where('funcionarioId', '==', snap.data().funcionarioId));
      if (folhas.docs.some(d => d.data().status !== 'em_andamento' && d.data().transportes?.some(i => i.id === id))) throw new HttpsError('failed-precondition', 'Este transporte integra uma folha fechada e não pode ser apagado.');
    }
    concluirParcelamento?.();
    transaction.set(db.collection("financeiroAuditoria").doc(), {
      acao: "exclusao", lancamentoId: id, dados: snap.data(),
      executadoPor: request.auth.uid, executadoEm: FieldValue.serverTimestamp(),
    });
    transaction.delete(ref);
  });
  return { ok: true };
});

exports.cancelarParcelasAdiantamento=onCall({timeoutSeconds:60,minInstances:0,maxInstances:2},async request=>require('./adiantamentos.cjs').cancelarParcelas(await bancoDoUsuario(admin.firestore(),request.auth?.uid),request.data||{},request.auth?.uid));

exports.excluirUsuario = onCall(async (request) => {
  const db = await exigirAdmin(request);
  const uid = String(request.data?.uid || "");
  if (!/^[A-Za-z0-9_-]{10,128}$/.test(uid)) {
    throw new HttpsError("invalid-argument", "Usuário inválido.");
  }
  if (uid === request.auth.uid) {
    throw new HttpsError("failed-precondition", "Você não pode excluir seu próprio acesso.");
  }

  const userRef = db.collection("users").doc(uid);
  // A exclusão administrativa existente também participa da barreira de transferência.
  // Desativar antes do Auth impede transferir a titularidade para um destino em remoção.
  const userSnap = await db.runTransaction(async tx=>{
    const [alvo,ator]=await tx.getAll(userRef,db.collection('users').doc(request.auth.uid));
    const grupo=db.grupoId?await tx.get(admin.firestore().doc('grupos/'+db.grupoId)):null;
    if(ator.data()?.role!=='admin'||ator.data()?.ativo===false||grupo&&grupo.data()?.ativo!==true)throw new HttpsError('permission-denied','Administração indisponível.');
    if(!alvo.exists)throw new HttpsError('not-found','Usuário não encontrado.');
    if(grupo?.data()?.titularUid===uid)throw new HttpsError('permission-denied','O acesso do titular não pode ser excluído por um administrador.');
    const fidFoto=['funcionario','funcionaria'].includes(alvo.data().role)?alvo.data().funcionarioId:null;
    const fFoto=typeof fidFoto==='string'&&/^[\w-]{1,128}$/.test(fidFoto)?await tx.get(db.doc('funcionarios/'+fidFoto)):null;
    if(fFoto?.exists&&fFoto.data().fotoPerfilUid===uid)tx.update(fFoto.ref,{fotoPerfilUid:FieldValue.delete(),temFotoPerfil:FieldValue.delete(),fotoPerfilVersao:FieldValue.delete()});
    tx.update(userRef,{ativo:false});if(grupo)tx.update(grupo.ref,{revisaoConta:FieldValue.increment(1)});
    return alvo;
  });
  const dados = userSnap.data() || {};
  const funcionarioId = String(dados.funcionarioId || "");

  await admin.auth().deleteUser(uid).catch((error) => {
    if (error?.code !== "auth/user-not-found") throw error;
  });

  const batch = db.batch();
  batch.delete(db.doc('fotosPerfis/'+uid));
  batch.delete(userRef);
  if (db.grupoId) batch.delete(admin.firestore().doc('vinculosUsuarios/' + uid));
  if (funcionarioId) {
    batch.set(db.collection("funcionarios").doc(funcionarioId), {
      ativo: false,
      acessoExcluidoEm: FieldValue.serverTimestamp(),
      acessoExcluidoPor: request.auth.uid,
    }, { merge: true });
  }
  batch.set(db.collection("usuariosAuditoria").doc(), {
    acao: "exclusao",
    usuarioId: uid,
    role: dados.role || null,
    funcionarioId: funcionarioId || null,
    executadoPor: request.auth.uid,
    executadoEm: FieldValue.serverTimestamp(),
  });
  await batch.commit();
  return { ok: true };
});

Object.assign(exports, require("./push.cjs").criarPush({ admin }));
Object.assign(exports, require("./push.cjs").criarPushGrupos({ admin }));
Object.assign(exports, require('./lembretes.cjs').criarLembretes({ admin, enviar: (...args) => require('./push.cjs').enviarPush(admin, ...args) }));
Object.assign(exports, require('./compras-estimativa.cjs').criarEstimativaCompras({ admin }));

exports.criarGrupo = onCall(request => require('./grupos.cjs').criarGrupo(admin.firestore(), request));
exports.noBolsoConsulta = onCall({timeoutSeconds:60,maxInstances:2}, request => require('./no-bolso-consulta.cjs').consultarNoBolso(admin.firestore(), request));
exports.criarMembroGrupo = onCall(request => require('./grupos.cjs').criarMembro(admin.firestore(), admin.auth(), request));

exports.acaoNotificacaoTarefa = onCall(request => require('./push-acoes.cjs').acaoTarefa(admin.firestore(), request));

exports.acaoNotificacaoLembrete = onCall(async request => {
 const destino=await require('./grupos-contexto.cjs').bancoDoUsuario(admin.firestore(),request.auth?.uid);
 if((request.data?.grupoId||'')!==(destino.grupoId||''))throw new HttpsError('permission-denied','O grupo mudou.');
 if(!['consultarOcorrencia','concluir'].includes(request.data?.operacao))throw new HttpsError('invalid-argument','Ação inválida.');
 return require('./lembretes.cjs').operarLembretes(destino,request);
});

// Arquivos privados: autenticação e grupo no servidor, payload limitado e concorrência contida.
exports.lembretesAnexos=onCall({region:'us-central1',timeoutSeconds:120,memory:'512MiB',concurrency:4,maxInstances:2,minInstances:0},async request=>{
 const uid=request.auth?.uid,destino=await bancoDoUsuario(admin.firestore(),uid);
 const projeto=admin.app().options.projectId||process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT;
 let bucket;
 if(projeto==='ponto-app-1c55a'&&!process.env.FUNCTIONS_EMULATOR)bucket=require('firebase-admin/storage').getStorage().bucket(require('./lembretes-anexos.cjs').BUCKET);
 else if(projeto?.startsWith('demo-')&&process.env.FIREBASE_STORAGE_EMULATOR_HOST)bucket=require('firebase-admin/storage').getStorage().bucket(projeto+'-lembretes-anexos');
 return require('./lembretes-anexos.cjs').operarAnexos(destino,request,{bucket,validarContexto:async()=>{const atual=await bancoDoUsuario(admin.firestore(),uid);if((atual.grupoId||'')!==(destino.grupoId||''))throw new HttpsError('permission-denied','O grupo mudou durante a operação.');}});
});
