import assert from 'node:assert/strict';

const project = 'demo-app-ponto-audit';
const host = process.env.FIRESTORE_EMULATOR_HOST;
if (!host || !['127.0.0.1:8080', 'localhost:8080'].includes(host)) {
  throw new Error('Execute apenas pelo emulador local do projeto demo.');
}
const base = `http://${host}/v1/projects/${project}/databases/(default)/documents`;
function token(uid) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: uid, user_id: uid, aud: project, iss: `https://securetoken.google.com/${project}`, iat: now, exp: now + 3600, firebase: { sign_in_provider: 'password' } })}.`;
}
function fields(values) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, typeof value === 'boolean' ? { booleanValue: value } : { stringValue: value }]));
}
async function write(path, values, user = 'owner', mask = []) {
  const query = mask.length ? '?' + mask.map((key) => `updateMask.fieldPaths=${encodeURIComponent(key)}`).join('&') : '';
  const response = await fetch(`${base}/${path}${query}`, { method: 'PATCH', headers: { Authorization: `Bearer ${user === 'owner' ? 'owner' : token(user)}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: fields(values) }) });
  return response.status;
}
assert.equal(await write('users/employee', { role: 'funcionario', funcionarioId: 'employee', ativo: true }), 200);
assert.equal(await write('users/inactive', { role: 'funcionario', funcionarioId: 'inactive', ativo: false }), 200);
assert.equal(await write('funcionarios/employee', { ativo: true }), 200);
assert.equal(await write('dias/employee_2026-10-13', { funcionarioId: 'employee', dataKey: '2026-10-13', entrada: '08:00' }), 200);
assert.equal(await write('dias/employee_2026-10-13', { entrada: '07:00' }, 'employee', ['entrada']), 403);
assert.equal(await write('dias/new', { funcionarioId: 'employee', entrada: '07:00' }, 'employee'), 403);
assert.equal(await write('registros/new', { funcionarioId: 'employee', tipo: 'ENTRADA' }, 'employee'), 403);
assert.equal(await write('users/employee', { fcmToken: 'test-token' }, 'employee', ['fcmToken']), 200);
assert.equal(await write('users/employee', { role: 'admin' }, 'employee', ['role']), 403);
assert.equal(await write('users/inactive', { fcmToken: 'test-token' }, 'inactive', ['fcmToken']), 403);
assert.equal(await write('tarefas/task', { titulo: 'Original', diaSemana: 'terca', dataAgendada: '2026-10-13', solicitadoPor: 'admin', solicitadoPorNome: 'Admin', concluida: false }), 200);
assert.equal(await write('tarefas/task', { titulo: 'Alterado', concluida: true, concluidaPor: 'employee' }, 'employee', ['titulo', 'concluida', 'concluidaPor']), 403);
assert.equal(await write('listaCompras/item', { solicitado: true, comprado: false, solicitadoPor: 'other' }), 200);
assert.equal(await write('listaCompras/item', { solicitadoPor: 'employee', comprado: false }, 'employee', ['solicitadoPor', 'comprado']), 403);
for (const colecao of ['pushDispositivos', 'pushEnvios', 'pushEventos']) {
  assert.equal(await write(`${colecao}/forged`, { uid: 'employee' }, 'employee'), 403);
}
console.log('Regras: 11 verificações de autorização passaram; dados apenas no emulador demo.');
