import { useEffect, useMemo, useState } from "react";
import { login, logout } from "../services/auth";
import { listarFuncionarios, buscarDiasPorPeriodo } from "../services/ponto";
import { exportarPdfPonto } from "../utils/exportarPdfPonto";
import { exportarPdfListaCompras } from "../utils/exportarPdfListaCompras";
import { exportarPdfTarefas } from "../utils/exportarPdfTarefas";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  getDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../services/firebase";
import BottomNav from "../components/BottomNav";
import "../styles/admin.css";
import "../styles/tarefas.css";
import "../styles/nav.css";

function mesAtualISO() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

function formatarDataBr(dataIso) {
  if (!dataIso) return "-";
  const [ano, mes, dia] = String(dataIso).split("-");
  if (!ano || !mes || !dia) return dataIso;
  return `${dia}/${mes}/${ano}`;
}

function dataParaDate(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return valor;
  if (typeof valor.toDate === "function") return valor.toDate();
  if (typeof valor.seconds === "number") return new Date(valor.seconds * 1000);
  return null;
}

function formatarDataHora(valor) {
  const data = dataParaDate(valor);
  if (!data) return "-";
  return data.toLocaleString("pt-BR");
}

function dataParaISO(valor) {
  const data = dataParaDate(valor);
  if (!data) return "";
  return data.toISOString().slice(0, 10);
}

function labelDiaSemana(valor) {
  const mapa = {
    segunda: "Segunda",
    terca: "Terça",
    quarta: "Quarta",
    quinta: "Quinta",
    sexta: "Sexta",
    sabado: "Sábado",
    domingo: "Domingo",
  };
  return mapa[valor] || valor || "-";
}

function calcularPeriodo(mes) {
  const [ano, mesNumero] = mes.split("-");
  const ultimoDia = new Date(ano, mesNumero, 0).getDate();

  return {
    dataInicio: `${mes}-01`,
    dataFim: `${mes}-${String(ultimoDia).padStart(2, "0")}`,
  };
}

function getUltimaAcao(dias) {
  if (!dias.length) return null;

  const diasOrdenados = [...dias].sort((a, b) => (b.dataKey || "").localeCompare(a.dataKey || ""));

  for (const dia of diasOrdenados) {
    const mapaAcoes = [
      { chave: "saida", label: "Fim de expediente" },
      { chave: "entrada_intervalo", label: "Volta do intervalo" },
      { chave: "entradaIntervalo", label: "Volta do intervalo" },
      { chave: "saida_intervalo", label: "Saída para intervalo" },
      { chave: "saidaIntervalo", label: "Saída para intervalo" },
      { chave: "entrada", label: "Entrada" },
    ];

    for (const acao of mapaAcoes) {
      const hora = dia?.[acao.chave];
      if (hora && hora !== "-") {
        return {
          data: dia.dataKey || "",
          label: acao.label,
          hora,
        };
      }
    }
  }

  return null;
}

