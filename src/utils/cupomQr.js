// URLs antigas são somente identificadores: nunca abrimos ou consultamos o HTTP legado.
// A navegação e a importação usam sempre o endereço HTTPS atual da SEFA-PA.
export function normalizarQrCupom(valor) {
  try {
    const u = new URL(valor), oficiais = ['app.sefa.pa.gov.br', 'www.sefa.pa.gov.br', 'sefa.pa.gov.br', 'appnfc.sefa.pa.gov.br'];
    if (!['https:', 'http:'].includes(u.protocol) || !oficiais.includes(u.hostname) || u.port || u.username || u.password) return null;
    const p = u.searchParams.get('p') || new URLSearchParams(u.hash.split('?')[1] || '').get('p');
    if (!/^15\d{42}\|2\|1\|\d{1,6}\|[a-fA-F0-9]{40}$/.test(p || '')) return null;
    return `https://app.sefa.pa.gov.br/consulta-nfce/#/qrcode?p=${encodeURIComponent(p)}`;
  } catch { return null; }
}

export function mensagemLinkCupom(valor) {
  if (!valor?.trim() || normalizarQrCupom(valor.trim())) return '';
  try {
    const u = new URL(valor.trim());
    if (u.hash.startsWith('#/resumo')) return 'Esse endereço é apenas o resumo e não identifica a nota. Copie o link original do QR Code, que contém p=.';
    const p = u.searchParams.get('p') || new URLSearchParams(u.hash.split('?')[1] || '').get('p');
    if (p && p.split('|')[1] !== '2') return 'Esta versão do QR Code ainda não é suportada. O importador atual aceita NFC-e do Pará, versão 2. Envie o link para verificarmos o formato.';
  } catch { /* Orientação geral abaixo. */ }
  return 'Cole o link completo original de uma NFC-e do Pará, incluindo todos os dados após p=.';
}
