import "../styles/admin.css";

function formatValor(valor) {
  return valor ?? "0h 00min";
}

function getSaldoClass(saldoTipo) {
  if (saldoTipo === "negativo") return "negativo";
  if (saldoTipo === "positivo") return "positivo";
  return "neutro";
}

export default function AdminDashboard({
  nome = "Anderson Silva",
  funcionarios = [],
  funcionarioSelecionado = "",
  onFuncionarioChange,
  mes = "",
  onMesChange,
  onBuscar,
  onExportarPDF,
  totalTrabalhado = "0h 00min",
  bancoHoras = "0h 00min",
  bancoHorasTipo = "neutro",
  detalhesDia = null,
  onSair,
}) {
  return (
    <div className="admin-bg">
      <main className="admin-shell">
        <header className="admin-header">
          <button className="icon-btn" type="button" aria-label="Menu">
            ☰
          </button>
          <h1>Dashboard Admin</h1>
          <button className="icon-btn" type="button" aria-label="Perfil">
            ◉
          </button>
        </header>

        <p className="admin-ola">Olá, {nome}</p>

        <section className="filtros">
          <select
            value={funcionarioSelecionado}
            onChange={(e) => onFuncionarioChange?.(e.target.value)}
            className="select-filtro"
          >
            {funcionarios.length === 0 ? (
              <option value="">Funcionária</option>
            ) : (
              funcionarios.map((func) => (
                <option key={func.id ?? func.nome} value={func.id ?? func.nome}>
                  {func.nome}
                </option>
              ))
            )}
          </select>

          <input
            type="month"
            value={mes}
            onChange={(e) => onMesChange?.(e.target.value)}
            className="input-mes"
            aria-label="Mês"
          />

          <button type="button" className="btn-outline" onClick={onBuscar}>
            Buscar
          </button>

          <button type="button" className="btn-outline btn-exportar" onClick={onExportarPDF}>
            Exportar PDF
          </button>
        </section>

        <section className="resumo-cards">
          <article className="info-card">
            <p className="card-titulo">Total Trabalhado</p>
            <strong className="card-valor">{formatValor(totalTrabalhado)}</strong>
          </article>

          <article className="info-card destaque">
            <p className="card-titulo">Banco de Horas</p>
            <strong className={`card-valor ${getSaldoClass(bancoHorasTipo)}`}>
              {formatValor(bancoHoras)}
            </strong>
            <span className="card-rodape">Horas excedentes no período</span>
          </article>
        </section>

        <h2 className="secao-titulo">Detalhamento por Dia</h2>

        <section className="detalhe-card">
          <p>
            <strong>Data:</strong> {detalhesDia?.data ?? "----/--/--"}
          </p>
          <p>
            <strong>Entrada:</strong> {detalhesDia?.entrada ?? "--:--"}
          </p>
          <p>
            <strong>Saída para Intervalo:</strong> {detalhesDia?.saidaIntervalo ?? "--:--"}
          </p>
          <p>
            <strong>Volta do Intervalo:</strong> {detalhesDia?.entradaIntervalo ?? "--:--"}
          </p>
          <p>
            <strong>Fim do Expediente:</strong> {detalhesDia?.saida ?? "--:--"}
          </p>

          <div className="detalhe-total">
            <span>Total: {formatValor(detalhesDia?.total)}</span>
            <span className={getSaldoClass(detalhesDia?.saldoTipo)}>
              {formatValor(detalhesDia?.saldo)}
            </span>
          </div>
        </section>

        <button type="button" className="btn-sair" onClick={onSair}>
          Sair
        </button>
      </main>
    </div>
  );
}