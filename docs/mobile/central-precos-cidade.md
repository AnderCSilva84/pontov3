# Central de Preços por Cidade

## Estrutura definida antes da implementação — 28-10-2026

- Reutilizar Auth/contexto de grupos e compras confirmadas. Central separada do No Bolso e do catálogo privado.
- Configuração privada `centralConfiguracao/consentimento`, padrão inexistente/desligado; aceite versionado e autor/data. Administradores confirmam vínculos de produto e estabelecimento/município. Aliases privados não geram identidade global.
- Catálogo compartilhado com especificação estruturada e associação explicitamente revisada. Município validado por código IBGE/UF em base estática oficial de 28-10-2026, sem chamadas externas em pesquisas.
- Observações e resumos derivados só de compras persistidas, com serialização por campos permitidos; origens internas protegidas, deduplicação de linha fiscal entre grupos e recomposição por estabelecimento ao retirar.
- Eventos de origem processados com idempotência, tentativas limitadas e continuação por lotes. Histórico exige prévia e confirmação, limitado ao próprio grupo, sem varredura global.
- Consulta por botão, páginas padrão 20, cache local por sessão/filtros por 15 minutos, sem listeners/polling. A consulta não exige contribuir.
- Não publicar, não executar histórico real, não alterar No Bolso nem instalar/enviar APK.

Resultados, limites, índices, custos e textos propostos serão registrados neste mesmo documento.

## Implementação entregue localmente

### Dados e contratos

`centralPrecos` é um callable autenticado. Resolve o grupo pelo vínculo da sessão e perfil ativo (admin, funcionário ou consulta); ignora grupo enviado pelo cliente. Consultar não exige consentimento. Configurar, revisar, pré-visualizar ou processar lotes exige administrador. Escritas/leitura direta dos dados da Central são negadas; as respostas são serializadas explicitamente pelo domínio. A Central não usa nem altera o contrato/cache do No Bolso.

Coleções privadas do próprio grupo: `centralConfiguracao/consentimento`, `centralConsentimentos` (auditoria do aceite), `centralVinculos` (produto privado → especificação revisada), `centralLocais` (filial/CNPJ e município confirmados), `centralItens` (revisão de correção específica), `centralContribuicoes` (origem/status/motivo) e `centralLotes` (cursor, estado, progresso e trava). O legado utiliza os mesmos nomes na raiz, pelo resolvedor existente. Coleções novas não são criadas em massa.

Coleções globais protegidas: `centralProdutos` (especificações), `centralObservacoes` e seus `apoios` (uma linha fiscal, vários vínculos internos), `centralResumos/{cidade_tipo_produto}/estabelecimentos/{filial}` (última observação por filial), `centralCidades/{cidade_tipo}/produtos` (índice de opções), `centralExecucoes` (continuações por evento), `centralLimites` e `centralCursores`. Nenhum documento global concentra todas as cidades ou atualizações. Uma retirada recompõe o resumo a partir das observações remanescentes e remove a opção da cidade quando não houver filial com preços. Especificações comerciais canônicas podem permanecer no catálogo interno, sem vínculos públicos com o grupo.

Ações: `configuracao`, `configurar`; `revisarLocais`, `confirmarLocal`, `vincularProduto`, `revisarItem`; `previaHistorico`, `criarLote`, `executarLote`, `lotes`; `produtos`, `consultar`, `historico`.

Consulta: município IBGE/UF, categoria elegível e produto revisado. Páginas padrão 20/máximo 40. Busca de produtos remota apenas por botão, por cidade/categoria; digitação filtra opções carregadas. Preços ordenados por data ou menor preço encontrado no período, ambos no servidor. A comparação inicial usa uma observação por filial. Detalhamento separado e paginado. Janela recente padrão 30 dias, ajustável na própria consulta; histórico é identificado como tal. Filtros temporais são revalidados no servidor. Cursor opaco, vinculado a usuário/grupo/filtros, válido por 15 minutos, com até 16 posições reutilizáveis por usuário: não expõe hash fiscal ou ID da origem. Navegação antiga pode expirar/ser substituída; refazer a busca é a recuperação, sem limpar dados privados.

