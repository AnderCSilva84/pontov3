# Associação de produtos e histórico de preços

Implementação local de 23/10/2026. Sem produção, migração em massa, deploy, commit ou push. Repositório No Bolso preservado.

## Uso e escopos

Em **Compras → Catálogo → Mesclar produtos e revisar associações**, o administrador pesquisa no catálogo já carregado, seleciona os cadastros, escolhe explicitamente o principal e solicita a prévia. A prévia mostra metadados e até cinco preços por cadastro: é uma amostra, não uma contagem completa. Uma confirmação adicional é obrigatória. Marca, embalagem, unidade, GTIN e, quando cadastrados, princípio ativo e dosagem apoiam a decisão. Conflitos conhecidos impedem a confirmação no servidor.

O histórico de operações permite desfazer. Mesclagens posteriores envolvendo os mesmos produtos devem ser desfeitas primeiro. Uma mesclagem não altera descrições, notas, itens, quantidades, valores, datas ou estabelecimentos originais. Os IDs antigos continuam válidos. Não há exclusão dos duplicados.

Em **Preços**, a busca aceita nomes antigos e aliases do catálogo. Ao selecionar a apresentação, o gráfico e a tabela reúnem os registros associados, sem somar preços nem repetir IDs de observação. A tabela oferece **Corrigir associação**, com dois escopos separados:

* Somente uma observação: sobreposição reversível por nova correção, sem mover os outros registros e sem reescrever a nota original.
* Alias fiscal: altera exclusivamente as próximas entradas dessa descrição/código/unidade do mesmo emitente. O histórico anterior não muda. Sem referência fiscal confiável, a operação é recusada.

Mesclar cadastros inteiros é uma terceira ação, disponível no catálogo. A autoria e a data dessas operações são registradas pelo servidor.

No cadastro manual e na revisão da nota, candidatos são calculados localmente. O usuário escolhe associar ou **Cadastrar como novo**. Na entrada manual, associar registra uma descrição alternativa no produto existente; não cria uma compra nem adiciona automaticamente um item à lista. Nas notas, aliases fiscais já confirmados podem preencher a associação na revisão seguinte. Sem alias confirmado, uma coincidência textual não seleciona um produto automaticamente.

## Modelo e autorização

Tudo permanece dentro do grupo resolvido pelo backend, usando `comprasOperacao` existente:

* `catalogoCompras/{id}` mantém o identificador estável e recebe `principalId`, `membrosIds`, `ultimaMesclaId` e `aliasesNomes` opcionais. Metadados opcionais: marca, GTIN, princípio ativo e dosagem.
* `comprasAssociacoes/estado` mantém versão, vínculos diretos, nomes principais e correções pontuais por ID de preço.
* `comprasAssociacoesOperacoes/{operacaoId}` guarda recibo idempotente, autor autenticado, data, produtos, estado anterior e resultado. Desfazer preserva a auditoria.
* `comprasAliases` reaproveita o alias fiscal existente: emitente + código interno + descrição original + unidade original. Código de loja não é GTIN universal.
* Novos itens/preços de cupom guardam também `aliasFiscal` e `cupomChave`; campos antigos e descrição fiscal são preservados.

Administrador é validado no servidor. O cliente não escolhe o grupo da operação. As coleções de associação não ganham acesso direto pelo cliente. Versionamento transacional impede consolidações concorrentes inconsistentes; vínculos são sempre diretos, sem cadeias/ciclos. Repetição do mesmo ID e payload retorna o recibo; reutilização com payload diferente é recusada. A interface conserva o ID ao repetir uma tentativa malsucedida.

Limites explícitos: até 20 cadastros por conjunto associado, 500 vínculos e 500 correções pontuais no documento do grupo, até 500 KB serializados; 20 aliases textuais por produto. Ao atingir um limite, a operação é recusada, sem perda parcial. Não há expansão automática ilimitada. Identidade/apresentação de produto associado exige desfazer a mesclagem antes de alteração.

## Comparação e limitações

