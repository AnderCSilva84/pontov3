const { HttpsError } = require('firebase-functions/v2/https');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const { cuidadoraAtiva, destinatarioAtivo, dentroExpediente, proximoDisparo, dataLocal } = require('./lembretes-dominio.cjs');
const idValido = v => typeof v === 'string' && /^[\w-]{1,128}$/.test(v);
const erro = (code, message) => { throw new HttpsError(code, message); };
const podeVerCuidado = (c, uid, perfil) => Boolean(c && c.ativo !== false && (perfil.role === 'admin' || (cuidadoraAtiva(perfil) && (c?.destinatarios === 'todos' || c?.usuarioId === uid))));
// A atribuição explícita do lembrete prevalece sobre o responsável padrão do paciente.
const destinoLembrete = (l, c) => l.destinatarios ? { destinatarios: l.destinatarios, usuarioId: l.usuarioId, ativo: c?.ativo !== false, nome: c?.nome || l.nomeCuidado || '', versao: c?.versao || 0 } : c;
const podeVerLembrete = (l, c, uid, perfil) => perfil.role === 'admin' || (l.cuidadoId && !c ? false : l.destinatarios ? podeVerCuidado(destinoLembrete(l, c), uid, perfil) : l.cuidadoId ? podeVerCuidado(c, uid, perfil) : cuidadoraAtiva(perfil) && l.usuarioId === uid);

async function operarCuidados(db, request) {
  if (!request.auth?.uid) erro('unauthenticated', 'Entre no app.');
  const uid = request.auth.uid, d = request.data || {};
  return db.runTransaction(async tx => {
    const perfil = (await tx.get(db.doc(`users/${uid}`))).data();
    if (!perfil || perfil.ativo === false) erro('permission-denied', 'Acesso não autorizado.');
    if (d.operacao === 'listarCuidados') {
      if (perfil.role !== 'admin' && !cuidadoraAtiva(perfil)) erro('permission-denied', 'Acesso não autorizado.');
      const snap = await tx.get(db.collection('pessoasCuidados').limit(201));
      if (snap.size > 200) erro('resource-exhausted', 'Limite de cadastros atingido.');
      return { cuidados: snap.docs.filter(doc => podeVerCuidado(doc.data(), uid, perfil)).map(doc => ({ id: doc.id, nome: doc.data().nome, tipo: doc.data().tipo, destinatarios: doc.data().destinatarios, usuarioId: doc.data().usuarioId, usuarioNome: doc.data().usuarioNome || '', versao: doc.data().versao })) };
    }
    if (d.operacao !== 'salvarCuidado' || perfil.role !== 'admin') erro('permission-denied', 'Somente o administrador cadastra pessoas, pets e responsáveis.');
    const nome = typeof d.nome === 'string' ? d.nome.trim() : '';
    if (!nome || nome.length > 100 || !['crianca', 'idoso', 'adulto', 'cao', 'gato'].includes(d.tipo)) erro('invalid-argument', 'Informe o nome (até 100 caracteres) e o tipo do cadastro.');
    if (!['usuario', 'todos'].includes(d.destinatarios) || (d.destinatarios === 'usuario' && !idValido(d.usuarioId)) || (d.id !== undefined && !idValido(d.id))) erro('invalid-argument', 'Escolha o usuário responsável ou todos.');
    const alvo = d.destinatarios === 'usuario' ? (await tx.get(db.doc(`users/${d.usuarioId}`))).data() : null;
    if (alvo && !destinatarioAtivo(alvo) || d.destinatarios === 'usuario' && !alvo) erro('failed-precondition', 'Escolha um usuário ativo e habilitado para lembretes.');
    const ref = d.id ? db.doc(`pessoasCuidados/${d.id}`) : db.collection('pessoasCuidados').doc();
    const anterior = (await tx.get(ref)).data();
    if (d.id && !anterior) erro('not-found', 'Cadastro não encontrado.');
    if (anterior && d.versao !== anterior.versao) erro('aborted', 'O cadastro mudou. Reabra a edição.');
    if (!anterior && (await tx.get(db.collection('pessoasCuidados').limit(201))).size >= 200) erro('failed-precondition', 'Limite de 200 pessoas e pets.');
    tx.set(ref, { nome, tipo: d.tipo, destinatarios: d.destinatarios, usuarioId: d.destinatarios === 'usuario' ? d.usuarioId : null, usuarioNome: alvo?.nome || alvo?.email || '', ativo: true, versao: (anterior?.versao || 0) + 1, criadaEm: anterior?.criadaEm || FieldValue.serverTimestamp(), atualizadaEm: FieldValue.serverTimestamp() });
    return { id: ref.id };
  });
}

