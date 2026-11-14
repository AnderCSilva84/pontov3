# Categorias de compras por grupo — rodada local de 28-10-26

## Modelo e comportamento

Configuração em `grupos/{grupoId}/comprasConfiguracao/tipos`: `habilitadas` (IDs conhecidos), `versao`, `alteradaPor`, `alteradaEm`. Contas legadas não migradas usam o mesmo caminho relativo na raiz, pelo contexto já existente do backend. O cliente não escolhe o grupo da operação. IDs: `supermercado`, `farmacia`, `material_construcao`, `oficina`, `pet`.

Documento ausente significa Supermercado e Farmácia habilitados, tanto em grupos existentes quanto recém-criados. Não há migração, escrita no provisionamento ou reclassificação em massa. Listas sem `tipoCompra` continuam com a interpretação legada já existente de supermercado; valores desconhecidos não são convertidos em outra categoria.

Não confundir com `categoriasCompras`, que organiza produtos (limpeza, alimentos etc.). A nova seção de Gestão configura classificações de listas/compra, sem modificar o catálogo.

`comprasOperacao` oferece `consultarCategoriasCompras` e `salvarCategoriasCompras`. Usuários ativos consultam; apenas administradores salvam. Transação valida a lista fechada de IDs, pelo menos uma categoria e a versão. Salvamento repetido com conteúdo igual não escreve; versão antiga é recusada. Autoria e instante vêm do servidor. Não existe escrita direta autorizada para essa coleção nas regras atuais; o acesso é somente pelo callable.

Criação manual e preparação de nova importação validam categorias habilitadas. Confirmação de importação que cria uma lista também revalida. Preparar/confirmar nota para lista já existente e concluir compras já criadas não exige categoria habilitada. Reclassificar lista aberta exige administrador, versão e destino habilitado; preserva auditoria existente. Lista finalizada não pode ser reclassificada. Reenvio idempotente de criação anterior continua retornando a mesma lista, mesmo se sua categoria foi desabilitada depois.

Os seletores de novas compras mostram somente habilitadas. O seletor de uma lista aberta mantém também sua classificação atual, permitindo concluir sem reclassificar. Histórico, relatórios e filtros mostram todas as cinco classificações. Totais, séries mensais, estimativas e PDFs mantêm separação de categorias e o total geral concilia com subtotais realizados. Estimativas/pendências não viram despesa. Consultas de preços continuam com o filtro de categoria no servidor, no período e limite existentes.

## Atualização e custos

Não havia uma configuração de compras carregada no cliente a reutilizar. Foi acrescentada uma consulta ao callable ao montar Compras e ao expandir a seção de configuração na Gestão. Consultas simultâneas do mesmo usuário/grupo são deduplicadas. Um evento local propaga o resultado entre componentes montados. Não há polling, listener Firestore novo, consulta por categoria, upload ou serviço adicional.

Em outro aparelho/membro, a configuração é obtida ao reabrir a tela ou usar **Atualizar categorias disponíveis**. Não há propagação remota instantânea. Mesmo com tela desatualizada, a criação é revalidada no servidor, inclusive para clientes antigos. Erro conserva a lista/dados do formulário e orienta atualizar. Não se escreve quando o formulário não mudou.

Estimativas pelo código, não medição de faturamento, para grupo já migrado, sem retries de transação:

| Fluxo | Chamadas | Leituras de documentos | Escritas |
| --- | --- | --- | --- |
| Consultar configuração ao abrir/atualizar | 1 | 5: vínculo, grupo, perfil do contexto, perfil transacional, configuração (inclusive ausente) | 0 |
| Salvar alteração | 1 | 5 | 1, somente configuração |
| Pedido de salvar conteúdo igual | 1 (UI evita) | 5 | 0 |
| Criar lista nova | mesma chamada existente | +1 da configuração | mesmas escritas da lista |
| Reenviar criação já confirmada | mesma chamada existente | +0 | +0 |
| Reclassificar para outro tipo | mesma chamada existente | +1 | mesmas escritas auditadas |
| Preparar/confirmar importação criando lista | mesmas chamadas existentes | +1 por etapa | mesmas escritas da importação |
| Importar em lista existente/concluir compra existente | mesmas chamadas existentes | +0 | mesmas escritas anteriores |
| Tela sem interação após carregada | 0 adicionais | 0 adicionais por esta funcionalidade | 0 |

