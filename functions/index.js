/* eslint-disable */

const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();

const TELEGRAM_TOKEN = "8763177574:AAG_xCp_If9nkCp1NG5yhLRIzSDB9vAho8c";
const CHAT_ID = "-5247258578";

async function exigirAdmin(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Faça login para continuar.");
  const userSnap = await admin.firestore().collection("users").doc(request.auth.uid).get();
  if (!userSnap.exists || userSnap.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Acesso restrito ao administrador.");
  }
}

exports.criarLancamentoFinanceiro = onCall(async (request) => {
  await exigirAdmin(request);
  const dados = request.data || {};
  const tipos = { transporte: "Transporte", salario: "Salário", vale: "Vale / adiantamento" };
  const valor = Number(dados.valor);
  if (!tipos[dados.tipo] || !Number.isFinite(valor) || valor <= 0) {
    throw new HttpsError("invalid-argument", "Tipo ou valor inválido.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dados.dataPagamento || "")) {
    throw new HttpsError("invalid-argument", "Data de pagamento inválida.");
  }
  if (dados.tipo === "transporte") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dados.periodoInicio || "") || !/^\d{4}-\d{2}-\d{2}$/.test(dados.periodoFim || "") || dados.periodoFim < dados.periodoInicio) {
      throw new HttpsError("invalid-argument", "Período de transporte inválido.");
    }
  } else if (!/^\d{4}-\d{2}$/.test(dados.competenciaMes || "")) {
    throw new HttpsError("invalid-argument", "Mês de referência inválido.");
  }
  const permitido = {
    tipo: dados.tipo, tipoLabel: tipos[dados.tipo], valor,
    descontos: Math.max(0, Number(dados.descontos) || 0),
    valorLiquido: Math.max(0, valor - (Number(dados.descontos) || 0)),
    funcionarioId: String(dados.funcionarioId || ""),
    funcionarioNome: String(dados.funcionarioNome || "").trim().slice(0, 120),
    dataPagamento: dados.dataPagamento,
    competenciaMes: String(dados.competenciaMes || ""),
    periodoInicio: String(dados.periodoInicio || ""),
    periodoFim: String(dados.periodoFim || ""),
    descricao: String(dados.descricao || "").trim().slice(0, 300),
    criadoPor: request.auth.uid,
    criadoEm: admin.firestore.FieldValue.serverTimestamp(),
  };
  const ref = await admin.firestore().collection("financeiro").add(permitido);
  return { id: ref.id };
});

exports.excluirLancamentoFinanceiro = onCall(async (request) => {
  await exigirAdmin(request);
  const id = String(request.data?.id || "");
  if (!/^[A-Za-z0-9_-]{10,}$/.test(id)) throw new HttpsError("invalid-argument", "Lançamento inválido.");
  const ref = admin.firestore().collection("financeiro").doc(id);
  await admin.firestore().runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "Lançamento não encontrado.");
    transaction.set(admin.firestore().collection("financeiroAuditoria").doc(), {
      acao: "exclusao", lancamentoId: id, dados: snap.data(),
      executadoPor: request.auth.uid, executadoEm: admin.firestore.FieldValue.serverTimestamp(),
    });
    transaction.delete(ref);
  });
  return { ok: true };
});

async function enviarPushParaTodos(titulo, mensagem) {
  const usersSnapshot = await admin.firestore().collection("users").get();
  const tokens = [];

  usersSnapshot.forEach((doc) => {
    const data = doc.data();

    if (data.fcmToken) {
      tokens.push(data.fcmToken);
    }
  });

  if (!tokens.length) return;

  await admin.messaging().sendEachForMulticast({
    tokens: tokens,
    notification: {
      title: titulo,
      body: mensagem,
    },
    webpush: {
      notification: {
        icon: "/icon-192.png",
      },
    },
  });
}

exports.alertaListaCompras = onDocumentWritten(
  "listaCompras/{itemId}",
  async (event) => {
    const after = event.data?.after?.data();
    if (!after) return;

    if (!after.solicitado) return;

    const stateRef = admin.firestore().collection("botState").doc("listaCompras");
    const stateSnap = await stateRef.get();
    const state = stateSnap.data() || {};

    if (state.alertaPendente) {
      return;
    }

    await stateRef.set(
      {
        alertaPendente: true,
        ultimaAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

    await axios.post(url, {
      chat_id: CHAT_ID,
      text: "🛒 A lista de compras foi atualizada.\nClique abaixo para ver a lista.",
      reply_markup: {
        inline_keyboard: [[{ text: "🛒 Ver lista de compras", callback_data: "LISTA_COMPRAS" }]],
      },
    });

    await enviarPushParaTodos("Lista de compras", "A lista de compras foi atualizada");

    await stateRef.set(
      {
        alertaPendente: false,
      },
      { merge: true }
    );
  }
);

exports.telegramWebhook = onRequest(async (req, res) => {
  const update = req.body;
  const callback = update?.callback_query;

  if (!callback) {
    res.status(200).send("OK");
    return;
  }

  const chatId = callback.message.chat.id;
  const data = callback.data;

  if (data === "LISTA_COMPRAS") {
    const snapshot = await admin
      .firestore()
      .collection("listaCompras")
      .where("comprado", "==", false)
      .get();

    const keyboard = [];
    const texto = [];

    snapshot.forEach((doc) => {
      const item = doc.data();
      if (item?.solicitado === false) return;

      texto.push(`• ${item.nome}`);

      keyboard.push([
        {
          text: `✔️ ${item.nome}`,
          callback_data: `COMPRADO_${doc.id}`,
        },
      ]);
    });

    const mensagem = texto.length
      ? `🛒 Lista de compras\n\n${texto.join("\n")}`
      : "✅ Lista de compras vazia";

    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`,
      {
        chat_id: chatId,
        message_id: callback.message.message_id,
        text: mensagem,
        reply_markup: texto.length ? { inline_keyboard: keyboard } : undefined,
      }
    );
  }

  if (data.startsWith("COMPRADO_")) {
    const itemId = data.replace("COMPRADO_", "");

    await admin
      .firestore()
      .collection("listaCompras")
      .doc(itemId)
      .update({
        comprado: true,
        solicitado: false,
      });

    const snapshot = await admin
      .firestore()
      .collection("listaCompras")
      .where("comprado", "==", false)
      .get();

    const keyboard = [];
    const texto = [];

    snapshot.forEach((doc) => {
      const item = doc.data() || {};
      if (item.solicitado === false) return;

      texto.push(`• ${item.nome || doc.id}`);

      keyboard.push([
        {
          text: `✔️ ${item.nome || doc.id}`,
          callback_data: `COMPRADO_${doc.id}`,
        },
      ]);
    });

    const mensagem = texto.length
      ? `🛒 Lista de compras\n\n${texto.join("\n")}`
      : "✅ Lista de compras vazia";

    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`,
      {
        chat_id: chatId,
        message_id: callback.message.message_id,
        text: mensagem,
        reply_markup: texto.length ? { inline_keyboard: keyboard } : undefined,
      }
    );
  }

  res.status(200).send("OK");
});
