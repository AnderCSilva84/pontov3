const { bancoDoUsuario, bancoDoGrupo } = require('./grupos-contexto.cjs');
const { createHash } = require('node:crypto');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentWritten } = require('firebase-functions/v2/firestore');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');

const chave = (value) => createHash('sha256').update(value).digest('hex');
function deveNotificar(before, after) {
  return Boolean(after?.solicitado && !after.comprado && (!before?.solicitado || before.comprado));
}
function criarPush({ admin, somenteEnvio = false, db = admin.firestore(), somenteHandlers = false }) {
  const timestamp = () => FieldValue.serverTimestamp();
  if (somenteEnvio) return enviar;
  async function usuario(request, destino = db) {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Entre no app para configurar os avisos.');
    const data = (await destino.collection('users').doc(request.auth.uid).get()).data();
    if (!data || data.ativo === false) throw new HttpsError('permission-denied', 'Usuário sem acesso.');
    return request.auth.uid;
  }
  function token(request) {
    const value = request.data?.token;
    if (typeof value !== 'string' || value.length < 20 || value.length > 4096 || /\s/.test(value)) throw new HttpsError('invalid-argument', 'Dispositivo inválido.');
    return value;
  }
  const registrarDispositivoPush = onCall(async (request) => {
    const destino = await bancoDoUsuario(db, request.auth?.uid);
    const uid = await usuario(request, destino);
    if (request.data?.uid !== uid) throw new HttpsError('permission-denied', 'Sessão alterada durante a ativação.');
    const value = token(request);
    await destino.collection('pushDispositivos').doc(chave(value)).set({ uid, token: value, atualizadoEm: timestamp() });
    return { ok: true };
  });
  const removerDispositivoPush = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Entre no app.');
    const destino = await bancoDoUsuario(db, request.auth.uid);
    const ref = destino.collection('pushDispositivos').doc(chave(token(request)));
    await destino.runTransaction(async (tx) => {
      if ((await tx.get(ref)).data()?.uid === request.auth.uid) tx.delete(ref);
    });
    return { ok: true };
  });

  async function enviar(titulo, mensagem, url, eventoId, apenasUid, apenasAdmins = false, opcoes = {}) {
    const [devices, users] = await Promise.all([
      apenasUid ? db.collection('pushDispositivos').where('uid', '==', apenasUid).get() : db.collection('pushDispositivos').get(),
      db.collection('users').get(),
    ]);
    const ativos = new Set(users.docs.filter((doc) => doc.data().ativo !== false && (!apenasAdmins || doc.data().role === 'admin')).map((doc) => doc.id));
    const elegiveis = devices.docs.filter((doc) => ativos.has(doc.data().uid));
    let enviados = 0;
    let falhas = false;
    // Cada mensagem inclui seu proprietário: o celular descarta dados de outra sessão.
    for (let i = 0; i < elegiveis.length; i += 500) {
      const lote = elegiveis.slice(i, i + 500);
      const pendentes = [];
      const recibos = lote.map((device) => db.collection('pushEnvios').doc(chave(`${eventoId}:${device.id}:${device.data().uid}`)));
      const snapshots = await db.getAll(...recibos);
      lote.forEach((device, index) => { if (!snapshots[index].exists) pendentes.push({ device, recibo: recibos[index] }); else if (opcoes.contarConfirmados) enviados++; });
      if (!pendentes.length) continue;
      const response = await admin.messaging().sendEach(pendentes.map(({ device }) => ({
        token: device.data().token,
        data: { title: String(titulo).slice(0, 100), body: String(mensagem).slice(0, 300), url, tag: chave(eventoId), uid: device.data().uid },
        webpush: { headers: { TTL: String(Number.isInteger(opcoes.ttl) && opcoes.ttl >= 0 && opcoes.ttl <= 86400 ? opcoes.ttl : 86400), Urgency: opcoes.urgency === 'high' ? 'high' : 'normal' } },
      })));
      const batch = db.batch();
      const invalidos = [];
      response.responses.forEach((result, index) => {
        const { device, recibo } = pendentes[index];
        if (result.success) {
          enviados++;
          batch.set(recibo, { enviadoEm: timestamp(), expiresAt: Timestamp.fromMillis(Date.now() + 30 * 86400000) });
        } else if (['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(result.error?.code)) {
          invalidos.push(device);
        } else { falhas = true; }
      });
      await batch.commit();
      await Promise.all(invalidos.map((device) => db.runTransaction(async (tx) => {
        // Não remove a nova assinatura se o celular trocou de usuário durante o envio.
        if ((await tx.get(device.ref)).data()?.uid === device.data().uid) tx.delete(device.ref);
      })));
    }
    if (falhas) throw new Error('Algumas notificações push falharam; nova tentativa necessária.');
    return enviados;
  }

  async function redirecionarEvento(nome, evento) {
    if (db.grupoId) return false;
    const migracao=(await db.doc('migracoesGrupos/legado').get()).data();
    if (migracao?.bloqueada) throw new Error('Migração em andamento; tentar novamente.');
    if (!migracao?.concluida) return false;
    const destino=bancoDoGrupo(db,migracao.grupoId);
    if ((await db.doc('grupos/'+migracao.grupoId).get()).data()?.ativo!==true) return true;
    await criarPush({admin,db:destino,somenteHandlers:true})[nome](evento);return true;
  }

  async function executarEvento(id, operacao) {
    const ref = db.collection('pushEventos').doc(chave(id));
    const lease = chave(`${id}:${Date.now()}:${Math.random()}`);
    const executar = await db.runTransaction(async (tx) => {
      const atual = (await tx.get(ref)).data();
      if (atual?.concluido) return false;
      if (atual?.leaseAteMs > Date.now()) throw new Error('Notificação em processamento; tentar novamente.');
      tx.set(ref, { lease, leaseAteMs: Date.now() + 330000, expiresAt: Timestamp.fromMillis(Date.now() + 30 * 86400000) }, { merge: true });
      return true;
    });
    if (!executar) return;
    try {
      await operacao();
      await ref.set({ concluido: true, leaseAteMs: 0 }, { merge: true });
    } catch (error) {
      await db.runTransaction(async (tx) => {
        if ((await tx.get(ref)).data()?.lease === lease) tx.update(ref, { leaseAteMs: 0 });
      });
      throw error;
    }
  }
  const tratar_alertaListaCompras = async (event) => {
    if (await redirecionarEvento('alertaListaCompras',event)) return;
    if (!deveNotificar(event.data?.before?.data(), event.data?.after?.data())) return;
    if (event.time && Date.now() - Date.parse(event.time) >= 86400000) return;
    await executarEvento(event.id, () => enviar('Lista de compras', 'A lista de compras foi atualizada.', '/lista-compras', event.id));
  };
  const alertaListaCompras = onDocumentWritten({ document: 'listaCompras/{itemId}', retry: true, timeoutSeconds: 300 }, tratar_alertaListaCompras);
  const tratar_alertaComprasItem = async (event) => {
    if (await redirecionarEvento('alertaComprasItem',event)) return;
    if (!event.data || event.params.listaId === 'legado-v1') return;
    if (event.time && Date.now() - Date.parse(event.time) >= 86400000) return;
    await executarEvento(event.id, () => enviar('Lista de compras', 'Um produto foi adicionado à lista.', `/lista-compras/listas/${event.params.listaId}`, event.id));
  };
  const alertaComprasItem = onDocumentCreated({ document: 'comprasListas/{listaId}/itens/{itemId}', region: 'southamerica-east1', retry: true, timeoutSeconds: 300 }, tratar_alertaComprasItem);
  const tratar_alertaNotificacoes = async (event) => {
    if (await redirecionarEvento('alertaNotificacoes',event)) return;
    const data = event.data?.data();
    if (!data) return;
    if (event.time && Date.now() - Date.parse(event.time) >= 86400000) return;
    await executarEvento(event.id, () => enviar(data.titulo || 'App Ponto', data.mensagem || 'Há uma atualização nas tarefas.', '/ponto', event.id));
  };
  const alertaNotificacoes = onDocumentCreated({ document: 'notificacoes/{id}', region: 'southamerica-east1', retry: true, timeoutSeconds: 300 }, tratar_alertaNotificacoes);
  const testarNotificacaoPush = onCall(async (request) => {
    const uid = await usuario(request);
    // Evita testes repetidos a cada clique, inclusive por chamadas diretas à API.
    const periodo = Math.floor(Date.now() / 30000);
    const enviados = await criarPush({ admin, db: destino, somenteEnvio: true })('App Ponto', 'Os avisos do celular estão funcionando!', '/ponto', `teste:${uid}:${periodo}`, uid);
    if (!enviados) throw new HttpsError('failed-precondition', 'Ative os avisos primeiro ou aguarde 30 segundos para repetir o teste.');
    return { enviados };
  });
  const tratar_alertaRegistroPonto = async (event) => {
    if (await redirecionarEvento('alertaRegistroPonto',event)) return;
    const registro = event.data?.data();
    if (!registro || !['ENTRADA', 'SAIDA'].includes(registro.tipo)) return;
    if (event.time && Date.now() - Date.parse(event.time) >= 86400000) return;
    const { funcionarioId, registradoPor } = registro;
    if (typeof funcionarioId !== 'string' || !funcionarioId || funcionarioId.includes('/') ||
        typeof registradoPor !== 'string' || !registradoPor || registradoPor.includes('/')) return;
    const [autorSnap, funcionarioSnap] = await Promise.all([
      db.collection('users').doc(registradoPor).get(),
      db.collection('funcionarios').doc(funcionarioId).get(),
    ]);
    const autor = autorSnap.data();
    const funcionario = funcionarioSnap.data();
    if (!autor || autor.role !== 'funcionario' || autor.ativo === false || autor.funcionarioId !== funcionarioId || !funcionario || funcionario.ativo === false) return;
    const nome = String(funcionario.nome || autor.nome || 'Funcionária').slice(0, 120);
    const acao = registro.tipo === 'ENTRADA' ? 'entrada' : 'saída';
    const hora = typeof registro.hora === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(registro.hora) ? ` às ${registro.hora}` : '';
    const data = typeof registro.dataKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(registro.dataKey) ? ` (${registro.dataKey.split('-').reverse().join('/')})` : '';
    await executarEvento(event.id, () => enviar(`Ponto: ${acao} registrada`, `${nome} registrou ${acao}${hora}${data}.`, '/admin', event.id, undefined, true));
  };
  const alertaRegistroPonto = onDocumentCreated({ document: 'registros/{id}', region: 'southamerica-east1', retry: true, timeoutSeconds: 300 }, tratar_alertaRegistroPonto);
  if (somenteHandlers) return { alertaListaCompras: tratar_alertaListaCompras, alertaComprasItem: tratar_alertaComprasItem, alertaNotificacoes: tratar_alertaNotificacoes, alertaRegistroPonto: tratar_alertaRegistroPonto };
  return { registrarDispositivoPush, removerDispositivoPush, testarNotificacaoPush, alertaListaCompras, alertaComprasItem, alertaNotificacoes, alertaRegistroPonto };
}
const enviarPush = (admin, ...args) => criarPush({ admin, somenteEnvio: true })(...args);
function criarPushGrupos({ admin }) {
  const caminhos = { alertaListaComprasGrupo: ['onDocumentWritten', 'listaCompras/{itemId}', 'alertaListaCompras'], alertaComprasItemGrupo: ['onDocumentCreated', 'comprasListas/{listaId}/itens/{itemId}', 'alertaComprasItem'], alertaNotificacoesGrupo: ['onDocumentCreated', 'notificacoes/{id}', 'alertaNotificacoes'], alertaRegistroPontoGrupo: ['onDocumentCreated', 'registros/{id}', 'alertaRegistroPonto'] };
  return Object.fromEntries(Object.entries(caminhos).map(([nome,[tipo,caminho,handler]]) => [nome, ({onDocumentWritten,onDocumentCreated})[tipo]({document:'grupos/{grupoId}/'+caminho,region:'southamerica-east1',retry:true,timeoutSeconds:300}, async evento => {
    const raiz=admin.firestore(),grupo=(await raiz.doc('grupos/'+evento.params.grupoId).get()).data();
    if(grupo?.ativo!==true)return;
    // Eventos da cópia podem ser entregues depois da ativação; não são novas ações.
    if(grupo.migradoEm && evento.time && Date.parse(evento.time)<=grupo.migradoEm.toMillis())return;
    return criarPush({admin,db:bancoDoGrupo(raiz,evento.params.grupoId),somenteHandlers:true})[handler](evento);
  })]));
}
module.exports = { criarPush, criarPushGrupos, deveNotificar, enviarPush };
