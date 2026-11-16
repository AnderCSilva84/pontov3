const { HttpsError } = require('firebase-functions/v2/https');
const { FieldValue } = require('firebase-admin/firestore');
const { createHash } = require('node:crypto');
const { bancoDoUsuario } = require('./grupos-contexto.cjs');
const { resolverAssinatura } = require('./assinaturas-dominio.cjs');
const { aplicarAcao, proximaAcao, distanciaMetros } = require('./ponto-validacao.cjs');
const { partesOperacionais } = require('./ponto-operacoes.cjs');
const falha = (c,m) => { throw new HttpsError(c,m); };
const id = v => typeof v === 'string' && /^[\w-]{1,128}$/.test(v);
const uuid = v => typeof v === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
const tipos = ['ENTRADA','SAIDA_INTERVALO','ENTRADA_INTERVALO','SAIDA'];
function idsValidos(ids) { return Array.isArray(ids) && ids.length <= 2 && ids.every(id) && new Set(ids).size === ids.length; }

async function operarPontoTitular(raiz, request, agora = Date.now()) {
  const uid = request.auth?.uid, d = request.data || {};
  const campos = { consultar: ['acao'], reconciliar: ['acao','operacaoId'], selecionar: ['acao','funcionarioIds','operacaoId'], registrar: ['acao','funcionarioId','tipo','operacaoId','latitude','longitude','confirmouFuncionario','dataEsperada'] };
  if (!campos[d.acao] || Object.keys(d).some(k => !campos[d.acao].includes(k))
    || d.acao !== 'consultar' && !uuid(d.operacaoId)
    || d.acao === 'selecionar' && !idsValidos(d.funcionarioIds)
    || d.acao === 'registrar' && (!id(d.funcionarioId) || !tipos.includes(d.tipo) || d.confirmouFuncionario !== true || !/^\d{4}-\d{2}-\d{2}$/.test(d.dataEsperada || '')
      || !Number.isFinite(d.latitude) || Math.abs(d.latitude) > 90 || !Number.isFinite(d.longitude) || Math.abs(d.longitude) > 180)) falha('invalid-argument', 'Confira a seleção, confirmação do funcionário e localização.');
  const db = await bancoDoUsuario(raiz, uid);
  if (!db.grupoId) { if (d.acao === 'consultar') return { habilitado: false }; falha('failed-precondition', 'Migre o grupo antes de usar o ponto do titular.'); }
  const configRef = raiz.doc(`pontoTitularConfiguracao/${db.grupoId}`), tempo = partesOperacionais(agora);
  return raiz.runTransaction(async tx => {
    const [grupo, perfil, vinculo, exclusao, assinatura, configuracao] = await tx.getAll(raiz.doc(`grupos/${db.grupoId}`), db.doc(`users/${uid}`), raiz.doc(`vinculosUsuarios/${uid}`), raiz.doc(`contaSolicitacoes/${uid}`), raiz.doc(`assinaturasGrupos/${db.grupoId}`), configRef);
    if (grupo.data()?.ativo !== true || !perfil.exists || perfil.data()?.ativo === false
      || vinculo.data()?.ativo !== true || vinculo.data()?.grupoId !== db.grupoId || exclusao.data()?.etapa) falha('permission-denied', 'Somente o titular ativo usa este ponto.');
    if (d.acao === 'reconciliar') {
      const recibo = await tx.get(db.doc(`pontoOperacoes/titular_${uid}_${d.operacaoId}`));
      if (recibo.exists && recibo.data().uid === uid) return recibo.data().resultado;
      return { operacaoId: d.operacaoId, status: grupo.data().titularUid === uid ? 'pendente' : 'nao_aplicada' };
    }
    if (d.acao === 'consultar' && (grupo.data().titularUid !== uid || perfil.data().role !== 'admin')) return { habilitado: false };
    if (grupo.data().titularUid !== uid || perfil.data().role !== 'admin') falha('permission-denied', 'Somente o titular registra neste terminal.');
    const comercial = grupo.data().assinaturasAtivas === true;
    const plano = resolverAssinatura(assinatura.data(), agora).plano;
    const referenciaAssinatura = assinatura.exists ? `${assinatura.updateTime.toMillis()}:${assinatura.updateTime.nanoseconds}` : 'sem-assinatura';
    const cfg = configuracao.data(), selecaoConfirmada = cfg?.versao === 1 && cfg.selecionadoPor === uid && cfg.referenciaAssinatura === referenciaAssinatura && idsValidos(cfg.funcionarioIds);
    const selecionados = selecaoConfirmada ? cfg.funcionarioIds : [];
    if (d.acao === 'consultar') {
      if (!comercial || plano !== 'free') return { habilitado: false };
      const funcionarios = await tx.get(db.collection('funcionarios'));
      const dias = await tx.get(db.collection('dias').where('dataKey', '==', tempo.dataKey));
      return { habilitado: true, dataKey: tempo.dataKey, selecaoConfirmada, funcionarioIds: selecionados,
        funcionarios: funcionarios.docs.map(doc => {
          const f = doc.data(), dia = dias.docs.find(x => x.data().funcionarioId === doc.id)?.data() || {};
          const aberta = Boolean(dia.entrada && !dia.saida);
          const semIntervalo = new Date(tempo.dataKey + 'T12:00Z').getUTCDay() === 6 || f.desconsiderarIntervalo === true;
          return { id: doc.id, nome: f.nome || 'Funcionário sem nome', ativo: f.ativo !== false, aberta, selecionado: selecionados.includes(doc.id), proximaAcao: proximaAcao(dia, semIntervalo), dia: Object.fromEntries(['entrada','saidaIntervalo','entradaIntervalo','saida'].map(k => [k, dia[k] || null])) };
        }).filter(f => f.ativo || f.aberta) };
    }
    const reciboRef = db.doc(`pontoOperacoes/titular_${uid}_${d.operacaoId}`);
    const hash = createHash('sha256').update(JSON.stringify(d.acao === 'selecionar' ? [d.acao, [...d.funcionarioIds].sort()] : [d.acao,d.funcionarioId,d.tipo,d.latitude,d.longitude,d.confirmouFuncionario,d.dataEsperada])).digest('hex');
    const anterior = await tx.get(reciboRef);
    if (anterior.exists) {
      if (anterior.data().hash !== hash || anterior.data().uid !== uid) falha('already-exists', 'Esta tentativa já foi utilizada com outros dados.');
      return anterior.data().resultado;
    }
    if (d.acao === 'selecionar' && (!comercial || plano !== 'free')) falha('failed-precondition', 'Este terminal atende ao ponto do titular no plano Free.');
    const timestamp = FieldValue.serverTimestamp();
    if (d.acao === 'selecionar') {
      const pessoas = d.funcionarioIds.length ? await tx.getAll(...d.funcionarioIds.map(fid => db.doc(`funcionarios/${fid}`))) : [];
      if (pessoas.some(p => !p.exists || p.data().ativo === false)) falha('failed-precondition', 'Selecione funcionários ativos deste grupo.');
      tx.set(configRef, { versao: 1, funcionarioIds: [...d.funcionarioIds], referenciaAssinatura, selecionadoPor: uid, atualizadoEm: timestamp });
      tx.update(grupo.ref, { revisaoConta: FieldValue.increment(1) });
      const resultado = { funcionarioIds: [...d.funcionarioIds], selecaoConfirmada: true };
      tx.create(reciboRef, { uid, hash, resultado, criadoEm: timestamp });
      return resultado;
    }
    let f, diaRef, localId = null, distancia = null, alteracoes;
    try {
    if (!comercial || plano !== 'free') falha('failed-precondition', 'Este terminal atende ao ponto do titular no plano Free.');
    if (d.dataEsperada !== tempo.dataKey) falha('failed-precondition', 'A data mudou. Esta tentativa não criou uma marcação em outro dia.');
    f = (await tx.get(db.doc(`funcionarios/${d.funcionarioId}`))).data();
    if (!f) falha('not-found', 'Funcionário não encontrado neste grupo.');
    diaRef = db.doc(`dias/${d.funcionarioId}_${tempo.dataKey}`);
    const dia = (await tx.get(diaRef)).data();
    const aberta = Boolean(dia?.entrada && !dia?.saida);
    if (d.tipo === 'ENTRADA' && (!selecaoConfirmada || !selecionados.includes(d.funcionarioId) || f.ativo === false)) falha('failed-precondition', 'Confirme a seleção de até dois funcionários antes de iniciar uma nova jornada.');
    if (d.tipo !== 'ENTRADA' && !aberta) falha('failed-precondition', 'Não há jornada aberta para este funcionário hoje.');

    for (const local of Array.isArray(f.locaisPermitidos) ? f.locaisPermitidos : []) {
      if (!id(local)) continue;
      const l = (await tx.get(db.doc(`locais/${local}`))).data();
      if (!l?.ativo || !Number.isFinite(l.localizacao?.latitude) || !Number.isFinite(l.localizacao?.longitude) || !Number.isFinite(Number(l.raioMetros)) || Number(l.raioMetros) <= 0) continue;
      const metros = distanciaMetros(d.latitude,d.longitude,l.localizacao.latitude,l.localizacao.longitude);
      if (metros <= Number(l.raioMetros)) { localId = local; distancia = Math.round(metros); break; }
    }
    if (!localId) falha('failed-precondition', 'O aparelho do titular está fora do local autorizado para este funcionário.');
    try { alteracoes = aplicarAcao(dia,d.tipo,tempo.hora,f,new Date(tempo.dataKey + 'T12:00Z').getUTCDay(),tempo.dataKey); }
    catch (e) { falha('failed-precondition', e.message); }
    } catch (e) {
      if (!['failed-precondition','not-found'].includes(e.code)) throw e;
      const resultado = { operacaoId: d.operacaoId, status: 'rejeitada', mensagem: e.message };
      tx.create(reciboRef, { uid, hash, resultado, criadoEm: timestamp });
      return resultado;
    }
    const resultado = { status: 'confirmado', operacaoId: d.operacaoId, funcionarioId: d.funcionarioId, dataKey: tempo.dataKey, hora: tempo.hora, tipo: d.tipo, registradoPor: uid, origem: 'terminal_titular' };
    tx.set(diaRef, { ...alteracoes, funcionarioId: d.funcionarioId, dataKey: tempo.dataKey, atualizadoEm: timestamp }, { merge: true });
    tx.create(db.doc(`registros/titular_${uid}_${d.operacaoId}`), { ...resultado, funcionarioNome: f.nome || '', timestamp, latitude: d.latitude, longitude: d.longitude, localId, distanciaMetros: distancia, autoria: { titularUid: uid, funcionarioId: d.funcionarioId, confirmacaoNoAparelho: true } });
    tx.create(reciboRef, { uid, hash, resultado, criadoEm: timestamp });
    return resultado;
  });
}
module.exports = { operarPontoTitular };