export default function Admin({ user, onNavigate, rotaAtual }) {
  const [adminEmail, setAdminEmail] = useState("");
  const [adminSenha, setAdminSenha] = useState("");
  const [adminErro, setAdminErro] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [funcionarios, setFuncionarios] = useState([]);
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState("");
  const [mesSelecionado, setMesSelecionado] = useState(mesAtualISO());
  const [dias, setDias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listaCompras, setListaCompras] = useState([]);
  const [loadingCompras, setLoadingCompras] = useState(false);
  const [erroCompras, setErroCompras] = useState("");
  const [catalogoCompras, setCatalogoCompras] = useState([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("");
  const [selecionados, setSelecionados] = useState({});
  const [salvando, setSalvando] = useState({});
  const [loadingCatalogo, setLoadingCatalogo] = useState(false);
  const [erroCatalogo, setErroCatalogo] = useState("");
  const [dataFiltroInicio, setDataFiltroInicio] = useState("");
  const [dataFiltroFim, setDataFiltroFim] = useState("");
  const [mostrarListaCompras, setMostrarListaCompras] = useState(false);
  const [tarefas, setTarefas] = useState([]);
  const [loadingTarefas, setLoadingTarefas] = useState(false);
  const [erroTarefas, setErroTarefas] = useState("");
  const [mostrarTarefas, setMostrarTarefas] = useState(false);
  const [tarefaFiltroStatus, setTarefaFiltroStatus] = useState("pendentes");
  const [tarefaFiltroTexto, setTarefaFiltroTexto] = useState("");
  const [tarefaFiltroInicio, setTarefaFiltroInicio] = useState("");
  const [tarefaFiltroFim, setTarefaFiltroFim] = useState("");
  const [tarefaFiltroDia, setTarefaFiltroDia] = useState("todos");

  useEffect(() => {
    async function carregarFuncionarios() {
      const lista = await listarFuncionarios();
      setFuncionarios(lista);

      if (lista.length > 0) {
        setFuncionarioSelecionado(lista[0].id);
      }
    }

    carregarFuncionarios();
  }, []);

  useEffect(() => {
    carregarListaCompras();
  }, []);

  useEffect(() => {
    carregarTarefas();
  }, []);

  useEffect(() => {
    async function carregarCatalogo() {
      setLoadingCatalogo(true);
      setErroCatalogo("");

      try {
        const snap = await getDocs(collection(db, "catalogoCompras"));
        const itens = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data() || {};
          itens.push({
            id: docSnap.id,
            nome: data.nome || docSnap.id,
            categoria: data.categoria || "Outros",
          });
        });
        setCatalogoCompras(itens);
      } catch (error) {
        console.error("[ADMIN][ERRO] Falha ao carregar catalogo:", error);
        setErroCatalogo("Não foi possível carregar o catálogo.");
      } finally {
        setLoadingCatalogo(false);
      }
    }

    carregarCatalogo();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "listaCompras"),
      (snapshot) => {
        const solicitados = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() || {};
          solicitados[docSnap.id] =
            data.solicitado === undefined ? true : Boolean(data.solicitado);
        });
        setSelecionados(solicitados);
      },
      (error) => {
        console.error("[ADMIN][ERRO] Falha ao observar lista:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  async function handleAdminLogin(event) {
    event.preventDefault();
    setAdminErro("");
    setAdminLoading(true);

    try {
      await login(adminEmail, adminSenha);
    } catch (error) {
      setAdminErro("Email ou senha inválidos.");
    } finally {
      setAdminLoading(false);
    }
  }

  useEffect(() => {
    async function buscarAutomaticamente() {
      if (!funcionarioSelecionado || !mesSelecionado) return;

      setLoading(true);
      const { dataInicio, dataFim } = calcularPeriodo(mesSelecionado);

      try {
        const resultado = await buscarDiasPorPeriodo(funcionarioSelecionado, dataInicio, dataFim);
        setDias(resultado);
      } catch (err) {
        console.error(err);
      }

      setLoading(false);
    }

    buscarAutomaticamente();
  }, [funcionarioSelecionado, mesSelecionado]);

  async function handleBuscar() {
    if (!funcionarioSelecionado || !mesSelecionado) return;

    setLoading(true);

    const { dataInicio, dataFim } = calcularPeriodo(mesSelecionado);

    try {
      const resultado = await buscarDiasPorPeriodo(funcionarioSelecionado, dataInicio, dataFim);
      setDias(resultado);
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  }

  async function carregarListaCompras() {
    setLoadingCompras(true);
    setErroCompras("");

    try {
      const snapshot = await getDocs(collection(db, "listaCompras"));
      const itens = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() || {};
        if (data.solicitado === false || data.comprado === true) return;

        itens.push({
          id: docSnap.id,
          nome: data.nome || docSnap.id,
          categoria: data.categoria || "Outros",
          solicitadoPor: data.solicitadoPor || "-",
          solicitadoPorNome: data.solicitadoPorNome || "",
          comprado: Boolean(data.comprado),
        });
      });

      setListaCompras(itens);
    } catch (error) {
      console.error("[ADMIN][ERRO] Falha ao carregar lista de compras:", error);
      setErroCompras("Não foi possível carregar a lista de compras.");
    } finally {
      setLoadingCompras(false);
    }
  }

  async function carregarTarefas() {
    setLoadingTarefas(true);
    setErroTarefas("");

    try {
      const snapshot = await getDocs(collection(db, "tarefas"));
      const itens = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() || {};
        itens.push({
          id: docSnap.id,
          titulo: data.titulo || docSnap.id,
          diaSemana: data.diaSemana || "",
          concluida: Boolean(data.concluida),
          solicitadoPor: data.solicitadoPor || null,
          solicitadoPorNome: data.solicitadoPorNome || "",
          criadoEm: data.criadoEm || null,
          concluidaEm: data.concluidaEm || null,
        });
      });

      setTarefas(itens);
    } catch (error) {
      console.error("[ADMIN][ERRO] Falha ao carregar tarefas:", error);
      setErroTarefas("Não foi possível carregar as tarefas.");
    } finally {
      setLoadingTarefas(false);
    }
  }

  const listaComprasPorCategoria = useMemo(() => {
    const mapa = new Map();
    listaCompras.forEach((item) => {
      const categoria = item.categoria || "Outros";
      if (!mapa.has(categoria)) mapa.set(categoria, []);
      mapa.get(categoria).push(item);
    });

    return Array.from(mapa.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([categoria, itens]) => ({
        categoria,
        itens: itens.sort((a, b) => (a.nome || "").localeCompare(b.nome || "")),
      }));
  }, [listaCompras]);

  const catalogoPorCategoria = useMemo(() => {
    const mapa = new Map();
    catalogoCompras.forEach((item) => {
      const categoria = item.categoria || "Outros";
      if (!mapa.has(categoria)) mapa.set(categoria, []);
      mapa.get(categoria).push(item);
    });

    return Array.from(mapa.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([categoria, itens]) => ({
        categoria,
        itens: itens.sort((a, b) => (a.nome || "").localeCompare(b.nome || "")),
      }));
  }, [catalogoCompras]);

  const tarefasFiltradas = useMemo(() => {
    let lista = [...tarefas];

    if (tarefaFiltroStatus === "pendentes") {
      lista = lista.filter((item) => !item.concluida);
    } else if (tarefaFiltroStatus === "concluidas") {
      lista = lista.filter((item) => item.concluida);
    }

    if (tarefaFiltroTexto.trim()) {
      const termo = tarefaFiltroTexto.trim().toLowerCase();
      lista = lista.filter((item) => {
        const titulo = (item.titulo || "").toLowerCase();
        const solicitante = (item.solicitadoPorNome || "").toLowerCase();
        return titulo.includes(termo) || solicitante.includes(termo);
      });
    }

    if (tarefaFiltroDia !== "todos") {
      lista = lista.filter((item) => (item.diaSemana || "") === tarefaFiltroDia);
    }

    if (tarefaFiltroInicio || tarefaFiltroFim) {
      lista = lista.filter((item) => {
        const dataISO = dataParaISO(item.criadoEm);
        if (!dataISO) return false;
        if (tarefaFiltroInicio && dataISO < tarefaFiltroInicio) return false;
        if (tarefaFiltroFim && dataISO > tarefaFiltroFim) return false;
        return true;
      });
    }

    return lista.sort((a, b) => {
      if (a.concluida !== b.concluida) return a.concluida ? 1 : -1;
      const dataA = dataParaDate(a.criadoEm);
      const dataB = dataParaDate(b.criadoEm);
      if (dataA && dataB) return dataB.getTime() - dataA.getTime();
      if (dataA) return -1;
      if (dataB) return 1;
      return (a.titulo || "").localeCompare(b.titulo || "");
    });
  }, [
    tarefas,
    tarefaFiltroStatus,
    tarefaFiltroTexto,
    tarefaFiltroDia,
    tarefaFiltroInicio,
    tarefaFiltroFim,
  ]);

  async function handleDarBaixa(item) {
    try {
      await updateDoc(doc(db, "listaCompras", item.id), {
        comprado: true,
        solicitado: false,
      });
      setListaCompras((prev) => prev.filter((it) => it.id !== item.id));
    } catch (error) {
      console.error("[ADMIN][ERRO] Falha ao dar baixa no item:", error);
      setErroCompras("Não foi possível dar baixa no item.");
    }
  }

  async function handleConcluirTarefaAdmin(tarefa) {
    try {
      await updateDoc(doc(db, "tarefas", tarefa.id), {
        concluida: true,
        concluidaEm: serverTimestamp(),
        concluidaPor: user?.funcionarioId || user?.uid || null,
      });
      setTarefas((prev) =>
        prev.map((item) =>
          item.id === tarefa.id ? { ...item, concluida: true, concluidaEm: new Date() } : item
        )
      );
    } catch (error) {
      console.error("[ADMIN][ERRO] Falha ao concluir tarefa:", error);
      setErroTarefas("Não foi possível concluir a tarefa.");
    }
  }

  async function atualizarItem(item, marcado) {
    const ref = doc(db, "listaCompras", item.id);
    const payloadBase = {
      nome: item.nome,
      categoria: item.categoria,
      solicitado: marcado,
    };

    try {
      const existente = await getDoc(ref);

      if (marcado) {
        await setDoc(
          ref,
          {
            ...payloadBase,
            comprado: false,
            solicitadoPor: user?.funcionarioId || user?.uid || null,
            solicitadoPorNome: user?.nome || "Anderson",
            criadoEm: serverTimestamp(),
          },
          { merge: true }
        );
        return;
      }

      if (existente.exists()) {
        await updateDoc(ref, { solicitado: false });
      } else {
        await setDoc(ref, payloadBase, { merge: true });
      }
    } catch (error) {
      console.error("[ADMIN][ERRO] Falha ao atualizar item:", error);
      throw error;
    }
  }

  async function handleToggle(item) {
    const atual = Boolean(selecionados[item.id]);
    const proximo = !atual;

    setSelecionados((prev) => ({ ...prev, [item.id]: proximo }));
    setSalvando((prev) => ({ ...prev, [item.id]: true }));

    try {
      await atualizarItem(item, proximo);
    } catch (error) {
      setSelecionados((prev) => ({ ...prev, [item.id]: atual }));
    } finally {
      setSalvando((prev) => ({ ...prev, [item.id]: false }));
    }
  }

  const funcionarioAtual = funcionarios.find((f) => f.id === funcionarioSelecionado);
  const nomeFuncionario = funcionarioAtual?.nome || "";
  const mapaFuncionarioNome = useMemo(() => {
    const mapa = {};
    funcionarios.forEach((func) => {
      if (func?.id) mapa[func.id] = func.nome || func.id;
    });
    return mapa;
  }, [funcionarios]);

  const { dataInicio, dataFim } = mesSelecionado
    ? calcularPeriodo(mesSelecionado)
    : { dataInicio: "", dataFim: "" };

  const totalPeriodo = dias.reduce((acc, dia) => acc + (dia.totalMin || 0), 0);
  const saldoPeriodo = dias.reduce((acc, dia) => acc + (dia.saldoMin || 0), 0);

  function formatMinutos(min) {
    const negativo = min < 0;
    const valor = Math.abs(min);
    const horas = Math.floor(valor / 60);
    const minutos = valor % 60;

    return `${negativo ? "-" : ""}${horas}h ${String(minutos).padStart(2, "0")}min`;
  }

  function getSaldoClass(valor) {
    if (valor > 0) return "positivo";
    if (valor < 0) return "negativo";
    return "neutro";
  }

  const ultimaAcao = getUltimaAcao(dias);
  const diasFiltrados = dias.filter((dia) => {
    if (!dataFiltroInicio && !dataFiltroFim) return false;
    const chave = dia.dataKey || "";
    if (dataFiltroInicio && chave < dataFiltroInicio) return false;
    if (dataFiltroFim && chave > dataFiltroFim) return false;
    return true;
  });

  if (!user) {
    return (
      <div className="page-bg admin-bg">
        <main className="page-shell admin-shell">
          <header className="admin-header">
            <h1>Dashboard Admin</h1>
          </header>
          <section className="card admin-login-card">
            <h2>Acesso Admin</h2>
            <p className="text-muted">Entre com seu email e senha para acessar o painel.</p>
            <form className="admin-login-form" onSubmit={handleAdminLogin}>
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(event) => setAdminEmail(event.target.value)}
                  placeholder="Digite seu email"
                  autoComplete="email"
                  required
                />
              </label>
              <label className="field">
                <span>Senha</span>
                <input
                  type="password"
                  value={adminSenha}
                  onChange={(event) => setAdminSenha(event.target.value)}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  required
                />
              </label>
              {adminErro && <p className="mensagem erro">{adminErro}</p>}
              <button type="submit" className="btn btn-primary" disabled={adminLoading}>
                {adminLoading ? "Entrando..." : "Entrar"}
              </button>
            </form>
          </section>
        </main>
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="page-bg admin-bg">
        <main className="page-shell admin-shell">
          <header className="admin-header">
            <h1>Dashboard Admin</h1>
          </header>
          <p className="text-muted">Acesso restrito ao time administrativo.</p>
          <button type="button" className="btn btn-secondary" onClick={() => onNavigate && onNavigate("/ponto")}
          >
            Voltar para Ponto
          </button>
          <button type="button" className="btn btn-muted" onClick={logout}>
            Sair
          </button>
        </main>
        <BottomNav activePath={rotaAtual} onNavigate={onNavigate} />
      </div>
    );
  }

  return (
    <div className="page-bg admin-bg">
      <main className="page-shell admin-shell">
        <header className="admin-header">
          <h1>Dashboard Admin</h1>
        </header>

        <p className="admin-ola">Olá, {user.nome}</p>

        <section className="admin-section">
          <div className="section-header">
            <h2>Controle de Ponto</h2>
            <span className="section-sub">Filtros e resumo</span>
          </div>

          <div className="card filtros-card">
            <label className="field">
              <span>Funcionário</span>
              <select
                value={funcionarioSelecionado}
                onChange={(e) => setFuncionarioSelecionado(e.target.value)}
              >
                {funcionarios.map((func) => (
                  <option key={func.id} value={func.id}>
                    {func.nome || func.id}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Mês</span>
              <input
                type="month"
                value={mesSelecionado}
                onChange={(e) => setMesSelecionado(e.target.value)}
              />
            </label>

            <button type="button" className="btn btn-primary" onClick={handleBuscar}>
              Buscar
            </button>
          </div>

          <div className="resumo-grid">
            <article className="card resumo-card">
              <span>Total trabalhado</span>
              <strong>{formatMinutos(totalPeriodo)}</strong>
            </article>

            <article className="card resumo-card destaque">
              <span>Banco de horas</span>
              <strong className={getSaldoClass(saldoPeriodo)}>{formatMinutos(saldoPeriodo)}</strong>
            </article>
          </div>

          <button
            type="button"
            className="btn btn-danger"
            onClick={() => exportarPdfPonto(funcionarioSelecionado, nomeFuncionario, dataInicio, dataFim)}
            disabled={!funcionarioSelecionado || !mesSelecionado}
          >
            Exportar PDF
          </button>

          <div className="card ultima-acao">
            <span className="text-muted">Última ação da funcionária</span>
            <strong>
              {ultimaAcao ? `${ultimaAcao.label} • ${ultimaAcao.hora}` : "Sem registros no período"}
            </strong>
            {ultimaAcao?.data && <span className="text-muted">Data: {formatarDataBr(ultimaAcao.data)}</span>}
          </div>

          {loading && <p className="text-muted">Carregando...</p>}

          <div className="filtros-data">
            <input
              type="date"
              value={dataFiltroInicio}
              onChange={(e) => setDataFiltroInicio(e.target.value)}
            />
            <input
              type="date"
              value={dataFiltroFim}
              onChange={(e) => setDataFiltroFim(e.target.value)}
            />
          </div>

          {diasFiltrados.length > 0 && (
            <div className="detalhes-grid">
              {diasFiltrados.map((dia, index) => (
                <section key={index} className="card detalhe-card">
                  <p>
                    <strong>Data:</strong> {formatarDataBr(dia.dataKey)}
                  </p>
                  <p>
                    <strong>Entrada:</strong> {dia.entrada || "-"}
                  </p>
                  <p>
                    <strong>Saída:</strong> {dia.saida || "-"}
                  </p>
                  <div className="detalhe-total">
                    <span>Total: {formatMinutos(dia.totalMin || 0)}</span>
                    <span className={getSaldoClass(dia.saldoMin || 0)}>
                      Saldo: {formatMinutos(dia.saldoMin || 0)}
                    </span>
                  </div>
                </section>
              ))}
            </div>
          )}

          {diasFiltrados.length === 0 && (
            <p className="text-muted">Selecione uma data ou intervalo para ver o detalhamento.</p>
          )}
        </section>

        <section className="admin-section compras-section">
          <button
            type="button"
            className="card compras-toggle"
            onClick={() => setMostrarListaCompras((prev) => !prev)}
          >
            <span>Lista de Compras</span>
            <span className="toggle-indicator">{mostrarListaCompras ? "^" : "v"}</span>
          </button>

          {mostrarListaCompras && (
            <div className="compras-acoes">
              <button type="button" className="btn btn-success" onClick={carregarListaCompras}>
                Atualizar
              </button>
              <button type="button" className="btn btn-danger" onClick={exportarPdfListaCompras}>
                Exportar PDF
              </button>
            </div>
          )}

          {mostrarListaCompras && loadingCompras && <p className="text-muted">Carregando lista...</p>}
          {mostrarListaCompras && erroCompras && <p className="mensagem erro">{erroCompras}</p>}

          {mostrarListaCompras &&
            !loadingCompras &&
            listaComprasPorCategoria.map((grupo) => (
              <div key={grupo.categoria} className="card compras-categoria">
                <h3>{grupo.categoria}</h3>
                <div className="compras-itens">
                  {grupo.itens.map((item) => (
                    <div key={item.id} className="compras-item">
                      <div>
                        <strong>{item.nome}</strong>
                        <span className="compras-por">
                          Solicitado por:{" "}
                          {item.solicitadoPorNome ||
                            mapaFuncionarioNome[item.solicitadoPor] ||
                            item.solicitadoPor}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="compras-status pendente"
                        onClick={() => handleDarBaixa(item)}
                      >
                        PENDENTE
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}

          <div className="card catalogo-card">
            <div className="section-header">
              <h3>Catálogo de Compras</h3>
            </div>

            {loadingCatalogo && <p className="text-muted">Carregando catálogo...</p>}
            {erroCatalogo && <p className="mensagem erro">{erroCatalogo}</p>}

            {!loadingCatalogo && catalogoPorCategoria.length > 0 && (
              <label className="field">
                <span>Categoria</span>
                <select
                  value={categoriaSelecionada}
                  onChange={(e) => setCategoriaSelecionada(e.target.value)}
                >
                  <option value="">Selecione uma categoria</option>
                  {catalogoPorCategoria.map((grupo) => (
                    <option key={grupo.categoria} value={grupo.categoria}>
                      {grupo.categoria}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {!loadingCatalogo &&
              categoriaSelecionada !== "" &&
              catalogoPorCategoria
                .filter((grupo) => grupo.categoria === categoriaSelecionada)
                .map((grupo) => (
                  <div key={grupo.categoria} className="categoria-card">
                    <h4>{grupo.categoria}</h4>
                    <div className="itens-lista">
                      {grupo.itens.map((item) => (
                        <label key={item.id} className="item-checkbox">
                          <input
                            type="checkbox"
                            checked={Boolean(selecionados[item.id])}
                            onChange={() => handleToggle(item)}
                            disabled={Boolean(salvando[item.id])}
                          />
                          <span className="check-custom" aria-hidden="true" />
                          <span className="item-nome">{item.nome}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
          </div>
        </section>

        <section className="admin-section tarefas-section">
          <button
            type="button"
            className="card tarefas-toggle"
            onClick={() => setMostrarTarefas((prev) => !prev)}
          >
            <span>Tarefas</span>
            <span className="toggle-indicator">{mostrarTarefas ? "^" : "v"}</span>
          </button>

          {mostrarTarefas && (
            <div className="tarefas-acoes">
              <button type="button" className="btn btn-success" onClick={carregarTarefas}>
                Atualizar
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => exportarPdfTarefas(tarefasFiltradas)}
              >
                Exportar PDF
              </button>
            </div>
          )}

          {mostrarTarefas && (
            <div className="card tarefas-filtros">
              <label className="field">
                <span>Status</span>
                <select
                  value={tarefaFiltroStatus}
                  onChange={(e) => setTarefaFiltroStatus(e.target.value)}
                >
                  <option value="pendentes">Pendentes</option>
                  <option value="concluidas">Concluídas</option>
                  <option value="todas">Todas</option>
                </select>
              </label>
              <label className="field">
                <span>Pesquisar</span>
                <input
                  type="text"
                  value={tarefaFiltroTexto}
                  onChange={(e) => setTarefaFiltroTexto(e.target.value)}
                  placeholder="Buscar por tarefa ou solicitante"
                />
              </label>
              <label className="field">
                <span>Dia</span>
                <select
                  value={tarefaFiltroDia}
                  onChange={(e) => setTarefaFiltroDia(e.target.value)}
                >
                  <option value="todos">Todos</option>
                  <option value="segunda">Segunda</option>
                  <option value="terca">Terça</option>
                  <option value="quarta">Quarta</option>
                  <option value="quinta">Quinta</option>
                  <option value="sexta">Sexta</option>
                  <option value="sabado">Sábado</option>
                  <option value="domingo">Domingo</option>
                </select>
              </label>
              <div className="tarefas-filtros-datas">
                <label className="field">
                  <span>De</span>
                  <input
                    type="date"
                    value={tarefaFiltroInicio}
                    onChange={(e) => setTarefaFiltroInicio(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Até</span>
                  <input
                    type="date"
                    value={tarefaFiltroFim}
                    onChange={(e) => setTarefaFiltroFim(e.target.value)}
                  />
                </label>
              </div>
            </div>
          )}

          {mostrarTarefas && loadingTarefas && (
            <p className="text-muted">Carregando tarefas...</p>
          )}
          {mostrarTarefas && erroTarefas && (
            <p className="mensagem erro">{erroTarefas}</p>
          )}

          {mostrarTarefas && !loadingTarefas && (
            <div className="card tarefas-lista">
              <h2>Resultados</h2>
              {tarefasFiltradas.length === 0 && (
                <p className="text-muted">Nenhuma tarefa encontrada.</p>
              )}
              {tarefasFiltradas.length > 0 && (
                <div className="tarefas-itens">
                  {tarefasFiltradas.map((tarefa) => (
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
                          <span className="tarefas-por">
                            Solicitado por: {tarefa.solicitadoPorNome}
                          </span>
                        )}
                        <span className="tarefas-por">
                          Criada: {formatarDataHora(tarefa.criadoEm)}
                        </span>
                        {tarefa.concluida && (
                          <span className="tarefas-por">
                            Concluída: {formatarDataHora(tarefa.concluidaEm)}
                          </span>
                        )}
                      </div>
                      <div className="tarefas-item-acoes">
                        <span
                          className={`tarefas-status ${
                            tarefa.concluida ? "concluida" : "pendente"
                          }`}
                        >
                          {tarefa.concluida ? "Concluída" : "Pendente"}
                        </span>
                        {!tarefa.concluida && (
                          <button
                            type="button"
                            className="btn btn-secondary tarefas-concluir"
                            onClick={() => handleConcluirTarefaAdmin(tarefa)}
                          >
                            Concluir
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        <button type="button" className="btn btn-muted" onClick={logout}>
          Sair
        </button>
      </main>

      <BottomNav activePath={rotaAtual} onNavigate={onNavigate} />
    </div>
  );
}










