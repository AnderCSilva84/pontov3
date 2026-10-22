# API de compras AP1303 / No Bolso

## Cupons fiscais (18/10/2026)

Em listas com `origem: "cupom"`, `totalCentavos` é o líquido pago da nota, preservado mesmo com descarte de produtos. Novos campos opcionais: `totalOriginalCentavos`, `descontoCentavos`, `quantidadeItensCupom`, `quantidadeDescartados` e `itensCompletos`. Itens e observações de preço usam o valor original exibido no documento, sem ratear o desconto geral. Somar itens não recompõe necessariamente o líquido; o resumo pessoal do No Bolso continua somando o campo `totalCentavos` da lista. Data de fechamento de cupom é sua emissão, e não a importação. Não foram criados lançamentos financeiros. Fluxo, limites e pendência da consulta automática em [CUPONS_FISCAIS.md](CUPONS_FISCAIS.md).

Base: `https://us-central1-ponto-app-1c55a.cloudfunctions.net/comprasApi`.
API somente leitura. O backend do No Bolso envia um Google ID token com audiência igual à base e identidade `no-bolso-runtime@organizanderson.iam.gserviceaccount.com`. Tokens são obtidos pela identidade do runtime, sem chave permanente e sem credenciais no navegador.

## Consultas GET

- `/v1/listas?limite=20&cursor=...`: páginas de listas compartilhadas, limite máximo 50, `nextCursor` opaco.
- `/v1/listas/{id}`: resumo e itens da lista.
- `/v1/rankings?dias=90`: rankings de frequência, variação e maiores preços.
- `/v1/produtos/{id}/comparacao?dias=90`: último preço por supermercado, unidade e apresentação.
- `/v1/listas/{id}/melhor-preco?dias=90`: ofertas por item e totais estimados por supermercado.

Período entre 1 e 366 dias, máximo de 5.000 observações; excesso retorna 422 e exige período menor. Valores em centavos BRL, datas ISO. Preços vêm de compras finalizadas válidas, com data; não representam uma garantia do preço atual. Produtos só são comparados com a mesma identidade, apresentação e unidade. Total parcial nunca concorre como cesta completa. Ausência de preço retorna null, não zero.

Erros: 400 parâmetros, 401 identidade ausente/inválida, 403 servidor não autorizado, 404 recurso, 405 escrita, 409 lista anulada, 422 limite. Respostas são privadas e não armazenáveis em cache. Não expõe identidades de funcionários nem dados de ponto.

## Autorização no No Bolso

`getAP1303Purchases` valida Firebase Auth e perfil ativo a cada chamada; aceita `consulta` status/listas/lista/rankings/produto/melhor-preco e parâmetros validados. Por solicitação expressa do usuário em 16/10/2026, todos os usuários ativos do No Bolso têm leitura automática, inclusive contas futuras. Não exige concessão em `ap1303Access`; registros antigos dessa coleção são preservados, mas não controlam mais o acesso. Contas bloqueadas, sem perfil ou sem login continuam recusadas.

`manageAP1303Access` permanece somente por compatibilidade com clientes antigos e retorna uma mensagem de atualização, sem alterar concessões. O painel de autorizações individuais foi removido. A leitura cobre todas as listas compartilhadas e seus preços; não permite comprar ou modificar o AP1303, nem cria lançamentos financeiros.

Interface: No Bolso → Economize → Supermercados, com análise AP1303 integrada, além da rota de consulta dedicada. Dados ficam apenas em memória na tela, fora do cache financeiro persistente.

## Validação

AP1303: `npm test`, `npm run test:compras:integracao`.
No Bolso: teste da página AP1303, testes `functions/ap1303.test.js` e emulador `firebase.ap1303-test.json` com projeto fictício `demo-organizanderson`. Testes cobrem bloqueio de autoautorização, concessão/revogação, perfil bloqueado, manutenção, paginação, proteção de dados pessoais e comparação de cobertura.

## Publicação

No Bolso usa a conta de build existente `no-bolso-build@organizanderson.iam.gserviceaccount.com` e a conta runtime acima. A conta Compute padrão não possui acesso de build suficiente. Deploy seletivo precisa preservar essa separação. A análise completa do Firebase também exige um segredo de outra função (`OPENAI_API_KEY`); não criar um segredo fictício para contornar essa dependência. Para publicação isolada, uma entrada que inicializa Firebase Admin e exporta somente as duas funções novas evita carregar funções não relacionadas.

