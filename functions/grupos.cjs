const { HttpsError } = require('firebase-functions/v2/https');
const { FieldValue } = require('firebase-admin/firestore');
const { createHash } = require('node:crypto');
const { bancoDoGrupo, bancoDoUsuario } = require('./grupos-contexto.cjs');
const falha = (codigo, mensagem) => { throw new HttpsError(codigo, mensagem); };
function texto(v, max) { if (typeof v !== 'string' || !v.trim() || v.trim().length > max) falha('invalid-argument', 'Confira o nome e os dados da conta.'); return v.trim(); }
const permissoes = role => ({ accessPonto: role !== 'consulta', accessAdmin: role === 'admin', manageUsers: role === 'admin', createTasks: role === 'admin', realizarCompras: role === 'admin' });

async function criarGrupo(raiz, request) {
  const uid = request.auth?.uid;
  if (!uid) falha('unauthenticated', 'Entre no app para criar seu grupo.');
  const nome = texto(request.data?.nome, 120), nomeGrupo = texto(request.data?.nomeGrupo, 80);
  const grupoId = `g_${uid}`, grupoRef = raiz.doc(`grupos/${grupoId}`), vinculo = raiz.doc(`vinculosUsuarios/${uid}`);
  return raiz.runTransaction(async tx => {
    const [v, antigo, grupo] = await tx.getAll(vinculo, raiz.doc(`users/${uid}`), grupoRef);
    if (v.exists) {
      if (v.data().grupoId === grupoId && grupo.data()?.titularUid === uid && grupo.data().ativo === true) return { grupoId, jaCriado: true };
      falha('failed-precondition', 'Esta conta já pertence a um grupo.');
    }
    if (antigo.exists) falha('failed-precondition', 'Esta conta já possui dados. Use a migração do grupo existente para preservá-los.');
    if (grupo.exists) falha('failed-precondition', 'Grupo em preparação. Entre em contato com o responsável.');
    const agora = FieldValue.serverTimestamp();
    tx.create(grupoRef, { nome: nomeGrupo, titularUid: uid, ativo: true, criadoEm: agora, schemaVersion: 1 });
    tx.create(vinculo, { grupoId, ativo: true, criadoEm: agora });
    tx.create(bancoDoGrupo(raiz, grupoId).doc(`users/${uid}`), { nome, email: request.auth.token?.email || '', role: 'admin', ativo: true, funcionarioId: null, permissions: permissoes('admin'), criadoPor: uid, criadoEm: agora });
    return { grupoId };
  });
}

async function criarMembro(raiz, auth, request) {
  const ator = request.auth?.uid;
  const banco = await bancoDoUsuario(raiz, ator);
  if (!banco.grupoId) falha('failed-precondition', 'Migre o grupo atual antes de usar este cadastro.');
  const perfil = (await banco.doc(`users/${ator}`).get()).data();
  if (perfil?.role !== 'admin' || perfil.ativo === false) falha('permission-denied', 'Somente administradores do grupo cadastram contas.');
  const d = request.data || {}, nome = texto(d.nome, 120), email = texto(d.email, 254).toLowerCase();
  if (!['admin', 'funcionario', 'consulta'].includes(d.role) || typeof d.senha !== 'string' || d.senha.length < 8 || d.senha.length > 128 || !/^[a-f0-9-]{36}$/.test(d.chaveOperacao || '')) falha('invalid-argument', 'Confira o perfil e use uma senha com pelo menos 8 caracteres.');
  const uid = 'm_' + createHash('sha256').update(`${banco.grupoId}:${d.chaveOperacao}`).digest('hex').slice(0, 48);
  const ref = banco.doc(`users/${uid}`), vinculo = raiz.doc(`vinculosUsuarios/${uid}`);
  const existente = (await ref.get()).data();
  if (existente) {
    if (existente.email !== email || existente.role !== d.role || existente.criadoPor !== ator) falha('failed-precondition', 'Esta operação já foi utilizada para outra conta.');
    return { uid, funcionarioId: existente.funcionarioId, jaCriado: true };
  }
  let criouLogin = false;
  try { await auth.createUser({ uid, displayName: nome, email, password: d.senha }); criouLogin = true; }
  catch (e) {
    if (['auth/uid-already-exists', 'auth/email-already-exists'].includes(e.code)) {
      const anterior = await auth.getUser(uid).catch(() => null);
      if (anterior?.email?.toLowerCase() !== email) falha('already-exists', 'Este email já possui uma conta. Use um email próprio para cada pessoa.');
    }
    else falha('invalid-argument', 'Não foi possível criar o login. Confira email e senha.');
  }
  try {
    await raiz.runTransaction(async tx => {
      const [atual, grupo, ocupado] = await tx.getAll(banco.doc(`users/${ator}`), raiz.doc(`grupos/${banco.grupoId}`), vinculo);
      if (atual.data()?.role !== 'admin' || atual.data().ativo === false || grupo.data()?.ativo !== true || ocupado.exists) falha('permission-denied', 'Cadastro não autorizado neste grupo.');
      const agora = FieldValue.serverTimestamp(), funcionarioId = d.role === 'funcionario' ? uid : null;
      tx.create(vinculo, { grupoId: banco.grupoId, ativo: true, criadoEm: agora });
      tx.create(ref, { nome, email, role: d.role, ativo: true, funcionarioId, permissions: permissoes(d.role), criadoPor: ator, criadoEm: agora });
      if (funcionarioId) tx.create(banco.doc(`funcionarios/${uid}`), { nome, email, ativo: true, cargaSegSexMin: 480, cargaSabadoMin: 0, locaisPermitidos: [], criadoPor: ator, criadoEm: agora });
    });
  } catch (e) {
    const confirmado = await ref.get().catch(() => null);
    if (confirmado?.exists && confirmado.data().email === email && confirmado.data().role === d.role && confirmado.data().criadoPor === ator) return { uid, funcionarioId: confirmado.data().funcionarioId, jaCriado: true };
    if (criouLogin && confirmado && !confirmado.exists) await auth.deleteUser(uid).catch(() => {});
    throw e;
  }
  return { uid, funcionarioId: d.role === 'funcionario' ? uid : null };
}
module.exports = { criarGrupo, criarMembro };
