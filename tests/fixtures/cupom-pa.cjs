// Somente dados fictícios. Não usar como cupom real.
function fixture(numero = '000000001') {
  const prefixo = `1526101234567800019565001${numero}1100000000`.slice(0, 43);
  if (prefixo.length !== 43) throw Error('Prefixo de teste inválido');
  let soma = 0;
  for (let i = 42, peso = 2; i >= 0; i--, peso = peso === 9 ? 2 : peso + 1) soma += Number(prefixo[i]) * peso;
  const resto = soma % 11, chave = prefixo + (resto < 2 ? 0 : 11 - resto);
  const link = `https://app.sefa.pa.gov.br/consulta-nfce/#/qrcode?p=${chave}%7C2%7C1%7C1%7C${'A'.repeat(40)}`;
  const texto = `DOCUMENTO AUXILIAR DA NOTA FISCAL DE CONSUMIDOR ELETRÔNICA
MERCADO DE TESTE
CNPJ: 12.345.678/0001-95
RUA DE TESTE, 1, BELEM, PA
PRODUTO A 500ML (Código: 123)
Qtde.:1 UN: FR Vl. Unit.: 10,00
Vl. Total 10,00
PRODUTO A 500ML (Código: 123)
Qtde.:1 UN: FR Vl. Unit.: 10,00
Vl. Total 10,00
PRODUTO B KG (Código: 456)
Qtde.:0,6221 UN: KG Vl. Unit.: 53,95
Vl. Total 33,56
Qtd. total de itens: 3
Valor total R$: 53,56
Descontos R$: 3,56
Valor a pagar R$: 50,00
EMISSÃO NORMAL
Número: 1 Série: 1 Emissão: 16/10/2026 18:45:44 - Via Consumidor
Chave de acesso: ${chave}
Consumidor não identificado`;
  return { link, texto, chave };
}
module.exports = fixture;
