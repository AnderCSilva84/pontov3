const { exigirOperacaoCompartilhada } = require('./compartilhamento.cjs');
const { HttpsError } = require('firebase-functions/v2/https');
const { FieldValue } = require('firebase-admin/firestore');
const { bancoDoUsuario } = require('./grupos-contexto.cjs');
const { prepararCota } = require('./assinaturas-cotas.cjs');
const falha = (codigo, mensagem) => { throw new HttpsError(codigo, mensagem); };
const dias = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

function validar(d, tipo) {
  if (!d || typeof d !== 'object' || Array.isArray(d)
    || Object.keys(d).some(k => !['titulo', 'turno', 'horario', tipo === 'fixa' ? 'diaSemana' : 'dataAgendada'].includes(k))
    || typeof d.titulo !== 'string' || !d.titulo.trim() || d.titulo.trim().length > 500
    || !['manha', 'tarde'].includes(d.turno) || typeof d.horario !== 'string'
    || d.horario && !/^([01]\d|2[0-3]):[0-5]\d$/.test(d.horario)) falha('invalid-argument', 'Confira o título, período e horário da tarefa.');
  if (tipo === 'fixa') {
    if (!Number.isInteger(d.diaSemana) || d.diaSemana < 0 || d.diaSemana > 6) falha('invalid-argument', 'Escolha um dia da semana.');
    return { titulo: d.titulo.trim(), turno: d.turno, horario: d.horario, diaSemana: d.diaSemana };
  }
  const data = typeof d.dataAgendada === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.dataAgendada) ? new Date(d.dataAgendada + 'T12:00:00Z') : null;
  if (!data || !Number.isFinite(data.getTime()) || data.toISOString().slice(0, 10) !== d.dataAgendada) falha('invalid-argument', 'Escolha uma data válida.');
  return { titulo: d.titulo.trim(), turno: d.turno, horario: d.horario, dataAgendada: d.dataAgendada, diaSemana: dias[data.getUTCDay()] };
}

async function cadastrarTarefa(raiz, request) {
  const uid = request.auth?.uid, d = request.data || {};
  if (!['criar', 'reabrir'].includes(d.operacao) || !['fixa', 'avulsa'].includes(d.tipo)
    || typeof d.id !== 'string' || !/^[\w-]{1,128}$/.test(d.id)
    || Object.keys(d).some(k => !['operacao', 'tipo', 'id', 'dados', 'operacaoId'].includes(k))
    || d.operacao === 'reabrir' && (typeof d.operacaoId !== 'string' || !/^[a-f0-9-]{36}$/.test(d.operacaoId))) falha('invalid-argument', 'Operação de tarefa inválida.');
  const campos = d.operacao === 'criar' ? validar(d.dados, d.tipo) : null;
  const banco = await bancoDoUsuario(raiz, uid), ref = banco.doc(`${d.tipo === 'fixa' ? 'tarefasSemanais' : 'tarefas'}/${d.id}`);
  return raiz.runTransaction(async tx => {
    await exigirOperacaoCompartilhada(tx, banco, uid);
    const perfil = (await tx.get(banco.doc(`users/${uid}`))).data();
    if (perfil?.role !== 'admin' || perfil.ativo === false) falha('permission-denied', 'Somente administradores gerenciam tarefas.');
    const anterior = (await tx.get(ref)).data();
    const tentativaRef = d.operacao === 'reabrir' ? banco.doc(`tarefasOperacoes/${d.tipo}_${d.id}_${d.operacaoId}`) : null;
    if (tentativaRef && (await tx.get(tentativaRef)).exists) return { id: ref.id, jaProcessada: true };
    if (d.operacao === 'criar' && anterior) {
      if ((anterior.criadoPor || anterior.solicitadoPor) !== uid || Object.entries(campos).some(([k, v]) => anterior[k] !== v)) falha('already-exists', 'Esta identificação já foi usada por outra tarefa.');
      return { id: ref.id, jaCriada: true };
    }
    if (d.operacao === 'reabrir' && !anterior) falha('not-found', 'Tarefa não encontrada.');
    const jaAtiva = anterior && (d.tipo === 'fixa' ? anterior.ativa !== false : anterior.concluida !== true);
    const confirmarCota = await prepararCota(tx, banco, uid, 'tarefas', jaAtiva ? 0 : 1);
    confirmarCota();
    if (tentativaRef) tx.create(tentativaRef, { uid, tarefaId: d.id, tipo: d.tipo, criadaEm: FieldValue.serverTimestamp() });
    if (jaAtiva) return { id: ref.id, jaAtiva: true };
    const agora = FieldValue.serverTimestamp();
    if (anterior) {
      tx.update(ref, d.tipo === 'fixa' ? { ativa: true, atualizadoEm: agora, atualizadoPor: uid }
        : { concluida: false, concluidaEm: FieldValue.delete(), concluidaPor: FieldValue.delete(), concluidaPorUid: FieldValue.delete(), acaoNotificacaoId: FieldValue.delete(), acaoDeclaradaEmMs: FieldValue.delete(), atualizadoEm: agora, atualizadoPor: uid });
    } else {
      tx.create(ref, { ...campos, criadoEm: agora, ...(d.tipo === 'fixa' ? { ativa: true, criadoPor: uid }
        : { concluida: false, solicitadoPor: uid, solicitadoPorNome: perfil.nome || 'Admin' }) });
      tx.create(banco.doc(`notificacoes/tarefa_${d.tipo}_${ref.id}`), {
        titulo: d.tipo === 'fixa' ? 'Nova tarefa fixa' : 'Nova tarefa no calendário', mensagem: campos.titulo,
        tipo: d.tipo === 'fixa' ? 'tarefa_fixa_criada' : 'tarefa_avulsa_criada', tarefaId: ref.id, criadoEm: agora, criadoPor: uid,
      });
    }
    return { id: ref.id };
  });
}
module.exports = { cadastrarTarefa };