### Identidade, valores e privacidade técnica

Produto exige especificação completa revisada: nome comercial, marca (ou ausência comprovada), variante, embalagem, unidade, conteúdo/medida quando conversível e GTIN válido se houver. Identidade global deriva dessa especificação integral. Igualdade de nome, alias ou mesclagem privada não gera equivalência global. Mudança da identidade privada invalida a confirmação. Um item corrigido é retirado e exige revisão específica; revisar um item não move as outras observações.

Estabelecimento exige CNPJ com dígitos verificadores válidos e confirmação comercial/município pelo administrador. CNPJ válido não é validação cadastral externa; não se consulta Receita nem IBGE por pesquisa. CNPJ da nota, quando disponível, deve coincidir com a filial. Cidade da conta/GPS nunca é usada. Endereço/cidade privados existentes aparecem apenas como apoio à confirmação.

Publicação explícita: produto/especificação, categoria, preço efetivamente pago por unidade comercial, comparação por medida quando comprovada, nome/filial comercial, município/UF e dia da compra. O horário preciso fica interno. Não se serializam autor, grupo, CPF, CNPJ fiscal, nota, chave, URLs, PDFs, quantidade total, total da nota, observações ou identificadores de deduplicação. IDs globais de produto identificam somente especificações comerciais. O vínculo protegido de origem permanece: não se declara anonimização irreversível.

Limitação deliberada: notas com desconto global sem valor líquido comprovado por item ficam pendentes, com motivo visível; não é feito rateio estimado. O banco privado continua guardando seus valores originais. Notas antigas sem linha fiscal original comprovável também aguardam revisão, em vez de contribuir sem deduplicação segura. A importação nova passa a guardar `linhaFiscal`, preservando campos e valores existentes. Manuais sem chave fiscal têm idempotência por origem privada; não há prova para deduplicar compras manuais independentes entre grupos como se fossem uma mesma nota.

### Processamento e recuperação

Eventos específicos de preços confirmados leem origem, lista e consentimento atuais em transação. Não usam payload antigo como verdade. Desligado por padrão, inclusive sem documento de configuração. Consentimento registra autor/data/versão e aviso `central-v1-2026-10-28`. Desativar interrompe novos envios; preços anteriores só saem ao concluir uma retirada ou quando sua origem se torna inválida.

Nota: hash interno da chave fiscal e da linha deduplica a mesma observação entre grupos. Até 20 apoios por observação; divergência de identidade ou excesso fica pendente. Retirar um apoio não apaga apoio válido de outro grupo. Não há incrementos cumulativos de médias/contagens. Observação, apoios, resumo e status da origem são gravados atomicamente. Replay com assinatura igual não escreve.

Correção, anulação/exclusão e mudança de origem geram reconciliação. Mudanças de produto/filial/vínculo consultam somente contribuições daquele alvo, paginadas, não todos os preços/grupos. Eventos de associação corrigida tratam apenas o item afetado. Mesclagem/alias privado não cria fusão global.

Histórico: prévia limitada ao próprio grupo/período (até 366 dias por lote), categorias elegíveis e confirmação explícita. Prévia não publica. Execução de até 10 observações por chamada, revalidando consentimento e origem por item; cursor/progresso persistidos, sem duplicar projeção se houver falha após publicação e antes do checkpoint. Nova versão de consentimento interrompe o lote antigo; preparar novo lote para novo aceite. Retirada exige contribuição desligada e versão correspondente. Trava expira em 2 minutos; retomada é explícita, sem polling.

Reconciliações por evento têm continuação persistida e até três tentativas com backoff/jitter. Cadeia automática limitada a 100 páginas; lotes maiores/erros podem ser continuados em Gestão. Falha inicial da origem é registrada como lote para recuperação administrativa. Não existe Scheduler ou serviço periódico novo. Após falha ou atraso, a Central pode mostrar a projeção anterior até reconciliar; cache pode manter resultado antigo por até 15 minutos, ou além disso offline com aviso. Retirada não consegue apagar cópias já vistas fora do controle do app.

