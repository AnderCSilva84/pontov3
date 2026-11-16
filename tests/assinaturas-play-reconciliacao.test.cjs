const test = require('node:test');
const assert = require('node:assert/strict');
const { setImmediate } = require('node:timers/promises');
const { criarClientePlay, config, contaPlay, hash } = require('../functions/assinaturas-play.cjs');
const { decodificarRtdn, receberRtdnPlay, retomarRtdnPlay, reconciliarCompraPlayTeste } = require('../functions/assinaturas-play-reconciliacao.cjs');

function fixture({ entregue = false } = {}) {
  let agora = Date.parse('2026-11-14T20:00:00Z'), sequencia = 0, reconhecida = false, consultas = 0, posts = 0;
  const token = 'token-testes-ficticio', compraId = 'google_play_' + hash(token), caminho = 'assinaturasCompras/' + compraId;
  const dados = {
    [caminho]: { versao: 1, provedor: 'google_play', pacote: config.pacote, teste: true, uid: 'ana', grupoId: 'grupo_a', token },
    'assinaturasConfiguracao/google_play': { homologacaoAtiva: true, gruposPermitidos: ['grupo_a'], reconhecimentoTesteAtivo: entregue, direitosHomologados: entregue },
    'grupos/grupo_a': { ativo: true, titularUid: 'ana', assinaturasAtivas: entregue },
    'vinculosUsuarios/ana': { grupoId: 'grupo_a', ativo: true },
    'grupos/grupo_a/users/ana': { ativo: true, role: 'admin' },
  };
  if (entregue) {
    dados['assinaturasEntregas/' + compraId] = { versao: 1, confirmada: true, teste: true, compraId, uid: 'ana', grupoId: 'grupo_a', produtoId: 'ta_no_ponto_ouro', planoBase: 'mensal' };
    dados['assinaturasGrupos/grupo_a'] = { versao: 1, verificado: true, provedor: 'google_play', plano: 'ouro', estado: 'ativo', compraId,
      inicioEm: agora - 10000, validoAte: agora + 100000 };
  }
  const snap = p => ({ exists: !!dados[p], data: () => structuredClone(dados[p]), ref: ref(p) });
  const ref = path => ({ path, get: async () => snap(path) });
  let fila = Promise.resolve();
  const db = {
    doc: ref,
    collection: nome => ({ where: () => ({ orderBy: () => ({ limit: limite => ({ get: async () => {
      const docs = Object.keys(dados).filter(p => p.startsWith(nome + '/') && dados[p].retomarEm <= agora)
        .sort((a, b) => dados[a].retomarEm - dados[b].retomarEm).slice(0, limite).map(snap);
      return { docs, size: docs.length };
    } }) }) }) }),
    runTransaction: fn => {
      const prom = fila.then(async () => {
        const pendentes = [];
        const r = await fn({ get: async r => snap(r.path), getAll: async (...refs) => refs.map(r => snap(r.path)),
          create: (r, d) => { if (dados[r.path]) throw Error('already exists'); pendentes.push([r.path, d]); },
          update: (r, d) => { if (!dados[r.path]) throw Error('not found'); pendentes.push([r.path, { ...dados[r.path], ...d }]); } });
        for (const [p, d] of pendentes) dados[p] = structuredClone(d);
        return r;
      }); fila = prom.catch(() => {}); return prom;
    },
  };
  function resposta() {
    return { kind: 'androidpublisher#subscriptionPurchaseV2', startTime: new Date(agora - 10000).toISOString(),
      acknowledgementState: reconhecida ? 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED' : 'ACKNOWLEDGEMENT_STATE_PENDING',
      subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE', externalAccountIdentifiers: { obfuscatedExternalAccountId: contaPlay('ana', 'grupo_a') }, testPurchase: {},
      lineItems: [{ productId: 'ta_no_ponto_ouro', expiryTime: new Date(agora + 50000).toISOString(), offerDetails: { basePlanId: 'mensal' }, autoRenewingPlan: { autoRenewEnabled: true } }] };
  }
  const cliente = { consultar: async () => { consultas++; return resposta(); }, reconhecer: async () => { posts++; reconhecida = true; } };
  const opcoes = { cliente, relogio: () => agora, novoId: () => 'rodada_' + (++sequencia) };
  return { db, dados, compraId, caminho, token, cliente, opcoes, resposta,
    reconhecer: () => { reconhecida = true; }, consultas: () => consultas, posts: () => posts,
    avancar: ms => { agora += ms; }, agora: () => agora };
}
function evento(f, id = 'evento_1', extra = {}) {
  return { data: { message: { messageId: id, data: Buffer.from(JSON.stringify({ version: '1.0', packageName: config.pacote,
    eventTimeMillis: String(f.agora()), subscriptionNotification: { version: '1.0', notificationType: 4, purchaseToken: f.token }, ...extra })).toString('base64') } } };
}

