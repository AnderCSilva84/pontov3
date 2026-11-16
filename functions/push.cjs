const { montarMensagem, revisaoTarefa, permiteEnvio } = require('./push-contrato.cjs');
const {registrarNativo,removerNativo}=require('./push-dispositivos.cjs');
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
    if (request.data?.transporte === 'fcm-android' && (request.data.grupoId||'') !== (destino.grupoId||'')) throw new HttpsError('permission-denied','O grupo mudou.');
    if (request.data?.transporte === 'fcm-android') return registrarNativo(db.raiz||db,destino,uid,{...request.data,token:value});
    if (request.data?.transporte && request.data.transporte !== 'webpush') throw new HttpsError('invalid-argument','Transporte inválido.');
    const ref=destino.collection('pushDispositivos').doc(chave(value));
    await destino.runTransaction(async tx=>{const exclusao=await tx.get((db.raiz||db).doc('contaSolicitacoes/'+uid));if(exclusao.data()?.etapa)throw new HttpsError('permission-denied','Exclusão de conta iniciada.');const antigo=(await tx.get(ref)).data();if(antigo&&antigo.uid!==uid)throw new HttpsError('permission-denied','Dispositivo vinculado a outra conta.');tx.set(ref,{uid,token:value,transporte:'webpush',plataforma:'web',versao:1,atualizadoEm:timestamp()});});
    return { ok: true };
  });
  const removerDispositivoPush = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Entre no app.');
    const destino = await bancoDoUsuario(db, request.auth.uid);
    if (request.data?.transporte === 'fcm-android') return removerNativo(db.raiz||db,destino,request.auth.uid,request.data);
    const ref = destino.collection('pushDispositivos').doc(chave(token(request)));
    await destino.runTransaction(async (tx) => {
      if ((await tx.get(ref)).data()?.uid === request.auth.uid) tx.delete(ref);
    });
    return { ok: true };
  });

  async function enviar(titulo, mensagem, url, eventoId, apenasUid, apenasAdmins = false, opcoes = {}) {
    if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.AP1303_QR_LOCAL === 'true') return 0;
    if (db.grupoId === 'demo_play_ap1303_v1') return 0; // Grupo de revisão nunca envia push.
    const [devices, users] = await Promise.all([
      apenasUid ? db.collection('pushDispositivos').where('uid', '==', apenasUid).limit(101).get() : db.collection('pushDispositivos').limit(5001).get(),
      apenasUid ? db.collection('users').doc(apenasUid).get().then(doc=>({docs:doc.exists?[doc]:[]})) : db.collection('users').limit(1001).get(),
    ]);
    if(devices.docs.length>5000||users.docs.length>1000||apenasUid&&devices.docs.length>100)throw new Error('Destinatários acima do limite permitido.');
    let permitidos = () => true;
    if (db.grupoId) {
      const raiz = db.raiz || admin.firestore();
      const grupo = (await raiz.doc('grupos/' + db.grupoId).get()).data();
      if (grupo?.assinaturasAtivas === true) {
        const assinatura = (await raiz.doc('assinaturasGrupos/' + db.grupoId).get()).data();
        permitidos = pessoa => require('./compartilhamento.cjs').permiteCompartilhamento(grupo, pessoa.data(), assinatura, pessoa.id);
      }
    }
    const ativos = new Set(users.docs.filter(doc => doc.data().ativo !== false && (!apenasAdmins || doc.data().role === 'admin') && permitidos(doc)).map(doc => doc.id));
    const elegiveis = devices.docs.filter((doc) => ativos.has(doc.data().uid) && permiteEnvio(doc.data(),url,opcoes.acao));
    if(opcoes.diagnostico)opcoes.diagnostico.dispositivos=elegiveis.length;
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
      const response = await admin.messaging().sendEach(pendentes.map(({device})=>montarMensagem(device.data(),{titulo,mensagem,url,eventoId,grupoId:db.grupoId||'',ttl:opcoes.ttl,urgency:opcoes.urgency,acao:opcoes.acao})));
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
        const atual=(await tx.get(device.ref)).data();
        if(atual?.uid===device.data().uid&&atual?.token===device.data().token){tx.delete(device.ref);if(atual.transporte==='fcm-android'){const raiz=db.raiz||db;tx.delete(raiz.doc('pushTokensNativos/'+chave(atual.token)));tx.delete(raiz.doc('pushInstalacoes/'+atual.instalacaoHash));}}
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
    let acao={categoria:'tarefas'};
    if(['tarefa_avulsa_criada','tarefa_fixa_criada'].includes(data.tipo)&&/^[\w-]{1,128}$/.test(data.tarefaId||'')){
      const fixa=data.tipo==='tarefa_fixa_criada';const tarefa=(await db.doc((fixa?'tarefasSemanais/':'tarefas/')+data.tarefaId).get()).data();
      const hoje=new Date(Date.now()-3*3600000).toISOString().slice(0,10);
      if(tarefa&&tarefa.ativa!==false&&!tarefa.concluida&&(!fixa?tarefa.dataAgendada===hoje:Number(tarefa.diaSemana)===new Date(hoje+'T12:00:00-03:00').getUTCDay()))acao={tipo:fixa?'tarefa_fixa':'tarefa',id:data.tarefaId,dataKey:hoje,revisao:revisaoTarefa(tarefa)};
    }
    await executarEvento(event.id, () => enviar(data.titulo || 'Tá no Ponto', data.mensagem || 'Há uma atualização nas tarefas.', '/ponto', event.id,undefined,false,{acao}));
  };
  const alertaNotificacoes = onDocumentCreated({ document: 'notificacoes/{id}', region: 'southamerica-east1', retry: true, timeoutSeconds: 300 }, tratar_alertaNotificacoes);
  const testarNotificacaoPush = onCall(async (request) => {
    const destino=await bancoDoUsuario(db,request.auth?.uid);
    const uid = await usuario(request,destino);
    // Evita testes repetidos a cada clique, inclusive por chamadas diretas à API.
    const agoraTeste=Date.now(),rate=destino.collection('pushTestes').doc(uid);
    await destino.runTransaction(async tx=>{
      const anterior=(await tx.get(rate)).data();
      if(anterior&&agoraTeste-anterior.ultimoEmMs<30000)throw new HttpsError('failed-precondition','Aguarde 30 segundos antes de repetir o teste.',{motivo:'intervalo'});
      tx.set(rate,{ultimoEmMs:agoraTeste});
    });
    const periodo = Math.floor(agoraTeste / 30000);
    const diagnostico={};
    const enviados = await criarPush({ admin, db: destino, somenteEnvio: true })('Tá no Ponto', 'Os avisos do celular estão funcionando!', '/ponto', `teste:${uid}:${periodo}`, uid,false,{diagnostico});
    if (!enviados) throw new HttpsError('failed-precondition', 'Ative os avisos primeiro ou aguarde 30 segundos para repetir o teste.',{motivo:diagnostico.dispositivos===0?'sem-dispositivo':'intervalo'});
    return { enviados };
  });
  const tratar_alertaRegistroPonto = async (event) => {
    if (event.data?.data()?.origem === 'revisao_offline') return;
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
    if(handler==='alertaRegistroPonto'&&evento.data?.data()?.origem==='revisao_offline')return;
    const raiz=admin.firestore(),grupo=(await raiz.doc('grupos/'+evento.params.grupoId).get()).data();
    if(grupo?.ativo!==true)return;
    // Eventos da cópia podem ser entregues depois da ativação; não são novas ações.
    if(grupo.migradoEm && evento.time && Date.parse(evento.time)<=grupo.migradoEm.toMillis())return;
    return criarPush({admin,db:bancoDoGrupo(raiz,evento.params.grupoId),somenteHandlers:true})[handler](evento);
  })]));
}
module.exports = { criarPush, criarPushGrupos, deveNotificar, enviarPush };
