# API de compras AP1303 / No Bolso

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