Legado sem vínculo usa as verificações anteriores de legado (4 leituras totais na consulta/configuração). As leituras repetidas do perfil pelo resolvedor de contexto e pela transação continuam por segurança e foram contabilizadas. Retries de transação podem aumentar leituras. Configuração local não substitui autorização. Sem índices novos, listeners por categoria ou varredura do histórico. Desabilitar não escreve nas listas, preços ou notas existentes.

## Compatibilidade e implantação futura

No Bolso continua filtrado exclusivamente por `ehSupermercado`. Não foi alterado o repositório consumidor. Os demais tipos são excluídos de listas, detalhe e preços/rankings compartilhados. Não há novo contrato de integração.

PWA mantém cuidados. Bundle `mobile-release` continua excluindo os módulos de saúde. Clientes Android antigos continuam podendo criar tipos conhecidos habilitados e concluir listas, sem precisar enviar novos campos. Contudo, seu código de apresentação só conhece dois nomes e não pode renderizar corretamente as três novas classificações por um ajuste remoto do backend. É necessário atualizar o APK para exibir novas categorias corretamente; não habilitar as novas categorias esperando essa capacidade na versão antiga do teste fechado.

Para disponibilizar futuramente: atualizar seletivamente `comprasOperacao` e `comprasRelatorio` antes do frontend. Não é necessário alterar regras, índices ou criar dados reais. A consulta de configuração requer backend atualizado; falhas bloqueiam somente novas criações até atualizar, sem esconder históricos. Nada foi publicado ou instalado nesta rodada.

## Validação

Testes unitários cobrem padrões, cinco subtotais, séries mensais, PDF com cinco categorias, filtros de preços e parsing de nota. Emuladores cobrem configuração por grupo e membro, somente administrador, configuração vazia/inválida, versão, repetição, criação e fechamento dos cinco tipos, conclusão desabilitada, importação em lista Pet desabilitada, cliente antigo sem campo de tipo, grupos distintos e No Bolso (lista/detalhe/rankings). Regressões existentes de importação, compra sem preço e mesclagem foram executadas com fixtures.

Conferência física no Android e avaliação visual dos novos controles permanecem pendentes. Não foram usados registros reais. Resultados finais e builds são informados na entrega da rodada.

Resultado final: lint sem erros/avisos; 22 testes unitários aprovados; regressões emuladas de farmácia, importação/compra sem preço e mesclagem aprovadas; novo teste emulado de configuração/importação/concorrência aprovado. As falhas iniciais foram da chamada de teste com arquivo inexistente e do token fictício curto rejeitado corretamente pela API; os testes foram corrigidos sem afrouxar autenticação. Builds PWA e bundle Android `mobile-release` aprovados; manifesto confirma zero módulos de cuidados na edição reduzida. Não foi gerado ou instalado um APK novo. O aviso de chunk estático/dinâmico do push no build PWA já existia e não impede o build.

## Arquivos desta rodada

- Backend: `functions/compras-tipo.cjs`, `functions/compras.cjs`, `functions/cupom-operacoes.cjs`.
- Configuração e telas: `src/components/CategoriasComprasConfig.jsx`, `src/services/categoriasCompras.js`, `src/pages/Admin.jsx`, `src/components/ComprasModulo.jsx`, `src/components/ImportarCupom.jsx`, `src/components/GastosCompras.jsx`.
- Totais e exportação: `src/utils/comprasTipo.js`, `src/utils/exportarPdfListaCompras.js`, `src/utils/exportarPdfGastosCompras.js`.
- Testes: `tests/compras-tipos-config.test.js`, `tests/compras-tipos-config-emulador.test.cjs`, `tests/compras-farmacia.test.js` (expectativa ampliada para os três subtotais novos, sem remover as verificações anteriores).
- Este relatório. Alterações locais de rodadas anteriores preservadas; nenhum arquivo do No Bolso foi alterado.