Normalização trata acentos, caixa, pontuação, espaços, abreviações e distância textual limitada. Medidas como 1 L/1000 mL ou 1 kg/1000 g são reconhecidas como equivalentes. GTIN tem dígito verificador validado e só aumenta relevância quando compatível. Marca, medidas, contagem de embalagem, versões conhecidas, forma farmacêutica, princípio ativo e dosagem conhecidos geram conflitos quando diferentes.

Não existe inferência infalível de marca/sabor/princípio ativo em descrições fiscais incompletas. O vocabulário de abreviações/versões é finito; ausência de metadado não comprova equivalência. A confirmação humana continua obrigatória. Nenhuma IA ou serviço externo é utilizado.

O agrupamento do gráfico normaliza a apresentação preservando embalagem e medidas; não converte dinheiro. O preço mostrado é **por unidade de compra/embalagem indicada**, e não um novo preço calculado por kg/L. Apresentações incompatíveis ficam separadas. Uma comparação normalizada de preço por kg/L não foi introduzida.

O relatório interno continua limitado ao período selecionado (até 366 dias e 5.000 registros). Não é promessa de histórico completo fora desse intervalo. A estimativa de lista mantém sua consulta anterior por cadastro/apresentação originais; esta rodada não expande essa consulta por todos os vinculados.

## Contrato e No Bolso

Novas operações na callable existente: `mesclaPrevia`, `mesclarProdutos`, `mesclasListar`, `desfazerMescla`, `aliasCatalogo`, `corrigirItemProduto` e `corrigirAliasProduto`.

O relatório **interno** acrescenta `associacoesVersao`, `nomeCanonico`, `produtoOriginalId`, `apresentacaoOriginal`, `associacaoCorrigida` e referências originais. As métricas internas recebem o ID principal. A confirmação de importação do cliente novo envia `versaoIdentidade: 1` e `novoConfirmado` para produtos novos. Clientes antigos permanecem compatíveis; não passam a ganhar equivalência textual automática.

A API externa e a ponte No Bolso não receberam esse mapeamento. Continuam com seus IDs/contratos atuais e exclusão de farmácia. Expor a visão canônica externamente exigirá uma rodada explícita de contrato/consumidor, inclusive cache; nada foi alterado no No Bolso.

## Custos estimados — não medição de faturamento

Considerando conta vinculada a grupo, sem repetição automática de transação, N produtos e P preços no período. A resolução existente de acesso lê vínculo, grupo e perfil (3 leituras). O perfil é conferido novamente dentro da transação: redundância preexistente mantida para não enfraquecer autorização concorrente.

| Fluxo | Functions | Leituras estimadas | Escritas |
| --- | --- | --- | --- |
| Digitar/ordenar sugestões | 0 | 0 adicionais; catálogo já carregado | 0 |
| Prévia | 1 | 5 + N documentos de catálogo + até 6N preços (consulta vazia ainda pode ter cobrança mínima) | 0 |
| Confirmar mesclagem | 1 | 6 + N | N atualizações de catálogo + mapa + recibo (N+2) |
| Replay idêntico | 1 | 6 | 0 |
| Desfazer | 1 | 7 + N | N catálogos + mapa + operação original + recibo (N+3) |
| Listar auditoria | 1 por página | 5 + até 21 recibos | 0 |
| Alias textual de cadastro | 1 | 7 | produto + recibo (2) |
| Corrigir um preço | 1 | 8 | mapa + recibo (2) |
| Corrigir alias fiscal | 1 | 10 | alias + mapa + recibo (3) |
| Relatório interno | 1 existente | consulta existente por período + **1 mapa adicional** | 0 |
| Preparar nota | 1 existente | fluxo existente + **1 mapa adicional**; aliases/produtos continuam deduplicados | rascunho existente |

