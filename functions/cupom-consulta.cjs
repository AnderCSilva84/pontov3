const { linkCupom, lerTextoNota } = require('./cupom-dominio.cjs');
const { convert } = require('html-to-text');

class ConsultaCupomIndisponivel extends Error {
  constructor(motivo) {
    super('Não foi possível consultar os produtos na SEFA. Tente novamente ou importe pelo texto da nota.');
    this.name = 'ConsultaCupomIndisponivel';
    this.motivo = motivo;
  }
}

// Endpoint observado na requisição pública da página oficial em 19/10/2026.
// Não aceita URLs de destino fornecidas pelo cliente nem segue redirecionamentos.
async function baixarRespostaCupom(link, { requisitar = fetch, timeoutMs = 15000 } = {}) {
  const identidade = linkCupom(link);
  const p = new URLSearchParams(new URL(identidade.url).hash.split('?')[1]).get('p');
  const url = new URL('https://app.sefa.pa.gov.br/consulta-nfce-api/api/extranet/qrcode');
  url.searchParams.set('p', p);
  const controlador = new AbortController();
  const timer = setTimeout(() => controlador.abort(), timeoutMs);
  let reader;
  try {
    const resposta = await requisitar(url.href, {
      method: 'GET', redirect: 'error', signal: controlador.signal,
      headers: { Accept: 'application/json, text/html;q=0.9' },
    });
    if (!resposta.ok) throw new ConsultaCupomIndisponivel('http');
    const tipo = resposta.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    if (!['application/json', 'text/html'].includes(tipo)) throw new ConsultaCupomIndisponivel('formato');
    const limite = 2 * 1024 * 1024;
    if (Number(resposta.headers.get('content-length')) > limite) throw new ConsultaCupomIndisponivel('tamanho');
    if (!resposta.body) throw new ConsultaCupomIndisponivel('vazio');
    reader = resposta.body.getReader();
    const partes = []; let tamanho = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      tamanho += value.byteLength;
      if (tamanho > limite) throw new ConsultaCupomIndisponivel('tamanho');
      partes.push(Buffer.from(value));
    }
    if (!tamanho) throw new ConsultaCupomIndisponivel('vazio');
    // Não executar HTML/scripts e não registrar resposta, chave ou QR em logs.
    return { identidade, tipo, corpo: Buffer.concat(partes).toString('utf8') };
  } catch (e) {
    if (e instanceof ConsultaCupomIndisponivel) throw e;
    throw new ConsultaCupomIndisponivel(controlador.signal.aborted ? 'tempo' : 'conexao');
  } finally {
    clearTimeout(timer);
    if (reader) { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  }
}

function extrairNotaResposta(link, resposta, agora = Date.now()) {
  let html = resposta.corpo;
  if (resposta.tipo === 'application/json') {
    try { html = JSON.parse(html); } catch { throw new ConsultaCupomIndisponivel('formato'); }
    // Não adivinhar campos de um contrato JSON ainda não observado.
    if (typeof html !== 'string') throw new ConsultaCupomIndisponivel('formato');
  }
  if (typeof html !== 'string' || !/<[a-z][\s\S]*>/i.test(html)) throw new ConsultaCupomIndisponivel('formato');
  const texto = convert(html, {
    wordwrap: false,
    preserveNewlines: true,
    selectors: [
      { selector: 'a', options: { ignoreHref: true } },
      { selector: 'img', format: 'skip' },
      { selector: 'script', format: 'skip' },
      { selector: 'style', format: 'skip' },
      { selector: 'h1', options: { uppercase: false } },
      { selector: 'h2', options: { uppercase: false } },
      { selector: 'h3', options: { uppercase: false } },
    ],
    limits: { maxInputLength: 2 * 1024 * 1024, maxDepth: 60, maxChildNodes: 20000 },
  });
  try { return lerTextoNota(link, texto, agora); }
  catch { throw new ConsultaCupomIndisponivel('conteudo'); }
}

async function consultarNotaCupom(link, opcoes) {
  return extrairNotaResposta(link, await baixarRespostaCupom(link, opcoes));
}

module.exports = { baixarRespostaCupom, extrairNotaResposta, consultarNotaCupom, ConsultaCupomIndisponivel };