## Catálogo por categoria de compras — 28-10-2026

Implementado contexto único nas telas de catálogo, busca/autocomplete, sugestões, importação e mesclagem. O catálogo integral deixou de ser acompanhado por `onSnapshot`; agora há páginas limitadas por categoria, reaproveitadas em memória por usuário/grupo/tipo. Digitar filtra a página já carregada sem chamadas por tecla. “Carregar mais produtos desta categoria” avança os cursores; “Atualizar produtos” invalida o cache das categorias deste usuário/grupo. A visão inicial de listas não baixa catálogo. Não há consulta por candidato ou perfil por produto.

### Modelo e compatibilidade

- `catalogoCompras.tiposCompra`: associações explícitas com uma ou mais das cinco classificações. Novos produtos manuais/importados recebem o tipo atual. Edição por cliente antigo sem esse campo preserva as associações existentes.
- Evidência histórica: consulta paginada de `comprasPrecos.tipoCompra` obtém somente IDs de produtos daquela classificação; referências confirmadas de mesclagem resolvem o principal. Não há classificação pelo nome nem varredura/migração.
- Históricos antigos sem `tipoCompra` não são descobertos por essa consulta tipada. Na validação de um produto selecionado, uma amostra limitada a 21 observações pode comprovar a compatibilidade histórica; o significado anterior de tipo ausente continua Supermercado. Sem prova suficiente, administrador usa “Revisar categorias dos produtos”. Produtos já planejados em uma lista mantêm o vínculo daquela lista, inclusive na importação, sem exigir reclassificação.
- Revisão administrativa: páginas de 25 produtos, carregadas por ação explícita. Acrescenta associações, com auditoria de autor/data/antes/depois; não remove associações nem regrava preços/notas. Perfil funcionário/consulta não pode alterar. Validação sempre no backend e relativa ao grupo resolvido da sessão.
- Aliases fiscais novos usam chave `<tipoCompra>_<chaveFiscal>`. Os anteriores permanecem; reaproveitamento exige compatibilidade com o contexto. Código comercial e confirmação de unidade de outra categoria não autorizam associação automática. Preço e descrição originais são preservados.
- Prévia/confirmação de mesclagem e correções validam compatibilidade com a categoria; desfazer preserva os vínculos anteriores. Nenhuma mesclagem automática.
- Produto novo manual em lista usa ID estável durante o formulário; repetição não cria outro cadastro. Adicionar à lista reutiliza a operação idempotente existente.
- Cache em memória evita repetir páginas, mas não substitui autorização do servidor. Alterações feitas em outro aparelho exigem atualização/reabertura da tela. Não foram adicionados listeners.
- No Bolso mantém exclusivamente Supermercado. Sem alterações no repositório consumidor, nas suas regras ou no cache.

### Consumo estimado, não medido em faturamento

| Fluxo | Chamadas | Leituras estimadas | Escritas |
|---|---:|---|---:|
| Página já em memória / digitação | 0 | 0 | 0 |
| Carregar/atualizar/avançar catálogo | 1 | contexto/perfil + até 26 documentos explícitos + até 26 referências de preço + até 25 produtos históricos + principais necessários (até 50); teto conservador 131, usualmente menor | 0 |
| Página administrativa de revisão | 1 | contexto/perfil + até 26 produtos (até 30 no grupo vinculado) | 0 |
| Confirmar associação explícita | 1 | contexto/perfil + produto (5 no grupo vinculado) | 2: produto e auditoria; 0 se conteúdo igual |
| Validar produto já explicitamente associado | mesma operação existente | 0 extras para categoria | mesmas escritas da operação |
| Validar produto legado selecionado | mesma operação existente | até 21 observações extras; no cupom uma consulta por produto único, não por linha repetida | 0 extras |
| Preparar alias fiscal | mesma chamada existente | até 2 documentos por chave fiscal única (escopado + legado), em lote | mesmas escritas do rascunho |
| Tela aberta sem atividade | 0 adicionais | 0 adicionais desta mudança | 0 |