async function selecionarPorCuidado(tx, db, uid, perfil, dados) {
  if (perfil.role !== 'admin' && !cuidadoraAtiva(perfil)) erro('permission-denied', 'Acesso não autorizado.');
  const pacientes = await tx.get(db.collection('pessoasCuidados').limit(201));
  if (pacientes.size > 200) erro('resource-exhausted', 'Há muitos cadastros para esta consulta.');
  const cuidados = new Map(pacientes.docs.map(doc => [doc.id, doc.data()]));
  if (dados.cuidadoId && !idValido(dados.cuidadoId)) erro('permission-denied', 'Acesso não autorizado a esta pessoa ou pet.');
  const snap = dados.cuidadoId ? await tx.get(db.collection('lembretes').where('cuidadoId', '==', dados.cuidadoId).limit(101)) : await tx.get(db.collection('lembretes').limit(1001));
  if (snap.size > (dados.cuidadoId ? 100 : 1000)) erro('resource-exhausted', 'Escolha uma pessoa ou pet para reduzir a consulta.');
  const docs = snap.docs.filter(doc => { const l = doc.data(); return podeVerLembrete(l, cuidados.get(l.cuidadoId), uid, perfil); });
  if (dados.cuidadoId && !podeVerCuidado(cuidados.get(dados.cuidadoId), uid, perfil) && !docs.length) erro('permission-denied', 'Acesso não autorizado a esta pessoa ou pet.');
  return { docs, cuidados };
}

