import { dataExibicao, dataHoraExibicao } from './datasExibicao.js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { carregarLogo } from './exportarPdfListaCompras.js';

const AZUL = [47, 82, 151], VERMELHO = [233, 51, 60];
const cuidados = { crianca: 'Criança', idoso: 'Idoso', adulto: 'Adulto', cao: 'Cão', gato: 'Gato' };
const tipos = { remedio: 'Remédio', consulta: 'Consulta', passeio: 'Passeio', fisioterapia: 'Fisioterapia', cuidado: 'Cuidado', outro: 'Outro' };
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export function compromissoEscala(l){
  const proprio=l.tipo==='consulta'&&Boolean(l.dataCompromisso&&l.horarioCompromisso);
  return {data:proprio?l.dataCompromisso:l.dataInicio,hora:proprio?l.horarioCompromisso:l.horario,proprio};
}

export function montarEscala(lembretes, data = new Date()) {
  const hoje = new Date(data.getTime() - 3 * 3600000).toISOString().slice(0, 10), grupos = new Map();
  for (const l of lembretes) {
    if (!l.ativo || (l.repeticao === 'uma_vez' && compromissoEscala(l).data < hoje)) continue;
    const chave = l.cuidadoId || `${l.destinatarioCuidado || ''}|${l.nomeCuidado || ''}`;
    if (!grupos.has(chave)) grupos.set(chave, { titulo: `${cuidados[l.destinatarioCuidado] || 'Pessoa ou pet'} - ${l.nomeCuidado || 'Nome não informado'}`, responsavel: l.responsavelDescricao || '', itens: [] });
    for (const horario of l.horarios || [l.horario]) grupos.get(chave).itens.push({ ...l, horario });
  }
  return [...grupos.values()].sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR')).map(g => ({ ...g, itens: g.itens.sort((a, b) => {const x=compromissoEscala(a),y=compromissoEscala(b);return String(x.data).localeCompare(String(y.data))||String(x.hora).localeCompare(String(y.hora))||a.titulo.localeCompare(b.titulo,'pt-BR');}) }));
}

export async function gerarPdfLembretes(dados, { logoData, data = new Date() } = {}) {
  const logo = logoData || await carregarLogo(), pdf = new jsPDF({ orientation: 'landscape' });
  const grupos = montarEscala(dados.lembretes || [], data);
  if (!grupos.length) throw new Error('Não há lembretes ativos para a escala selecionada.');
  for (const [indice, grupo] of grupos.entries()) {
    if (indice) pdf.addPage();
    autoTable(pdf, {
      startY: 32, margin: { top: 32, bottom: 20, left: 12, right: 12 },
      head: [['Data do\ncompromisso', 'Hora', 'Remédio / compromisso', 'Posologia / orientações', 'Repetição / aviso']],
      body: grupo.itens.map(l => {const c=compromissoEscala(l),consulta=l.tipo==='consulta';return [consulta&&!c.proprio?'Não informada':dataExibicao(c.data)+(l.repeticao!=='uma_vez'&&!c.proprio?'\n(início)':''),consulta&&!c.proprio?'Não informada':String(c.hora||'—'),l.tipo==='remedio'?l.medicamento:`${tipos[l.tipo]||'Cuidado'}: ${l.titulo}`,[l.posologia,l.observacao].filter(Boolean).join('\n'),[l.repeticao==='diario'?'Todos os dias':l.repeticao==='dias'?[...l.diasSemana].sort().map(d=>DIAS[d]).join(', '):'Somente nesta data',consulta?`Aviso: ${dataExibicao(l.dataInicio)} às ${l.horario}${c.proprio?'':'\nPreencha a data e a hora do compromisso no cadastro.'}`:''].filter(Boolean).join('\n')];}),
      styles: { fontSize: 11, cellPadding: 4, textColor: [35, 45, 65], overflow: 'linebreak' },
      headStyles: { fontSize: 10, fillColor: AZUL, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [240, 245, 253] }, rowPageBreak: 'avoid',
      columnStyles: { 0: { cellWidth: 34, fontStyle: 'bold' }, 1: { cellWidth: 27, fontStyle: 'bold' }, 2: { cellWidth: 62 }, 3: { cellWidth: 94 }, 4: { cellWidth: 56 } },
      didDrawPage: () => {
        pdf.setFillColor(...AZUL); pdf.rect(0, 0, 297, 24, 'F');
        pdf.addImage(logo, 'PNG', 12, 2, 20, 20, 'ap1303', 'FAST');
        pdf.setTextColor(255); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(15); pdf.text('Escala de remédios e cuidados', 38, 8);
        pdf.setFontSize(10); pdf.text(pdf.splitTextToSize(grupo.titulo, 245).slice(0, 2), 38, 13);
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.text(pdf.splitTextToSize(`Responsável: ${grupo.responsavel || dados.responsavel || 'Não informado'}`, 245).slice(0, 1), 38, 21);
        pdf.setFillColor(...VERMELHO); pdf.rect(0, 24, 297, 1, 'F');
      },
    });
  }
  const paginas = pdf.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    pdf.setPage(p); pdf.setDrawColor(...VERMELHO); pdf.setLineWidth(.5); pdf.line(12, 194, 285, 194);
    pdf.setTextColor(...AZUL); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8);
    pdf.text(`Tá no Ponto | Emitido em ${dataHoraExibicao(data, { timeZone: 'America/Fortaleza' })} | Horários de Brasília (UTC-3)`, 12, 201);
    pdf.text(`${p} / ${paginas}`, 285, 201, { align: 'right' });
  }
  return { blob: pdf.output('blob'), nomeArquivo: `Escala_de_cuidados_${new Date(data.getTime() - 3 * 3600000).toISOString().slice(0, 10)}.pdf` };
}
