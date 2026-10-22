import test from 'node:test';
import assert from 'node:assert/strict';
import dominio from '../functions/cupom-dominio.cjs';
import fixture from './fixtures/cupom-pa.cjs';
import { compararCupomComLista } from '../src/utils/cupomComparacao.js';
import { normalizarQrCupom, mensagemLinkCupom } from '../src/utils/cupomQr.js';
const { linkCupom, lerTextoNota, chaveAlias, unidadeFiscal } = dominio;
const agora = Date.parse('2026-10-18T12:00:00-03:00');

test('texto completo dispensa link, preservando identidade, valores e rejeição de divergências', () => {
  const f = fixture(), comLink = lerTextoNota(f.link, f.texto, agora);
  for (const link of [undefined, null, '', '   ']) {
    const nota = lerTextoNota(link, f.texto, agora);
    assert.deepEqual(nota, { ...comLink, url: null });
  }
  assert.throws(() => lerTextoNota('', f.texto.replace(f.chave, ''), agora), /chave de acesso/);
  assert.throws(() => lerTextoNota('', f.texto.replace(f.chave, f.chave.slice(0, 43) + (Number(f.chave[43]) + 1) % 10), agora), /inválida/);
  assert.throws(() => lerTextoNota('', f.texto.replace('12.345.678/0001-95', '00.000.000/0001-00'), agora), /CNPJ/);
  assert.throws(() => lerTextoNota('', f.texto.replace('50,00', '50,01'), agora), /não conferem/);
  assert.throws(() => lerTextoNota('https://localhost/', f.texto, agora), /oficial/);
});

test('link informa resumo sem identificação e versão não suportada em vez de bloquear silenciosamente', () => {
  assert.match(mensagemLinkCupom('https://app.sefa.pa.gov.br/consulta-nfce/#/resumo'), /não identifica a nota/);
  assert.match(mensagemLinkCupom(fixture().link.replace('%7C2%7C', '%7C3%7C')), /versão.*não é suportada/);
  assert.equal(mensagemLinkCupom(fixture().link), '');
  assert.equal(mensagemLinkCupom(''), '');
  assert.match(mensagemLinkCupom('qualquer texto'), /link completo/);
});
test('cupom separa preço original, desconto e total pago sem perder linhas repetidas ou precisão', () => {
  const f = fixture(), nota = lerTextoNota(f.link, f.texto, agora);
  assert.equal(nota.itens.length, 3);
  assert.equal(nota.itens[2].quantidade, .6221);
  assert.equal(nota.itens[2].totalCentavos, 3356);
  assert.equal(nota.totalOriginalCentavos, 5356);
  assert.equal(nota.descontoCentavos, 356);
  assert.equal(nota.totalPagoCentavos, 5000);
  assert.equal(nota.itens[0].precoUnitarioCentavos, 1000);
  assert.equal(chaveAlias(nota.cnpj, nota.itens[0]), chaveAlias(nota.cnpj, nota.itens[1]));
  assert.notEqual(chaveAlias('outro', nota.itens[0]), chaveAlias(nota.cnpj, nota.itens[0]));
  assert.notEqual(chaveAlias(nota.cnpj, { ...nota.itens[0], nomeOriginal: 'PRODUTO A 1L' }), chaveAlias(nota.cnpj, nota.itens[0]));
});
test('cupom rejeita URLs arbitrárias, nota divergente, conteúdo incompleto e totais inconsistentes', () => {
  const f = fixture();
  for (const link of ['http://localhost/', f.link.replace('app.sefa.pa.gov.br', 'app.sefa.pa.gov.br.example.com'), f.link.replace('https:', 'http:'), f.link.replace('#/qrcode', '#/resumo')]) assert.throws(() => linkCupom(link));
  for (const texto of [f.texto.replace(f.chave, fixture('000000002').chave), f.texto.replace('12.345.678/0001-95', '00.000.000/0001-00'), f.texto.replace('53,56', '53,57'), f.texto.replace('3,56', '3,55'), f.texto.replace('total de itens: 3', 'total de itens: 2'), f.texto + '\nCANCELADA']) assert.throws(() => lerTextoNota(f.link, texto, agora));
});
test('unidade fiscal LT é embalagem, sem converter lata em litro', () => {
  assert.equal(unidadeFiscal('LT'), 'un'); assert.equal(unidadeFiscal('L'), 'l'); assert.equal(unidadeFiscal('KG'), 'kg');
  assert.throws(() => unidadeFiscal('ML'));
});

