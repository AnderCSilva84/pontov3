import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { login, logout } from "../services/auth";
import { listarFuncionarios, buscarDiasPorPeriodo } from "../services/ponto";
import { exportarPdfPonto } from "../utils/exportarPdfPonto";
import { exportarPdfListaCompras } from "../utils/exportarPdfListaCompras";
import { exportarPdfTarefas } from "../utils/exportarPdfTarefas";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  getDoc,
  deleteDoc,
  query,
  where,
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

function dataKeyParaDate(dataKey) {
  if (!dataKey) return null;
  const [ano, mes, dia] = String(dataKey).split("-");
  if (!ano || !mes || !dia) return null;
  return new Date(Number(ano), Number(mes) - 1, Number(dia));
}

function horaParaMinutosSeguro(hora) {
  if (!hora || typeof hora !== "string") return null;
  const partes = hora.split(":");
  if (partes.length !== 2) return null;
  const h = Number(partes[0]);
  const m = Number(partes[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function calcularTotalMinutos({ entrada, saidaIntervalo, entradaIntervalo, saida, isSabado }) {
  const entradaMin = horaParaMinutosSeguro(entrada);
  const saidaMin = horaParaMinutosSeguro(saida);
  if (entradaMin === null || saidaMin === null) return 0;
  if (saidaMin <= entradaMin) return 0;

  if (isSabado) {
    return Math.max(0, saidaMin - entradaMin);
  }

  const saidaIntervaloMin = horaParaMinutosSeguro(saidaIntervalo);
  const entradaIntervaloMin = horaParaMinutosSeguro(entradaIntervalo);
  const intervalo =
    saidaIntervaloMin !== null && entradaIntervaloMin !== null
      ? Math.max(0, entradaIntervaloMin - saidaIntervaloMin)
      : 0;

  return Math.max(0, saidaMin - entradaMin - intervalo);
}

function getCargaDiaMin(dataKey, funcionario) {
  const data = dataKeyParaDate(dataKey);
  if (!data) return 0;
  const diaSemana = data.getDay();
  if (diaSemana === 0) return 0;
  if (diaSemana === 6) {
    const sabado = Number(funcionario?.cargaSabadoMin);
    return Number.isFinite(sabado) ? sabado : 0;
  }
  const segSex = Number(funcionario?.cargaSegSexMin);
  return Number.isFinite(segSex) ? segSex : 480;
}

function getDatasNoIntervalo(dataInicio, dataFim) {
  const inicio = dataKeyParaDate(dataInicio);
  const fim = dataKeyParaDate(dataFim);
  if (!inicio || !fim || inicio.getTime() > fim.getTime()) return [];

  const datas = [];
  const cursor = new Date(inicio);

  while (cursor.getTime() <= fim.getTime()) {
    const ano = cursor.getFullYear();
    const mes = String(cursor.getMonth() + 1).padStart(2, "0");
    const dia = String(cursor.getDate()).padStart(2, "0");
    datas.push(`${ano}-${mes}-${dia}`);
    cursor.setDate(cursor.getDate() + 1);
  }

  return datas;
}

function dataParaISO(valor) {
  const data = dataParaDate(valor);
  if (!data) return "";
  return data.toISOString().slice(0, 10);
}

function dataReferenciaTarefa(tarefa) {
  return tarefa?.dataAgendada || dataParaISO(tarefa?.criadoEm);
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

function labelAjusteTipo(valor) {
  const mapa = {
    manual: "Manual",
    atestado: "Atestado (abono)",
    dispensa: "Dispensa (abono)",
    ferias: "Período de férias",
    falta: "Falta",
    saida_mais_cedo: "Saída mais cedo",
  };
  return mapa[valor] || valor || "-";
}

function parseMinutosAjuste(valor) {
  if (!valor) return null;
  if (typeof valor === "number" && Number.isFinite(valor)) return valor;
  const texto = String(valor).trim();
  if (!texto) return null;
  if (/^\d+$/.test(texto)) return Number(texto);

  const hhmm = texto.match(/^(\d{1,3}):(\d{2})$/);
  if (hhmm) {
    const horas = Number(hhmm[1]);
    const minutos = Number(hhmm[2]);
    if (Number.isFinite(horas) && Number.isFinite(minutos)) {
      return horas * 60 + minutos;
    }
  }

  const match = texto.match(/(\d+)\s*h(?:oras?)?\s*(\d{1,2})?\s*min?/i);
  if (match) {
    const horas = Number(match[1] || 0);
    const minutos = Number(match[2] || 0);
    return horas * 60 + minutos;
  }

  return null;
}

function calcularPeriodo(mes) {
  const [ano, mesNumero] = mes.split("-");
  const ultimoDia = new Date(ano, mesNumero, 0).getDate();

  return {
    dataInicio: `${mes}-01`,
    dataFim: `${mes}-${String(ultimoDia).padStart(2, "0")}`,
  };
}
function getUltimoDiaMes(mes) {
  const [ano, mesNumero] = mes.split("-");
  const ultimoDia = new Date(ano, mesNumero, 0).getDate();
  return Number.isFinite(ultimoDia) ? ultimoDia : 0;
}

function dataKeyHoje() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function calcularCargaMensalPrevista(mes, cargaSegSexMin, cargaSabadoMin) {
  if (!mes) return 0;
  const [anoTexto, mesTexto] = mes.split("-");
  const ano = Number(anoTexto);
  const mesIndex = Number(mesTexto) - 1;
  if (!Number.isFinite(ano) || !Number.isFinite(mesIndex)) return 0;

  const ultimoDia = getUltimoDiaMes(mes);
  let total = 0;

  for (let dia = 1; dia <= ultimoDia; dia += 1) {
    const data = new Date(ano, mesIndex, dia);
    const diaSemana = data.getDay();
    if (diaSemana === 0) continue;
    if (diaSemana === 6) {
      total += cargaSabadoMin;
    } else {
      total += cargaSegSexMin;
    }
  }

  return total;
}

function getLimiteDataKeyMes(mes) {
  if (!mes) return "";
  const mesAtual = mesAtualISO();
  if (mes > mesAtual) return "";
  if (mes === mesAtual) return dataKeyHoje();
  const ultimoDia = getUltimoDiaMes(mes);
  return `${mes}-${String(ultimoDia).padStart(2, "0")}`;
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
  const [ajusteData, setAjusteData] = useState("");
  const [ajusteDataFim, setAjusteDataFim] = useState("");
  const [ajusteTipo, setAjusteTipo] = useState("manual");
  const [ajusteEntrada, setAjusteEntrada] = useState("");
  const [ajusteSaidaIntervalo, setAjusteSaidaIntervalo] = useState("");
  const [ajusteEntradaIntervalo, setAjusteEntradaIntervalo] = useState("");
  const [ajusteSaida, setAjusteSaida] = useState("");
  const [ajusteObservacao, setAjusteObservacao] = useState("");
  const [ajusteAbonoParcial, setAjusteAbonoParcial] = useState("");
  const [ajusteLoading, setAjusteLoading] = useState(false);
  const [ajusteErro, setAjusteErro] = useState("");
  const [ajusteSucesso, setAjusteSucesso] = useState("");
  const [ajusteExiste, setAjusteExiste] = useState(false);
  const [ajustesLog, setAjustesLog] = useState([]);
  const [ajustesLogLoading, setAjustesLogLoading] = useState(false);
  const [ajustesLogErro, setAjustesLogErro] = useState("");
  const [mostrarAjustesLog, setMostrarAjustesLog] = useState(false);
  const [ajustesLogExcluindo, setAjustesLogExcluindo] = useState({});
  const ajusteSectionRef = useRef(null);

  useEffect(() => {
    async function carregarFuncionarios() {
      if (!user || user.role !== "admin") return;
      const lista = await listarFuncionarios();
      setFuncionarios(lista);

      if (lista.length > 0) {
        setFuncionarioSelecionado(lista[0].id);
      }
    }

    carregarFuncionarios();
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    carregarListaCompras();
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    carregarTarefas();
  }, [user]);

  useEffect(() => {
    async function carregarAjuste() {
      if (!user || user.role !== "admin") return;
      setAjusteErro("");
      setAjusteSucesso("");
      if (ajusteTipo === "ferias") {
        setAjusteExiste(false);
        return;
      }
      if (!ajusteData || !funcionarioSelecionado) {
        setAjusteExiste(false);
        return;
      }

      try {
        const ref = doc(db, "dias", `${funcionarioSelecionado}_${ajusteData}`);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setAjusteExiste(false);
          setAjusteTipo("manual");
          setAjusteEntrada("");
          setAjusteSaidaIntervalo("");
          setAjusteEntradaIntervalo("");
          setAjusteSaida("");
          setAjusteObservacao("");
          setAjusteAbonoParcial("");
          return;
        }

        const data = snap.data() || {};
        setAjusteExiste(true);
        setAjusteTipo(data.ajusteTipo || "manual");
        setAjusteEntrada(data.entrada || "");
        setAjusteSaidaIntervalo(data.saidaIntervalo || "");
        setAjusteEntradaIntervalo(data.entradaIntervalo || "");
        setAjusteSaida(data.saida || "");
        setAjusteObservacao(data.ajusteObservacao || "");
        setAjusteAbonoParcial(
          typeof data.ajusteAbonoMin === "number" ? String(data.ajusteAbonoMin) : ""
        );
      } catch (error) {
        console.error("[ADMIN][ERRO] Falha ao carregar ajuste:", error);
        setAjusteErro("Não foi possível carregar o ajuste.");
      }
    }

    carregarAjuste();
  }, [ajusteData, ajusteTipo, funcionarioSelecionado, user]);

  useEffect(() => {
    async function carregarCatalogo() {
      if (!user || user.role !== "admin") return;
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
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== "admin") return undefined;

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
  }, [user]);

  async function handleAdminLogin(event) {
    event.preventDefault();
    setAdminErro("");
    setAdminLoading(true);

    try {
      await login(adminEmail, adminSenha);
    } catch {
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
          dataAgendada: data.dataAgendada || "",
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
        const dataISO = dataReferenciaTarefa(item);
        if (!dataISO) return false;
        if (tarefaFiltroInicio && dataISO < tarefaFiltroInicio) return false;
        if (tarefaFiltroFim && dataISO > tarefaFiltroFim) return false;
        return true;
      });
    }

    return lista.sort((a, b) => {
      if (a.concluida !== b.concluida) return a.concluida ? 1 : -1;
      const dataRefA = dataReferenciaTarefa(a);
      const dataRefB = dataReferenciaTarefa(b);
      if (dataRefA && dataRefB && dataRefA !== dataRefB) {
        return dataRefA.localeCompare(dataRefB);
      }
      if (dataRefA) return -1;
      if (dataRefB) return 1;
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

  const carregarAjustesLog = useCallback(async () => {
    if (!user || user.role !== "admin") return;
    if (!funcionarioSelecionado) return;

    setAjustesLogLoading(true);
    setAjustesLogErro("");

    try {
      const q = query(collection(db, "ajustesPonto"), where("funcionarioId", "==", funcionarioSelecionado));
      const snap = await getDocs(q);
      const itens = [];

      snap.forEach((docSnap) => {
        const data = docSnap.data() || {};
        itens.push({
          id: docSnap.id,
          ...data,
        });
      });

      itens.sort((a, b) => {
        const da = dataParaDate(a.criadoEm);
        const db = dataParaDate(b.criadoEm);
        if (da && db) return db.getTime() - da.getTime();
        if (da) return -1;
        if (db) return 1;
        return 0;
      });

      setAjustesLog(itens);
    } catch (error) {
      console.error("[ADMIN][ERRO] Falha ao carregar ajustes:", error);
      setAjustesLogErro("Não foi possível carregar o histórico.");
    } finally {
      setAjustesLogLoading(false);
    }
  }, [funcionarioSelecionado, user]);

  useEffect(() => {
    if (mostrarAjustesLog && funcionarioSelecionado && user?.role === "admin") {
      carregarAjustesLog();
    }
  }, [carregarAjustesLog, mostrarAjustesLog, funcionarioSelecionado, user]);

  async function handleExcluirLogAjuste(logId) {
    if (!logId) return;
    setAjustesLogExcluindo((prev) => ({ ...prev, [logId]: true }));
    setAjustesLogErro("");

    try {
      await deleteDoc(doc(db, "ajustesPonto", logId));
      setAjustesLog((prev) => prev.filter((item) => item.id !== logId));
    } catch (error) {
      console.error("[ADMIN][ERRO] Falha ao excluir log de ajuste:", error);
      setAjustesLogErro("Não foi possível excluir o registro do histórico.");
    } finally {
      setAjustesLogExcluindo((prev) => ({ ...prev, [logId]: false }));
    }
  }

  function limparCamposAjuste() {
    setAjusteData("");
    setAjusteDataFim("");
    setAjusteTipo("manual");
    setAjusteEntrada("");
    setAjusteSaidaIntervalo("");
    setAjusteEntradaIntervalo("");
    setAjusteSaida("");
    setAjusteObservacao("");
    setAjusteAbonoParcial("");
    setAjusteErro("");
    setAjusteSucesso("");
  }

  function prepararAjusteComDia(dia) {
    if (!dia?.dataKey) return;
    setAjusteData(dia.dataKey);
    setAjusteDataFim(dia.dataKey);
    setAjusteTipo(dia.ajusteTipo || "manual");
    setAjusteEntrada(dia.entrada || "");
    setAjusteSaidaIntervalo(dia.saidaIntervalo || "");
    setAjusteEntradaIntervalo(dia.entradaIntervalo || "");
    setAjusteSaida(dia.saida || "");
    setAjusteObservacao(dia.ajusteObservacao || "");
    setAjusteAbonoParcial(
      typeof dia.ajusteAbonoMin === "number" ? String(dia.ajusteAbonoMin) : ""
    );
    setAjusteErro("");
    setAjusteSucesso("");

    if (ajusteSectionRef.current) {
      ajusteSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  async function excluirHorarioPorData(dataKey) {
    if (!funcionarioSelecionado || !dataKey) return;
    const confirmar = window.confirm("Tem certeza que deseja excluir este horário?");
    if (!confirmar) return;

    setAjusteErro("");
    setAjusteSucesso("");
    setAjusteLoading(true);

    try {
      const refDia = doc(db, "dias", `${funcionarioSelecionado}_${dataKey}`);
      const antesSnap = await getDoc(refDia);
      const antesData = antesSnap.exists() ? antesSnap.data() : null;

      await deleteDoc(refDia);

      await addDoc(collection(db, "ajustesPonto"), {
        acao: "excluir",
        funcionarioId: funcionarioSelecionado,
        dataKey,
        antes: antesData,
        criadoEm: serverTimestamp(),
        criadoPor: user?.uid || user?.funcionarioId || null,
      });

      setAjusteSucesso("Horário excluído.");
      if (ajusteData === dataKey) {
        limparCamposAjuste();
        setAjusteExiste(false);
      }
      await handleBuscar();
      if (mostrarAjustesLog) {
        await carregarAjustesLog();
      }
    } catch (error) {
      console.error("[ADMIN][ERRO] Falha ao excluir horário:", error);
      setAjusteErro("Não foi possível excluir o horário.");
    } finally {
      setAjusteLoading(false);
    }
  }

  async function handleSalvarAjuste() {
    setAjusteErro("");
    setAjusteSucesso("");

    if (!funcionarioSelecionado || !ajusteData) {
      setAjusteErro("Selecione funcionário e data para salvar o ajuste.");
      return;
    }

    if (ajusteTipo === "ferias" && !ajusteDataFim) {
      setAjusteErro("Selecione a data final do período de férias.");
      return;
    }

    if (ajusteTipo === "ferias" && ajusteDataFim < ajusteData) {
      setAjusteErro("A data final de férias não pode ser menor que a data inicial.");
      return;
    }

    const funcionario = funcionarioAtual;
    const abonoMinInformado = parseMinutosAjuste(ajusteAbonoParcial);
    if (
      (ajusteTipo === "atestado" || ajusteTipo === "dispensa" || ajusteTipo === "ferias") &&
      abonoMinInformado !== null &&
      abonoMinInformado < 0
    ) {
      setAjusteErro("O abono parcial precisa ser positivo.");
      return;
    }

    const datasAjuste =
      ajusteTipo === "ferias" ? getDatasNoIntervalo(ajusteData, ajusteDataFim) : [ajusteData];

    if (datasAjuste.length === 0) {
      setAjusteErro("Informe um intervalo de datas válido.");
      return;
    }

    setAjusteLoading(true);
    try {
      const antesPeriodo = [];

      for (const dataKey of datasAjuste) {
        const cargaDiaMin = getCargaDiaMin(dataKey, funcionario);
        const dataAjuste = dataKeyParaDate(dataKey);
        const isSabado = dataAjuste ? dataAjuste.getDay() === 6 : false;
        let entrada = ajusteEntrada;
        let saidaIntervalo = ajusteSaidaIntervalo;
        let entradaIntervalo = ajusteEntradaIntervalo;
        let saida = ajusteSaida;
        let totalMin = 0;
        let saldoMin = 0;

        if (ajusteTipo === "atestado" || ajusteTipo === "dispensa" || ajusteTipo === "ferias") {
          const abonoMin =
            abonoMinInformado === null ? cargaDiaMin : Math.min(abonoMinInformado, cargaDiaMin);

          totalMin = abonoMin;
          saldoMin = abonoMinInformado === null ? 0 : abonoMin - cargaDiaMin;
          entrada = "";
          saidaIntervalo = "";
          entradaIntervalo = "";
          saida = "";
        } else if (ajusteTipo === "falta") {
          totalMin = 0;
          saldoMin = -cargaDiaMin;
          entrada = "";
          saidaIntervalo = "";
          entradaIntervalo = "";
          saida = "";
        } else {
          if (!entrada || !saida) {
            setAjusteErro("Informe entrada e saída para salvar o ajuste.");
            setAjusteLoading(false);
            return;
          }

          totalMin = calcularTotalMinutos({
            entrada,
            saidaIntervalo,
            entradaIntervalo,
            saida,
            isSabado,
          });
          saldoMin = totalMin - cargaDiaMin;

          if (ajusteTipo === "saida_mais_cedo") {
            saldoMin = 0;
          }
        }

        const refDia = doc(db, "dias", `${funcionarioSelecionado}_${dataKey}`);
        const antesSnap = await getDoc(refDia);
        const antesData = antesSnap.exists() ? antesSnap.data() : null;
        antesPeriodo.push({ dataKey, antes: antesData });

        await setDoc(
          refDia,
          {
            funcionarioId: funcionarioSelecionado,
            dataKey,
            entrada: entrada || null,
            saidaIntervalo: saidaIntervalo || null,
            entradaIntervalo: entradaIntervalo || null,
            saida: saida || null,
            totalMin,
            saldoMin,
            encerrado: Boolean(saida),
            ajusteManual: true,
            ajusteTipo,
            ajusteObservacao: ajusteObservacao || "",
            ajusteAbonoMin:
              ajusteTipo === "atestado" || ajusteTipo === "dispensa" || ajusteTipo === "ferias"
                ? Number.isFinite(totalMin)
                  ? totalMin
                  : null
                : null,
            atualizadoEm: serverTimestamp(),
            atualizadoPor: user?.uid || user?.funcionarioId || null,
          },
          { merge: true }
        );
      }

      await addDoc(collection(db, "ajustesPonto"), {
        acao: "salvar",
        funcionarioId: funcionarioSelecionado,
        dataKey: ajusteData,
        dataFim: ajusteTipo === "ferias" ? ajusteDataFim : null,
        ajusteTipo,
        ajusteObservacao: ajusteObservacao || "",
        ajusteAbonoMin:
          ajusteTipo === "atestado" || ajusteTipo === "dispensa" || ajusteTipo === "ferias"
            ? abonoMinInformado
            : null,
        entrada: ajusteTipo === "manual" || ajusteTipo === "saida_mais_cedo" ? ajusteEntrada || null : null,
        saidaIntervalo:
          ajusteTipo === "manual" || ajusteTipo === "saida_mais_cedo"
            ? ajusteSaidaIntervalo || null
            : null,
        entradaIntervalo:
          ajusteTipo === "manual" || ajusteTipo === "saida_mais_cedo"
            ? ajusteEntradaIntervalo || null
            : null,
        saida: ajusteTipo === "manual" || ajusteTipo === "saida_mais_cedo" ? ajusteSaida || null : null,
        quantidadeDias: datasAjuste.length,
        antesPeriodo,
        criadoEm: serverTimestamp(),
        criadoPor: user?.uid || user?.funcionarioId || null,
      });

      setAjusteExiste(ajusteTipo !== "ferias");
      setAjusteSucesso(
        ajusteTipo === "ferias"
          ? `Período de férias salvo para ${datasAjuste.length} dia(s).`
          : "Ajuste salvo com sucesso."
      );
      await handleBuscar();
      if (mostrarAjustesLog) {
        await carregarAjustesLog();
      }
    } catch (error) {
      console.error("[ADMIN][ERRO] Falha ao salvar ajuste:", error);
      setAjusteErro("Não foi possível salvar o ajuste.");
    } finally {
      setAjusteLoading(false);
    }
  }

  async function handleExcluirAjuste() {
    setAjusteErro("");
    setAjusteSucesso("");

    if (!funcionarioSelecionado || !ajusteData) {
      setAjusteErro("Selecione funcionário e data para excluir o ajuste.");
      return;
    }

    if (ajusteTipo === "ferias" && !ajusteDataFim) {
      setAjusteErro("Selecione a data final do período de férias para excluir.");
      return;
    }

    if (ajusteTipo === "ferias" && ajusteDataFim < ajusteData) {
      setAjusteErro("A data final de férias não pode ser menor que a data inicial.");
      return;
    }

    setAjusteLoading(true);
    try {
      const datasAjuste =
        ajusteTipo === "ferias" ? getDatasNoIntervalo(ajusteData, ajusteDataFim) : [ajusteData];
      const antesPeriodo = [];

      for (const dataKey of datasAjuste) {
        const refDia = doc(db, "dias", `${funcionarioSelecionado}_${dataKey}`);
        const antesSnap = await getDoc(refDia);
        const antesData = antesSnap.exists() ? antesSnap.data() : null;
        antesPeriodo.push({ dataKey, antes: antesData });
        await deleteDoc(refDia);
      }

      await addDoc(collection(db, "ajustesPonto"), {
        acao: "excluir",
        funcionarioId: funcionarioSelecionado,
        dataKey: ajusteData,
        dataFim: ajusteTipo === "ferias" ? ajusteDataFim : null,
        antesPeriodo,
        criadoEm: serverTimestamp(),
        criadoPor: user?.uid || user?.funcionarioId || null,
      });

      setAjusteExiste(false);
      setAjusteSucesso(
        ajusteTipo === "ferias"
          ? `Período de férias excluído para ${datasAjuste.length} dia(s).`
          : "Ajuste excluído."
      );
      limparCamposAjuste();
      await handleBuscar();
      if (mostrarAjustesLog) {
        await carregarAjustesLog();
      }
    } catch (error) {
      console.error("[ADMIN][ERRO] Falha ao excluir ajuste:", error);
      setAjusteErro("Não foi possível excluir o ajuste.");
    } finally {
      setAjusteLoading(false);
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
    } catch {
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
  const cargaSegSexMin = Number(funcionarioAtual?.cargaSegSexMin);
  const cargaSabadoMin = Number(funcionarioAtual?.cargaSabadoMin);
  const cargaSegSexBase = Number.isFinite(cargaSegSexMin) ? cargaSegSexMin : 480;
  const cargaSabadoBase = Number.isFinite(cargaSabadoMin) ? cargaSabadoMin : 0;
  const metaMensalMin = calcularCargaMensalPrevista(
    mesSelecionado,
    cargaSegSexBase,
    cargaSabadoBase
  );
  const limiteDataKeyMes = getLimiteDataKeyMes(mesSelecionado);
  const trabalhadoAteMin = limiteDataKeyMes
    ? dias.reduce((acc, dia) => {
        if (!dia?.dataKey) return acc;
        if (dia.dataKey > limiteDataKeyMes) return acc;
        const total = Number(dia.totalMin);
        return acc + (Number.isFinite(total) ? total : 0);
      }, 0)
    : 0;
  const saldoPeriodo = dias.reduce((acc, dia) => {
    if (
      dia?.ajusteTipo === "atestado" ||
      dia?.ajusteTipo === "dispensa" ||
      dia?.ajusteTipo === "ferias" ||
      dia?.ajusteTipo === "falta"
    )
      return acc;
    if (dia?.ajusteTipo === "saida_mais_cedo") return acc;
    return acc + (dia.saldoMin || 0);
  }, 0);

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
              <span>Meta do mês</span>
              <strong>{formatMinutos(metaMensalMin)}</strong>
            </article>

            <article className="card resumo-card">
              <span>Trabalhado até o momento</span>
              <strong>{formatMinutos(trabalhadoAteMin)}</strong>
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
                  {dia.ajusteTipo && (
                    <p>
                      <strong>Ajuste:</strong> {labelAjusteTipo(dia.ajusteTipo)}
                    </p>
                  )}
                  {dia.ajusteObservacao && (
                    <p>
                      <strong>Obs:</strong> {dia.ajusteObservacao}
                    </p>
                  )}
                  <div className="detalhe-total">
                    <span>Total: {formatMinutos(dia.totalMin || 0)}</span>
                    <span
                      className={getSaldoClass(
                        dia?.ajusteTipo === "saida_mais_cedo" ? 0 : dia.saldoMin || 0
                      )}
                    >
                      Saldo:{" "}
                      {formatMinutos(dia?.ajusteTipo === "saida_mais_cedo" ? 0 : dia.saldoMin || 0)}
                    </span>
                  </div>
                  <div className="detalhe-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => prepararAjusteComDia(dia)}
                      disabled={ajusteLoading}
                    >
                      Editar horário
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => excluirHorarioPorData(dia.dataKey)}
                      disabled={ajusteLoading}
                    >
                      Excluir horário
                    </button>
                  </div>
                </section>
              ))}
            </div>
          )}

          {diasFiltrados.length === 0 && (
            <p className="text-muted">Selecione uma data ou intervalo para ver o detalhamento.</p>
          )}
        </section>

        <section className="admin-section ajustes-section" ref={ajusteSectionRef}>
          <div className="section-header">
            <h2>CRUD de Horários</h2>
            <span className="section-sub">Edite horários quando a funcionária esquecer ou registrar errado</span>
          </div>

          <div className="card ajuste-card">
            <div className="ajuste-grid">
              <label className="field">
                <span>{ajusteTipo === "ferias" ? "Data inicial" : "Data"}</span>
                <input
                  type="date"
                  value={ajusteData}
                  onChange={(e) => setAjusteData(e.target.value)}
                />
              </label>
              {ajusteTipo === "ferias" && (
                <label className="field">
                  <span>Data final</span>
                  <input
                    type="date"
                    value={ajusteDataFim}
                    min={ajusteData || undefined}
                    onChange={(e) => setAjusteDataFim(e.target.value)}
                  />
                </label>
              )}
              <label className="field">
                <span>Tipo de ajuste</span>
                <select value={ajusteTipo} onChange={(e) => setAjusteTipo(e.target.value)}>
                  <option value="manual">Manual (horário completo)</option>
                  <option value="saida_mais_cedo">Saída mais cedo</option>
                  <option value="atestado">Atestado (abono)</option>
                  <option value="dispensa">Dispensa (abono)</option>
                  <option value="ferias">Período de férias</option>
                  <option value="falta">Falta (sem abono)</option>
                </select>
              </label>
            </div>

            {(ajusteTipo === "manual" || ajusteTipo === "saida_mais_cedo") && (
              <div className="ajuste-horarios">
                <label className="field">
                  <span>Entrada</span>
                  <input
                    type="time"
                    value={ajusteEntrada}
                    onChange={(e) => setAjusteEntrada(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Saída intervalo</span>
                  <input
                    type="time"
                    value={ajusteSaidaIntervalo}
                    onChange={(e) => setAjusteSaidaIntervalo(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Volta intervalo</span>
                  <input
                    type="time"
                    value={ajusteEntradaIntervalo}
                    onChange={(e) => setAjusteEntradaIntervalo(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Saída</span>
                  <input
                    type="time"
                    value={ajusteSaida}
                    onChange={(e) => setAjusteSaida(e.target.value)}
                  />
                </label>
              </div>
            )}

            {(ajusteTipo === "atestado" || ajusteTipo === "dispensa" || ajusteTipo === "ferias") && (
              <label className="field">
                <span>Abono parcial (opcional)</span>
                <input
                  type="text"
                  value={ajusteAbonoParcial}
                  onChange={(e) => setAjusteAbonoParcial(e.target.value)}
                  placeholder="Ex: 240, 4:00, 4h"
                />
              </label>
            )}

            <label className="field">
              <span>Observação</span>
              <input
                type="text"
                value={ajusteObservacao}
                onChange={(e) => setAjusteObservacao(e.target.value)}
                placeholder="Ex: atestado médico, saída antecipada"
              />
            </label>

            <div className="ajuste-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSalvarAjuste}
                disabled={ajusteLoading}
              >
                {ajusteLoading ? "Salvando..." : "Salvar ajuste"}
              </button>
              {(ajusteExiste || (ajusteTipo === "ferias" && ajusteData && ajusteDataFim)) && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleExcluirAjuste}
                  disabled={ajusteLoading}
                >
                  Excluir ajuste
                </button>
              )}
              <button
                type="button"
                className="btn btn-muted"
                onClick={limparCamposAjuste}
                disabled={ajusteLoading}
              >
                Limpar
              </button>
            </div>

            {ajusteErro && <p className="mensagem erro">{ajusteErro}</p>}
            {ajusteSucesso && <p className="mensagem">{ajusteSucesso}</p>}
          </div>

          <button
            type="button"
            className="card ajustes-toggle"
            onClick={() => {
              setMostrarAjustesLog((prev) => {
                const proximo = !prev;
                if (proximo) {
                  carregarAjustesLog();
                }
                return proximo;
              });
            }}
          >
            <span>Histórico de ajustes</span>
            <span className="toggle-indicator">{mostrarAjustesLog ? "^" : "v"}</span>
          </button>

          {mostrarAjustesLog && (
            <div className="ajustes-log">
              <button type="button" className="btn btn-success" onClick={carregarAjustesLog}>
                Atualizar histórico
              </button>
              {ajustesLogLoading && <p className="text-muted">Carregando histórico...</p>}
              {ajustesLogErro && <p className="mensagem erro">{ajustesLogErro}</p>}
              {!ajustesLogLoading && ajustesLog.length === 0 && (
                <p className="text-muted">Nenhum ajuste registrado.</p>
              )}
              {!ajustesLogLoading && ajustesLog.length > 0 && (
                <div className="card ajustes-log-lista">
                  {ajustesLog.map((item) => (
                    <div key={item.id} className="ajustes-log-item">
                      <div>
                        <strong>
                          {item.acao === "excluir" ? "Ajuste excluído" : "Ajuste salvo"}
                        </strong>
                        <span className="ajustes-log-meta">
                          {item.dataFim
                            ? `Período: ${formatarDataBr(item.dataKey || "")} até ${formatarDataBr(item.dataFim)}`
                            : `Data: ${formatarDataBr(item.dataKey || "")}`}
                        </span>
                        {item.ajusteTipo && (
                          <span className="ajustes-log-meta">
                            Tipo: {labelAjusteTipo(item.ajusteTipo)}
                          </span>
                        )}
                        {item.quantidadeDias ? (
                          <span className="ajustes-log-meta">
                            Dias no período: {item.quantidadeDias}
                          </span>
                        ) : null}
                        {item.ajusteObservacao && (
                          <span className="ajustes-log-meta">Obs: {item.ajusteObservacao}</span>
                        )}
                        <span className="ajustes-log-meta">
                          Por: {item.criadoPor || "-"} • {formatarDataHora(item.criadoEm)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-danger ajustes-log-excluir"
                        onClick={() => handleExcluirLogAjuste(item.id)}
                        disabled={Boolean(ajustesLogExcluindo[item.id])}
                      >
                        {ajustesLogExcluindo[item.id] ? "Excluindo..." : "Excluir"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
                ))}</div>
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
                        {tarefa.dataAgendada && (
                          <span className="tarefas-por">
                            Agendada para: {formatarDataBr(tarefa.dataAgendada)}
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
























