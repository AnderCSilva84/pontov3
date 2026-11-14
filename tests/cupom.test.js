import test from 'node:test';
import assert from 'node:assert/strict';
import dominio from '../functions/cupom-dominio.cjs';
import fixture from './fixtures/cupom-pa.cjs';
import requireFixtureGrande from './fixtures/cupom-precisao-139.cjs';
import { compararCupomComLista } from '../src/utils/cupomComparacao.js';
import { normalizarQrCupom, mensagemLinkCupom } from '../src/utils/cupomQr.js';
const { linkCupom, lerTextoNota, chaveAlias, unidadeFiscal } = dominio;
const agora = Date.parse('2026-10-18T12:00:00-03:00');

test('regressão anonimizada: 139 linhas e 12 unitários de alta precisão mantêm R$1.077,48',()=>{
 const f=requireFixtureGrande(),n=lerTextoNota('',f.texto,Date.parse('2026-11-04T12:00Z'));
 assert.equal(n.itens.length,139);assert.equal(n.totalPagoCentavos,107748);assert.equal(n.totalOriginalCentavos,107748);assert.equal(n.descontoCentavos,0);
 assert.equal(n.itens.filter(i=>i.precoUnitarioOriginalFiscal).length,12);assert.equal(n.itens[3].precoUnitarioOriginalFiscal,'26,6666666667');assert.equal(n.itens[3].totalCentavos,2288);
 assert.equal(n.itens[8].precoUnitarioOriginalFiscal,'24,0017825312');assert.equal(n.itens[8].totalCentavos,2693);
 assert.throws(()=>lerTextoNota('',f.texto.replace('1.077,48','1.077,49'),Date.parse('2026-11-04T12:00Z')),/não conferem/);
});
test('a resposta HTML/JSON do QR usa a mesma precisão fiscal nas 139 linhas',async()=>{
 const {extrairNotaResposta}=await import('../functions/cupom-consulta.cjs'),f=requireFixtureGrande();
 const link='https://app.sefa.pa.gov.br/consulta-nfce/#/qrcode?p='+encodeURIComponent(f.chave+'|2|1|1|'+'A'.repeat(40)),html='<html><body>'+f.texto.replaceAll('\n','<br>')+'</body></html>';
 for(const tipo of ['text/html','application/json']){const n=extrairNotaResposta(link,{tipo,corpo:tipo==='application/json'?JSON.stringify(html):html},Date.parse('2026-11-04T12:00Z'));assert.equal(n.itens.length,139);assert.equal(n.totalPagoCentavos,107748);assert.equal(n.itens[3].precoUnitarioOriginalFiscal,'26,6666666667');}
});
test('peso é multiplicado pelo preço fiscal completo antes de arredondar o total',()=>{
 const f=fixture(),texto=f.texto.replace(/PRODUTO A[\s\S]*?Qtd\. total de itens: 3/,'PRODUTO FICTÍCIO (Código: 1)\nQtde.:1000 UN: KG Vl. Unit.: 1,2345678901\nVl. Total 1.234,57\nQtd. total de itens:1').replace('53,56','1.234,57').replace('3,56','0,00').replace('50,00','1.234,57');
 const n=lerTextoNota('',texto,agora);assert.equal(n.itens[0].precoUnitarioCentavos,123);assert.equal(n.itens[0].precoUnitarioOriginalFiscal,'1,2345678901');assert.equal(n.itens[0].totalCentavos,123457);
});

test('zeros decimais de apresentação preservam exatamente centavos e totais',()=>{
 const f=fixture(),normal=lerTextoNota('',f.texto,agora);
 const texto=f.texto.replace(/(\d+,\d{2})(?!\d)/g,'$10000');
 assert.deepEqual(lerTextoNota('',texto,agora),normal);
 const milhar=f.texto.replaceAll('10,00','1.010,0000').replaceAll('53,56','2.053,5600').replace('50,00','2.050,0000');
 const n=lerTextoNota('',milhar,agora);assert.equal(n.itens[0].precoUnitarioCentavos,101000);assert.equal(n.totalOriginalCentavos,205356);assert.equal(n.totalPagoCentavos,205000);
});
test('unitário fora do formato e total com frações reais são rejeitados com campo e linha',()=>{
 const f=fixture();
 for(const valor of ['10,00000000001','10.00','10,,00'])assert.throws(()=>lerTextoNota('',f.texto.replace('Vl. Unit.: 10,00','Vl. Unit.: '+valor),agora),/preço unitário da linha 1/);
 assert.throws(()=>lerTextoNota('',f.texto.replace('Vl. Total 10,00','Vl. Total 10,0001'),agora),/total da linha 1/);
 assert.throws(()=>lerTextoNota('',f.texto.replace('Valor a pagar R$: 50,00','Valor a pagar R$: 50,001'),agora),/valor a pagar/);
 assert.throws(()=>lerTextoNota('',f.texto.replace('Valor a pagar R$: 50,00','Valor a pagar R$: 50,0100'),agora),/não conferem/);
});