### Cache e consumo

Cache de até 20 buscas/400 mil caracteres, persistido localmente e vinculado à sessão (usuário/grupo/filtros/período/cursor), 15 minutos. Pedidos simultâneos iguais são deduplicados; sem retries automáticos no consumidor. Offline usa somente o salvo, com data e aviso de desatualização; sem cache informa indisponibilidade. Troca de conta/grupo e logout invalidam esse cache; respostas em voo de uma sessão anterior não o repovoam. Recusa de autorização não é mascarada como falha offline. Sem listener/polling ou consulta por tecla. Município e editor são carregados somente ao abrir a Central/expandir a Gestão, por chunks lazy.

Medição instrumentada em emuladores, não faturamento: leituras lógicas do código, incluindo mínimos estimados de consultas vazias e leituras do resolvedor existente; transações reexecutadas podem acrescentar operações. Não é medição do painel de cobrança ou de entradas de índice.

| Fluxo fictício medido | Invocações | Leituras lógicas | Escritas |
|---|---:|---:|---:|
| Evento de preço, contribuição nunca ativada | 1 trigger | 1 | 0 |
| Primeira publicação de uma observação válida | 1 trigger | 14 | 5 |
| Replay da mesma observação | 1 trigger | 10 | 0 |
| Consulta remota com uma filial, sem próxima página | 1 callable | 6 | 1 (limite por usuário) |
| Cache válido / aberturas repetidas com mesma busca | 0 | 0 adicionais | 0 |
| Offline com ou sem cache | 0 | 0 adicionais | 0 |
| Central aberta sem atividade | 0 | 0 adicionais desta função | 0 |

Consulta remota de página cheia: 4 leituras existentes de contexto/perfil + 1 do limite + até 21 documentos para página padrão. Se houver próxima página, +1 escrita do cursor; ao usá-lo, +1 leitura. Limite máximo usa 41 documentos para detectar continuação. A ordenação por menor preço usa duas faixas e pode cobrar leituras de entradas de índice além dessas estimativas; o emulador não mede essa cobrança. Não se promete custo zero ou cota gratuita.

Retirada por observação pode ler até 21 apoios + até 3 observações substitutas + até 3 resumos, além da origem/configuração, e regravar/excluir os documentos afetados; depende do compartilhamento real. Lote agrega as operações por fonte e checkpoints (1 leitura/1 escrita de progresso por item, mais claim/finalização/página de até 10). Revisão de produto/filial e aceite fazem apenas os reads/writes necessários à ação explícita. Prévia reutiliza documentos repetidos dentro de uma única transação, sem buscar preços de todos os candidatos. Armazenamento adicional: projeção, apoios internos, auditoria de consentimento, vínculos, lotes e quatro índices; sem duplicar PDFs/notas. Consulta usa resumos/observações compartilhadas, não relê notas privadas. Gatilhos acrescentam invocações por alterações relevantes, mesmo sem usuário com a tela aberta; desligado por padrão ainda requer uma leitura de configuração por evento de preço. Isso é custo adicional necessário para garantir revogação no servidor.

Quatro índices compostos propostos em `firestore.indexes.json`: `centralObservacoes(bucketId ASC,dataMs DESC)`; `centralObservacoes(resumoId ASC,dataMs DESC)`; `centralObservacoes(bucketId ASC,precoOrdenacao ASC,dataMs DESC)`; `estabelecimentos(precoOrdenacao ASC,dataMs DESC)`. Projeções `dados` dispensadas de indexação em observações/apoios/estabelecimentos, pois as consultas usam metadados dedicados. Nenhum índice foi publicado. Emulador não comprova disponibilidade dos índices de produção.

### Arquivos e testes

Backend: `functions/central-precos.cjs`, `functions/central-precos-dominio.cjs`, exportações específicas em `functions/index.js`, `linhaFiscal` em `functions/cupom-operacoes.cjs`, base `functions/dados/municipios-ibge.json` e sua proveniência `README.md`. Segurança/índices: `firestore.rules`, `firestore.indexes.json`.