test('Play ACK HTTP: POST fixo, corpo vazio e recusa produto fora da allowlist', async () => {
  let r;
  const c = criarClientePlay({ autenticar: async () => ({ request: async q => { r = q; return {}; } }) });
  await c.reconhecer('token/com?dados', 'ta_no_ponto_prata');
  assert.equal(r.method, 'POST'); assert.deepEqual(r.data, {});
  assert.match(r.url, /purchases\/subscriptions\/ta_no_ponto_prata\/tokens\/token%2Fcom%3Fdados:acknowledge$/);
  await assert.rejects(c.reconhecer('token', 'inventado'), { code: 'invalid-argument' });
});

test('RTDN: valida pacote, formato, exclusividade e tipo; nunca aceita grupo/plano como prova', () => {
  const f = fixture();
  assert.deepEqual(decodificarRtdn(evento(f).data.message), { tipo: 'assinatura', compraId: f.compraId });
  for (const extra of [{ packageName: 'outro' }, { version: 'nova' }, { eventTimeMillis: 'amanha' }, { testNotification: {} },
    { subscriptionNotification: { version: '1.0', notificationType: 4, purchaseToken: '\n' } }]) assert.equal(decodificarRtdn(evento(f, 'a', extra).data.message), null);
  assert.equal(decodificarRtdn({ messageId: 'a', data: '!@#' }), null);
});

test('RTDN: evento repetido consulta uma vez, preserva direitos e não reconhece sem entrega', async () => {
  const f = fixture();
  // Aviso antigo de expiração não é autoridade: a consulta atual da loja diz ativo.
  const antigo = evento(f, 'evento_1', { subscriptionNotification: { version: '1.0', notificationType: 13, purchaseToken: f.token } });
  await receberRtdnPlay(f.db, antigo, f.opcoes);
  await receberRtdnPlay(f.db, antigo, f.opcoes);
  assert.equal(f.consultas(), 1); assert.equal(f.posts(), 0);
  assert.equal(f.dados[f.caminho].observacaoPlay.estado, 'ativo');
  assert.equal(f.dados[f.caminho].observacaoPlay.reconhecimentoPendente, true);
  assert.equal(f.dados['assinaturasGrupos/grupo_a'], undefined);
  assert.equal(JSON.stringify(f.dados['assinaturasEventos/rtdn_' + hash('evento_1')]).includes(f.token), false);
});

test('Play ACK: só reconhece após entrega confirmada e direitos homologados; repetição não faz novo POST', async () => {
  const f = fixture({ entregue: true });
  await reconciliarCompraPlayTeste(f.db, f.compraId, f.opcoes);
  assert.equal(f.posts(), 1); assert.equal(f.dados[f.caminho].observacaoPlay.reconhecida, true);
  await reconciliarCompraPlayTeste(f.db, f.compraId, f.opcoes);
  assert.equal(f.posts(), 1);
  for (const mudar of [
    x => { delete x.dados['assinaturasEntregas/' + x.compraId]; },
    x => { x.dados['assinaturasConfiguracao/google_play'].direitosHomologados = false; },
    x => { x.dados['assinaturasGrupos/grupo_a'].compraId = 'outra'; },
    x => { x.dados['assinaturasGrupos/grupo_a'].validoAte = x.agora() - 1; },
  ]) { const x = fixture({ entregue: true }); mudar(x); await reconciliarCompraPlayTeste(x.db, x.compraId, x.opcoes); assert.equal(x.posts(), 0); }
});

test('Play ACK: resposta perdida é reconciliada por GET sem repetir POST já confirmado', async () => {
  const f = fixture({ entregue: true });
  let posts = 0;
  f.cliente.reconhecer = async () => { posts++; f.reconhecer(); throw Error('resposta perdida com SEGREDO'); };
  await reconciliarCompraPlayTeste(f.db, f.compraId, f.opcoes);
  await reconciliarCompraPlayTeste(f.db, f.compraId, f.opcoes);
  assert.equal(posts, 1); assert.equal(f.dados[f.caminho].observacaoPlay.reconhecida, true);
});

