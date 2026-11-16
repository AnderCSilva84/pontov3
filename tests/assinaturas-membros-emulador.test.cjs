const test = require('node:test'), assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

test('assinaturas: cadastro de membros aplica direitos e cota na transação', { skip: !process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST }, async t => {
  assert.match(process.env.GCLOUD_PROJECT, /^demo-/);
  const admin = require('../functions/node_modules/firebase-admin');
  const { criarMembro } = require('../functions/grupos.cjs');
  const app = admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT }, 'membros-' + randomUUID());
  const db = app.firestore(), auth = app.auth(), grupoId = 'cotas_' + randomUUID(), uid = 'titular_' + randomUUID();
  const grupo = db.doc(`grupos/${grupoId}`), assinatura = db.doc(`assinaturasGrupos/${grupoId}`);
  const contas = [];
  t.after(async () => { for (const conta of contas) await auth.deleteUser(conta).catch(() => {}); await app.delete(); });
  await grupo.set({ ativo: true, titularUid: uid, assinaturasAtivas: true });
  await db.doc(`vinculosUsuarios/${uid}`).set({ ativo: true, grupoId });
  await db.doc(`grupos/${grupoId}/users/${uid}`).set({ ativo: true, role: 'admin' });
  const request = (role = 'funcionario') => ({ auth: { uid }, data: { nome: 'Teste', email: `membro-${randomUUID()}@example.test`, senha: 'Ficticia-123456', role, chaveOperacao: randomUUID() } });
  const criar = async r => { const resultado = await criarMembro(db, auth, r); contas.push(resultado.uid); return resultado; };
  const pago = () => assinatura.set({ versao: 1, plano: 'prata', verificado: true, estado: 'ativo', provedor: 'google_play', inicioEm: Date.now() - 10000, validoAte: Date.now() + 600000 });
  await t.test('Free bloqueia compartilhamento e remove o login recém-criado', async () => {
    const r = request('consulta');
    await assert.rejects(criar(r), { code: 'failed-precondition' });
    await assert.rejects(auth.getUserByEmail(r.data.email), { code: 'auth/user-not-found' });
    assert.equal((await db.collection(`grupos/${grupoId}/users`).get()).size, 1);
  });
  await t.test('plano pago não cria administrador extra', async () => {
    await pago(); await assert.rejects(criar(request('admin')), { code: 'failed-precondition' });
  });
  await t.test('duas inclusões disputam a última vaga; inativo libera vaga e campos legados contam', async () => {
    for (let i = 0; i < 4; i++) await db.doc(`grupos/${grupoId}/funcionarios/legado${i}`).set({ nome: 'Legado' });
    await db.doc(`grupos/${grupoId}/funcionarios/arquivado`).set({ ativo: false });
    const resultados = await Promise.allSettled([criar(request()), criar(request())]);
    assert.equal(resultados.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(resultados.find(r => r.status === 'rejected').reason.code, 'resource-exhausted');
    assert.equal((await db.collection(`grupos/${grupoId}/funcionarios`).get()).docs.filter(d => d.data().ativo !== false).length, 5);
    const r = request('consulta'), criado = await criar(r);
    assert.equal((await criar(r)).uid, criado.uid); // Repetição não consome outra vaga.
  });
  await t.test('expiração bloqueia nova conta e preserva funcionários e contas existentes', async () => {
    const antes = (await db.collection(`grupos/${grupoId}/users`).get()).size;
    await assinatura.update({ validoAte: Date.now() - 1 });
    await assert.rejects(criar(request('consulta')), { code: 'failed-precondition' });
    assert.equal((await db.collection(`grupos/${grupoId}/users`).get()).size, antes);
    assert.equal((await db.collection(`grupos/${grupoId}/funcionarios`).get()).size, 6);
  });
  await t.test('grupos em transição preservam o comportamento atual', async () => {
    await grupo.update({ assinaturasAtivas: false });
    assert.ok((await criar(request('consulta'))).uid);
  });
});