Após mutação, o listener de catálogo já existente recebe apenas atualizações pertinentes; custo depende dos documentos alterados. Refazer o relatório após uma correção mantém a consulta por período existente. Nenhum preço é regravado para mesclar. Não há consulta adicional por candidato, listener por produto, polling, novo índice, Scheduler, upload ou serviço pago. O catálogo do módulo ainda usa seu listener de grupo preexistente sem paginação remota: esta rodada pagina a apresentação/busca local, não reimplementa sua política de carregamento. Catálogos muito grandes continuam sendo limitação conhecida.

Abrir sem interagir não cria chamadas das novas ações nem polling; os listeners/carregamentos anteriores continuam. Cache local não autoriza operações. Offline, uma mesclagem não é confirmada: permanece sem sucesso até resposta do servidor; não há fila/retry infinito. Os números acima não garantem custo zero nem cota gratuita.

## Validação

* Lint e builds PWA/mobile aprovados. Build Android debug aprovado e instalado com `adb install -r`, preservando dados.
* Testes locais: 207, sendo 178 aprovados e 29 condicionados a emuladores, sem falhas.
* Integração Auth/Firestore isolada: 27 aprovados, sem falhas, incluindo compras, farmácia, estimativa e ponte existente.
* Bateria adicional de associação com alias fiscal: aprovada. Quatro descrições geram quatro observações únicas, originais intactos; desfazer restaura quatro IDs, correção pontual não move outro preço, concorrência rejeita uma versão obsoleta, autoassociação e incompatibilidades são recusadas, outro grupo/funcionário não podem mesclar. Alias fiscal corrigido reaparece na preparação seguinte sem mudar o preço antigo.
* Fixtures antigas que associavam 500 mL a pacote de arroz de 1 kg foram corrigidas para a apresentação compatível. A validação de incompatibilidades não foi removida.
* PWA local: seleção explícita de quatro produtos, prévia com quatro observações e largura 320 px sem overflow horizontal do documento. [Captura](mobile/capturas/associacoes/pwa-previa-320.png).
* PWA: gráfico principal com quatro pontos e quatro linhas, sem duplicação; sugestões no cadastro manual visíveis antes de salvar. [Sugestões](mobile/capturas/associacoes/pwa-sugestoes-cadastro.png) e [histórico](mobile/capturas/associacoes/pwa-historico.png).
* Samsung SM-A057M/Android 15: login fictício, seleção/prévia, confirmação pela callable real, consulta principal com quatro linhas e desfazer confirmado — os quatro cadastros voltaram a aparecer separados. APK final reinstalado e sugestões de cadastro conferidas visualmente. [Sugestões no aparelho](mobile/capturas/associacoes/apk-sugestoes.png). Sem alteração de GPS, PIN, geofence ou dados reais. A tabela de referências tem rolagem horizontal própria para preservar legibilidade no celular. Não foi testada toda combinação possível de nota real/apresentação farmacêutica no aparelho; casos de domínio foram cobertos com fixtures.

APK: `android/app/build/outputs/apk/debug/app-debug.apk`. Ambiente de teste dedicado, Auth/Firestore/Functions locais (9098/8877/5007), sem produção. Não é artefato de distribuição.

SHA-256 do APK final: `68001537867140721AA0293058803F5F885675830FB665E51F96B07822A64DDD`.

Arquivos da rodada: `functions/produtos-identidade.mjs`, `functions/compras-associacoes.cjs`, `functions/compras.cjs`, `functions/cupom-operacoes.cjs`, `src/components/AssociacoesProdutos.jsx`, `ComprasModulo.jsx`, `ImportarCupom.jsx`, `ComprasGraficos.jsx`, `ProdutoAutocomplete.jsx`, `src/utils/comprasAnalise.js`, `comprasConsulta.js`, `src/styles/compras.css` e testes de identidade/associações/compras. Alterações anteriores preservadas.

## Correção pontual — feedback ao confirmar (24/10/2026)

Usuário confirmou que havia marcado somente os produtos. No componente publicado, a prévia ficava desabilitada enquanto faltava o produto principal, e a confirmação final ficava desabilitada até marcar a conferência, sem explicar a etapa faltante. A seleção por si só não envia `mesclarProdutos`. Reprodução anterior à correção: botão final desabilitado sem alerta/status; com as etapas completas, uma callable real no demo gravou e a seleção foi limpa. Não foi reproduzida falha do handler com esse payload válido.

