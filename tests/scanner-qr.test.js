import test from 'node:test';
import assert from 'node:assert/strict';
import { criarDiagnosticoQr, criarScannerQr, permitirCamera, normalizarLeituraQr, conectarCicloScanner } from '../src/utils/scannerQr.js';
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
  vm.runInContext(readFileSync('src/services/scannerQrCamera.js', 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/^export \{.*\};\r?\n/gm, '').replace(/export /g, ''), c);
  vm.runInContext(readFileSync('src/services/scannerQr.js', 'utf8').replace(/^export \{.*\} from .*;\r?\n/gm, '').replace(/^import .*;\r?\n/gm, '').replace(/export /g, ''), c);
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


test('diagnóstico filtra identificadores, mede duração e avanço sem guardar conteúdo', async () => {
  let tempo = 0, tick; const saidas = [], video = { currentTime: 0, videoWidth: 1080, videoHeight: 1920 };
  const track = { readyState: 'live', getSettings: () => ({ width: 1080, height: 1920, frameRate: 30, deviceId: 'SEGREDO' }), getCapabilities: () => ({ focusMode: ['continuous', 'SEGREDO'], zoom: { min: 1, max: 4 }, groupId: 'SEGREDO' }) };
  const d = criarDiagnosticoQr({ video, track: () => track, publicar: x => saidas.push(x), agora: () => tempo, agendar: fn => { tick=fn; return fn; }, desagendar: () => {} });
  assert.equal(d.medir('zxing', () => { tempo=7; return 'TEXTO_FISCAL'; }), 'TEXTO_FISCAL');
  await d.medir('fallback', async () => { tempo=12; return 'TEXTO_FISCAL'; });
  video.currentTime=1; tick();
  const atual=saidas.at(-1);
  assert.deepEqual(atual.zxing, { tentativas: 1, ms: 7 });
  assert.deepEqual(atual.fallback, { tentativas: 1, ms: 5 });
  assert.equal(atual.avancando, true); assert.equal(atual.fps, 30);
  assert.deepEqual(atual.foco, ['continuous']); assert.deepEqual(atual.zoom, { min: 1, max: 4 });
  assert.doesNotMatch(JSON.stringify(saidas), /SEGREDO|TEXTO_FISCAL|deviceId|groupId/);
  d.parar(); const n=saidas.length; tick(); assert.equal(saidas.length,n);
});

test('diagnóstico tolera APIs ausentes, callback e relógio com falha', () => {
  const d=criarDiagnosticoQr({ video: {}, track: () => ({}), publicar: () => { throw Error('painel'); }, agora: () => { throw Error('relógio'); }, agendar: () => 1, desagendar: () => { throw Error('timer'); } });
  assert.equal(d.medir('zxing', () => 42), 42);
  assert.throws(() => d.medir('zxing', () => { throw Error('decoder'); }), /decoder/);
  assert.doesNotThrow(() => d.parar());
});

test('diagnóstico desligado usa leitor original e não agenda medições', async () => {
  let classe, settings=0;
  const b=ambiente({ carregarLeitor: async () => class Original {
    async decodeFromStream(s,v,cb) { classe=this.constructor.name; b.estado.frame=cb; v.srcObject=s; return { stop() {} }; }
  } });
  b.stream.getVideoTracks=()=>[{ getSettings:()=>{ settings++; return {}; }, getCapabilities:()=>({}) }];
  const scanner=criarScannerQr(b.opcoes); await scanner.pronto;
  assert.equal(classe,'Original'); assert.equal(settings,1); assert.equal(b.estado.agenda.length,1);
  scanner.parar();
});

test('scanner mede tentativas ZXing sem alterar retorno e cancela diagnóstico ao parar', async () => {
  const snapshots=[]; let leitor;
  const b=ambiente({ aoDiagnostico:d=>snapshots.push(d), carregarLeitor:async()=>class {
    decodeFromCanvas() { return 9; }
    async decodeFromStream(s,v,cb) { leitor=this; b.estado.frame=cb; v.srcObject=s; return { stop() {} }; }
  } });
  const scanner=criarScannerQr(b.opcoes); await scanner.pronto;
  assert.equal(leitor.decodeFromCanvas({}),9);
  b.estado.agenda[0](); assert.equal(snapshots.at(-1).zxing.tentativas,1);
  scanner.parar(); const n=snapshots.length;
  for(const tick of [...b.estado.agenda]) tick();
  assert.equal(snapshots.length,n); assert.ok(b.estado.canceladas.length>=2);
});

test('promessa de medição encerrada não publica nem contabiliza após cancelamento', async () => {
  let resolver; const snapshots=[];
  const d=criarDiagnosticoQr({ video:{}, track:()=>null, publicar:x=>snapshots.push(x), agendar:()=>1, desagendar:()=>{} });
  const p=d.medir('fallback',()=>new Promise(r=>{resolver=r;}));
  d.parar(); const n=snapshots.length; resolver('privado'); assert.equal(await p,'privado');
  assert.equal(snapshots.length,n); assert.equal(snapshots.at(-1).fallback.tentativas,0);
});

test('nova sessão não herda contadores nem aceita amostras da câmera anterior', async () => {
  const antigas=[], novas=[]; const a=ambiente({aoDiagnostico:d=>antigas.push(d)});
  const primeiro=criarScannerQr(a.opcoes); await primeiro.pronto; primeiro.parar();
  const n=antigas.length; const b=ambiente({aoDiagnostico:d=>novas.push(d)});
  const segundo=criarScannerQr(b.opcoes); await segundo.pronto;
  a.estado.agenda[0](); assert.equal(antigas.length,n); assert.equal(novas.at(-1).zxing.tentativas,0);
  segundo.parar();
});