test('regressão anonimizada: 35 linhas com PC, GF, UN, KG, BJ, CT e LA mantêm R$319,06', () => {
  // Somente unidades, quantidades e valores do caso; sem CPF, chave ou emitente real.
  const linhas = [
    ['PC','1','6,8','6,80'],['PC','1','2,74','2,74'],['PC','1','2,74','2,74'],['GF','1','9,96','9,96'],
    ['UN','1','3,59','3,59'],['PC','1','4,95','4,95'],['PC','1','2,59','2,59'],['PC','1','4,95','4,95'],
    ['UN','1','6,52','6,52'],['GF','1','7,25','7,25'],['UN','1','6,45','6,45'],['UN','1','4,38','4,38'],
    ['UN','1','37,68','37,68'],['KG','1,1195','7,95','8,90'],['UN','1','9,2','9,20'],['KG','0,2141','29,1','6,23'],
    ['KG','0,5003','14,89','7,45'],['UN','1','5,98','5,98'],['PC','1','6,75','6,75'],['KG','0,8903','17,95','15,98'],
    ['BJ','1','14,19','14,19'],['UN','1','3,58','3,58'],['UN','1','4,8','4,80'],['CT','1','15,98','15,98'],
    ['PC','1','10,9','10,90'],['KG','0,4501','59,9','26,96'],['UN','1','5,99','5,99'],['UN','1','10,99','10,99'],
    ['PC','1','4,78','4,78'],['UN','1','16,9','16,90'],['PC','1','4,1','4,10'],['UN','1','7,56','7,56'],
    ['UN','1','14,25','14,25'],['UN','1','9,35','9,35'],['LA','1','10,73','10,73'],
  ];
  const f = fixture('000000942');
  const itens = linhas.map(([u,q,p,t],n) => `PRODUTO FICTÍCIO ${n+1} (Código: ${n+1} )\nQtde.:${q}  UN: ${u}  Vl. Unit.: ${p}\tVl. Total\n${t}`).join('\n');
  const texto = `LOJA FICTÍCIA\nCNPJ: 12.345.678/0001-95\nENDEREÇO FICTÍCIO\n${itens}\nQtd. total de itens:35\nValor total R$:322,15\nDescontos R$:3,09\nValor a pagar R$:319,06\nEMITIDA EM CONTINGÊNCIA\nEmissão: 30/10/2026 12:33:34\nChave de acesso: ${f.chave}`;
  const nota = lerTextoNota('', texto, Date.parse('2026-10-31T12:00:00-03:00'));
  assert.equal(nota.itens.length, 35);
  assert.equal(nota.itens.some(i => i.unidadePendente || i.unidadeConferir), false);
  assert.equal(nota.totalOriginalCentavos, 32215);
  assert.equal(nota.descontoCentavos, 309);
  assert.equal(nota.totalPagoCentavos, 31906);
});

test('medida incompatível sinaliza apenas a linha, preservando nota, totais e unidade fiscal', () => {
  const f = fixture();
  for (const unidade of ['G', 'ML', 'M²', 'KG/UN', '1234567', 'A'.repeat(21)]) {
    const nota = lerTextoNota('', f.texto.replace('UN: KG', `UN: ${unidade}`), agora);
    assert.equal(nota.itens.length, 3);
    assert.equal(nota.itens[0].unidadePendente, undefined);
    assert.equal(nota.itens[2].unidadePendente, true);
    assert.equal(nota.itens[2].unidadeCompra, null);
    assert.equal(nota.itens[2].unidadeOriginal, unidade);
    assert.equal(nota.itens[2].quantidade, .6221);
    assert.equal(nota.itens[2].precoUnitarioCentavos, 5395);
    assert.equal(nota.itens[2].totalCentavos, 3356);
    assert.equal(nota.totalPagoCentavos, 5000);
    assert.equal(nota.totalOriginalCentavos, 5356);
  }
});

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
