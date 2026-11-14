import {jsPDF} from 'jspdf';
import {autoTable} from 'jspdf-autotable';
import {carregarLogo} from './exportarPdfListaCompras.js';
import {gastosSeparados,nomeTipoCompra,TIPOS_COMPRAS} from './comprasTipo.js';
const moeda=v=>(v/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export async function gerarPdfGastosCompras(listas,{inicio,fim,logoData}={}){
 const itens=listas.filter(l=>l.status==='finalizada'),totais=gastosSeparados(itens),logo=logoData||await carregarLogo(),pdf=new jsPDF();
 autoTable(pdf,{startY:104,margin:{top:104,bottom:20},head:[['Compra','Classificação','Total pago']],body:itens.map(l=>[l.titulo,nomeTipoCompra(l),moeda(l.totalCentavos)]),styles:{fontSize:9,overflow:'linebreak'},headStyles:{fillColor:[47,82,151]},rowPageBreak:'avoid'});
 for(let pagina=1;pagina<=pdf.getNumberOfPages();pagina++){
  pdf.setPage(pagina);pdf.setFillColor(47,82,151);pdf.rect(0,0,210,42,'F');pdf.addImage(logo,'PNG',12,6,28,28);pdf.setTextColor(255);pdf.setFontSize(18);pdf.text('Gastos de compras',47,18);pdf.setFontSize(10);pdf.text(`${inicio} a ${fim}`,47,29);pdf.setFillColor(233,51,60);pdf.rect(0,42,210,2,'F');
  pdf.setTextColor(35,45,65);pdf.setFontSize(11);Object.entries(TIPOS_COMPRAS).forEach(([id,nome],i)=>pdf.text(`${nome}: ${moeda(totais[id])}`,14,55+i*7));pdf.text(`Total geral exportado (soma): ${moeda(totais.total)}`,14,90);pdf.setFontSize(8);pdf.text('Somente compras finalizadas no período e classificação selecionados.',14,97);pdf.text(`Tá no Ponto | Compras - ${pagina}/${pdf.getNumberOfPages()}`,14,287);
 }
 return {blob:pdf.output('blob'),nomeArquivo:'Gastos_de_compras.pdf'};
}