Interface: `PrecosCidade.jsx`, `MunicipioCampos.jsx`, `CentralPrecosGestao.jsx`, `CentralPrecosEditor.jsx`, entrada em `ComprasModulo.jsx` e seção administrativa em `Admin.jsx`; `src/styles/central-precos.css`. Serviço/cache: `src/services/centralPrecos.js`, `src/utils/centralCache.js`, evento de troca de conta em `src/services/auth.js`.

Testes: `tests/central-precos.test.js`, `tests/central-precos-emulador.test.cjs`, regressões de catálogo/categorias, farmácia/No Bolso e importação/compra sem preço. Domínio/cache: tipos inelegíveis, especificações/GTIN/unidades, datas, desconto não comprovado, cache simultâneo/offline/expiração/persistência/sessão/recusa de autorização. Emulador: padrão/permissões, consulta por outro grupo sem contribuir, projeção sem dados privados, cidade da filial diferente da conta, nota duplicada entre grupos, replay/concorrência, retirada com outro apoio, progresso/revogação/retomada, origem excluída/corrigida, item corrigido com revisão, reconciliação de estabelecimento, construção, preços antigos, página de histórico e menor preço com cursor, regras negando acesso direto.

Lint sem erros/avisos. Builds PWA e `mobile-release` aprovados; PWA conserva módulo de cuidados e Android reduzido confirma `modulosSaude:0` em `output/central-precos-android/edicao-build.json`. Aviso preexistente de import estático/dinâmico do push no PWA permanece não impeditivo. Não foi gerado/instalado APK nem alterado AAB/versão/chave. Conferência visual local dos controles iniciais em 360 e 1440 px, sem overflow; capturas `output/central-precos-validacao/tela-360.png` e `tela-1440.png`. Tela isolada usa componentes reais com indicação de fixture; não equivale à validação física nem a um teste autenticado ponta a ponta do callable pelo APK. Handlers foram executados diretamente nos emuladores; cliente SDK foi usado para testar regras. Não se declara funcionamento de triggers na nuvem antes da implantação futura.

### Limitações e validação restante

- Validar no Android físico teclado, navegação, persistência offline e sessão da Central após build instalado em rodada autorizada. Confirmar o ciclo real de eventos/callable e índices no ambiente que vier a ser aprovado; nenhuma publicação agora.
- Clientes Android antigos continuam usando seus contratos privados e não acessam a nova Central pela UI; campos novos são aditivos. Não foi alterada a edição reduzida ou restaurado cuidado no Android.
- Desconto global sem preço líquido por item e notas antigas sem linha fiscal comprovada permanecem impedidos, com motivo. Vínculos incorretos exigem revisão explícita; nunca se decide equivalência por nome.
- Base estática tem 5.571 municípios e fonte oficial, sem licença nominal identificada no endpoint. Licenciamento documentado sem atribuir CC por suposição; confirmar termos nominais de redistribuição antes de publicar. Ver `functions/dados/README.md`.
- Validar limites/consumo com tráfego real antes de aumentar páginas/tentativas. Hashes de origem não são anonimização irreversível; proveniência interna continua protegida.

## Textos propostos — não publicados

### Política de privacidade / aviso de contribuição

“A Central de Preços por Cidade é opcional para contribuir. Somente o administrador do grupo pode ativar a contribuição, após revisar o aviso e as correspondências dos produtos e estabelecimentos. Nesta versão podem participar compras confirmadas de Supermercado e Material de construção. É possível consultar a Central sem contribuir.

Outros usuários autenticados poderão consultar produto e especificação comercial, preço efetivamente pago por unidade, unidade/conteúdo comparável, estabelecimento, município/UF e dia da compra. Não mostramos comprador, funcionário, grupo, CPF, nota fiscal, chave, documentos, URLs, quantidade total comprada, total da nota ou observações pessoais. Guardamos internamente os vínculos de origem e o aceite do administrador para deduplicar, corrigir e retirar contribuições. Esses registros protegidos não representam anonimização irreversível.

