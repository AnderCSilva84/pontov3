import {nomeTipoCompra} from './comprasTipo.js';
import {jsPDF} from 'jspdf';
import {autoTable} from 'jspdf-autotable';
import {carregarLogo} from './exportarPdfListaCompras.js';
import {moedaComparacao} from './comparacaoCompras.js';
import {dataPreco,numeroCompras} from './comprasAnalise.js';
import {dataHoraExibicao} from './datasExibicao.js';
const AZUL=[8,39,131],VERMELHO=[255,24,37];
export async function gerarPdfComparacaoPrecos(linhas,{ladoA,ladoB,modo='mercados',tipoCompra='supermercado',inicioMs,fimMs,busca='',logoData,data=new Date()}={}){
 if(!linhas.length)throw Error('Escolha uma comparação com produtos em comum para exportar.');
 const logo=logoData||await carregarLogo(),pdf=new jsPDF({orientation:'landscape',format:'a4'});
 pdf.setFont('helvetica','normal');pdf.setFontSize(9);
 const refA=pdf.splitTextToSize('1. '+ladoA,128),refB=pdf.splitTextToSize('2. '+ladoB,128);
 const notas=[modo==='listas'?'Listas completas. Preço médio ponderado pelas quantidades de cada produto.':'Último preço de cada produto em cada filial, dentro do período selecionado.', 'Valores originais por produto; descontos gerais não distribuídos. Preços históricos, não ofertas atuais.',...(busca?['Busca aplicada: '+String(busca).slice(0,160)]:[])];
 const notasTexto=pdf.splitTextToSize(notas.join(' '),269);
 const inicioNotas=49+Math.max(refA.length,refB.length)*4,topo=inicioNotas+notasTexto.length*3.5+5;
 const cabecalho=()=>{
  pdf.setFillColor(...AZUL);pdf.rect(0,0,297,34,'F');pdf.addImage(logo,'PNG',14,4,25,25,'marca-comparacao','FAST');pdf.setTextColor(255);pdf.setFont('helvetica','bold');pdf.setFontSize(18);pdf.text('Comparação de preços',45,14);pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.text(linhas.length+' produtos em comum | '+(modo==='listas'?'Listas de compras':'Supermercados')+' | '+nomeTipoCompra({tipoCompra}),45,21);pdf.text('Gerado em '+dataHoraExibicao(data,{timeZone:'America/Fortaleza'}),45,28);pdf.setFillColor(...VERMELHO);pdf.rect(0,34,297,1.5,'F');
  pdf.setTextColor(...AZUL);pdf.setFontSize(9);pdf.setFont('helvetica','bold');pdf.text(refA,14,42);pdf.text(refB,153,42);pdf.setFont('helvetica','normal');pdf.setFontSize(8);const y=44+Math.max(refA.length,refB.length)*4;pdf.text((modo==='listas'?'Período usado para encontrar as listas: ':'Período das compras: ')+dataPreco(inicioMs)+' a '+dataPreco(fimMs),14,y);pdf.setTextColor(65,80,105);pdf.setFontSize(7.5);pdf.text(notasTexto,14,inicioNotas);
 };
 const preco=(l,lado)=>[moedaComparacao(l[lado].preco),l.menor==='empate'?'Mesmo preço':l.menor===lado?'Menor preço':'Maior preço','Compra: '+dataPreco(l[lado].compradoEmMs)+(modo==='listas'?' | Qtd.: '+numeroCompras(l[lado].quantidade):'')].join('\n');
 autoTable(pdf,{startY:topo,margin:{top:topo,bottom:17,left:14,right:14},head:[['Nº','Produto / marca / embalagem','Por','Preço 1','Preço 2','Diferença por unidade']],body:linhas.map((l,i)=>[String(i+1),[l.modelo.nomeCanonico||l.modelo.nomeSnapshot,l.modelo.marca||'Marca não informada',l.modelo.apresentacao||'Embalagem não informada'].join('\n'),l.modelo.unidadeCompra==='un'?'unidade / embalagem':l.modelo.unidadeCompra,preco(l,'a'),preco(l,'b'),moedaComparacao(l.diferenca)]),theme:'grid',styles:{font:'helvetica',fontSize:8,cellPadding:2,overflow:'linebreak',textColor:[30,44,65],lineColor:[219,225,235],lineWidth:.2},headStyles:{fillColor:AZUL,textColor:255,fontStyle:'bold'},alternateRowStyles:{fillColor:[247,249,253]},columnStyles:{0:{cellWidth:12},1:{cellWidth:85},2:{cellWidth:22},3:{cellWidth:55},4:{cellWidth:55},5:{cellWidth:40}},rowPageBreak:'avoid',didParseCell:ctx=>{if(ctx.section!=='body'||![3,4].includes(ctx.column.index))return;const l=linhas[ctx.row.index],lado=ctx.column.index===3?'a':'b';if(l.menor==='empate'){ctx.cell.styles.fillColor=[241,244,250];ctx.cell.styles.textColor=[53,73,105];}else if(l.menor===lado){ctx.cell.styles.fillColor=[233,246,237];ctx.cell.styles.textColor=[21,93,48];}else{ctx.cell.styles.fillColor=[255,240,240];ctx.cell.styles.textColor=[164,32,48];}ctx.cell.styles.fontStyle='bold';},didDrawPage:cabecalho});
 const paginas=pdf.getNumberOfPages();for(let n=1;n<=paginas;n++){pdf.setPage(n);pdf.setDrawColor(...VERMELHO);pdf.setLineWidth(.4);pdf.line(14,197,283,197);pdf.setTextColor(...AZUL);pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.text('Tá no Ponto | Comparação de compras',14,203);pdf.text(n+' / '+paginas,283,203,{align:'right'});}
 return {blob:pdf.output('blob'),nomeArquivo:'Comparacao_de_precos.pdf'};
}
