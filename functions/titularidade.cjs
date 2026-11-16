const { resolverAssinatura } = require('./assinaturas-dominio.cjs');
function transferenciaAutomatica(assinatura, agora = Date.now()) {
  if (resolverAssinatura(assinatura, agora).plano !== 'free') return false;
  const d = assinatura || {};
  if (!['prata','ouro','diamante'].includes(d.plano)) return true;
  // Cobrança paga pendente/suspensa ou ainda renovável exige assistência,
  // mesmo quando o direito efetivo já retornou ao Free.
  const fim = typeof d.validoAte?.toMillis === 'function' ? d.validoAte.toMillis() : d.validoAte;
  return d.versao === 1 && d.verificado === true && ['expirado','revogado','cancelado'].includes(d.estado)
    && d.renovacaoAutomatica !== true && Number.isSafeInteger(fim) && fim > 0 && fim <= agora;
}
module.exports = { transferenciaAutomatica };
