import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";
import { minutesToHHMM } from "./time";

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
    saldoPeriodo += d.saldoMin || 0;

    dados.push([
      d.dataKey,
      d.entrada || "-",
      d.saidaIntervalo || "-",
      d.entradaIntervalo || "-",
      d.saida || "-",
      minutesToHHMM(d.totalMin || 0),
      minutesToHHMM(d.saldoMin || 0),
    ]);
  });

  const pdf = new jsPDF();

  pdf.setFontSize(16);
  pdf.text("Relatório de Jornada", 14, 20);

  pdf.setFontSize(12);
  pdf.text(`Funcionária: ${nome}`, 14, 30);
  pdf.text(`Período: ${dataInicio} até ${dataFim}`, 14, 37);

  autoTable(pdf, {
    startY: 45,
    head: [
      [
        "Data",
        "Entrada",
        "Intervalo",
        "Volta",
        "Saída",
        "Horas Trabalhadas",
        "Banco de Horas",
      ],
    ],
    body: dados,
  });

  const finalY = pdf.lastAutoTable.finalY + 10;

  pdf.setFontSize(12);
  pdf.text(`Total no período: ${minutesToHHMM(totalPeriodo)}`, 14, finalY);
  pdf.text(`Saldo no período: ${minutesToHHMM(saldoPeriodo)}`, 14, finalY + 7);

  pdf.save(`Relatorio_${nome}_${dataInicio}_${dataFim}.pdf`);
}