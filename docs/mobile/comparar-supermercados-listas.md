# Comparação entre supermercados e listas — 04/11/2026

Solicitação: selecionar duas filiais, listar produtos comprados em ambas e destacar menor preço em verde e maior em vermelho; permitir comparar listas. Publicação autorizada no pedido.

## Comportamento

Compras → Preços contém modos Supermercados e Listas de compras. Mantém filtro de classificação e período; evolução de um produto permanece disponível em seção recolhida.

- Supermercados: escolhe duas filiais distintas por ID, inclusive filiais com nomes iguais. Resultado automático, somente produtos em comum; último preço válido por produto/apresentação em cada filial, desempate estável por ID de observação. Exibe data de cada compra, preço por unidade, diferença e resumo de contagens. Empates em cinza e texto; cores acompanhadas de “Menor preço” e “Maior preço”.
- Listas: escolhe duas compras finalizadas da mesma classificação encontradas no período. Botão lê ambas por inteiro; não recorta os preços da lista pelo período. Mesmo produto repetido recebe média ponderada pelas quantidades. Quantidades de cada lista exibidas; não compara total de listas com quantidades diferentes como se fosse variação de preço.
- Mesmos produtos: ID canônico após associações/mesclagens confirmadas, mesma unidade, marca normalizada, medidas, quantidade da embalagem e versões extraídas. Apenas nomes parecidos não mesclam. 1 L/1000 ml equivalentes; kg/unidade ou 500 ml/1 L ficam separados. Produtos em apenas um lado não aparecem. Cadastros duplicados devem ser associados no Catálogo existente.
- Busca local por nome/marca/embalagem e lotes de 10 resultados; vazio, poucos dados, erro e nova tentativa tratados. Respostas assíncronas invalidadas ao trocar seleção/modo ou desmontar. Sem consultas por produto.
- Preços originais das compras, sem adivinhar distribuição de desconto global. Datas e caráter histórico explícitos. Precisão fiscal de até dez casas preservada com escala BigInt; médias ponderadas arredondadas uma vez na décima casa. Não altera preços, notas, catálogo ou associações.

## Dados e segurança

comprasRelatorio mantém autenticação, perfil ativo, resolução do grupo e consulta existente de até 5000 observações por período de até um ano. Núcleo extraído para functions/compras-relatorio.cjs; contrato legado de registros/rankings mantido, com preço fiscal original adicional quando presente.

Somente a tela Preços pede incluirListas; lê metadados das listas referenciadas, limitado às 500 mais recentes encontradas, com aviso se exceder. Consulta de preço e Rankings não fazem essa leitura adicional. IDs, títulos e datas exclusivamente do grupo atual. Seleção de duas listas exige IDs válidos, distintos, existentes, status finalizada e mesma classificação; até 200 observações por lista. Não recebe caminho de outro grupo. Somente consultas, inclusive para administradores, funcionários e contas de consulta ativas, conforme acesso anterior.

Sem novo endpoint, infraestrutura, índice, regra, agendamento, listener ou dependência. Trocar filiais/buscar/paginar usa dados já carregados; leitura adicional somente na abertura de Preços e ao pedir comparação completa de listas.

## Validação local

Nove testes direcionados de comparação/catálogo/identidade aprovados. Dois testes de integração no emulador aprovaram relatório novo/legado e regressão de associações; validação final do novo contrato reexecutada após defesa contra filtro nulo. Casos: último preço, desempate, interseção, unidades/marcas/embalagens distintas, equivalência métrica, média ponderada sem duplicar observação, precisão subcentavo, valor fiscal malformado, lista contendo preço de 400 dias atrás carregada integralmente, anulação/tipo/grupo distintos recusados, usuários inativos/sem login recusados e mesmos dados antes/depois. Apenas dados fictícios.

Prévia interativa em navegador a 390px e desktop, sem autenticação real: duas filiais com um produto mais barato em cada e um empate; busca; ausência de rolagem horizontal; troca para listas; falha fictícia e nova tentativa; preços e quantidades lado a lado. Capturas em capturas/comparar-compras/mercados-desktop.png, mercados-mobile.png e listas-mobile.png. Serviço da prévia é simulado; segurança/persistência foram verificadas separadamente no emulador. Sem homologação de aparelho físico.

Lint completo, build PWA e preparação Android reduzida aprovados. Ajuste final de validação de formato fiscal e limpeza de busca compilados no PWA final. Logs output/comparar-compras-*.log. Prévia encerrada. Sem alteração de dados reais, APK, instalação, Play, commit ou push. Publicação seletiva requer comprasRelatorio no Firebase ponto-app-1c55a e frontend Netlify ponto1303; autorizada nesta rodada.

## Publicação concluída

04/11/2026 às 11:09 (UTC−3): comprasRelatorio ACTIVE no Firebase ponto-app-1c55a, revisão comprasrelatorio-00009-puv, atualização 2026-11-04T14:08:34.752136023Z. Netlify ponto1303 deploy 6aeb3ca1542599218c5d78c5 ready, publicado 2026-11-04T14:09:53.580Z em https://ponto.acstech.dev.br. Sete rotas, incluindo /lista-compras/precos, e 12 arquivos públicos conferidos byte a byte com o build final; todos iguais. comprasRelatorio sem login recusado HTTP401. Nenhuma conta ou compra real usada. Sem deploy de outras funções, regras ou índices. Evidências em output/comparar-compras-functions-deploy.log, comparar-compras-servidor-verificado.json, comparar-compras-netlify-deploy.json e comparar-compras-publicado-verificado.json.


Ajuste solicitado após a publicação: comparação começa com dez produtos e botão “Carregar mais 10” acrescenta dez. Trocar modo, seleção ou busca reinicia em dez. Usa os dados já carregados, sem nova consulta por lote. Build aprovado em output/comparar-compras-10-build.log; somente frontend alterado.
Publicado no PWA: Netlify deploy 6aeb3d41ee86b067cd5e7021; sete rotas e 12 arquivos públicos iguais ao build final. Evidência: output/comparar-compras-10-publicado-verificado.json. Sem nova atualização de servidor.


Revisão de correspondências publicada em 04/11/2026: ver [correspondencias-produtos.md](correspondencias-produtos.md). Identidades explicitamente confirmadas completam campos ausentes para comparação, mantendo divergências conhecidas separadas.

Atualização de catálogo após confirmação/desfazer e exportação PDF publicadas: ver [comparacao-pdf-catalogo.md](comparacao-pdf-catalogo.md).
