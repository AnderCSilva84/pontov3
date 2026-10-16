import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../public/firebase-messaging-sw.js', import.meta.url), 'utf8');
function iniciar() {
  const handlers = {};
  const avisos = [];
  const abertos = [];
  let background;
  const self = { location: { href: 'https://app.example/firebase-messaging-sw.js?config=%7B%7D&uid=alice', origin: 'https://app.example' },
    addEventListener: (type, handler) => { handlers[type] = handler; }, skipWaiting: async () => {},
    registration: { showNotification: async (title, options) => { avisos.push({ title, options }); } },
    clients: { claim: async () => {}, matchAll: async () => [], openWindow: async (url) => { abertos.push(url); } },
  };
  runInNewContext(source, { self, URL, importScripts: () => {}, firebase: { initializeApp: () => {}, messaging: () => ({ onBackgroundMessage: (handler) => { background = handler; } }) } });
  return { handlers, avisos, abertos, background, self };
}

test('worker exibe um único aviso e descarta mensagens de outro usuário', async () => {
  const worker = iniciar();
  await worker.background({ data: { uid: 'alice', title: 'Compras', body: 'Lista atualizada', tag: 'event-1', url: '/lista-compras' } });
  await worker.background({ data: { uid: 'bob', title: 'Outro usuário' } });
  assert.equal(worker.avisos.length, 1);
  assert.equal(worker.avisos[0].options.data.url, '/lista-compras');
  assert.equal(worker.avisos[0].options.tag, 'event-1');
});

test('toque abre a rota local e bloqueia endereço de outro domínio', async () => {
  const worker = iniciar();
  const clicar = async (url) => {
    let promise;
    worker.handlers.notificationclick({ notification: { close: () => {}, data: { url } }, waitUntil: (value) => { promise = value; } });
    await promise;
  };
  await clicar('/lista-compras');
  await clicar('https://evil.example/');
  assert.deepEqual(worker.abertos, ['https://app.example/lista-compras']);
});

test('toque reaproveita e navega uma janela existente do app', async () => {
  const worker = iniciar();
  let navegado;
  let focado = false;
  worker.self.clients.matchAll = async () => [{ url: 'https://app.example/ponto', navigate: async (url) => { navegado = url; }, focus: async () => { focado = true; } }];
  let promise;
  worker.handlers.notificationclick({ notification: { close: () => {}, data: { url: '/tarefas' } }, waitUntil: (value) => { promise = value; } });
  await promise;
  assert.equal(navegado, 'https://app.example/tarefas');
  assert.equal(focado, true);
  assert.equal(worker.abertos.length, 0);
});
