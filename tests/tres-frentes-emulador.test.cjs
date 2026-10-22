const test = require('node:test');
const assert = require('node:assert/strict');

test('ponto somente pela funcionária e importação GF com compra sem preço', { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async t => {
  assert.ok(process.env.GCLOUD_PROJECT?.startsWith('demo-'));
  process.env.GCLOUD_PROJECT += '-frentes';
  process.env.FIREBASE_CONFIG = JSON.stringify({ projectId: process.env.GCLOUD_PROJECT });
  const admin = require('../functions/node_modules/firebase-admin');
  const api = require('../functions/index.js');
  const db = admin.firestore();
  t.after(() => admin.app().delete());
  const uid = 'frentes-funcionaria', fid = 'frentes-joseane';
  await db.doc(`users/${uid}`).set({ role: 'funcionario', ativo: true, funcionarioId: fid, nome: 'Nome de login diferente' });
  await db.doc('users/frentes-admin').set({ role: 'admin', ativo: true, funcionarioId: fid, nome: 'Anderson fictício' });
  await db.doc('users/frentes-inativa').set({ role: 'funcionario', ativo: false, funcionarioId: fid });
  await db.doc(`funcionarios/${fid}`).set({ nome: 'Joseane fictícia', ativo: true, locaisPermitidos: ['frentes-local'] });
  await db.doc('locais/frentes-local').set({ ativo: true, raioMetros: 100, localizacao: { latitude: 0, longitude: 0 } });
  const ponto = (usuario, funcionarioId = fid, tipo = 'ENTRADA', latitude = 0) => api.registrarPonto.run({ auth: { uid: usuario }, data: { funcionarioId, tipo, latitude, longitude: 0 } });
  await t.test('admin, outra funcionária, perfil inativo e local errado não marcam; autora real fica no registro', async () => {
    await assert.rejects(ponto('frentes-admin'), { code: 'permission-denied' });
    await assert.rejects(ponto(uid, 'outra-funcionaria'), { code: 'permission-denied' });
    await assert.rejects(ponto('frentes-inativa'), { code: 'permission-denied' });
    await assert.rejects(ponto(uid, fid, 'ENTRADA', 1), { code: 'permission-denied' });
    const r = await ponto(uid);
    const dia = (await db.doc(`dias/${fid}_${r.dataKey}`).get()).data();
    assert.equal(dia.funcionarioId, fid); assert.equal(dia.entrada, r.hora);
    const registros = await db.collection('registros').where('funcionarioId', '==', fid).get();
    assert.equal(registros.size, 1);
    assert.equal(registros.docs[0].data().registradoPor, uid);
    assert.equal(registros.docs[0].data().funcionarioNome, 'Joseane fictícia');
    await assert.rejects(ponto(uid), { code: 'failed-precondition' });
  });
  await t.test('regras bloqueiam alterações diretas de administrador e permitem consultar o ponto', async () => {
    const { initializeApp, deleteApp } = await import('firebase/app');
    const { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signOut } = await import('firebase/auth');
    const { getFirestore, connectFirestoreEmulator, setDoc, getDoc, updateDoc, deleteDoc, doc, terminate } = await import('firebase/firestore');
    const app = initializeApp({ projectId: process.env.GCLOUD_PROJECT, apiKey: 'demo-key' }, 'frentes-regras');
    const auth = getAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9098', { disableWarnings: true });
    const client = getFirestore(app); connectFirestoreEmulator(client, '127.0.0.1', 8877);
    try {
      const pessoa = await createUserWithEmailAndPassword(auth, 'frentes-admin@example.test', 'Teste-ficticio-123');
      await db.doc(`users/${pessoa.user.uid}`).set({ role: 'admin', ativo: true });
      await db.doc('dias/frentes-regra').set({ funcionarioId: fid, entrada: '08:00' });
      await db.doc('registros/frentes-regra').set({ funcionarioId: fid, tipo: 'ENTRADA' });
      for (const colecao of ['dias', 'registros', 'ajustesPonto']) {
        await assert.rejects(setDoc(doc(client, colecao, 'frentes-novo'), { funcionarioId: fid }), /permission/i);
        await assert.rejects(updateDoc(doc(client, colecao, 'frentes-regra'), { entrada: '09:00' }), /permission/i);
        await assert.rejects(deleteDoc(doc(client, colecao, 'frentes-regra')), /permission/i);
      }
      assert.equal((await getDoc(doc(client, 'dias', 'frentes-regra'))).data().entrada, '08:00');
    } finally { await signOut(auth); await terminate(client); await deleteApp(app); }
  });
  const op = (operacao, dados = {}, usuario = 'frentes-admin') => api.comprasOperacao.run({ auth: { uid: usuario }, data: { operacao, ...dados } });
  const listaId = 'frentes-sem-preco';
  await op('inicializar');
  await op('produto', { produtoId: 'frentes-garrafa', nome: 'PRODUTO A 500ML', apresentacao: 'Garrafa 500 mL', categoriaId: 'bebidas', unidadeCompra: 'un' });
  const mercado = await op('supermercado', { nome: 'Mercado fictício frentes', filial: 'Centro', cidade: 'Belém' });
  await op('criar', { listaId, titulo: 'Jantar teste' });
  await op('adicionar', { listaId, produtoId: 'frentes-garrafa', quantidadePlanejada: 2 }, uid);
  await op('iniciar', { listaId });
  await t.test('marcar sem preço não inventa valor; impede fechamento e preserva versão/permissão', async () => {
    const dados = { listaId, itemId: 'frentes-garrafa', versao: 1, estado: 'comprado_sem_preco' };
    await assert.rejects(op('item', dados, uid), /administrador/);
    await op('item', dados);
    const item = (await db.doc(`comprasListas/${listaId}/itens/frentes-garrafa`).get()).data();
    assert.equal(item.estado, 'comprado_sem_preco'); assert.equal(item.quantidadeComprada, 2);
    assert.equal(item.precoUnitarioCentavos, undefined); assert.equal(item.totalCentavos, undefined);
    assert.ok(item.compradoEm); assert.equal(item.solicitadaPor, uid);
    await assert.rejects(op('item', dados), /outro celular/);
    const lista = (await db.doc(`comprasListas/${listaId}`).get()).data();
    await assert.rejects(op('finalizar', { listaId, versao: lista.versao, aceitarPendentes: true }), /sem preço/);
    assert.equal((await db.collection('comprasPrecos').where('listaId', '==', listaId).get()).size, 0);
  });
  await t.test('cupom com FO importa, casa item sem preço, preserva autoria e mantém bruto/líquido distintos', async () => {
    const f = require('./fixtures/cupom-pa.cjs')('000000811');
    const r = await op('cupomPreparar', { listaDestinoId: listaId, link: f.link, texto: f.texto.replaceAll('UN: FR', 'UN: FO') });
    assert.equal(r.nota.itens[0].unidadeCompra, 'un');
    const itens = r.nota.itens.map(i => ({ linha: i.linha, descartar: false, itemPlanejadoId: i.codigo === '123' ? 'frentes-garrafa' : '', produtoId: i.codigo === '123' ? 'frentes-garrafa' : '', nome: i.nome, apresentacao: i.codigo === '123' ? 'Garrafa 500 mL' : 'A granel', categoriaId: i.codigo === '123' ? 'bebidas' : 'mercearia' }));
    const resultado = await op('cupomConfirmar', { rascunhoId: r.rascunhoId, supermercadoId: mercado.supermercadoId, titulo: 'Jantar importado', itens });
    assert.equal(resultado.listaId, listaId);
    const lista = (await db.doc(`comprasListas/${listaId}`).get()).data();
    assert.equal(lista.status, 'finalizada'); assert.equal(lista.totalCentavos, 5000); assert.equal(lista.totalOriginalCentavos, 5356);
    const item = (await db.doc(`comprasListas/${listaId}/itens/frentes-garrafa`).get()).data();
    assert.equal(item.estado, 'comprado'); assert.equal(item.quantidadeComprada, 1); assert.equal(item.precoUnitarioCentavos, 1000); assert.equal(item.solicitadaPor, uid);
    const precos = await db.collection('comprasPrecos').where('listaId', '==', listaId).get();
    assert.equal(precos.size, 3); // Uma linha por lançamento fiscal, inclusive produtos repetidos.
    assert.equal(precos.docs.filter(d => d.data().produtoId === 'frentes-garrafa').reduce((s, d) => s + d.data().quantidadeComprada, 0), 2);
    assert.equal((await op('cupomConfirmar', { rascunhoId: r.rascunhoId, supermercadoId: mercado.supermercadoId, itens })).jaImportada, true);
  });
  await t.test('preço individual continua funcionando após marcar sem preço', async () => {
    const id = 'frentes-manual';
    await op('criar', { listaId: id, titulo: 'Manual' });
    await op('adicionar', { listaId: id, produtoId: 'frentes-garrafa', quantidadePlanejada: 3 });
    await op('iniciar', { listaId: id });
    await op('item', { listaId: id, itemId: 'frentes-garrafa', versao: 1, estado: 'comprado_sem_preco' });
    await op('item', { listaId: id, itemId: 'frentes-garrafa', versao: 2, estado: 'comprado', quantidadeComprada: 3, precoUnitarioCentavos: 1050, supermercadoId: mercado.supermercadoId, marca: 'Marca teste' });
    const lista = (await db.doc(`comprasListas/${id}`).get()).data();
    assert.equal((await op('finalizar', { listaId: id, versao: lista.versao, aceitarPendentes: true })).totalCentavos, 3150);
  });
  await t.test('código comercial novo exige confirmação no servidor, sem impedir leitura nem gravar parcialmente', async () => {
    const f = require('./fixtures/cupom-pa.cjs')('000000812');
    const r = await op('cupomPreparar', { texto: f.texto.replaceAll('UN: FR', 'UN: XZ') });
    assert.equal(r.nota.itens[0].unidadeConferir, true);
    const itens = r.nota.itens.map(i => ({ ...i, descartar: false, nome: i.nome || i.nomeOriginal, categoriaId: 'mercearia', apresentacao: i.unidadeCompra === 'kg' ? 'A granel' : 'Embalagem teste' }));
    const dados = { rascunhoId: r.rascunhoId, supermercadoId: mercado.supermercadoId, itens };
    await assert.rejects(op('cupomConfirmar', dados), /Confirme a unidade comercial XZ/);
    await assert.rejects(op('cupomConfirmar', { ...dados, itens: itens.map(i => ({ ...i, unidadeConfirmada: 'true' })) }), /Confirme a unidade/);
    assert.equal((await db.doc(`comprasCupons/${f.chave}`).get()).exists, false);
    assert.equal((await db.doc(`comprasCuponsRascunhos/${r.rascunhoId}`).get()).data().listaId, undefined);
    const confirmado = await op('cupomConfirmar', { ...dados, itens: itens.map(i => ({ ...i, unidadeConfirmada: true })) });
    const lista = (await db.doc(`comprasListas/${confirmado.listaId}`).get()).data();
    assert.equal(lista.status, 'finalizada'); assert.equal(lista.totalCentavos, 5000);
    const importados = await db.collection(`comprasListas/${confirmado.listaId}/itens`).get();
    assert.equal(importados.docs.filter(d => d.data().unidadeOriginalFiscal === 'XZ').length, 2);
    const proxima = require('./fixtures/cupom-pa.cjs')('000000813');
    const lembrada = await op('cupomPreparar', { texto: proxima.texto.replaceAll('UN: FR', 'UN: XZ') });
    assert.equal(lembrada.nota.itens[0].unidadeConferir, false);
    assert.equal(lembrada.nota.itens[0].unidadeReconhecida, true);
    assert.equal(lembrada.nota.itens[0].reconhecido, true);
    assert.equal(lembrada.nota.itens[0].quantidade, 1);
    assert.equal(lembrada.nota.itens[0].precoUnitarioCentavos, 1000);
    const novamente = await op('cupomConfirmar', { rascunhoId: lembrada.rascunhoId, supermercadoId: mercado.supermercadoId, itens: lembrada.nota.itens.map(i => ({ ...i, descartar: false })) });
    assert.equal((await db.doc(`comprasListas/${novamente.listaId}`).get()).data().totalCentavos, 5000);
    const terceira = require('./fixtures/cupom-pa.cjs')('000000814');
    assert.equal((await op('cupomPreparar', { texto: terceira.texto.replaceAll('UN: FR', 'UN: XZ') })).nota.itens[0].unidadeReconhecida, true);
    assert.equal((await op('cupomPreparar', { texto: terceira.texto.replaceAll('UN: FR', 'UN: XZ2') })).nota.itens[0].unidadeConferir, true);
    assert.equal((await op('cupomPreparar', { texto: terceira.texto.replaceAll('UN: FR', 'UN: XZ').replaceAll('PRODUTO A 500ML', 'OUTRO PRODUTO') })).nota.itens[0].unidadeConferir, true);
  });
});
