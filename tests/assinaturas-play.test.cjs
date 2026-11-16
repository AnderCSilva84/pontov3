const test = require('node:test');
const assert = require('node:assert/strict');
const { contaPlay, hash, interpretarCompraPlay, criarClientePlay } = require('../functions/assinaturas-play.cjs');
const { verificarCompraPlayTeste } = require('../functions/assinaturas-play-verificacao.cjs');
const agora = Date.parse('2026-11-14T20:00:00Z');
function compra(delta = {}) {
  return { kind: 'androidpublisher#subscriptionPurchaseV2', startTime: '2026-11-01T00:00:00Z',
    subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE', acknowledgementState: 'ACKNOWLEDGEMENT_STATE_PENDING',
    externalAccountIdentifiers: { obfuscatedExternalAccountId: contaPlay('ana', 'grupo_a') }, testPurchase: {},
    lineItems: [{ productId: 'ta_no_ponto_ouro', expiryTime: '2026-12-01T00:00:00Z',
      offerDetails: { basePlanId: 'mensal' }, autoRenewingPlan: { autoRenewEnabled: true } }], ...delta };
}
const interpretar = d => interpretarCompraPlay(d, { uid: 'ana', grupoId: 'grupo_a', agora });

test('Play servidor: mapeia produtos reais e separa vigência, reconhecimento e renovação', () => {
  for (const plano of ['prata', 'ouro', 'diamante']) {
    const d = compra(); d.lineItems[0].productId = `ta_no_ponto_${plano}`;
    const r = interpretar(d);
    assert.equal(r.plano, plano); assert.equal(r.vigente, true); assert.equal(r.reconhecida, false);
    assert.equal(r.renovacaoAutomatica, true); assert.equal(r.teste, true);
    assert.equal(r.token, undefined); assert.equal(r.verificado, undefined);
  }
});

test('Play servidor: cancelamento mantém vigência; suspensão, pausa e pendência não concedem vigência', () => {
  for (const [estado, vigente] of [['CANCELED', true], ['IN_GRACE_PERIOD', true], ['ON_HOLD', false],
    ['PAUSED', false], ['PENDING', false], ['PENDING_PURCHASE_CANCELED', false], ['EXPIRED', false]]) {
    const d = compra({ subscriptionState: `SUBSCRIPTION_STATE_${estado}` });
    if (estado === 'CANCELED') d.lineItems[0].autoRenewingPlan.autoRenewEnabled = false;
    assert.equal(interpretar(d).vigente, vigente, estado);
  }
  const d = compra(); d.lineItems[0].expiryTime = new Date(agora).toISOString();
  assert.equal(interpretar(d).vigente, false);
  d.subscriptionState = 'SUBSCRIPTION_STATE_PENDING'; delete d.startTime; delete d.lineItems[0].expiryTime;
  assert.equal(interpretar(d).vigente, false);
});

test('Play servidor: vínculo é derivado do UID/grupo, sem aceitar compra de outra conta', () => {
  assert.notEqual(contaPlay('ana', 'grupo_a'), contaPlay('ana', 'grupo_b'));
  for (const valor of [undefined, 'x', '0'.repeat(64), contaPlay('bia', 'grupo_a'), contaPlay('ana', 'grupo_b')]) {
    assert.throws(() => interpretar(compra({ externalAccountIdentifiers: { obfuscatedExternalAccountId: valor } })), { code: 'permission-denied' });
  }
});

