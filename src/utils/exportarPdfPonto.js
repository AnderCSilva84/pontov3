import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";
import { minutesToHHMM } from "./time";

function labelAjusteTipo(valor) {
  const mapa = {
    manual: "Manual",
    atestado: "Atestado",
    dispensa: "Dispensa",
    ferias: "Período de férias",
    falta: "Falta",
    saida_mais_cedo: "Saída mais cedo",
  };
  return mapa[valor] || valor || "-";
}

function formatarDataBr(dataIso) {
  if (!dataIso) return "-";
  const [ano, mes, dia] = String(dataIso).split("-");
  if (!ano || !mes || !dia) return dataIso;
  return `${dia}/${mes}/${ano}`;
}

export async function exportarPdfPonto(funcionarioId, nome, dataInicio, dataFim) {
  const q = query(
    collection(db, "dias"),
    where("funcionarioId", "==", funcionarioId),
    where("dataKey", ">=", dataInicio),
    where("dataKey", "<=", dataFim),
    orderBy("dataKey")
  );

  const snapshot = await getDocs(q);

  const dados = [];
  let totalPeriodo = 0;
  let saldoPeriodo = 0;

  snapshot.forEach((doc) => {
    const d = doc.data();

    totalPeriodo += d.totalMin || 0;
    const saldoLinha =
      d.ajusteTipo === "atestado" ||
      d.ajusteTipo === "dispensa" ||
      d.ajusteTipo === "ferias" ||
      d.ajusteTipo === "falta" ||
      d.ajusteTipo === "saida_mais_cedo"
        ? 0
        : d.saldoMin || 0;
    saldoPeriodo += saldoLinha;

    dados.push([
      formatarDataBr(d.dataKey),
      d.entrada || "-",
      d.saidaIntervalo || "-",
      d.entradaIntervalo || "-",
      d.saida || "-",
      labelAjusteTipo(d.ajusteTipo),
      d.ajusteObservacao || "-",
      minutesToHHMM(d.totalMin || 0),
      minutesToHHMM(saldoLinha),
    ]);
  });

  const pdf = new jsPDF();

  pdf.setFontSize(16);
  pdf.text("Relatório de Jornada", 14, 20);

  pdf.setFontSize(12);
  pdf.text(`Funcionária: ${nome}`, 14, 30);
  pdf.text(
    `Período: ${formatarDataBr(dataInicio)} até ${formatarDataBr(dataFim)}`,
    14,
    37
  );

  autoTable(pdf, {
    startY: 45,
    head: [
      [
        "Data",
        "Entrada",
        "Intervalo",
        "Volta",
        "Saída",
        "Ajuste",
        "Obs",
        "Horas Trabalhadas",
        "Banco de Horas",
      ],
    ],
    body: dados,
  });

  const finalY = pdf.lastAutoTable.finalY + 10;

  pdf.setFontSize(12);
  pdf.text(`Total no período: ${minutesToHHMM(totalPeriodo)}`, 14, finalY);
  const saldoAjustado = saldoPeriodo;
  pdf.text(`Saldo no período: ${minutesToHHMM(saldoAjustado)}`, 14, finalY + 7);

  pdf.save(`Relatorio_${nome}_${dataInicio}_${dataFim}.pdf`);
}
