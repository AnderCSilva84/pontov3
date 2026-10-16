import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { runInNewContext } from 'node:vm';

const bundle = await build({
  entryPoints: [new URL('../src/services/push.js', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')],
  bundle: true, write: false, format: 'cjs', platform: 'browser',
  define: { 'import.meta.env.VITE_FIREBASE_VAPID_KEY': '"test-public-key"' },
  plugins: [{ name: 'fake-firebase', setup(builder) {
    builder.onResolve({ filter: /^(firebase\/messaging|firebase\/functions|\.\/firebase)$/ }, (args) => ({ path: args.path, namespace: 'fake' }));
    builder.onLoad({ filter: /.*/, namespace: 'fake' }, (args) => ({ contents: args.path === './firebase'
      ? 'export const app = {}, functions = {}, firebaseConfig = {}; export const auth = globalThis.__mocks.auth;'
      : args.path === 'firebase/functions'
        ? 'export const httpsCallable = (_, name) => data => globalThis.__mocks.backend(name, data);'
        : 'export const getMessaging = () => ({}); export const isSupported = async () => true; export const getToken = async () => "fake-token-browser-123456789"; export const deleteToken = async () => true; export const onMessage = () => () => {};' }));
  } }],
});

function carregar(permission = 'granted') {
  const armazenamento = new Map();
  const chamadas = [];
  const revoked = [];
  let pedidos = 0;
  const Notification = { permission, requestPermission() { pedidos++; this.permission = 'granted'; return Promise.resolve('granted'); } };
  const registro = { installing: null, waiting: null, pushManager: { getSubscription: async () => ({ unsubscribe: async () => { revoked.push('unsubscribe'); } }) }, unregister: async () => { revoked.push('unregister'); } };
  const module = { exports: {} };
  const context = { module, exports: module.exports, setTimeout, clearTimeout, console, Notification,
    window: { isSecureContext: true, Notification },
    navigator: { serviceWorker: { register: async () => registro, ready: Promise.resolve(registro), getRegistration: async () => registro } },
    localStorage: { getItem: (key) => armazenamento.get(key) ?? null, setItem: (key, value) => armazenamento.set(key, value), removeItem: (key) => armazenamento.delete(key) },
    __mocks: { auth: { currentUser: { uid: 'alice' } }, backend: async (name, data) => { chamadas.push({ name, data }); } },
  };
  runInNewContext(bundle.outputFiles[0].text, context);
  return { api: module.exports, armazenamento, chamadas, revoked, pedidos: () => pedidos, Notification };
}

test('permissão concedida cadastra sem novo pedido e logout permite reconexão automática', async () => {
  const app = carregar();
  app.armazenamento.set('pushAtivado:alice', 'false'); // Preferência antiga não impede o novo padrão automático.
  assert.equal(app.api.pushDesativadoManualmente('alice'), false);
  await app.api.registrarPush('alice', false);
  assert.equal(app.pedidos(), 0);
  assert.equal(app.chamadas[0].name, 'registrarDispositivoPush');
  await app.api.desativarPush({ manterPreferencia: true });
  assert.equal(app.api.pushDesativadoManualmente('alice'), false);
  assert.deepEqual(app.revoked, ['unsubscribe', 'unregister']);
  await app.api.registrarPush('alice', false);
  assert.equal(app.chamadas.at(-1).name, 'registrarDispositivoPush');
});

test('desativação explícita persiste e ativação voluntária remove essa escolha', async () => {
  const app = carregar();
  await app.api.registrarPush('alice', false);
  await app.api.desativarPush();
  assert.equal(app.api.pushDesativadoManualmente('alice'), true);
  await app.api.registrarPush('alice', false);
  assert.equal(app.api.pushDesativadoManualmente('alice'), false);
});

test('login pede a permissão inicial uma vez e falha ou recusa não rejeita o fluxo', async () => {
  const app = carregar('default');
  await app.api.solicitarPermissaoPushNoLogin();
  await app.api.solicitarPermissaoPushNoLogin();
  assert.equal(app.pedidos(), 1);
  const recusado = carregar('denied');
  await recusado.api.solicitarPermissaoPushNoLogin();
  assert.equal(recusado.pedidos(), 0);
  const falha = carregar('default');
  falha.Notification.requestPermission = () => { throw new Error('Not supported'); };
  await assert.doesNotReject(() => falha.api.solicitarPermissaoPushNoLogin());
});
