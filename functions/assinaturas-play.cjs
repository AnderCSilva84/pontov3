const { createHash, timingSafeEqual } = require('node:crypto');
const { HttpsError } = require('firebase-functions/v2/https');
const config = require('./assinaturas-play-config.json');

const hash = texto => createHash('sha256').update(texto).digest('hex');
// Mesmo protocolo do cliente: o servidor deriva o vínculo, nunca recebe o hash pronto.
const contaPlay = (uid, grupoId) => hash(JSON.stringify([uid, grupoId]));
function tokenValido(token) {
  return typeof token === 'string' && /^[\x21-\x7e]{1,4096}$/.test(token);
}
function conferirToken(token) {
  if (!tokenValido(token)) throw new HttpsError('invalid-argument', 'Informe um token de compra válido.');
}
function dataPlay(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(valor)) return null;
  const n = Date.parse(valor);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}
const estados = {
  SUBSCRIPTION_STATE_PENDING: 'pendente',
  SUBSCRIPTION_STATE_ACTIVE: 'ativo',
  SUBSCRIPTION_STATE_IN_GRACE_PERIOD: 'carencia',
  SUBSCRIPTION_STATE_CANCELED: 'cancelamento_agendado',
  SUBSCRIPTION_STATE_ON_HOLD: 'suspenso',
  SUBSCRIPTION_STATE_PAUSED: 'pausado',
  SUBSCRIPTION_STATE_EXPIRED: 'expirado',
  SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED: 'pendencia_cancelada',
};

// Entrada exclusiva da resposta autenticada da Developer API. Não usar payload do cliente/RTDN.
function interpretarCompraPlay(resposta, { uid, grupoId, agora = Date.now() }) {
  if (!uid || !grupoId || !Number.isSafeInteger(agora) || agora <= 0) throw new Error('Contexto inválido.');
  const d = resposta;
  const rejeitar = () => { throw new HttpsError('failed-precondition', 'A compra exige conferência antes de conceder acesso.'); };
  if (!d || typeof d !== 'object' || Array.isArray(d) || d.kind !== 'androidpublisher#subscriptionPurchaseV2') rejeitar();
  const conta = d.externalAccountIdentifiers?.obfuscatedExternalAccountId;
  if (typeof conta !== 'string' || !/^[a-f0-9]{64}$/.test(conta)
    || !timingSafeEqual(Buffer.from(conta), Buffer.from(contaPlay(uid, grupoId)))) {
    throw new HttpsError('permission-denied', 'A compra não corresponde à conta e ao grupo atuais.');
  }
  // Trocas/restaurações com tokens vinculados precisam reconciliar a cadeia inteira antes de liberar direitos.
  if (d.linkedPurchaseToken || d.outOfAppPurchaseContext || !Array.isArray(d.lineItems) || d.lineItems.length !== 1) rejeitar();
  const item = d.lineItems[0], estado = estados[d.subscriptionState];
  if (!item || !Object.hasOwn(config.produtos, item.productId) || item.offerDetails?.basePlanId !== config.planoBase
    || item.offerDetails?.offerId || !item.autoRenewingPlan || typeof item.autoRenewingPlan.autoRenewEnabled !== 'boolean'
    || item.prepaidPlan || item.autoRenewingPlan.installmentDetails || item.deferredItemReplacement
    || item.deferredItemRemoval || item.itemReplacement || item.signupPromotion || !estado) rejeitar();
  if (!['ACKNOWLEDGEMENT_STATE_PENDING', 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED'].includes(d.acknowledgementState)) rejeitar();
  const inicioEm = dataPlay(d.startTime), validoAte = dataPlay(item.expiryTime);
  const vigente = ['ativo', 'carencia', 'cancelamento_agendado'].includes(estado);
  if (vigente && (inicioEm === null || validoAte === null || inicioEm > agora || validoAte <= inicioEm)) rejeitar();
  if (estado === 'cancelamento_agendado' && item.autoRenewingPlan.autoRenewEnabled) rejeitar();
  return {
    plano: config.produtos[item.productId], produtoId: item.productId, planoBase: config.planoBase,
    estado, inicioEm, validoAte,
    vigente: vigente && validoAte > agora,
    reconhecida: d.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
    renovacaoAutomatica: vigente && item.autoRenewingPlan.autoRenewEnabled,
    teste: !!d.testPurchase && typeof d.testPurchase === 'object' && !Array.isArray(d.testPurchase),
  };
}

function criarClientePlay({ autenticar } = {}) {
  const autenticarPadrao = async () => {
    const { GoogleAuth } = require('google-auth-library');
    return new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/androidpublisher'] }).getClient();
  };
  async function executar(caminho, method, data) {
    try {
      const cliente = await (autenticar || autenticarPadrao)();
      const r = await cliente.request({
        url: `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${config.pacote}/${caminho}`,
        method, ...(data ? { data } : {}), timeout: 12000, retry: false,
      });
      return r.data;
    } catch (erro) {
      // Erros do transporte podem conter URL/token/Authorization. Nunca propagar/logar o objeto original.
      const status = Number(erro?.response?.status);
      if (status === 404 || status === 410) throw new HttpsError('not-found', 'Compra não encontrada na Google Play.');
      if (status === 401 || status === 403) throw new HttpsError('failed-precondition', 'A verificação da Google Play ainda precisa ser configurada no servidor.');
      throw new HttpsError('unavailable', 'Não foi possível consultar a Google Play. Tente novamente.');
    }
  }
  return {
    consultar: async token => {
      conferirToken(token);
      return executar(`purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`, 'GET');
    },
    reconhecer: async (token, produtoId) => {
      conferirToken(token);
      if (!Object.hasOwn(config.produtos, produtoId)) throw new HttpsError('invalid-argument', 'Produto inválido.');
      await executar(`purchases/subscriptions/${produtoId}/tokens/${encodeURIComponent(token)}:acknowledge`, 'POST', {});
    },
  };
}

module.exports = { config, hash, contaPlay, conferirToken, interpretarCompraPlay, criarClientePlay };