Em 16/10/2026, após autorização explícita do usuário, a invocação HTTP das duas callables foi liberada e a Netlify desbloqueada para publicação do frontend. Login Firebase e autorização individual continuam obrigatórios; ambas retornaram 401 UNAUTHENTICATED no smoke sem login. Deploy No Bolso: `6ad2122f8d03f05ddb7548a7`, tela https://nobolso.acstech.dev.br/economize/ap1303 .

Conexão real validada em 16/10/2026 pelo navegador autenticado do No Bolso: acesso da conta Aline P Silva inicialmente bloqueado; após autorização explícita do usuário, concessão individual transacional em `ap1303Access`, com verificação de conta ativa/manutenção e auditoria. A consulta retornou duas listas, incluindo uma em preparação com 13 itens; detalhes, comparação da lista e rankings responderam sem erro. Nenhum preço comparável ou compra finalizada com total conhecido no período atual. Ausência permaneceu explícita, sem promoções inventadas nem importação de despesas. Nenhuma ampliação adicional de IAM ou impersonação foi necessária.

A tela atual Economize → Compras AP1303 → Análise do supermercado foi publicada pelo No Bolso no deploy `6ad2237b52efcbb2ca8196bb`, incluindo o commit de layout `17b97a9`. Totais mensais refletem apenas listas carregadas; mais páginas e dados ausentes são sinalizados.

Atualização de acesso geral em 16/10/2026: funções de consulta/compatibilidade atualizadas e frontend `6ad2791b681d6fb959f5c11b` publicado. Testes confirmaram leitura sem concessão individual, concessão antiga desabilitada sem efeito e bloqueio imediato de perfil inativo/ausente. Fluxo real de consulta funcionou após atualização. Nenhuma escrita financeira, mudança de IAM ou exclusão de concessões antigas.

Marca de compra: observações e ofertas passam a informar `marca` opcional, preservando contratos anteriores. Variações comparam mesma marca, apresentação, unidade e loja; nome do ranking e apresentação da oferta identificam a marca para clientes existentes. Listas excluídas deixam de aparecer; detalhe retorna 404 e preços removidos não entram nos rankings. Paginação pode retornar página vazia com `nextCursor` quando o trecho contém apenas marcadores de exclusão; o consumidor pode seguir o cursor.

## Ponte de vinculação pessoal

A página `/integracoes/no-bolso` usa a callable existente **`comprasOperacao`** (não `operarCompras`) com `noBolsoGerarCodigo` ou `noBolsoRevogar`. Exige conta ativa e autenticação vigente. O código é aleatório, de uso único, expira em dez minutos e somente seu hash é salvo. Coleções noBolsoGrants/noBolsoLinks/noBolsoOwners permanecem privadas nas regras existentes.

Depois da verificação OIDC da identidade runtime existente, comprasApi aceita GET `/v1/no-bolso/status?noBolsoUid=...`, GET `/v1/no-bolso/resumo?noBolsoUid=...&mes=AAAA-MM` e POST exclusivamente em `/v1/no-bolso/vincular` (noBolsoUid/codigo) e `/v1/no-bolso/desvincular` (noBolsoUid). O gateway No Bolso deve atribuir noBolsoUid pela sessão autenticada, sem aceitar a identidade do navegador. As demais rotas continuam somente leitura.

Resumo pessoal: três meses em America/Fortaleza, somente listas finalizadas por `finalizadaPor` da conta AP1303 vinculada. Nunca associa por e-mail/nome ou criador da lista. Não devolve listas brutas nem importa despesas. Limite de 300 compras; acima disso retorna 422, sem truncamento silencioso. Índice: comprasListas(finalizadaPor ASC, status ASC, finalizadaEm ASC). Novos módulos: functions/no-bolso-bridge.cjs e functions/no-bolso-functions.cjs.

Ativação do No Bolso permanece uma etapa posterior: ENABLE_AP1303_PERSONAL não foi habilitada nesta publicação AP1303. Não houve vínculo real ou geração de código em produção na validação; consentimento e associação entre contas serão exercitados quando o gateway estiver preparado.

Pré-requisitos AP1303 concluídos em 16/10/2026: `comprasOperacao` e `comprasApi` publicadas seletivamente; página no deploy Netlify `6ad2c4d3cca93dc2cbbfcbf2`; índice `CICAgJjmiJEK` confirmado **READY**. Índices anteriores preservados. Testes: 41 unitários aprovados (2 integrações ignoradas nessa execução), 16 testes de integração no emulador aprovados, lint/build aprovados. Página autenticada conferida sem gerar código; endpoints de ponte/código recusaram chamadas sem autenticação com 401. A flag de ativação do No Bolso permanece ausente/desligada.
