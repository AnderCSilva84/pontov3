const produtosPermitidos = new Set(['ta_no_ponto_prata', 'ta_no_ponto_ouro', 'ta_no_ponto_diamante']);
const chave = u => u?.uid && u?.grupoId ? JSON.stringify([u.uid, u.grupoId]) : null;

// Sem concessão de direitos, persistência de token ou reconhecimento no cliente.
export function criarSessaoPlayBilling({ ponte, contexto, hash, novoId, aoCompras = () => {}, podeComprar = () => false }) {
  const inicial = chave(contexto());
  const sessao = novoId();
  let encerrada = false, conta, conexao, listener;
  function validar() {
    if (encerrada || !inicial || inicial !== chave(contexto())) throw new Error('A sessão mudou. Abra os planos novamente.');
  }
  async function limpar() {
    const anterior = listener;
    listener = null;
    try { await anterior?.remove(); }
    finally { if (conta) await ponte.encerrarSessao({ conta, sessao }); }
  }
  async function conectar() {
    validar();
    if (!conexao) conexao = (async () => {
      conta = await hash(inicial);
      validar();
      listener = await ponte.addListener('comprasAtualizadas', evento => {
        if (encerrada || inicial !== chave(contexto()) || evento.conta !== conta || evento.sessao !== sessao) return;
        // Receipt permanece não verificado até validação no servidor da #9.
        aoCompras({ ...evento, verificada: false });
      });
      try {
        validar();
        const r = await ponte.configurarSessao({ conta, sessao });
        validar();
        return r;
      } catch (e) {
        await limpar().catch(() => {});
        throw e;
      }
    })();
    return conexao;
  }
  async function chamar(metodo, dados = {}) {
    await conectar(); validar();
    const r = await ponte[metodo]({ ...dados, conta, sessao });
    validar();
    return r;
  }
  return {
    conectar,
    consultarProdutos: () => chamar('consultarProdutos'),
    consultarCompras: () => chamar('consultarCompras'),
    comprar: async produtoId => {
      validar();
      if (!podeComprar() || !produtosPermitidos.has(produtoId)) throw new Error('A contratação ainda não está disponível.');
      return chamar('comprar', { produtoId });
    },
    encerrar: async () => {
      encerrada = true;
      // Não espera consultas da Play expirarem para invalidar esta sessão.
      await limpar();
    },
  };
}

export function ofertaMensalPlay(resultado, produtoId) {
  if (!produtosPermitidos.has(produtoId)) return null;
  const p = resultado?.produtos?.find(p => p.produtoId === produtoId);
  return p?.ofertas?.find(o => o.planoBase === 'mensal' && typeof o.preco === 'string' && o.preco.trim()) || null;
}
