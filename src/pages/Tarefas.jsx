import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../services/firebase";
import BottomNav from "../components/BottomNav";
import { canCreateTasks, ROLE_ADMIN } from "../utils/roles";
import "../styles/tarefas.css";
import "../styles/nav.css";

export default function Tarefas({ user, onNavigate, rotaAtual }) {
  const podeCriarTarefas = canCreateTasks(user);
  const podeConcluirTarefas = user?.role === ROLE_ADMIN;
  const [novaTarefa, setNovaTarefa] = useState("");
  const [dataAgendada, setDataAgendada] = useState(dataISOHoje());
  const [tarefas, setTarefas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const diasSemana = [
    { value: "segunda", label: "Segunda" },
    { value: "terca", label: "Terça" },
    { value: "quarta", label: "Quarta" },
    { value: "quinta", label: "Quinta" },
    { value: "sexta", label: "Sexta" },
    { value: "sabado", label: "Sábado" },
    { value: "domingo", label: "Domingo" },
  ];

  function diaSemanaAtualKey() {
    const keys = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
    return keys[new Date().getDay()];
  }

  function dataISOHoje() {
    return new Date().toISOString().slice(0, 10);
  }

  function diaSemanaPorDataISO(valor) {
    if (!valor) return diaSemanaAtualKey();
    const [ano, mes, dia] = String(valor).split("-").map(Number);
    const data = new Date(ano, (mes || 1) - 1, dia || 1);
    const keys = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
    return keys[data.getDay()] || diaSemanaAtualKey();
  }

  function labelDiaSemana(valor) {
    const dia = diasSemana.find((item) => item.value === valor);
    return dia ? dia.label : valor;
  }

  function formatarDataAgendada(valor) {
    if (!valor) return "";
    const [ano, mes, dia] = String(valor).split("-");
    if (!ano || !mes || !dia) return valor;
    return `${dia}/${mes}/${ano}`;
  }

  useEffect(() => {
    if (!podeCriarTarefas) {
      setLoading(false);
      return undefined;
    }

    const unsubscribe = onSnapshot(
      collection(db, "tarefas"),
      (snapshot) => {
        const pendentes = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() || {};
          if (data.concluida) return;

          pendentes.push({
            id: docSnap.id,
            titulo: data.titulo || docSnap.id,
            diaSemana: data.diaSemana || "",
            dataAgendada: data.dataAgendada || "",
            solicitadoPorNome: data.solicitadoPorNome || "",
          });
        });
        pendentes.sort((a, b) => {
          if (a.dataAgendada && b.dataAgendada && a.dataAgendada !== b.dataAgendada) {
            return a.dataAgendada.localeCompare(b.dataAgendada);
          }
          if (a.dataAgendada) return -1;
          if (b.dataAgendada) return 1;
          return (a.titulo || "").localeCompare(b.titulo || "");
        });
        setTarefas(pendentes);
        setLoading(false);
      },
      (error) => {
        console.error("[TAREFAS][ERRO] Falha ao observar tarefas:", error);
        setErro("Não foi possível carregar as tarefas.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [podeCriarTarefas]);

  async function handleAdicionarTarefa() {
    if (!podeCriarTarefas) {
      setErro("Acesso restrito.");
      return;
    }
    if (!novaTarefa.trim()) return;

    setSalvando(true);
    setErro("");

    try {
      const dataSelecionada = dataAgendada || dataISOHoje();
      await addDoc(collection(db, "tarefas"), {
        titulo: novaTarefa.trim(),
        diaSemana: diaSemanaPorDataISO(dataSelecionada),
        dataAgendada: dataSelecionada,
        concluida: false,
        criadoEm: serverTimestamp(),
        solicitadoPor: user?.funcionarioId || user?.uid || null,
        solicitadoPorNome: user?.nome || "Consulta",
      });
      setNovaTarefa("");
      setDataAgendada(dataISOHoje());
    } catch (error) {
      console.error("[TAREFAS][ERRO] Falha ao adicionar tarefa:", error);
      setErro("Não foi possível adicionar a tarefa.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleConcluirTarefa(tarefaId) {
    try {
      await updateDoc(doc(db, "tarefas", tarefaId), {
        concluida: true,
        concluidaEm: serverTimestamp(),
      });
    } catch (error) {
      console.error("[TAREFAS][ERRO] Falha ao concluir tarefa:", error);
      setErro("Não foi possível concluir a tarefa.");
    }
  }

  if (!user) {
    return (
      <div className="page-bg page-tarefas">
        <main className="page-shell tarefas-shell">
          <header className="page-header">
            <div className="page-title-row">
              <span className="page-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M5 6h14" />
                  <path d="M5 12h14" />
                  <path d="M5 18h10" />
                </svg>
              </span>
              <h1>Tarefas</h1>
            </div>
            <p className="page-subtitle">Acesso restrito</p>
          </header>

          <p className="text-muted">Faça login no Admin para cadastrar tarefas.</p>
        </main>

        <BottomNav activePath={rotaAtual} onNavigate={onNavigate} user={user} />
      </div>
    );
  }

  if (!podeCriarTarefas) {
    return (
      <div className="page-bg page-tarefas">
        <main className="page-shell tarefas-shell">
          <header className="page-header">
            <div className="page-title-row">
              <span className="page-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M5 6h14" />
                  <path d="M5 12h14" />
                  <path d="M5 18h10" />
                </svg>
              </span>
              <h1>Tarefas</h1>
            </div>
            <p className="page-subtitle">Acesso restrito</p>
          </header>

          <p className="text-muted">Apenas admin e consulta podem acessar tarefas.</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onNavigate && onNavigate("/admin")}
          >
            Voltar para Admin
          </button>
        </main>

        <BottomNav activePath={rotaAtual} onNavigate={onNavigate} user={user} />
      </div>
    );
  }

  return (
    <div className="page-bg page-tarefas">
      <main className="page-shell tarefas-shell">
        <header className="page-header">
          <div className="page-title-row">
            <span className="page-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M5 6h14" />
                <path d="M5 12h14" />
                <path d="M5 18h10" />
              </svg>
            </span>
            <h1>Tarefas</h1>
          </div>
          <p className="page-subtitle">Solicitar atividades para a funcionaria</p>
        </header>

        <section className="card tarefas-card">
          <label className="field">
            <span>Nova tarefa</span>
            <input
              type="text"
              value={novaTarefa}
              onChange={(event) => setNovaTarefa(event.target.value)}
              placeholder="Ex: Limpar o balcão"
            />
          </label>
          <label className="field">
            <span>Data agendada</span>
            <input
              type="date"
              value={dataAgendada}
              min={dataISOHoje()}
              onChange={(event) => setDataAgendada(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="btn btn-success"
            onClick={handleAdicionarTarefa}
            disabled={salvando || !novaTarefa.trim()}
          >
            {salvando ? "Salvando..." : "Adicionar tarefa"}
          </button>
          {erro && <p className="mensagem erro">{erro}</p>}
        </section>

        <section className="card tarefas-lista">
          <h2>Tarefas pendentes</h2>
          {loading && <p className="text-muted">Carregando tarefas...</p>}
          {!loading && tarefas.length === 0 && (
            <p className="text-muted">Nenhuma tarefa pendente.</p>
          )}
          {!loading && tarefas.length > 0 && (
            <div className="tarefas-itens">
              {tarefas.map((tarefa) => (
                <div key={tarefa.id} className="tarefas-item">
                  <div>
                    <strong>{tarefa.titulo}</strong>
                    {tarefa.dataAgendada && (
                      <span className="tarefas-por">
                        Agendada para: {formatarDataAgendada(tarefa.dataAgendada)}
                      </span>
                    )}
                    {tarefa.diaSemana && (
                      <span className="tarefas-por">
                        Dia:{" "}
                        <span className="tarefas-dia-selecionado">
                          {labelDiaSemana(tarefa.diaSemana)}
                        </span>
                      </span>
                    )}
                    {tarefa.solicitadoPorNome && (
                      <span className="tarefas-por">Solicitado por: {tarefa.solicitadoPorNome}</span>
                    )}
                  </div>
                  {podeConcluirTarefas && (
                    <button
                      type="button"
                      className="btn btn-secondary tarefas-concluir"
                      onClick={() => handleConcluirTarefa(tarefa.id)}
                    >
                      Concluir
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNav activePath={rotaAtual} onNavigate={onNavigate} user={user} />
    </div>
  );
}

