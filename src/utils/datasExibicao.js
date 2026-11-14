// Somente apresentação. Datas ISO de calendário não sofrem conversão de fuso.
export function dataExibicao(valor, opcoes = {}) {
  if (valor == null || valor === '') return '—';
  if (typeof valor === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(valor)) {
    const [ano, mes] = valor.split('-');
    return `${mes}-${ano.slice(-2)}`;
  }
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [ano, mes, dia] = valor.split('-');
    return `${dia}-${mes}-${ano.slice(-2)}`;
  }
  const data = valor?.toDate?.() ?? new Date(valor);
  if (Number.isNaN(data.getTime())) return '—';
  const p = Object.fromEntries(new Intl.DateTimeFormat('pt-BR', { timeZone: opcoes.timeZone, year: '2-digit', month: '2-digit', day: '2-digit' }).formatToParts(data).map(p => [p.type, p.value]));
  return `${p.day}-${p.month}-${p.year}`;
}
export function dataHoraExibicao(valor, opcoes = {}) {
  if (valor == null || valor === '') return '—';
  const data = valor?.toDate?.() ?? new Date(valor);
  if (Number.isNaN(data.getTime())) return '—';
  const { timeZone } = opcoes;
  return `${dataExibicao(data, { timeZone })} ${data.toLocaleTimeString('pt-BR', { timeZone, hour: '2-digit', minute: '2-digit' })}`;
}
