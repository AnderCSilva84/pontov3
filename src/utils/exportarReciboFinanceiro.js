import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoUrl from "../assets/ap1303.jpeg";

const PAGANTE = "Aline Lopes Gonçalves Porto e Silva";
const RECEBEDORA = "Joseane Almeida dos Santos";
const ENDERECO = "Tv São Francisco, 350 - Ed. Athenas Garden";
const numero = (valor) => Number(valor || 0) || 0;
const moeda = (valor) => numero(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function dataBr(valor) {
  const [ano, mes, dia] = String(valor || "").split("-");
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : "";
}

function mesPorExtenso(valor) {
  if (!valor) return "período não informado";
  const [ano, mes] = valor.split("-").map(Number);
  return ano && mes ? new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) : valor;
}

function referenciaPagamento(item) {
  if (item.tipo === "transporte") {
    return item.periodoInicio && item.periodoFim ? `transporte do período de ${dataBr(item.periodoInicio)} a ${dataBr(item.periodoFim)}` : (item.descricao || "transporte");
  }
  if (item.tipo === "vale") return item.competenciaMes ? `vale referente ao mês de ${mesPorExtenso(item.competenciaMes)}` : (item.descricao || "vale");
  return item.descricao || "pagamento informado";
}

function carregarImagem(url) {
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    imagem.onload = () => resolve(imagem);
    imagem.onerror = reject;
    imagem.src = url;
  });
}

async function adicionarLogo(pdf) {
  try {
    pdf.addImage(await carregarImagem(logoUrl), "JPEG", 14, 10, 28, 28);
  } catch {
    // O documento continua válido caso a imagem não seja carregada.
  }
}

const linha = (codigo, descricao, referencia, provento, desconto) => [codigo, descricao, referencia, provento ? moeda(provento) : "", desconto ? moeda(desconto) : ""];