Desativar impede novas contribuições. As anteriores permanecem consultáveis até sua retirada ou invalidação da origem. O administrador pode solicitar retirada das anteriores e acompanhar o processamento por lotes em Gestão, retomando pendências. As compras privadas não são apagadas pela retirada da Central. Uma mesma observação pode continuar disponível se existir outra contribuição válida e independente. Especificações comerciais sem vínculo público com o grupo podem permanecer no catálogo. Resultados salvos no dispositivo podem permanecer por 15 minutos e, sem conexão, aparecer desatualizados com aviso. Não garantimos eliminar cópias já obtidas por destinatários.

A cidade é a do estabelecimento, confirmada por código IBGE/UF; essa função não consulta GPS. Preços são observações de compras anteriores, não oferta atual ou garantia de disponibilidade. A Central e sua preferência não alteram o funcionamento da integração No Bolso. Para questões de privacidade e exclusão, permanece o atendimento por Anderson Costa e Silva, andersoncsilva84@hotmail.com, conforme procedimento de solicitações do AP1303.”

### Segurança dos dados — proposta de atualização

| Categoria da Play | Tratamento desta função | Finalidade/opcionalidade |
|---|---|---|
| Informações financeiras → Histórico de compras | Derivados de compras enviados ao servidor e, com aceite, compartilhados com outros usuários autenticados (produto/preço/estabelecimento/cidade/dia). Sem nota/total/quantidade total | Funcionalidade do app; contribuição opcional, consulta independente |
| Informações pessoais → IDs de usuário | Autor do aceite/revisões e vínculo interno da origem; não exibidos à comunidade | Segurança, autorização, auditoria e retirada; login necessário para acesso |
| Localização | Esta função usa município do estabelecimento e filtros, não localização do aparelho. Não reclassificar esse município como GPS pessoal por suposição | Conferir junto às declarações existentes de localização do ponto, que não foram removidas |

Não considerar outros usuários como simples prestadores de serviço nem presumir isenção de compartilhamento; declarar a nova finalidade/compartilhamento de histórico de compras. Firebase permanece prestador de hospedagem/autenticação/execução; não foi incluído provedor externo de preços. A base IBGE é embutida, não recebe consultas do usuário. Não mudar as declarações de dados sensíveis já existentes em campos livres/documentos nem a resposta global de criptografia do aplicativo apenas porque esta nova API utiliza HTTPS. As páginas e declarações efetivamente publicadas não foram alteradas nesta rodada; proposta requer revisão antes da implantação.

## Plano seletivo de implantação e recuperação — não executado

1. Confirmar termos de redistribuição da base e aprovar o aviso/política/declarações da nova função. Preservar a configuração desligada por ausência, sem criar consentimento por script.
2. Publicar somente índices novos e isenções descritas, aguardar prontos, e as regras necessárias. Conferir projeto real explicitamente; nunca usar o default não relacionado do `.firebaserc`.
3. Publicar `centralPrecos` (callable us-central1) e os 15 handlers específicos de eventos na região do Firestore southamerica-east1: `centralEvento{colecao}{Grupo|Legado}` para coleções comprasPrecos, comprasListas, catalogoCompras, supermercados, centralVinculos, centralLocais e comprasAssociacoesOperacoes; mais `centralExecutarLote`. Verificar correspondência dos recursos e autenticação, sem abrir IAM indiscriminadamente. `comprasOperacao` também precisa atualização seletiva para persistir a linha fiscal original das novas importações; `comprasRelatorio` e No Bolso não precisam deploy desta função.
4. Testar somente grupos/dispositivos fictícios autorizados: consulta autenticada/negada, contribuição/desativação/reconciliação, cursores e retirada. Confirmar índices reais, entrega do trigger e isolamento. Não fazer histórico real por padrão.
5. Publicar PWA/avisos aprovados e, em outra autorização, preparar Android conforme versão real vigente. A compatibilidade com o Android antigo é aditiva; não enviar nada à Play automaticamente.
6. Em falha: manter contribuição desligada, registrar erro/lote e retomar explicitamente após corrigir. Se já houver aceite ativo, administrador pode desativar e retirar em lotes; não apagar compras privadas, não reconstruir índices com varredura global. Origem/projeção é transacional, checkpoints são retomáveis e o processamento é idempotente. Corrigir e publicar apenas componentes afetados. Cache expira em 15 minutos; não limpar filas de ponto ou dados do usuário para resolver apresentação.

