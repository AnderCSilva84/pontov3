const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { Timestamp, FieldValue } = require('firebase-admin/firestore');
const { validarLembrete, proximoDisparo, cuidadoraAtiva, destinatarioAtivo, dentroExpediente, dataLocal } = require('./lembretes-dominio.cjs');
const { operarCuidados, selecionarPorCuidado, podeVerLembrete, destinoLembrete, processarVinculado } = require('./lembretes-cuidados.cjs');
const idValido = v => typeof v === 'string' && /^[\w-]{1,128}$/.test(v);
const falha = (code, message) => { throw new HttpsError(code, message); };

async function operarLembretes(db, request, agora = Date.now()) {
  if (!request.auth?.uid) falha('unauthenticated', 'Entre no app.');
  const uid = request.auth.uid, d = request.data || {};
  if(['listarPratos','salvarPrato','arquivarPrato','obterPrato'].includes(d.operacao))return require('./pratos-dia.cjs').operarPratos(db,request);
  if (['listarCuidados', 'salvarCuidado'].includes(d.operacao)) return operarCuidados(db, request);
  return db.runTransaction(async tx => {
    const perfil = (await tx.get(db.doc(`users/${uid}`))).data();
    if (!perfil || perfil.ativo === false) falha('permission-denied', 'Acesso não autorizado.');
    const admin = perfil.role === 'admin';
    if (d.operacao === 'listar') {
      if (!admin && (!cuidadoraAtiva(perfil) || (d.usuarioId && d.usuarioId !== uid))) falha('permission-denied', 'Acesso não autorizado aos lembretes.');
      const usuarioId = admin ? d.usuarioId : uid;
      if (d.visao !== 'cuidados' && !idValido(usuarioId)) falha('invalid-argument', 'Selecione uma funcionária.');
      const snap = d.visao === 'cuidados' ? await selecionarPorCuidado(tx, db, uid, perfil, d) : await tx.get(db.collection('lembretes').where('usuarioId', '==', usuarioId).limit(100));
      return { lembretes: await Promise.all(snap.docs.filter(doc => d.visao === 'cuidados' || !doc.data().cuidadoId).map(async doc => {
        const l = doc.data(), cuidado = snap.cuidados?.get(l.cuidadoId);
        const destino = destinoLembrete(l, cuidado);
        const responsavelAnterior = (l.destinatarios || !cuidado) && l.usuarioId !== 'todos' && idValido(l.usuarioId) ? (await tx.get(db.doc(`users/${l.usuarioId}`))).data() : null;
        const criador = !l.criadaPorNome && idValido(l.criadaPor) ? (await tx.get(db.doc(`users/${l.criadaPor}`))).data() : null;
        const inicioHoje = Date.parse(`${dataLocal(agora)}T00:00:00-03:00`);
        const registros = await tx.get(doc.ref.collection('ocorrencias').where('horarioMs', '>=', inicioHoje).orderBy('horarioMs', 'desc').limit(24));
        const ocorrencias = registros.docs.filter(r => r.id.startsWith(`${l.versao}_`)).map(r => { const o = r.data(); return { id: r.id, horarioMs: o.horarioMs, status: o.status, notificacaoStatus: o.notificacaoStatus || '', avisosAdministradores: o.avisosAdministradores === true, concluidaEmMs: o.concluidaEmMs || null }; });
        return { id: doc.id, cuidadoId: l.cuidadoId || '', destinatarios: l.destinatarios || '', criadaPor: l.criadaPor || '', criadaPorNome: l.criadaPorNome || criador?.nome || criador?.email || 'Não disponível', criadaEmMs: l.criadaEm?.toMillis() || null, responsavelDescricao: destino?.destinatarios === 'todos' ? 'Global · todos os usuários habilitados' : responsavelAnterior?.nome || responsavelAnterior?.email || cuidado?.usuarioNome || 'Usuário responsável', usuarioId: l.usuarioId, titulo: l.titulo, observacao: l.observacao || '', tipo: l.tipo, destinatarioCuidado: cuidado?.tipo || l.destinatarioCuidado || '', nomeCuidado: cuidado?.nome || l.nomeCuidado || '', medicamento: l.medicamento || '', posologia: l.posologia || '', horario: l.horario, horarios: l.horarios || [l.horario], dataInicio: l.dataInicio, repeticao: l.repeticao, diasSemana: l.diasSemana, ativo: l.ativo, versao: l.versao, proximoDisparoEmMs: l.proximoDisparoEm?.toMillis() || null, ultimaOcorrencia: l.ultimaOcorrencia || null, ocorrencias };
      })) };
    }
    if (d.operacao === 'salvar') {
      if (!admin) falha('permission-denied', 'Somente o administrador cadastra e edita lembretes.');
      let cuidado = null;
      if (d.cuidadoId) {
        if (!idValido(d.cuidadoId)) falha('invalid-argument', 'Pessoa ou pet inválido.');
        cuidado = (await tx.get(db.doc(`pessoasCuidados/${d.cuidadoId}`))).data();
        if (!cuidado || cuidado.ativo === false) falha('not-found', 'Pessoa ou pet não encontrado.');
        if (!d.destinatarios) d.usuarioId = cuidado.destinatarios === 'todos' ? 'todos' : cuidado.usuarioId;
        d.nomeCuidado = cuidado.nome; d.destinatarioCuidado = cuidado.tipo;
      }
      if (d.destinatarios && !['todos', 'usuario'].includes(d.destinatarios)) falha('invalid-argument', 'Escolha Global ou um usuário.');
      if (d.destinatarios === 'todos') d.usuarioId = 'todos';
      const global = d.destinatarios === 'todos' || !d.destinatarios && cuidado?.destinatarios === 'todos';
      if (!idValido(d.usuarioId) || (d.id !== undefined && !idValido(d.id))) falha('invalid-argument', 'Funcionária ou lembrete inválido.');
      const alvo = global ? null : (await tx.get(db.doc(`users/${d.usuarioId}`))).data();
      if (!global && !destinatarioAtivo(alvo)) falha('failed-precondition', 'Habilite os lembretes no acesso do administrador ou marque Babá/Cuidadora na funcionária ativa.');
      let campos;
      try { campos = validarLembrete(d, agora); } catch (e) { falha('invalid-argument', e.message); }
      const ref = d.id ? db.doc(`lembretes/${d.id}`) : db.collection('lembretes').doc();
      const anterior = (await tx.get(ref)).data();
      if (d.id && !anterior) falha('not-found', 'Lembrete não encontrado para esta pessoa.');
      if (anterior && d.versao !== anterior.versao) falha('aborted', 'O lembrete mudou. Reabra a edição.');
      if (!anterior && (await tx.get(db.collection('lembretes').where(cuidado ? 'cuidadoId' : 'usuarioId', '==', cuidado ? d.cuidadoId : d.usuarioId).limit(101))).size >= 100) falha('failed-precondition', 'Limite de 100 lembretes por pessoa.');
      const { proximoMs, ...dados } = campos;
      tx.set(ref, { ...dados, ...(cuidado ? { cuidadoId: d.cuidadoId } : {}), usuarioId: d.usuarioId, ...(d.destinatarios ? { destinatarios: d.destinatarios } : {}), ativo: true, versao: (anterior?.versao || 0) + 1, proximoDisparoEm: Timestamp.fromMillis(proximoMs), criadaPor: anterior?.criadaPor || uid, criadaPorNome: anterior ? anterior.criadaPorNome || (anterior.criadaPor === uid ? perfil.nome || perfil.email || '' : '') : perfil.nome || perfil.email || '', criadaEm: anterior?.criadaEm || FieldValue.serverTimestamp(), atualizadaEm: FieldValue.serverTimestamp(), ultimaOcorrencia: null });
      return { id: ref.id };
    }
    if (!idValido(d.id)) falha('invalid-argument', 'Lembrete inválido.');
    const ref = db.doc(`lembretes/${d.id}`), lembrete = (await tx.get(ref)).data();
    if (!lembrete) falha('not-found', 'Lembrete não encontrado.');
    if (['concluir','consultarOcorrencia'].includes(d.operacao)) {
      const cuidado = lembrete.cuidadoId ? (await tx.get(db.doc(`pessoasCuidados/${lembrete.cuidadoId}`))).data() : null;
      if (!podeVerLembrete(lembrete, cuidado, uid, perfil)) falha('permission-denied', 'Acesso não autorizado a este lembrete.');
      if(d.operacao==='consultarOcorrencia') {
        if(!idValido(d.ocorrenciaId)||!d.ocorrenciaId.startsWith(`${lembrete.versao}_`))falha('failed-precondition','Este aviso é de uma versão anterior. Consulte a escala atual.');
        const registro=(await tx.get(ref.collection('ocorrencias').doc(d.ocorrenciaId))).data();
        if(!registro||['cancelado','sem_acesso'].includes(registro.status))falha('not-found','Esta ocorrência não está mais disponível.');
        return {id:d.id,ocorrenciaId:d.ocorrenciaId,titulo:lembrete.titulo,nomeCuidado:cuidado?.nome||lembrete.nomeCuidado||'',medicamento:lembrete.medicamento||'',posologia:lembrete.posologia||'',horarioMs:registro.horarioMs,concluida:registro.status==='concluido',liberada:registro.horarioMs<=agora};
      }
      const ultima = lembrete.ultimaOcorrencia;
      const devidoMs = lembrete.proximoDisparoEm?.toMillis();
      if (lembrete.ativo && Number.isFinite(devidoMs) && devidoMs <= agora && dataLocal(devidoMs) === dataLocal(agora) && d.ocorrenciaId === `${lembrete.versao}_${devidoMs}`) {
        const registro = { id: d.ocorrenciaId, horarioMs: devidoMs, status: 'concluido', concluidaPor: uid, concluidaEmMs: agora };
        const proximoMs = proximoDisparo(lembrete, devidoMs);
        tx.set(db.doc(`lembretes/${d.id}/ocorrencias/${d.ocorrenciaId}`), { ...registro, usuarioId: lembrete.usuarioId, titulo: lembrete.titulo, tipo: lembrete.tipo, destinatarioCuidado: lembrete.destinatarioCuidado || '', nomeCuidado: lembrete.nomeCuidado || '', medicamento: lembrete.medicamento || '', posologia: lembrete.posologia || '' }, { merge: true });
        tx.update(ref, { ultimaOcorrencia: registro, proximoDisparoEm: proximoMs ? Timestamp.fromMillis(proximoMs) : null });
        return { ok: true };
      }
      if (!idValido(d.ocorrenciaId) || !d.ocorrenciaId.startsWith(`${lembrete.versao}_`)) falha('failed-precondition', 'Atualize a tela antes de registrar a realização.');
      const registroRef = ref.collection('ocorrencias').doc(d.ocorrenciaId);
      const registro = (await tx.get(registroRef)).data();
      if (!registro || registro.horarioMs > agora || ['cancelado', 'sem_acesso'].includes(registro.status)) falha('failed-precondition', 'Atualize a tela antes de registrar a realização.');
      if (registro.status === 'concluido') return { ok: true };
      if (ultima?.id === d.ocorrenciaId) tx.update(ref, { ultimaOcorrencia: { ...ultima, status: 'concluido', concluidaPor: uid, concluidaEmMs: agora } });
      tx.set(registroRef, { status: 'concluido', concluidaPor: uid, concluidaEmMs: agora }, { merge: true });
      return { ok: true };
    }
    if (!admin) falha('permission-denied', 'Somente o administrador altera lembretes.');
    if (d.versao !== lembrete.versao) falha('aborted', 'O lembrete mudou. Atualize a tela.');
    if (d.operacao === 'excluir') { tx.delete(ref); return { ok: true }; }
    if (d.operacao !== 'pausar' || typeof d.ativo !== 'boolean') falha('invalid-argument', 'Operação inválida.');
    const cuidado = lembrete.cuidadoId ? (await tx.get(db.doc(`pessoasCuidados/${lembrete.cuidadoId}`))).data() : null;
    const destino = destinoLembrete(lembrete, cuidado);
    const responsavelId = destino?.usuarioId || lembrete.usuarioId;
    const alvo = destino?.destinatarios === 'todos' ? null : (await tx.get(db.doc(`users/${responsavelId}`))).data();
    if (d.ativo && (lembrete.cuidadoId && !cuidado || destino?.destinatarios !== 'todos' && !destinatarioAtivo(alvo))) falha('failed-precondition', 'Esta pessoa não está habilitada para receber lembretes.');
    const proximoMs = d.ativo ? proximoDisparo(lembrete, agora) : null;
    if (d.ativo && !proximoMs) falha('failed-precondition', 'Edite o lembrete e escolha um horário futuro.');
    tx.update(ref, { ativo: d.ativo, versao: lembrete.versao + 1, proximoDisparoEm: proximoMs ? Timestamp.fromMillis(proximoMs) : null, atualizadaEm: FieldValue.serverTimestamp() });
    return { ok: true };
  });
}

