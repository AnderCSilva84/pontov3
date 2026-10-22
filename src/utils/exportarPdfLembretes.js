import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { carregarLogo } from './exportarPdfListaCompras.js';

const AZUL = [47, 82, 151], VERMELHO = [233, 51, 60];
const cuidados = { crianca: 'Criança', idoso: 'Idoso', adulto: 'Adulto', cao: 'Cão', gato: 'Gato' };
const tipos = { remedio: 'Remédio', consulta: 'Consulta', passeio: 'Passeio', fisioterapia: 'Fisioterapia', cuidado: 'Cuidado', outro: 'Outro' };
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const dataBr = valor => String(valor || '').split('-').reverse().join('/');

export function montarEscala(lembretes, data = new Date()) {
  const hoje = new Date(data.getTime() - 3 * 3600000).toISOString().slice(0, 10), grupos = new Map();
  for (const l of lembretes) {
    if (!l.ativo || (l.repeticao === 'uma_vez' && l.dataInicio < hoje)) continue;
    const chave = l.cuidadoId || `${l.destinatarioCuidado || ''}|${l.nomeCuidado || ''}`;
    if (!grupos.has(chave)) grupos.set(chave, { titulo: `${cuidados[l.destinatarioCuidado] || 'Pessoa ou pet'} - ${l.nomeCuidado || 'Nome não informado'}`, responsavel: l.responsavelDescricao || '', itens: [] });
    for (const horario of l.horarios || [l.horario]) grupos.get(chave).itens.push({ ...l, horario });
  }
  return [...grupos.values()].sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR')).map(g => ({ ...g, itens: g.itens.sort((a, b) => a.horario.localeCompare(b.horario) || a.titulo.localeCompare(b.titulo, 'pt-BR')) }));
}

export async function gerarPdfLembretes(dados, { logoData, data = new Date() } = {}) {
  const logo = logoData || await carregarLogo(), pdf = new jsPDF({ orientation: 'landscape' });
  const grupos = montarEscala(dados.lembretes || [], data);
  if (!grupos.length) throw new Error('Não há lembretes ativos para a escala selecionada.');
  for (const [indice, grupo] of grupos.entries()) {
    if (indice) pdf.addPage();
    autoTable(pdf, {
      startY: 59, margin: { top: 59, bottom: 20, left: 12, right: 12 },
      head: [['Horário', 'Remédio / cuidado', 'Posologia / orientações', 'Dias', 'Começar em / data']],
      body: grupo.itens.map(l => [l.horario, l.tipo === 'remedio' ? l.medicamento : `${tipos[l.tipo] || 'Cuidado'}: ${l.titulo}`, [l.posologia, l.observacao].filter(Boolean).join('\n'), l.repeticao === 'diario' ? 'Todos os dias' : l.repeticao === 'dias' ? [...l.diasSemana].sort().map(d => DIAS[d]).join(', ') : 'Somente nesta data', dataBr(l.dataInicio)]),
      styles: { fontSize: 11, cellPadding: 4, textColor: [35, 45, 65], overflow: 'linebreak' },
      headStyles: { fillColor: AZUL, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [240, 245, 253] }, rowPageBreak: 'avoid',
      columnStyles: { 0: { cellWidth: 23, fontStyle: 'bold' }, 1: { cellWidth: 70 }, 2: { cellWidth: 98 }, 3: { cellWidth: 46 }, 4: { cellWidth: 36 } },
      didDrawPage: () => {
        pdf.setFillColor(...AZUL); pdf.rect(0, 0, 297, 48, 'F');
        pdf.addImage(logo, 'PNG', 12, 8, 30, 30, 'ap1303', 'FAST');
        pdf.setTextColor(255); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(18); pdf.text('Escala de remédios e cuidados', 49, 17);
        pdf.setFontSize(12); pdf.text(pdf.splitTextToSize(grupo.titulo, 232).slice(0, 2), 49, 27);
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.text(pdf.splitTextToSize(`Responsável: ${grupo.responsavel || dados.responsavel || 'Não informado'}`, 232).slice(0, 1), 49, 41);
        pdf.setFillColor(...VERMELHO); pdf.rect(0, 48, 297, 2, 'F');
      },
    });
  }
  const paginas = pdf.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    pdf.setPage(p); pdf.setDrawColor(...VERMELHO); pdf.setLineWidth(.5); pdf.line(12, 194, 285, 194);
    pdf.setTextColor(...AZUL); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8);
    pdf.text(`AP1303 | Emitido em ${data.toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' })} | Horários de Brasília (UTC-3)`, 12, 201);
    pdf.text(`${p} / ${paginas}`, 285, 201, { align: 'right' });
  }
  return { blob: pdf.output('blob'), nomeArquivo: `Escala_de_cuidados_${new Date(data.getTime() - 3 * 3600000).toISOString().slice(0, 10)}.pdf` };
}
