import RelogioPonto from '../components/RelogioPonto';
import PratosDia from '../components/PratosDia';
import { collection, doc } from '../services/dadosGrupo';
import { BrandMark, Badge, Icon, ConnectionStatus } from '../components/ui';
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { login, logout } from "../services/auth";
import {
  carregarDiaAtual,
  carregarDiaPorData,
  registrarAcao,
  getProximaAcao,
  calcularBancoHorasMes,
  buscarDiasPorPeriodo,
} from "../services/ponto";
import { getDoc, onSnapshot, query, where, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from "../services/firebase";
import BottomNav from "../components/BottomNav";
import PontoResumo from "../components/PontoResumo";
import ResumoTarefas from "../components/ResumoTarefas";
import logoAp1303 from "../assets/ap1303.jpeg";
import { canAccessPonto, normalizeRole } from "../utils/roles";
import { obterPosicaoAtual } from "../utils/localizacao";
import { nomeFeriado } from "../utils/feriados";
import "../styles/funcionaria.css";
import "../styles/tarefas.css";
import "../styles/nav.css";

const DIAS_ORDEM = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
const DIAS_EXIBICAO = {
  domingo: "Domingo",
  segunda: "Segunda",
  terca: "Terça",
  quarta: "Quarta",
  quinta: "Quinta",
  sexta: "Sexta",
  sabado: "Sábado",
};

function dataAgendadaEhFolga(dataIso) {
  if (!dataIso) return false;
  const [ano, mes, dia] = String(dataIso).split("-").map(Number);
  const data = new Date(ano, mes - 1, dia);
  return data.getDay() === 0 || Boolean(nomeFeriado(data));
}

function mesAtualISO() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

function dataKeyDeDate(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function formatarDataBr(dataIso) {
  if (!dataIso) return "";
  const [ano, mes, dia] = String(dataIso).split("-");
  if (!ano || !mes || !dia) return dataIso;
  return `${dia}/${mes}/${ano}`;
}

function getDataKeysSemanaAtual() {
  const hoje = new Date();
  const diaSemana = hoje.getDay();

  if (diaSemana === 0) return [];

  const segunda = new Date(hoje);
  segunda.setHours(0, 0, 0, 0);
  segunda.setDate(hoje.getDate() - (diaSemana - 1));

  const datas = [];
  for (let i = 0; i < 6; i += 1) {
    const data = new Date(segunda);
    data.setDate(segunda.getDate() + i);
    datas.push(dataKeyDeDate(data));
  }

  return datas;
}
function calcularPeriodo(mes) {
  const [ano, mesNumero] = mes.split("-");
  const ultimoDia = new Date(ano, mesNumero, 0).getDate();

  return {
    dataInicio: `${mes}-01`,
    dataFim: `${mes}-${String(ultimoDia).padStart(2, "0")}`,
  };
}

function calcularCargaMensalPrevista(mes, cargaSegSexMin, cargaSabadoMin) {
  if (!mes) return 0;
  const [anoTexto, mesTexto] = mes.split("-");
  const ano = Number(anoTexto);
  const mesIndex = Number(mesTexto) - 1;
  if (!Number.isFinite(ano) || !Number.isFinite(mesIndex)) return 0;

  const ultimoDia = new Date(ano, mesIndex + 1, 0).getDate();
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

function getDiaSemanaAtualKey() {
  return DIAS_ORDEM[new Date().getDay()];
}

function formatarHoraJornada(hora) {
  if (!hora) return "";
  const [horas, minutos] = String(hora).split(":");
  return Number(minutos) === 0 ? `${Number(horas)}h` : `${Number(horas)}h${minutos}`;
}

function normalizarDiaSemana(valor) {
  if (!valor) return "";
  const bruto = String(valor)
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const mapa = {
    "segunda-feira": "segunda",
    segunda: "segunda",
    seg: "segunda",
    terca: "terca",
    "terca-feira": "terca",
    ter: "terca",
    quarta: "quarta",
    "quarta-feira": "quarta",
    qua: "quarta",
    quinta: "quinta",
    "quinta-feira": "quinta",
    qui: "quinta",
    sexta: "sexta",
    "sexta-feira": "sexta",
    sex: "sexta",
    sabado: "sabado",
    "sabado-feira": "sabado",
    sab: "sabado",
    domingo: "domingo",
    dom: "domingo",
  };

  return mapa[bruto] || bruto;
}

function getIndiceDiaSemana(dia) {
  if (!dia) return -1;
  return DIAS_ORDEM.indexOf(dia);
}

function formatHora(hora) {
  return hora || "--:--";
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

function minutosDesdeMeiaNoiteAgora() {
  const agora = new Date();
  return agora.getHours() * 60 + agora.getMinutes();
}

function calcularHorasDiaParcial(dia, desconsiderarIntervalo = false, intervaloPrevistoMin = 60) {
  if (!dia?.entrada) return 0;

  const entrada = horaParaMinutosSeguro(dia.entrada);
  if (entrada === null) return 0;

  const hojeEhSabado = new Date().getDay() === 6;
  const saida = horaParaMinutosSeguro(dia?.saida);
  const saidaIntervalo = horaParaMinutosSeguro(dia?.saidaIntervalo);
  const entradaIntervalo = horaParaMinutosSeguro(dia?.entradaIntervalo);

  if (saida !== null) {
    if (typeof dia?.totalMin === "number" && Number.isFinite(dia.totalMin)) {
      return Math.max(0, dia.totalMin);
    }

    if (hojeEhSabado) {
      return Math.max(0, saida - entrada);
    }

    if (desconsiderarIntervalo) return Math.max(0, saida - entrada - intervaloPrevistoMin);

    const intervalo =
      saidaIntervalo !== null && entradaIntervalo !== null ? entradaIntervalo - saidaIntervalo : 0;
    return Math.max(0, saida - entrada - intervalo);
  }

  if (hojeEhSabado) {
    return Math.max(0, minutosDesdeMeiaNoiteAgora() - entrada);
  }

  if (saidaIntervalo !== null && entradaIntervalo === null) {
    return Math.max(0, saidaIntervalo - entrada);
  }

  if (saidaIntervalo !== null && entradaIntervalo !== null) {
    return Math.max(0, saidaIntervalo - entrada + (minutosDesdeMeiaNoiteAgora() - entradaIntervalo));
  }

  return Math.max(0, minutosDesdeMeiaNoiteAgora() - entrada);
}

function toNumeroMinutos(valor) {
  if (typeof valor === "number" && Number.isFinite(valor)) return valor;
  if (typeof valor === "string") {
    const limpo = valor.trim().replace(",", ".");
    const direto = Number(limpo);
    if (!Number.isNaN(direto)) return direto;

    const hhmm = limpo.match(/^(-?\d{1,3}):(\d{2})$/);
    if (hhmm) {
      const sinal = hhmm[1].startsWith("-") ? -1 : 1;
      const horas = Math.abs(Number(hhmm[1]));
      const minutos = Number(hhmm[2]);
      return sinal * (horas * 60 + minutos);
    }

    const match = limpo.match(/(-?\d+)h\s*(\d{1,2})min/i);
    if (match) {
      const sinal = match[1].startsWith("-") ? -1 : 1;
      const horas = Math.abs(Number(match[1]));
      const minutos = Number(match[2]);
      return sinal * (horas * 60 + minutos);
    }

    const minutosTexto = limpo.match(/(-?\d+)\s*min(?:utos?)?/i);
    if (minutosTexto) return Number(minutosTexto[1]);
  }

  if (valor && typeof valor === "object") {
    const campos = [
      "saldoMin",
      "saldo_min",
      "saldo",
      "bancoHoras",
      "totalSaldo",
      "saldoBanco",
      "saldoBancoMin",
      "minutos",
      "valor",
    ];

    for (const campo of campos) {
      if (Object.prototype.hasOwnProperty.call(valor, campo)) {
        const v = valor[campo];
        if (v !== undefined && v !== null && v !== "") return toNumeroMinutos(v);
      }
    }
  }

  return 0;
}

function formatMinutos(min) {
  const valorSeguro = Number.isFinite(min) ? min : 0;
  const negativo = valorSeguro < 0;
  const valor = Math.abs(valorSeguro);
  const horas = Math.floor(valor / 60);
  const minutos = valor % 60;
  return `${negativo ? "-" : ""}${horas}h ${String(minutos).padStart(2, "0")}min`;
}

function formatMinutosCompact(min) {
  const valor = Math.max(0, Number.isFinite(min) ? min : 0);
  const horas = Math.floor(valor / 60);
  const minutos = valor % 60;
  return `${horas}h${String(minutos).padStart(2, "0")}`;
}

function formatMinutosRelogio(min) {
  const valor = Math.max(0, Number.isFinite(min) ? min : 0);
  const horas = Math.floor(valor / 60);
  const minutos = valor % 60;
  return `${horas}:${String(minutos).padStart(2, "0")}`;
}

function formatMinutosComSinal(min) {
  if (min > 0) return `+${formatMinutos(min)}`;
  return formatMinutos(min);
}

export default function Ponto({ user, onNavigate, rotaAtual }) {
  const podeAcessarPonto = canAccessPonto(user);
  const administrador = normalizeRole(user?.role) === 'admin';
  const podeRegistrar = podeAcessarPonto && normalizeRole(user?.role) === 'funcionario';
  const [funcionariosPonto, setFuncionariosPonto] = useState([]);
  const [funcionarioConsulta, setFuncionarioConsulta] = useState('');
  const [funcionarioNome, setFuncionarioNome] = useState(null);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erroLogin, setErroLogin] = useState("");
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [dia, setDia] = useState(null);
  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);
  const [escala, setEscala] = useState(null);
  const [bancoHoras, setBancoHoras] = useState(0);
  const [horasPendentesAnterior, setHorasPendentesAnterior] = useState(0);
  const [resumoMes, setResumoMes] = useState({ metaMin: 0, trabalhadoMin: 0 });
  const [diaSelecionadoSemana, setDiaSelecionadoSemana] = useState(null);
  const [logDiaSelecionado, setLogDiaSelecionado] = useState(null);
  const [loadingLogDia, setLoadingLogDia] = useState(false);
  const [carregandoDia, setCarregandoDia] = useState(true), [erroDia,setErroDia] = useState('');
  const [tickTempoReal, setTickTempoReal] = useState(0);
  const [validandoLocalizacao, setValidandoLocalizacao] = useState(false);
  const [diasSemana, setDiasSemana] = useState([]);
  const [cargaSegSexMin, setCargaSegSexMin] = useState(480);
  const [cargaSabadoMin, setCargaSabadoMin] = useState(0);
  const [bancoHorasInicio, setBancoHorasInicio] = useState("");
  const [desconsiderarIntervalo, setDesconsiderarIntervalo] = useState(false);
  const [intervaloPrevistoMin, setIntervaloPrevistoMin] = useState(60);
  const [tarefasPendentes, setTarefasPendentes] = useState([]);
  const [avulsasConcluidasHoje, setAvulsasConcluidasHoje] = useState([]);
  const [loadingTarefas, setLoadingTarefas] = useState(true);
  const [erroTarefas, setErroTarefas] = useState("");
  const [quantidadeNovasTarefas, setQuantidadeNovasTarefas] = useState(0);
  const [tarefasFixasHoje, setTarefasFixasHoje] = useState([]);
  const [tarefasFixasConcluidas, setTarefasFixasConcluidas] = useState(new Set());
  const [tarefaFixaSalvando, setTarefaFixaSalvando] = useState("");
  const [notificacoes, setNotificacoes] = useState([]);
  const [notificacoesAbertas, setNotificacoesAbertas] = useState(false);
  const notificacoesWrapRef = useRef(null);
  const funcionarioId = !podeAcessarPonto ? '' : administrador ? funcionarioConsulta : user?.funcionarioId || '';
  const usuarioSemLogin = !funcionarioId;
  const nomeExibicao = funcionarioNome?.id === funcionarioId ? funcionarioNome.nome : 'Funcionária';
  useEffect(() => {
    if (!administrador || !podeAcessarPonto) return;
    return onSnapshot(collection(db, 'users'), snapshot => {
      const porId = new Map();
      snapshot.docs.forEach(d => {
        const perfil = d.data();
        if (normalizeRole(perfil.role) === 'funcionario' && perfil.ativo !== false && perfil.funcionarioId) porId.set(perfil.funcionarioId, { id: perfil.funcionarioId, nome: perfil.nome || 'Funcionária' });
      });
      const opcoes = [...porId.values()];
      setFuncionariosPonto(opcoes);
      setFuncionarioConsulta(atual => porId.has(atual) ? atual : opcoes[0]?.id || '');
    }, () => setMensagem('Não foi possível consultar as funcionárias.'));
  }, [administrador, podeAcessarPonto]);
  const dataHojeExibicao = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  const dataHojeKey = dataKeyDeDate(new Date());

  const carregarBancoHorasAtual = useCallback(async () => {
    if (!funcionarioId) return;

    try {
      const mesAtual = mesAtualISO();
      const total = await calcularBancoHorasMes(funcionarioId, mesAtual, bancoHorasInicio);
      setBancoHoras(toNumeroMinutos(total));
      const [ano, mes] = mesAtual.split("-").map(Number);
      const anterior = new Date(ano, mes - 2, 1);
      const mesAnterior = `${anterior.getFullYear()}-${String(anterior.getMonth() + 1).padStart(2, "0")}`;
      const saldoAnterior = await calcularBancoHorasMes(funcionarioId, mesAnterior, bancoHorasInicio);
      setHorasPendentesAnterior(Math.max(0, -toNumeroMinutos(saldoAnterior)));
    } catch (error) {
      console.error("[PONTO][ERRO] Falha ao carregar banco de horas mensal:", error);
      setBancoHoras(0);
      setHorasPendentesAnterior(0);
    }
  }, [funcionarioId, bancoHorasInicio]);

  
  useEffect(() => {
    async function carregarResumoMes() {
      if (!funcionarioId) return;

      const mes = mesAtualISO();
      const { dataInicio, dataFim } = calcularPeriodo(mes);
      const cargaSegSexBase = Number.isFinite(cargaSegSexMin) ? cargaSegSexMin : 480;
      const cargaSabadoBase = Number.isFinite(cargaSabadoMin) ? cargaSabadoMin : 0;
      const metaMin = calcularCargaMensalPrevista(mes, cargaSegSexBase, cargaSabadoBase);
      const limiteDataKey = dataKeyDeDate(new Date());

      try {
        const registros = await buscarDiasPorPeriodo(funcionarioId, dataInicio, dataFim);
        const trabalhadoMin = registros.reduce((acc, dia) => {
          if (!dia?.dataKey) return acc;
          if (dia.dataKey > limiteDataKey) return acc;
          const total = Number(dia.totalMin);
          return acc + (Number.isFinite(total) ? total : 0);
        }, 0);
        setResumoMes({ metaMin, trabalhadoMin });
      } catch (error) {
        console.error("[PONTO][ERRO] Falha ao carregar resumo mensal:", error);
        setResumoMes({ metaMin, trabalhadoMin: 0 });
      }
    }

    carregarResumoMes();
  }, [funcionarioId, cargaSegSexMin, cargaSabadoMin, dia?.dataKey]);

  useEffect(() => {
    setCarregandoDia(Boolean(funcionarioId)); setErroDia(''); setDia(null);
    if (!funcionarioId) return;
    return onSnapshot(query(collection(db, 'dias'), where('funcionarioId', '==', funcionarioId), where('dataKey', '==', dataHojeKey)), snapshot => {
      setDia(snapshot.docs[0]?.data() || null); setCarregandoDia(false);
    }, () => { setErroDia('Não foi possível carregar a jornada. Atualize a página.'); setCarregandoDia(false); });
  }, [funcionarioId, dataHojeKey]);

  useEffect(() => {
    let ativo = true;
    async function carregarEscala() {
      if (!funcionarioId) return;
      const ref = doc(db, "funcionarios", funcionarioId);
      const snap = await getDoc(ref);
      if (!ativo) return;

      if (snap.exists()) {
        const data = snap.data();
        setFuncionarioNome({ id: funcionarioId, nome: data.nome || 'Funcionária' });
        setEscala(data.escala || null);

        const cargaSegSex = Number(data?.cargaSegSexMin);
        const cargaSabado = Number(data?.cargaSabadoMin);

        setBancoHorasInicio(data?.bancoHorasInicio || "");
        setDesconsiderarIntervalo(Boolean(data?.desconsiderarIntervalo));
        setIntervaloPrevistoMin(Number.isFinite(Number(data?.intervaloPrevistoMin)) ? Number(data.intervaloPrevistoMin) : 60);

        if (Number.isFinite(cargaSegSex)) setCargaSegSexMin(cargaSegSex);
        if (Number.isFinite(cargaSabado)) setCargaSabadoMin(cargaSabado);
      }
    }

    if (funcionarioId) carregarEscala().catch(() => { if (ativo) setMensagem('Não foi possível carregar o cadastro da funcionária.'); });
    return () => { ativo = false; };
  }, [funcionarioId]);

  useEffect(() => {
    carregarBancoHorasAtual();
  }, [carregarBancoHorasAtual, dia?.dataKey]);

  useEffect(() => {
    if (!funcionarioId) {
      setLoadingTarefas(false);
      return undefined;
    }

    const unsubscribe = onSnapshot(
      collection(db, "tarefas"),
      (snapshot) => {
        const pendentes = [], concluidas = [];
        const diaAtual = getDiaSemanaAtualKey();
        const indiceHoje = getIndiceDiaSemana(diaAtual);
        const hojeEhFeriado = Boolean(nomeFeriado(new Date()));
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() || {};
          const dataAgendada = data.dataAgendada || "";
          if (dataAgendadaEhFolga(dataAgendada)) return;
          if (!dataAgendada && hojeEhFeriado) return;
          const hojeDataKey = dataKeyDeDate(new Date());
          if (dataAgendada && dataAgendada > hojeDataKey) return;
          const diaTarefa = normalizarDiaSemana(data.diaSemana);
          const indiceTarefa = getIndiceDiaSemana(diaTarefa);
          if (!dataAgendada && indiceTarefa !== -1 && indiceTarefa > indiceHoje) return;
          if (data.concluida) {
            const quando = data.concluidaEm?.toDate?.();
            if (quando && dataKeyDeDate(quando) === hojeDataKey) concluidas.push({ id: docSnap.id, titulo: data.titulo || docSnap.id });
            return;
          }
          pendentes.push({
            id: docSnap.id,
            titulo: data.titulo || docSnap.id,
            diaSemana: diaTarefa || data.diaSemana || "",
            dataAgendada,
            atrasada: dataAgendada
              ? dataAgendada < hojeDataKey
              : indiceTarefa !== -1 && indiceTarefa < indiceHoje,
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
        setTarefasPendentes(pendentes);
        setAvulsasConcluidasHoje(concluidas);
        setLoadingTarefas(false);
      },
      (error) => {
        console.error("[PONTO][ERRO] Falha ao observar tarefas:", error);
        setErroTarefas("Não foi possível carregar as tarefas.");
        setLoadingTarefas(false);
      }
    );

    return () => unsubscribe();
  }, [funcionarioId, bancoHorasInicio]);

  useEffect(() => {
    if (!funcionarioId) return undefined;
    const diaHoje = new Date().getDay();
    return onSnapshot(collection(db, "tarefasSemanais"), (snapshot) => {
      const fixas = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .filter((item) => item.ativa !== false && Number(item.diaSemana) === diaHoje)
        .sort((a, b) => (a.turno || "manha").localeCompare(b.turno || "manha"));
      setTarefasFixasHoje(fixas);
    }, () => setErroTarefas("Não foi possível carregar a rotina fixa."));
  }, [funcionarioId]);

  useEffect(() => {
    if (!funcionarioId) return undefined;
    const hojeDataKey = dataKeyDeDate(new Date());
    return onSnapshot(
      collection(db, "funcionarios", funcionarioId, "conclusoesRotina"),
      (snapshot) => {
        setTarefasFixasConcluidas(new Set(
          snapshot.docs
            .map((item) => item.data())
            .filter((item) => item.dataKey === hojeDataKey)
            .map((item) => item.tarefaId)
        ));
      },
      () => setErroTarefas("Não foi possível carregar as conclusões da rotina fixa.")
    );
  }, [funcionarioId]);

  useEffect(() => {
    if (!funcionarioId) return undefined;
    const storageKey = `notificacoesLidas:${funcionarioId}`;
    const lidaAte = Number(localStorage.getItem(storageKey) || 0);
    return onSnapshot(collection(db, "notificacoes"), (snapshot) => {
      const itens = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .filter((item) => item.criadoEm?.toMillis?.() > lidaAte)
        .sort((a, b) => (b.criadoEm?.toMillis?.() || 0) - (a.criadoEm?.toMillis?.() || 0));
      setNotificacoes(itens);
      setQuantidadeNovasTarefas(itens.length);
    });
  }, [funcionarioId]);

  function marcarNotificacoesComoLidas() {
    if (funcionarioId) localStorage.setItem(`notificacoesLidas:${funcionarioId}`, String(Date.now()));
    setNotificacoes([]);
    setQuantidadeNovasTarefas(0);
    setNotificacoesAbertas(false);
  }

  useEffect(() => {
    async function carregarSemana() {
      if (!funcionarioId) return;
      const dataKeys = getDataKeysSemanaAtual();

      if (dataKeys.length === 0) {
        setDiasSemana([]);
        return;
      }

      try {
        const registros = await Promise.all(
          dataKeys.map((dataKey) => carregarDiaPorData(funcionarioId, dataKey))
        );
        setDiasSemana(registros.filter(Boolean));
      } catch (error) {
        console.error("[PONTO][ERRO] Falha ao carregar horas da semana:", error);
        setDiasSemana([]);
      }
    }

    carregarSemana();
  }, [funcionarioId, dia?.dataKey]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTickTempoReal((valor) => valor + 1);
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  const registroEmAndamento = useRef(false);
  const proximaAcao = getProximaAcao(dia, desconsiderarIntervalo);
  const diaAtualSemana = DIAS_ORDEM[new Date().getDay()];

  async function handleClick() {
    if (!podeRegistrar) return;
    if (carregandoDia || erroDia || proximaAcao === "ENCERRADO" || !funcionarioId || registroEmAndamento.current) return;

    registroEmAndamento.current = true;
    setLoading(true);
    setValidandoLocalizacao(true);
    setMensagem("");

    try {
      setMensagem("Validando localização...");

      const { latitude, longitude } = await obterPosicaoAtual();
      setValidandoLocalizacao(false);
      setMensagem("Registrando ponto...");
      await registrarAcao(funcionarioId, proximaAcao, latitude, longitude);

      const atualizado = await carregarDiaAtual(funcionarioId);
      setDia(atualizado || null);
      await carregarBancoHorasAtual();

      setMensagem("Registro realizado com sucesso!");
    } catch (error) {
      if (error?.message === "Permissão de localização negada.") {
        setMensagem("Permissão de localização negada. Ative o GPS para registrar o ponto.");
      } else {
        setMensagem(error?.message || "GPS indisponível. Não foi possível validar localização.");
      }
    } finally {
      registroEmAndamento.current = false;
      setValidandoLocalizacao(false);
      setLoading(false);
    }
  }

  function getLabel() {
    switch (proximaAcao) {
      case "ENTRADA":
        return "Registrar Entrada";
      case "SAIDA_INTERVALO":
        return "Iniciar Intervalo";
      case "ENTRADA_INTERVALO":
        return "Voltar do Intervalo";
      case "SAIDA":
        return "Encerrar Expediente";
      case "ENCERRADO":
        return "Expediente Encerrado";
      default:
        return "Registrar";
    }
  }

  function getButtonClass() {
    switch (proximaAcao) {
      case "ENTRADA":
        return "btn-verde";
      case "SAIDA_INTERVALO":
        return "btn-laranja";
      case "ENTRADA_INTERVALO":
        return "btn-azul";
      case "SAIDA":
        return "btn-roxo";
      default:
        return "btn-cinza";
    }
  }

  function getBancoClass() {
    if (bancoHoras < 0) return "negativo";
    if (bancoHoras > 0) return "positivo";
    return "neutro";
  }

  const horasTrabalhadasMin = (dia ? calcularHorasDiaParcial(dia, desconsiderarIntervalo, intervaloPrevistoMin) : 0) + tickTempoReal * 0;

  const horasSemanaMin = useMemo(() => {
    if (!diasSemana || diasSemana.length === 0) return 0;
    return diasSemana.reduce((acc, registro) => {
      if (!registro) return acc;
      if (
        registro?.ajusteTipo === "atestado" ||
        registro?.ajusteTipo === "dispensa" ||
        registro?.ajusteTipo === "ferias" ||
        registro?.ajusteTipo === "falta"
      ) {
        return acc;
      }
      if (registro.dataKey === dia?.dataKey) return acc + horasTrabalhadasMin;
      const total = Number.isFinite(registro.totalMin) ? registro.totalMin : 0;
      return acc + total;
    }, 0);
  }, [diasSemana, dia?.dataKey, horasTrabalhadasMin]);

  const diaHoje = new Date().getDay();
  const escalaHoje = escala?.[DIAS_ORDEM[diaHoje]];
  const cargaIndividualHoje = Number(escalaHoje?.cargaMin);
  const metaMin = Number.isFinite(cargaIndividualHoje)
    ? cargaIndividualHoje
    : diaHoje === 0
      ? 0
      : diaHoje === 6
        ? cargaSabadoMin
        : cargaSegSexMin;
  const horarioDia = escalaHoje?.inicio && escalaHoje?.fim
    ? `${formatarHoraJornada(escalaHoje.inicio)} às ${formatarHoraJornada(escalaHoje.fim)}`
    : metaMin > 0
      ? "Horário ainda não cadastrado"
      : "Dia sem expediente";
  const progressoPct = metaMin > 0 ? Math.min(100, Math.round((horasTrabalhadasMin / metaMin) * 100)) : 0;

  async function handleSelecionarDiaEscala(diaSemana) {
    if (!funcionarioId) return;

    setDiaSelecionadoSemana(diaSemana);
    setLoadingLogDia(true);

    try {
      const indiceDia = DIAS_ORDEM.indexOf(diaSemana);
      const dataKey = dataKeyDeDate(new Date(new Date().setDate(new Date().getDate() - new Date().getDay() + indiceDia)));
      const diaLog = await carregarDiaPorData(funcionarioId, dataKey);

      setLogDiaSelecionado({
        diaSemana,
        dataKey,
        entrada: diaLog?.entrada || null,
        saidaIntervalo: diaLog?.saidaIntervalo || null,
        entradaIntervalo: diaLog?.entradaIntervalo || null,
        saida: diaLog?.saida || null,
      });
    } catch (error) {
      console.error("[PONTO][ERRO] Falha ao carregar log do dia selecionado:", error);
      setLogDiaSelecionado(null);
    } finally {
      setLoadingLogDia(false);
    }
  }

  async function handleConcluirTarefa(tarefaId) {
    if (!funcionarioId) return;

    try {
      await updateDoc(doc(db, "tarefas", tarefaId), {
        concluida: true,
        concluidaEm: serverTimestamp(),
        concluidaPor: funcionarioId,
      });
    } catch (error) {
      console.error("[PONTO][ERRO] Falha ao concluir tarefa:", error);
      setErroTarefas("Não foi possível concluir a tarefa.");
    }
  }

  async function handleConcluirTarefaFixa(tarefaId) {
    if (!funcionarioId || tarefasFixasConcluidas.has(tarefaId) || tarefaFixaSalvando) return;

    const hojeDataKey = dataKeyDeDate(new Date());
    setTarefaFixaSalvando(tarefaId);
    setErroTarefas("");
    try {
      await setDoc(doc(db, "funcionarios", funcionarioId, "conclusoesRotina", `${hojeDataKey}_${tarefaId}`), {
        tarefaId,
        dataKey: hojeDataKey,
        concluidaEm: serverTimestamp(),
        concluidaPor: funcionarioId,
      });
    } catch (error) {
      console.error("[PONTO][ERRO] Falha ao concluir tarefa fixa:", error);
      setErroTarefas("Não foi possível marcar a rotina como realizada.");
    } finally {
      setTarefaFixaSalvando("");
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setErroLogin("");
    setLoadingLogin(true);

    try {
      await login(email.trim(), senha);
    } catch (error) {
      console.error("[PONTO][ERRO] Falha no login:", error);
      setErroLogin("Email ou senha invalidos.");
    } finally {
      setLoadingLogin(false);
    }
  }

  if (!user) {
    return (
      <div className="page-bg page-ponto">
        <main className="page-shell">
          <header className="ponto-header page-header">
            <div className="page-title-row">
              <img className="ponto-logo" src={logoAp1303} alt="AP1303" />
            </div>
            <p className="page-subtitle">Registro de ponto</p>
          </header>

          <section className="card status-card">
            <h2>Entrar no ponto</h2>
            <p className="text-muted">
              Entre com seu email e senha para acessar suas marcacoes, banco de horas e horarios.
            </p>

            <form className="admin-login-form" onSubmit={handleLogin}>
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="email@empresa.com"
                  required
                />
              </label>

              <label className="field">
                <span>Senha</span>
                <input
                  type="password"
                  value={senha}
                  onChange={(event) => setSenha(event.target.value)}
                  autoComplete="current-password"
                  placeholder="Digite sua senha"
                  required
                />
              </label>

              {erroLogin && <p className="mensagem erro">{erroLogin}</p>}
              <p className="text-muted">Ao entrar, o celular poderá pedir permissão para os avisos do app.</p>
              <button type="button" className="compras-link" onClick={() => onNavigate('/cadastro')}>Criar minha conta e grupo</button>

              <button type="submit" className="btn btn-primary" disabled={loadingLogin}>
                {loadingLogin ? "Entrando..." : "Entrar"}
              </button>
            </form>
          </section>
        </main>

        <BottomNav activePath={rotaAtual} onNavigate={onNavigate} user={user} />
      </div>
    );
  }

  if (user && !podeAcessarPonto) {
    return (
      <div className="page-bg page-ponto">
        <main className="page-shell">
          <header className="ponto-header page-header">
            <div className="page-title-row">
              <img className="ponto-logo" src={logoAp1303} alt="AP1303" />
            </div>
            <p className="page-subtitle">Registro de ponto</p>
          </header>

          <section className="card status-card">
            <h2>Acesso restrito</h2>
            <p className="text-muted">
              O perfil consulta nao possui acesso ao ponto. Use o painel Admin para consultar as
              informacoes do sistema.
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onNavigate && onNavigate("/admin")}
            >
              Ir para Admin
            </button>
          </section>
        </main>

        <BottomNav activePath={rotaAtual} onNavigate={onNavigate} user={user} />
      </div>
    );
  }

  return (
    <div className="page-bg page-ponto">
      <main className="page-shell">
        <header className="ui-header ponto-cabecalho"><div className="ui-header-top"><BrandMark /><div className="ui-header-actions">
          <div className="notificacoes-wrap" ref={notificacoesWrapRef}>
            <button type="button" className="notificacoes-balao" aria-label={`${quantidadeNovasTarefas} notificações não lidas`} aria-expanded={notificacoesAbertas} onClick={() => setNotificacoesAbertas((aberta) => !aberta)}>
              <Icon name="bell" />
              {quantidadeNovasTarefas > 0 && <b>{quantidadeNovasTarefas > 9 ? "9+" : quantidadeNovasTarefas}</b>}
            </button>
            {notificacoesAbertas && <section className="card notificacoes-painel">
              <div className="notificacoes-cabecalho"><strong>Notificações</strong>{notificacoes.length > 0 && <button type="button" onClick={marcarNotificacoesComoLidas}>Marcar como lidas</button>}</div>
              {notificacoes.length ? notificacoes.map((item) => <article key={item.id}><span aria-hidden="true">📌</span><div><strong>{item.titulo}</strong><p>{item.mensagem}</p></div></article>) : <p className="text-muted">Nenhuma notificação nova.</p>}
            </section>}
          </div>
        </div></div><section className="ponto-identidade" aria-label="Identificação da funcionária"><span className="ponto-avatar" aria-hidden="true">{nomeExibicao.trim().split(/\s+/).filter(Boolean).filter((_,i,partes)=>i===0 || i===partes.length-1).map(parte=>parte[0]).join('').toLocaleUpperCase('pt-BR')}</span><div className="ponto-identidade-nome"><span className="ponto-identidade-rotulo">Registro de ponto</span><h1>{nomeExibicao}</h1></div><div className="ponto-identidade-data"><Icon name="clock" /><span>{dataHojeExibicao}</span></div></section></header>

        {administrador && <section className="card"><p>Somente leitura. As marcações são feitas pela funcionária na própria conta.</p><label className="field"><span>Funcionária</span><select value={funcionarioConsulta} onChange={e => setFuncionarioConsulta(e.target.value)}><option value="">Selecione</option>{funcionariosPonto.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}</select></label></section>}
        <div className="ponto-painel">
        <section className="card ponto-hero">
          <Badge tone={proximaAcao === 'ENTRADA' || proximaAcao === 'ENCERRADO' ? 'neutral' : 'success'}>{carregandoDia ? 'Carregando jornada…' : erroDia ? 'Jornada indisponível' : proximaAcao === 'ENTRADA' ? 'Fora do expediente' : proximaAcao === 'ENCERRADO' ? 'Expediente encerrado' : proximaAcao === 'ENTRADA_INTERVALO' ? 'Em intervalo' : 'Em expediente'}</Badge>
          <RelogioPonto />
        {podeRegistrar && <button
          onClick={handleClick}
          disabled={carregandoDia || Boolean(erroDia) || loading || validandoLocalizacao || proximaAcao === "ENCERRADO" || usuarioSemLogin}
          className={`ponto-action ${getButtonClass()}`}
        >
          {carregandoDia ? "Carregando jornada…" : validandoLocalizacao
            ? "Validando localização..."
            : loading
            ? "Processando..."
            : getLabel()}
        </button>}
        <div className="ponto-registros"><h2>Registros de hoje</h2><ol className="ponto-timeline">{[['Entrada',dia?.entrada],['Saída para intervalo',dia?.saidaIntervalo],['Volta do intervalo',dia?.entradaIntervalo],['Saída',dia?.saida]].map(([titulo,hora]) => <li key={titulo}><span>{titulo}</span><b>{formatHora(hora)}</b></li>)}</ol></div>
        </section>
        <PontoResumo bancoHoras={bancoHoras} horasPendentesAnterior={horasPendentesAnterior} formatMinutos={formatMinutos} formatMinutosCompact={formatMinutosCompact} formatMinutosRelogio={formatMinutosRelogio} horasTrabalhadasMin={horasTrabalhadasMin} metaMin={metaMin} progressoPct={progressoPct} horarioDia={horarioDia} />
        </div>
        {['admin','funcionario'].includes(user.role) && <PratosDia user={user} apenasHoje />}
        <ResumoTarefas titulo="Tarefas fixas" concluidas={tarefasFixasHoje.filter(t => tarefasFixasConcluidas.has(t.id)).length} total={tarefasFixasHoje.length}>
          <p className="text-muted">{dataHojeExibicao}</p>
          {!tarefasFixasHoje.length && <p>Nenhuma tarefa fixa para hoje.</p>}
          <div className="tarefas-fixas-lista">{tarefasFixasHoje.map((tarefa) => {
            const concluida = tarefasFixasConcluidas.has(tarefa.id);
            return <button type="button" className={`tarefa-fixa-destaque ${concluida ? "concluida" : "pendente"}`} key={tarefa.id} disabled={concluida || tarefaFixaSalvando === tarefa.id || usuarioSemLogin} onClick={() => handleConcluirTarefaFixa(tarefa.id)} aria-label={concluida ? `${tarefa.titulo}: realizada` : `Marcar ${tarefa.titulo} como realizada`}><span className="tarefa-pin" aria-hidden="true">{concluida ? "✓" : "•"}</span><strong>{tarefa.titulo}</strong><span className={`tarefas-status ${concluida ? "concluida" : "pendente"}`}>{concluida ? "Realizada" : tarefaFixaSalvando === tarefa.id ? "Salvando..." : "Pendente"}</span><span className={`tarefa-periodo ${tarefa.turno === "tarde" ? "tarde" : "manha"}`}>{tarefa.turno === "tarde" ? "☀️ Tarde" : "🌤️ Manhã"}{tarefa.horario ? ` · ${tarefa.horario}` : ""}</span></button>;
          })}</div>
        </ResumoTarefas>

        <ResumoTarefas titulo="Tarefas avulsas" concluidas={avulsasConcluidasHoje.length} total={tarefasPendentes.length + avulsasConcluidasHoje.length} carregando={loadingTarefas}>
          {loadingTarefas && <p className="text-muted">Carregando tarefas...</p>}
          {erroTarefas && <p className="mensagem erro">{erroTarefas}</p>}
          {!loadingTarefas && tarefasPendentes.length === 0 && <p className="text-muted">Nenhuma tarefa pendente.</p>}
          {!loadingTarefas && tarefasPendentes.length > 0 && <div className="tarefas-itens">{tarefasPendentes.map((tarefa) => <div key={tarefa.id} className={`tarefas-item ${tarefa.atrasada ? "atrasada" : "vence-hoje"}`}><div><strong>{tarefa.titulo}</strong>{tarefa.solicitadoPorNome && <span className="tarefas-por">Solicitado por: {tarefa.solicitadoPorNome}</span>}{tarefa.dataAgendada && <span className="tarefas-por">Agendada para: {formatarDataBr(tarefa.dataAgendada)}</span>}{tarefa.diaSemana && <span className="tarefas-por">Dia: <span className={tarefa.atrasada ? "tarefas-dia-atrasada" : "tarefas-dia-selecionado"}>{tarefa.diaSemana}</span></span>}</div><button type="button" className="btn btn-secondary tarefas-concluir" disabled={usuarioSemLogin} onClick={() => handleConcluirTarefa(tarefa.id)}>Concluir</button></div>)}</div>}
          {avulsasConcluidasHoje.map(tarefa => <p className="tarefa-resumo-concluida" key={tarefa.id}>✓ {tarefa.titulo} — concluída hoje</p>)}
        </ResumoTarefas>





        {usuarioSemLogin && (
          <p className="text-muted">
            {administrador ? 'Selecione uma funcionária para consultar o ponto.' : 'Esta conta precisa estar vinculada ao cadastro da funcionária para registrar ponto.'}
          </p>
        )}

        <details className="card"><summary>Banco de horas, resumo mensal e escala</summary>
        <section className="card status-card">
          <h2>Status do Dia</h2>
          <div className="status-row">
            <span>Entrada</span>
            <strong>{formatHora(dia?.entrada)}</strong>
          </div>
          <div className="status-row">
            <span>Horas trabalhadas na semana</span>
            <strong>{formatMinutos(horasSemanaMin)}</strong>
          </div>
          <div className="status-row">
            <span>Banco de horas</span>
            <strong className={getBancoClass()}>{formatMinutosComSinal(bancoHoras)}</strong>
          </div>

          <div className="status-row">
            <span>Meta do mês</span>
            <strong>{formatMinutos(resumoMes.metaMin)}</strong>
          </div>
          <div className="status-row">
            <span>Trabalhado no mês</span>
            <strong>{formatMinutos(resumoMes.trabalhadoMin)}</strong>
          </div>
        </section>

        {escala && (
          <section className="card escala-card">
            <h2>Sua Escala</h2>
            <div className="escala-lista">
              {DIAS_ORDEM.filter((diaSemana) => escala[diaSemana]).map((diaSemana) => (
                <button
                  type="button"
                  key={diaSemana}
                  onClick={() => handleSelecionarDiaEscala(diaSemana)}
                  className={`escala-item ${diaSemana === diaAtualSemana ? "dia-atual" : ""} ${
                    diaSelecionadoSemana === diaSemana ? "dia-selecionado" : ""
                  }`}
                >
                  <span className="escala-dia">{DIAS_EXIBICAO[diaSemana]}</span>
                  <span className="escala-horario">
                    {escala[diaSemana].inicio} — {escala[diaSemana].fim}
                  </span>
                </button>
              ))}
            </div>

          </section>
        )}

        <section className="card log-card">
          <h2>Histórico do dia selecionado</h2>
          {loadingLogDia && <p className="text-muted">Carregando...</p>}

          {!loadingLogDia && !logDiaSelecionado && (
            <p className="text-muted">Toque em um dia da sua escala para visualizar o log.</p>
          )}

          {!loadingLogDia && logDiaSelecionado && (
            <div className="log-detalhe">
              <p className="log-dia">
                {DIAS_EXIBICAO[logDiaSelecionado.diaSemana]} ({logDiaSelecionado.dataKey})
              </p>
              <div className="log-linha">
                <span>Entrada</span>
                <strong>{formatHora(logDiaSelecionado.entrada)}</strong>
              </div>
              <div className="log-linha">
                <span>Saída intervalo</span>
                <strong>{formatHora(logDiaSelecionado.saidaIntervalo)}</strong>
              </div>
              <div className="log-linha">
                <span>Volta intervalo</span>
                <strong>{formatHora(logDiaSelecionado.entradaIntervalo)}</strong>
              </div>
              <div className="log-linha">
                <span>Saída final</span>
                <strong>{formatHora(logDiaSelecionado.saida)}</strong>
              </div>
            </div>
          )}
        </section>

        </details><ConnectionStatus />{erroDia && <p className="mensagem erro" role="alert">{erroDia}</p>}
        {mensagem && <p role="status" className="mensagem">{mensagem}</p>}

        {!usuarioSemLogin && (
          <button onClick={logout} className="btn btn-muted">
            Sair
          </button>
        )}
      </main>

      <BottomNav activePath={rotaAtual} onNavigate={onNavigate} user={user} />
    </div>
  );
}














