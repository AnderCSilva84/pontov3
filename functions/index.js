/* eslint-disable */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { bancoDoUsuario } = require("./grupos-contexto.cjs");
const { FieldValue } = require("firebase-admin/firestore");


admin.initializeApp();
Object.assign(exports, require('./compras.cjs'));
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
    try { alteracoes = aplicarAcao(dia, tipo, hora, funcionario, diaSemana); }
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
    if (snap.data().tipo === 'transporte') {
      const folhas = await transaction.get(db.collection('folhasPagamento').where('funcionarioId', '==', snap.data().funcionarioId));
      if (folhas.docs.some(d => d.data().status !== 'em_andamento' && d.data().transportes?.some(i => i.id === id))) throw new HttpsError('failed-precondition', 'Este transporte integra uma folha fechada e não pode ser apagado.');
    }
    transaction.set(db.collection("financeiroAuditoria").doc(), {
      acao: "exclusao", lancamentoId: id, dados: snap.data(),
      executadoPor: request.auth.uid, executadoEm: FieldValue.serverTimestamp(),
    });
    transaction.delete(ref);
  });
  return { ok: true };
});

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
  const userSnap = await userRef.get();
  if (!userSnap.exists) throw new HttpsError("not-found", "Usuário não encontrado.");
  if (db.grupoId && (await admin.firestore().doc('grupos/' + db.grupoId).get()).data()?.titularUid === uid) throw new HttpsError('permission-denied', 'O acesso do titular não pode ser excluído por um administrador.');
  const dados = userSnap.data() || {};
  const funcionarioId = String(dados.funcionarioId || "");

  await admin.auth().deleteUser(uid).catch((error) => {
    if (error?.code !== "auth/user-not-found") throw error;
  });

  const batch = db.batch();
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
exports.criarMembroGrupo = onCall(request => require('./grupos.cjs').criarMembro(admin.firestore(), admin.auth(), request));