Consultas vazias têm cobrança mínima do Firestore; projeção reduz tráfego, não a quantidade de documentos faturados. Retries de transação podem aumentar leituras. O teto da página inclui a verificação de contexto/perfil e casos de referências mescladas. O custo anterior do listener do catálogo completo e suas atualizações foi substituído por páginas explícitas. Listeners preexistentes de listas/seções/estabelecimentos não foram ampliados. Não há serviços novos, polling ou infraestrutura recorrente. Consultas usam índices simples existentes; nenhum índice composto/regras foi acrescentado ou publicado.

### Verificações desta evolução

22 testes unitários aprovados; 11 testes/subtestes em emuladores aprovados, sem skips: cinco tipos, nomes iguais sem inferência, produto multicategoria, vazio/sem associação, legado com prova, revisão administrativa, importação contextual/alias, mesclagem e reversão, paginação, isolamento, No Bolso, fechamento de categoria desabilitada e regressão de compra sem preço. Lint e builds PWA/mobile-release aprovados. PWA inclui cuidados; manifesto do Android confirma zero módulos de saúde. Aviso de chunk estático/dinâmico do push PWA já existente e não impeditivo. Sem APK instalado/enviado, sem dados reais de teste, sem commit/push. Validação física Android pendente.

Arquivos desta evolução: `functions/catalogo-contexto.cjs`, `functions/compras.cjs`, `functions/cupom-operacoes.cjs`, `functions/compras-associacoes.cjs`; `src/services/catalogoContexto.js`, `src/components/ComprasModulo.jsx`, `src/components/ImportarCupom.jsx`, `src/components/AssociacoesProdutos.jsx`, `src/components/RevisarCategoriasProdutos.jsx`, `src/utils/catalogoProdutos.js`; testes `catalogo-contexto-emulador`, `catalogo-produtos` e metadados de categoria das fixtures de associação/farmácia/configuração. Alterações locais anteriores preservadas.

Autorização recebida: publicar seletivamente `comprasOperacao` e `comprasRelatorio` no projeto `ponto-app-1c55a`, região `us-central1`, e depois PWA no site Netlify `ponto1303` (`cf66ee21-9935-4013-8043-1471c62694e7`). Sem deploy geral, regras/índices, migração, instalação Android ou envio à Play. Resultado efetivo da publicação registrado abaixo após concluir.

### Publicação efetiva

28-10-2026: `comprasOperacao` e `comprasRelatorio` atualizadas com sucesso em `ponto-app-1c55a/us-central1`. Primeira tentativa parou antes da publicação por falha de comunicação ao consultar Firestore; existência do banco confirmada e uma repetição concluiu. Ambas responderam HTTP 401/UNAUTHENTICATED sem token, sem efeitos.

PWA publicado: deploy Netlify `6ae1f6c4eebf40d90940cd2a`, estado ready, domínio https://ponto.acstech.dev.br. Rotas /, /cadastro, /admin e /lista-compras/catalogo responderam 200; manifesto público coincide com o build local `5d36c9cbbd22eb823d67`. Conferência do navegador confirmou Gestão com configuração e Catálogo com produtos de Supermercado, sem erro na consulta publicada. Nenhuma configuração, lista, produto ou preço real foi alterado na conferência. Nenhuma regra/índice ou outra Function publicada. Nenhuma instalação/envio Android, commit ou push. O próximo push à branch de produção poderá substituir este deploy manual; nenhuma configuração de publicação automática foi alterada.

Conferência adicional em produção: categoria Pet exibiu zero produtos e a mensagem de catálogo vazio, sem erro nem itens de Supermercado. Captura: `output/catalogo-contexto-validacao/pwa-pet-publicado.png`. Produtos legados sem comprovação continuam disponíveis para revisão administrativa explícita, sem dedução pelo nome.


## Investigação da associação no cupom — 29-10-2026 (local, não publicado)

