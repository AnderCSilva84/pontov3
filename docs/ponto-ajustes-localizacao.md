# Ponto: carregamento, correção administrativa e endereço/mapa

Estado atual: **publicado no PWA em24/10/2026**, deploy `6adcfcbdddb5fb6faf1dc507`. Implementação compartilhada PWA/Android; APK permanece demo. As seções iniciais registram a preparação local e a seção “Publicação validada” descreve o resultado final. Sem commit/push, alteração de jornadas reais nos testes ou uso da chave de upload.

## Diagnóstico e alterações

- Ponto consultava o mês atual duas vezes, o anterior uma vez, relia cadastro em cada cálculo do banco e fazia seis consultas individuais da semana. Esses efeitos também podiam repetir ao carregar a jornada/configuração. Não foi medida latência real do aparelho/rede; isso comprova consultas redundantes, não a única causa de toda lentidão.
- `useResumoPonto` faz uma consulta por funcionária ao período mês anterior + atual, com limite65, reaproveitando o cadastro já lido. Mês, banco e semana são derivados localmente. O dia é atualizado pelo listener existente, sem reler o período a cada marcação; ao virar o dia, a consulta é renovada. Resposta atrasada de outra funcionária é descartada; resumo de outra identidade não é reutilizado. A resposta da correção permite atualizar o resumo sem consulta extra. Limite atingido gera erro, não total incompleto anunciado como exato.
- Rotas secundárias (Gestão, Financeiro, Compras e outras) passaram a carregar por demanda; Ponto continua no caminho inicial. Há Suspense e proteção contra erro de carregamento de rota. Nenhum tempo em segundos foi prometido/medido. Ainda existem listeners anteriores de tarefas/notificações/perfil; esta rodada não auditou ou redesenhou todos os carregamentos.
- O formulário administrativo antigo estava permanentemente escondido por `podeAlterarPonto=false`, coerente com as regras que proíbem escrever diretamente em dias. Não foi simplesmente reativado o código antigo: o novo acesso usa transação autorizada no servidor.

## Correção administrativa

**Ponto → Corrigir e justificar ponto**, após selecionar a funcionária. Também em **Gestão → Ponto, ajustes e locais**, com funcionária selecionada. Somente administrador; funcionário continua registrando suas próprias batidas. Consulta de horários e correção são operações distintas.

Novo componente `PontoAjuste`; ações `detalheDia` e `ajustarDia` no contrato existente `revisarPendenciaPonto`. Suporta horários completos, saída antecipada abonada, falta, atestado, dispensa e férias do dia selecionado. Não implementa lançamento de férias em lote nesta interface. Justificativa obrigatória (5–1000 caracteres), revisão da jornada e confirmação explícita. Falha mantém campos; mesma tentativa reaproveita identificador para recuperar recibo. O servidor calcula totais com as regras existentes, ignora totais informados pelo cliente e exige admin ativo no contexto correto.

Transação em `functions/ponto-ajuste.cjs`: compara revisão do dia; bloqueia folha fechada; salva dia corrigido e auditoria em `ajustesPonto`, com antes/depois, justificativa e autor do token/perfil servidor. Registros originais de batidas não são apagados ou reescritos. Folha aberta recebe `pontoRevisaoPendente` e incremento de versão. Outra correção concorrente é rejeitada para nova conferência. Regras de escrita direta continuam negando alterações do cliente; isolamento/grupos preservados. Não cria registro de batida como se o administrador fosse a funcionária e não dispara o push de batida online.

**Dependência de publicação:** `revisarPendenciaPonto` e seu contexto/dependências Android ainda não estão homologados/publicados no destino final conforme o checklist existente. Não publicar a nova interface sozinha. Atualizar backend seletivamente e validar callable/contas no destino em rodada autorizada; não foi feito deploy de Functions/regras/índices nesta execução.

## Endereço e mapa

Gestão → Ponto, ajustes e locais → Locais Autorizados. Mantidas permissões administrativas existentes. Endereço digitável, botão **Buscar endereço**, escolha explícita de resultado e mapa interativo para ajustar o ponto. Toque marca; arraste navega; zoom e teclado/setas/Enter disponíveis. Coordenadas continuam editáveis e GPS usa o adapter centralizado `obterPosicaoAtual`, incluindo plugin nativo Android. Coordenadas vazias/inválidas não são mais convertidas silenciosamente em zero ao salvar. Endereço é campo adicional opcional no documento do local; sem migração ou alteração dos locais antigos.

