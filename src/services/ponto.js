import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db, functions } from "./firebase";
import { httpsCallable } from "firebase/functions";

/* ===========================
   BUSCAS ADMIN
=========================== */

export async function buscarDiasPorPeriodo(funcionarioId, dataInicio, dataFim) {
  const q = query(
    collection(db, "dias"),
    where("funcionarioId", "==", funcionarioId),
    where("dataKey", ">=", dataInicio),
    where("dataKey", "<=", dataFim),
    orderBy("dataKey", "asc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => docSnap.data());
}

export async function listarFuncionarios() {
  const q = query(collection(db, "funcionarios"), where("ativo", "==", true));

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
}

/* ===========================
   UTIL
=========================== */

function getDataKey() {
  const partes = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date()).map(({ type, value }) => [type, value]));
  return `${partes.year}-${partes.month}-${partes.day}`;
}



function horaParaMinutos(hora) {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

function isSabado() {
  return new Date(`${getDataKey()}T12:00:00Z`).getUTCDay() === 6;
}

/* ===========================
   CARREGAR DIA
=========================== */

export async function carregarDiaAtual(funcionarioId) {
  const dataKey = getDataKey();
  const diaId = `${funcionarioId}_${dataKey}`;
  const diaRef = doc(db, "dias", diaId);

  const snap = await getDoc(diaRef);
  if (!snap.exists()) return null;

  return snap.data();
}

export async function carregarDiaPorData(funcionarioId, dataKey) {
  if (!funcionarioId || !dataKey) return null;

  const diaId = `${funcionarioId}_${dataKey}`;
  const diaRef = doc(db, "dias", diaId);
  const snap = await getDoc(diaRef);

  if (!snap.exists()) return null;
  return snap.data();
}

/* ===========================
   MÁQUINA DE ESTADOS
=========================== */

export function getProximaAcao(dia, desconsiderarIntervalo = false) {
  const sabado = isSabado();

  if (!dia) return "ENTRADA";
  if (dia.dataKey && dia.dataKey !== getDataKey()) return "ENTRADA";
  if (dia.encerrado || dia.saida) return "ENCERRADO";
  if (!dia.entrada) return "ENTRADA";

  if (sabado) {
    if (!dia.saida) return "SAIDA";
    return "ENCERRADO";
  }

  if (desconsiderarIntervalo) {
    if (!dia.saida) return "SAIDA";
    return "ENCERRADO";
  }

  if (!dia.saidaIntervalo) return "SAIDA_INTERVALO";
  if (!dia.entradaIntervalo) return "ENTRADA_INTERVALO";
  if (!dia.saida) return "SAIDA";

  return "ENCERRADO";
}

/* ===========================
   REGISTRAR AÇÃO
=========================== */

export async function registrarAcao(funcionarioId, tipo, latitude, longitude) {
  const chamada = httpsCallable(functions, "registrarPonto");
  return chamada({ funcionarioId, tipo, latitude, longitude });
}

export async function calcularBancoHoras(funcionarioId) {
  const q = query(collection(db, "dias"), where("funcionarioId", "==", funcionarioId));

  const snap = await getDocs(q);

  let totalSaldo = 0;

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    totalSaldo += data.saldoMin || 0;
  });

  return totalSaldo;
}

function normalizarMinutos(valor) {
  if (typeof valor === "number" && Number.isFinite(valor)) return valor;
  if (typeof valor === "string") {
    const n = Number(valor.trim().replace(",", "."));
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}

export async function calcularBancoHorasMes(funcionarioId, mesYYYYMM, inicioContagem = "") {
  if (!funcionarioId || !mesYYYYMM) return 0;

  const inicio = `${mesYYYYMM}-01`;
  const fim = `${mesYYYYMM}-31`;

  // Consulta ampla por funcionário e filtra período em memória para evitar
  // falhas de índice composto no Firestore (caso comum em produção).
  const q = query(collection(db, "dias"), where("funcionarioId", "==", funcionarioId));
  const [snap, funcionarioSnap] = await Promise.all([
    getDocs(q),
    getDoc(doc(db, "funcionarios", funcionarioId)),
  ]);
  const funcionario = funcionarioSnap.data() || {};

  return snap.docs.reduce((total, docSnap) => {
    const data = docSnap.data();
    const dataKey = String(data?.dataKey || "");

    if (dataKey < inicio || dataKey > fim || (inicioContagem && dataKey < inicioContagem)) return total;

    if (
      data?.ajusteTipo === "atestado" ||
      data?.ajusteTipo === "dispensa" ||
      data?.ajusteTipo === "ferias" ||
      data?.ajusteTipo === "falta" ||
      data?.ajusteTipo === "saida_mais_cedo"
    ) {
      return total;
    }

    if (!data.calculoVersao && funcionario.desconsiderarIntervalo && data?.entrada && data?.saida) {
      const entradaMin = horaParaMinutos(data.entrada);
      const saidaMin = horaParaMinutos(data.saida);
      const dataLocal = new Date(`${dataKey}T12:00:00`);
      const diaSemana = dataLocal.getDay();
      const chavesDia = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
      const cargaEscala = Number(funcionario?.escala?.[chavesDia[diaSemana]]?.cargaMin);
      const cargaPadrao = diaSemana === 6 ? Number(funcionario.cargaSabadoMin) : Number(funcionario.cargaSegSexMin);
      const cargaPrevista = Number.isFinite(cargaEscala) ? cargaEscala : (Number.isFinite(cargaPadrao) ? cargaPadrao : (diaSemana === 0 ? 0 : 480));
      const intervalo = diaSemana === 6 ? 0 : (Number.isFinite(Number(funcionario.intervaloPrevistoMin)) ? Number(funcionario.intervaloPrevistoMin) : 60);
      return total + (Math.max(0, saidaMin - entradaMin - intervalo) - cargaPrevista);
    }

    return total + normalizarMinutos(data?.saldoMin);
  }, 0);
}
