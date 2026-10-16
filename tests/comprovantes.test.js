import test from 'node:test';
import assert from 'node:assert/strict';
import { agruparComprovantes, nomeMesComprovante, urlComprovante, destinosCompartilhamento, compartilharPdfNativo } from '../src/utils/comprovantes.js';

test('organiza recibos pelo pagamento e documentos pelo mês informado, em ordem decrescente', () => {
  const recibos = [{ id: 'same-id', dataPagamento: '2026-10-13', competenciaMes: '2026-09' }, { id: 'older', dataPagamento: '2026-09-02' }];
  const documentos = [{ id: 'same-id', mesReferencia: '2026-10', titulo: 'Contrato' }];
  const grupos = agruparComprovantes(recibos, documentos);
  assert.deepEqual(grupos.map((g) => g.mes), ['2026-10', '2026-09']);
  assert.equal(grupos[0].itens.length, 2);
  assert.notEqual(grupos[0].itens[0].chave, grupos[0].itens[1].chave);
  assert.equal(recibos[0].competenciaMes, '2026-09');
  assert.equal(nomeMesComprovante('2026-10'), 'Outubro de 2026');
});

test('preserva comprovantes antigos sem mês e trata cadastro no fuso local', () => {
  const grupos = agruparComprovantes([{ id: 'fallback', competenciaMes: '2026-08' }], [
    { id: 'old', criadoEm: { toDate: () => new Date('2026-10-01T01:00:00Z') } },
    { id: 'unknown' }, { id: 'invalid', mesReferencia: '2026-13', criadoEm: 'not-a-date' },
  ]);
  assert.deepEqual(grupos.map((g) => g.mes), ['2026-09', '2026-08', 'sem-mes']);
  assert.equal(grupos.at(-1).itens.length, 2);
  assert.equal(nomeMesComprovante('sem-mes'), 'Sem mês informado');
});

test('compartilhamento rejeita links executáveis, blob local e credenciais na URL', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,test', 'blob:https://app.example/id', 'https://user:pass@example.com/doc', 'invalid']) {
    assert.equal(urlComprovante(url), null);
    assert.throws(() => destinosCompartilhamento('Comprovante', url));
  }
});

test('WhatsApp e email recebem título e link completos sem injetar parâmetros', () => {
  const titulo = 'Comprovante & salário\nOutubro';
  const url = 'https://example.com/documento?token=a&file=b';
  const destinos = destinosCompartilhamento(titulo, url);
  const whatsapp = new URL(destinos.whatsapp);
  assert.equal(whatsapp.searchParams.get('text'), `${titulo}\n${url}`);
  assert.equal([...whatsapp.searchParams].length, 1);
  const email = new URL(destinos.email);
  assert.equal(email.searchParams.get('subject'), titulo);
  assert.equal(email.searchParams.get('body'), `${titulo}\n\n${url}`);
  assert.equal(email.searchParams.get('bcc'), null);
});

test('compartilha o PDF como anexo, sem enviar uma URL temporária, e detecta falta de suporte', async () => {
  const arquivo = { name: 'Recibo.pdf', type: 'application/pdf' };
  let payload;
  const navegador = { canShare: ({ files }) => files[0] === arquivo, share: async (value) => { payload = value; } };
  assert.equal(await compartilharPdfNativo(arquivo, navegador), true);
  assert.equal(payload.files[0], arquivo);
  assert.equal(payload.url, undefined);
  assert.equal(await compartilharPdfNativo(arquivo, { ...navegador, canShare: () => false }), false);
  assert.equal(await compartilharPdfNativo(arquivo, {}), false);
  const cancelamento = Object.assign(new Error('Cancelado'), { name: 'AbortError' });
  await assert.rejects(compartilharPdfNativo(arquivo, { ...navegador, share: async () => { throw cancelamento; } }), { name: 'AbortError' });
});