Causa reproduzível no código: `catalogoPorTipo` entrega 25 cadastros explícitos e amostra paginada de 25 observações históricas; várias observações podem corresponder ao mesmo produto. `ImportarCupom` recebia somente os produtos já carregados e não recebia cursores/ação de próxima página. O botão de paginação estava atrás do modal. O seletor ainda escondia todas as unidades diferentes; sugestões textuais usam o mesmo catálogo parcial, não uma busca global. Portanto poucos resultados não provavam que o produto não existia.

Correção local: controles de atualizar/carregar mais dentro da revisão e do seletor, contagem do catálogo carregado, estado de carregamento/erro; pesquisa local por nome/marca/embalagem/nomes antigos; unidades incompatíveis aparecem desabilitadas com explicação. Não se convertem kg/un ou embalagens silenciosamente. Catálogo paginado e cache compartilhado existentes reaproveitados; trava por categoria evita cliques concorrentes. Sem busca remota por tecla, download integral automático, listener ou índice novo. Associação e importação continuam exigindo autorização e compatibilidade no backend.

Produtos antigos sem associação explícita nem evidência de histórico naquela categoria continuam fora do seletor: revisar em Catálogo → Revisar categorias dos produtos. Isso é diferente de ausência por paginação. Não classificar pelo nome nem trazer produtos de outras categorias para compensar. Não houve consulta a notas reais, mesclagem, exclusão ou correção dos duplicados existentes. Caso exato do usuário não foi inspecionado; os dois defeitos confirmados explicam o comportamento, sem afirmar que todo cadastro ausente tem a mesma causa.

Custo: digitação e filtragem não acrescentam chamadas. Cada clique em carregar mais reutiliza `catalogoPorTipo`: até 26 documentos por ramo ainda aberto, mais até 25 produtos derivados do histórico e principais associados, além da autorização/transação existente. É estimativa de limite, não medição de cobrança. Páginas consultadas ficam no cache de sessão/categoria. Nenhum deploy, instalação ou Play nesta rodada.
Validação desta correção: lint completo e direcionado aprovados; 3/3 testes de catálogo/associação aprovados; builds PWA e mobile-release aprovados, preservando a edição Android reduzida. Sem validação física ou publicação nesta rodada. Alterações somente em ImportarCupom.jsx, ComprasModulo.jsx, catalogoContexto.js, catalogoProdutos.js, teste e este relatório.

## Associação de cupom publicada — 29/10/2026

Paginação, pesquisa de opções e controles dentro da importação publicados no PWA deploy6ae3786e5b305762782fe9c9 e incluídos no novo APK local. Nenhuma nova alteração do backend de compras foi necessária; contrato por categoria já estava publicado. Sem mesclagem/correção automática de duplicados reais. Testes de catálogo/associação aprovados; relatório conjunto em vales-parcelados-e-pdf-cuidados.md.

## Diagnóstico de cadastros antigos ausentes — 29/10/2026

Inspeção somente de leitura em grupo autorizado, usando agregações e amostra limitada; métricas privadas mantidas em output/diagnostico-catalogo/resumo.json, sem conta/grupo ou nomes no relatório público. Nenhum cadastro real alterado, vinculado, mesclado ou excluído. Nenhuma publicação nesta investigação.

Falha reproduzida com um produto e uma observação fictícios no emulador: o produto antigo não tem tiposCompra e o preço antigo não tem tipoCompra. O helper tipoCompra considera campo ausente como supermercado e compativel aceita a prova histórica. Entretanto catalogoPorTipo consulta comprasPrecos com where tipoCompra == supermercado; Firestore exclui campos ausentes dessa igualdade. O produto não entra na página e ambos os cursores podem terminar, mesmo havendo cadastros legados. Portanto Carregar mais pode nem existir. É uma divergência de compatibilidade, distinta de cadastro sem evidência de categoria, filtro de seção, produto inativo ou mesclado.

Botões: Atualizar produtos invalida o cache de catálogo da sessão/grupo e consulta novamente a primeira página da categoria selecionada; não cria produtos, não altera vínculos e não carrega todo o catálogo. Atualizar categorias consulta a configuração de tipos de compra habilitados no grupo (Supermercado/Farmácia/Material de construção/Oficina/Pet); não associa produtos nem atualiza as seções Hortifrúti/Limpeza. Ambos são operações de consulta, com os custos limitados das operações existentes.

