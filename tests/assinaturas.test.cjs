const test = require('node:test');
const assert = require('node:assert/strict');
const { catalogo, resolverAssinatura, verificarCota } = require('../functions/assinaturas-dominio.cjs');
const { consultarAssinatura } = require('../functions/assinaturas.cjs');
const agora = 1800000000000;
const pago = { versao: 1, verificado: true, plano: 'ouro', estado: 'ativo', provedor: 'mercado_pago', inicioEm: agora - 1000, validoAte: agora + 1000, renovacaoAutomatica: true };

test('assinaturas: cancelamento mantém período pago, mas vence exatamente no limite', () => {
  const cancelada = { ...pago, estado: 'cancelamento_agendado' };
  assert.equal(resolverAssinatura(cancelada, agora).plano, 'ouro');
  assert.equal(resolverAssinatura(cancelada, agora).renovacaoAutomatica, false);
  const vencida = resolverAssinatura(cancelada, pago.validoAte);
  assert.equal(vencida.plano, 'free');
  assert.equal(vencida.direitos.funcionarios, 2);
  assert.equal(vencida.direitos.escritorioContabil, false);
});

test('assinaturas: checkout pendente, revogação, datas inválidas e plano desconhecido nunca concedem recursos pagos', () => {
  for (const delta of [
    { verificado: false }, { versao: 2 }, { plano: 'ilimitado' }, { estado: 'pendente' },
    { estado: 'revogado' }, { provedor: 'cliente' }, { inicioEm: agora + 1 },
    { validoAte: NaN }, { validoAte: String(agora + 1000) }, { validoAte: agora - 1 },
  ]) {
    const r = resolverAssinatura({ ...pago, ...delta }, agora);
    assert.equal(r.plano, 'free', JSON.stringify(delta));
    assert.equal(r.direitos.importacaoQr, false);
  }
  assert.equal(resolverAssinatura(null, agora).plano, 'free');
});

test('assinaturas: carência só tem direito dentro da vigência confirmada', () => {
  const d = { ...pago, provedor: 'google_play', estado: 'carencia', validoAte: { toMillis: () => agora + 100 } };
  assert.equal(resolverAssinatura(d, agora).plano, 'ouro');
  assert.equal(resolverAssinatura(d, agora + 100).plano, 'free');
});

test('assinaturas: excesso após redução bloqueia incremento, preservando operações sem consumo', () => {
  const free = resolverAssinatura(null, agora).direitos;
  assert.equal(verificarCota(free, 'funcionarios', 15).permitido, false);
  assert.equal(verificarCota(free, 'funcionarios', 15, 0).permitido, true);
  assert.equal(verificarCota(free, 'funcionarios', 1).permitido, true);
  assert.equal(verificarCota(free, 'funcionarios', 2).permitido, false);
  for (const uso of [-1, NaN, 1.2, '1']) assert.throws(() => verificarCota(free, 'listas', uso));
  assert.throws(() => verificarCota(free, 'listas', 0, -1));
});

test('assinaturas: consultar plano não pode alterar catálogo para próximas consultas', () => {
  const r = resolverAssinatura(pago, agora);
  r.direitos.funcionarios = 999;
  assert.equal(resolverAssinatura(pago, agora).direitos.funcionarios, 15);
  assert.equal(catalogo.planos.prata.importacaoQr, false);
  assert.equal(catalogo.planos.diamante.funcionarios, 50);
});

function bancoFicticio({ ativado = false, mudouVinculo = false, titular = 'ana' } = {}) {
  const documentos = {
    'vinculosUsuarios/ana': { ativo: true, grupoId: 'grupo_a' },
    'grupos/grupo_a': { ativo: true, titularUid: titular, assinaturasAtivas: ativado },
    'grupos/grupo_a/users/ana': { ativo: true, role: 'admin' },
    'assinaturasGrupos/grupo_a': { ...pago, reciboSecreto: 'nao-expor', payerEmail: 'privado@example.test' },
    'assinaturasGrupos/grupo_b': { ...pago, plano: 'diamante' },
  };
  const snap = path => ({ exists: !!documentos[path], data: () => documentos[path] });
  const raiz = {
    doc: path => ({ path, get: async () => snap(path) }),
    runTransaction: async fn => fn({ getAll: async (...refs) => refs.map(ref => {
      if (mudouVinculo && ref.path === 'vinculosUsuarios/ana') return { exists: true, data: () => ({ ativo: true, grupoId: 'grupo_b' }) };
      return snap(ref.path);
    }) }),
  };
  return raiz;
}

test('assinaturas: consulta não aceita grupo/plano enviado pelo cliente nem sessão anônima', async () => {
  const db = bancoFicticio();
  await assert.rejects(consultarAssinatura(db, { data: {} }), { code: 'unauthenticated' });
  for (const data of [{ grupoId: 'grupo_b' }, { plano: 'diamante' }, { verificado: true }]) {
    await assert.rejects(consultarAssinatura(db, { auth: { uid: 'ana' }, data }), { code: 'invalid-argument' });
  }
});

test('assinaturas: grupo existente permanece em transição, sem plano presumido ou contratação', async () => {
  const r = await consultarAssinatura(bancoFicticio(), { auth: { uid: 'ana' }, data: {} }, agora);
  assert.equal(r.modo, 'transicao');
  assert.equal(r.assinatura, null);
  assert.equal(r.contratacaoDisponivel, false);
});

test('assinaturas: consulta resolve grupo protegido sem expor recibo/email e confere vínculo na transação', async () => {
  const req = { auth: { uid: 'ana' }, data: {} };
  const r = await consultarAssinatura(bancoFicticio({ ativado: true }), req, agora);
  assert.equal(r.assinatura.plano, 'ouro');
  assert.equal(r.titular, true);
  assert.equal(JSON.stringify(r).includes('nao-expor'), false);
  assert.equal(JSON.stringify(r).includes('privado@example.test'), false);
  await assert.rejects(consultarAssinatura(bancoFicticio({ mudouVinculo: true }), req, agora), { code: 'permission-denied' });
});
