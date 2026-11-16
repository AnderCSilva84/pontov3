const { randomUUID } = require('node:crypto');
const { HttpsError } = require('firebase-functions/v2/https');
const { interpretarCompraPlay, criarClientePlay, conferirToken, hash, config } = require('./assinaturas-play.cjs');
const { resolverAssinatura } = require('./assinaturas-dominio.cjs');
const { grupoValido } = require('./grupos-contexto.cjs');
const CONFIG = 'assinaturasConfiguracao/google_play';
const definitivo = new Set(['failed-precondition', 'permission-denied', 'invalid-argument', 'not-found']);
const erroSeguro = e => definitivo.has(e?.code) ? e.code : 'unavailable';
const terminal = Number.MAX_SAFE_INTEGER;

function conferirRecibo(r, compraId) {
  if (!r || r.versao !== 1 || r.provedor !== 'google_play' || r.pacote !== config.pacote || r.teste !== true
    || typeof r.uid !== 'string' || !r.uid || /\//.test(r.uid) || !grupoValido(r.grupoId)) {
    throw new HttpsError('failed-precondition', 'Recibo de teste não disponível para reconciliação.');
  }
  conferirToken(r.token);
  if (compraId !== `google_play_${hash(r.token)}`) throw new HttpsError('failed-precondition', 'Vínculo da compra inválido.');
}
function contextoRefs(raiz, r, reciboRef) {
  return [raiz.doc(CONFIG), reciboRef, raiz.doc(`grupos/${r.grupoId}`),
    raiz.doc(`vinculosUsuarios/${r.uid}`), raiz.doc(`grupos/${r.grupoId}/users/${r.uid}`), raiz.doc(`contaSolicitacoes/${r.uid}`)];
}
function conferirContexto(docs, r) {
  const [c, recibo, grupo, vinculo, perfil, exclusao] = docs.map(s => s.data());
  if (recibo?.token !== r.token || recibo.uid !== r.uid || recibo.grupoId !== r.grupoId || recibo.teste !== true
    || recibo.versao !== 1 || recibo.provedor !== 'google_play' || recibo.pacote !== config.pacote
    || grupo?.ativo !== true || grupo.titularUid !== r.uid || vinculo?.ativo !== true || vinculo.grupoId !== r.grupoId
    || perfil?.role !== 'admin' || perfil.ativo === false || exclusao?.etapa != null) {
    throw new HttpsError('permission-denied', 'O vínculo da compra precisa ser revisado.');
  }
  if (c?.homologacaoAtiva !== true || !Array.isArray(c.gruposPermitidos) || !c.gruposPermitidos.includes(r.grupoId)) {
    throw new HttpsError('failed-precondition', 'Homologação não habilitada.');
  }
  return { c, recibo, grupo };
}