async function processarLembretes(db, enviar, agora = Date.now(), relogio = () => agora) {
  const vencidos = await db.collection('lembretes').where('proximoDisparoEm', '<=', Timestamp.fromMillis(agora)).orderBy('proximoDisparoEm').limit(100).get();
  let processados = 0;
  for (const candidato of vencidos.docs) {
    const ref = candidato.ref;
    if (candidato.data().cuidadoId || candidato.data().destinatarios) { processados += await processarVinculado(db, ref, enviar, agora, relogio); continue; }
    const reserva = await db.runTransaction(async tx => {
      const lembrete = (await tx.get(ref)).data();
      const ms = lembrete?.proximoDisparoEm?.toMillis();
      if (!lembrete?.ativo || !Number.isFinite(ms) || ms > agora) return null;
      const alvo = (await tx.get(db.doc(`users/${lembrete.usuarioId}`))).data();
      const funcionario = alvo?.role === 'funcionario' && idValido(alvo.funcionarioId) ? (await tx.get(db.doc(`funcionarios/${alvo.funcionarioId}`))).data() : null;
      const id = `${lembrete.versao}_${ms}`, ocorrencia = ref.collection('ocorrencias').doc(id);
      const anterior = (await tx.get(ocorrencia)).data();
      if (anterior?.leaseAteMs > agora) return null;
      if (anterior?.status === 'concluido') return null;
      tx.set(ocorrencia, { horarioMs: ms, versao: lembrete.versao, usuarioId: lembrete.usuarioId, titulo: lembrete.titulo, tipo: lembrete.tipo, destinatarioCuidado: lembrete.destinatarioCuidado || '', nomeCuidado: lembrete.nomeCuidado || '', medicamento: lembrete.medicamento || '', posologia: lembrete.posologia || '', leaseAteMs: agora + 90000, status: 'processando' });
      return { ...lembrete, id, ms, perfilResponsavel: alvo?.role, elegivel: destinatarioAtivo(alvo), expediente: dentroExpediente(alvo, funcionario, ms) && dentroExpediente(alvo, funcionario, agora), ocorrencia };
    });
    if (!reserva) continue;
    try {
      // Evita notificar um compromisso antigo depois de indisponibilidade longa.
      let status = !reserva.elegivel ? 'sem_acesso' : !reserva.expediente ? 'fora_expediente' : agora - reserva.ms > 15 * 60000 ? 'atrasado' : 'enviado';
      let avisosAdministradores = false;
      let falhaEnvio = false;
      if (status === 'enviado') {
        const [atual, alvo] = await Promise.all([ref.get(), db.doc(`users/${reserva.usuarioId}`).get()]);
        const perfil = alvo.data();
        const funcionario = perfil?.role === 'funcionario' && idValido(perfil.funcionarioId) ? (await db.doc(`funcionarios/${perfil.funcionarioId}`).get()).data() : null;
        const envioAgora = relogio();
        if (!atual.exists || atual.data().versao !== reserva.versao || atual.data().proximoDisparoEm?.toMillis() !== reserva.ms || !atual.data().ativo || !destinatarioAtivo(perfil)) status = 'cancelado';
        else if (!dentroExpediente(perfil, funcionario, reserva.ms) || !dentroExpediente(perfil, funcionario, envioAgora)) status = 'fora_expediente';
        else {
          let ttl = 300;
          if (perfil.role === 'funcionario') for (let segundos = 1; segundos <= 300; segundos++) { if (!dentroExpediente(perfil, funcionario, envioAgora + segundos * 1000)) { ttl = segundos - 1; break; } }
          const hora = new Date(reserva.ms - 3 * 3600000).toISOString().slice(11, 16);
          try {
            const enviados = await enviar('Lembrete de cuidado', `${hora} · ${reserva.titulo}`, require('./lembretes-link.cjs').urlLembrete(ref.id,reserva.id,reserva.usuarioId), `lembrete:${ref.id}:${reserva.id}`, reserva.usuarioId, false, { ttl, urgency: 'high', contarConfirmados: true });
            if (!enviados) status = 'sem_dispositivo';
          } catch { falhaEnvio = true; }
        }
      }
      if (reserva.perfilResponsavel === 'funcionario' && agora - reserva.ms <= 15 * 60000) {
        const atual = (await ref.get()).data();
        if (atual?.ativo && atual.versao === reserva.versao && atual.proximoDisparoEm?.toMillis() === reserva.ms) {
          const administradores = await db.collection('users').where('role', '==', 'admin').get();
          for (const pessoa of administradores.docs.filter(p => destinatarioAtivo(p.data()))) {
            const hora = new Date(reserva.ms - 3 * 3600000).toISOString().slice(11, 16);
            try {
              const enviados = await enviar('Lembrete de cuidado', `${hora} · ${reserva.titulo}`, require('./lembretes-link.cjs').urlLembrete(ref.id,reserva.id,pessoa.id), `lembrete:${ref.id}:${reserva.id}`, pessoa.id, false, { ttl: 300, urgency: 'high', contarConfirmados: true });
              if (enviados) avisosAdministradores = true;
            } catch { falhaEnvio = true; }
          }
        }
      }
      if (falhaEnvio) throw new Error('Nova tentativa de envio necessária.');
      await db.runTransaction(async tx => {
        const atual = (await tx.get(ref)).data();
        const ocorrencia = (await tx.get(reserva.ocorrencia)).data();
        if (ocorrencia?.status === 'concluido') return;
        tx.set(reserva.ocorrencia, { status, notificacaoStatus: status, avisosAdministradores, leaseAteMs: 0, processadaEm: FieldValue.serverTimestamp() }, { merge: true });
        if (!atual || atual.versao !== reserva.versao || atual.proximoDisparoEm?.toMillis() !== reserva.ms) return;
        const proximoMs = proximoDisparo(atual, dataLocal(reserva.ms) === dataLocal(agora) ? reserva.ms : agora);
        tx.update(ref, { proximoDisparoEm: proximoMs ? Timestamp.fromMillis(proximoMs) : null, ultimaOcorrencia: { id: reserva.id, horarioMs: reserva.ms, status, avisosAdministradores } });
      });
      processados++;
    } catch {
      await reserva.ocorrencia.set({ leaseAteMs: 0, status: 'tentar_novamente' }, { merge: true });
      // O próximo minuto tenta novamente; não registra dados dos cuidados nos logs.
    }
  }
  return { processados };
}
function criarLembretes({ admin, enviar }) {
  const { bancoDoUsuario, bancoDoGrupo } = require('./grupos-contexto.cjs');
  return {
    lembretesOperacao: onCall({ timeoutSeconds: 60 }, async request => operarLembretes(await bancoDoUsuario(admin.firestore(), request.auth?.uid), request)),
    dispararLembretes: onSchedule({ schedule: '* * * * *', timeZone: 'America/Fortaleza', timeoutSeconds: 120, maxInstances: 1, retryCount: 1 }, async () => {
      const raiz = admin.firestore();
      const migracao = (await raiz.doc('migracoesGrupos/legado').get()).data();
      const legado = migracao?.bloqueada || migracao?.concluida ? { processados: 0 } : await processarLembretes(raiz, enviar, Date.now(), Date.now);
      let cursor = null;
      do {
        let consulta = raiz.collection('grupos').where('ativo', '==', true).orderBy('__name__').limit(50);
        if (cursor) consulta = consulta.startAfter(cursor);
        const grupos = await consulta.get();
        for (const grupo of grupos.docs) {
          const db = bancoDoGrupo(raiz, grupo.id);
          const enviarGrupo = require('./push.cjs').criarPush({ admin, db, somenteEnvio: true });
          await processarLembretes(db, enviarGrupo, Date.now(), Date.now);
        }
        cursor = grupos.size === 50 ? grupos.docs.at(-1) : null;
      } while (cursor);
      return legado;
    }),
  };
}
module.exports = { criarLembretes, operarLembretes, processarLembretes };