async function gerarContracheque(item) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  await adicionarLogo(pdf);
  const salarioBase = numero(item.salarioBase || item.valor);
  const totalProventos = numero(item.proventos || item.valor);
  const totalDescontos = numero(item.descontos);
  const liquido = numero(item.valorLiquido ?? totalProventos - totalDescontos);
  const itens = [linha("001", "Salário-base / salário mínimo", "Mensal", salarioBase, 0)];
  [
    ["010", "Bônus", "bonus", true], ["020", "Horas extras", "horasExtras", true], ["030", "Outros adicionais", "adicionais", true],
    ["101", "Horas devidas", "descontoHoras", false], ["110", "Faltas / atrasos", "faltas", false], ["120", "INSS", "inss", false],
    ["130", "Vales / adiantamentos", "adiantamentos", false], ["140", "Outros descontos", "outrosDescontos", false],
  ].forEach(([codigo, descricao, campo, provento]) => {
    const valor = numero(item[campo]);
    if (valor) itens.push(linha(codigo, descricao, campo === "descontoHoras" && item.horasDevidas ? `${item.horasDevidas} h` : "", provento ? valor : 0, provento ? 0 : valor));
  });
  const descontosDetalhados = numero(item.descontoHoras) + numero(item.faltas) + numero(item.inss) + numero(item.adiantamentos) + numero(item.outrosDescontos);
  if (!descontosDetalhados && totalDescontos) itens.push(linha("199", "Descontos", "", 0, totalDescontos));

  pdf.setTextColor(35, 54, 47);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("CONTRACHEQUE", 196, 17, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(`Competência: ${mesPorExtenso(item.competenciaMes)}`, 196, 23, { align: "right" });
  pdf.text(`Pagamento: ${dataBr(item.dataPagamento)}`, 196, 28, { align: "right" });

  autoTable(pdf, {
    startY: 42, theme: "grid",
    body: [["Empregador", PAGANTE, "Empregado(a)", item.funcionarioNome || RECEBEDORA], ["Cargo", item.cargo || "Não informado", "CPF", item.cpf || "Não informado"]],
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 2.5, lineColor: [190, 202, 196] },
    columnStyles: { 0: { fontStyle: "bold", fillColor: [238, 247, 242], cellWidth: 23 }, 1: { cellWidth: 62 }, 2: { fontStyle: "bold", fillColor: [238, 247, 242], cellWidth: 23 } },
  });
  autoTable(pdf, {
    startY: pdf.lastAutoTable.finalY + 7, theme: "grid",
    head: [["Cód.", "Descrição", "Referência", "Proventos", "Descontos"]], body: itens,
    foot: [["", "TOTAIS", "", moeda(totalProventos), moeda(totalDescontos)]],
    styles: { font: "helvetica", fontSize: 9, cellPadding: 3, lineColor: [190, 202, 196] },
    headStyles: { fillColor: [47, 123, 95], textColor: 255 }, footStyles: { fillColor: [238, 247, 242], textColor: [35, 54, 47], fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 14 }, 1: { cellWidth: 71 }, 2: { cellWidth: 28 }, 3: { halign: "right" }, 4: { halign: "right" } },
  });
  const y = pdf.lastAutoTable.finalY;
  pdf.setFillColor(47, 123, 95);
  pdf.roundedRect(120, y + 7, 76, 18, 2, 2, "F");
  pdf.setTextColor(255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("LÍQUIDO A RECEBER", 125, y + 14);
  pdf.setFontSize(13);
  pdf.text(moeda(liquido), 191, y + 19, { align: "right" });
  pdf.setTextColor(50);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.text(`Base salarial: ${moeda(salarioBase)}`, 14, y + 36);
  pdf.text(`Base de INSS: ${moeda(numero(item.baseInss || totalProventos))}`, 14, y + 42);
  if (item.observacao) pdf.text(pdf.splitTextToSize(`Observação: ${item.observacao}`, 180), 14, y + 51);
  pdf.line(50, 244, 160, 244);
  pdf.text(item.funcionarioNome || RECEBEDORA, 105, 250, { align: "center" });
  pdf.text("Assinatura do(a) empregado(a)", 105, 255, { align: "center" });
  pdf.setTextColor(100);
  pdf.text("Desenvolvido por ACS Informática", 105, 278, { align: "center" });
  return { blob: pdf.output("blob"), nomeArquivo: `Contracheque_${item.competenciaMes || item.dataPagamento}.pdf` };
}

async function gerarReciboComum(item) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  await adicionarLogo(pdf);
  pdf.setDrawColor(47, 123, 95);
  pdf.roundedRect(16, 48, 178, 162, 4, 4);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text("RECIBO DE PAGAMENTO", 105, 67, { align: "center" });
  pdf.setFontSize(12);
  pdf.text(`Valor: ${moeda(item.valorLiquido ?? item.valor)}`, 105, 79, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  const complemento = item.descricao?.trim() ? ` (${item.descricao.trim()})` : "";
  const texto = `Declaro que recebi de ${PAGANTE} a quantia de ${moeda(item.valorLiquido ?? item.valor)}, referente a ${referenciaPagamento(item)}${complemento}, dando plena quitação do valor recebido.`;
  pdf.text(pdf.splitTextToSize(texto, 154), 28, 100, { lineHeightFactor: 1.55 });
  pdf.text(`Data do pagamento: ${dataBr(item.dataPagamento)}`, 28, 137);
  pdf.line(52, 181, 158, 181);
  pdf.setFont("helvetica", "bold");
  pdf.text(item.funcionarioNome || RECEBEDORA, 105, 188, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.text("Recebedora", 105, 195, { align: "center" });
  pdf.setFontSize(10);
  pdf.text(`Endereço: ${ENDERECO}`, 105, 202, { align: "center" });
  pdf.setFontSize(9);
  pdf.setTextColor(100);
  pdf.text("Desenvolvido por ACS Informática", 105, 276, { align: "center" });
  return { blob: pdf.output("blob"), nomeArquivo: `Recibo_${item.tipo}_${item.dataPagamento}.pdf` };
}

export function gerarReciboFinanceiro(item) {
  return item.tipo === "salario" ? gerarContracheque(item) : gerarReciboComum(item);
}
