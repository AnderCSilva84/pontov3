const { HttpsError } = require('firebase-functions/v2/https');
const { FieldValue } = require('firebase-admin/firestore');

async function salvarFolha(db, dados, uid) {
  if (!uid) throw new HttpsError('unauthenticated', 'Entre no app.');
  const { calcularFolha, transportesDaCompetencia } = await import('./folha-calculos.mjs');
  const f = dados.folha || {}, fid = dados.funcionarioId;
  if (typeof fid !== 'string' || !/^[\w-]{1,128}$/.test(fid) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(f.competencia)) throw new HttpsError('invalid-argument', 'Selecione funcionária e competência.');
  if (f.bonusSemIncidenciaInss !== undefined && typeof f.bonusSemIncidenciaInss !== 'boolean') throw new HttpsError('invalid-argument', 'Revise a incidência do bônus.');
  if (f.descontarHoras !== undefined && typeof f.descontarHoras !== 'boolean') throw new HttpsError('invalid-argument', 'Revise a opção de desconto de horas.');
  const numericos = ['salarioBase','bonus','horasExtras','adicionais','horasDevidas','divisorHoras','faltas','inss','adiantamentos','outrosDescontos','baseInssInformada','proporcaoVt'];
  for (const c of numericos) if (!Number.isFinite(Number(f[c] || 0)) || Number(f[c] || 0) < 0 || Number(f[c] || 0) > 1e8) throw new HttpsError('invalid-argument', 'Revise os valores da folha.');
  if (!(Number(f.divisorHoras) > 0) || Number(f.proporcaoVt ?? 100) > 100 || typeof f.observacao !== 'string' || f.observacao.length > 300) throw new HttpsError('invalid-argument', 'Revise divisor, proporção do VT e observação.');
  return db.runTransaction(async tx => {
    const perfil = (await tx.get(db.doc(`users/${uid}`))).data();
    if (perfil?.role !== 'admin' || perfil.ativo === false) throw new HttpsError('permission-denied', 'Acesso restrito ao administrador.');
    const ref = db.doc(`folhasPagamento/${fid}_${f.competencia}`), anterior = (await tx.get(ref)).data();
    const funcionario = (await tx.get(db.doc(`funcionarios/${fid}`))).data();
    if (!funcionario) throw new HttpsError('not-found', 'Funcionária não encontrada.');
    if (anterior && anterior.status !== 'em_andamento') throw new HttpsError('failed-precondition', 'Esta folha já foi fechada e não pode ser alterada.');
    if (dados.fechar && !anterior) throw new HttpsError('failed-precondition', 'Salve a folha em andamento antes de fechar.');
    if ((anterior?.versao || 0) !== dados.versao) throw new HttpsError('aborted', 'A folha foi alterada em outra sessão. Reabra antes de salvar.');
    const lancamentos = await tx.get(db.collection('financeiro').where('funcionarioId', '==', fid));
    const totais = calcularFolha(f, transportesDaCompetencia(lancamentos.docs.map(d => ({ ...d.data(), id: d.id })), fid, f.competencia));
    if (totais.erroCalculo) throw new HttpsError('failed-precondition', totais.erroCalculo);
    if (dados.fechar && ['proventos','descontos','valeTransportePago'].some(c => dados.revisao?.[c] !== totais[c])) throw new HttpsError('aborted', 'Os valores foram atualizados. Confira novamente o transporte e o resumo antes de fechar.');
    if (dados.fechar && (totais.proventos <= 0 || totais.descontos > totais.proventos)) throw new HttpsError('failed-precondition', 'Revise proventos e descontos antes de fechar.');
    const campos = Object.fromEntries(numericos.map(c => [c, Number(f[c] ?? (c === 'proporcaoVt' ? 100 : 0))]));
    const registro = { ...campos, competencia: f.competencia, descontarHoras: f.descontarHoras !== false, bonusBaseDesconto: f.bonusBaseDesconto === true, bonusSemIncidenciaInss: f.bonusSemIncidenciaInss === true, inssAutomatico: f.inssAutomatico === true, baseInssManual: f.baseInssManual === true, cobrarValeTransporte: f.cobrarValeTransporte === true, observacao: f.observacao, ...totais, calculoVersao: 2, funcionarioId: fid, funcionarioNome: funcionario.nome || '', status: dados.fechar ? 'pronta_pagamento' : 'em_andamento', versao: (anterior?.versao || 0) + 1, criadaPor: anterior?.criadaPor || uid, criadaEm: anterior?.criadaEm || FieldValue.serverTimestamp(), atualizadaPor: uid, atualizadaEm: FieldValue.serverTimestamp(), ...(dados.fechar ? { fechadaPor: uid, fechadaEm: FieldValue.serverTimestamp() } : {}) };
    tx.set(ref, registro);
    return { versao: registro.versao, status: registro.status, totais };
  });
}