Correção restrita a `src/components/AssociacoesProdutos.jsx`: próxima etapa indicada; cliques incompletos explicam seleção/principal/conferência; botões com `type="button"`; carregamento e bloqueio concorrente na prévia/salvamento; resultado visível com quantidade e principal; seleção preservada na falha. Resposta perdida mantém o mesmo ID/payload para tentar novamente. Falha de atualização da tela após confirmação do servidor não é apresentada como falha de gravação. Contrato, autorização, idempotência e desfazer do backend preservados.

Validação: sete cenários no navegador a360px usando quatro produtos novos fictícios e Auth/Firestore/Functions locais. Incluiu perda deliberada da resposta **depois** de o servidor processar: seleção mantida, duas requisições com o mesmo ID/payload, sucesso por replay e desfazer pela UI. Regressão direcionada de associações do pacote publicado aprovada (um teste com múltiplas verificações de quatro preços, reversão, concorrência e isolamento). Lint direcionado e build web isolado aprovados; não executada suíte completa. Handler local e handler do pacote publicado têm SHA-256 idêntico. Teste reproduzível de interface: `tests/mesclagem-interface.browser.mjs`, com Chrome isolado9228/PWA5177 e fixture local; recusa projeto sem emuladores. Sem produtos reais ou escritas de negócio em produção.

Publicado: **`6adcb783eba71043b860aaf3`**, https://ponto.acstech.dev.br — permalink https://6adcb783eba71043b860aaf3--ponto1303.netlify.app. Pacote isolado da versão14, confirmado por hash de fontes: **somente o componente de associações mudou**. Site `cf66ee21-9935-4013-8043-1471c62694e7`, domínio e base anterior `6adca9e730c0f38f5f74163f` reconfirmados por leitura autenticada/HTTPS. Worker não mudou; assets anteriores preservados, sem limpar IndexedDB/filas ou forçar reload. Nenhuma Function/regra/índice foi publicada. Pós-publicação: seis rotas/recursos HTTPS200, manifest/worker esperados,22assets conferidos por SHA-256 e dois ícones acessíveis. Não houve teste autenticado com dados reais de produção. Para repetir: concluir operações pendentes, fechar/reabrir PWA; selecionar2–20produtos → escolher principal → Ver prévia → marcar conferência → Confirmar mesclagem; conferir o sucesso e o histórico.

Sobre tentativa anterior: somente marcar produtos não grava mesclagem. Uma confirmação completa pode gravar sem o retorno chegar ao aparelho — esse caso foi reproduzido no demo e o replay recuperou o recibo, sem nova mesclagem. Consultar “Ver associações e desfazer” é a forma de conferir o que já foi salvo. Não refazer associações em massa.

Custos: feedback/validação são locais, sem novas consultas/listeners/polling. Prévia e mesclagem mantêm o consumo já documentado; somente ações manuais válidas chamam a Function. Testes usaram emuladores. Publicação consome recursos/cotas existentes da Netlify; não é promessa de custo zero. Android, No Bolso, produção de dados, chaves e demais alterações locais permanecem preservados; sem commit/push.

## Segunda correção pontual — conflito visível e cards (24/10/2026)

A captura enviada pelo usuário contém `Unidades de compra diferentes`: cadastro em kg versus cadastro em un. Confirmado em `confirmar()` e na mesma regra `conflitosProdutos` usada pelo backend: prévia com conflito retorna antes de chamar `mesclarProdutos`, independentemente da caixa de conferência. Portanto, nesse caso não ocorre gravação ao confirmar. Não foi encontrada evidência de falha do endpoint ou de que Service Worker causasse esse caso. A publicação anterior foi reconfirmada antes do novo deploy.

