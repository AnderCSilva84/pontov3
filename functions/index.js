/* eslint-disable */

const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();

const TELEGRAM_TOKEN = "8763177574:AAG_xCp_If9nkCp1NG5yhLRIzSDB9vAho8c";
const CHAT_ID = "-5247258578";

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
