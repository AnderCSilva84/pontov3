import test from 'node:test';
import assert from 'node:assert/strict';
import { criarScannerQr, permitirCamera, normalizarLeituraQr, conectarCicloScanner } from '../src/utils/scannerQr.js';
import { normalizarQrCupom } from '../src/utils/cupomQr.js';
import fixture from './fixtures/cupom-pa.cjs';
import { setImmediate } from 'node:timers';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function ambiente(extra = {}) {
  const estado = { paradas: 0, leitorParado: 0, leituras: [], erros: [], agenda: [], canceladas: [] };
  const stream = { getTracks: () => [{ stop: () => estado.paradas++ }], getVideoTracks: () => [{ getSettings: () => ({ deviceId: 'traseira' }) }] };
  class Leitor { async decodeFromStream(s, v, cb) { estado.frame = cb; v.srcObject = s; return { stop: () => estado.leitorParado++ }; } }
  const opcoes = { video: {}, origem: 'web', carregarLeitor: async () => Leitor, obterStream: async c => { assert.equal(c.audio, false); return stream; },
    lerImagem: async () => null, criarCanvas: () => ({}), aoLer: r => estado.leituras.push(r), aoErro: e => estado.erros.push(e),
    agendar: fn => { estado.agenda.push(fn); return fn; }, desagendar: fn => estado.canceladas.push(fn), ...extra };
  return { estado, opcoes, stream };
}
test('QR normalizado preserva texto, formato e origem; não impõe domínio fiscal no adapter', () => {
  assert.deepEqual(normalizarLeituraQr(' exemplo ', 'android-webview'), { textoBruto: 'exemplo', formato: 'QR_CODE', origem: 'android-webview' });
  for (const v of [null, 4, {}, '', 'x'.repeat(4097)]) assert.throws(() => normalizarLeituraQr(v));
  for (const v of [null, {}, 'x'.repeat(1001), 'javascript:alert(1)', 'file:///etc/passwd', 'data:text/html,oi', 'https://example.com/', fixture().link.replace('app.sefa.pa.gov.br', 'app.sefa.pa.gov.br.example.com'), fixture().link.replace('https://', 'https://usuario:senha@')]) assert.equal(normalizarQrCupom(v), null);
  assert.equal(normalizarQrCupom(fixture().link), fixture().link);
});
test('frames repetidos entregam uma vez somente após liberar câmera e sem rede', async () => {
  const { estado, opcoes } = ambiente();
  opcoes.aoLer = r => { assert.ok(estado.paradas); assert.equal(opcoes.video.srcObject, null); estado.leituras.push(r); };
  const scanner = criarScannerQr(opcoes); await scanner.pronto;
  estado.frame({ getText: () => 'ficticio' }); estado.frame({ getText: () => 'ficticio' });
  assert.equal(estado.leituras.length, 1); assert.ok(estado.leitorParado); assert.equal(estado.erros.length, 0);
});
test('cancelar antes do getUserMedia resolver libera stream tardio e não entrega', async () => {
  let resolver; const b = ambiente({ obterStream: () => new Promise(r => { resolver = r; }) });
  const s = criarScannerQr(b.opcoes); await new Promise(r => setImmediate(r)); s.parar(); resolver(b.stream); await s.pronto;
  assert.ok(b.estado.paradas); assert.equal(b.estado.leituras.length, 0); assert.equal(b.estado.agenda.length, 0);
});
test('cancelar durante inicialização ZXing encerra controles tardios', async () => {
  let resolver;
  const b = ambiente({ carregarLeitor: async () => class { decodeFromStream() { return new Promise(r => { resolver = r; }); } } });
  const s = criarScannerQr(b.opcoes); await new Promise(r => setImmediate(r)); s.parar(); resolver({ stop: () => b.estado.leitorParado++ }); await s.pronto;
  assert.ok(b.estado.paradas); assert.equal(b.estado.leitorParado, 1);
});
test('troca de UID/grupo invalida resultado tardio; falha permite nova tentativa', async () => {
  let valido = true; const b = ambiente({ contextoValido: () => valido });
  const s = criarScannerQr(b.opcoes); await s.pronto; valido = false;
  b.estado.frame({ getText: () => 'anterior' }); assert.equal(b.estado.leituras.length, 0); assert.ok(b.estado.paradas);
  const f = ambiente({ obterStream: async () => { throw { name: 'NotReadableError' }; } });
  await criarScannerQr(f.opcoes).pronto; assert.match(f.estado.erros[0].message, /ocupada/);
  const novo = ambiente(); await criarScannerQr(novo.opcoes).pronto; novo.estado.frame({ getText: () => 'novo' }); assert.equal(novo.estado.leituras.length, 1);
});
test('permissão Android concedida/recusada/permanente e PWA sem ponte nativa', async () => {
  let pedidos = 0;
  await permitirCamera({ checkPermissions: async () => ({ camera: 'granted' }), requestPermissions: () => pedidos++ }); assert.equal(pedidos, 0);
  await permitirCamera({ checkPermissions: async () => ({ camera: 'prompt' }), requestPermissions: async () => { pedidos++; return { camera: 'granted' }; } }); assert.equal(pedidos, 1);
  await assert.rejects(permitirCamera({ checkPermissions: async () => ({ camera: 'denied' }), requestPermissions: () => pedidos++ }), { code: 'camera/bloqueada' }); assert.equal(pedidos, 1);
  await assert.rejects(permitirCamera({ checkPermissions: async () => ({ camera: 'prompt-with-rationale' }), requestPermissions: async () => ({ camera: 'denied' }) }), /não permitida/);
  const b = ambiente(); await criarScannerQr(b.opcoes).pronto; b.estado.frame({ getText: () => 'web' }); assert.equal(b.estado.leituras[0].origem, 'web');
});
test('Voltar é consumido, pausa/logout/grupo/navegação/ocultação cancelam; listeners são removidos', () => {
  const janela = new EventTarget(), documento = new EventTarget(); let cancelados = 0;
  const limpar = conectarCicloScanner(janela, documento, () => cancelados++);
  const voltar = new Event('ap1303-voltar', { cancelable: true }); assert.equal(janela.dispatchEvent(voltar), false);
  for (const n of ['ap1303-pausar', 'ap1303-ponto-sair', 'ap1303-contexto-alterado', 'popstate', 'pagehide']) janela.dispatchEvent(new Event(n));
  documento.hidden = false; documento.dispatchEvent(new Event('visibilitychange')); assert.equal(cancelados, 6);
  documento.hidden = true; documento.dispatchEvent(new Event('visibilitychange')); assert.equal(cancelados, 7);
  limpar(); janela.dispatchEvent(new Event('ap1303-pausar')); documento.dispatchEvent(new Event('visibilitychange')); assert.equal(cancelados, 7);
});