Problema de apresentação corrigido: o feedback de confirmação estava no topo da seção, distante da prévia/ação. Agora validação/erro remoto ficam dentro da prévia junto ao botão e recebem foco/rolagem. O bloqueio já aparece como painel destacado, com nome do cadastro afetado e explicação de que kg e unidade/embalagem não são comparáveis sem conversão. Não removida validação de segurança nem implementada conversão fictícia. Confirmar produtos incompatíveis não envia mutação; o usuário deve revisar identidade/apresentação antes de mesclar. A correção não altera preços ou cadastros reais.

Visual: produtos selecionáveis em cards separados; na prévia, cada produto tem borda, espaçamento, nome, metadados e linhas de preço próprias. Principal destacado em azul. Cada observação mantém valor/unidade, estabelecimento e descrição original. [Captura fictícia a360px](mobile/capturas/associacoes/mescla-cards-conflito-360.png).

Checks direcionados: 2 testes de identidade aprovados, lint do componente e teste aprovado, build PWA isolado aprovado. `tests/mesclagem-cards.browser.mjs` aprovou cinco verificações: incompatibilidade kg/un sem chamada de escrita; erro visível no viewport após o clique; cards/principal/ausência de overflow em320/360/1024px; erro remoto com seleção preservada; sucesso para produtos compatíveis. Interface React real em Chrome headless, respostas de serviço simuladas e biblioteca de comparação real. Não declarar integração completa/emuladores ou aparelho físico nesta rodada; backend não mudou. Suíte completa não repetida.

Publicado no PWA: `6adcbcf6bf65ca9b4080d8d7`, https://ponto.acstech.dev.br, site confirmado `cf66ee21-9935-4013-8043-1471c62694e7`. Fonte isolada da versão publicada: somente `src/components/AssociacoesProdutos.jsx` e delta de `src/styles/compras.css`; sem arrastar ajustes locais de farmácia/Android/assinatura. Primeiro build sem variáveis foi recusado pela conferência do projeto e não enviado; build definitivo usou variáveis públicas verificadas para `ponto-app-1c55a`. Worker inalterado e assets anteriores preservados; sem limpar cache, IndexedDB ou filas. Nenhuma Function/regra/índice, dados reais, chave privada, commit ou push enviados.

Custos: apenas apresentação e validação local; sem consultas/listeners/polling adicionais. Conflito bloqueado localmente gera zero chamadas de mutação. Prévia/salvamento compatíveis mantêm contrato e consumo anterior. Publicação usa infraestrutura existente, sem promessa de custo zero.

Roteiro: reabrir PWA sem limpar dados → selecionar produtos → principal → prévia. No caso kg/un da captura, painel explica o bloqueio e confirmar mostra “Mesclagem não enviada”. Com cadastros compatíveis, conferir → confirmar → aguardar “Mesclagem concluída”. Nenhuma equivalência de pacote de1kg com produto vendido por kg foi presumida: a transformação de unidade exigiria definição própria.

Pós-publicação confirmado: seis rotas/recursos HTTPS200,26assets conferidos por SHA-256 e dois ícones acessíveis. Evidência local: tmp/mescla-cards-public-production.json. Sem teste autenticado com dados reais de produção.

## Produto principal como única opção — 24/10/2026

Causa confirmada da duplicidade após sucesso: a transação já persistia `principalId` nos cadastros associados, mas catálogo e escolhas filtravam apenas `ativo`, exibindo os membros novamente. Correção compartilhada APK/PWA: `produtosPrincipais` filtra vínculos da apresentação normal e permite encontrar o principal pelos nomes antigos, sem consulta extra. Aplicado ao catálogo, adição em listas, seleção para mesclar e escolha de produto na importação. Cadastros originais continuam disponíveis internamente, preservando referências, notas, preços e desfazer; não foi feito update em massa nem definido `ativo:false`, o que quebraria operações antigas. Desfazer remove o vínculo e faz os produtos reaparecerem separados. Itens já lançados em listas/notas não são somados ou apagados automaticamente.

