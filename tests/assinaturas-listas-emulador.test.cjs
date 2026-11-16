const test = require('node:test'), assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

test('cotas de listas: todas as modalidades, concorrência, histórico e migração', { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async t => {
  assert.match(process.env.GCLOUD_PROJECT, /^demo-/);
  const admin = require('../functions/node_modules/firebase-admin');
  const app = admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT });
  const db = app.firestore(), { comprasOperacao } = require('../functions/compras.cjs');
  t.after(() => app.delete());
  async function fixture(plano = 'free') {
    const uid = 'listas_' + randomUUID(), grupoId = 'g_' + uid;
    await db.doc(`grupos/${grupoId}`).set({ titularUid: uid, ativo: true, assinaturasAtivas: true });
    await db.doc(`vinculosUsuarios/${uid}`).set({ grupoId, ativo: true });
    await db.doc(`grupos/${grupoId}/users/${uid}`).set({ nome: 'Teste', role: 'admin', ativo: true });
    if (plano !== 'free') await db.doc(`assinaturasGrupos/${grupoId}`).set({ versao: 1, plano, estado: 'ativo', verificado: true, provedor: 'google_play', inicioEm: Date.now() - 10000, validoAte: Date.now() + 600000 });
    const listas = db.collection(`grupos/${grupoId}/comprasListas`);
    const op = (operacao, dados = {}) => comprasOperacao.run({ auth: { uid }, data: { operacao, ...dados } });
    const criar = listaId => op('criar', { listaId, titulo: 'Lista de teste' });
    return { uid, grupoId, listas, op, criar };
  }
  for (const [plano, limite] of [['free', 3], ['prata', 10], ['ouro', 30], ['diamante', 60]]) {
    await t.test(`${plano}: somente uma inclusão ocupa a última vaga de ${limite}`, async () => {
      const f = await fixture(plano), batch = db.batch();
      for (let i = 0; i < limite - 1; i++) batch.set(f.listas.doc('anterior' + i), { status: i % 2 ? 'rascunho' : 'em_compra', versao: 1, criadaPor: f.uid });
      batch.set(f.listas.doc('historico'), { status: 'finalizada', versao: 1 });
      await batch.commit();
      const resultados = await Promise.allSettled([f.criar('nova-a'), f.criar('nova-b')]);
      assert.equal(resultados.filter(r => r.status === 'fulfilled').length, 1);
      assert.equal(resultados.find(r => r.status === 'rejected').reason.code, 'resource-exhausted');
      const listaId = resultados.find(r => r.status === 'fulfilled').value.listaId;
      assert.equal((await f.criar(listaId)).listaId, listaId);
      await f.op('iniciar', { listaId, versao: 1 });
      assert.equal((await f.listas.doc(listaId).get()).data().status, 'em_compra');
      assert.equal((await f.listas.where('status', 'in', ['rascunho', 'em_compra']).get()).size, limite);
      await f.op('excluir', { listaId, versao: 2 });
      await f.criar('apos-exclusao');
      assert.equal((await f.listas.doc('historico').get()).data().status, 'finalizada');
    });
  }
  await t.test('migração da lista antiga respeita vagas, é atômica e repetível', async () => {
    const f = await fixture();
    for (const id of ['a', 'b', 'c']) await f.criar(id);
    await assert.rejects(f.op('inicializar'), { code: 'resource-exhausted' });
    assert.equal((await f.listas.doc('legado-v1').get()).exists, false);
    assert.equal((await db.collection(`grupos/${f.grupoId}/categoriasCompras`).get()).size, 0);
    await f.op('excluir', { listaId: 'a', versao: 1 });
    await f.op('inicializar');
    assert.equal((await f.op('inicializar')).jaMigrado, true);
    assert.equal((await f.listas.where('status', 'in', ['rascunho', 'em_compra']).get()).size, 3);
  });
  await t.test('expiração preserva excesso e histórico; grupo em transição mantém comportamento', async () => {
    const f = await fixture('prata');
    for (const id of ['a', 'b', 'c', 'd']) await f.criar(id);
    await db.doc(`assinaturasGrupos/${f.grupoId}`).update({ validoAte: Date.now() - 1 });
    await assert.rejects(f.criar('excesso'), { code: 'resource-exhausted' });
    assert.equal((await f.listas.get()).size, 4);
    await f.op('excluir', { listaId: 'a', versao: 1 });
    await assert.rejects(f.criar('ainda-cheio'), { code: 'resource-exhausted' });
    await f.op('excluir', { listaId: 'b', versao: 1 });
    await f.criar('vaga-liberada');
    await db.doc(`grupos/${f.grupoId}`).update({ assinaturasAtivas: false });
    await f.criar('transicao');
    assert.equal((await f.listas.where('status', 'in', ['rascunho', 'em_compra']).get()).size, 4);
  });
});
