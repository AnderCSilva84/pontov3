const test = require('node:test');
const assert = require('node:assert/strict');

test('unidade pendente não bloqueia leitura; servidor impede conversão e importa demais com total fiscal', {skip: !process.env.FIRESTORE_EMULATOR_HOST}, async t => {
  const admin = require('../functions/node_modules/firebase-admin');
  const app = admin.initializeApp({projectId: 'demo-cupom-unidades-pendentes'}, 'unidades-pendentes');
  const db = app.firestore();
  t.after(() => app.delete());
  const {operarCupom} = require('../functions/cupom-operacoes.cjs');
  await db.doc('users/admin').set({role: 'admin', ativo: true, nome: 'Teste fictício'});
  await db.doc('categoriasCompras/limpeza').set({ativo: true, nome: 'Limpeza'});
  await db.doc('supermercados/demo').set({ativo: true, nome: 'Loja fictícia', filial: 'Teste', cidade: 'Teste'});
  const op = (operacao, data) => operarCupom(db, {auth: {uid: 'admin'}, data: {operacao, ...data}});
  const f = require('./fixtures/cupom-pa.cjs')('000000941');
  const r = await op('cupomPreparar', {texto: f.texto.replace('UN: KG', 'UN: M²')});
  assert.equal(r.nota.itens[2].unidadePendente, true);
  const itens = r.nota.itens.map(i => ({...i, descartar: false, novoConfirmado: true, categoriaId: 'limpeza', apresentacao: 'Frasco fictício'}));
  const dados = {rascunhoId: r.rascunhoId, supermercadoId: 'demo', versaoIdentidade: 1, itens};
  await assert.rejects(op('cupomConfirmar', {...dados, itens: itens.map(i => ({...i, unidadeCompra: 'un', unidadeConfirmada: true, unidadePendente: false}))}), /unidade M² precisa de revisão/);
  assert.equal((await db.doc(`comprasCupons/${f.chave}`).get()).exists, false);
  itens[2].descartar = true;
  await db.doc('catalogoCompras/incompativel').set({nome: 'PRODUTO FICTÍCIO', ativo: true, unidadeCompra: 'kg', categoriaId: 'limpeza', apresentacao: 'A granel', tiposCompra: ['supermercado']});
  await assert.rejects(op('cupomConfirmar', {...dados, itens: itens.map((i,n) => n === 0 ? {...i, produtoId: 'incompativel'} : i)}), e => {
    assert.equal(e.details.linha, 1);
    assert.match(e.details.linhas[0].mensagem, /Unidades de compra diferentes/);
    return true;
  });
  const result = await op('cupomConfirmar', dados);
  const lista = (await db.doc('comprasListas/' + result.listaId).get()).data();
  assert.equal(lista.totalCentavos, 5000);
  assert.equal(lista.totalOriginalCentavos, 5356);
  assert.equal(lista.totalProdutosDescartadosCentavos, 3356);
  assert.equal((await db.collection('comprasPrecos').get()).size, 2);
  assert.equal((await db.doc('comprasCuponsRascunhos/' + r.rascunhoId).get()).data().nota.itens[2].unidadeOriginal, 'M²');
  assert.equal((await op('cupomConfirmar', dados)).jaImportada, true);
});