Nenhum deploy, compartilhamento de histórico real, instalação, migração, serviço provisionado, commit, push ou alteração no repositório No Bolso foi realizado nesta rodada.

Fechamento da execução: testes unitários finais 11/11; emuladores de regressão 11 testes/subtestes aprovados, e a Central foi novamente validada após a proteção contra reenvio de continuação e ordenação por preço (2/2, sem skips). Lint/builds aprovados; verificações de sintaxe e `git diff --check` sem erro de conteúdo. Foram parados os emuladores e servidor visual usados nesta execução; viewport do navegador restaurado e aba fictícia fechada. A aba original do PWA foi preservada. A versão publicada permanece sem esta Central.


## Publicação concluída — 28-10-2026

Este registro substitui as pendências de licenciamento e de publicação descritas nas seções históricas acima.

### Pendências resolvidas e escopo

- Licença: não foi comprovada licença nominal de redistribuição do endpoint IBGE. A cópia foi substituída integralmente por Municípios Brasileiros, Kelvin S. do Prado, sob MIT, com copyright/licença integral em `functions/dados/LICENSE-municipios.txt` e `/licencas/municipios.txt`. 5.571 códigos únicos/27 UFs; somente código IBGE, nome e UF. Proveniência, transformação e SHA-256 em `functions/dados/README.md`. A UI atribui a fonte e oferece a licença; não atribui MIT à API do IBGE.
- Preço líquido: o contrato fiscal atual não comprova desconto líquido por linha. Qualquer desconto global positivo impede a contribuição, inclusive se houver campo avulso `totalPagoItemCentavos`. Não se usa rateio, nem se altera a compra privada. Motivo curto na prévia; caso coberto nos testes e na homologação real.
- Escrita técnica por consulta mantida: limite distribuído e transacional de 30 chamadas remotas/minuto/usuário para controlar abuso e custo entre instâncias. Uma leitura e uma escrita no mesmo documento técnico por chamada admitida; recusas por limite não escrevem. Documento reaproveitado, sem histórico por consulta, payload fiscal, coordenadas ou rotina de limpeza/TTL. Cache válido não chama o backend nem escreve; cursores de paginação têm escrita própria limitada a 16 posições por usuário. Não é escrita financeira/de compra.
- Segurança: sessão resolve grupo e perfil ativo; só admin altera contribuições. Regras diretas fechadas e respostas com lista explícita de campos comerciais. Login é obrigatório; consulta independe de aceite. Consentimento inexistente permanece desligado; não existe script de ativação ou importação retroativa em grupos reais.
- Correção encontrada na homologação: reconciliação por alvo ignorava contribuições pendentes (`ativa:false`) mesmo depois da origem ser corrigida. Passou a reavaliá-las nos lotes direcionados, preservando a exclusão das retiradas intencionais (`Contribuição desativada`). Teste direcionado reproduziu e validou a correção; os dois executores de lotes precisam da revisão corretiva.
- Textos de privacidade descrevem compartilhamento com outros usuários autenticados, origem interna protegida, consentimento desligado por padrão, desativação versus retirada, apoio independente, cache e limites de revogação. Sem promessa de anonimização irreversível, preço atual ou alteração do No Bolso.

### Verificações e custos

Lint aprovado. Unitários Central 3/3. Emuladores: 5/5 casos da Central/contexto/No Bolso; nova execução Central 2/2 após correção real, sem skips. Builds PWA e mobile-release aprovados; Android reduzido continua `modulosSaude:0`. Nenhum APK instalado ou AAB/Play alterado. Aviso preexistente sobre chunk push estático/dinâmico permanece não impeditivo.

