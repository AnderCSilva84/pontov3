import jsPDF from "jspdf";
import logoUrl from "../assets/ap1303.jpeg";

const PAGANTE = "Aline Lopes Gonçalves Porto e Silva";
const RECEBEDORA = "Joseane Almeida dos Santos";
const ENDERECO = "Tv São Francisco, 350 - Ed. Athenas Garden";

function moeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataBr(valor) {
  const [ano, mes, dia] = String(valor || "").split("-");
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : "";
}

function mesPorExtenso(valor) {
  if (!valor) return "período não informado";
  const [ano, mes] = valor.split("-").map(Number);
  if (!ano || !mes) return valor;
  return new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function referenciaPagamento(lancamento) {
  if (lancamento.tipo === "transporte") {
    if (!lancamento.periodoInicio || !lancamento.periodoFim) {
      return lancamento.descricao?.trim() || "transporte (período não informado)";
    }
    return `transporte do período de ${dataBr(lancamento.periodoInicio)} a ${dataBr(lancamento.periodoFim)}`;
  }
  if (lancamento.tipo === "vale") {
    if (!lancamento.competenciaMes) return lancamento.descricao?.trim() || "vale (mês não informado)";
    return `vale (adiantamento salarial) referente ao mês de ${mesPorExtenso(lancamento.competenciaMes)}`;
  }
  if (lancamento.tipo === "salario") {
    if (!lancamento.competenciaMes) return lancamento.descricao?.trim() || "salário (mês não informado)";
    return `salário referente ao mês de ${mesPorExtenso(lancamento.competenciaMes)}`;
  }
  return lancamento.descricao?.trim() || "pagamento informado";
}

function carregarImagem(url) {
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    imagem.onload = () => resolve(imagem);
    imagem.onerror = reject;
    imagem.src = url;
  });
}

export async function gerarReciboFinanceiro(lancamento) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  try {
    const logo = await carregarImagem(logoUrl);
    pdf.addImage(logo, "JPEG", 84, 12, 42, 42);
  } catch {
    // O recibo continua válido caso o navegador não consiga carregar a imagem.
  }

  pdf.setDrawColor(47, 123, 95);
  pdf.setLineWidth(0.8);
  pdf.roundedRect(16, 62, 178, 148, 4, 4);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text("RECIBO DE PAGAMENTO", 105, 77, { align: "center" });
  pdf.setFontSize(12);
  pdf.text(`Valor: ${moeda(lancamento.valorLiquido ?? lancamento.valor)}`, 105, 89, { align: "center" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  const referencia = referenciaPagamento(lancamento);
  const complemento = lancamento.descricao?.trim() ? ` (${lancamento.descricao.trim()})` : "";
  const texto = `Declaro que recebi de ${PAGANTE} a quantia de ${moeda(lancamento.valorLiquido ?? lancamento.valor)}, referente a ${referencia}${complemento}, dando plena quitação do valor recebido.`;
  pdf.text(pdf.splitTextToSize(texto, 154), 28, 110, { lineHeightFactor: 1.55 });
  pdf.text(`Data do pagamento: ${dataBr(lancamento.dataPagamento)}`, 28, 142);
  pdf.line(52, 181, 158, 181);
  pdf.setFont("helvetica", "bold");
  pdf.text(lancamento.funcionarioNome || RECEBEDORA, 105, 188, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.text("Recebedora", 105, 195, { align: "center" });
  pdf.setFontSize(10);
  pdf.text(`Endereço: ${ENDERECO}`, 105, 202, { align: "center" });

  pdf.setFontSize(9);
  pdf.setTextColor(100);
  pdf.text("Desenvolvido por ACS Informática", 105, 276, { align: "center" });
  pdf.setTextColor(47, 123, 95);
  pdf.textWithLink("https://acstech.dev.br/", 105, 282, {
    align: "center",
    url: "https://acstech.dev.br/",
  });
  return {
    blob: pdf.output("blob"),
    nomeArquivo: `Recibo_${lancamento.tipo}_${lancamento.dataPagamento}.pdf`,
  };
}
