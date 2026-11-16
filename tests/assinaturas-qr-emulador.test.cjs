const test = require('node:test'), assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

test('permissão fiscal: Ouro/Diamante, expiração, revalidação e histórico', { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async t => {
  assert.match(process.env.GCLOUD_PROJECT, /^demo-/);
  const admin = require('../functions/node_modules/firebase-admin');
  const app = admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT }, 'qr-' + randomUUID()), raiz = app.firestore();
  const { bancoDoGrupo } = require('../functions/grupos-contexto.cjs');
  const { operarCupom } = require('../functions/cupom-operacoes.cjs');
  const fixture = require('./fixtures/cupom-pa.cjs');
  t.after(() => app.delete());
  async function grupo(plano) {
    const uid = 'qr_' + randomUUID(), grupoId = 'g_' + uid, db = bancoDoGrupo(raiz, grupoId);
    await raiz.doc(`grupos/${grupoId}`).set({ ativo: true, titularUid: uid, assinaturasAtivas: true });
    await raiz.doc(`vinculosUsuarios/${uid}`).set({ grupoId, ativo: true });
    await db.doc(`users/${uid}`).set({ role: 'admin', ativo: true, nome: 'Teste' });
    const assinatura = raiz.doc(`assinaturasGrupos/${grupoId}`);
    if (plano !== 'free') await assinatura.set({ versao: 1, plano, estado: 'ativo', provedor: 'google_play', verificado: true, inicioEm: Date.now() - 10000, validoAte: Date.now() + 600000 });
    await db.doc('categoriasCompras/diversos').set({ nome: 'Diversos', ativo: true });
    await db.doc('supermercados/mercado').set({ nome: 'Mercado fictício', filial: 'Teste', cidade: 'Belém', ativo: true });
    const f = fixture();
    const op = (data, opcoes) => operarCupom(db, { auth: { uid }, data }, opcoes);
    const preparar = (extra = {}, opcoes) => op({ operacao: 'cupomPreparar', link: f.link, texto: f.texto, ...extra }, opcoes);
    return { uid, grupoId, db, assinatura, op, preparar, f };
  }
  for (const plano of ['free', 'prata']) await t.test(`${plano} recusa antes da rede e não aceita texto como desvio`, async () => {
    const g = await grupo(plano); let chamadas = 0;
    await assert.rejects(g.preparar({ automatico: true }, { consultar: async () => { chamadas++; throw Error('Não consultar'); } }), { code: 'failed-precondition' });
    await assert.rejects(g.preparar(), { code: 'failed-precondition' });
    assert.equal(chamadas, 0);
    assert.equal((await g.db.collection('comprasCuponsRascunhos').get()).size, 0);
  });
  for (const plano of ['ouro', 'diamante']) await t.test(`${plano} prepara a revisão`, async () => {
    const g = await grupo(plano), r = await g.preparar();
    assert.ok(r.rascunhoId); assert.equal((await g.db.collection('comprasListas').get()).size, 0);
  });
  await t.test('expiração entre revisão e confirmação recusa sem efeitos; repetição já concluída preserva histórico', async () => {
    const g = await grupo('ouro'), r = await g.preparar();
    const itens = r.nota.itens.map(i => ({ linha: i.linha, novoConfirmado: true, descartar: i.linha === 2, nome: i.linha < 3 ? 'Frasco teste' : 'Produto por quilo', marca: 'Marca fictícia', apresentacao: i.linha < 3 ? 'Frasco 500 mL' : 'Venda por kg', categoriaId: 'diversos', produtoId: '' }));
    const dados = { operacao: 'cupomConfirmar', rascunhoId: r.rascunhoId, supermercadoId: 'mercado', itens };
    await g.assinatura.update({ validoAte: Date.now() - 1 });
    await assert.rejects(g.op(dados), { code: 'failed-precondition' });
    assert.equal((await g.db.collection('comprasListas').get()).size, 0);
    assert.equal((await g.db.collection('comprasPrecos').get()).size, 0);
    assert.equal((await g.db.doc(`comprasCuponsRascunhos/${r.rascunhoId}`).get()).data().listaId, undefined);
    await g.assinatura.update({ validoAte: Date.now() + 600000 });
    const confirmada = await g.op(dados);
    await g.assinatura.update({ validoAte: Date.now() - 1 });
    const repetida = await g.op(dados);
    assert.equal(repetida.listaId, confirmada.listaId); assert.equal(repetida.jaImportada, true);
    assert.equal((await g.db.doc('comprasListas/' + confirmada.listaId).get()).data().status, 'finalizada');
    assert.equal((await g.db.collection('comprasListas').get()).size, 1);
  });
  await t.test('plano muda durante consulta externa: revisão não é criada', async () => {
    const g = await grupo('ouro');
    const { lerTextoNota } = require('../functions/cupom-dominio.cjs');
    const consultar = async () => { await g.assinatura.update({ plano: 'prata' }); return lerTextoNota(g.f.link, g.f.texto); };
    await assert.rejects(g.preparar({ automatico: true }, { consultar }), { code: 'failed-precondition' });
    assert.equal((await g.db.collection('comprasCuponsRascunhos').get()).size, 0);
  });
  await t.test('transição mantém acesso atual sem ativar assinaturas', async () => {
    const g = await grupo('free');
    await raiz.doc(`grupos/${g.grupoId}`).update({ assinaturasAtivas: false });
    assert.ok((await g.preparar()).rascunhoId);
    assert.equal((await raiz.doc(`grupos/${g.grupoId}`).get()).data().assinaturasAtivas, false);
  });
});
