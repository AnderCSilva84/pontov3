const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readFileSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { exigirEmuladoresLocais, validarOperacaoQrLocal } = require('../functions/teste-local.cjs');
const envLocal = { GCLOUD_PROJECT: 'ap1303-android-push-teste', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9098', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8877' };

test('seed exige projeto aprovado e os dois emuladores nas portas exatas', () => {
  assert.equal(exigirEmuladoresLocais(envLocal), envLocal.GCLOUD_PROJECT);
  for (const alteracao of [{ FIREBASE_AUTH_EMULATOR_HOST: undefined }, { FIRESTORE_EMULATOR_HOST: undefined }, { FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9098' }, { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' }, { GCLOUD_PROJECT: 'ponto-app-1c55a' }, { GCLOUD_PROJECT: 'outro' }, { GOOGLE_CLOUD_PROJECT: 'ponto-app-1c55a' }]) assert.throws(() => exigirEmuladoresLocais({ ...envLocal, ...alteracao }));
});

test('seed inválido falha antes de carregar qualquer Firebase Admin', () => {
  const codigo = readFileSync('scripts/seed-compras-demo.cjs', 'utf8');
  const imports = [];
  assert.throws(() => vm.runInNewContext(codigo, { require: nome => {
    imports.push(nome);
    if (nome === '../functions/teste-local.cjs') return { exigirEmuladoresLocais: () => exigirEmuladoresLocais({}) };
    throw new Error('Admin não pode ser carregado');
  } }), /Teste bloqueado/);
  assert.deepEqual(imports, ['../functions/teste-local.cjs']);
});

test('modo QR desvia index antes de carregar inicializações e gatilhos normais', () => {
  const modulo = { exports: {} }, imports = [];
  const executar = vm.runInNewContext(`(function(require,module,exports,process){${readFileSync('functions/index.js', 'utf8')}\n})`);
  const handler = {};
  executar(nome => { imports.push(nome); assert.equal(nome, './qr-local.cjs'); return { comprasOperacao: handler }; }, modulo, modulo.exports, { env: { AP1303_QR_LOCAL: 'true' } });
  assert.deepEqual(imports, ['./qr-local.cjs']); assert.equal(modulo.exports.comprasOperacao, handler);
});

test('entrada local exporta apenas Compras e bloqueia integrações e SEFA antes do handler real', async () => {
  let chamadas = 0, inicializado;
  const exports = {};
  class HttpsError extends Error {}
  vm.runInNewContext(readFileSync('functions/qr-local.cjs', 'utf8'), { exports, require: nome => {
    if (nome === './teste-local.cjs') return { exigirEmuladoresLocais: () => exigirEmuladoresLocais(envLocal), validarOperacaoQrLocal };
    if (nome === 'firebase-admin') return { initializeApp: config => { inicializado = config.projectId; } };
    if (nome === 'firebase-functions/v2/https') return { onCall: (_op, fn) => fn, HttpsError };
    if (nome === './compras.cjs') return { comprasOperacao: { run: async () => { chamadas++; return 'local'; } } };
    throw new Error('Import não permitido: ' + nome);
  } });
  assert.deepEqual(Object.keys(exports), ['comprasOperacao']); assert.equal(inicializado, envLocal.GCLOUD_PROJECT);
  for (const data of [{ operacao: 'noBolsoGerarCodigo' }, { operacao: 'cupomPreparar', automatico: true }, { operacao: 'testarNotificacaoPush' }]) assert.throws(() => exports.comprasOperacao({ data }));
  assert.equal(chamadas, 0);
  assert.equal(await exports.comprasOperacao({ data: { operacao: 'cupomPreparar', texto: 'teste local', automatico: false } }), 'local');
  assert.equal(chamadas, 1);
});

test('FCM emulado não lê dados nem chama mensageria; caminho normal continua disponível', async () => {
  const { criarPush } = require('../functions/push.cjs');
  const chaves = ['FUNCTIONS_EMULATOR', 'FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'AP1303_QR_LOCAL'];
  const antes = Object.fromEntries(chaves.map(k => [k, process.env[k]]));
  const enviar = criarPush({ admin: {}, db: { collection() { throw new Error('caminho normal'); } }, somenteEnvio: true });
  try {
    chaves.forEach(k => delete process.env[k]);
    for (const [k, v] of [['FUNCTIONS_EMULATOR', 'true'], ['FIRESTORE_EMULATOR_HOST', '127.0.0.1:8877'], ['FIREBASE_AUTH_EMULATOR_HOST', '127.0.0.1:9098'], ['AP1303_QR_LOCAL', 'true']]) {
      process.env[k] = v; assert.equal(await enviar('teste', 'teste', '/', 'local'), 0); delete process.env[k];
    }
    await assert.rejects(enviar('teste', 'teste', '/', 'local'), /caminho normal/);
  } finally { for (const k of chaves) { if (antes[k] === undefined) delete process.env[k]; else process.env[k] = antes[k]; } }
});

test('push Android fica fora da montagem em emuladores e permanece normal fora deles', () => {
  const codigo = readFileSync('src/App.jsx', 'utf8').match(/const androidPush = .*;/)[0];
  for (const emuladores of [true, false]) assert.equal(vm.runInNewContext(codigo + '\nandroidPush()', { ambiente: { emuladores }, androidPushDisponivel: () => true }), !emuladores);
});

test('entrada real do SDK carrega somente o backend local, com rede bloqueada no processo do teste', () => {
  const codigo = `
    require('node:net').Socket.prototype.connect = function(){throw Error('Rede proibida no teste');};
    globalThis.fetch = function(){throw Error('Rede proibida no teste');};
    const assert = require('node:assert/strict');
    const handlers = require('./functions/index.js');
    assert.deepEqual(Object.keys(handlers), ['comprasOperacao']);
    assert.equal(require('./functions/node_modules/firebase-admin').app().options.projectId, 'ap1303-android-push-teste');
    for(const nome of ['push.cjs','no-bolso-functions.cjs','compras-api.cjs']) {
      assert.ok(!Object.keys(require.cache).some(p => p.endsWith('/functions/'+nome) || p.endsWith('\\\\functions\\\\'+nome)));
    }
  `;
  const r = spawnSync(process.execPath, ['-e', codigo], { encoding: 'utf8', env: { ...process.env, ...envLocal, GOOGLE_CLOUD_PROJECT: envLocal.GCLOUD_PROJECT, AP1303_QR_LOCAL: 'true' }, timeout: 15000 });
  assert.equal(r.status, 0, r.stderr);
});
