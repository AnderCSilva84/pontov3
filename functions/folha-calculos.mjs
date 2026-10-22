// Fontes e hipóteses em FOLHA_PAGAMENTO.md. Compartilhado entre UI e servidor.
export const dinheiro = v => Math.round((Number(v) + 1e-8) * 100) / 100;
const n = v => Number(String(v || 0).replace(',', '.'));
export function calcularInss(base, competencia) {
  if (!String(competencia).startsWith('2026-')) throw Error('Tabela automática de INSS disponível para 2026. Informe o INSS conferido no eSocial para esta competência.');
  const faixas = [[1621, .075], [2902.84, .09], [4354.27, .12], [8475.55, .14]];
  let anterior = 0, total = 0;
  for (const [limite, aliquota] of faixas) { total += Math.max(0, Math.min(n(base), limite) - anterior) * aliquota; anterior = limite; }
  return dinheiro(total);
}
export function transportesDaCompetencia(lancamentos, funcionarioId, competencia) {
  const itens = [];
  for (const l of lancamentos.filter(l => l.tipo === 'transporte' && l.funcionarioId === funcionarioId)) {
    let valor = n(l.valorLiquido ?? n(l.valor) - n(l.descontos));
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(l.competenciaMes || '')) { if (l.competenciaMes !== competencia) continue; }
    else {
      // Legados sem competência: rateio pelos dias do período, sem duplicar meses.
      const inicio = Date.parse(l.periodoInicio + 'T12:00:00Z'), fim = Date.parse(l.periodoFim + 'T12:00:00Z');
      const a = Date.parse(competencia + '-01T12:00:00Z'), b = new Date(a); b.setUTCMonth(b.getUTCMonth() + 1);
      if (!Number.isFinite(inicio) || !Number.isFinite(fim) || fim < inicio) continue;
      const dias = Math.max(0, (Math.min(fim + 86400000, b.getTime()) - Math.max(inicio, a)) / 86400000);
      if (!dias) continue;
      valor = valor * dias / ((fim - inicio) / 86400000 + 1);
    }
    if (valor > 0) itens.push({ id: l.id, valor: dinheiro(valor) });
  }
  return { itens, total: dinheiro(itens.reduce((a, i) => a + i.valor, 0)) };
}
export function calcularFolha(f, transporte = { total: 0, itens: [] }) {
  const proventos = dinheiro(n(f.salarioBase) + n(f.bonus) + n(f.horasExtras) + n(f.adicionais));
  const valorHora = (n(f.salarioBase) + (f.bonusBaseDesconto ? n(f.bonus) : 0)) / n(f.divisorHoras);
  const descontoHoras = f.descontarHoras === false ? 0 : dinheiro(valorHora * n(f.horasDevidas));
  const bonusSemIncidencia = f.bonusSemIncidenciaInss === true ? n(f.bonus) : 0;
  const baseInss = dinheiro(Math.max(0, f.baseInssManual ? n(f.baseInssInformada) : proventos - bonusSemIncidencia - descontoHoras - n(f.faltas)));
  let inss = n(f.inss), erroCalculo = '';
  if (f.inssAutomatico) { try { inss = calcularInss(baseInss, f.competencia); } catch (e) { erroCalculo = e.message; } }
  const valeTransportePago = dinheiro(transporte.total);
  const limiteValeTransporte = dinheiro(n(f.salarioBase) * .06 * n(f.proporcaoVt ?? 100) / 100);
  const descontoValeTransporte = f.cobrarValeTransporte ? dinheiro(Math.min(limiteValeTransporte, valeTransportePago)) : 0;
  const descontos = dinheiro(descontoHoras + n(f.faltas) + inss + n(f.adiantamentos) + n(f.outrosDescontos) + descontoValeTransporte);
  return { proventos, descontos, descontoHoras, valorHora, liquido: dinheiro(Math.max(0, proventos - descontos)), baseInss, inss, valeTransportePago, limiteValeTransporte, descontoValeTransporte, transportes: transporte.itens, erroCalculo };
}
const data = v => /^\d{4}-\d{2}-\d{2}$/.test(v || '') && Number.isFinite(Date.parse(v + 'T12:00:00Z')) && new Date(v + 'T12:00:00Z').toISOString().slice(0, 10) === v;
const diasMes = (ano, mes) => new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
function avosEntre(inicio, fim) {
  let avos = 0;
  const a = new Date(inicio + 'T12:00:00Z'), b = new Date(fim + 'T12:00:00Z');
  for (let ano = a.getUTCFullYear(); ano <= b.getUTCFullYear(); ano++) for (let mes = 0; mes < 12; mes++) {
    const p = Math.max(a.getTime(), Date.UTC(ano, mes, 1, 12)), q = Math.min(b.getTime(), Date.UTC(ano, mes, diasMes(ano, mes), 12));
    if ((q - p) / 86400000 + 1 >= 15) avos++;
  }
  return Math.min(12, avos);
}
// Férias contam meses de serviço desde o início do período aquisitivo.
function avosAquisitivos(inicio, fim) {
  const a = new Date(inicio + 'T12:00:00Z'), b = new Date(fim + 'T12:00:00Z');
  let meses = 0, marco = a;
  while (meses < 12) {
    const proximo = new Date(a); proximo.setUTCMonth(a.getUTCMonth() + meses + 1, 1);
    proximo.setUTCDate(Math.min(a.getUTCDate(), diasMes(proximo.getUTCFullYear(), proximo.getUTCMonth())));
    if (proximo > b) break;
    meses++; marco = proximo;
  }
  return Math.min(12, meses + ((b - marco) / 86400000 + 1 >= 15 ? 1 : 0));
}
export function calcularEspecial(tipo, d) {
  for (const c of ['avosAutomaticos','feriasEmDobro','avisoAutomatico']) if (d[c] !== undefined && typeof d[c] !== 'boolean') throw Error('Opção de cálculo inválida.');
  const salario = n(d.salario), media = n(d.mediaVariaveis), base = salario + media;
  if (!['decimo_terceiro', 'ferias', 'rescisao'].includes(tipo) || !Number.isFinite(base) || salario <= 0) throw Error('Informe o salário base para calcular.');
  if (!/^2026-(0[1-9]|1[0-2])$/.test(d.competencia)) throw Error('Os cálculos especiais usam a tabela de 2026.');
  for (const c of ['salario','mediaVariaveis','adiantado','outrosDescontos','irrf','diasFerias','diasAbono','diasSaldo','diasFeriasVencidas','diasAviso','avos13','avosFerias']) if (!Number.isFinite(n(d[c])) || n(d[c]) < 0 || n(d[c]) > 1e8) throw Error('Revise os valores do cálculo.');
  for (const c of ['diasFerias','diasAbono','diasSaldo','diasFeriasVencidas','diasAviso','avos13','avosFerias']) if (!Number.isInteger(n(d[c]))) throw Error('Informe dias e avos inteiros.');
  const linhas = [], adicionar = (descricao, valor, desconto = false) => { valor = dinheiro(valor); if (valor) linhas.push({ descricao, valor, desconto }); return valor; };
  let inss = 0, avos13 = n(d.avos13), avosFerias = n(d.avosFerias), dataProjetada = '';
  if (avos13 > 12 || avosFerias > 12 || n(d.diasFerias) > 30 || n(d.diasAbono) > 10 || n(d.diasSaldo) > 30 || n(d.diasAviso) > 90 || n(d.diasFeriasVencidas) > 360) throw Error('Revise dias e avos informados.');
  if (tipo === 'decimo_terceiro') {
    if (d.avosAutomaticos) {
      if (!data(d.admissao) || !data(d.dataReferencia) || d.dataReferencia < d.admissao || d.dataReferencia.slice(0,4) !== d.competencia.slice(0,4)) throw Error('Informe admissão e data de referência válidas no ano da competência.');
      avos13 = avosEntre(d.admissao > d.competencia.slice(0, 4) + '-01-01' ? d.admissao : d.competencia.slice(0, 4) + '-01-01', d.dataReferencia);
    }
    const total = dinheiro(base * avos13 / 12);
    if (!['primeira','segunda','integral'].includes(d.parcela)) throw Error('Escolha a parcela do 13º.');
    adicionar(`13º salário · ${avos13}/12`, d.parcela === 'primeira' ? total / 2 : total);
    if (d.parcela !== 'primeira') { inss = calcularInss(total, d.competencia); adicionar('Adiantamento do 13º já pago', n(d.adiantado), true); }
  } else if (tipo === 'ferias') {
    if (!data(d.periodoInicio) || !data(d.periodoFim) || d.periodoFim < d.periodoInicio || (Date.parse(d.periodoFim) - Date.parse(d.periodoInicio)) / 86400000 + 1 !== n(d.diasFerias) || n(d.diasFerias) < 1 || n(d.diasAbono) > n(d.diasFerias) / 2 || n(d.diasFerias) + n(d.diasAbono) > 30) throw Error('Revise período, dias de gozo e abono de férias.');
    const remuneracao = adicionar(`Férias · ${n(d.diasFerias)} dias de gozo`, base / 30 * n(d.diasFerias));
    const terco = adicionar('Adicional de 1/3 das férias', remuneracao / 3);
    const abono = adicionar(`Abono pecuniário · ${n(d.diasAbono)} dias`, base / 30 * n(d.diasAbono)); adicionar('1/3 do abono pecuniário', abono / 3);
    inss = calcularInss(remuneracao + terco, d.competencia);
    adicionar('Adiantamento de férias já pago', n(d.adiantado), true);
  } else {
    if (!data(d.admissao) || !data(d.dataDesligamento) || d.dataDesligamento < d.admissao || !data(d.inicioAquisitivo) || d.inicioAquisitivo > d.dataDesligamento || d.inicioAquisitivo < d.admissao || d.dataDesligamento.slice(0,7) !== d.competencia) throw Error('Informe admissão, desligamento na competência e início do período aquisitivo válidos.');
    if (!['sem_justa_causa','pedido','acordo','justa_causa'].includes(d.motivo) || !['trabalhado','indenizado','dispensado','descontado'].includes(d.aviso)) throw Error('Escolha motivo e aviso prévio.');
    if (d.aviso === 'descontado' && d.motivo !== 'pedido' || d.aviso === 'indenizado' && ['pedido','justa_causa'].includes(d.motivo)) throw Error('O aviso escolhido não corresponde ao motivo do desligamento.');
    const adm = new Date(d.admissao + 'T12:00:00Z'), fim = new Date(d.dataDesligamento + 'T12:00:00Z');
    const anos = fim.getUTCFullYear() - adm.getUTCFullYear() - (fim.toISOString().slice(5, 10) < adm.toISOString().slice(5, 10) ? 1 : 0);
    const diasAviso = d.avisoAutomatico ? Math.min(90, 30 + Math.max(0, anos) * 3) : n(d.diasAviso);
    const projetada = new Date(fim); if (d.aviso === 'indenizado') projetada.setUTCDate(projetada.getUTCDate() + diasAviso);
    dataProjetada = projetada.toISOString().slice(0, 10);
    if (d.avosAutomaticos) {
      if (dataProjetada.slice(0,4) !== d.dataDesligamento.slice(0,4)) throw Error('Projeção em outro ano: informe os avos de 13º e férias conferidos no eSocial.');
      const limiteAquisitivo = new Date(d.inicioAquisitivo + 'T12:00:00Z'); limiteAquisitivo.setUTCFullYear(limiteAquisitivo.getUTCFullYear() + 1); limiteAquisitivo.setUTCDate(limiteAquisitivo.getUTCDate() + 14);
      if (projetada >= limiteAquisitivo) throw Error('A projeção completa mais de um período de férias. Confira férias vencidas e informe os avos manualmente no eSocial.');
      avos13 = avosEntre(d.admissao > dataProjetada.slice(0, 4) + '-01-01' ? d.admissao : dataProjetada.slice(0, 4) + '-01-01', dataProjetada); avosFerias = avosAquisitivos(d.inicioAquisitivo, dataProjetada);
    }
    const saldo = adicionar(`Saldo de salário · ${n(d.diasSaldo)} dias`, base / 30 * n(d.diasSaldo));
    const justa = d.motivo === 'justa_causa';
    const decimo = justa ? 0 : adicionar(`13º proporcional · ${avos13}/12`, base * avos13 / 12);
    const ferias = adicionar('Férias indenizadas (vencidas e proporcionais)', base / 30 * n(d.diasFeriasVencidas) * (d.feriasEmDobro ? 2 : 1) + (justa ? 0 : base * avosFerias / 12)); adicionar('1/3 das férias indenizadas', ferias / 3);
    if (d.aviso === 'indenizado') adicionar(`Aviso prévio · ${diasAviso} dias${d.motivo === 'acordo' ? ' · metade' : ''}`, base / 30 * diasAviso * (d.motivo === 'acordo' ? .5 : 1));
    if (d.aviso === 'descontado') adicionar('Aviso prévio não cumprido', salario / 30 * Math.min(30, diasAviso), true);
    inss = dinheiro(calcularInss(saldo, d.competencia) + calcularInss(decimo, d.competencia));
    adicionar('Adiantamentos já pagos', n(d.adiantado), true);
  }
  adicionar('INSS estimado', inss, true); adicionar('IRRF conferido no eSocial', n(d.irrf), true); adicionar('Outros descontos', n(d.outrosDescontos), true);
  const proventos = dinheiro(linhas.filter(l => !l.desconto).reduce((s,l) => s+l.valor,0)), descontos = dinheiro(linhas.filter(l => l.desconto).reduce((s,l) => s+l.valor,0));
  if (descontos > proventos) throw Error('Descontos maiores que os proventos. Revise os adiantamentos.');
  return { linhas, proventos, descontos, liquido: dinheiro(proventos - descontos), inss, avos13, avosFerias, dataProjetada };
}