test('maço e garrafa fiscais preservam quantidade, preço e unidade original por embalagem', () => {
  const f = fixture();
  for (const un of ['MC', 'MÇ', 'MAÇO', 'mc', 'GF', 'gf', 'FO', 'fo', 'FO.', 'SC', 'RL', 'BD', 'PCTS', 'FRASCO', 'BARRA', 'PO', 'POT', 'VD', 'VIDRO', 'SACHE', 'SACHET', 'POUCH']) {
    const nota = lerTextoNota('', f.texto.replaceAll('UN: FR', `UN: ${un}`), agora);
    assert.equal(nota.itens[0].unidadeCompra, 'un');
    assert.equal(nota.itens[0].unidadeOriginal, un);
    assert.equal(nota.itens[0].quantidade, 1);
    assert.equal(nota.itens[0].precoUnitarioCentavos, 1000);
    assert.equal(nota.totalPagoCentavos, 5000);
  }
  assert.equal(unidadeFiscal('EMBALAGEM'), 'un');
});

test('abreviações fiscais normalizam pontuação e plural, sem confundir embalagens e medidas', () => {
  for (const un of [' kg. ', 'KGS', 'QUILOS']) assert.equal(unidadeFiscal(un), 'kg');
  for (const un of ['L.', 'LITROS']) assert.equal(unidadeFiscal(un), 'l');
  for (const un of ['MT.', 'MTS']) assert.equal(unidadeFiscal(un), 'm');
  for (const un of ['CX.', 'FD', 'GL', 'LT', 'KIT']) assert.equal(unidadeFiscal(un), 'un');
  for (const un of ['G', 'ML', 'CM', 'MM', 'M2', 'M³']) assert.throws(() => unidadeFiscal(un), /sem conversão/);
  for (const un of ['', '<svg>', 'KG/UN', '1234567', 'A'.repeat(21)]) assert.throws(() => unidadeFiscal(un), /não suportada/);
});

test('código comercial novo abre a nota para revisão mantendo valores e sinalizando confirmação', () => {
  const f = fixture();
  const nota = lerTextoNota('', f.texto.replaceAll('UN: FR', 'UN: XZ'), agora);
  assert.equal(nota.itens[0].unidadeOriginal, 'XZ');
  assert.equal(nota.itens[0].unidadeCompra, 'un');
  assert.equal(nota.itens[0].unidadeConferir, true);
  assert.equal(nota.itens[0].quantidade, 1);
  assert.equal(nota.itens[0].precoUnitarioCentavos, 1000);
  assert.equal(nota.totalPagoCentavos, 5000);
  assert.equal(nota.itens[2].unidadeConferir, undefined);
  for (const codigo of ['ENVASE_01', 'EMBAL-ESP', 'DESCONHECIDA']) {
    const outra = lerTextoNota('', f.texto.replaceAll('UN: FR', `UN: ${codigo}`), agora);
    assert.equal(outra.itens[0].unidadeOriginal, codigo);
    assert.equal(outra.itens[0].unidadeConferir, true);
    assert.equal(outra.totalPagoCentavos, 5000);
  }
});

test('totais aceitam quebras, tabs e pontuação da cópia sem alterar valores nem inferir ausências', () => {
  const f = fixture();
  const texto = f.texto.replace('Valor total R$:', 'Valor\ntotal\tR $ :').replace('Descontos R$:', 'Desconto\nR$ :').replace('Valor a pagar R$:', 'Valor\ta pagar\nR$\n:').replace('Qtd. total de itens:', 'Qtd. total de itens :');
  const nota = lerTextoNota(f.link, texto, agora);
  assert.equal(nota.totalOriginalCentavos, 5356);
  assert.equal(nota.descontoCentavos, 356);
  assert.equal(nota.totalPagoCentavos, 5000);
  assert.throws(() => lerTextoNota(f.link, f.texto.replace('Valor a pagar R$: 50,00', ''), agora), /não foi encontrado o valor a pagar/);
  assert.throws(() => lerTextoNota(f.link, texto.replace('50,00', '50,01'), agora), /não conferem/);
});