Métricas instrumentadas continuam: contribuição desligada 1 leitura/0 escritas; primeira publicação 14 leituras/5 escritas; replay 10/0; consulta com uma filial 6/1 e uma chamada. São contagens lógicas em emuladores, não faturamento medido. Consultas paginadas acrescentam documentos e cursor; índices por preço podem cobrar entradas de índice. Sem polling, listeners permanentes, Scheduler, upload de notas/PDFs ou serviço externo por pesquisa. Persistem as leituras de contexto do resolvedor existente, inclusive leitura de perfil repetida; não se declara sua remoção.

### Isolamento da entrega

Build de publicação em `output/central-publicacao/dist`: conserva a Central e as funcionalidades anteriores do PWA, inclusive cuidados; não antecipa vales parcelados nem alterações do PDF de cuidados da outra rodada. As fontes originais com esses trabalhos continuam preservadas. Regras de publicação foram comparadas com a versão remota: somente as negativas da Central foram adicionadas; proteções de folha ainda locais não foram publicadas. `comprasOperacao` recebeu apenas o contrato aditivo de linha fiscal e dependências já autorizadas. Nenhum handler de folha/cuidados/No Bolso foi implantado.

Destinos conferidos: `ponto-app-1c55a` (Firestore `southamerica-east1`), callable `us-central1`; site Netlify `ponto1303`, ID `cf66ee21-9935-4013-8043-1471c62694e7`, https://ponto.acstech.dev.br. Publicação manual não bloqueia CD: um próximo push à branch de produção pode substituí-la.


### Resultado final publicado

- Netlify final **6ae27e7479a13c8cd87d28ca**, produção/ready, https://ponto.acstech.dev.br; manifesto `a77aa605bf09364e66a5`. Deploy inicial `6ae27dab6e4b524eaf4ddceb` foi substituído pelo ajuste pontual do roteador: o menu existia, mas `/lista-compras/cidade` ainda não era reconhecida por `ehRotaCompras`. Corrigido em PWA/Android e coberto por teste de admin/funcionário/consulta e rejeição de caminhos arbitrários. Não houve rollback, limpeza de cache local ou remoção de pendências.
- Rotas `/`, `/cadastro`, `/admin`, `/lista-compras/catalogo`, `/lista-compras/cidade`, `/privacidade/` e `/licencas/municipios.txt` responderam 200. A verificação HTTP foi complementada pelo navegador autenticado: botão da Central, rota carregada e consulta Belém/PA concluída sem erro, com catálogo compartilhado vazio após retirada dos dados fictícios. Sessão e navegação de cuidados preservadas. Captura em `output/central-precos-validacao/pwa-central-publicada.png`.
- Regras: ruleset **177ee430-fd3d-43a7-a86c-898e5b6f4775**. Quatro índices novos prontos. Dois overrides anteriores ausentes do arquivo local foram preservados pelo CLI; não se usou `--force` para removê-los.
- Functions: `centralPrecos` revisão **centralprecos-00002-tuv**, `centralExecutarLote` **centralexecutarlote-00002-wap**, `comprasOperacao` **comprasoperacao-00026-nec**; 14 eventos `centralEvento{coleção}{Grupo|Legado}` ativos na primeira revisão. Identificadores completos em `output/central-functions-publicadas.json`. Somente os dois executores receberam o deploy corretivo. O callable tem invocação HTTP pública restrita ao handler autenticado/autorizado; anônimo e perfil sem autorização foram recusados na homologação.
- Homologação final via **callable HTTPS real e triggers de produção**, com dois grupos exclusivos `central_homolog_mvsppy1b_a/b`: desligado por padrão; admin versus consulta; tentativa de usar grupo alheio ignorada/recusada; publicação deduplicada entre grupos; ausência dos campos pessoais da fixture; correção retirando só um apoio; desconto global impedido na prévia/evento; origem privada preservada; correção reavaliada; revogação/retirada concluídas. Resultado em `output/central-homologacao-remota.json`. O primeiro ensaio revelou o defeito de reavaliação e está preservado em `output/central-homologacao-diagnostico.json`.
- Limpeza conferida por API: os oito logins efêmeros dos dois ensaios foram removidos, zero remanescentes; os quatro grupos foram inativados, com contribuição desligada e sem observações ativas compartilhadas. A limpeza inicial pelo SDK não havia removido os logins; foi concluída via API oficial, verificando os vínculos antes de excluir somente contas fictícias. Evidência em `output/central-limpeza-homologacao.json`. Nenhuma conta, compra ou consentimento real foi alterado, nem histórico real importado.
- Testes finais de rota/Central/compras **8/8**; lint aprovado; builds finais PWA isolado e Android reduzido aprovados. O teste em emulador da correção de reconciliação passou **2/2**; regressões de catálogo e No Bolso já passaram no conjunto de **5/5**. Não somar reexecuções como casos distintos.

