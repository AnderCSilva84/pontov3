const test = require('node:test'), assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

test('cotas de tarefas e lembretes: fronteiras compartilhadas e bloqueio de escrita direta', { skip: !process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST }, async t => {
  assert.match(process.env.GCLOUD_PROJECT, /^demo-/);
  const admin = require('../functions/node_modules/firebase-admin');
  const app = admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT }, 'cotas-' + randomUUID()), raiz = app.firestore();
  const { bancoDoGrupo } = require('../functions/grupos-contexto.cjs');
  const { cadastrarTarefa } = require('../functions/tarefas-cadastro.cjs');
  const { operarLembretes } = require('../functions/lembretes.cjs');
  const { initializeApp, deleteApp } = await import('firebase/app');
  const { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signOut } = await import('firebase/auth');
  const { getFirestore, connectFirestoreEmulator, doc, setDoc, updateDoc, terminate } = await import('firebase/firestore');
  const clientApp = initializeApp({ projectId: process.env.GCLOUD_PROJECT, apiKey: 'demo-key' }, 'cotas-' + randomUUID());
  const auth = getAuth(clientApp), client = getFirestore(clientApp);
  connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
  const [host, porta] = process.env.FIRESTORE_EMULATOR_HOST.split(':'); connectFirestoreEmulator(client, host, Number(porta));
  const uid = (await createUserWithEmailAndPassword(auth, `cotas-${randomUUID()}@example.test`, 'Ficticia-123456')).user.uid;
  t.after(async () => { await signOut(auth); await terminate(client); await deleteApp(clientApp); await app.delete(); });
  const agora = Date.parse('2027-01-04T09:00:00Z');
  async function fixture(plano) {
    const grupoId = 'cotas_' + randomUUID(), db = bancoDoGrupo(raiz, grupoId);
    await raiz.doc(`grupos/${grupoId}`).set({ ativo: true, titularUid: uid, assinaturasAtivas: true });
    await raiz.doc(`vinculosUsuarios/${uid}`).set({ grupoId, ativo: true });
    await db.doc(`users/${uid}`).set({ role: 'admin', ativo: true, nome: 'Teste', lembretesHabilitados: true });
    if (plano !== 'free') await raiz.doc(`assinaturasGrupos/${grupoId}`).set({ versao: 1, plano, verificado: true, provedor: 'google_play', estado: 'ativo', inicioEm: Date.now() - 10000, validoAte: Date.now() + 600000 });
    const tarefa = (tipo, id, operacao = 'criar', operacaoId = randomUUID()) => cadastrarTarefa(raiz, { auth: { uid }, data: { operacao, tipo, id, ...(operacao === 'reabrir' ? { operacaoId } : {}), ...(operacao === 'criar' ? { dados: { titulo: 'Teste', turno: 'manha', horario: '', ...(tipo === 'fixa' ? { diaSemana: 1 } : { dataAgendada: '2027-01-04' }) } } : {}) } });
    const lembrete = (operacao, dados, instante = agora) => operarLembretes(db, { auth: { uid }, data: { operacao, ...dados } }, instante);
    return { grupoId, db, tarefa, lembrete };
  }
  for (const [plano, tarefas, lembretes] of [['free', 20, 10], ['prata', 100, 30], ['ouro', 200, 100], ['diamante', 500, 200]]) {
    await t.test(`${plano}: fixas e avulsas disputam a mesma última vaga (${tarefas})`, async () => {
      const f = await fixture(plano), batch = raiz.batch();
      for (let i = 0; i < tarefas - 1; i++) batch.set(f.db.doc(`tarefasSemanais/antiga${i}`), { ativa: true });
      batch.set(f.db.doc('tarefas/historico'), { concluida: true }); await batch.commit();
      const rs = await Promise.allSettled([f.tarefa('fixa', 'nova-fixa'), f.tarefa('avulsa', 'nova-avulsa')]);
      assert.equal(rs.filter(r => r.status === 'fulfilled').length, 1);
      assert.equal(rs.find(r => r.status === 'rejected').reason.code, 'resource-exhausted');
      const vencedora = rs[0].status === 'fulfilled' ? 'fixa' : 'avulsa', id = rs.find(r => r.status === 'fulfilled').value.id;
      assert.equal((await f.tarefa(vencedora, id)).jaCriada, true);
      assert.equal((await f.db.collection('notificacoes').get()).size, 1);
      await assert.rejects(setDoc(doc(client, 'grupos', f.grupoId, 'tarefas', 'forjada'), { concluida: false }), /permission/i);
      await assert.rejects(updateDoc(doc(client, 'grupos', f.grupoId, 'tarefas', 'historico'), { concluida: false }), /permission/i);
      await updateDoc(doc(client, 'grupos', f.grupoId, 'tarefasSemanais', 'antiga0'), { ativa: false });
      const operacaoId = randomUUID();
      await f.tarefa('avulsa', 'historico', 'reabrir', operacaoId);
      await updateDoc(doc(client, 'grupos', f.grupoId, 'tarefas', 'historico'), { concluida: true });
      assert.equal((await f.tarefa('avulsa', 'historico', 'reabrir', operacaoId)).jaProcessada, true);
      assert.equal((await f.db.doc('tarefas/historico').get()).data().concluida, true);
      await f.tarefa('avulsa', 'historico', 'reabrir');
      await assert.rejects(updateDoc(doc(client, 'grupos', f.grupoId, 'tarefasSemanais', 'antiga0'), { ativa: true }), /permission/i);
      await assert.rejects(f.tarefa('fixa', 'antiga0', 'reabrir'), { code: 'resource-exhausted' });
    });
    await t.test(`${plano}: cuidados e avisos disputam a mesma última vaga (${lembretes})`, async () => {
      const f = await fixture(plano), batch = raiz.batch();
      for (let i = 0; i < lembretes - 1; i++) batch.set(f.db.doc(`lembretes/alimentacao${i}`), { ativo: true, dominio: 'alimentacao' });
      batch.set(f.db.doc('lembretes/pausado'), { ativo: false }); await batch.commit();
      const base = { usuarioId: uid, titulo: 'Teste', horario: '12:00', dataInicio: '2027-01-04', repeticao: 'diario' };
      const rs = await Promise.allSettled([f.lembrete('salvar', { ...base, tipo: 'outro' }), f.lembrete('geralSalvar', { ...base, id: 'geral' })]);
      assert.equal(rs.filter(r => r.status === 'fulfilled').length, 1);
      assert.equal(rs.find(r => r.status === 'rejected').reason.code, 'resource-exhausted');
      assert.equal((await f.db.collection('lembretes').where('ativo', '==', true).get()).size, lembretes);
      assert.equal((await f.db.collection('avisosEnvios').get()).size, rs[1].status === 'fulfilled' ? 1 : 0);
      const id = rs.find(r => r.status === 'fulfilled').value.id, geral = rs[1].status === 'fulfilled';
      await f.lembrete(geral ? 'geralPausar' : 'pausar', { id, versao: 1, ativo: false });
      await f.lembrete('geralSalvar', { ...base, id: 'substituto' });
      await assert.rejects(f.lembrete(geral ? 'geralPausar' : 'pausar', { id, versao: 2, ativo: true }), { code: 'resource-exhausted' });
      await assert.rejects(setDoc(doc(client, 'grupos', f.grupoId, 'lembretes', 'forjado'), { ativo: true }), /permission/i);
    });
  }
  await t.test('conclusão do aviso único libera vaga após todas as doses, recorrente mantém vaga', async () => {
    const f = await fixture('free'), ms = Date.parse('2027-01-04T15:00:00Z');
    const base = { usuarioId: uid, titulo: 'Teste', tipo: 'outro', horario: '12:00', dataInicio: '2027-01-04', repeticao: 'uma_vez' };
    const unico = (await f.lembrete('salvar', base)).id;
    await f.lembrete('concluir', { id: unico, ocorrenciaId: '1_' + ms }, ms);
    assert.equal((await f.db.doc('lembretes/' + unico).get()).data().ativo, false);
    const recorrente = (await f.lembrete('salvar', { ...base, repeticao: 'diario' })).id;
    await f.lembrete('concluir', { id: recorrente, ocorrenciaId: '1_' + ms }, ms);
    assert.equal((await f.db.doc('lembretes/' + recorrente).get()).data().ativo, true);
    const geral = (await f.lembrete('geralSalvar', { ...base, id: 'unico-geral' })).id;
    await f.lembrete('geralConcluir', { id: geral, ocorrenciaId: '1_' + ms }, ms);
    assert.equal((await f.db.doc('lembretes/' + geral).get()).data().ativo, false);
    const doses = (await f.lembrete('salvar', { ...base, tipo: 'remedio', medicamento: 'Medicamento fictício', posologia: 'Orientação fictícia', horarios: ['12:00', '13:00'] })).id;
    const ref = f.db.doc('lembretes/' + doses);
    await ref.update({ proximoDisparoEm: null }); // Duas doses já disparadas, ainda pendentes.
    await ref.collection('ocorrencias').doc('1_' + ms).set({ horarioMs: ms, status: 'enviado' });
    await ref.collection('ocorrencias').doc('1_' + (ms + 3600000)).set({ horarioMs: ms + 3600000, status: 'enviado' });
    await f.lembrete('concluir', { id: doses, ocorrenciaId: '1_' + ms }, ms + 3600000);
    assert.equal((await ref.get()).data().ativo, true);
    await f.lembrete('concluir', { id: doses, ocorrenciaId: '1_' + (ms + 3600000) }, ms + 3600000);
    assert.equal((await ref.get()).data().ativo, false);
  });
  await t.test('alimentação conta cada refeição e a redução de um plano libera vagas atomicamente', async () => {
    const f = await fixture('free');
    for (let i = 0; i < 9; i++) await f.db.doc(`lembretes/antigo${i}`).set({ ativo: true });
    const plano = { id: 'plano', operacaoId: randomUUID(), versao: 0, titulo: 'Teste', dataInicio: '2027-01-04', dataFim: '2027-01-06', repeticao: 'diario', destinatarios: 'todos', usuarioIds: [], refeicoes: [{ id: 'cafe', nome: 'Café', horario: '07:00', sugestao: 'Teste' }, { id: 'almoco', nome: 'Almoço', horario: '12:00', sugestao: 'Teste' }] };
    await assert.rejects(f.lembrete('alimentacaoSalvar', plano), { code: 'resource-exhausted' });
    assert.equal((await f.db.doc('planosAlimentares/plano').get()).exists, false);
    await f.db.doc('lembretes/antigo0').update({ ativo: false });
    await f.lembrete('alimentacaoSalvar', plano);
    assert.equal((await f.db.collection('lembretes').where('ativo', '==', true).get()).size, 10);
    await f.lembrete('alimentacaoSalvar', { ...plano, operacaoId: randomUUID(), versao: 1, refeicoes: [plano.refeicoes[0]] });
    assert.equal((await f.db.collection('lembretes').where('ativo', '==', true).get()).size, 9);
  });
});