test('adapter mantém PWA sem permissão nativa, seleciona Android e encerra instância anterior', async () => {
  let plataforma = 'web', paradas = 0, grupo = 'g1'; const configuracoes = [];
  const c = { Capacitor: { getPlatform: () => plataforma }, registerPlugin: () => ({}), auth: { currentUser: { uid: 'a' } }, obterGrupoAtual: () => grupo,
    criarScannerQr: o => { configuracoes.push(o); return { parar: () => paradas++ }; }, permitirCamera: async () => {}, lerImagemQr: () => {}, navigator: {}, document: {} };
  vm.createContext(c);
  vm.runInContext(readFileSync('src/services/scannerQr.js', 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export /g, ''), c);
  c.iniciarScannerQr({}); assert.equal(configuracoes[0].origem, 'web'); assert.equal(configuracoes[0].permitir, undefined);
  plataforma = 'android'; c.iniciarScannerQr({}); assert.equal(paradas, 1); assert.equal(configuracoes[1].origem, 'android-webview'); assert.equal(typeof configuracoes[1].permitir, 'function');
  assert.equal(configuracoes[1].contextoValido(), true); grupo = 'g2'; assert.equal(configuracoes[1].contextoValido(), false);
  grupo = 'g1'; c.auth.currentUser = { uid: 'b' }; assert.equal(configuracoes[1].contextoValido(), false);
});

test('cancelamento durante checkPermissions não pede permissão posteriormente', async () => {
  let resolver, ativo = true, pedidos = 0;
  const p = permitirCamera({ checkPermissions: () => new Promise(r => { resolver = r; }), requestPermissions: () => pedidos++ }, () => ativo);
  ativo = false; resolver({ camera: 'prompt' }); await p; assert.equal(pedidos, 0);
});
