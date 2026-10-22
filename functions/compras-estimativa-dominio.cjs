function resumirPreco(registros, item, agora = Date.now()) {
  const unidade = item.unidadePlanejada || item.unidadeCompra;
  const validos = registros.filter(r => r.valido === true && r.produtoId === item.produtoId && (r.apresentacao || '') === (item.apresentacao || '') && r.unidadeCompra === unidade && Number.isSafeInteger(r.precoUnitarioCentavos) && r.precoUnitarioCentavos > 0 && Number.isFinite(r.compradoEmMs) && r.compradoEmMs <= agora)
    .sort((a, b) => b.compradoEmMs - a.compradoEmMs || b.id.localeCompare(a.id)).slice(0, 10);
  if (!validos.length) return null;
  return { ultimoCentavos: validos[0].precoUnitarioCentavos, mediaCentavos: Math.round(validos.reduce((s, r) => s + r.precoUnitarioCentavos, 0) / validos.length), amostra: validos.length, ultimoEmMs: validos[0].compradoEmMs, primeiroEmMs: validos.at(-1).compradoEmMs, supermercadoNome: validos[0].supermercadoNome || '', unidade };
}
module.exports = { resumirPreco };