Validação: teste local de quatro cadastros → um principal, busca por todos os nomes anteriores, categorias, inativo e reversão; teste de interface confirmou que o catálogo recebido após sucesso deixa apenas uma opção. Mesclagem e preços reais não foram usados no ensaio. Lint e build isolado aprovados. Nenhuma alteração de backend/regras/índices ou API No Bolso.

Publicado somente esse ajuste no PWA: `6adcf4e67d596066183aa4c6`, https://ponto.acstech.dev.br. Domínio/site/base anterior conferidos antes. Pacote isolado contém os deltas de três componentes, estilo já aprovado e novo utilitário `src/utils/catalogoProdutos.js`; não inclui as novas funcionalidades locais de ponto/mapa. Pós-publicação: seis rotas/recursos200,29assets conferidos por SHA-256 e dois ícones acessíveis; worker inalterado e assets anteriores retidos. Sem limpar filas/cache, commit ou push. As mesclagens anteriores válidas já passam a ser apresentadas pelo principal ao reabrir o PWA; não repetir mesclagem só para esconder o duplicado.

Custo adicional: zero consultas/escritas/Functions para o filtro e a busca pelos nomes associados; utiliza o catálogo já carregado. Transação, auditoria e reversão permanecem com o consumo anterior.


## Catálogo, caixa alta e ícones — 25/10/2026 (local, não publicado)

- Produtos exibidos em caixa alta no catálogo, seleção, listas, consulta de preços, rankings e prévia de mesclagem. Novos nomes manuais e de importação persistem em caixa alta no servidor; nomes antigos são formatados em memória, sem regravação em massa. Descrição fiscal original, IDs, valores e unidades preservados. PDF de lista usa caixa alta nos produtos.
- Administrador tem Excluir do catálogo com confirmação. Nova operação produtoExcluir em comprasOperacao valida sessão/grupo/perfil e confirmação; desativa com ativo:false, excluidoPor e excluidoEm. Não apaga documentos, aliases, vínculos, notas, itens ou observações de preço. Repetição retorna jaExcluido sem nova escrita. Não existe exclusão física em cascata. Catálogo usa filtro de ativos já existente, sem leitura por produto. Referências de listas antigas permanecem; produtos excluídos deixam de ser oferecidos para novas entradas.
- Peixaria 🐟, frutos do mar 🦐, descartáveis 🥡, talheres descartáveis 🥢, papel/guardanapos 🧻, sacos de lixo 🗑️, congelados 🧊, confeitaria 🍰, bebê 🍼 e primeiros socorros 🩹 acrescentados à coleção. Campo de emoji personalizado com prévia já existente preservado; aceita um emoji composto e rejeita texto/HTML. Não é editor de desenho nem upload de SVG. Categorias reais não foram criadas automaticamente.
- Pão francês: prévia somente leitura anterior comprovou kg versus un. Histórico nos dois produtos não impede mesclagem compatível. Não há peso por unidade para conversão segura. Mantida recusa explícita no backend e explicação na interface; solicitada confirmação se a unidade foi cadastrada incorretamente ou representa outra apresentação. Nenhum preço/unidade real corrigido por suposição.
- Arquivos: functions/compras-produto.cjs, compras.cjs, cupom-operacoes.cjs, compras-icones.json; src/utils/nomeProduto.js, src/services/compras.js, ComprasModulo.jsx e AssociacoesProdutos.jsx.
- Checks: sete testes locais de nome/catálogo/ícones/identidade aprovados; dois cenários de integração Auth/Firestore emulados aprovados (exclusão/caixa alta e mesclagem com histórico, reversão, isolamento). Exclusão recusada sem autenticação, funcionário, outro grupo ou sem confirmação; preços e itens preservados, repetição sem modificação. Browser simulado validou cards a 320/360/1024px, bloqueio kg/unidade com mensagem, falha com seleção preservada e sucesso compatível. Lint direcionado e builds PWA/mobile/debug aprovados. Sem suíte geral.
- Emuladores de testes isolados em loopback 18877/19098, projeto demo-ap1303; encerrados ao terminar, sem interromper os emuladores existentes. Tentativas iniciais falharam por restrição de sandbox, portas ocupadas e caminho Windows do runner; nenhuma foi considerada teste aprovado. Build mobile exigiu destino teste/flag explícita para preservar o projeto dedicado existente.
- APK debug gerado: android/app/build/outputs/apk/debug/app-debug.apk, SHA256 E092198E4F50996697A0011757CC81CB02D386A81D4374FB306272CD3BA4B44B. Não instalado ou validado fisicamente nesta rodada. AAB anterior não regenerado. PWA compilado em tmp/catalogo-pwa-build; não publicado.
- Como testar após liberação: Catálogo mostra caixa alta; administrador exclui confirmando e o produto some das novas seleções, enquanto lista antiga/histórico continuam; funcionário não recebe ação e servidor recusa tentativa; Categorias → Nova categoria → buscar Peixaria/Descartáveis ou colar emoji próprio; Mesclar aceita dois produtos equivalentes com histórico e recusa kg versus unidade.
- Custos estimados, não medidos: caixa alta e ícones usam dados já carregados, sem novas consultas. Excluir em grupo chama uma Function; contexto existente lê vínculo/grupo/perfil (3 docs), transação lê perfil/produto (2 docs), escreve 1 documento; replay 5 leituras/0 escritas antes de possíveis retries internos de transação. Listener de catálogo existente pode receber o documento alterado; não foi adicionado listener. Sem índices, polling, serviços pagos ou No Bolso alterado. Sem produção, mesclagem real, migração, deploy, commit ou push.


