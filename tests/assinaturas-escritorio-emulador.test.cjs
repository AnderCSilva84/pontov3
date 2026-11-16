const test = require('node:test'), assert = require('node:assert/strict'), { randomUUID } = require('node:crypto');
test('Escritório: plano, perfil, regras e preservação do histórico', { skip: !process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST }, async t => {
  assert.match(process.env.GCLOUD_PROJECT, /^demo-/);
  process.env.FIREBASE_CONFIG = JSON.stringify({ projectId: process.env.GCLOUD_PROJECT });
  const admin = require('../functions/node_modules/firebase-admin'), api = require('../functions/index.js'), raiz = admin.firestore();
  const { bancoDoGrupo } = require('../functions/grupos-contexto.cjs');
  const { operarEscritorio } = require('../functions/escritorio-operacoes.cjs');
  const { initializeApp, deleteApp } = await import('firebase/app');
  const { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signOut } = await import('firebase/auth');
  const { getFirestore, connectFirestoreEmulator, doc, getDoc, getDocs, collection, setDoc, updateDoc, deleteDoc, terminate, query, where } = await import('firebase/firestore');
  const clientApp = initializeApp({ projectId: process.env.GCLOUD_PROJECT, apiKey: 'demo-key' }, 'escritorio-' + randomUUID());
  const auth = getAuth(clientApp), client = getFirestore(clientApp);
  connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
  const [host, porta] = process.env.FIRESTORE_EMULATOR_HOST.split(':'); connectFirestoreEmulator(client, host, Number(porta));
  const uid = (await createUserWithEmailAndPassword(auth, `escritorio-${randomUUID()}@example.test`, 'Ficticia-123456')).user.uid;
  t.after(async () => { await signOut(auth); await terminate(client); await deleteApp(clientApp); await admin.app().delete(); });
  const folha = { competencia: '2026-11', salarioBase: 2500, divisorHoras: 220, observacao: '' };
  async function fixture(plano) {
    const grupoId = 'escritorio_' + randomUUID(), db = bancoDoGrupo(raiz, grupoId);
    await raiz.doc(`grupos/${grupoId}`).set({ ativo: true, titularUid: uid, assinaturasAtivas: true });
    await raiz.doc(`vinculosUsuarios/${uid}`).set({ grupoId, ativo: true });
    await db.doc(`users/${uid}`).set({ role: 'admin', ativo: true });
    await db.doc('funcionarios/f').set({ nome: 'Funcionário fictício', ativo: true, salarioBase: 2500 });
    await db.doc('financeiro/historico-12345').set({ funcionarioId: 'f', valor: 100, competenciaMes: '2026-11', tipo: 'vale' });
    await db.doc('documentosTrabalhistas/antigo').set({ funcionarioId: 'f', titulo: 'Documento anterior', mesReferencia: '2026-11', url: 'https://example.test/antigo.pdf' });
    await db.doc('folhasPagamento/antiga').set({ funcionarioId: 'f', competencia: '2026-10', status: 'paga', liquido: 100 });
    const assinatura = raiz.doc(`assinaturasGrupos/${grupoId}`);
    if (plano !== 'free') await assinatura.set({ versao: 1, plano, provedor: 'google_play', verificado: true, estado: 'ativo', inicioEm: Date.now() - 10000, validoAte: Date.now() + 600000 });
    const op = (operacao, id, dados) => operarEscritorio(raiz, { auth: { uid }, data: { operacao, id, ...(dados ? { dados } : {}) } });
    const chamar = (fn, data) => api[fn].run({ auth: { uid }, data });
    return { grupoId, db, assinatura, op, chamar };
  }
  await t.test('Free bloqueia cadastro, filiais, documentos, folhas, pagamentos e parcelas no servidor', async () => {
    const f = await fixture('free');
    const operacoes = [
      () => f.op('cadastro', 'f', { salarioBase: 3000 }),
      () => f.op('filial', 'nova', { nome: 'Filial fictícia' }),
      () => f.op('documento', 'novo', { titulo: 'Teste', tipo: 'contrato', url: 'https://example.test/t.pdf', mesReferencia: '2026-11', funcionarioId: 'f' }),
      () => f.op('excluirDocumento', 'antigo'),
      () => f.chamar('salvarFolhaPagamento', { folha, funcionarioId: 'f', versao: 0 }),
      () => f.chamar('criarLancamentoFinanceiro', { tipo: 'salario', funcionarioId: 'f', valor: 100, descontos: 0, competenciaMes: '2026-11', dataPagamento: '2026-11-15' }),
      () => f.chamar('criarLancamentoFinanceiro', { tipo: 'salario', folhaId: 'antiga', dataPagamento: '2026-11-15' }),
      () => f.chamar('excluirLancamentoFinanceiro', { id: 'historico-12345' }),
      () => f.chamar('criarLancamentoFinanceiro', { tipo: 'adiantamento', funcionarioId: 'f', valor: 100, descontos: 0, descontoFolha: true, quantidadeParcelas: 1, primeiraCompetencia: '2026-12', competenciaMes: '2026-11', dataPagamento: '2026-11-15', descricao: 'Fictício', chaveOperacao: randomUUID() }),
      () => f.chamar('cancelarParcelasAdiantamento', { id: 'historico-12345', motivo: 'Motivo fictício', aPartir: '2026-12' }),
      () => f.chamar('criarLancamentoFinanceiro', { tipo: 'decimo_terceiro', funcionarioId: 'f', competenciaMes: '2026-11', dataPagamento: '2026-11-15', conferido: true, chaveOperacao: randomUUID(), calculoEspecial: { salario: 3000, avos13: 12, parcela: 'segunda', adiantado: 1500 } }),
    ];
    for (const operacao of operacoes) await assert.rejects(operacao(), e => e.code === 'failed-precondition' && e.details?.recurso === 'escritorioContabil');
    assert.equal((await f.db.doc('funcionarios/f').get()).data().salarioBase, 2500);
    assert.equal((await f.db.collection('filiais').get()).size, 0);
    assert.equal((await f.db.collection('financeiro').get()).size, 1);
    assert.equal((await f.db.collection('folhasPagamento').get()).size, 1);
    assert.equal((await f.db.collection('documentosTrabalhistas').get()).size, 1);
  });
  for (const plano of ['prata','ouro','diamante']) await t.test(`${plano} permite operações via servidor, sem abrir escrita direta`, async () => {
    const f = await fixture(plano);
    await f.op('cadastro', 'f', { salarioBase: 3000 });
    await assert.rejects(f.op('cadastro', 'f', { ativo: true }), { code: 'invalid-argument' });
    await f.op('filial', 'nova', { nome: 'Filial fictícia' });
    assert.equal((await f.op('filial', 'nova', { nome: 'Filial fictícia' })).jaCriado, true);
    await f.op('documento', 'novo', { titulo: 'Teste', tipo: 'contrato', url: 'https://example.test/t.pdf', mesReferencia: '2026-11', funcionarioId: 'f' });
    await f.chamar('salvarFolhaPagamento', { folha, funcionarioId: 'f', versao: 0 });
    await f.chamar('criarLancamentoFinanceiro', { tipo: 'salario', funcionarioId: 'f', valor: 100, descontos: 0, competenciaMes: '2026-11', dataPagamento: '2026-11-15' });
    await f.op('excluirDocumento', 'novo');
    assert.equal((await f.op('documento', 'novo', { titulo: 'Teste', tipo: 'contrato', url: 'https://example.test/t.pdf', mesReferencia: '2026-11', funcionarioId: 'f' })).jaCriado, true);
    assert.equal((await f.db.doc('documentosTrabalhistas/novo').get()).exists, false);
    await assert.rejects(updateDoc(doc(client, 'grupos', f.grupoId, 'funcionarios', 'f'), { salarioBase: 1 }), /permission/i);
    await assert.rejects(setDoc(doc(client, 'grupos', f.grupoId, 'filiais', 'direta'), { nome: 'Forjada' }), /permission/i);
    await assert.rejects(setDoc(doc(client, 'grupos', f.grupoId, 'documentosTrabalhistas', 'direto'), { funcionarioId: 'f' }), /permission/i);
    await assert.rejects(updateDoc(doc(client, 'grupos', f.grupoId, 'folhasPagamento', 'f_2026-11'), { salarioBase: 1 }), /permission/i);
  });
  await t.test('expiração bloqueia operação nova e mantém consultas do histórico; grupo alheio continua isolado', async () => {
    const f = await fixture('prata');
    await f.assinatura.update({ validoAte: Date.now() - 1 });
    await assert.rejects(f.op('cadastro', 'f', { salarioBase: 1 }), { code: 'failed-precondition' });
    for (const colecao of ['financeiro','documentosTrabalhistas','folhasPagamento']) assert.equal((await getDocs(collection(client, 'grupos', f.grupoId, colecao))).size, 1);
    await assert.rejects(deleteDoc(doc(client, 'grupos', f.grupoId, 'documentosTrabalhistas', 'antigo')), /permission/i);
    await updateDoc(doc(client, 'grupos', f.grupoId, 'funcionarios', 'f'), { cargaSegSexMin: 480 }); // Ponto segue independente do Escritório.
    await assert.rejects(getDoc(doc(client, 'grupos', 'outro', 'financeiro', 'historico-12345')), /permission/i);
    await f.assinatura.update({ validoAte: Date.now() + 600000 });
    await f.db.doc(`users/${uid}`).update({ role: 'funcionario' });
    await assert.rejects(f.op('cadastro', 'f', { salarioBase: 1 }), { code: 'permission-denied' });
    await f.db.doc(`users/${uid}`).update({ funcionarioId: 'f' });
    await f.assinatura.update({ validoAte: Date.now() - 1 });
    assert.equal((await getDocs(query(collection(client, 'grupos', f.grupoId, 'financeiro'), where('funcionarioId', '==', 'f')))).size, 1);
    await assert.rejects(getDocs(collection(client, 'grupos', f.grupoId, 'financeiro')), /permission/i);
  });
  await t.test('transição preserva o acesso existente', async () => {
    const f = await fixture('free'); await raiz.doc(`grupos/${f.grupoId}`).update({ assinaturasAtivas: false });
    await f.op('cadastro', 'f', { salarioBase: 2800 });
    await updateDoc(doc(client, 'grupos', f.grupoId, 'funcionarios', 'f'), { salarioBase: 2900 });
    assert.equal((await f.db.doc('funcionarios/f').get()).data().salarioBase, 2900);
  });
});
