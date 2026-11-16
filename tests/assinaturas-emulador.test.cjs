const test = require('node:test'), assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

test('assinaturas: recibos protegidos, grupo resolvido pelo vínculo e transição sem writes', { skip: !process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST }, async t => {
  assert.match(process.env.GCLOUD_PROJECT, /^demo-/);
  const admin = require('../functions/node_modules/firebase-admin');
  const app = admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT }, 'assinaturas-' + randomUUID());
  const raiz = app.firestore();
  const { consultarAssinatura } = require('../functions/assinaturas.cjs');
  const { initializeApp, deleteApp } = await import('firebase/app');
  const { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signOut } = await import('firebase/auth');
  const { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, updateDoc, terminate } = await import('firebase/firestore');
  const clientApp = initializeApp({ projectId: process.env.GCLOUD_PROJECT, apiKey: 'demo-key' }, 'assinaturas-' + randomUUID());
  const auth = getAuth(clientApp), db = getFirestore(clientApp);
  connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
  const [host, porta] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
  connectFirestoreEmulator(db, host, Number(porta));
  t.after(async () => { await signOut(auth); await terminate(db); await deleteApp(clientApp); await app.delete(); });
  const uid = (await createUserWithEmailAndPassword(auth, `assinatura-${randomUUID()}@example.test`, 'Teste-ficticio-123')).user.uid;
  const grupoId = 'assinaturas_' + randomUUID();
  await raiz.doc(`grupos/${grupoId}`).set({ ativo: true, titularUid: uid });
  await raiz.doc(`vinculosUsuarios/${uid}`).set({ grupoId, ativo: true });
  await raiz.doc(`grupos/${grupoId}/users/${uid}`).set({ role: 'admin', ativo: true });
  const antes = Date.now();
  const assinatura = { versao: 1, plano: 'ouro', estado: 'ativo', provedor: 'google_play', verificado: true, inicioEm: antes - 10000, validoAte: antes + 60000, recibo: 'privado' };
  await raiz.doc(`assinaturasGrupos/${grupoId}`).set(assinatura);
  const request = { auth: { uid }, data: {} };
  await t.test('nem titular lê ou altera direitos e recibos diretamente', async () => {
    for (const path of [`assinaturasGrupos/${grupoId}`, 'assinaturasEventos/forjado', 'assinaturasCompras/forjada', 'assinaturasCompras/forjada/validacoes/forjada', 'assinaturasConfiguracao/google_play', 'assinaturasEntregas/forjada']) {
      await assert.rejects(getDoc(doc(db, path)), /permission/i);
      await assert.rejects(setDoc(doc(db, path), { plano: 'diamante', verificado: true }), /permission/i);
    }
    await assert.rejects(updateDoc(doc(db, 'grupos', grupoId), { assinaturasAtivas: true }), /permission/i);
  });
  await t.test('consulta não muda grupo atual, nem ativa cotas ou apaga histórico', async () => {
    const r = await consultarAssinatura(raiz, request, antes);
    assert.equal(r.modo, 'transicao'); assert.equal(r.assinatura, null);
    assert.equal((await raiz.doc(`grupos/${grupoId}`).get()).data().assinaturasAtivas, undefined);
    assert.deepEqual((await raiz.doc(`assinaturasGrupos/${grupoId}`).get()).data(), assinatura);
  });
  await t.test('estado verificado é resolvido no servidor sem vazar recibos', async () => {
    await raiz.doc(`grupos/${grupoId}`).update({ assinaturasAtivas: true }); // Fixture isolada, não ativa produção.
    const r = await consultarAssinatura(raiz, request, antes);
    assert.equal(r.assinatura.plano, 'ouro'); assert.equal(r.assinatura.recibo, undefined);
    await assert.rejects(consultarAssinatura(raiz, { auth: { uid }, data: { grupoId: 'outro' } }), { code: 'invalid-argument' });
    const vencida = await consultarAssinatura(raiz, request, assinatura.validoAte);
    assert.equal(vencida.assinatura.plano, 'free');
    assert.equal((await raiz.doc(`assinaturasGrupos/${grupoId}`).get()).data().plano, 'ouro');
  });
  await t.test('verificação Play vincula recibo uma vez, sem alterar direitos, e revalida habilitação', async () => {
    const { verificarCompraPlayTeste } = require('../functions/assinaturas-play-verificacao.cjs');
    const { contaPlay, hash } = require('../functions/assinaturas-play.cjs');
    const configRef = raiz.doc('assinaturasConfiguracao/google_play');
    const comprasAntes = (await raiz.doc(`assinaturasGrupos/${grupoId}`).get()).data();
    await configRef.set({ homologacaoAtiva: true, gruposPermitidos: [grupoId] });
    const token = 'fixture_play_' + randomUUID();
    const resposta = { kind: 'androidpublisher#subscriptionPurchaseV2', testPurchase: {},
      subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE', acknowledgementState: 'ACKNOWLEDGEMENT_STATE_PENDING',
      externalAccountIdentifiers: { obfuscatedExternalAccountId: contaPlay(uid, grupoId) },
      startTime: new Date(antes - 10000).toISOString(),
      lineItems: [{ productId: 'ta_no_ponto_ouro', offerDetails: { basePlanId: 'mensal' },
        expiryTime: new Date(antes + 60000).toISOString(), autoRenewingPlan: { autoRenewEnabled: true } }] };
    const opcoes = { relogio: () => antes, cliente: { consultar: async () => resposta } };
    const req = { auth: { uid }, data: { token } };
    const resultados = await Promise.all([verificarCompraPlayTeste(raiz, req, opcoes), verificarCompraPlayTeste(raiz, req, opcoes)]);
    assert.equal(resultados[0].direitosConcedidos, false);
    assert.equal(resultados[1].verificadaNaLoja, true);
    const reciboRef = raiz.doc('assinaturasCompras/google_play_' + hash(token));
    assert.equal((await reciboRef.get()).data().grupoId, grupoId);
    assert.equal((await reciboRef.collection('validacoes').get()).size, 2);
    assert.deepEqual((await raiz.doc(`assinaturasGrupos/${grupoId}`).get()).data(), comprasAntes);
    await assert.rejects(getDoc(doc(db, reciboRef.path)), /permission/i);
    const semHabilitacao = { ...opcoes, cliente: { consultar: async () => {
      await configRef.update({ homologacaoAtiva: false }); return resposta;
    } } };
    await assert.rejects(verificarCompraPlayTeste(raiz, req, semHabilitacao), { code: 'failed-precondition' });
    assert.equal((await reciboRef.collection('validacoes').get()).size, 2);
  });
  await t.test('RTDN e entrega privada reconciliam com lease e reconhecem apenas após benefício confirmado', async () => {
    const { receberRtdnPlay, enfileirarEntregaPlay } = require('../functions/assinaturas-play-reconciliacao.cjs');
    const { contaPlay, hash, config } = require('../functions/assinaturas-play.cjs');
    const token = 'fixture_rtdn_' + randomUUID(), compraId = 'google_play_' + hash(token);
    const reciboRef = raiz.doc('assinaturasCompras/' + compraId);
    await reciboRef.set({ versao: 1, uid, grupoId, provedor: 'google_play', pacote: config.pacote, teste: true, token });
    await raiz.doc('assinaturasConfiguracao/google_play').set({ homologacaoAtiva: true, gruposPermitidos: [grupoId], reconhecimentoTesteAtivo: true, direitosHomologados: true });
    let reconhecida = false, posts = 0, consultas = 0;
    const opcoes = { relogio: () => antes, cliente: {
      consultar: async () => { consultas++; return { kind: 'androidpublisher#subscriptionPurchaseV2', testPurchase: {},
        startTime: new Date(antes - 10000).toISOString(), subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
        acknowledgementState: reconhecida ? 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED' : 'ACKNOWLEDGEMENT_STATE_PENDING',
        externalAccountIdentifiers: { obfuscatedExternalAccountId: contaPlay(uid, grupoId) },
        lineItems: [{ productId: 'ta_no_ponto_ouro', offerDetails: { basePlanId: 'mensal' }, expiryTime: new Date(antes + 60000).toISOString(), autoRenewingPlan: { autoRenewEnabled: true } }] }; },
      reconhecer: async () => { posts++; reconhecida = true; },
    } };
    const evento = { data: { message: { messageId: randomUUID(), data: Buffer.from(JSON.stringify({ version: '1.0', packageName: config.pacote,
      eventTimeMillis: String(antes), subscriptionNotification: { version: '1.0', notificationType: 4, purchaseToken: token } })).toString('base64') } } };
    await receberRtdnPlay(raiz, evento, opcoes);
    await receberRtdnPlay(raiz, evento, opcoes);
    assert.equal(posts, 0); assert.equal(consultas, 1);
    assert.equal((await reciboRef.get()).data().observacaoPlay.reconhecimentoPendente, true);
    await raiz.doc(`assinaturasGrupos/${grupoId}`).set({ ...assinatura, compraId }); // Fixture demo: benefício entregue pelo servidor.
    await raiz.doc(`assinaturasEntregas/${compraId}`).set({ versao: 1, confirmada: true, teste: true, uid, grupoId, compraId, produtoId: 'ta_no_ponto_ouro', planoBase: 'mensal' });
    await enfileirarEntregaPlay(raiz, compraId, opcoes);
    await enfileirarEntregaPlay(raiz, compraId, opcoes);
    assert.equal(posts, 1);
    assert.equal((await reciboRef.get()).data().observacaoPlay.reconhecida, true);
    await assert.rejects(getDoc(doc(db, `assinaturasEntregas/${compraId}`)), /permission/i);
  });
  await t.test('funcionários: servidor limita criação e reativação; regras fecham o desvio direto', async () => {
    const { cadastrarFuncionario } = require('../functions/funcionarios-cadastro.cjs');
    await raiz.doc('grupos/' + grupoId).update({ assinaturasAtivas: true });
    await raiz.doc('assinaturasGrupos/' + grupoId).delete(); // Free, somente nesta fixture.
    const operar = (operacao, id) => cadastrarFuncionario(raiz, { auth: { uid }, data: { operacao, id } });
    const ids = [randomUUID(), randomUUID(), randomUUID()];
    const resultados = await Promise.allSettled(ids.map(id => operar('criar', id)));
    assert.equal(resultados.filter(r => r.status === 'fulfilled').length, 2);
    assert.equal(resultados.find(r => r.status === 'rejected').reason.code, 'resource-exhausted');
    const existente = resultados.find(r => r.status === 'fulfilled').value.id;
    assert.equal((await operar('criar', existente)).jaCriado, true);
    const ref = doc(db, 'grupos', grupoId, 'funcionarios', existente);
    await assert.rejects(setDoc(doc(db, 'grupos', grupoId, 'funcionarios', 'forjado'), { ativo: true }), /permission/i);
    await assert.rejects(updateDoc(ref, { ativo: false }), /permission/i);
    await updateDoc(ref, { nome: 'Cadastro editado' });
    await operar('arquivar', existente);
    await assert.rejects(updateDoc(ref, { ativo: true }), /permission/i);
    await operar('reativar', existente);
    assert.equal((await getDoc(ref)).data().ativo, true);
    await assert.rejects(operar('criar', 'outro'), { code: 'resource-exhausted' });
    await assert.rejects(cadastrarFuncionario(raiz, { auth: { uid }, data: { operacao: 'criar', id: 'outro', grupoId: 'forjado' } }), { code: 'invalid-argument' });
    await assert.rejects(operar('garantir', 'usuario-inexistente'), { code: 'not-found' });
    await raiz.doc('grupos/' + grupoId).update({ assinaturasAtivas: false });
    await setDoc(doc(db, 'grupos', grupoId, 'funcionarios', 'transicao'), { ativo: true });
  });

});
