function catalogoProdutos(registros) {
  const produtos = new Map()
  for (const p of registros) {
    if (
      p.valido === false ||
      typeof p.produtoId !== 'string' ||
      typeof p.nomeSnapshot !== 'string' ||
      !p.nomeSnapshot.trim()
    )
      continue
    const apresentacao =
      String(p.apresentacao || '') + (p.marca ? ' · Marca: ' + p.marca : '')
    const key = JSON.stringify([p.produtoId, apresentacao])
    produtos.set(key, {
      produtoId: p.produtoId,
      nome: p.nomeSnapshot + (p.marca ? ' · ' + p.marca : ''),
      apresentacao,
      embalagemInformada: Boolean(String(p.apresentacao || '').trim()),
    })
  }
  return [...produtos.values()].sort(
    (a, b) =>
      a.nome.localeCompare(b.nome, 'pt-BR') ||
      a.produtoId.localeCompare(b.produtoId) ||
      a.apresentacao.localeCompare(b.apresentacao),
  )
}

module.exports = { catalogoProdutos }