test('Play servidor: rejeita produto/base/oferta desconhecidos, parcelamento e trocas não reconciliadas', () => {
  const alteracoes = [
    d => { d.kind = 'outra'; }, d => { d.subscriptionState = 'NOVO_ESTADO'; },
    d => { d.acknowledgementState = 'DESCONHECIDO'; }, d => { d.startTime = 'amanha'; },
    d => { d.lineItems[0].expiryTime = '2026-01-01T00:00:00Z'; },
    d => { d.lineItems[0].productId = '__proto__'; }, d => { d.lineItems[0].offerDetails.basePlanId = 'anual'; },
    d => { d.lineItems[0].offerDetails.offerId = 'promo'; },
    d => { d.lineItems[0].autoRenewingPlan.installmentDetails = {}; },
    d => { d.lineItems[0].prepaidPlan = {}; }, d => { d.lineItems[0].deferredItemReplacement = {}; },
    d => { d.lineItems.push(d.lineItems[0]); }, d => { d.linkedPurchaseToken = 'anterior'; },
  ];
  for (const mudar of alteracoes) { const d = compra(); mudar(d); assert.throws(() => interpretar(d), { code: 'failed-precondition' }); }
});

test('Play HTTP: usa pacote fixo e GET autenticado; token é codificado e nenhum erro sensível é devolvido', async () => {
  let req;
  const cliente = criarClientePlay({ autenticar: async () => ({ request: async r => { req = r; return { data: compra() }; } }) });
  assert.equal((await cliente.consultar('token/teste?x=1')).kind, 'androidpublisher#subscriptionPurchaseV2');
  assert.match(req.url, /applications\/br\.dev\.acstech\.ap1303\/purchases\/subscriptionsv2\/tokens\/token%2Fteste%3Fx%3D1$/);
  assert.equal(req.method, 'GET'); assert.equal(req.timeout, 12000); assert.equal(req.retry, false);
  for (const [status, codigo] of [[401, 'failed-precondition'], [403, 'failed-precondition'], [404, 'not-found'], [410, 'not-found'], [429, 'unavailable'], [500, 'unavailable']]) {
    const c = criarClientePlay({ autenticar: async () => ({ request: async () => { throw { response: { status }, message: 'SEGREDO', config: { headers: { Authorization: 'SEGREDO' } } }; } }) });
    await assert.rejects(c.consultar('token-ficticio'), e => e.code === codigo && !JSON.stringify(e).includes('SEGREDO'));
  }
  for (const token of ['', 'com espaco', '\n', 'á', 'a'.repeat(4097)]) await assert.rejects(cliente.consultar(token), { code: 'invalid-argument' });
});

function fixture({ habilitado = true } = {}) {
  const documentos = {
    'vinculosUsuarios/ana': { ativo: true, grupoId: 'grupo_a' },
    'grupos/grupo_a': { ativo: true, titularUid: 'ana' },
    'grupos/grupo_a/users/ana': { role: 'admin', ativo: true },
    'assinaturasConfiguracao/google_play': { homologacaoAtiva: habilitado, gruposPermitidos: ['grupo_a'] },
  };
  const snap = p => ({ exists: !!documentos[p], data: () => documentos[p] });
  const ref = path => ({ path, get: async () => snap(path), collection: n => ({ doc: id => ref(`${path}/${n}/${id}`) }) });
  let fila = Promise.resolve(), n = 0, chamadas = 0, aoConsultar;
  const raiz = { doc: ref, runTransaction: fn => {
    const resultado = fila.then(async () => {
      const escritas = [];
      const r = await fn({ getAll: async (...refs) => refs.map(r => snap(r.path)),
        set: (r, d) => escritas.push([r.path, d]),
        create: (r, d) => { if (documentos[r.path]) throw Error('already-exists'); escritas.push([r.path, d]); } });
      for (const [p, d] of escritas) documentos[p] = d;
      return r;
    }); fila = resultado.catch(() => {}); return resultado;
  } };
  const opcoes = { relogio: () => agora, novoId: () => 'tentativa_' + (++n), cliente: { consultar: async () => { chamadas++; await aoConsultar?.(); return compra(); } } };
  return { raiz, documentos, opcoes, chamadas: () => chamadas, aoConsultar: fn => { aoConsultar = fn; } };
}
const req = { auth: { uid: 'ana' }, data: { token: 'token-teste-nao-real' } };

