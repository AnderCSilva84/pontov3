function solicitarPosicao(geolocation, altaPrecisao, prazo) {
  return new Promise((resolve, reject) => {
    let concluido = false;
    const finalizar = (callback, valor) => {
      if (concluido) return;
      concluido = true;
      clearTimeout(timer);
      callback(valor);
    };
    // Alguns navegadores não disparam o timeout nativo enquanto aguardam o GPS.
    const timer = setTimeout(() => finalizar(reject, { code: 3 }), prazo);
    try {
      geolocation.getCurrentPosition(
        (posicao) => finalizar(resolve, posicao.coords),
        (erro) => finalizar(reject, erro),
        { enableHighAccuracy: altaPrecisao, maximumAge: 0, timeout: prazo }
      );
    } catch (erro) {
      finalizar(reject, erro);
    }
  });
}

export async function obterPosicaoAtual(geolocation = navigator.geolocation, prazo = 10000) {
  if (!geolocation) throw new Error("Este navegador não oferece localização. Abra o app no Safari ou Chrome.");
  try {
    try {
      return await solicitarPosicao(geolocation, true, prazo);
    } catch (erro) {
      if (erro.code === 1) throw erro;
      // Localização por rede pode funcionar quando o GPS não responde em ambientes internos.
      return await solicitarPosicao(geolocation, false, prazo);
    }
  } catch (erro) {
    if (erro.code === 1) {
      throw new Error("Permita a localização para este app nas configurações do celular ou do navegador e tente novamente.");
    }
    throw new Error("Não conseguimos localizar seu celular. Confira a permissão de localização e a conexão, aproxime-se de uma janela e toque novamente para tentar.");
  }
}
