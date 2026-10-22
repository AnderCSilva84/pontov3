const test = require('node:test');
const assert = require('node:assert/strict');
const fixture = require('./fixtures/cupom-pa.cjs');
const { baixarRespostaCupom, extrairNotaResposta, ConsultaCupomIndisponivel } = require('../functions/cupom-consulta.cjs');

// HTML sintético, não representa contrato real da API ainda pendente.
const htmlFixture = texto => '<html><body>' + texto.split('\n').map(l => `<div>${l.replaceAll('&', '&amp;').replaceAll('<', '&lt;')}</div>`).join('') + '</body></html>';

test('extração preserva repetições, quatro casas, preço original e desconto no total pago', () => {
  const f = fixture();
  for (const resposta of [
    { tipo: 'text/html', corpo: htmlFixture(f.texto) },
    { tipo: 'application/json', corpo: JSON.stringify(htmlFixture(f.texto)) },
  ]) {
    const n = extrairNotaResposta(f.link, resposta, new Date('2026-10-19T12:00:00Z').getTime());
    assert.equal(n.itens.length, 3);
    assert.equal(n.itens[2].quantidade, .6221);
    assert.equal(n.itens[0].precoUnitarioCentavos, 1000);
    assert.equal(n.totalOriginalCentavos, 5356);
    assert.equal(n.descontoCentavos, 356);
    assert.equal(n.totalPagoCentavos, 5000);
  }
});

test('extração rejeita indisponibilidade com HTTP 200, campos JSON desconhecidos e totais inconsistentes', () => {
  const f = fixture();
  for (const resposta of [
    { tipo: 'text/html', corpo: '<html><body>Serviço indisponível</body></html>' },
    { tipo: 'application/json', corpo: '{"html":"não adivinhar contrato"}' },
    { tipo: 'application/json', corpo: 'inválido' },
    { tipo: 'text/html', corpo: htmlFixture(f.texto.replace('53,56', '53,57')) },
  ]) assert.throws(() => extrairNotaResposta(f.link, resposta), ConsultaCupomIndisponivel);
});

test('consulta restringe destino e parâmetros ao endpoint observado da SEFA', async () => {
  const f = fixture(); let chamadas = 0;
  const resultado = await baixarRespostaCupom(f.link, { requisitar: async (endereco, opcoes) => {
    chamadas++;
    const u = new URL(endereco);
    assert.equal(u.origin, 'https://app.sefa.pa.gov.br');
    assert.equal(u.pathname, '/consulta-nfce-api/api/extranet/qrcode');
    assert.equal(u.searchParams.get('p').split('|')[0], f.chave);
    assert.equal(opcoes.redirect, 'error');
    return new Response('{}', { headers: { 'content-type': 'application/json;charset=UTF-8' } });
  } });
  assert.equal(resultado.corpo, '{}');
  assert.equal(chamadas, 1);
  await assert.rejects(baixarRespostaCupom('https://localhost/', { requisitar: () => { chamadas++; } }));
  assert.equal(chamadas, 1);
});

test('consulta limita tamanho recebido mesmo sem content-length e oculta erros externos', async () => {
  const f = fixture();
  for (const resposta of [
    new Response('indisponível', { status: 503 }),
    new Response('arquivo', { headers: { 'content-type': 'application/octet-stream' } }),
    new Response('x'.repeat(2 * 1024 * 1024 + 1), { headers: { 'content-type': 'text/html' } }),
    new Response('', { headers: { 'content-type': 'text/html' } }),
  ]) {
    await assert.rejects(baixarRespostaCupom(f.link, { requisitar: async () => resposta }), ConsultaCupomIndisponivel);
  }
  await assert.rejects(baixarRespostaCupom(f.link, { requisitar: async () => { throw Error('detalhes privados'); } }), e => e.motivo === 'conexao' && !e.message.includes('privados'));
});

test('consulta encerra requisição que ultrapassa o prazo', async () => {
  await assert.rejects(baixarRespostaCupom(fixture().link, {
    timeoutMs: 10,
    requisitar: (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(Error('abortado')), { once: true })),
  }), e => e.motivo === 'tempo');
});
