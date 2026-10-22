export function compararCupomComLista(planejados, linhas) {
  const aceitos = linhas.filter(i => !i.descartar);
  const ids = new Set(planejados.map(i => i.id));
  const itens = planejados.map(p => {
    const correspondencias = aceitos.filter(i => i.itemPlanejadoId === p.id);
    const quantidadeNota = correspondencias.reduce((s, i) => s + i.quantidade, 0);
    const diferenca = quantidadeNota - p.quantidadePlanejada;
    return { ...p, quantidadeNota, linhasNota: correspondencias.length, situacao: !correspondencias.length ? 'fora_da_nota' : Math.abs(diferenca) < .00005 ? 'conferido' : diferenca < 0 ? 'quantidade_menor' : 'quantidade_maior' };
  });
  return { itens, encontrados: itens.filter(i => i.linhasNota > 0).length, foraDaNota: itens.filter(i => !i.linhasNota).length, extras: aceitos.filter(i => !ids.has(i.itemPlanejadoId)) };
}