Raio configurado permanece inalterado e aparece no mapa. O backend mantém sua geofence; mapa/endereço não autorizam uma batida fora do local. Há fallback para coordenadas/GPS e aviso de falha dos blocos do mapa. Não há geolocalização em segundo plano.

Provedores escolhidos: [Photon, documentação oficial](https://github.com/komoot/photon) para geocodificação e [blocos OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/) para mapa, com atribuição visível. Photon admite uso moderado sem garantia de disponibilidade; buscas limitadas a5 resultados, timeout8s, sem retries automáticos, sem autocomplete remoto, com trava e intervalo mínimo entre cliques. Cache de até30 consultas apenas na memória da tela: não persiste endereços privados entre contas. A busca avisa que o endereço será enviado ao serviço externo; não envia dados de funcionárias, notas, tokens ou credenciais.

Mapa só solicita blocos do viewport quando aberto pelo usuário; usa cache HTTP padrão, sem prefetch/download offline. Android acrescenta identificação AP1303 ao User-Agent da WebView. Nenhum SDK pago, proxy aberto, Function de geocodificação, serviço contratado ou infraestrutura recorrente foi criado. Disponibilidade/precisão/cobertura de terceiros não são garantidas. O Nominatim público não foi integrado: suas exigências específicas não foram presumidas adequadas ao app multiusuário.

## Validação real desta rodada

- 23 testes locais direcionados aprovados; lint dos arquivos alterados aprovado.
- 15 testes no Firestore Emulator aprovados: inclui correção, auditoria/replay, concorrência, folha fechada e outro grupo, mais revisão offline anterior. Depois da resposta final incluir o dia corrigido, repetido somente o teste de integração novo: aprovado.
- Interface React em Chrome headless, cinco verificações: busca explícita/cache sem segunda consulta; seleção de ponto no teclado; sem overflow320/360/1024px; atualização do saldo sem reler mês/cadastro; correção com justificativa/confirmação/sucesso. Photon/blocos/callable simulados na interface; transações testadas separadamente no emulador. Nenhum dado real nem blocos reais baixados pela automação.
- [Captura com mapa e dados fictícios](mobile/capturas/ponto-mapa/mapa-ficticio-360.png). Blocos cinza são deliberadamente simulados, não evidência de geocodificação/mapa externos reais.
- Builds PWA e mobile aprovados; sync Android e assembleDebug aprovados. APK em `android/app/build/outputs/apk/debug/app-debug.apk`, SHA-256 `C7393603D387C4A1D399BAEBA312BD4B8691C747FEDD3CD88B925E4118D64920`.
- Conferido `br.dev.acstech.ap1303.dev`, `0.1.0-dev`/1, nome AP1303 Teste e certificado Android Debug anterior. Sem instalação/limpeza no Samsung e sem validação física nova. Keystore de upload final não utilizada. Primeiro Gradle falhou por SDK não configurado no processo; resolvido apontando ANDROID_HOME ao SDK já instalado, sem atualizar dependências.
- Não executada suíte completa. Sem medição física da abertura do ponto, busca real no aparelho ou validação HTTP do novo contrato no destino final: permanecem pendentes. `dist` final contém build mobile demo; não publicar essa pasta como PWA. Novo deploy PWA exige build de produção e backend compatível.

## Consumo esperado — estimativas, não fatura medida

| Fluxo novo/ajustado | Consumo estimado |
| --- | --- |
| Abrir Ponto | Uma consulta de período limitada a65 documentos + leitura do cadastro já existente e listener do dia; demais listeners preexistentes permanecem. Substitui9 consultas de resumo/semana e duas releituras adicionais de cadastro, antes de repetições dos efeitos. Normalmente não há65 dias/documentos; cobrança depende dos resultados e mínimos das consultas. |
| Dia recebido pelo listener / relógio local | Nenhuma consulta adicional do resumo; atualização e cálculos locais. Listener continua com sua cobrança própria. |
| Abrir editor sem carregar jornada | Zero chamadas do novo contrato. |
| Carregar jornada para corrigir | Uma Function, cerca de6 leituras (contexto3, funcionário, dia e folha), zero escritas. |
| Confirmar correção | Uma Function, cerca de7 leituras (inclui recibo),2 escritas (dia/auditoria), mais1 escrita se houver folha aberta. Transações podem repetir leituras em conflito. |
| Repetir mesma operação | Uma Function, cerca de4 leituras (contexto/recibo), zero escritas. Recibo retorna na resposta, sem consulta prévia extra. |
| Buscar endereço | Zero operações Firestore/Functions; uma requisição HTTPS Photon por busca manual não atendida pelo cache. Mesma consulta na tela usa memória, sem rede adicional. |
| Abrir/navegar mapa | Requisições HTTPS apenas dos blocos visíveis; navegador pode atendê-las pelo cache HTTP. Não confundir esse cache com Firestore. |
| App ocioso / offline | Nenhum polling ou Function nova; rede externa falha com mensagem e sem retry automático. Cadastro de local continua dependendo de gravação autorizada. |

Marcação online/fila/replay de ponto não foram alterados: preservadas idempotência, amostra original, autorização e persistência. Estimativas anteriores permanecem: online8 leituras/3 escritas/1Function; replay4/0/1; primeira sincronização offline6/2/1; fila ociosa0 operações adicionais. Não medidas de fatura nem promessa de cota gratuita. Sem índices adicionais.

Arquivos principais: `src/App.jsx`, `Ponto.jsx`, `Admin.jsx`, `PontoAjuste.jsx`, `LocalMapa.jsx`, `RotaCarregamento.jsx`, `useResumoPonto.js`, `ponto.js`, `pontoRevisao.js`, `pontoSaldo.js`, `mapaLocal.js`, `mapa-local.css`, `functions/ponto-ajuste.cjs`, `functions/ponto-revisao.cjs`, `capacitor.config.json` e testes direcionados. Alterações anteriores preservadas.

## Publicação validada — 24/10/2026

**Publicado no PWA** https://ponto.acstech.dev.br, deploy `6adcfcbdddb5fb6faf1dc507` (prévia validada `6adcfc4948c117ae71e7de38`). Esta seção substitui o estado “não publicado” registrado nas etapas anteriores. Site verificado `cf66ee21-9935-4013-8043-1471c62694e7`; Firebase confirmado `ponto-app-1c55a`. Sem commit/push ou migração de contas/dados.

### Escopo efetivo e compatibilidade

Publicação isolada sobre o PWA anterior `6adcf4e67d596066183aa4c6`, preservando os ajustes de compras/mesclagem. Apenas14 arquivos de frontend alterados/adicionados para carregamento, resumo, editor de correção, mapa e conferência da folha. Não incluídos fila offline Android, exclusão de conta, ações de push ou outras funcionalidades locais ainda pendentes. O registro normal de ponto do PWA permanece no contrato legado autorizado já publicado; sua releitura do dia após marcar foi mantida para não mudar a sequência de registro. O novo resumo não repete as consultas mensais/semanais.

Para não expor a revisão offline fora de escopo, as ações administrativas agora usam a callable dedicada **`ajustarJornadaPonto`** (`detalheDia`/`ajustarDia`), reutilizando o mesmo domínio/transação validados. O servidor rejeita outras ações. Cliente compartilhado Android foi atualizado para selecionar esse endpoint; `revisarPendenciaPonto` continua reservado aos fluxos offline locais anteriores. A versão do backend passou de24 para25 funções: apenas `ajustarJornadaPonto` criada e `salvarFolhaPagamento` atualizada. Nenhuma Function antiga removida ou rotina agendada criada.

A folha publicada foi baixada da revisão `salvarfolhapagamento-00004-tuf` antes do patch. O cálculo atualmente publicado e suas dependências foram preservados: diferença funcional do handler de folha é somente exigir confirmação quando `pontoRevisaoPendente` estiver marcado. Nenhuma mudança de INSS, descontos ou aritmética salarial nesta publicação. O cliente mostra a caixa de conferência correspondente. Folha fechada continua impedindo correção da jornada; folha aberta é sinalizada para revisão.

Índice existente `dias(funcionarioId ASC, dataKey ASC)` conferido READY no projeto; nenhum índice ou regra publicado. Regras atuais foram reutilizadas para cadastro de locais e proteção das jornadas. Não se deve publicar os arquivos de regras/índices locais completos como parte deste pacote.

### Validação executada antes e depois

- 8 testes locais direcionados e lint aprovados nesta fase, reaproveitando a bateria anterior. Sem repetir suíte completa.
- `tests/ponto-publicacao-http.test.js`: SDK Auth/Functions/Firestore reais em emuladores isolados. Login, correção/recibo/replay, auditoria única, revisão da folha, confirmação explícita, local fictício, bloqueio de escrita direta em dia, funcionário e outro grupo. Ações não autorizadas continuam negadas; zero despesa financeira criada. Esse teste usa exatamente o backend isolado preparado para publicação.
- `tests/ponto-publicacao-ui.browser.mjs`: telas completas do PWA com login real no emulador → correção com justificativa pela callable → retorno de sucesso/persistência → Gestão → criação do local pelo endereço/mapa → raio150 preservado; larguras320/360/1024 sem overflow. POSTs de correção responderam200; preflight CORS204 é distinguido corretamente. Endereço/blocos foram simulados nesse ensaio; nenhum endereço de cliente enviado.
- A navegação integrada encontrou `Cannot access 'lazy' before initialization` no servidor Vite: declarações lazy estavam antes da inicialização do import transformado. Ordem corrigida no cliente compartilhado e no pacote isolado; navegação e builds repetidos após essa correção. O erro não foi publicado.
- Provedores externos: uma busca de **endereço público** retornou200/um resultado; com Origin do PWA, Photon retornou `Access-Control-Allow-Origin: *`. Um único bloco mundial OSM retornou PNG200 e cache HTTP. Não houve varredura, prefetch ou ensaio com endereço privado.
- Build PWA de produção aprovado e conferido para `ponto-app-1c55a`; entrada principal caiu de aproximadamente486kB para277kB (gzip145kB→88kB). Isso é tamanho de arquivo compilado, não medição de tempo em aparelho/rede; dependências compartilhadas continuam existindo.
- Prévia: seis rotas/recursos200,47assets por SHA-256 e dois ícones. Worker inalterado e19assets anteriores retidos. Navegador isolado abriu `/ponto` e `/admin` sem sessão e sem erro JavaScript.
- Produção: mesmas conferências de rotas/assets/ícones; `/ponto` e `/admin` renderizam login sem tela branca. Ambas as funções publicadas respondem401/UNAUTHENTICATED a chamadas sem login e CORS para o domínio correto. Nenhuma jornada/conta real foi modificada para testar.

Os avisos400 de módulos não alterados presentes na fixture de navegação não foram usados para declarar validação desses outros módulos; as respostas das duas operações de correção foram verificadas separadamente e responderam200. Não foi executada auditoria/revalidação global do app.

Evidências locais: `tmp/ponto-publicacao/http.log`, `ui.log`, `ui-result.json`, `backend-smoke.json`, `artifact.json`, `public-production.json`, `browser-production.json`, `deploy-functions.log`. Artefato público: https://6adcfcbdddb5fb6faf1dc507--ponto1303.netlify.app.

### Android e limites físicos

APK debug demo atualizado para o novo endpoint e ordem de inicialização: `android/app/build/outputs/apk/debug/app-debug.apk`, SHA-256 `6CBCA2606BBA09B3FC9F41A1FFF3DDCE60BB0F3765EF352BE727699918610443`. Build mobile, sync e assembleDebug aprovados. Identidade/assinatura de teste mantidas; sem instalação, limpeza no Samsung, AAB ou uso da chave de upload. As funcionalidades estão nos componentes compartilhados PWA/Android, mas o APK continua apontando para o ambiente demo. Validação física no celular e medição de latência real seguem pendentes; não foram presumidas a partir de Chrome/emuladores.

### Consumo após publicação

Mantidas as estimativas da tabela anterior: uma chamada para carregar detalhe (cerca de6 leituras, zero escritas), uma para corrigir (cerca de7 leituras e2 escritas, mais1 escrita quando houver folha aberta), replay4 leituras/zero escritas. A função dedicada não adiciona chamada intermediária, usa minInstances0/maxInstances2 e não cria polling/Scheduler. São estimativas de operações, não medição de fatura; transações concorrentes podem reler documentos. A guarda da folha reutiliza o documento lido na transação existente, sem consulta extra.

Mapa: uma busca manual não atendida pelo cache consulta Photon; cache local evita repetir a mesma busca na tela. Blocos usam cache HTTP, sem Firestore/Functions. Endereço acrescenta bytes ao documento de local e pode ter indexação automática padrão; não houve regravação em massa nem índice customizado novo. Infraestrutura de deploy/execução/armazenamento utiliza o projeto existente e pode ter cobrança conforme uso, sem garantia de custo zero ou permanência na cota gratuita.

### Conferência pelo usuário

Reabrir o PWA sem limpar dados/filas. Admin: Ponto → selecionar funcionária → Corrigir e justificar ponto → carregar data → revisar horários e justificar → salvar. Gestão → Ponto, ajustes e locais → Locais Autorizados → endereço → buscar → escolher resultado → conferir marcador/raio → cadastrar. Se uma folha aberta for afetada, revisar horas/descontos e marcar a nova conferência antes de salvar/fechar.
