const test = require('node:test'), assert = require('node:assert/strict');
const { consultarNoBolso } = require('../functions/no-bolso-consulta.cjs');
test('consulta No Bolso recusa comandos, identificadores de outra conta e campos extras antes de acessar banco', async () => {
  const banco = new Proxy({}, { get() { throw Error('Não pode consultar banco com comando inválido'); } });
  await assert.rejects(consultarNoBolso(banco, { data: { consulta: 'rankings' } }), { code: 'unauthenticated' });
  for (const data of [{ consulta: 'vincular' }, { consulta: 'desvincular' }, { operacao: 'cupomConfirmar' }, { consulta: 'sincronizar' }, { consulta: 'minhas-compras' }, { consulta: 'rankings', uid: 'outro' }, { consulta: 'produto', produtoId: '../privado' }, { consulta: 'rankings', grupoId: 'outro' }, { consulta: 'rankings', dias: 900 }]) await assert.rejects(consultarNoBolso(banco, { auth: { uid: 'a' }, data }), { code: 'invalid-argument' });
});

test('consulta autenticada resolve grupo no servidor, não expõe finanças e não escreve', { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async t => {
  const admin = require('../functions/node_modules/firebase-admin');
  assert.match(process.env.GCLOUD_PROJECT, /^demo-/);
  const app = admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT + '-leitura-' + Date.now() }, 'consulta');
  const db = app.firestore(); t.after(() => app.delete());
  const momento = Date.parse('2026-10-22T12:00:00Z');
  for (const [uid, grupo] of [['a', 'ga'], ['b', 'gb']]) {
    await db.doc(`vinculosUsuarios/${uid}`).set({ grupoId: grupo, ativo: true });
    await db.doc(`grupos/${grupo}`).set({ ativo: true });
    await db.doc(`grupos/${grupo}/users/${uid}`).set({ ativo: true, role: 'admin' });
    await db.doc(`grupos/${grupo}/comprasPrecos/preco`).set({ produtoId: 'arroz', nomeSnapshot: grupo, apresentacao: '1 kg', unidadeCompra: 'un', supermercadoId: 'loja', supermercadoNome: `Loja (${grupo})`, compradoEm: new Date(momento - 1000), quantidadeComprada: 1, precoUnitarioCentavos: uid === 'a' ? 100 : 999, listaId: 'privada', uid: 'privado' });
    await db.doc(`grupos/${grupo}/financeiro/privado`).set({ valor: 123, segredo: grupo });
  }
  const call = (uid, data) => consultarNoBolso(db, { auth: { uid }, data }, momento);
  const a = await call('a', { consulta: 'produto', produtoId: 'arroz' }), b = await call('b', { consulta: 'produto', produtoId: 'arroz' });
  assert.equal(a.modo, 'consulta'); assert.equal(a.ofertas[0].precoUnitarioCentavos, 100); assert.equal(b.ofertas[0].precoUnitarioCentavos, 999);
  assert.equal(JSON.stringify(a).includes('privad'), false);
  assert.deepEqual((await call('a', { consulta: 'status' })).consultas, ['rankings', 'produto']);
  assert.equal((await call('a', { consulta: 'rankings' })).produtos[0].nome, 'ga');
  const antes = (await db.doc('grupos/ga/financeiro/privado').get()).updateTime.toMillis();
  await call('a', { consulta: 'rankings' });
  assert.equal((await db.doc('grupos/ga/financeiro/privado').get()).updateTime.toMillis(), antes);
  assert.equal((await db.collection('grupos/ga/comprasPrecos').get()).size, 1);
  assert.equal((await db.collection('noBolsoGrants').get()).size, 0);
  await db.doc('grupos/ga/users/a').update({ ativo: false });
  await assert.rejects(call('a', { consulta: 'rankings' }), { code: 'permission-denied' });
});
