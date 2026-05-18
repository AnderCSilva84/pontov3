import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";

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
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function getHoraAtual() {
  const agora = new Date();
  const h = String(agora.getHours()).padStart(2, "0");
  const m = String(agora.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function horaParaMinutos(hora) {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

function isSabado() {
  const hoje = new Date();
  return hoje.getDay() === 6;
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

export function getProximaAcao(dia) {
  const sabado = isSabado();

  if (!dia) return "ENTRADA";
  if (!dia.entrada) return "ENTRADA";

  if (sabado) {
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

export async function registrarAcao(funcionarioId, tipo) {
  const dataKey = getDataKey();
  const hora = getHoraAtual();
  const diaId = `${funcionarioId}_${dataKey}`;
  const diaRef = doc(db, "dias", diaId);

  await addDoc(collection(db, "registros"), {
    funcionarioId,
    tipo,
    timestamp: serverTimestamp(),
    dataKey,
  });

  const updateData = {
    funcionarioId,
    dataKey,
  };

  if (tipo === "ENTRADA") {
    updateData.entrada = hora;
  }

  if (tipo === "SAIDA_INTERVALO") {
    updateData.saidaIntervalo = hora;
  }

  if (tipo === "ENTRADA_INTERVALO") {
    updateData.entradaIntervalo = hora;
  }

  if (tipo === "SAIDA") {
    updateData.saida = hora;
    updateData.encerrado = true;

    const diaSnap = await getDoc(diaRef);
    const diaAtual = diaSnap.data();

    const entradaMin = horaParaMinutos(diaAtual.entrada);
    const saidaMin = horaParaMinutos(hora);

    let totalMin = 0;

    if (isSabado()) {
      totalMin = saidaMin - entradaMin;
    } else {
      const intervaloMin =
        horaParaMinutos(diaAtual.entradaIntervalo) - horaParaMinutos(diaAtual.saidaIntervalo);

      totalMin = saidaMin - entradaMin - intervaloMin;
    }

    const funcSnap = await getDoc(doc(db, "funcionarios", funcionarioId));
    const funcionario = funcSnap.data();

    const cargaPrevista = isSabado() ? funcionario.cargaSabadoMin : funcionario.cargaSegSexMin;

    const saldoMin = totalMin - cargaPrevista;

    updateData.totalMin = totalMin;
    updateData.saldoMin = saldoMin;
  }

  await setDoc(diaRef, updateData, { merge: true });
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

export async function calcularBancoHorasMes(funcionarioId, mesYYYYMM) {
  if (!funcionarioId || !mesYYYYMM) return 0;

  const inicio = `${mesYYYYMM}-01`;
  const fim = `${mesYYYYMM}-31`;

  // Consulta ampla por funcionário e filtra período em memória para evitar
  // falhas de índice composto no Firestore (caso comum em produção).
  const q = query(collection(db, "dias"), where("funcionarioId", "==", funcionarioId));
  const snap = await getDocs(q);

  return snap.docs.reduce((total, docSnap) => {
    const data = docSnap.data();
    const dataKey = String(data?.dataKey || "");

    if (dataKey < inicio || dataKey > fim) return total;

    if (
      data?.ajusteTipo === "atestado" ||
      data?.ajusteTipo === "dispensa" ||
      data?.ajusteTipo === "ferias" ||
      data?.ajusteTipo === "falta" ||
      data?.ajusteTipo === "saida_mais_cedo"
    ) {
      return total;
    }

    return total + normalizarMinutos(data?.saldoMin);
  }, 0);
}