// A folha e o pagamento mudam juntos; repetir a solicitação retorna o mesmo recibo.
async function pagarFolhaFechada(db, dados, uid) {
  if (dados.tipo !== 'salario' || typeof dados.folhaId !== 'string' || !/^[\w-]{1,150}$/.test(dados.folhaId)) throw new HttpsError('invalid-argument', 'Folha inválida.');
  if (typeof dados.dataPagamento !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dados.dataPagamento) || (!Number.isFinite(Date.parse(dados.dataPagamento + 'T12:00:00Z')) || new Date(dados.dataPagamento + 'T12:00:00Z').toISOString().slice(0, 10) !== dados.dataPagamento)) throw new HttpsError('invalid-argument', 'Data de pagamento inválida.');
  return db.runTransaction(async tx => {
    const ref = db.doc(`folhasPagamento/${dados.folhaId}`), snap = await tx.get(ref), folha = snap.data();
    if (!folha) throw new HttpsError('not-found', 'Folha não encontrada.');
    if (folha.status === 'paga') {
      if (folha.pagamentoId) return { id: folha.pagamentoId };
      throw new HttpsError('failed-precondition', 'Esta folha já foi paga.');
    }
    if (folha.status !== 'pronta_pagamento') throw new HttpsError('failed-precondition', 'Finalize e feche a folha antes de registrar o pagamento.');
    const valor = Number(folha.proventos), descontos = Number(folha.descontos);
    if (!Number.isFinite(valor) || valor <= 0 || !Number.isFinite(descontos) || descontos < 0 || descontos > valor) throw new HttpsError('failed-precondition', 'Os valores da folha precisam ser revisados.');
    const existentes = await tx.get(db.collection('financeiro').where('folhaId', '==', dados.folhaId).limit(2));
    if (!existentes.empty) {
      const registro = existentes.docs[0], legado = registro.data();
      if (existentes.size !== 1 || legado.tipo !== 'salario' || legado.funcionarioId !== folha.funcionarioId || Number(legado.valor) !== valor || Number(legado.descontos) !== descontos) throw new HttpsError('failed-precondition', 'Há um pagamento vinculado que precisa ser conferido.');
      tx.update(ref, { status: 'paga', pagamentoId: registro.id, pagaEm: legado.criadoEm || FieldValue.serverTimestamp(), pagaPor: legado.criadoPor || uid });
      return { id: registro.id };
    }
    const pagamento = db.doc(`financeiro/folha_${dados.folhaId}`);
    if ((await tx.get(pagamento)).exists) throw new HttpsError('failed-precondition', 'Já existe pagamento vinculado a esta folha.');
    const funcionario = (await tx.get(db.doc(`funcionarios/${folha.funcionarioId}`))).data();
    if (!funcionario) throw new HttpsError('not-found', 'Funcionária não encontrada.');
    const campos = ['salarioBase', 'bonus', 'horasExtras', 'adicionais', 'horasDevidas', 'descontoHoras', 'faltas', 'inss', 'adiantamentos', 'outrosDescontos', 'valeTransportePago', 'descontoValeTransporte', 'baseInss'];
    tx.create(pagamento, { ...Object.fromEntries(campos.map(c => [c, Number(folha[c]) || 0])), tipo: 'salario', tipoLabel: 'Salário', folhaId: dados.folhaId, valor, proventos: valor, descontos, valorLiquido: valor - descontos, funcionarioId: folha.funcionarioId, funcionarioNome: funcionario.nome || folha.funcionarioNome || '', dataPagamento: dados.dataPagamento, competenciaMes: folha.competencia, descricao: 'Pagamento da folha fechada', observacao: folha.observacao || '', criadoPor: uid, criadoEm: FieldValue.serverTimestamp() });
    tx.update(ref, { status: 'paga', pagamentoId: pagamento.id, pagaEm: FieldValue.serverTimestamp(), pagaPor: uid });
    return { id: pagamento.id };
  });
}
module.exports = { pagarFolhaFechada, salvarFolha };
