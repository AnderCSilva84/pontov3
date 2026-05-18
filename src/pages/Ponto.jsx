import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { logout } from "../services/auth";
import {
  carregarDiaAtual,
  carregarDiaPorData,
  registrarAcao,
  getProximaAcao,
  calcularBancoHorasMes,
  buscarDiasPorPeriodo,
} from "../services/ponto";
import { collection, doc, getDoc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import BottomNav from "../components/BottomNav";
import logoAp1303 from "../assets/ap1303.jpeg";
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

function calcularHorasDiaParcial(dia) {
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
  const [dia, setDia] = useState(null);
  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);
  const [escala, setEscala] = useState(null);
  const [bancoHoras, setBancoHoras] = useState(0);
  const [resumoMes, setResumoMes] = useState({ metaMin: 0, trabalhadoMin: 0 });
  const [diaSelecionadoSemana, setDiaSelecionadoSemana] = useState(null);
  const [logDiaSelecionado, setLogDiaSelecionado] = useState(null);
  const [loadingLogDia, setLoadingLogDia] = useState(false);
  const [tickTempoReal, setTickTempoReal] = useState(0);
  const [validandoLocalizacao, setValidandoLocalizacao] = useState(false);
  const [diasSemana, setDiasSemana] = useState([]);
  const [cargaSegSexMin, setCargaSegSexMin] = useState(480);
  const [cargaSabadoMin, setCargaSabadoMin] = useState(0);
  const [tarefasPendentes, setTarefasPendentes] = useState([]);
  const [loadingTarefas, setLoadingTarefas] = useState(true);
  const [erroTarefas, setErroTarefas] = useState("");
  const [alertaNovaTarefa, setAlertaNovaTarefa] = useState(false);
  const [quantidadeNovasTarefas, setQuantidadeNovasTarefas] = useState(0);
  const tarefasCountRef = useRef(null);
  const funcionarioId = user?.funcionarioId || user?.uid;
  const usuarioSemLogin = !funcionarioId;
  const nomeExibicao = "Joseane Santos";

  function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = (graus) => (graus * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  function obterPosicaoAtual() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("GPS indisponível neste dispositivo."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          if (error.code === 1) {
            reject(new Error("Permissão de localização negada."));
            return;
          }

          reject(new Error("Não foi possível obter sua localização."));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
        }
      );
    });
  }

  async function validarLocalizacaoParaRegistro(latitude, longitude) {
    const funcRef = doc(db, "funcionarios", funcionarioId);
    const funcSnap = await getDoc(funcRef);

    if (!funcSnap.exists()) {
      throw new Error("Funcionária não encontrada.");
    }

    const locaisPermitidos = funcSnap.data()?.locaisPermitidos || [];

    if (!Array.isArray(locaisPermitidos) || locaisPermitidos.length === 0) {
      throw new Error("Nenhum local autorizado configurado para seu usuário.");
    }

    let menorDistancia = Number.POSITIVE_INFINITY;
    let dentroDoRaio = false;

    for (const localId of locaisPermitidos) {
      const localRef = doc(db, "locais", localId);
      const localSnap = await getDoc(localRef);

      if (!localSnap.exists()) continue;

      const local = localSnap.data();
      if (!local?.ativo) continue;

      const localLat = local?.localizacao?.latitude;
      const localLng = local?.localizacao?.longitude;
      const raioMetros = Number(local?.raioMetros || 0);

      if (!Number.isFinite(localLat) || !Number.isFinite(localLng) || raioMetros <= 0) continue;

      const distancia = calcularDistancia(latitude, longitude, localLat, localLng);
      menorDistancia = Math.min(menorDistancia, distancia);

      if (distancia <= raioMetros) {
        dentroDoRaio = true;
        break;
      }
    }

    if (!Number.isFinite(menorDistancia)) {
      throw new Error("Não há local ativo válido para validação.");
    }

    return {
      autorizado: dentroDoRaio,
      distanciaMetros: menorDistancia,
    };
  }

  const carregarBancoHorasAtual = useCallback(async () => {
    if (!funcionarioId) return;

    try {
      const mesAtual = mesAtualISO();
      const total = await calcularBancoHorasMes(funcionarioId, mesAtual);
      setBancoHoras(toNumeroMinutos(total));
    } catch (error) {
      console.error("[PONTO][ERRO] Falha ao carregar banco de horas mensal:", error);
      setBancoHoras(0);
    }
  }, [funcionarioId]);

  
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
    async function fetchDia() {
      if (!funcionarioId) return;
      const dados = await carregarDiaAtual(funcionarioId);
      setDia(dados || null);
    }

    fetchDia();
  }, [funcionarioId]);

  useEffect(() => {
    async function carregarEscala() {
      if (!funcionarioId) return;
      const ref = doc(db, "funcionarios", funcionarioId);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        setEscala(data.escala || null);

        const cargaSegSex = Number(data?.cargaSegSexMin);
        const cargaSabado = Number(data?.cargaSabadoMin);

        if (Number.isFinite(cargaSegSex)) setCargaSegSexMin(cargaSegSex);
        if (Number.isFinite(cargaSabado)) setCargaSabadoMin(cargaSabado);
      }
    }

    if (funcionarioId) carregarEscala();
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
        const pendentes = [];
        const diaAtual = getDiaSemanaAtualKey();
        const indiceHoje = getIndiceDiaSemana(diaAtual);
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() || {};
          if (data.concluida) return;
          const dataAgendada = data.dataAgendada || "";
          const hojeDataKey = dataKeyDeDate(new Date());
          if (dataAgendada && dataAgendada > hojeDataKey) return;
          const diaTarefa = normalizarDiaSemana(data.diaSemana);
          const indiceTarefa = getIndiceDiaSemana(diaTarefa);
          if (!dataAgendada && indiceTarefa !== -1 && indiceTarefa > indiceHoje) return;
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
        if (tarefasCountRef.current !== null && pendentes.length > tarefasCountRef.current) {
          setQuantidadeNovasTarefas(pendentes.length - tarefasCountRef.current);
          setAlertaNovaTarefa(true);
        }

        tarefasCountRef.current = pendentes.length;
        setTarefasPendentes(pendentes);
        setLoadingTarefas(false);
      },
      (error) => {
        console.error("[PONTO][ERRO] Falha ao observar tarefas:", error);
        setErroTarefas("Não foi possível carregar as tarefas.");
        setLoadingTarefas(false);
      }
    );

    return () => unsubscribe();
  }, [funcionarioId]);

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

  const proximaAcao = getProximaAcao(dia);
  const diaAtualSemana = DIAS_ORDEM[new Date().getDay()];

  async function handleClick() {
    if (proximaAcao === "ENCERRADO" || !funcionarioId) return;

    setLoading(true);
    setValidandoLocalizacao(true);
    setMensagem("");

    try {
      setMensagem("Validando localização...");

      const { latitude, longitude } = await obterPosicaoAtual();
      const validacao = await validarLocalizacaoParaRegistro(latitude, longitude);

      if (!validacao.autorizado) {
        setMensagem("Você está fora do local autorizado.");
        return;
      }

      await registrarAcao(
        funcionarioId,
        proximaAcao,
        latitude,
        longitude,
        Math.round(validacao.distanciaMetros)
      );

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

  const horasTrabalhadasMin = (dia ? calcularHorasDiaParcial(dia) : 0) + tickTempoReal * 0;

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
  const metaMin = diaHoje === 0 ? 0 : diaHoje === 6 ? cargaSabadoMin : cargaSegSexMin;
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

  return (
    <div className="page-bg page-ponto">
      <main className="page-shell">
        <header className="ponto-header page-header">
          <div className="page-title-row">
            <img className="ponto-logo" src={logoAp1303} alt="AP1303" />
          </div>
          <p className="page-subtitle">Registro de ponto de {nomeExibicao}</p>
        </header>

        <button
          onClick={handleClick}
          disabled={loading || validandoLocalizacao || proximaAcao === "ENCERRADO" || usuarioSemLogin}
          className={`ponto-action ${getButtonClass()}`}
        >
          {validandoLocalizacao
            ? "Validando localização..."
            : loading
            ? "Processando..."
            : getLabel()}
        </button>

        {usuarioSemLogin && (
          <p className="text-muted">
            Acesse o Admin pelo rodapé para entrar e liberar o ponto.
          </p>
        )}

        {alertaNovaTarefa && (
          <section className="card tarefas-alerta">
            <div>
              <strong>Nova tarefa recebida</strong>
              {quantidadeNovasTarefas > 0 && (
                <span className="tarefas-alerta-info">
                  {quantidadeNovasTarefas === 1
                    ? "1 tarefa adicionada"
                    : `${quantidadeNovasTarefas} tarefas adicionadas`}
                </span>
              )}
            </div>
            <button
              type="button"
              className="btn btn-secondary tarefas-alerta-btn"
              onClick={() => setAlertaNovaTarefa(false)}
            >
              Fechar
            </button>
          </section>
        )}

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

            <div className="progresso-dia">
              <div className="progresso-header">
                <span>Progresso do dia</span>
                <strong>
                  {formatMinutosCompact(horasTrabalhadasMin)} / {formatMinutosRelogio(metaMin)}
                </strong>
              </div>
              <div className="progresso-barra" role="presentation">
                <span style={{ width: `${progressoPct}%` }} />
              </div>
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

        <section className="card tarefas-lista">
          <h2>Tarefas pendentes</h2>
          {loadingTarefas && <p className="text-muted">Carregando tarefas...</p>}
          {erroTarefas && <p className="mensagem erro">{erroTarefas}</p>}
          {!loadingTarefas && tarefasPendentes.length === 0 && (
            <p className="text-muted">Nenhuma tarefa pendente.</p>
          )}
          {!loadingTarefas && tarefasPendentes.length > 0 && (
            <div className="tarefas-itens">
              {tarefasPendentes.map((tarefa) => (
                <div
                  key={tarefa.id}
                  className={`tarefas-item ${tarefa.atrasada ? "atrasada" : ""}`}
                >
                  <div>
                    <strong>{tarefa.titulo}</strong>
                    {tarefa.solicitadoPorNome && (
                      <span className="tarefas-por">Solicitado por: {tarefa.solicitadoPorNome}</span>
                    )}
                    {tarefa.dataAgendada && (
                      <span className="tarefas-por">
                        Agendada para: {formatarDataBr(tarefa.dataAgendada)}
                      </span>
                    )}
                    {tarefa.diaSemana && (
                      <span className="tarefas-por">
                        Dia:{" "}
                        <span
                          className={
                            tarefa.atrasada ? "tarefas-dia-atrasada" : "tarefas-dia-selecionado"
                          }
                        >
                          {tarefa.diaSemana}
                        </span>
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary tarefas-concluir"
                    disabled={usuarioSemLogin}
                    onClick={() => handleConcluirTarefa(tarefa.id)}
                  >
                    Concluir
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {mensagem && <p className="mensagem">{mensagem}</p>}

        {!usuarioSemLogin && (
          <button onClick={logout} className="btn btn-muted">
            Sair
          </button>
        )}
      </main>

      <BottomNav activePath={rotaAtual} onNavigate={onNavigate} />
    </div>
  );
}












