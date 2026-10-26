export const FUSO_PONTO = 'America/Fortaleza';
export function partesPonto(agora = Date.now()) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone:FUSO_PONTO, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23' }).formatToParts(new Date(agora)).map(p=>[p.type,p.value]));
}
export function dataOperacional(agora = Date.now()) {
  const p=partesPonto(agora);return `${p.year}-${p.month}-${p.day}`;
}
// Date usado apenas para cálculos de calendário/rótulos locais da tela de ponto.
export function agoraNoFusoPonto(agora = Date.now()) {
  const p=partesPonto(agora);return new Date(Number(p.year),Number(p.month)-1,Number(p.day),Number(p.hour),Number(p.minute),Number(p.second));
}