### Correção pontual confirmada de PÃO FRANCÊS — 25/10/2026

Titular confirmou que ambos os cadastros deveriam ser por kg. Consulta limitada constatou duas observações, ambas já em kg (0,208 kg a R$17,80/kg e 0,300 kg a R$16,90/kg). Somente o catálogo pao estava em un. Transação administrativa restrita ao grupo ap1303-principal corrigiu esse campo para kg e nome para PÃO FRANCÊS, registrando antes/depois, titular, data e justificativa em comprasAssociacoesOperacoes/correcao_pao_kg_20261025. Guarda verificou perfil/grupo e os valores conhecidos antes da escrita. Nenhuma nota, item, preço, quantidade ou total foi regravado. Tentativa inicial falhou na resolução local do SDK antes de qualquer escrita; corrigida e executada com sucesso. Prévia pelo handler existente retornou dois produtos em kg, duas observações e zero conflitos. Mesclagem ainda não aplicada; não houve deploy. Evidência local: tmp/pao-correcao-unidade-resultado.json. A correção pontual de dados confirmada é distinta das alterações de software ainda locais.


### Publicação autorizada do catálogo — 25/10/2026

- Publicada exclusivamente comprasOperacao em ponto-app-1c55a/us-central1, revisão comprasoperacao-00024-paj, ACTIVE (2026-10-25T13:52:56Z). Inclui validação administrativa da exclusão lógica, nomes novos em caixa alta e coleção de ícones. Sem deploy geral, regras, índices ou IAM alterados. Avisos CLI de dependência antiga/região de outro trigger não motivaram alterações fora do escopo. Checks direcionados desta rodada reaproveitados; sem nova auditoria/suíte/build.
- Smoke HTTP com conta QA fictícia confirmou cadastro em caixa alta, exclusão por admin, recusa sem login e funcionário, repetição sem regravar. Grupo g_qa_android_final_admin_20261024 não tinha categorias: criada uma categoria QA fictícia e um produto QA específico, que terminou inativo. Nenhum produto de cliente usado. Evidência: tmp/catalogo-publicacao-smoke.json. Pré-deploy lint do CLI é script legado que apenas imprime lint ignorado; lint real direcionado já havia passado nesta rodada, não tratar esse echo como lint.
- PWA ponto1303, site cf66ee21-9935-4013-8043-1471c62694e7, domínio https://ponto.acstech.dev.br: deploy 6ade0a11e31b7d67e78201c0, após backend verificado. Pacote tmp/catalogo-publicacao deriva do build PWA aprovado, excluindo privacidade/suporte/excluir-conta. Recursos públicos conferidos byte a byte e páginas rascunho não publicadas.
- Conferência autenticada demo no PWA: catálogo em caixa alta, ação Excluir do catálogo para admin, busca por Peixaria/Descartáveis e emoji próprio com prévia; sem overflow a 390px. Nenhum produto excluído ou categoria salva por esse ensaio visual. Evidências tmp/catalogo-publicacao-ui.json e tmp/catalogo-public-check.json.
- Custos: deploy/build remoto e smoke usam infraestrutura existente, com pequena categoria/produto fictícios adicionais no QA. Não há nova rotina, serviço, índice ou leitura periódica. Valores faturados não medidos. AAB não regenerado, APK não enviado à Play; variante debug anterior desta rodada preservada. Sem commit/push. Correção real pontual de pão foi registrada na seção anterior; nenhuma mesclagem em massa aplicada.


