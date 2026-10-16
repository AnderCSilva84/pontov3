import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

if (!['127.0.0.1:8080', 'localhost:8080'].includes(process.env.FIRESTORE_EMULATOR_HOST)) {
  throw new Error('Execute somente no emulador Firestore local.');
}
const require = createRequire(new URL('../functions/index.js', import.meta.url));
const admin = require('firebase-admin');
const { criarPush, deveNotificar } = require('./push.cjs');
admin.initializeApp({ projectId: 'demo-app-ponto-audit' });
const db = admin.firestore();
const hash = (value) => createHash('sha256').update(value).digest('hex');
const lotes = [];
let transiente = true;
const fakeAdmin = { firestore: admin.firestore, messaging: () => ({ sendEach: async (messages) => {
  assert.ok(messages.length <= 500);
  lotes.push(messages);
  return { responses: messages.map((message) => {
    assert.equal(message.notification, undefined, 'Somente data: evita duplicar notificação no worker.');
    assert.ok(message.data.uid);
    if (message.token.includes('invalid')) return { success: false, error: { code: 'messaging/registration-token-not-registered' } };
    if (message.token.includes('temporary') && transiente) { transiente = false; return { success: false, error: { code: 'messaging/server-unavailable' } }; }
    return { success: true, messageId: 'fake-message' };
  }) };
} }) };
const push = criarPush({ admin: fakeAdmin });
const request = (uid, token) => ({ auth: uid ? { uid } : null, data: { token, uid } });
const token = 'fake-token-not-a-real-device-123456';
const trigger = (id, before = { solicitado: false }, after = { solicitado: true, comprado: false }) => ({ id, time: new Date().toISOString(), data: { before: { data: () => before }, after: { data: () => after } } });
try {
  await db.collection('users').doc('alice').set({ role: 'admin', ativo: true });
  await db.collection('users').doc('bob').set({ role: 'funcionario', ativo: true });
  await db.collection('users').doc('inactive').set({ role: 'funcionario', ativo: false });
  await assert.rejects(push.registrarDispositivoPush.run(request(null, token)), { code: 'unauthenticated' });
  await assert.rejects(push.registrarDispositivoPush.run(request('inactive', token)), { code: 'permission-denied' });
  await assert.rejects(push.registrarDispositivoPush.run(request('alice', 'short')), { code: 'invalid-argument' });
  await assert.rejects(push.registrarDispositivoPush.run({ ...request('alice', token), data: { token, uid: 'bob' } }), { code: 'permission-denied' });
  await push.registrarDispositivoPush.run(request('alice', token));
  await push.registrarDispositivoPush.run(request('bob', token));
  assert.equal((await db.collection('pushDispositivos').doc(hash(token)).get()).data().uid, 'bob');
  await push.removerDispositivoPush.run(request('alice', token));
  assert.equal((await db.collection('pushDispositivos').doc(hash(token)).get()).exists, true);
  await push.testarNotificacaoPush.run(request('bob', token));
  assert.equal(lotes.at(-1).length, 1);
  assert.equal(lotes.at(-1)[0].data.uid, 'bob');
  await push.removerDispositivoPush.run(request('bob', token));
  assert.equal((await db.collection('pushDispositivos').doc(hash(token)).get()).exists, false);

  const batch = db.batch();
  for (const suffix of ['normal', 'invalid', 'temporary']) {
    await push.registrarDispositivoPush.run(request('alice', `fake-token-${suffix}-01234567890123456789`));
  }
  batch.set(db.collection('pushDispositivos').doc('inactive-test'), { uid: 'inactive', token: 'fake-token-inactive-0123456789' });
  batch.set(db.collection('pushDispositivos').doc('deleted-test'), { uid: 'deleted', token: 'fake-token-deleted-0123456789' });
  await batch.commit();
  const evento = trigger('partial-retry');
  await assert.rejects(push.alertaListaCompras.run(evento), /nova tentativa/);
  const ultimo = lotes.at(-1);
  assert.equal(ultimo.length, 3);
  assert.ok(ultimo.every((m) => m.data.uid === 'alice'));
  assert.equal((await db.collection('pushDispositivos').doc(hash('fake-token-invalid-01234567890123456789')).get()).exists, false);
  await push.alertaListaCompras.run(evento);
  assert.equal(lotes.at(-1).length, 1);
  assert.match(lotes.at(-1)[0].token, /temporary/);
  const enviados = lotes.length;
  await push.alertaListaCompras.run(evento);
  await push.alertaListaCompras.run(trigger('no-loop', { solicitado: true, comprado: false }, { solicitado: false, comprado: true }));
  await push.alertaListaCompras.run({ ...trigger('expired-event'), time: new Date(Date.now() - 86401000).toISOString() });
  assert.equal(lotes.length, enviados);

  for (let i = 0; i < 501; i += 450) {
    const lote = db.batch();
    for (let j = i; j < Math.min(501, i + 450); j++) lote.set(db.collection('pushDispositivos').doc(`bulk-${j}`), { uid: 'bob', token: `fake-bulk-token-${j}` });
    await lote.commit();
  }
  const inicio = lotes.length;
  await push.alertaNotificacoes.run({ id: 'task-event', time: new Date().toISOString(), data: { data: () => ({ titulo: 'Nova tarefa', mensagem: 'Confira o calendário.' }) } });
  assert.deepEqual(lotes.slice(inicio).map((lote) => lote.length), [500, 3]);
  assert.equal(lotes.at(-1)[0].data.url, '/ponto');
  assert.equal(deveNotificar(null, { solicitado: true, comprado: false }), true);
  assert.equal(deveNotificar({ solicitado: true }, { solicitado: true }), false);
  await db.collection('users').doc('bob').set({ role: 'funcionario', ativo: true, funcionarioId: 'func-bob', nome: 'Funcionária de teste' });
  await db.collection('funcionarios').doc('func-bob').set({ ativo: true, nome: 'Funcionária de teste' });
  await db.collection('users').doc('admin2').set({ role: 'admin', ativo: true });
  await db.collection('users').doc('admin-inactive').set({ role: 'admin', ativo: false });
  await db.collection('users').doc('consulta').set({ role: 'consulta', ativo: true });
  await push.registrarDispositivoPush.run(request('admin2', 'fake-token-admin2-01234567890123456789'));
  await push.registrarDispositivoPush.run(request('consulta', 'fake-token-consulta-01234567890123456789'));
  await db.collection('pushDispositivos').doc('inactive-admin-device').set({ uid: 'admin-inactive', token: 'fake-token-inactive-admin-0123456789' });
  const eventoPonto = (id, tipo, extras = {}) => ({ id, time: new Date().toISOString(), data: { data: () => ({ tipo, funcionarioId: 'func-bob', registradoPor: 'bob', hora: '08:15', dataKey: '2026-10-13', ...extras }) } });
  const antesPonto = lotes.length;
  await push.alertaRegistroPonto.run(eventoPonto('ponto-entrada', 'ENTRADA'));
  assert.equal(lotes.length, antesPonto + 1);
  assert.equal(lotes.at(-1).length, 3);
  assert.ok(lotes.at(-1).every((m) => ['alice', 'admin2'].includes(m.data.uid)));
  assert.match(lotes.at(-1)[0].data.body, /Funcionária de teste registrou entrada às 08:15 \(13\/10\/2026\)/);
  assert.equal(lotes.at(-1)[0].data.url, '/admin');
  await push.alertaRegistroPonto.run(eventoPonto('ponto-entrada', 'ENTRADA'));
  assert.equal(lotes.length, antesPonto + 1);
  await push.alertaRegistroPonto.run(eventoPonto('ponto-saida', 'SAIDA', { hora: '17:30' }));
  assert.match(lotes.at(-1)[0].data.body, /saída às 17:30/);
  const depoisPonto = lotes.length;
  await push.alertaRegistroPonto.run(eventoPonto('ponto-intervalo', 'SAIDA_INTERVALO'));
  await push.alertaRegistroPonto.run(eventoPonto('ponto-volta', 'ENTRADA_INTERVALO'));
  await push.alertaRegistroPonto.run(eventoPonto('ponto-admin', 'ENTRADA', { registradoPor: 'alice' }));
  await push.alertaRegistroPonto.run(eventoPonto('ponto-sem-autor', 'ENTRADA', { registradoPor: undefined }));
  await push.alertaRegistroPonto.run(eventoPonto('ponto-outro-funcionario', 'ENTRADA', { funcionarioId: 'func-other' }));
  await push.alertaRegistroPonto.run({ ...eventoPonto('ponto-expirado', 'ENTRADA'), time: new Date(Date.now() - 86401000).toISOString() });
  assert.equal(lotes.length, depoisPonto);
  console.log('Push: verificações anteriores passaram; entrada e saída notificam apenas administradores ativos, com nome, hora e data. Intervalos, autor inválido, ajuste administrativo e reentrega não geram avisos indevidos. FCM simulado; nenhum aviso real enviado.');
} finally {
  await db.terminate();
  await admin.app().delete();
}
