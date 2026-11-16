export function jornadasParaExibicao(jornadas = []) {
  const porData = new Map();
  // O resolvedor de jornada usa a primeira versão na mesma vigência.
  for (const j of jornadas) if (j?.vigencia && !porData.has(j.vigencia)) porData.set(j.vigencia, j);
  return [...porData.values()].sort((a, b) => a.vigencia.localeCompare(b.vigencia));
}
export function removerProgramacaoFutura(jornadas, vigencia, hoje) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(vigencia || '') || !/^\d{4}-\d{2}-\d{2}$/.test(hoje || '') || vigencia <= hoje) throw Error('Só é possível excluir uma programação futura. O histórico deve ser preservado.');
  return (jornadas || []).filter(j => j.vigencia !== vigencia);
}