// Uso interno de gatilho/fila. Não expor compraId/uid/grupo como operação pública.
async function reconciliarCompraPlayTeste(raiz, compraId, { cliente = criarClientePlay(), relogio = Date.now, novoId = randomUUID } = {}) {
  if (!/^google_play_[a-f0-9]{64}$/.test(compraId)) throw new HttpsError('invalid-argument', 'Identificador inválido.');
  const ref = raiz.doc(`assinaturasCompras/${compraId}`), r = (await ref.get()).data();
  if (!r) return { estado: 'aguardando_vinculo' };
  conferirRecibo(r, compraId);
  const refs = contextoRefs(raiz, r, ref), rodada = novoId();
  const adquirido = await raiz.runTransaction(async tx => {
    const docs = await tx.getAll(...refs);
    const { recibo } = conferirContexto(docs, r);
    if (recibo.reconciliacaoLease?.ate > relogio()) return false;
    tx.update(ref, { reconciliacaoLease: { rodada, ate: relogio() + 90000 } });
    return true;
  });
  if (!adquirido) return { estado: 'ocupada' };
  const interpretar = dados => {
    const prova = interpretarCompraPlay(dados, { uid: r.uid, grupoId: r.grupoId, agora: relogio() });
    if (!prova.teste) throw new HttpsError('failed-precondition', 'A reconciliação aceita somente compras de teste.');
    return prova;
  };
  async function guardar(prova, extra = {}) {
    return raiz.runTransaction(async tx => {
      const direitoRef = raiz.doc(`assinaturasGrupos/${r.grupoId}`);
      const docs = await tx.getAll(...refs, direitoRef);
      const { recibo, c, grupo } = conferirContexto(docs, r);
      if (recibo.reconciliacaoLease?.rodada !== rodada || recibo.reconciliacaoLease.ate <= relogio()) {
        throw new HttpsError('aborted', 'A reconciliação foi substituída.');
      }
      const atual = docs.at(-1).data();
      const mesmoDireito = atual?.provedor === 'google_play' && atual.compraId === compraId && atual.verificado === true;
      // Atualiza somente direito já entregue desta mesma compra. Nunca cria/ativa grupo nem troca canal/plano.
      const atualizarDireito = c.direitosHomologados === true && grupo.assinaturasAtivas === true && mesmoDireito
        && atual.plano === prova.plano && (!prova.vigente || prova.reconhecida);
      if (atualizarDireito) tx.update(direitoRef, { estado: prova.estado, inicioEm: prova.inicioEm,
        validoAte: prova.validoAte, renovacaoAutomatica: prova.renovacaoAutomatica, reconciliadoEm: relogio() });
      tx.update(ref, { observacaoPlay: { ...prova, consultadoEm: relogio(), direitosAtualizados: atualizarDireito, ...extra }, reconciliacaoLease: null });
    });
  }
  try {
    let prova = interpretar(await cliente.consultar(r.token));
    let podeReconhecer = false;
    if (prova.vigente && prova.estado === 'ativo' && !prova.reconhecida) {
      podeReconhecer = await raiz.runTransaction(async tx => {
        const docs = await tx.getAll(...refs, raiz.doc(`assinaturasEntregas/${compraId}`), raiz.doc(`assinaturasGrupos/${r.grupoId}`));
        const { c, recibo, grupo } = conferirContexto(docs, r);
        const entrega = docs.at(-2).data(), assinatura = docs.at(-1).data();
        if (recibo.reconciliacaoLease?.rodada !== rodada || recibo.reconciliacaoLease.ate <= relogio()) throw new HttpsError('aborted', 'Reconciliação substituída.');
        const direitos = resolverAssinatura(assinatura, relogio());
        const autorizada = c.reconhecimentoTesteAtivo === true && c.direitosHomologados === true && grupo.assinaturasAtivas === true
          && entrega?.versao === 1 && entrega.confirmada === true && entrega.teste === true && entrega.compraId === compraId
          && entrega.uid === r.uid && entrega.grupoId === r.grupoId && entrega.produtoId === prova.produtoId
          && entrega.planoBase === config.planoBase && assinatura?.compraId === compraId && assinatura.provedor === 'google_play'
          && direitos.plano === prova.plano && direitos.validoAte >= prova.validoAte;
        // Intenção durável antes do efeito externo; repetir sempre consulta a loja antes de novo POST.
        if (autorizada) tx.update(ref, { reconhecimentoIntencao: { rodada, criadoEm: relogio(), produtoId: prova.produtoId } });
        return autorizada;
      });
    }
    if (podeReconhecer) {
      try { await cliente.reconhecer(r.token, prova.produtoId); }
      catch {
        // POST pode ter sido aceito mesmo se a resposta se perdeu. GET é a autoridade.
        const atual = interpretar(await cliente.consultar(r.token));
        if (!atual.reconhecida) throw new HttpsError('unavailable', 'Reconhecimento ainda não confirmado.');
        prova = atual;
      }
      if (!prova.reconhecida) prova = interpretar(await cliente.consultar(r.token));
      if (!prova.reconhecida) throw new HttpsError('unavailable', 'Reconhecimento ainda não confirmado.');
    }
    await guardar(prova, { reconhecimentoPendente: prova.vigente && !prova.reconhecida });
    return { estado: 'concluida', reconhecida: prova.reconhecida };
  } catch (erro) {
    // Não repassa/loga exceções de SDK/HTTP com tokens. Lease de trabalhador novo nunca é removido.
    await raiz.runTransaction(async tx => {
      const s = await tx.get(ref);
      if (s.data()?.reconciliacaoLease?.rodada === rodada) tx.update(ref, { reconciliacaoLease: null });
    }).catch(() => {}); // Se o banco falhar, o lease expira; a exceção bruta não sai deste módulo.
    throw new HttpsError(erroSeguro(erro), 'A reconciliação precisa ser retomada ou revisada.');
  }
}

