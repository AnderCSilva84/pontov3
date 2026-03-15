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
import "../styles/tarefas.css";
import "../styles/nav.css";

export default function Tarefas({ user, onNavigate, rotaAtual }) {
  const [novaTarefa, setNovaTarefa] = useState("");
  const [diaSelecionado, setDiaSelecionado] = useState("hoje");
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

  function labelDiaSemana(valor) {
    if (valor === "hoje") return "Hoje";
    const dia = diasSemana.find((item) => item.value === valor);
    return dia ? dia.label : valor;
  }

  function ordenarDiasPorProximidade() {
    const hoje = diaSemanaAtualKey();
    const ordem = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"];
    const indexHoje = ordem.indexOf(hoje);
    if (indexHoje === -1) return diasSemana;
    const reordenado = [...ordem.slice(indexHoje), ...ordem.slice(0, indexHoje)];
    return reordenado.map((value) => diasSemana.find((dia) => dia.value === value)).filter(Boolean);
  }

  function distanciaDia(valor) {
    if (!valor) return Number.POSITIVE_INFINITY;
    const ordem = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"];
    const hoje = diaSemanaAtualKey();
    const indexHoje = ordem.indexOf(hoje);
    const indexValor = ordem.indexOf(valor);
    if (indexHoje === -1 || indexValor === -1) return Number.POSITIVE_INFINITY;
    const diff = indexValor - indexHoje;
    return diff >= 0 ? diff : diff + ordem.length;
  }

  useEffect(() => {
    if (!user || user.role !== "admin") {
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
            solicitadoPorNome: data.solicitadoPorNome || "",
          });
        });
        pendentes.sort((a, b) => {
          const distA = distanciaDia(a.diaSemana);
          const distB = distanciaDia(b.diaSemana);
          if (distA !== distB) return distA - distB;
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
  }, [user?.uid, user?.role]);

  async function handleAdicionarTarefa() {
    if (!user || user.role !== "admin") {
      setErro("Acesso restrito.");
      return;
    }
    if (!novaTarefa.trim()) return;

    setSalvando(true);
    setErro("");

    try {
      await addDoc(collection(db, "tarefas"), {
        titulo: novaTarefa.trim(),
        diaSemana: diaSelecionado === "hoje" ? diaSemanaAtualKey() : diaSelecionado,
        concluida: false,
        criadoEm: serverTimestamp(),
        solicitadoPor: user?.funcionarioId || user?.uid || null,
        solicitadoPorNome: user?.nome || "Admin",
      });
      setNovaTarefa("");
      setDiaSelecionado("hoje");
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

        <BottomNav activePath={rotaAtual} onNavigate={onNavigate} />
      </div>
    );
  }

  if (user?.role !== "admin") {
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

          <p className="text-muted">Apenas o admin pode cadastrar tarefas.</p>
          <button type="button" className="btn btn-secondary" onClick={() => onNavigate && onNavigate("/ponto")}
          >
            Voltar para Ponto
          </button>
        </main>

        <BottomNav activePath={rotaAtual} onNavigate={onNavigate} />
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
          <p className="page-subtitle">Solicitar atividades para a funcionária</p>
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
            <span>Dia</span>
            <select
              value={diaSelecionado}
              onChange={(event) => setDiaSelecionado(event.target.value)}
            >
              <option value="hoje">Hoje</option>
              {ordenarDiasPorProximidade().map((dia) => (
                <option key={dia.value} value={dia.value}>
                  {dia.label}
                </option>
              ))}
            </select>
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
                  <button
                    type="button"
                    className="btn btn-secondary tarefas-concluir"
                    onClick={() => handleConcluirTarefa(tarefa.id)}
                  >
                    Concluir
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNav activePath={rotaAtual} onNavigate={onNavigate} />
    </div>
  );
}

