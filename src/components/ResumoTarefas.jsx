export default function ResumoTarefas({ titulo, concluidas, total, carregando = false, children }) {
  const pendentes = Math.max(0, total - concluidas);
  const estado = total === 0 ? 'vazio' : pendentes ? 'pendente' : 'completo';
  return <details className="card tarefas-resumo">
    <summary><span className="tarefas-resumo-titulo">{titulo}</span><span className={`tarefas-contador ${estado}`} role="status" aria-label={carregando ? 'Carregando tarefas' : `${concluidas} de ${total} concluídas, ${pendentes} pendentes`}><strong>{carregando ? '…' : `${concluidas}/${total}`}</strong><small>{carregando ? 'Carregando' : !total ? 'Nenhuma hoje' : pendentes ? `${pendentes} pendentes` : 'Tudo concluído'}</small></span><span className="tarefas-resumo-seta" aria-hidden="true">⌄</span></summary>
    <div className="tarefas-resumo-conteudo">{children}</div>
  </details>;
}
