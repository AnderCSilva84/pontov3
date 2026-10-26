import {somarBancoHoras} from '../utils/pontoSaldo';
import { collection, doc } from './dadosGrupo';
import { getDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db, functions } from "./firebase";
import { httpsCallable } from "firebase/functions";
import { dataOperacional } from '../utils/dataPonto';

/* ===========================
   BUSCAS ADMIN
=========================== */

export async function buscarDiasPorPeriodo(funcionarioId, dataInicio, dataFim, limite=0) {
  const q = query(
    collection(db, "dias"),
    where("funcionarioId", "==", funcionarioId),
    where("dataKey", ">=", dataInicio),
    where("dataKey", "<=", dataFim),
    orderBy("dataKey", "asc"),
    ...(limite ? [limit(limite)] : [])
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
  return dataOperacional();
}



function isSabado() {
  return new Date(`${getDataKey()}T12:00:00Z`).getUTCDay() === 6;
}

/* ===========================
   CARREGAR DIA
=========================== */

export async function carregarDiaAtual(funcionarioId) {
  return carregarDiaPorData(funcionarioId, getDataKey());
}

export async function carregarDiaPorData(funcionarioId, dataKey) {
  if (!funcionarioId || !dataKey) return null;

  const snap = await getDocs(query(collection(db, 'dias'), where('funcionarioId', '==', funcionarioId), where('dataKey', '==', dataKey)));
  return snap.docs[0]?.data() || null;
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


export async function calcularBancoHorasMes(funcionarioId, mesYYYYMM, inicioContagem = "") {
  if (!funcionarioId || !mesYYYYMM) return 0;

  const inicio = `${mesYYYYMM}-01`;
  const fim = `${mesYYYYMM}-31`;

  // Usa o índice existente (funcionarioId, dataKey), sem carregar todo o histórico.
  const q = query(collection(db, "dias"), where("funcionarioId", "==", funcionarioId), where('dataKey','>=',inicioContagem>inicio?inicioContagem:inicio), where('dataKey','<=',fim), orderBy('dataKey','asc'));
  const [snap, funcionarioSnap] = await Promise.all([
    getDocs(q),
    getDoc(doc(db, "funcionarios", funcionarioId)),
  ]);
  const funcionario = funcionarioSnap.data() || {};

  return somarBancoHoras(snap.docs.map(d=>d.data()),funcionario,mesYYYYMM,inicioContagem);

}
