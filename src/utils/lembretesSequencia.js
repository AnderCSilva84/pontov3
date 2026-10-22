/** Ocorrências do dia local (UTC−3), sem alterar as confirmações persistidas. */
export function acoesPendentesDoDia(lembretes, agora = Date.now()) {
  const data = new Date(agora - 3 * 3600000).toISOString().slice(0, 10);
  const dia = new Date(`${data}T12:00:00Z`).getUTCDay();
  return lembretes.flatMap(l => {
    if (!l.ativo || l.dataInicio > data || (l.repeticao === 'uma_vez' && l.dataInicio !== data) || (l.repeticao === 'dias' && !l.diasSemana?.includes(dia))) return [];
    const registros = new Map((l.ocorrencias || []).map(o => [o.id, o]));
    if (l.ultimaOcorrencia && !registros.has(l.ultimaOcorrencia.id)) registros.set(l.ultimaOcorrencia.id, l.ultimaOcorrencia);
    return (l.horarios || [l.horario]).flatMap(hora => {
      const horarioMs = Date.parse(`${data}T${hora}:00-03:00`), id = `${l.versao}_${horarioMs}`, registro = registros.get(id);
      if (!registro && (!Number.isFinite(l.proximoDisparoEmMs) || horarioMs < l.proximoDisparoEmMs)) return [];
      if (!Number.isFinite(horarioMs) || ['concluido', 'cancelado', 'sem_acesso'].includes(registro?.status)) return [];
      return [{ lembrete: l, id, hora, horarioMs, liberada: horarioMs <= agora, status: registro?.status || 'pendente' }];
    });
  }).sort((a, b) => a.horarioMs - b.horarioMs || a.lembrete.titulo.localeCompare(b.lembrete.titulo, 'pt-BR') || a.lembrete.id.localeCompare(b.lembrete.id));
}
