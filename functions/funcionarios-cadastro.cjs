const { HttpsError } = require('firebase-functions/v2/https');
const { FieldValue } = require('firebase-admin/firestore');
const { bancoDoUsuario } = require('./grupos-contexto.cjs');
const { resolverAssinatura, verificarCota } = require('./assinaturas-dominio.cjs');
const falha = (codigo, mensagem) => { throw new HttpsError(codigo, mensagem); };

async function cadastrarFuncionario(raiz, request) {
  const uid = request.auth?.uid, d = request.data || {};
  const operacao = d.operacao;
  if (!['criar', 'garantir', 'reativar', 'arquivar'].includes(operacao)
    || Object.keys(d).some(k => !['operacao', 'id', 'nome'].includes(k))
    || d.nome !== undefined && (operacao !== 'criar' || typeof d.nome !== 'string' || !d.nome.trim() || d.nome.trim().length > 120)
    || typeof d.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(d.id)) falha('invalid-argument', 'Confira a operação e a identificação do funcionário.');
  const banco = await bancoDoUsuario(raiz, uid), ref = banco.doc(`funcionarios/${d.id}`);
  return raiz.runTransaction(async tx => {
    const refs = [banco.doc(`users/${uid}`), raiz.doc(`contaSolicitacoes/${uid}`), ref, raiz.doc(`vinculosUsuarios/${uid}`)];
    if (banco.grupoId) refs.push(raiz.doc(`grupos/${banco.grupoId}`), raiz.doc(`assinaturasGrupos/${banco.grupoId}`));
    else refs.push(raiz.doc('migracoesGrupos/legado'));
    const [perfil, exclusao, anterior, vinculo, grupo, assinatura] = await tx.getAll(...refs);
    if (perfil.data()?.role !== 'admin' || perfil.data()?.ativo === false || exclusao.data()?.etapa) falha('permission-denied', 'Somente administradores ativos cadastram funcionários.');
    if (banco.grupoId ? vinculo.data()?.ativo !== true || vinculo.data()?.grupoId !== banco.grupoId || grupo.data()?.ativo !== true : vinculo.exists || grupo.data()?.bloqueada) falha('permission-denied', 'O acesso ao grupo mudou. Entre novamente.');
    const ativo = banco.grupoId && grupo.data().assinaturasAtivas === true;
    if (ativo && grupo.data().titularUid !== uid) falha('permission-denied', 'Somente o titular gerencia cadastros de funcionários.');
    if (operacao === 'criar' && anterior.exists) {
      if (anterior.data().criadoPor !== uid || d.nome !== undefined && anterior.data().nome !== d.nome.trim()) falha('already-exists', 'Identificação já utilizada.');
      return { id: d.id, jaCriado: true };
    }
    if (operacao === 'garantir' && anterior.exists) return { id: d.id, jaCriado: true };
    if (operacao === 'reativar' && !anterior.exists) falha('not-found', 'Funcionário não encontrado.');
    if (operacao === 'arquivar') {
      if (!anterior.exists) falha('not-found', 'Funcionário não encontrado.');
      const dias = await tx.get(banco.collection('dias').where('funcionarioId', '==', d.id));
      if (dias.docs.some(doc => doc.data().entrada && !doc.data().saida)) falha('failed-precondition', 'Conclua ou revise a jornada aberta antes de arquivar o funcionário.');
      tx.update(ref, { ativo: false, arquivadoEm: FieldValue.serverTimestamp(), arquivadoPor: uid });
      if (ativo) tx.update(grupo.ref, { cotasRevisao: FieldValue.increment(1) });
      return { id: d.id, arquivado: true };
    }
    if (anterior.exists && anterior.data().ativo !== false) return { id: d.id, jaCriado: true };
    let pessoa;
    if (operacao === 'garantir') {
      pessoa = await tx.get(banco.doc(`users/${d.id}`));
      if (!pessoa.exists || pessoa.data().ativo === false) falha('not-found', 'Conta do funcionário não encontrada.');
    }
    if (ativo) {
      const { direitos } = resolverAssinatura(assinatura.data());
      const funcionarios = await tx.get(banco.collection('funcionarios'));
      const uso = funcionarios.docs.filter(doc => doc.data().ativo !== false).length;
      const cota = verificarCota(direitos, 'funcionarios', uso);
      if (!cota.permitido) falha('resource-exhausted', `Seu plano permite até ${cota.limite} funcionários cadastrados.`);
    }
    const agora = FieldValue.serverTimestamp();
    if (anterior.exists) tx.update(ref, { ativo: true, atualizadoPor: uid, atualizadoEm: agora });
    else tx.create(ref, { nome: d.nome?.trim() || pessoa?.data().nome || '', email: pessoa?.data().email || '', ativo: true, cargaSegSexMin: 480, cargaSabadoMin: 0, locaisPermitidos: [], intervaloPrevistoMin: 60, criadoPor: uid, criadoEm: agora });
    if (ativo) tx.update(grupo.ref, { cotasRevisao: FieldValue.increment(1) });
    return { id: d.id };
  });
}
module.exports = { cadastrarFuncionario };
