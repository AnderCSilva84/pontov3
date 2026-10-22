import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { itensPendentesParaCompartilhar } from "./compras.js";

const AZUL = [47, 82, 151], VERMELHO = [233, 51, 60];
let logoPromise;
export async function carregarLogo() {
  if (!logoPromise) logoPromise = fetch('/icon-192.png').then(res => {
    if (!res.ok) throw new Error('Não foi possível carregar o ícone do app. Reabra o app e tente novamente.');
    return res.blob();
  }).then(blob => new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob);
  })).catch(error => { logoPromise = null; throw error; });
  return logoPromise;
}

export async function gerarPdfListaCompras(lista, { titulo = 'Lista de compras', logoData, data = new Date(), estimativa, baseEstimativa = 'ultimo', estimativaIndisponivel = false } = {}) {
  const itens = itensPendentesParaCompartilhar(lista);
  const logo = logoData || await carregarLogo();
  const pdf = new jsPDF();
  const cabecalho = () => {
    pdf.setFillColor(...AZUL); pdf.rect(0, 0, 210, 46, 'F');
    pdf.addImage(logo, 'PNG', 12, 7, 30, 30, 'ap1303', 'FAST');
    pdf.setTextColor(255); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(19);
    pdf.text('Lista de compras', 49, 18);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10);
    pdf.text(pdf.splitTextToSize(String(titulo).trim(), 145).slice(0, 2), 49, 26);
    pdf.setFontSize(8); pdf.text(`Itens pendentes - ${data.toLocaleString('pt-BR')}`, 49, 40);
    pdf.setFillColor(...VERMELHO); pdf.rect(0, 46, 210, 2, 'F');
  };
  const resumoEstimativa = () => {
    const valor = estimativa?.totalCentavos;
    const moeda = v => (v / 100).toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
    const linhas = [estimativaIndisponivel ? 'Estimativa da compra: indisponível no momento.' : valor === null || valor === undefined ? 'Estimativa da compra: sem base de preços disponível.' : `Estimativa ${estimativa.semPreco.length ? 'parcial ' : ''}da compra: ${moeda(valor)}`];
    if (estimativa) {
      linhas.push(`Base: ${baseEstimativa === 'media' ? 'média dos últimos 10 preços' : 'último preço registrado'}. Os valores podem variar.`);
      if (estimativa.semPreco.length) linhas.push(`${estimativa.semPreco.length} item(ns) sem preço, fora da estimativa.`);
      if (estimativa.subtotalInformadoCentavos > 0) linhas.push(`Já registrado: ${moeda(estimativa.subtotalInformadoCentavos)} | Pendentes estimados: ${moeda(estimativa.subtotalEstimadoCentavos)}`);
    }
    return linhas;
  };
  const resumo = resumoEstimativa();
  pdf.setTextColor(...AZUL); pdf.setFont('helvetica','bold'); pdf.setFontSize(11); pdf.text(resumo[0],14,57);
  pdf.setFont('helvetica','normal'); pdf.setFontSize(9);
  pdf.text(resumo.slice(1),14,63);
  let y = 66 + Math.max(0,resumo.length-1) * 5;
  const categorias = [...new Set(itens.map((item) => item.categoria))];
  for (const categoria of categorias) {
    if (y > 245) { pdf.addPage(); y = 57; }
    autoTable(pdf, {
      startY: y, head: [[categoria]], body: itens.filter((item) => item.categoria === categoria).map((item) => [`[  ]   ${item.nome}`]),
      theme: "plain", margin: { top: 57, bottom: 22, left: 14, right: 14 },
      headStyles: { fillColor: AZUL, textColor: [255, 255, 255], fontSize: 11, fontStyle: 'bold' },
      styles: { fontSize: 11, cellPadding: 4, textColor: [35, 45, 65], overflow: 'linebreak' },
      alternateRowStyles: { fillColor: [240, 245, 253] }, rowPageBreak: 'avoid',
    });
    y = pdf.lastAutoTable.finalY + 9;
  }
  const paginas = pdf.getNumberOfPages();
  for (let pagina = 1; pagina <= paginas; pagina++) {
    pdf.setPage(pagina); cabecalho();
    pdf.setDrawColor(...VERMELHO); pdf.setLineWidth(.6); pdf.line(14, 279, 196, 279);
    pdf.setTextColor(...AZUL); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8);
    pdf.text('AP1303 | Compras', 14, 286);
    pdf.text(`${pagina} / ${paginas}`, 196, 286, { align: 'right' });
  }
  return { blob: pdf.output("blob"), nomeArquivo: "Lista_de_compras.pdf" };
}
