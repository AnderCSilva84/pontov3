const test = require('node:test'), assert = require('node:assert/strict'), { randomUUID } = require('node:crypto');
test('compartilhamento: acesso transacional, expiração, regras, ponto e preservação de identidade', { skip: !process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST }, async t => {
  assert.match(process.env.GCLOUD_PROJECT, /^demo-/); process.env.FIREBASE_CONFIG = JSON.stringify({ projectId: process.env.GCLOUD_PROJECT });
  const admin = require('../functions/node_modules/firebase-admin'), api = require('../functions/index.js'), raiz = admin.firestore();
  const { gerirAcesso } = require('../functions/gestao-acessos.cjs'), { bancoDoGrupo } = require('../functions/grupos-contexto.cjs');
  const { registrarOperacao, partesOperacionais } = require('../functions/ponto-operacoes.cjs');
  const { initializeApp, deleteApp } = await import('firebase/app');
  const { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } = await import('firebase/auth');
  const { getFirestore, connectFirestoreEmulator, doc, getDocFromServer: getDoc, setDoc, updateDoc, getDocs, collection, query, where, terminate } = await import('firebase/firestore');
  const clientApp = initializeApp({ projectId: process.env.GCLOUD_PROJECT, apiKey: 'demo-key' }, 'compartilhamento-' + randomUUID());
  const auth = getAuth(clientApp), client = getFirestore(clientApp), senha = 'Ficticia-123456', email = `titular-${randomUUID()}@example.test`;
  connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
  const [host, porta] = process.env.FIRESTORE_EMULATOR_HOST.split(':'); connectFirestoreEmulator(client, host, Number(porta));
  const uid = (await createUserWithEmailAndPassword(auth, email, senha)).user.uid;
  const emailMembro = `membro-${randomUUID()}@example.test`, membro = (await admin.auth().createUser({ email: emailMembro, password: senha })).uid;
  t.after(async () => { await signOut(auth); await terminate(client); await deleteApp(clientApp); await admin.app().delete(); });
  async function fixture(plano = 'prata') {
    const grupoId = 'compartilhamento_' + randomUUID(), db = bancoDoGrupo(raiz, grupoId);
    await raiz.doc(`grupos/${grupoId}`).set({ ativo: true, titularUid: uid, assinaturasAtivas: true });
    for (const [id, role] of [[uid,'admin'],[membro,'funcionario']]) {
      await raiz.doc(`vinculosUsuarios/${id}`).set({ grupoId, ativo: true });
      await db.doc(`users/${id}`).set({ role, ativo: true, nome: 'Teste', funcionarioId: id === membro ? 'f' : null });
    }
    await db.doc('funcionarios/f').set({ ativo: true, nome: 'Fictício', locaisPermitidos: ['casa'], desconsiderarIntervalo: true, intervaloPrevistoMin: 0 });
    await db.doc('locais/casa').set({ ativo: true, raioMetros: 100, localizacao: { latitude: 0, longitude: 0 } });
    await db.doc('financeiro/proprio').set({ funcionarioId: 'f', valor: 100 });
    await db.doc('financeiro/alheio').set({ funcionarioId: 'outro', valor: 999 });
    await db.doc('tarefas/tarefa').set({ titulo: 'Teste', concluida: false, diaSemana: 'segunda', dataAgendada: '2027-01-04', solicitadoPor: uid, solicitadoPorNome: 'Teste' });
    const assinatura = raiz.doc(`assinaturasGrupos/${grupoId}`);
    if (plano !== 'free') await assinatura.set({ versao: 1, plano, estado: 'ativo', provedor: 'google_play', verificado: true, inicioEm: Date.now() - 86400000, validoAte: Date.now() + 600000 });
    const gerir = (dados, ator = uid) => gerirAcesso(raiz, { auth: { uid: ator }, data: { operacaoId: randomUUID(), ...dados } });
    const comprar = (ator = membro) => api.comprasOperacao.run({ auth: { uid: ator }, data: { operacao: 'criar', listaId: randomUUID(), titulo: 'Teste' } });
    return { grupoId, db, assinatura, gerir, comprar };
  }
  await t.test('alteração de acesso não passa pelo cliente, impede admin adicional e serializa a última vaga', async () => {
    const f = await fixture(); await signInWithEmailAndPassword(auth, email, senha);
    await assert.rejects(updateDoc(doc(client, 'grupos', f.grupoId, 'users', membro), { role: 'admin' }), /permission/i);
    await assert.rejects(f.gerir({ operacao: 'alterar', uid: membro, role: 'admin', permissions: {} }), { code: 'failed-precondition' });
    await assert.rejects(f.gerir({ operacao: 'alterar', uid, role: 'consulta', permissions: {} }), { code: 'failed-precondition' });
    await assert.rejects(f.gerir({ operacao: 'suspender', uid }, membro), { code: 'permission-denied' });
    for (let i = 0; i < 3; i++) await f.db.doc('funcionarios/antigo' + i).set({ ativo: true });
    const alvos = ['alvo_' + randomUUID(), 'alvo_' + randomUUID()];
    for (const alvo of alvos) { await f.db.doc('users/' + alvo).set({ role: 'consulta', ativo: true }); await raiz.doc('vinculosUsuarios/' + alvo).set({ grupoId: f.grupoId, ativo: true }); }
    const rs = await Promise.allSettled(alvos.map(alvo => f.gerir({ operacao: 'alterar', uid: alvo, role: 'funcionario', permissions: { manageUsers: true } })));
    assert.equal(rs.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(rs.find(r => r.status === 'rejected').reason.code, 'resource-exhausted');
    const vencedor = rs.find(r => r.status === 'fulfilled').value.uid;
    assert.equal((await f.db.doc('users/' + vencedor).get()).data().permissions.manageUsers, false);
    assert.equal((await f.db.collection('usuariosAuditoria').get()).size, 1);
  });
  await t.test('suspensão no Free preserva login/histórico e não permite reativar compartilhamento', async () => {
    const f = await fixture('free'), dados = { operacao: 'suspender', uid: membro, operacaoId: randomUUID() };
    await f.gerir(dados); assert.equal((await f.gerir(dados)).jaProcessada, true);
    assert.equal((await f.db.doc('users/' + membro).get()).data().ativo, true);
    assert.equal((await admin.auth().getUser(membro)).disabled, false);
    await assert.rejects(f.gerir({ operacao: 'alterar', uid: membro, role: 'funcionario', permissions: {} }), { code: 'failed-precondition' });
    await assert.rejects(f.comprar(), e => e.details?.recurso === 'compartilhamento');
    await signInWithEmailAndPassword(auth, emailMembro, senha);
    assert.equal((await getDocs(query(collection(client, 'grupos', f.grupoId, 'financeiro'), where('funcionarioId', '==', 'f')))).size, 1);
    await assert.rejects(getDoc(doc(client, 'grupos', f.grupoId, 'financeiro', 'alheio')), /permission/i);
    await assert.rejects(getDoc(doc(client, 'grupos', f.grupoId, 'tarefas', 'tarefa')), /permission/i);
    await assert.rejects(updateDoc(doc(client, 'grupos', f.grupoId, 'users', membro), { acessoCompartilhado: true }), /permission/i);
    await f.comprar(uid); // Titular continua usando compras manuais no Free.
  });
  await t.test('regras usam a vigência privada com números/Timestamps e recusam estado não verificado', async () => {
    const f = await fixture(); await signInWithEmailAndPassword(auth, emailMembro, senha);
    await f.comprar(); assert.equal((await getDoc(doc(client, 'grupos', f.grupoId, 'tarefas', 'tarefa'))).exists(), true);
    await f.assinatura.update({ inicioEm: admin.firestore.Timestamp.fromMillis(Date.now() - 10000), validoAte: admin.firestore.Timestamp.fromMillis(Date.now() + 600000) });
    await updateDoc(doc(client, 'grupos', f.grupoId, 'tarefas', 'tarefa'), { concluida: true, concluidaEm: (await import('firebase/firestore')).serverTimestamp(), concluidaPor: 'f' });
    await f.db.doc('tarefas/apos-expiracao').set({ titulo: 'Não consultada antes', concluida: false });
    await f.assinatura.update({ validoAte: Date.now() - 1 });
    await assert.rejects(f.comprar(), { code: 'failed-precondition' });
    const consultarServidor = async id => {
      const token = await auth.currentUser.getIdToken();
      return fetch('http://' + process.env.FIRESTORE_EMULATOR_HOST + '/v1/projects/' + process.env.GCLOUD_PROJECT + '/databases/(default)/documents/grupos/' + f.grupoId + '/tarefas/' + id, { headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(15000) });
    };
    const expirada = await consultarServidor('apos-expiracao');
    assert.equal(expirada.status, 403, 'Leitura nova com direito expirado deve ser recusada');
    await f.assinatura.update({ validoAte: Date.now() + 600000, verificado: false });
    assert.equal((await consultarServidor('tarefa')).status, 403);
    await f.assinatura.update({ verificado: true });
    await f.gerir({ operacao: 'suspender', uid: membro });
    await assert.rejects(f.comprar(), { code: 'failed-precondition' });
    await f.gerir({ operacao: 'alterar', uid: membro, role: 'funcionario', permissions: {} });
    await f.comprar();
  });
  await t.test('jornada própria aberta pode ser concluída após expiração, sem liberar entrada nova', async () => {
    const f = await fixture(), agora = Date.now(), dataKey = partesOperacionais(agora).dataKey;
    const payload = (tipo, ms, modalidade = 'online') => ({ versao: 1, operacaoId: randomUUID(), uid: membro, contexto: { tipo: 'grupo', id: f.grupoId }, funcionarioId: 'f', tipo, modalidade, jornadaData: dataKey, capturadoEmMs: ms, fuso: 'America/Fortaleza', offsetMin: 180, amostra: { latitude: 0, longitude: 0, precisaoMetros: 10, instanteMs: ms } });
    const op = (p, ms) => registrarOperacao(raiz, { auth: { uid: membro }, data: p }, ms);
    const entrada = payload('ENTRADA', agora); assert.equal((await op(entrada, agora)).status, 'confirmado');
    await f.assinatura.update({ validoAte: agora - 1 });
    await assert.rejects(op(payload('ENTRADA', agora + 60000), agora + 60000), { code: 'failed-precondition' });
    assert.equal((await op(payload('SAIDA', agora + 120000), agora + 120000)).status, 'confirmado');
    assert.equal((await f.db.collection('registros').get()).size, 2);
    assert.equal((await op(entrada, agora + 180000)).status, 'confirmado'); // Replay não ganha outro efeito.
  });
  await t.test('offline após expiração é preservado sem prova de autorização comercial', async () => {
    const f = await fixture('free'), agora = Date.now(), dataKey = partesOperacionais(agora).dataKey;
    const p = { versao: 1, operacaoId: randomUUID(), uid: membro, contexto: { tipo: 'grupo', id: f.grupoId }, funcionarioId: 'f', tipo: 'ENTRADA', modalidade: 'offline_pendente', jornadaData: dataKey, capturadoEmMs: agora - 60000, fuso: 'America/Fortaleza', offsetMin: 180, amostra: { latitude: 0, longitude: 0, precisaoMetros: 10, instanteMs: agora - 60000 } };
    assert.equal((await registrarOperacao(raiz, { auth: { uid: membro }, data: p }, agora)).status, 'recebida');
    const pendencia = (await f.db.collection('pontoPendencias').get()).docs.find(d => d.data().payload.operacaoId === p.operacaoId).data();
    assert.equal(pendencia.autorizacaoCompartilhamento.autorizada, false);
    assert.equal(pendencia.autorizacaoCompartilhamento.regimeComercial, true);
    assert.equal((await f.db.collection('dias').get()).size, 0);
  });
  await t.test('revisão offline respeita autorização do recebimento, sem confiar no relógio declarado', async () => {
    for (const plano of ['prata', 'free']) {
      const f = await fixture(plano), agora = Date.now(), dataKey = partesOperacionais(agora).dataKey;
      const p = { versao: 1, operacaoId: randomUUID(), uid: membro, contexto: { tipo: 'grupo', id: f.grupoId }, funcionarioId: 'f', tipo: 'ENTRADA', modalidade: 'offline_pendente', jornadaData: dataKey, capturadoEmMs: agora - 60000, fuso: 'America/Fortaleza', offsetMin: 180, amostra: { latitude: 0, longitude: 0, precisaoMetros: 10, instanteMs: agora - 60000 } };
      await registrarOperacao(raiz, { auth: { uid: membro }, data: p }, agora);
      const pendencia = (await f.db.collection('pontoPendencias').get()).docs[0];
      assert.equal(pendencia.data().autorizacaoCompartilhamento.autorizada, plano === 'prata');
      if (plano === 'prata') await f.assinatura.update({ validoAte: agora - 1 });
      const chamar = data => api.revisarPendenciaPonto.run({ auth: { uid }, data: { grupoId: f.grupoId, pendenciaId: pendencia.id, ...data } });
      const detalhe = await chamar({ acao: 'detalhe' });
      const decidir = () => chamar({ acao: 'decidir', versao: 1, decisaoId: randomUUID(), resultado: 'aprovada', justificativa: 'Conferência fictícia da captura recebida', revisaoDia: detalhe.revisaoDia, horaRevisada: partesOperacionais(agora - 60000).hora });
      if (plano === 'prata') assert.equal((await decidir()).status, 'confirmado');
      else {
        assert.match(detalhe.alerta, /autorização comercial/);
        await assert.rejects(decidir(), { code: 'failed-precondition' });
        assert.equal((await f.db.collection('dias').get()).size, 0);
        assert.equal((await pendencia.ref.get()).data().status, 'aguardando_analise');
      }
    }
  });

  await t.test('API anterior também permite saída própria aberta e bloqueia entrada no Free', async () => {
    const f = await fixture('free'), dataKey = partesOperacionais(Date.now()).dataKey;
    await f.db.doc('dias/f_' + dataKey).set({ funcionarioId: 'f', dataKey, entrada: '00:01' });
    const chamar = tipo => api.registrarPonto.run({ auth: { uid: membro }, data: { funcionarioId: 'f', tipo, latitude: 0, longitude: 0 } });
    await assert.rejects(chamar('ENTRADA'), { code: 'failed-precondition' });
    assert.equal((await chamar('SAIDA')).ok, true);
    assert.ok((await f.db.doc('dias/f_' + dataKey).get()).data().saida);
    assert.equal((await f.db.collection('registros').get()).size, 1);
  });

});
