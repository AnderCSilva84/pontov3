const { createHash } = require('node:crypto');
const normalizar = valor => String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
const hash = valor => createHash('sha256').update(valor).digest('hex');
function identidadeChave(chave) {
  if (typeof chave !== 'string' || !/^15\d{42}$/.test(chave)) throw new Error('Copie a nota completa, incluindo a chave de acesso de 44 dígitos de uma NFC-e do Pará.');
  if (chave.slice(20, 22) !== '65') throw new Error('A chave precisa ser de uma NFC-e.');
  let soma = 0;
  for (let i = 42, peso = 2; i >= 0; i--, peso = peso === 9 ? 2 : peso + 1) soma += Number(chave[i]) * peso;
  const resto = soma % 11, dv = resto < 2 ? 0 : 11 - resto;
  if (dv !== Number(chave[43])) throw new Error('Chave de acesso inválida.');
  return { chave, cnpj: chave.slice(6, 20) };
}
function linkCupom(valor) {
  let url;
  try { url = new URL(valor); } catch { throw new Error('Cole o link completo do QR Code da SEFA-PA.'); }
  if (url.protocol !== 'https:' || url.hostname !== 'app.sefa.pa.gov.br' || url.port || url.username || url.password || url.pathname !== '/consulta-nfce/') throw new Error('Use o link oficial HTTPS da consulta NFC-e do Pará.');
  if (!url.hash.startsWith('#/qrcode?')) throw new Error('Use o link original do QR Code, não a página de resumo.');
  const parametros = new URLSearchParams(url.hash.split('?')[1] || '');
  const p = parametros.get('p') || '';
  if (!/^15\d{42}\|2\|1\|\d{1,6}\|[A-Fa-f0-9]{40}$/.test(p)) throw new Error('Link sem os dados completos de um QR Code de produção do Pará (versão 2).');
  const chave = p.split('|')[0];
  return { ...identidadeChave(chave), url: `https://app.sefa.pa.gov.br/consulta-nfce/#/qrcode?p=${encodeURIComponent(p)}` };
}
function decimal(valor) {
  if (!/^\d+(?:\.\d{3})*(?:,\d+)?$/.test(valor)) throw new Error('Número inválido na nota.');
  return Number(valor.replaceAll('.', '').replace(',', '.'));
}
function dinheiro(valor) {
  if (!/^\d+(?:\.\d{3})*(?:,\d{1,2})?$/.test(valor)) throw new Error('Valor monetário inválido na nota.');
  const n = Math.round(decimal(valor) * 100);
  if (!Number.isSafeInteger(n) || n < 0 || n > 100000000) throw new Error('Valor fora do limite.');
  return n;
}
const EMBALAGENS_FISCAIS = new Set([
  'UN', 'UND', 'UNID', 'UNIDS', 'UNIDADE', 'UNIDADES', 'U',
  'PC', 'PCS', 'PÇ', 'PÇS', 'PECA', 'PECAS', 'PCT', 'PCTS', 'PACO', 'PAC', 'PACOTE',
  'CT', 'CART', 'CARTELA', 'FR', 'FRA', 'FRASCO', 'GF', 'GFA', 'GRF', 'GARRAFA',
  'BJ', 'BANDEJ', 'BANDEJA', 'BD', 'BALDE', 'LT', 'LA', 'LATA', 'PT', 'PO', 'POT', 'POTE',
  'VD', 'VID', 'VIDRO', 'SACHE', 'SACHET', 'POUCH',
  'CX', 'CXA', 'CAIXA', 'FD', 'FARDO', 'PAR', 'PARES', 'DZ', 'DUZ', 'DUZIA',
  'MC', 'MACO', 'FO', 'FL', 'FOLHA', 'SC', 'SAC', 'SACO', 'SACOLA',
  'EMB', 'EMBAL', 'EMBALAGEM', 'KIT', 'KT', 'CJ', 'CONJ', 'JG', 'JOGO', 'RL', 'ROLO',
  'TB', 'TUBO', 'BS', 'BISN', 'BL', 'BLOCO', 'BR', 'BARRA', 'GL', 'GALAO',
]);
function normalizarUnidadeFiscal(valor) {
  const u = normalizar(valor).replace(/\./g, '');
  // LT, LA, FR e GF representam embalagens em muitos emissores; nunca supor litros.
  if (['KG', 'KGS', 'KILO', 'KILOS', 'QUILO', 'QUILOS', 'QUILOGRAMA', 'QUILOGRAMAS'].includes(u)) return { unidadeCompra: 'kg' };
  if (['L', 'LITRO', 'LITROS'].includes(u)) return { unidadeCompra: 'l' };
  if (['M', 'MT', 'MTS', 'METRO', 'METROS'].includes(u)) return { unidadeCompra: 'm' };
  if (EMBALAGENS_FISCAIS.has(u)) return { unidadeCompra: 'un' };
  // Medidas menores e áreas não são embalagens: não comparar grama com kg,
  // mililitro com litro ou m² com metro sem conversão explícita.
  if (['G', 'GR', 'GRS', 'GRAMA', 'GRAMAS', 'MG', 'ML', 'CL', 'DL', 'CM', 'MM', 'KM', 'M2', 'M3', 'M²', 'M³', 'CM2', 'CM3', 'CM²', 'CM³', 'TON', 'T'].includes(u)) throw new Error(`Unidade fiscal não suportada sem conversão: ${u}. Não é uma embalagem; mantenha a medida original.`);
  if (!/^[A-Z][A-Z0-9_-]{0,19}$/.test(u)) throw new Error(`Unidade fiscal não suportada: ${u}. Confira o código copiado da nota.`);
  // A NFC-e permite códigos comerciais do emitente. Um código desconhecido
  // abre a revisão, mas só entra no histórico com confirmação explícita.
  return { unidadeCompra: 'un', unidadeConferir: true };
}
function unidadeFiscal(valor) { return normalizarUnidadeFiscal(valor).unidadeCompra; }
function chaveAlias(cnpj, item) { return hash(JSON.stringify([cnpj, item.codigo, normalizar(item.nomeOriginal), normalizar(item.unidadeOriginal)])); }
function lerTextoNota(link, texto, agora = Date.now()) {
  if (typeof texto !== 'string' || texto.length > 150000) throw new Error('Copie o texto completo da nota (até 150 mil caracteres).');
  const t = texto.replace(/\u00a0/g, ' ').replace(/\r/g, '');
  if (t.split('\n').some(linha => linha.length > 2000)) throw new Error('Cole o texto da nota preservando as quebras de linha.');
  if (/CANCELAD[AO]|DENEGAD[AO]|AMBIENTE DE HOMOLOGA[CÇ][AÃ]O/i.test(t)) throw new Error('Nota cancelada, denegada ou de teste não pode ser importada.');
  const chaveNoTexto = t.match(/Chave de acesso:\s*([\d\s]{44,80})/i)?.[1]?.replace(/\D/g, '');
  const semLink = link == null || (typeof link === 'string' && !link.trim());
  const identidade = semLink ? { ...identidadeChave(chaveNoTexto), url: null } : linkCupom(link);
  if (chaveNoTexto !== identidade.chave) throw new Error('A chave do texto não corresponde ao QR Code. Copie a nota completa, incluindo a chave.');
  const cnpj = t.match(/CNPJ:\s*([\d./-]+)/i)?.[1]?.replace(/\D/g, '');
  if (cnpj !== identidade.cnpj) throw new Error('O CNPJ do estabelecimento não corresponde à chave.');
  const emitente = t.slice(0, t.search(/CNPJ:/i)).trim().split('\n').map(s => s.trim()).filter(Boolean).at(-1);
  const endereco = t.match(/CNPJ:[^\n]+\n\s*([^\n]+)/i)?.[1]?.trim();
  if (!emitente || emitente.length > 120 || !endereco || endereco.length > 300) throw new Error('Copie o nome e endereço do estabelecimento junto com a nota.');
  const data = t.match(/Emiss[aã]o:\s*(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/i);
  if (!data) throw new Error('Data de emissão ausente na nota.');
  const [, dia, mes, ano, hora, minuto, segundo] = data;
  if (identidade.chave.slice(2, 6) !== `${ano.slice(2)}${mes}`) throw new Error('O mês de emissão não corresponde à chave.');
  const emitidaEm = `${ano}-${mes}-${dia}T${hora}:${minuto}:${segundo}-03:00`;
  const dt = new Date(emitidaEm);
  if (!Number.isFinite(dt.getTime()) || dt.getTime() > agora + 300000 || new Date(dt.getTime() - 10800000).toISOString().slice(0, 19) !== `${ano}-${mes}-${dia}T${hora}:${minuto}:${segundo}`) throw new Error('Data de emissão inválida.');
  const itens = [];
  const re = /([^\n]+?)\s*\(C[oó]digo:\s*([^\s)]+)\s*\)\s*Qtde\.:\s*([\d.,]+)\s*UN:\s*([^\s]+)\s*Vl\.\s*Unit\.:\s*([\d.,]+)\s*Vl\.\s*Total\s*([\d.,]+)/gi;
  for (const m of t.matchAll(re)) {
    const [, nome, codigo, qtd, un, unitario, total] = m;
    const quantidade = decimal(qtd), precoUnitarioCentavos = dinheiro(unitario), totalCentavos = dinheiro(total);
    if (nome.trim().length > 200 || codigo.length > 80 || quantidade <= 0 || quantidade > 10000 || Math.abs(quantidade * 10000 - Math.round(quantidade * 10000)) > .00001 || precoUnitarioCentavos <= 0 || Math.abs(Math.round(precoUnitarioCentavos * quantidade) - totalCentavos) > 1) throw new Error('Há um item com quantidade, preço ou total incompatível.');
    itens.push({ linha: itens.length + 1, codigo, nomeOriginal: nome.trim(), unidadeOriginal: un, ...normalizarUnidadeFiscal(un), quantidade, precoUnitarioCentavos, totalCentavos });
  }
  const lerTotal = (regex, nome) => { const valor = t.match(regex)?.[1]; if (!valor) throw new Error(`Totais da nota incompletos: não foi encontrado ${nome}. Copie também o resumo de valores abaixo dos produtos.`); return dinheiro(valor); };
  // A cópia do navegador pode separar rótulo, moeda, dois-pontos e valor
  // por tabs ou quebras de linha. Sem cabeçalho bruto, o original é a soma
  // das linhas fiscais; descontos nunca são deduzidos por aproximação.
  const somaItensCentavos = itens.reduce((s, i) => s + i.totalCentavos, 0);
  const rotuloTotal = /Valor\s+total\s+R\s*\$/i;
  const totalOriginalCentavos = rotuloTotal.test(t) ? lerTotal(/Valor\s+total\s+R\s*\$\s*:?\s*([\d.,]+)/i, 'o valor total') : somaItensCentavos;
  const descontoCentavos = /Descontos?\s+R\s*\$/i.test(t) ? lerTotal(/Descontos?\s+R\s*\$\s*:?\s*([\d.,]+)/i, 'o desconto') : 0;
  const totalPagoCentavos = lerTotal(/Valor\s+a\s+pagar\s+R\s*\$\s*:?\s*([\d.,]+)/i, 'o valor a pagar');
  const numeroItens = Number(t.match(/Qtd\.?\s*total\s+de\s+itens\s*:?\s*(\d+)/i)?.[1]);
  if (!itens.length || itens.length !== numeroItens || itens.length > 120) throw new Error('Não foi possível ler todas as linhas. Limite: 120 linhas por cupom.');
  if (somaItensCentavos !== totalOriginalCentavos || totalOriginalCentavos - descontoCentavos !== totalPagoCentavos) throw new Error('Os itens, descontos e total pago não conferem. A nota não foi importada.');
  return { ...identidade, emitente, endereco, emitidaEm, totalOriginalCentavos, descontoCentavos, totalPagoCentavos, itens };
}
module.exports = { linkCupom, lerTextoNota, chaveAlias, normalizar, unidadeFiscal };
