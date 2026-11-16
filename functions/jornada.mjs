export const DIAS_JORNADA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

export function jornadaNaData(funcionario = {}, dataKey = '') {
  const historico = (funcionario.jornadas || []).filter(j => j.vigencia <= dataKey)
    .sort((a, b) => b.vigencia.localeCompare(a.vigencia));
  return historico.length ? { ...funcionario, ...historico[0] } : funcionario;
}

export function cargaNaData(funcionario, dataKey) {
  const jornada = jornadaNaData(funcionario, dataKey);
  const dia = new Date(dataKey + 'T12:00:00Z').getUTCDay();
  return Number(jornada.escala?.[DIAS_JORNADA[dia]]?.cargaMin ??
    (dia === 0 ? 0 : dia === 6 ? jornada.cargaSabadoMin ?? 0 : jornada.cargaSegSexMin ?? 480));
}

export function criarModeloJornada(horas) {
  if (![44, 42, 40].includes(Number(horas))) throw Error('Selecione 44, 42 ou 40 horas.');
  const cargaSegSexMin = Number(horas) === 42 ? 504 : 480;
  const cargaSabadoMin = Number(horas) === 44 ? 240 : 0;
  const escala = Object.fromEntries(DIAS_JORNADA.map((dia, i) => {
    const cargaMin = i === 0 ? 0 : i === 6 ? cargaSabadoMin : cargaSegSexMin;
    const fim = 8 * 60 + cargaMin + (i === 6 || !cargaMin ? 0 : 60);
    return [dia, { cargaMin, inicio: cargaMin ? '08:00' : '',
      fim: cargaMin ? `${String(Math.floor(fim / 60)).padStart(2, '0')}:${String(fim % 60).padStart(2, '0')}` : '' }];
  }));
  return { horasSemanais: Number(horas), cargaSegSexMin, cargaSabadoMin, escala };
}

export function validarModeloJornada(horas, vigencia, escala) {
  horas = Number(horas);
  if (![44, 42, 40].includes(horas)) return 'Selecione 44, 42 ou 40 horas.';
  const data = typeof vigencia === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(vigencia) ? new Date(vigencia + 'T12:00:00Z') : null;
  if (!data || !Number.isFinite(data.getTime()) || data.toISOString().slice(0, 10) !== vigencia) return 'Informe uma vigência válida.';
  if (!escala || typeof escala !== 'object' || Array.isArray(escala)) return 'Informe a escala semanal.';
  if (horas === 42 && vigencia < '2026-12-01') return 'A escala de 42 horas começa em 01/12/2026.';
  const cargas = DIAS_JORNADA.map(d => Number(escala[d]?.cargaMin ?? 0));
  if (cargas.some(n => !Number.isInteger(n) || n < 0 || n > 1440)) return 'Informe cargas válidas em minutos.';
  if (cargas.reduce((a, b) => a + b, 0) !== horas * 60) return `A escala deve totalizar ${horas} horas semanais.`;
  if (horas === 42 && cargas.filter(n => n > 0).length !== 5) return 'A escala de 42 horas deve ter cinco dias de trabalho e duas folgas.';
  return '';
}