## Gráfico por busca de produto, incluindo marcas/embalagens — 25/10/2026 (local)

ComprasGraficos deixa de filtrar pela chave estrita produto/marca/apresentação. A busca textual reage à digitação e reúne observações pelos nomes canônico, cadastral, original e aliases confirmados já carregados. Banana inclui prata/nanica; sabão líquido inclui marcas/embalagens distintas quando descrições/aliases contêm esses termos. Normaliza acentos/caixa/espaços. Não infere equivalência semântica de nomes abreviados desconhecidos nem mescla produtos/aliases. Categoria e período existentes continuam restringindo resultados.

Cada observação é mantida por ID, sem soma/duplicação ou alteração de preço. Diferentes unidades de preço geram gráficos separados (kg, L, m, unidade/embalagem). Para unidade/embalagem, volumes diferentes podem estar na mesma série conforme pedido, explicitando que são preços registrados das embalagens e não conversão a preço por litro/kg nem índice de inflação. Marca/apresentação aparecem na tabela e tooltip; barra representa o último registro do supermercado nessa unidade. Linhas continuam apenas ligando observações históricas. Tabela continua limitada a 50 linhas com expansão explícita.

Arquivos: src/components/ComprasGraficos.jsx e novo src/utils/comprasHistoricoProduto.js. ProdutoAutocomplete e consulta individual de razoabilidade de preço permanecem com seu contrato anterior. Nenhuma alteração de API/backend, catálogos, preços, rankings ou No Bolso; nenhuma leitura/Function/listener/polling adicional, processamento local sobre o período já carregado.

Verificação: cinco testes direcionados aprovados (busca entre marcas/embalagens, separação de unidades, categoria/alias/deduplicação/vazio e identidade existente), lint direcionado e build PWA tmp/grafico-produto-pwa-build aprovados. Browser com componente real e backend simulado: duas marcas de sabão com 1L/3L no mesmo histórico; banana com kg/un em gráficos separados; tabela com marcas, nenhum resultado e ausência de overflow em 320/390/1366px. Evidência tmp/grafico-produto-browser.json. Sem testes com dados reais. Mesmo componente atende APK/PWA; não gerado novo APK/AAB ou ensaio físico nesta rodada. Não publicado; sem commit/push.


### Gráfico por produto publicado — 25/10/2026

Autorização explícita recebida. Publicado somente o frontend em ponto1303 (site cf66ee21-9935-4013-8043-1471c62694e7), https://ponto.acstech.dev.br, deploy 6ade1117f6bd7a8df41c5516. Build e testes direcionados anteriores reaproveitados, sem nova compilação/suíte. Staging tmp/grafico-produto-publicacao conferiu destino Firebase de produção e excluiu políticas rascunho. Arquivos HTTP públicos conferidos byte a byte com o pacote: tmp/grafico-produto-public-check.json. Sem deploy de backend, alteração de dados, APK/AAB ou Play, commit/push.
