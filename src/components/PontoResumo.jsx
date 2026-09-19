export default function PontoResumo({
  bancoHoras,
  formatMinutos,
  formatMinutosCompact,
  formatMinutosRelogio,
  horasTrabalhadasMin,
  metaMin,
  progressoPct,
  horarioDia,
  horasPendentesAnterior,
}) {
  const saldoClasse = bancoHoras < 0 ? "negativo" : bancoHoras > 0 ? "positivo" : "neutro";
  return <>
    <section className="card progresso-topo">
      <div className="progresso-header"><span>Progresso do dia</span><strong>{formatMinutosCompact(horasTrabalhadasMin)} / {formatMinutosRelogio(metaMin)}</strong></div>
      <div className="progresso-horario"><span>Horário de trabalho:</span><strong>{horarioDia}</strong></div>
      <div className="progresso-barra" role="progressbar" aria-label="Progresso da jornada" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progressoPct}><span style={{ width: `${progressoPct}%` }} /></div>
      <small>Atualização automática das horas durante a jornada.</small>
      <article className={`card ponto-indicador saldo-horas ${horasPendentesAnterior > 0 ? "negativo" : "neutro"}`}><span>Pendente do mês anterior</span><strong>{formatMinutos(horasPendentesAnterior)}</strong><small>{horasPendentesAnterior > 0 ? "Disponível para desconto na folha" : "Nenhuma hora pendente"}</small></article>
    </section>
    <section className="ponto-indicadores" aria-label="Resumo da jornada">
      <article className="card ponto-indicador carga-dia"><span>Carga horária de hoje</span><strong>{formatMinutosRelogio(metaMin)}</strong><small>{metaMin > 0 ? "Prevista para o dia" : "Dia sem carga prevista"}</small></article>
      <article className="card ponto-indicador trabalhado-dia"><span>Trabalhado hoje</span><strong>{formatMinutosCompact(horasTrabalhadasMin)}</strong><small>{progressoPct}% da carga diária</small></article>
      <article className={`card ponto-indicador saldo-horas ${saldoClasse}`}><span>{bancoHoras < 0 ? "Horas em débito" : bancoHoras > 0 ? "Horas de crédito" : "Saldo de horas"}</span><strong>{formatMinutos(Math.abs(bancoHoras))}</strong><small>{bancoHoras < 0 ? "Saldo a compensar" : bancoHoras > 0 ? "Crédito disponível" : "Sem crédito ou débito"}</small></article>
    </section>
  </>;
}
