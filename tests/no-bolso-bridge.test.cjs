const test = require('node:test');
const assert = require('node:assert/strict');
const { createNoBolsoBridge, monthRange } = require('../functions/no-bolso-bridge.cjs');

test('ponte: trimestre usa meses locais e rejeita períodos inválidos', () => {
  const r = monthRange('2026-01');
  assert.deepEqual(r.months, ['2025-11', '2025-12', '2026-01']);
  assert.equal(r.from.toISOString(), '2025-11-01T03:00:00.000Z');
  assert.equal(r.until.toISOString(), '2026-02-01T03:00:00.000Z');
  for (const month of ['2026-13', '2026-00', '0000-01', '../users']) assert.throws(() => monthRange(month));
});

test('ponte real no emulador: vínculo, isolamento por finalizador, expiração e revogação', { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async t => {
  assert.match(process.env.GCLOUD_PROJECT, /^demo-/);
  const admin = require('../functions/node_modules/firebase-admin');
  const app = admin.initializeApp({ projectId: `${process.env.GCLOUD_PROJECT}-bridge` }, 'bridge-test');
  const db = app.firestore();
  t.after(async () => { await app.delete(); });
  let clock = Date.parse('2026-10-16T12:00:00Z');
  const api = createNoBolsoBridge({ db, pilotUid: 'target', now: () => clock, assertAuthUser: async uid => assert.ok(['source-a', 'source-b'].includes(uid)) });
  await db.doc('users/source-a').set({ role: 'admin', ativo: true, email: 'source@example.test' });
  await db.doc('users/source-b').set({ role: 'admin', ativo: true, email: 'other@example.test' });
  assert.equal((await api.summary('target', '2026-10')).linked, false);
  let code = await api.grantFor('source-a');
  clock += 600001;
  await assert.rejects(api.redeem('target', code.code), { status: 403 });
  code = await api.grantFor('source-a');
  assert.notEqual((await db.doc('noBolsoGrants/source-a').get()).data().hash, code.code.split('.')[1]);
  await api.redeem('target', code.code);
  await assert.rejects(api.redeem('other', code.code), { status: 403 });
  await assert.rejects(api.grantFor('source-a'), { status: 409 });
  for (const [id, buyer, status, date, total] of [
    ['own', 'source-a', 'finalizada', '2026-10-01T03:00:00Z', 10000],
    ['other', 'source-b', 'finalizada', '2026-10-01T03:00:00Z', 90000],
    ['annulled', 'source-a', 'anulada', '2026-10-01T03:00:00Z', 80000],
    ['boundary', 'source-a', 'finalizada', '2026-11-01T02:59:59Z', 500],
    ['future', 'source-a', 'finalizada', '2026-11-01T03:00:00Z', 70000],
  ]) await db.doc(`comprasListas/${id}`).set({ criadaPor: 'source-b', finalizadaPor: buyer, status, finalizadaEm: new Date(date), totalCentavos: total });
  const summary = await api.summary('target', '2026-10');
  assert.equal(summary.months.find(m => m.month === '2026-10').totalCentavos, 10500);
  assert.equal(summary.months.find(m => m.month === '2026-10').compras, 2);
  assert.equal('listas' in summary, false);
  await assert.rejects(api.summary('other', '2026-10'), { status: 403 });
  await db.doc('users/source-a').update({ ativo: false });
  await assert.rejects(api.resolve('target'), { status: 403 });
  await db.doc('users/source-a').update({ ativo: true });
  await api.unlink('target');
  assert.equal((await api.summary('target', '2026-10')).linked, false);
  code = await api.grantFor('source-a');
  await api.redeem('target', code.code);
  await api.revokeFromAP('source-a');
  assert.equal((await api.summary('target', '2026-10')).linked, false);
});
