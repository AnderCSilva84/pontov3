const catalogo = require('./assinaturas-planos.json');
const pagos = ['prata', 'ouro', 'diamante'];
const estadosComDireito = ['ativo', 'cancelamento_agendado', 'mudanca_agendada', 'carencia'];

function instante(valor) {
  if (typeof valor?.toMillis === 'function') return valor.toMillis();
  return typeof valor === 'number' && Number.isSafeInteger(valor) && valor > 0 ? valor : null;
}

// Entrada exclusiva do servidor: nunca aceitar este documento pelo callable.
function resolverAssinatura(documento, agora = Date.now()) {
  if (!Number.isSafeInteger(agora) || agora <= 0) throw new Error('Relógio inválido.');
  const d = documento || {};
  const inicio = instante(d.inicioEm), fim = instante(d.validoAte);
  const pago = d.versao === 1 && d.verificado === true && pagos.includes(d.plano)
    && estadosComDireito.includes(d.estado) && ['mercado_pago', 'google_play'].includes(d.provedor)
    && inicio !== null && fim !== null && inicio <= agora && fim > agora && fim > inicio;
  const plano = pago ? d.plano : 'free';
  return {
    plano, direitos: { ...catalogo.planos[plano] },
    estado: pago ? d.estado : (d.estado === 'revogado' ? 'revogado' : 'free'),
    validoAte: pago ? fim : null,
    renovacaoAutomatica: pago && d.renovacaoAutomatica === true && d.estado !== 'cancelamento_agendado',
    // Um registro de cobrança pendente não é prova de pagamento.
  };
}

function verificarCota(direitos, cota, uso, incremento = 1) {
  if (!['funcionarios', 'listas', 'tarefas', 'lembretes'].includes(cota)
    || !Number.isSafeInteger(uso) || uso < 0 || !Number.isSafeInteger(incremento) || incremento < 0) {
    throw new Error('Contagem inválida.');
  }
  const limite = direitos[cota];
  if (!Number.isSafeInteger(limite) || limite < 0) throw new Error('Cota inválida.');
  return { permitido: incremento === 0 || uso + incremento <= limite, uso, limite };
}

module.exports = { catalogo, resolverAssinatura, verificarCota };
