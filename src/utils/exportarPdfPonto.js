import { carregarLogo } from './exportarPdfListaCompras.js';
import { entregarPdf, pdfAndroid, registrarPdf, validarPdf } from '../services/pdfArquivos';
import { collection } from '../services/dadosGrupo';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { query, where, orderBy, getDocs } from 'firebase/firestore';
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
  return `${dia}-${mes}-${ano.slice(-2)}`;
}

export async function exportarPdfPonto(funcionarioId, nome, dataInicio, dataFim) {
  const sessaoPdf = registrarPdf({});
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

  const marca = await carregarLogo();
  for (let pagina = 1; pagina <= pdf.getNumberOfPages(); pagina++) {
    pdf.setPage(pagina);
    pdf.addImage(marca, 'PNG', 174, 3, 18, 18);
    pdf.setFontSize(8);
    pdf.setTextColor(8, 39, 131);
    pdf.text('Tá no Ponto | ACS Tecnologia', 14, 291);
  }
  validarPdf(sessaoPdf);
  if (pdfAndroid()) await entregarPdf(registrarPdf(new File([pdf.output('blob')], 'Jornada.pdf', { type: 'application/pdf' })), 'escolher');
  else pdf.save(`Relatorio_${nome}_${dataInicio}_${dataFim}.pdf`);
}
