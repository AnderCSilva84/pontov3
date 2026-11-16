import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers';
import { criarSessaoPlayBilling, ofertaMensalPlay } from '../src/utils/playBilling.js';

function fixture(opcoes = {}) {
  let usuario = { uid: 'ana', grupoId: 'a' }, evento;
  const chamadas = [], pagamentos = [];
  const ponte = {
    addListener: async (nome, cb) => { evento = cb; return { remove: async () => chamadas.push('remover') }; },
    configurarSessao: async d => { chamadas.push(['configurar', d]); return { comprasHabilitadas: false }; },
    encerrarSessao: async d => { chamadas.push(['encerrar', d]); },
    consultarProdutos: async d => { chamadas.push(['produtos', d]); return { produtos: [] }; },
    consultarCompras: async d => { chamadas.push(['compras', d]); return { compras: [{ token: 'ficticio', verificada: false }] }; },
    comprar: async d => { pagamentos.push(d); return { aberta: true, verificada: false }; },
    ...opcoes.ponte,
  };
  const criar = extras => criarSessaoPlayBilling({ ponte, contexto: () => usuario, hash: async () => 'a'.repeat(64), novoId: () => '11111111-1111-4111-8111-111111111111', aoCompras: opcoes.aoCompras, ...extras });
  return { criar, chamadas, pagamentos, trocar: u => { usuario = u; }, emitir: e => evento(e) };
}

test('Play: consultas concorrentes compartilham configuração sem iniciar pagamento', async () => {
  const f = fixture(), s = f.criar();
  const [produtos, compras] = await Promise.all([s.consultarProdutos(), s.consultarCompras()]);
  assert.deepEqual(produtos.produtos, []);
  assert.equal(compras.compras[0].verificada, false);
  assert.equal(f.chamadas.filter(c => c[0] === 'configurar').length, 1);
  assert.equal(f.pagamentos.length, 0);
  assert.equal(JSON.stringify(f.chamadas).includes('ana'), false);
  await s.encerrar();
});

test('Play: contexto inválido ou troca de grupo antes da resposta não expõe compra', async () => {
  let concluir;
  const f = fixture({ ponte: { consultarCompras: () => new Promise(r => { concluir = r; }) } });
  const s = f.criar();
  const p = s.consultarCompras();
  await new Promise(r => setImmediate(r));
  f.trocar({ uid: 'ana', grupoId: 'outro' });
  concluir({ compras: [{ token: 'nao-entregar' }] });
  await assert.rejects(p, /sessão mudou/);
  await s.encerrar();
  f.trocar(null);
  await assert.rejects(f.criar().consultarProdutos(), /sessão mudou/);
});

test('Play: desmontar enquanto hash é calculado não configura sessão antiga', async () => {
  let concluir;
  const f = fixture(), s = f.criar({ hash: () => new Promise(r => { concluir = r; }) });
  const p = s.consultarProdutos(); await s.encerrar(); concluir('a'.repeat(64));
  await assert.rejects(p, /sessão mudou/);
  assert.equal(f.chamadas.some(c => c[0] === 'configurar'), false);
});

test('Play: configuração que termina após logout é encerrada pelo ID original', async () => {
  let concluir;
  const f = fixture({ ponte: { configurarSessao: () => new Promise(r => { concluir = r; }) } });
  const s = f.criar(); const p = s.consultarProdutos();
  await new Promise(r => setImmediate(r)); await s.encerrar(); concluir({});
  await assert.rejects(p, /sessão mudou/);
  const fechamentos = f.chamadas.filter(c => c[0] === 'encerrar');
  assert.ok(fechamentos.length > 0);
  assert.ok(fechamentos.every(c => c[1].sessao === '11111111-1111-4111-8111-111111111111'));
});

test('Play: eventos de outra sessão/grupo e depois de logout são ignorados', async () => {
  const recebidas = [], f = fixture({ aoCompras: e => recebidas.push(e) }), s = f.criar();
  await s.conectar();
  const e = { conta: 'a'.repeat(64), sessao: '11111111-1111-4111-8111-111111111111', compras: [], verificada: true };
  f.emitir({ ...e, conta: 'b'.repeat(64) }); f.emitir({ ...e, sessao: 'antiga' });
  assert.equal(recebidas.length, 0);
  f.emitir(e); assert.equal(recebidas.length, 1); assert.equal(recebidas[0].verificada, false);
  await s.encerrar(); f.emitir(e); assert.equal(recebidas.length, 1);
});

test('Play: compras permanecem bloqueadas sem liberação de integração e produto permitido', async () => {
  const f = fixture();
  await assert.rejects(f.criar().comprar('ta_no_ponto_prata'), /ainda não está disponível/);
  await assert.rejects(f.criar({ podeComprar: () => true }).comprar('produto-forjado'), /ainda não está disponível/);
  assert.equal(f.pagamentos.length, 0);
});

test('Play: falha da loja não vira lista vazia ou confirmação de compra', async () => {
  const f = fixture({ ponte: { consultarProdutos: async () => { throw new Error('billing/indisponivel'); } } });
  const s = f.criar(); await assert.rejects(s.consultarProdutos(), /billing\/indisponivel/);
  assert.equal(f.pagamentos.length, 0); await s.encerrar();
});

test('Play: preço vem da oferta mensal da loja, sem usar tabela local para produto ausente', () => {
  const r = { produtos: [{ produtoId: 'ta_no_ponto_prata', ofertas: [{ planoBase: 'mensal', preco: 'R$ 15,90', moeda: 'BRL' }] }] };
  assert.equal(ofertaMensalPlay(r, 'ta_no_ponto_prata').preco, 'R$ 15,90');
  assert.equal(ofertaMensalPlay(r, 'ta_no_ponto_ouro'), null);
  assert.equal(ofertaMensalPlay(r, 'forjado'), null);
  assert.equal(ofertaMensalPlay({ produtos: [{ produtoId: 'ta_no_ponto_prata', ofertas: [{ planoBase: 'anual', preco: 'R$ 100' }] }] }, 'ta_no_ponto_prata'), null);
});
