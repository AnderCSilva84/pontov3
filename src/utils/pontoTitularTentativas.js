const prefixo = 'ap1303:ponto-titular:';
export function criarTentativasTitular(storage) {
  const chave = (uid, grupo) => {
    if (![uid, grupo].every(v => typeof v === 'string' && /^[\w-]{1,128}$/.test(v))) throw Error('Contexto local inválido.');
    return `${prefixo}${uid}:${grupo}`;
  };
  const ler = (uid, grupo) => {
    const texto = storage.getItem(chave(uid, grupo)); if (!texto) return null;
    let d; try { d = JSON.parse(texto); } catch { throw Error('Tentativa local inválida. Preserve os dados e solicite recuperação.'); }
    if (d?.versao !== 1 || d.uid !== uid || d.grupoId !== grupo || d.payload?.acao !== 'registrar' || typeof d.payload.operacaoId !== 'string') throw Error('Tentativa local precisa de recuperação.');
    return d;
  };
  return {
    ler,
    listar(uid) {
      const registros = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (k?.startsWith(`${prefixo}${uid}:`)) registros.push(ler(uid, k.slice(`${prefixo}${uid}:`.length)));
      }
      return registros;
    },
    salvar(uid, grupo, payload) {
      const anterior = ler(uid, grupo);
      if (anterior && JSON.stringify(anterior.payload) !== JSON.stringify(payload)) throw Error('Reconcilie a tentativa anterior antes de registrar outra marcação.');
      const d = { versao: 1, uid, grupoId: grupo, payload };
      storage.setItem(chave(uid, grupo), JSON.stringify(d)); return d;
    },
    concluir(uid, grupo, operacaoId, resultado) {
      const anterior = ler(uid, grupo);
      if (!anterior || anterior.payload.operacaoId !== operacaoId || resultado?.operacaoId !== operacaoId || !['confirmado','rejeitada','nao_aplicada'].includes(resultado.status)) throw Error('Resultado desconhecido. A tentativa foi preservada.');
      storage.removeItem(chave(uid, grupo));
    },
  };
}
