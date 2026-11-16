const { HttpsError } = require('firebase-functions/v2/https');
const { FieldValue } = require('firebase-admin/firestore');
const { createHash } = require('node:crypto');
const { bancoDoUsuario } = require('./grupos-contexto.cjs');
const { exigirRecurso } = require('./assinaturas-recursos.cjs');
const { resolverAssinatura, verificarCota } = require('./assinaturas-dominio.cjs');
const falha = (c,m) => { throw new HttpsError(c,m); };
const permissoesPadrao = role => ({ accessPonto: role === 'funcionario' || role === 'admin', accessAdmin: role !== 'funcionario', manageUsers: role === 'admin', createTasks: role !== 'funcionario', realizarCompras: role === 'admin' });

async function gerirAcesso(raiz, request) {
  const uid = request.auth?.uid, d = request.data || {};
  if (!['alterar','suspender'].includes(d.operacao) || typeof d.uid !== 'string' || !/^[\w-]{1,128}$/.test(d.uid)
    || !/^[a-f0-9-]{36}$/.test(d.operacaoId || '') || Object.keys(d).some(k => !['operacao','uid','operacaoId','role','permissions','babaCuidadora','lembretesHabilitados'].includes(k))) falha('invalid-argument', 'Confira a operação de acesso.');
  if (d.operacao === 'alterar' && (!['admin','funcionario','consulta'].includes(d.role)
    || !d.permissions || typeof d.permissions !== 'object' || Array.isArray(d.permissions)
    || Object.entries(d.permissions).some(([k,v]) => !Object.hasOwn(permissoesPadrao(d.role), k) || typeof v !== 'boolean')
    || ['babaCuidadora','lembretesHabilitados'].some(k => d[k] !== undefined && typeof d[k] !== 'boolean'))) falha('invalid-argument', 'Confira o perfil e as permissões.');
  const db = await bancoDoUsuario(raiz, uid), ref = db.doc(`users/${d.uid}`), operacaoRef = db.doc(`acessosOperacoes/${d.operacaoId}`);
  const assinaturaPedido = createHash('sha256').update(JSON.stringify([uid, d.operacao, d.uid, d.role || '', Object.entries(d.permissions || {}).sort(), d.babaCuidadora ?? null, d.lembretesHabilitados ?? null])).digest('hex');
  return raiz.runTransaction(async tx => {
    const [ator, alvo, exclusaoAtor, exclusaoAlvo, operacao, vinculo, vinculoAlvo] = await tx.getAll(db.doc(`users/${uid}`), ref,
      raiz.doc(`contaSolicitacoes/${uid}`), raiz.doc(`contaSolicitacoes/${d.uid}`), operacaoRef, raiz.doc(`vinculosUsuarios/${uid}`), raiz.doc(`vinculosUsuarios/${d.uid}`));
    if (ator.data()?.role !== 'admin' || ator.data()?.ativo === false || exclusaoAtor.data()?.etapa || exclusaoAlvo.data()?.etapa) falha('permission-denied', 'Acesso restrito à administração ativa.');
    if (!alvo.exists || alvo.data().ativo === false) falha('not-found', 'Conta ativa não encontrada neste grupo.');
    if (db.grupoId ? vinculoAlvo.data()?.ativo !== true || vinculoAlvo.data()?.grupoId !== db.grupoId : vinculoAlvo.exists) falha('permission-denied', 'O vínculo da conta de destino mudou.');
    const grupo = db.grupoId ? await tx.get(raiz.doc(`grupos/${db.grupoId}`)) : null;
    if (db.grupoId ? grupo.data()?.ativo !== true || vinculo.data()?.ativo !== true || vinculo.data()?.grupoId !== db.grupoId : vinculo.exists || (await tx.get(raiz.doc('migracoesGrupos/legado'))).data()?.bloqueada) falha('permission-denied', 'O vínculo de grupo mudou.');
    const comercial = grupo?.data()?.assinaturasAtivas === true, titular = grupo?.data()?.titularUid;
    if (comercial && uid !== titular) falha('permission-denied', 'Somente o titular gerencia acessos.');
    if (d.uid === titular && (d.operacao === 'suspender' || d.role !== 'admin')) falha('failed-precondition', 'O titular permanece como administrador ativo.');
    if (comercial && d.operacao === 'alterar' && d.role === 'admin' && d.uid !== titular) falha('failed-precondition', 'O grupo possui um único administrador: o titular.');
    if (comercial && d.operacao === 'alterar' && d.uid !== titular) await exigirRecurso(tx, db, uid, 'compartilhamento');
    if (operacao.exists) {
      if (operacao.data().assinatura !== assinaturaPedido) falha('already-exists', 'Esta tentativa já foi utilizada com outros dados.');
      return { uid: d.uid, jaProcessada: true };
    }
    let funcionarioId = alvo.data().funcionarioId || null, novoFuncionario = null;
    if (d.operacao === 'alterar' && d.role === 'funcionario') {
      funcionarioId ||= d.uid;
      if (typeof funcionarioId !== 'string' || !/^[\w-]{1,128}$/.test(funcionarioId)) falha('failed-precondition', 'Cadastro funcional precisa de revisão.');
      const funcionario = await tx.get(db.doc(`funcionarios/${funcionarioId}`));
      if (!funcionario.exists) {
        if (comercial) {
          const assinatura = await tx.get(raiz.doc(`assinaturasGrupos/${db.grupoId}`));
          const funcionarios = await tx.get(db.collection('funcionarios'));
          const uso = funcionarios.docs.filter(f => f.data().ativo !== false).length;
          if (!verificarCota(resolverAssinatura(assinatura.data()).direitos, 'funcionarios', uso).permitido) falha('resource-exhausted', 'Não há vaga de funcionário neste plano.');
        }
        novoFuncionario = db.doc(`funcionarios/${funcionarioId}`);
      }
    }
    const agora = FieldValue.serverTimestamp();
    if (d.operacao === 'suspender') tx.update(ref, { acessoCompartilhado: false, atualizadoEm: agora, atualizadoPor: uid });
    else {
      const permissions = d.role === 'consulta' ? { ...permissoesPadrao(d.role), ...d.permissions, accessPonto: false, manageUsers: false, realizarCompras: false } : permissoesPadrao(d.role);
      tx.update(ref, { role: d.role, permissions, funcionarioId, acessoCompartilhado: true,
        ...(d.babaCuidadora !== undefined ? { babaCuidadora: d.role === 'funcionario' && d.babaCuidadora } : {}),
        ...(d.lembretesHabilitados !== undefined ? { lembretesHabilitados: d.role === 'admin' && d.lembretesHabilitados } : {}), atualizadoEm: agora, atualizadoPor: uid });
      if (novoFuncionario) tx.create(novoFuncionario, { nome: alvo.data().nome || '', email: alvo.data().email || '', ativo: true, cargaSegSexMin: 480, cargaSabadoMin: 0, locaisPermitidos: [], criadoPor: uid, criadoEm: agora });
    }
    tx.create(operacaoRef, { assinatura: assinaturaPedido, uid, alvoUid: d.uid, operacao: d.operacao, criadoEm: agora });
    tx.create(db.collection('usuariosAuditoria').doc(), { acao: d.operacao === 'suspender' ? 'suspensao_compartilhamento' : 'alteracao_acesso', usuarioId: d.uid, executadoPor: uid, executadoEm: agora });
    if (grupo) tx.update(grupo.ref, { revisaoConta: FieldValue.increment(1), ...(comercial ? { cotasRevisao: FieldValue.increment(1) } : {}) });
    return { uid: d.uid };
  });
}
module.exports = { gerirAcesso };