test('nota de um item sem cabeçalho valor total usa soma fiscal e confere o valor a pagar', () => {
  const f = fixture();
  const texto = f.texto.replace(/PRODUTO A[\s\S]*?Qtd\. total de itens: 3/, 'PRODUTO TESTE (Código: 123)\nQtde.:1 UN: UN Vl. Unit.: 26,90\nVl. Total 26,90\nQtd. total de itens:1')
    .replace('Valor total R$: 53,56\n', '').replace('Descontos R$: 3,56\n', '').replace('Valor a pagar R$: 50,00', 'Valor a pagar R$:26,90');
  const nota = lerTextoNota(f.link, texto, agora);
  assert.equal(nota.itens.length, 1);
  assert.equal(nota.totalOriginalCentavos, 2690);
  assert.equal(nota.descontoCentavos, 0);
  assert.equal(nota.totalPagoCentavos, 2690);
  assert.throws(() => lerTextoNota(f.link, texto.replace('Valor a pagar R$:26,90', 'Valor a pagar R$:25,90'), agora), /não conferem/);
  assert.throws(() => lerTextoNota(f.link, texto.replace('Qtd. total de itens:1', 'Qtd. total de itens:2'), agora), /todas as linhas/);
  assert.throws(() => lerTextoNota(f.link, texto.replace('Valor a pagar R$:26,90', 'Valor total R$:\nValor a pagar R$:26,90'), agora), /não foi encontrado o valor total/);
});
test('leitor aceita QR oficial antigo e converte para HTTPS atual antes de abrir ou importar', () => {
  const f = fixture(), p = new URLSearchParams(new URL(f.link).hash.split('?')[1]).get('p');
  const canonico = normalizarQrCupom(f.link);
  for (const host of ['www.sefa.pa.gov.br', 'sefa.pa.gov.br', 'appnfc.sefa.pa.gov.br']) assert.equal(normalizarQrCupom(`http://${host}/nfce/qrcode?p=${encodeURIComponent(p)}`), canonico);
  assert.equal(linkCupom(canonico).chave, f.chave);
  for (const url of [f.link.replace('app.sefa.pa.gov.br', 'app.sefa.pa.gov.br.example.com'), f.link.replace('app.sefa.pa.gov.br', 'user:pass@app.sefa.pa.gov.br'), f.link.replace('app.sefa.pa.gov.br', 'app.sefa.pa.gov.br:3000'), 'javascript:alert(1)', 'https://app.sefa.pa.gov.br/consulta-nfce/#/resumo']) assert.equal(normalizarQrCupom(url), null);
});
test('comparação soma linhas repetidas, mostra quantidades diferentes, faltantes e extras, ignorando descartes', () => {
  const planejados = [{ id: 'a', quantidadePlanejada: 2 }, { id: 'b', quantidadePlanejada: .7 }, { id: 'c', quantidadePlanejada: 1 }, { id: 'd', quantidadePlanejada: 1 }];
  const linhas = [{ itemPlanejadoId: 'a', quantidade: 1 }, { itemPlanejadoId: 'a', quantidade: 1 }, { itemPlanejadoId: 'b', quantidade: .6221 }, { itemPlanejadoId: 'c', quantidade: 2 }, { itemPlanejadoId: 'd', quantidade: 1, descartar: true }, { quantidade: 3 }];
  const c = compararCupomComLista(planejados, linhas);
  assert.equal(c.encontrados, 3); assert.equal(c.foraDaNota, 1); assert.equal(c.extras.length, 1);
  assert.deepEqual(c.itens.map(i => i.situacao), ['conferido', 'quantidade_menor', 'quantidade_maior', 'fora_da_nota']);
  assert.equal(c.itens[0].quantidadeNota, 2); assert.equal(c.itens[1].quantidadeNota, .6221);
});