test('Play homologação: configuração ausente/desligada ou titular inválido bloqueiam antes da API', async () => {
  const f = fixture({ habilitado: false });
  await assert.rejects(verificarCompraPlayTeste(f.raiz, req, f.opcoes), { code: 'failed-precondition' });
  assert.equal(f.chamadas(), 0);
  f.documentos['assinaturasConfiguracao/google_play'].homologacaoAtiva = true;
  f.documentos['grupos/grupo_a'].titularUid = 'outro';
  await assert.rejects(verificarCompraPlayTeste(f.raiz, req, f.opcoes), { code: 'permission-denied' });
  assert.equal(f.chamadas(), 0);
  await assert.rejects(verificarCompraPlayTeste(f.raiz, { ...req, data: { ...req.data, grupoId: 'grupo_b' } }, f.opcoes), { code: 'invalid-argument' });
  await assert.rejects(verificarCompraPlayTeste(f.raiz, { data: req.data }, f.opcoes), { code: 'unauthenticated' });
});

test('Play homologação: vincula prova privada sem direitos e mantém tentativas sem sobrescrever estado', async () => {
  const f = fixture();
  const [a, b] = await Promise.all([verificarCompraPlayTeste(f.raiz, req, f.opcoes), verificarCompraPlayTeste(f.raiz, req, f.opcoes)]);
  assert.equal(a.verificadaNaLoja, true); assert.equal(a.direitosConcedidos, false); assert.deepEqual(a, b);
  assert.equal(JSON.stringify(a).includes(req.data.token), false);
  const caminho = 'assinaturasCompras/google_play_' + hash(req.data.token);
  assert.equal(f.documentos[caminho].grupoId, 'grupo_a');
  assert.equal(Object.keys(f.documentos).filter(p => p.includes('/validacoes/')).length, 2);
  assert.equal(f.documentos['assinaturasGrupos/grupo_a'], undefined);
  assert.equal(f.documentos['grupos/grupo_a'].assinaturasAtivas, undefined);
});

test('Play homologação: revalida vínculo/exclusão/configuração depois da consulta externa', async () => {
  for (const mudar of [
    f => { f.documentos['vinculosUsuarios/ana'].grupoId = 'grupo_b'; },
    f => { f.documentos['contaSolicitacoes/ana'] = { etapa: 'solicitada' }; },
    f => { f.documentos['assinaturasConfiguracao/google_play'].homologacaoAtiva = false; },
  ]) {
    const f = fixture(); f.aoConsultar(() => mudar(f));
    await assert.rejects(verificarCompraPlayTeste(f.raiz, req, f.opcoes));
    assert.equal(Object.keys(f.documentos).filter(p => p.startsWith('assinaturasCompras/')).length, 0);
  }
});

test('Play homologação: não aceita compra real, conflito de vínculo nem consultas sem limite', async () => {
  const real = fixture(); real.opcoes.cliente.consultar = async () => { const d = compra(); delete d.testPurchase; return d; };
  await assert.rejects(verificarCompraPlayTeste(real.raiz, req, real.opcoes), { code: 'failed-precondition' });
  assert.equal(Object.keys(real.documentos).some(p => p.startsWith('assinaturasCompras/')), false);
  const conflito = fixture(); conflito.documentos['assinaturasCompras/google_play_' + hash(req.data.token)] = { grupoId: 'outro' };
  await assert.rejects(verificarCompraPlayTeste(conflito.raiz, req, conflito.opcoes), { code: 'permission-denied' });
  const f = fixture();
  for (let n = 0; n < 5; n++) await verificarCompraPlayTeste(f.raiz, req, f.opcoes);
  await assert.rejects(verificarCompraPlayTeste(f.raiz, req, f.opcoes), { code: 'resource-exhausted' });
  assert.equal(f.chamadas(), 5);
});
