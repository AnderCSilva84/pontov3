# Consulta de preços e histórico mensal

Em Compras → Consulta de preço, escolha o produto pela marca, apresentação e unidade e digite o preço encontrado. A consulta usa os registros confirmados dos últimos 365 dias, mostra diferença percentual para a média simples por registro, último/menor/maior preço e último preço em cada supermercado, com datas. Não grava o valor digitado nem anuncia promoção vigente. Produtos sem observações nesse período não oferecem comparação.

O histórico agrupa todas as compras finalizadas ou anuladas em pastas de mês de finalização, no fuso America/Fortaleza. O gasto soma somente `totalCentavos` de compras finalizadas, incluindo o total líquido pago na importação de cupom. Anuladas permanecem visíveis e ficam fora do total. A consulta carrega todo o histórico para não exibir uma soma parcial como mensal.

O gráfico mostra o mês atual e os dois anteriores, incluindo meses sem compras como zero. O mês atual é parcial. A soma usa as listas do módulo de compras, sem criar despesas financeiras ou duplicar lançamentos no No Bolso.

No ponto, os saldos positivos são verdes e os negativos vermelhos, tanto na visão pessoal quanto na administrativa. Valores neutros preservam a cor padrão.

Arquivos: `src/components/ConsultaPreco.jsx`, `GastosCompras.jsx`, `ComprasModulo.jsx`, `src/utils/comprasConsulta.js`, `rotas.js`, estilos de compras/ponto/administração e `tests/compras-consulta.test.js`.

Validação visual com dados fictícios em `output/consulta-precos/`; testes cobrem comparação monetária, exclusão de compras anuladas, fuso, meses sem compras e virada do ano.