Correção necessária ainda não implementada/publicada nesta investigação: recuperar evidência histórica legada válida em páginas limitadas, respeitando o padrão documentado de Supermercado, sem classificar por nome, varrer o histórico inteiro ou regravar em massa. Produtos realmente sem comprovação continuam sujeitos à associação administrativa explícita. Preservar cache, cursores, exclusões e produto principal de mesclagem. Script de reprodução isolada: output/diagnostico-catalogo/reproduzir.cjs.

## Correção da compatibilidade legada — 29/10/2026

`catalogoPorTipo` agora lê, para Supermercado, uma página limitada de comprasPrecos ordenada por ID, projetando produtoId/valido/tipoCompra. O filtro no servidor usa a mesma regra tipoCompra() já utilizada na validação de associação: campo ausente significa Supermercado; tipo explícito diferente, tipo inválido e preço invalidado não são aceitos como prova. As outras quatro classificações conservam a consulta por igualdade. Não há nova classificação por nome, escrita em cadastro/histórico ou migração.

O cursor histórico avança pelos documentos examinados, mesmo quando a página só contém outras categorias. Preserva próximo cursor em página vazia; a interface informa que há mais dados e não apresenta vazio parcial como ausência definitiva. Produtos e principais continuam deduplicados por ID; inativos e mesclados mantêm o tratamento anterior. Sem prova histórica ou vínculo explícito, produto continua disponível na revisão administrativa, sem associação automática.

Testes: 6 unitários de catálogo/configuração e 2 integrações de emulador aprovados, 0 falhas/skips. Cobertura: legado sem tipoCompra, prova inválida, cinco categorias, produto sem prova, inativo, principal/mesclado, deduplicação entre páginas, página vazia intermediária, repetição sem escrita e isolamento. Catálogo/preços/auditoria fictícios conferidos sem alterações pela leitura. UI local confirmou produto fictício recuperado apenas pelo histórico; captura `capturas/escritorio-profissional/catalogo-legado-recuperado.png`. Lint, diff-check, build PWA e bundle Android reduzido aprovados. Sem nova dependência ou alteração de No Bolso/cuidados.

Custos estimados: mesmos dois ramos paginados, até26 documentos de associações explícitas e26 de histórico por chamada, até25 cadastros do histórico e principais necessários (até50 no limite teórico combinado da primeira página), além da autorização/transação existentes. Quando um ramo termina, ele não é consultado nas próximas páginas pelo cliente. Em grupos com muitos preços de outras categorias, Supermercado pode exigir mais páginas para alcançar os legados; as linhas de outras categorias não são retornadas ao cliente. Filtro local não torna leituras Firestore gratuitas; projeção economiza bytes, não cobrança por documento. Cache/deduplicação no cliente preservados; sem consulta por tecla, download integral automático, listener, polling ou índice novo. Nenhuma escrita de negócio na consulta. Totais são limites do código, não medição de fatura.

Publicação da correção concluída: somente comprasOperacao no projeto ponto-app-1c55a/us-central1, revisão comprasoperacao-00027-faj; nenhuma regra/índice/registro ou outra Function alterada. Sem login, a operação respondeu HTTP401. PWA Netlify ponto1303/cf66ee21-9935-4013-8043-1471c62694e7, deploy **6ae3b91752992957984af66d**, ready, https://ponto.acstech.dev.br. Shell **31340f414704d82c2848** e módulo ListaCompras comparados byte a byte ao build; catálogo HTTP200. Conferência de leitura na conta autorizada confirmou produtos legados e continuação da paginação; números privados não registrados neste relatório. Produtos sem comprovação continuam sujeitos à revisão. Após atualizar o PWA, Atualizar produtos reinicia a consulta e o cache; Carregar mais percorre os próximos dados, inclusive páginas sem correspondência no filtro atual. APK existente recebe a consulta corrigida pelo backend compartilhado; bundle Android validado sem cuidados, sem instalação/novo envio à Play. Sem commit/push.