function decodificarRtdn(mensagem) {
  if (!mensagem || typeof mensagem.messageId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(mensagem.messageId)
    || typeof mensagem.data !== 'string' || mensagem.data.length > 32768 || !/^[A-Za-z0-9+/]*={0,2}$/.test(mensagem.data)) return null;
  let d;
  try { d = JSON.parse(Buffer.from(mensagem.data, 'base64').toString('utf8')); } catch { return null; }
  if (!d || d.version !== '1.0' || d.packageName !== config.pacote || !/^\d{1,16}$/.test(String(d.eventTimeMillis))) return null;
  const tipos = ['subscriptionNotification', 'testNotification', 'voidedPurchaseNotification', 'oneTimeProductNotification', 'pendingRefundReviewNotification'].filter(k => d[k] != null);
  if (tipos.length !== 1) return null;
  if (tipos[0] === 'testNotification') return { tipo: 'teste' };
  const n = d.subscriptionNotification;
  const anulado = d.voidedPurchaseNotification;
  const token = n?.purchaseToken || anulado?.purchaseToken;
  if (n && (n.version !== '1.0' || !Number.isSafeInteger(n.notificationType) || n.notificationType < 1)) return null;
  if (!n && anulado?.productType !== 1) return null;
  try { conferirToken(token); } catch { return null; }
  return { tipo: 'assinatura', compraId: `google_play_${hash(token)}` };
}

async function retomarEventoPlay(raiz, ref, opcoes = {}) {
  const agora = opcoes.relogio || Date.now, s = await ref.get(), job = s.data();
  if (!job || job.tipo !== 'google_play_reconciliacao' || job.retomarEm > agora()) return { estado: 'duplicada' };
  let resultado;
  try { resultado = await reconciliarCompraPlayTeste(raiz, job.compraId, opcoes); }
  catch (erro) { resultado = { estado: definitivo.has(erro?.code) ? 'revisao' : 'pendente', codigo: erroSeguro(erro) }; }
  await raiz.runTransaction(async tx => {
    const atual = (await tx.get(ref)).data();
    // Uma conclusão concorrente não volta a pendente por resposta antiga.
    if (!atual || atual.retomarEm === terminal) return;
    const encerrado = ['concluida', 'revisao'].includes(resultado.estado) || agora() - atual.criadoEm > 3 * 86400000;
    tx.update(ref, { estado: encerrado && resultado.estado !== 'concluida' ? 'revisao' : resultado.estado,
      codigo: resultado.codigo || null, retomarEm: encerrado ? terminal : agora() + 900000, atualizadoEm: agora() });
  });
  return resultado;
}

// Somente Cloud Pub/Sub autenticado; não é endpoint HTTP nem callable do cliente.
async function receberRtdnPlay(raiz, evento, opcoes = {}) {
  const mensagem = evento.data?.message, d = decodificarRtdn(mensagem);
  if (!d) return { estado: 'ignorada' };
  const agora = opcoes.relogio || Date.now;
  const ref = raiz.doc(`assinaturasEventos/rtdn_${hash(mensagem.messageId)}`);
  await raiz.runTransaction(async tx => {
    const s = await tx.get(ref);
    if (!s.exists) tx.create(ref, { tipo: 'google_play_reconciliacao', origem: 'rtdn', compraId: d.compraId || null,
      estado: d.tipo === 'teste' ? 'teste_recebido' : 'pendente', criadoEm: agora(), retomarEm: d.tipo === 'teste' ? terminal : agora() });
    else if (s.data().compraId !== (d.compraId || null)) throw new HttpsError('invalid-argument', 'Evento inconsistente.');
  });
  if (d.tipo === 'teste') return { estado: 'teste_recebido' };
  return retomarEventoPlay(raiz, ref, opcoes);
}

async function retomarRtdnPlay(raiz, opcoes = {}) {
  const agora = opcoes.relogio || Date.now;
  const jobs = await raiz.collection('assinaturasEventos').where('retomarEm', '<=', agora()).orderBy('retomarEm').limit(10).get();
  for (const job of jobs.docs) await retomarEventoPlay(raiz, job.ref, opcoes);
  return { examinados: jobs.size };
}

async function enfileirarEntregaPlay(raiz, compraId, opcoes = {}) {
  if (!/^google_play_[a-f0-9]{64}$/.test(compraId)) throw new HttpsError('invalid-argument', 'Identificador inválido.');
  const agora = opcoes.relogio || Date.now;
  const ref = raiz.doc(`assinaturasEventos/entrega_${compraId}`);
  await raiz.runTransaction(async tx => {
    const s = await tx.get(ref);
    if (!s.exists) tx.create(ref, { tipo: 'google_play_reconciliacao', origem: 'entrega', compraId,
      estado: 'pendente', criadoEm: agora(), retomarEm: agora() });
  });
  return retomarEventoPlay(raiz, ref, opcoes);
}

module.exports = { reconciliarCompraPlayTeste, decodificarRtdn, receberRtdnPlay, retomarRtdnPlay, enfileirarEntregaPlay };