async function processarVinculado(db, ref, enviar, agora, relogio) {
  const reserva = await db.runTransaction(async tx => {
    const l = (await tx.get(ref)).data(), ms = l?.proximoDisparoEm?.toMillis();
    if (!l?.ativo || !Number.isFinite(ms) || ms > agora || (!l.destinatarios && !idValido(l.cuidadoId))) return null;
    const paciente = l.cuidadoId ? (await tx.get(db.doc(`pessoasCuidados/${l.cuidadoId}`))).data() : null;
    const c = l.cuidadoId && !paciente ? null : destinoLembrete(l, paciente);
    const id = `${l.versao}_${ms}`, ocorrencia = ref.collection('ocorrencias').doc(id), anterior = (await tx.get(ocorrencia)).data();
    if (anterior?.leaseAteMs > agora || anterior?.status === 'concluido') return null;
    tx.set(ocorrencia, { horarioMs: ms, versao: l.versao, cuidadoId: l.cuidadoId || '', titulo: l.titulo, tipo: l.tipo, destinatarioCuidado: c?.tipo || l.destinatarioCuidado || '', nomeCuidado: c?.nome || l.nomeCuidado || '', medicamento: l.medicamento || '', posologia: l.posologia || '', leaseAteMs: agora + 90000, status: 'processando' });
    return { ...l, ms, id, ocorrencia, cuidado: c };
  });
  if (!reserva) return 0;
  try {
    let status = 'sem_acesso', avisosAdministradores = false, falhou = false;
    if (reserva.cuidado?.ativo !== false && reserva.cuidado && agora - reserva.ms <= 15 * 60000) {
      const usuarios = await db.collection('users').limit(501).get();
      if (usuarios.size > 500) throw Error('Limite de destinatários excedido.');
      const habilitados = usuarios.docs.filter(p => destinatarioAtivo(p.data()));
      const principais = habilitados.filter(p => reserva.cuidado.destinatarios === 'todos' || p.id === reserva.cuidado.usuarioId);
      const supervisionar = principais.some(p => p.data().role === 'funcionario') || reserva.cuidado.destinatarios === 'todos';
      const destinos = new Map([...principais, ...(supervisionar ? habilitados.filter(p => p.data().role === 'admin') : [])].map(p => [p.id, p]));
      for (const [uid] of destinos) {
        const [atual, cuidado, usuario, ocorrenciaAtual] = await Promise.all([ref.get(), reserva.cuidadoId ? db.doc(`pessoasCuidados/${reserva.cuidadoId}`).get() : null, db.doc(`users/${uid}`).get(), reserva.ocorrencia.get()]);
        if (ocorrenciaAtual.data()?.status === 'concluido') return 1;
        const c = reserva.cuidadoId && !cuidado?.exists ? null : destinoLembrete(atual.data() || {}, cuidado?.data()), perfil = usuario.data();
        if (!atual.exists || !atual.data().ativo || atual.data().versao !== reserva.versao || atual.data().proximoDisparoEm?.toMillis() !== reserva.ms) { status = 'cancelado'; break; }
        if (!c || c.ativo === false || c.versao !== reserva.cuidado.versao) throw Error('Responsáveis alterados durante o envio.');
        if (!destinatarioAtivo(perfil) || !(c.destinatarios === 'todos' || c.usuarioId === uid || supervisionar && perfil.role === 'admin')) continue;
        const funcionario = perfil.role === 'funcionario' && idValido(perfil.funcionarioId) ? (await db.doc(`funcionarios/${perfil.funcionarioId}`).get()).data() : null;
        const instante = relogio();
        if (!dentroExpediente(perfil, funcionario, reserva.ms) || !dentroExpediente(perfil, funcionario, instante)) { if (status === 'sem_acesso') status = 'fora_expediente'; continue; }
        let ttl = 300;
        if (perfil.role === 'funcionario') for (let s = 1; s <= 300; s++) if (!dentroExpediente(perfil, funcionario, instante + s * 1000)) { ttl = s - 1; break; }
        if (ttl <= 0) continue;
        try {
          const hora = new Date(reserva.ms - 3 * 3600000).toISOString().slice(11, 16);
          const enviados = await enviar('Lembrete de cuidado', `${hora} · ${c.nome} · ${reserva.titulo}`, require('./lembretes-link.cjs').urlLembrete(ref.id,reserva.id,uid), `lembrete:${ref.id}:${reserva.id}`, uid, false, { ttl, urgency: 'high', contarConfirmados: true });
          if (enviados) { status = 'enviado'; if (perfil.role === 'admin') avisosAdministradores = true; }
          else if (status !== 'enviado') status = 'sem_dispositivo';
        } catch { falhou = true; }
      }
    } else if (agora - reserva.ms > 15 * 60000) status = 'atrasado';
    if (falhou) throw Error('Nova tentativa de envio necessária.');
    await db.runTransaction(async tx => {
      const atual = (await tx.get(ref)).data(), o = (await tx.get(reserva.ocorrencia)).data();
      if (o?.status === 'concluido') return;
      tx.set(reserva.ocorrencia, { status, notificacaoStatus: status, avisosAdministradores, leaseAteMs: 0, processadaEm: FieldValue.serverTimestamp() }, { merge: true });
      if (!atual || atual.versao !== reserva.versao || atual.proximoDisparoEm?.toMillis() !== reserva.ms) return;
      const proximo = proximoDisparo(atual, dataLocal(reserva.ms) === dataLocal(agora) ? reserva.ms : agora);
      tx.update(ref, { proximoDisparoEm: proximo ? Timestamp.fromMillis(proximo) : null, ultimaOcorrencia: { id: reserva.id, horarioMs: reserva.ms, status, avisosAdministradores } });
    });
    return 1;
  } catch { await db.runTransaction(async tx => { const o = (await tx.get(reserva.ocorrencia)).data(); if (o?.status !== 'concluido') tx.set(reserva.ocorrencia, { leaseAteMs: 0, status: 'tentar_novamente' }, { merge: true }); }); return 0; }
}
module.exports = { operarCuidados, selecionarPorCuidado, podeVerCuidado, podeVerLembrete, destinoLembrete, processarVinculado };