test('RTDN: falha transitória fica durável e o sweep retoma consultando a loja', async () => {
  const f = fixture();
  f.cliente.consultar = async () => { throw Error('SEGREDO'); };
  await receberRtdnPlay(f.db, evento(f), f.opcoes);
  const job = f.dados['assinaturasEventos/rtdn_' + hash('evento_1')];
  assert.equal(job.estado, 'pendente'); assert.equal(JSON.stringify(job).includes('SEGREDO'), false);
  f.avancar(900001); f.cliente.consultar = async () => f.resposta();
  await retomarRtdnPlay(f.db, f.opcoes);
  assert.equal(f.dados['assinaturasEventos/rtdn_' + hash('evento_1')].estado, 'concluida');
});

test('RTDN: compra sem vínculo aguarda sem inferir usuário; revisão após limite de retenção', async () => {
  const f = fixture(); delete f.dados[f.caminho];
  await receberRtdnPlay(f.db, evento(f), f.opcoes);
  assert.equal(f.consultas(), 0);
  const path = 'assinaturasEventos/rtdn_' + hash('evento_1');
  assert.equal(f.dados[path].estado, 'aguardando_vinculo');
  f.avancar(3 * 86400000 + 1); await retomarRtdnPlay(f.db, f.opcoes);
  assert.equal(f.dados[path].estado, 'revisao');
});

test('Play: revalida titular depois da API e mantém bloqueio para compra real', async () => {
  const f = fixture({ entregue: true });
  f.cliente.consultar = async () => { f.dados['grupos/grupo_a'].titularUid = 'outro'; return f.resposta(); };
  await assert.rejects(reconciliarCompraPlayTeste(f.db, f.compraId, f.opcoes), { code: 'permission-denied' });
  assert.equal(f.posts(), 0); assert.equal(f.dados[f.caminho].observacaoPlay, undefined);
  const real = fixture(); real.cliente.consultar = async () => { const d = real.resposta(); delete d.testPurchase; return d; };
  await assert.rejects(reconciliarCompraPlayTeste(real.db, real.compraId, real.opcoes), { code: 'failed-precondition' });
});

test('Play: lease bloqueia concorrência e resposta velha não sobrescreve rodada nova', async () => {
  const f = fixture(); let resolver;
  const velha = f.resposta();
  f.cliente.consultar = () => new Promise(r => { resolver = r; });
  const p = reconciliarCompraPlayTeste(f.db, f.compraId, f.opcoes);
  while (!resolver) await setImmediate();
  assert.equal((await reconciliarCompraPlayTeste(f.db, f.compraId, f.opcoes)).estado, 'ocupada');
  f.avancar(90001);
  f.cliente.consultar = async () => { const d = f.resposta(); d.subscriptionState = 'SUBSCRIPTION_STATE_ON_HOLD'; return d; };
  await reconciliarCompraPlayTeste(f.db, f.compraId, f.opcoes);
  resolver(velha);
  await assert.rejects(p);
  assert.equal(f.dados[f.caminho].observacaoPlay.estado, 'suspenso');
});

test('Play: sincroniza direito existente da mesma compra, sem sobrescrever outro canal ou plano', async () => {
  const f = fixture({ entregue: true }); f.reconhecer();
  const direito = 'assinaturasGrupos/grupo_a';
  await reconciliarCompraPlayTeste(f.db, f.compraId, f.opcoes);
  assert.equal(f.dados[direito].validoAte, f.agora() + 50000);
  f.cliente.consultar = async () => { const d = f.resposta(); d.subscriptionState = 'SUBSCRIPTION_STATE_ON_HOLD'; return d; };
  await reconciliarCompraPlayTeste(f.db, f.compraId, f.opcoes);
  assert.equal(f.dados[direito].estado, 'suspenso');
  const outro = fixture({ entregue: true }); outro.reconhecer(); outro.dados[direito].provedor = 'mercado_pago';
  const antes = structuredClone(outro.dados[direito]);
  await reconciliarCompraPlayTeste(outro.db, outro.compraId, outro.opcoes);
  assert.deepEqual(outro.dados[direito], antes);
  const semGate = fixture({ entregue: true }); semGate.reconhecer(); semGate.dados['assinaturasConfiguracao/google_play'].direitosHomologados = false;
  const original = structuredClone(semGate.dados[direito]);
  await reconciliarCompraPlayTeste(semGate.db, semGate.compraId, semGate.opcoes);
  assert.deepEqual(semGate.dados[direito], original);
});