### Limitações e custo da implantação

Contribuição continua opcional e desligada sem aceite; não há dados reais enviados retroativamente. Notas com desconto global permanecem impedidas enquanto o contrato não importar comprovação fiscal por linha. Histórico e resultados em cache podem atrasar a apresentação da retirada até a expiração (15 minutos), ou ser exibidos offline como desatualizados. Links/licença são públicos; preços exigem login. A base municipal é uma fonte alternativa licenciada, não promessa de atualização contínua pelo IBGE.

PWA com cuidados preservado; Android antigo conserva os contratos existentes. A Central não foi instalada/testada fisicamente no Android nesta rodada, nem enviada à Play. Correções de vales parcelados/PDF de cuidados permanecem locais. Nenhum commit ou push.

A implantação usa Functions, Firestore/índices, execução de builds, armazenamento dos artefatos e tráfego Netlify já existentes; esses recursos podem gerar cobrança conforme uso. Não foi habilitada cobrança nova nem criado Scheduler/serviço externo recorrente. As transações podem repetir leituras; contagens em emulador não substituem medição faturável. A homologação acrescentou somente operações temporárias sobre fixtures, autenticação e consultas direcionadas, sem rotina contínua de diagnóstico.


## APK atualizado para teste local — 29-10-2026

Gerado `output/AP1303-central-precos-2026-10-29.apk` (5.981.979 bytes), AP1303 / `br.dev.acstech.ap1303` / 1.0.0 / código 2. O código 2 é reutilizado exclusivamente no artefato local, sem afirmar disponibilidade para nova submissão à Play. Não houve AAB novo, instalação, deploy, alteração de faixa, commit ou push nesta execução.

O build usa a fonte isolada correspondente ao PWA publicado, incluindo Central e rota corrigida. Não antecipa vales parcelados/PDF de cuidados pendentes de backend. Edição Android reduzida preservada (`modulosSaude:0`); Firebase `ponto-app-1c55a`, sem emuladores/host remoto/mixed content/worker web. Assets release preparados separadamente dos assets main/debug. Conferência dos arquivos efetivamente compactados no APK aprovada.

Assinatura de upload existente validada por apksigner; certificado SHA-256 `D000F2D0DF9AC8DF6D0F1B1BCF2EA8F01C09F53E9C3DCFC837C9437691156734`. Não é uma nova chave nem promessa de compatibilidade com assinatura gerenciada pela Play. Não desinstalar/limpar dados para forçar instalação; nenhum aparelho foi alterado.

SHA-256 do APK: `C67AF95E9297056F1F16A78055903F5B05F51E952E3548A63A8BE020C39FAACC`.

Build Vite mobile-release aprovado; oito testes direcionados de Central/rota/guards/release aprovados; Gradle `assembleRelease`, incluindo lint vital e validação de distribuição/assinatura, aprovado (JDK21, cache offline). Verificação de manifesto: nome/package/versão, minSdk24 e targetSdk36 corretos. Avisos preexistentes de flatDir/depreciação Gradle/Java não impediram o build. Sem alterações funcionais adicionais ou repetição de suíte completa. A validação física deste APK atualizado permanece pendente. Build local não invoca Firestore/Functions nem acrescenta consumo recorrente.
