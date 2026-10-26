# Script 01 — Diagnóstico técnico do AP1303 para Android e iOS

## A. Resumo executivo e recomendação de arquitetura

**Recomendação: reaproveitar o frontend React/Vite com Capacitor, preservando o backend Firebase e as regras de negócio existentes. A aplicação ainda não está pronta para submissão às lojas.** A maior parte das telas, cálculos, validações de domínio, geração de PDFs e serviços autenticados pode permanecer compartilhada. Os recursos do aparelho exigem adaptação explícita; empacotar o site não transforma Web Push, localização ou downloads em integrações nativas.

O principal trabalho anterior ao empacotamento é tornar o ponto resiliente à perda da resposta e definir seu comportamento offline. Hoje a marcação é exclusivamente online: usa horário do servidor, identidade validada e transação Firestore, mas não tem protocolo de idempotência entre chamadas, fila persistente ou reconciliação de operações pendentes. Não se deve anunciar ponto offline com o código atual.

Também faltam projetos Android/iOS, identificadores e versionamento nativos, fluxo de exclusão da própria conta, política de privacidade acessível e validação em aparelhos. Push nativo requer novo cadastro de dispositivos e payloads próprios. A base de grupos possui controles de servidor e testes de isolamento; isso não equivale a uma auditoria de segurança completa.

**Resultado desta etapa:** inspeção e documento. Nenhum código funcional, dependência, regra ou serviço de produção foi alterado. Não houve deploy, migração, notificações reais, commit ou push.

## B. Revisão analisada, data e limites

| Item | Registro |
|---|---|
| Repositório | `https://github.com/AnderCSilva84/pontov3.git` |
| Branch local | `master`, acompanhando `origin/master` |
| Commit | `aabad8a5d08a634d0d4a3f82c997cbeb314bf952` |
| Data da análise e consulta das fontes | 22/10/2026, America/Fortaleza |
| Estado inicial | Árvore de trabalho limpa |
| Instruções locais | Não foram encontrados `AGENTS.md` no projeto, subdiretórios ou ancestrais consultados. O roteiro anexado rege esta etapa. |
| Ambiente observado | Windows, PowerShell, Node `20.20.0`, npm `10.8.2` |
| Arquivo de entrega | Este documento, inicialmente inexistente |

Classificações usadas:

- **Leitura:** caminho ativo e comportamento identificados no código; não representa execução em produção.
- **Teste:** comportamento exercitado pela suíte existente, em memória ou em emuladores conforme indicado.
- **Hipótese/aparelho:** consequência ou integração que ainda exige reprodução, configuração externa ou teste físico.

Não foram acessados consoles de produção, contas reais, certificados ou credenciais. Não foi auditado o repositório do No Bolso nem o painel das lojas. As validações históricas descritas nos documentos da raiz não foram tomadas como prova nesta rodada. Sem aparelhos Android/iOS, não há comprovação de comportamento de WebView, câmera, retomada, compartilhamento ou entrega de notificações nativas.

## C. Mapa da arquitetura com caminhos reais

| Área | Código ativo e responsabilidade |
|---|---|
| Entrada | `index.html` → `src/main.jsx` → `src/App.jsx`; React StrictMode, estilos globais e `src/styles/redesign.css` |
| Navegação | `AppConteudo`, `normalizarRota`, `navegarPara` em `src/App.jsx`; `pushState`, `replaceState`, `popstate`; autorização visual em `src/utils/rotas.js` e `src/utils/roles.js` |
| Identidade | `src/services/firebase.js` inicializa Auth, Firestore e Functions; `src/services/auth.js` faz login, observa vínculo/perfil, cria usuários e realiza logout |
| Grupos | `src/services/dadosGrupo.js` prefixa caminhos; `App` remonta a árvore por UID/grupo; `functions/grupos-contexto.cjs` resolve o banco por vínculo confiável do usuário |
| Ponto | `src/pages/Ponto.jsx`, `src/services/ponto.js`, `src/utils/localizacao.js`; callable `registrarPonto` em `functions/index.js`, domínio em `functions/ponto-validacao.cjs` |
| Compras | `src/pages/ListaCompras.jsx` reexporta `src/components/ComprasModulo.jsx`; serviços em `src/services/compras.js`; operações em `functions/compras.cjs`, domínio, estimativas e cupom nos arquivos `functions/compras-*` e `functions/cupom-*` |
| Comparação | `ConsultaPreco.jsx`, `ProdutoAutocomplete.jsx`, `ComprasGraficos.jsx`, `GastosCompras.jsx`; gráficos SVG, agrupamentos e cálculos em `src/utils/compras*.js` |
| Tarefas | `src/pages/Tarefas.jsx`, `AgendaTarefas.jsx`, `ResumoTarefas.jsx`; parte das escritas usa diretamente Firestore, limitada pelas regras |
| Lembretes/cuidados | `src/pages/Lembretes.jsx`, `LembreteNotificacao.jsx`, `src/services/lembretes.js`; `functions/lembretes.cjs`, `lembretes-cuidados.cjs`, `lembretes-dominio.cjs`, `lembretes-link.cjs` |
| Prato do dia | `src/components/PratosDia.jsx`, `src/utils/fotoPrato.js`, `functions/pratos-dia.cjs`; operações pelo callable de lembretes, sem cron de notificação de pratos |
| Escritório | `src/pages/Admin.jsx`, `Financeiro.jsx`, `MeusComprovantes.jsx`; `src/services/folhaPagamento.js`, `functions/folha-pagamento.cjs`, `folha-calculos.mjs`, `pagamentos-especiais.cjs` |
| PDFs e compartilhamento | `src/utils/exportarPdf*.js`, `exportarReciboFinanceiro.js`, `comprovantes.js`; jsPDF/AutoTable, Blob/File, Web Share e links |
| No Bolso | `src/pages/NoBolsoConnection.jsx`; `functions/compras-api.cjs`, `compras-api-dominio.cjs`, `no-bolso-functions.cjs`, `no-bolso-bridge.cjs`, `no-bolso-product-catalog.cjs` |
| Push | `NotificacoesPush.jsx`, `src/services/push.js`, `public/firebase-messaging-sw.js`, `functions/push.cjs`; scheduler de cuidados em `functions/lembretes.cjs` |
| Dados/autorização | `firestore.rules`, `firestore.indexes.json`; `functions/index.js` agrega exports e exige identidade/perfil nos fluxos principais |
| Build e hospedagem | `package.json`, lockfile, `vite.config.js`, `netlify.toml`: build estático em `dist`, fallback SPA para `index.html` |
| PWA | `public/manifest.json`, ícones, metadados em `index.html`; único worker encontrado é o de mensagens |
| Testes | `tests/`, `firebase.compras-emulator.json`, scripts do `package.json`; Node Test Runner, emuladores Auth/Firestore e execução direta dos handlers |

### Ativo, legado e documentação

- A lista atual é `ComprasModulo`; `ListaCompras.jsx` é um ponto de entrada compatível, não um segundo módulo em funcionamento.
- Coleções raiz sem grupo e gatilhos antigos permanecem como compatibilidade. `bancoDoUsuario` usa a raiz quando não existe vínculo e a manutenção não está bloqueada. `functions/grupos-migracao.cjs` e `scripts/migrar-grupo.cjs` cuidam da migração, não do uso diário.
- A migração preserva nomes históricos como `botState` e `telegramNotificacoes`. Isso não demonstra um bot ativo. No código examinado, WhatsApp aparece como destino de compartilhamento, não como integração de mensagens do app.
- Documentos da raiz (`NOTIFICACOES_PUSH.md`, `GRUPOS_E_PERMISSOES.md`, `CUPONS_FISCAIS.md`, entre outros) descrevem decisões e entregas anteriores. O código e os testes atuais são a evidência deste diagnóstico.
- Não há dependências Capacitor nos manifests/lockfiles, projetos `android`/`ios`, configuração Capacitor ou workflow em `.github/workflows` no checkout.

## D. Funcionalidades confirmadas, incompletas e não verificadas

| Achado | Evidência e comportamento | Impacto | Ação recomendada | Classificação |
|---|---|---|---|---|
| Marcação por funcionário | `registrarPonto`, regras de `dias`/`registros`; admin não pode marcar, vínculo funcionário/UID é verificado | Preserva autoria; interface sozinha não é o controle | Reutilizar servidor na adaptação | Leitura + testes `tres-frentes-emulador`/`grupos-emulador` |
| Compras colaborativas e histórico | `ComprasModulo`, `compras.cjs`, estimativas, relatórios e cupom; gravação/finalização pelo backend | Reaproveitamento alto | Validar apenas pontes de câmera/arquivo e regressões móveis | Leitura + testes de domínio/emulador; consulta real à SEFA não feita |
| Lembretes e pratos | Operações em `lembretes*.cjs` e `pratos-dia.cjs`; destinatários e autoria no servidor | Reutilizável, mas envio e apresentação são etapas diferentes | Adaptar transporte push e links; validar agenda no aparelho | Leitura + testes com envio simulado |
| Folha e comprovantes | `Financeiro`, `folha-pagamento.cjs`, cálculos e PDFs; fluxo de preparação/fechamento | Dados sensíveis e exportação exigem cuidado no cache e compartilhamento | Preservar cálculos e autorização; adaptar arquivos | Leitura + suíte existente; sem auditoria contábil/legal |
| No Bolso | API HTTP valida identidade de servidor antes das rotas; ponte usa códigos temporários e vínculos | Não pode ser convertida em API pública direta do app | Manter comunicação servidor a servidor e consentimento | Leitura + testes da ponte/API; outro app não inspecionado |
| Ponto offline | Não há outbox, estados persistentes ou chave por marcação | Não existe aceitação offline durável | Script 02, conforme seção L | Leitura; cenário físico não testado |
| Recursos nativos | Não há configuração nem plugins nativos | Não existe APK/AAB/IPA reproduzível a partir deste checkout | Script 03 após confiabilidade do ponto | Leitura |
| Autoexclusão/recuperação de senha | `excluirUsuario` bloqueia próprio UID; não encontrado fluxo `sendPasswordResetEmail` | Bloqueia ciclo completo de conta para distribuição ampla | Implementar em etapa própria, sem confundir exclusão administrativa com autoexclusão | Leitura |
| Teste manual de push | `testarNotificacaoPush` em `functions/push.cjs` referencia `destino` sem definição nesse handler e usa `usuario(request)` sobre banco raiz | O botão/endpoint de teste não é uma prova confiável para contas de grupo; há defeito concreto no código | Corrigir e cobrir especificamente antes de usar como diagnóstico de push | Leitura; não invocado e não corrigido nesta etapa |

## E. Diagnóstico detalhado de ponto e offline

### E1. Fluxo rastreado

1. `Ponto.jsx` calcula `podeRegistrar` a partir do perfil. Para administradores há seleção de funcionário para consulta e ausência de botão de marcação.
2. `handleClick` recusa jornada em carregamento/com erro/encerrada e usa `registroEmAndamento.current` para bloquear um segundo toque na mesma instância.
3. `obterPosicaoAtual` chama `navigator.geolocation.getCurrentPosition` com alta precisão e `maximumAge: 0`; timer próprio de 10 segundos evita espera infinita. Em falha recuperável tenta rede/baixa precisão por mais 10 segundos. Permissão negada encerra sem segunda tentativa.
4. `registrarAcao` chama `httpsCallable(functions, 'registrarPonto')` com funcionário, tipo e coordenadas. Não envia horário capturado no aparelho, accuracy, chave de operação ou versão esperada da jornada.
5. `registrarPonto` exige Firebase Auth; `bancoDoUsuario` resolve grupo pelo vínculo do UID, não por grupo arbitrário enviado no payload.
6. O backend captura `new Date()` uma vez antes da transação, define dia e hora em `America/Fortaleza` e lê usuário, funcionário, locais permitidos e jornada dentro da transação.
7. Exige perfil ativo `funcionario`, `funcionarioId` correspondente, funcionário ativo e coordenadas dentro do raio de pelo menos um local ativo permitido. `aplicarAcao` valida sequência e calcula fechamento.
8. A transação grava o resumo determinístico `dias/{funcionarioId}_{dataKey}` e um documento aleatório em `registros`, com autor UID, nome do funcionário, coordenadas, distância, hora e timestamp do servidor.
9. A resposta contém `ok`, `dataKey`, `hora`. A interface então relê o dia e o banco de horas antes de mostrar sucesso. Há também um `onSnapshot` da jornada diária que pode atualizar a tela independentemente da resposta do callable.

**Classificação:** fluxo confirmado por leitura; identidade, geofence básica, regras e gravação comprovadas para cenários dos testes existentes. Não foi feito registro real.

### E2. Relógios e datas

- A marcação confirmada usa relógio do processo servidor, com `FieldValue.serverTimestamp()` como auditoria de gravação. A hora `HH:mm` não é fornecida pelo cliente; timestamps preservam informação além dos minutos.
- `RelogioPonto.jsx` mostra **horário atual do dispositivo**, formatado em Fortaleza. Não é relógio sincronizado com o backend nem a hora de saída. A lista abaixo mostra campos efetivamente salvos da jornada.
- Há diferença de normalização no cliente: `src/services/ponto.js/getDataKey` fixa Fortaleza, mas `Ponto.jsx/dataKeyDeDate`, rótulo de data e vários `getDay()` usam fuso do aparelho. Em aparelho com fuso diferente, principalmente perto da meia-noite, a consulta diária e a ação podem divergir do dia do servidor. **Leitura confirmada; reprodução em aparelho pendente.** Unificar a data operacional é parte do Script 02; não alterar retroativamente registros.
- O domínio atual representa uma jornada por data e não implementa explicitamente expediente atravessando meia-noite. Testar/definir essa regra antes de ampliar público; não assumir suporte.

### E3. Sequência e concorrência

`ponto-validacao.cjs/proximaAcao` e `aplicarAcao` exigem entrada → saída para intervalo → retorno → saída, com caminho sem intervalo para sábado ou configuração correspondente. Impedem repetir entrada, pular etapas, regredir hora e reabrir jornada encerrada. A saída calcula minutos, saldo e encerra o dia.

O bloqueio React é apenas local. A transação do Firestore serializa alterações concorrentes do resumo. Duas requisições com o mesmo tipo não devem aplicar a mesma transição duas vezes: a segunda encontra sequência inválida ao reexecutar. Contudo, isso é **rejeição de repetição por estado**, não idempotência: não devolve o resultado original nem identifica a operação perdida. Testes unitários cobrem sequência; não foi encontrado teste específico de concorrência de duas marcações iguais nem de resposta perdida.

### E4. Servidor gravou, resposta não chegou

O ID de `registroRef` é criado fora do callback transacional, portanto permanece estável nas repetições internas daquela transação. Em outra chamada HTTP, um novo ID é gerado. Não há `chaveOperacao` ou recibo consultável por operação.

Se o servidor confirmar o commit e a conexão cair antes da resposta, `handleClick` entra no erro genérico. O snapshot pode posteriormente mostrar a marcação, mas a interface não distingue esse caso de uma rejeição efetiva. Uma falha na releitura do dia ou cálculo do banco de horas, após sucesso do callable, também cai no mesmo `catch`.

**Impacto:** incerteza para a funcionária e risco de acionar a próxima etapa achando que repetiu a anterior. A integridade transacional existente não resolve essa ambiguidade de UX. **Prioridade P1; confirmado por leitura, reprodução de falha de transporte pendente.** Recomenda-se protocolo de operação idempotente e separar confirmação do ponto de atualização dos resumos.

### E5. Sem internet, persistência e estados

| Pergunta | Situação no checkout |
|---|---|
| É possível confirmar ponto sem servidor? | Não. O caminho depende de um callable remoto. |
| Há bloqueio explícito de rede antes do GPS? | Não em `registrarAcao`/`handleClick`; outros módulos têm mensagens baseadas em `navigator.onLine`. |
| Existe fila local de ponto? | Não encontrada. |
| Há retries persistentes? | Não; a tentativa manual é uma nova chamada. Retry interno de transação não é fila offline. |
| O pedido sobrevive ao encerramento do app? | Estado do componente não. Se já houve commit, o dado existe no servidor e pode ser relido depois. |
| Há distinção pendente/confirmado/rejeitado? | Não persistente. Há loading, mensagens e resumo do dia. |
| Cache pode aparentar jornada atual? | `onSnapshot` não usa `fromCache`/metadados como prova de frescor; não há estado explícito de jornada confirmada versus cópia em memória. |
| Firestore persiste documentos entre aberturas? | O projeto usa `getFirestore`, sem habilitar persistência web; a documentação indica cache em memória como padrão. Não afirmar persistência de jornada por reinício. |
| PWA abre offline do zero? | Não foi encontrado app shell offline: worker de mensagens não trata `fetch`, não mantém Cache Storage nem precache de assets. Cache HTTP eventual não garante abertura offline. |
| Mudança de conta com pendências? | Não há fila para isolar. A árvore é remontada por UID/grupo, mas uma chamada já enviada pode terminar após logout; não há protocolo de reconciliação. |

`ConnectionStatus` em `src/components/ui/index.jsx` observa `navigator.onLine` e exibe texto de conexão; isso não comprova alcance do servidor nem existência de alterações duravelmente enfileiradas. A documentação do [Firestore offline](https://firebase.google.com/docs/firestore/manage-data/enable-offline) diferencia cache/persistência; mesmo habilitá-los não enfileiraria este callable.

### E6. Localização e confiança

Coordenadas válidas e distância são conferidas no backend, mas os valores são fornecidos pelo cliente. Não há validação de idade/precisão da amostra nem prova contra GPS adulterado. A interface ignora `accuracy` retornada pelo navegador. A regra atual atende à verificação básica de raio, não à certificação de presença física. Preservar essa distinção no produto e no próximo contrato; não prometer antifraude por instalar Capacitor.

Para offline, um horário declarado pelo aparelho não pode substituir silenciosamente o horário confiável do servidor. O contrato proposto está na seção L.

## F. Matriz de adaptação web / Android / iOS

Legenda: **R** reaproveitável; **A** precisa de adaptação; **V** precisa de validação em aparelho. As combinações indicam trabalho em partes diferentes do mesmo recurso.

| Recurso e evidência | Web atual | Android com Capacitor | iOS com Capacitor | Decisão mínima |
|---|---|---|---|---|
| React/Vite, `vite.config.js` | R, build passou | R + V | R + V | Empacotar assets locais de `dist` por `webDir`, mantendo a Netlify para web; não depender de `server.url` remoto em produção |
| History API, `App.jsx` | R | A + V | A + V | Preservar roteador simples; integrar abertura/restauração de caminho e query sem reescrever módulos |
| Voltar do sistema | Navegador | A + V | V para gestos/retorno | `@capacitor/app`: fechar modal primeiro, voltar na pilha e tratar raiz explicitamente; não registrar listener que elimine o comportamento padrão sem substituição |
| Links de notificação e inicialização | URL same-origin no worker | A + V | A + V | Centralizar resolução permitida de rota; tratar inicialização a frio e app já aberto; esperar Auth/perfil antes de ações |
| No Bolso | Tela com código de uso único | A + V | A + V | Preservar pareamento manual como fallback; retorno automático não existe; validar deep link entre os dois apps sem transportar credenciais na URL |
| Login email/senha | R | R + V | R + V | Começar preservando SDK web; testar persistência na origem local e rever origens/chaves permitidas; não presumir sessão compartilhada com Safari/Chrome |
| Localização, `localizacao.js` | R | A + V | A + V | Adapter com `@capacitor/geolocation`; permissão em uso, timeout e feedback; sem localização contínua de fundo |
| QR Code, `ImportarCupom.jsx` | ZXing + jsQR/getUserMedia | V; A se necessário | V; A se necessário | Manter parsing/validação de cupom; avaliar scanner nativo se a leitura web não atender. `Camera` para foto não substitui um scanner QR |
| Foto de prato | File input/canvas | V | V | Manter redução; testar seletor e formatos do aparelho, sem pedir acesso amplo à galeria desnecessariamente |
| Geração de PDF | R, jsPDF | R | R | Mesmo conteúdo/cálculos; desacoplar somente destino/abertura do arquivo |
| Blob, download, `navigator.share` | R onde suportado | A + V | A + V | `@capacitor/filesystem` + `@capacitor/share` para arquivo temporário e compartilhamento por URI; limpeza posterior; adaptar também `pdf.save` |
| Links externos, SEFA, mailto/WhatsApp | Navegador/`target=_blank` | A + V | A + V | Abrir fora do WebView conforme tipo; permitir apenas destinos esperados, não executar URL arbitrária dentro do app |
| Clipboard | `navigator.clipboard.readText` | V/A | V/A | Preservar colar manual; avaliar adapter se API indisponível; sem leitura contínua de clipboard |
| Push e tokens | FCM web + worker | A + V | A + V | Separar plataforma/transporte, eventos e ciclo de conta; ver H |
| Service Worker | Mensagens, sem app shell | A | A | Não inicializar Web Push/worker como se fosse ambiente navegador dentro do binário; ativos empacotados seguem versão do app |
| Offline | Sem ponto offline durável | A + V | A + V | Outbox e reconciliação compartilhadas, armazenamento por plataforma; ver L |
| Teclado/safe areas | CSS usa `env(safe-area-inset-*)`, `100dvh` | V/A | V/A | Testar teclado sobre modais, scroll, status bar, orientação e retorno do background; `redesign.css` sobrescreve padding superior, e viewport não declara `viewport-fit=cover` |
| Ambientes | Modo `compras-test` conecta emuladores só em DEV | A | A | Build nativo de teste também precisa configuração segura; `vite build --mode compras-test` sozinho NÃO habilita emuladores, pois DEV é falso |

### Camada mínima proposta, ainda não implementada

Um módulo de capacidades/adapters chamado pelos serviços existentes basta: localização, leitura QR se necessário, exportar/compartilhar arquivo, push e ciclo de navegação. As telas e os cálculos não precisam conhecer o transporte de cada plataforma. O backend continua sendo a autoridade de identidade, grupo, sequência e cálculo. A outbox do ponto merece contrato próprio, sem virar uma arquitetura genérica para todos os módulos.

A documentação consultada apresenta **Capacitor v8**; é candidato para o planejamento, não uma versão já adotada ou compatibilidade comprovada. [Ambiente oficial](https://capacitorjs.com/docs/getting-started/environment-setup): Node 22+, macOS/Xcode para iOS e ferramentas Android. O Node 20 local está abaixo desse requisito; Node 24 das Functions é outro runtime. Não atualizar nada nesta etapa. Fixar versões compatíveis de core, plataformas e plugins com lockfile no Script 03 e validar também requisitos Android/Xcode da versão escolhida.

Plugins oficiais avaliados: [App](https://capacitorjs.com/docs/apis/app), [Geolocation](https://capacitorjs.com/docs/apis/geolocation), [Filesystem](https://capacitorjs.com/docs/apis/filesystem), [Share](https://capacitorjs.com/docs/apis/share), [Push Notifications](https://capacitorjs.com/docs/apis/push-notifications). A compatibilidade documentada dessas APIs não substitui ensaio no projeto. O [Barcode Scanner](https://capacitorjs.com/docs/apis/barcode-scanner) é uma alternativa condicional; a documentação v8 exige `minSdkVersion` 26 para esse plugin. Isso não é uma definição automática do Android mínimo do AP1303 nem do target exigido pela loja.

## G. Autenticação, grupos e privacidade

### Controles e lacunas

| Achado | Evidência/comportamento | Impacto | Ação | Classificação |
|---|---|---|---|---|
| Login efetivo | `auth.js/login`: email/senha; não encontrados provedores sociais | Pode permanecer compartilhado | Testar sessão e renovação em cada WebView | Leitura |
| Persistência da sessão | `getAuth` + `onAuthStateChanged`, sem `setPersistence` próprio | SDK mantém persistência padrão onde suportada; origem do binário difere da web | Testar fechar/reabrir, reinstalar, token expirado e conta desativada | Leitura + hipótese/aparelho |
| Recuperação | Não há fluxo de recuperação de senha no cliente examinado | Usuário pode ficar sem acesso | Incluir recuperação e retorno de link na etapa de identidade | Leitura |
| Titular/membros | `CadastroGrupo`, `cadastrarTitular`, `grupos.cjs/criarGrupo` e `criarMembro`; grupo é determinado pelo UID/vínculo, criação tem mecanismos de retomada/idempotência | Boa base multiusuário, sem limites comerciais | Manter criação no servidor; políticas de plano em rodada própria | Leitura + testes de grupos |
| Isolamento | Paths por grupo nas regras; `bancoDoUsuario` verifica vínculo, grupo ativo e perfil; `registrarPonto` valida próprio funcionário | Controles reais no servidor e leitura Firestore | Preservar e ampliar testes ao adicionar endpoints offline | Leitura + testes de regras/callables |
| Perfil inativo | Observer retorna sem perfil; backend/regras recusam `ativo:false` | Acesso funcional interrompido; observer não faz `signOut` explicitamente | Definir limpeza de dados locais e revogação de dispositivos no ciclo de conta | Leitura; teste cobre recusa em cenários existentes |
| Logout | `logout` tenta revogar push e executa `signOut` mesmo se a remoção falhar; árvore desmonta | Não há limpeza explícita geral de storage, PDFs exportados ou cache do SDK | Definir retenção local, não apagar outbox pendente silenciosamente | Leitura |
| Grupo atual | Um vínculo por UID; não há seletor/múltipla associação; root fallback para legado | Evolução não deve pressupor troca livre de grupo | Em qualquer troca futura, invalidar operações e separar fila/token por contexto | Leitura |
| Exclusão | `excluirUsuario`: admin exclui Auth, perfil/vínculo, desativa funcionário e escreve auditoria; não apaga todo histórico, bloqueia próprio UID/titular | Não satisfaz autoexclusão; Auth e batch Firestore não são uma transação única | Fluxo de solicitação/reautenticação, retenção e recuperação de falha, sem remover registros legais arbitrariamente | Leitura |
| Consulta | Permissões visuais e regras não são idênticas em todos os módulos; regras de tarefas exigem admin, embora configuração visual admita criação para consulta | Não apresentar perfil como contrato único sem matriz por operação | Consolidar matriz UI/backend com testes antes de ampliar público | Leitura; alcance de UX a validar |

A [persistência Firebase Auth](https://firebase.google.com/docs/auth/web/auth-state-persistence) é por origem. Não concluir que a sessão PWA será herdada pelo aplicativo nativo. Configurações autorizadas, restrições de API key, domínios e templates de email dependem de console não inspecionado.

### Inventário de dados observado, sem declaração legal pronta

- Identidade e vínculo: nome, email, UID, perfil, grupo, funcionário; senha é enviada ao Firebase Auth e, na criação administrativa, passa pela Function de criação. Não foi encontrada gravação da senha nos documentos examinados.
- Ponto: horários, local autorizado, latitude/longitude, distância, autor e histórico; captura em uso, sem rastreamento contínuo encontrado.
- Trabalho/financeiro: cadastros de funcionário, campos de identificação utilizados nos recibos, salários, descontos, folha, pagamentos e links de comprovantes.
- Cuidados: nomes de pessoas/pets, medicamento, posologia, agenda, responsáveis e conclusões. Podem envolver informações sensíveis e crianças; a revisão de tratamento/retenção exige decisões do responsável e avaliação adequada, não inferência a partir do código.
- Compras: itens, marcas, categorias, preços, mercado, cupom/chave/URL e autor; consulta externa à SEFA e compartilhamento consentido para No Bolso.
- Foto opcional do prato: redução em canvas e imagem no Firestore. Comprovantes cadastrados usam link do arquivo; o campo `storageBucket` na configuração não demonstra upload ativo para Firebase Storage.
- Dispositivos: token push, UID, timestamps e recibos de envio; identificadores/telemetria adicionais dos SDKs devem ser conferidos na configuração final. Não encontrados Analytics ou Crashlytics ativos nos imports examinados; isso não elimina dados operacionais dos provedores.

Não há política de privacidade/suporte acessível por rota ou link no cliente examinado. Os formulários das lojas devem refletir o inventário real, finalidades, terceiros, retenção, exclusão e SDKs selecionados, inclusive No Bolso e hosts externos dos comprovantes. A autorização Firestore de um documento que contém URL não comprova proteção do arquivo hospedado em outro serviço.

## H. Push e recursos do aparelho

### H1. Caminho web atual

`NotificacoesPush` tenta reconexão após login, retorno à aba e evento online, respeitando preferência manual. `push.js` solicita permissão no gesto do login, registra worker com configuração pública e UID e obtém token FCM web. O callable `registrarDispositivoPush` exige UID autenticado e perfil ativo, resolve grupo e salva `pushDispositivos/{sha256(token)}` com token, UID e atualização. Não salva plataforma, transporte ou ID estável da instalação.

O backend seleciona dispositivos de usuários ativos; ponto notifica somente administradores e apenas entrada/saída, verificando autora e funcionário. Cuidados usam agenda por ocorrência, supervisão administrativa e regras de expediente para funcionárias; admins habilitados não ficam limitados ao expediente. O scheduler roda a cada minuto. A confirmação do cuidado pelo link passa por autorização e gesto na interface; tocar não conclui automaticamente.

O payload é `data` + opções `webpush` de TTL/urgência. O worker gera `showNotification` em background; foreground usa `onMessage`. UID do payload é comparado com o UID da sessão/worker. `notificationclick` restringe origem, navega/foca janela ou abre outra; para lembretes, a URL carrega a ocorrência e destinatário, com verificação posterior no backend. A ação “Ver e concluir” abre a tela, não executa cuidado em segundo plano.

**Confirmação:** leitura e testes de destino/permissões e envio simulado. Nenhuma notificação real enviada nesta etapa; recebimento no aparelho não comprovado por estes testes.

### H2. Deduplicação, retries e ciclo de conta

- `pushEventos` usa lease e conclusão por evento, `pushEnvios` usa hash de evento/dispositivo/UID. Erros transitórios geram retry e tokens inválidos são removidos com conferência de proprietário.
- O sucesso significa aceitação pelo provedor, não leitura pelo usuário nem exibição garantida no horário. Existe janela entre envio aceito e gravação do recibo: falha nessa janela pode reenviar. Não é entrega exatamente uma vez; `tag` ajuda na apresentação web, sem garantia geral nativa.
- `expiresAt` nos recibos não comprova política TTL ativa no console; retenção efetiva não foi verificada.
- Logout tenta `unsubscribe`, `unregister`, remoção remota e `deleteToken`. `tokenAtual` é apenas memória: após recarga ou antes da reativação ele pode estar vazio. Falha de rede/remoção não impede sair. Revisar identificação persistente da instalação e revogação recuperável; testar falhas parciais e recebimento atrasado após troca de conta.
- O worker compara UID, mas não grupo. Mudança futura do vínculo do mesmo UID exige limpeza do contexto anterior; não presumir que a atual chave de UI revoga tokens antigos.
- Remoção de perfil desativado não é limpeza completa de notificações já entregues pelo sistema. Conteúdo de saúde pode aparecer em tela bloqueada: avaliar texto mais discreto e preferências específicas.
- Defeito do endpoint de teste descrito em D fica registrado para correção futura. A documentação antiga que o apresenta como operacional não resolve o código atual.

### H3. Separação web/Android/iOS

**Não reutilizar o token Web Push como token nativo.** A [API oficial Push Notifications](https://capacitorjs.com/docs/apis/push-notifications) distingue token FCM no Android e APNs no iOS. O APNs token não pode ser enviado diretamente ao atual `admin.messaging().sendEach` como se fosse FCM.

Para reduzir divergência do backend, a proposta é usar FCM também para o aplicativo iOS, com integração nativa validada que obtenha token FCM e credencial APNs configurada no Firebase. A alternativa é transporte APNs separado, a ser decidido na etapa push. A [documentação Firebase para Apple](https://firebase.google.com/docs/cloud-messaging/ios/get-started) orienta configuração APNs/FCM; nenhum plugin adicional de ponte iOS foi escolhido ou teve compatibilidade comprovada aqui.

O payload atual depende de JavaScript/Service Worker para exibir dados. A documentação do plugin alerta limitações de data-only com app encerrado no Android e silent push no iOS. Planejar alerta visível apropriado ao sistema (`notification`, `android`, `apns`) e evitar duplicar banner em foreground. Armazenar plataforma/transporte/instalação/contexto de conta, tratar rotação, permissão negada, canais Android e eventos de abertura. Não criar uma segunda regra de destinatários no cliente.

### H4. Câmera, arquivos e retomada

`ImportarCupom.jsx` abre vídeo sem áudio, tenta câmera traseira, enumera câmeras e combina ZXing/jsQR; faz cleanup dos streams. A consulta da nota é feita no backend por endpoint SEFA restrito em `cupom-consulta.cjs`, com timeout, limite de tamanho e fallback de texto, sem executar HTML. Testes usam respostas simuladas, não notas reais. A migração não exige transportar esse fetch para o celular.

PDFs permanecem gerados em JavaScript; o trecho a trocar é `navigator.share`, Blob URL, download/`pdf.save` e abertura externa. [Share](https://capacitorjs.com/docs/apis/share) compartilha URIs de arquivos e tem restrições de diretório no Android. [Filesystem](https://capacitorjs.com/docs/apis/filesystem) exige também avaliação do Privacy Manifest no iOS. Não salvar documentos sensíveis indefinidamente em diretórios públicos nem usar Blob URL como arquivo compartilhável entre apps.

Para retomada: testar permissão negada/revogada, câmera interrompida por chamada, retorno do seletor de foto com processo recriado, teclado em modal e reinício após logout. [App/deep links](https://capacitorjs.com/docs/guides/deep-links) oferece eventos de ciclo, mas o app ainda não os implementa.

## I. Comandos, testes e limitações

Scripts foram lidos antes da execução. As dependências já estavam instaladas; foram conferidas com `npm ls --depth=0` na raiz e em `functions`. Não houve reinstalação, atualização de lockfile ou correção automática. Versões resolvidas observadas incluem React/DOM 19.2.4, Vite 7.3.7, Firebase web 12.10.0, Admin 13.10.0 e Functions 7.1.0. Runtime de produção declarado nas Functions: Node 24; o teste local Node 20 não comprova comportamento idêntico nesse runtime.

| Comando | Resultado desta execução | Limite |
|---|---|---|
| `git status`, `rev-parse`, buscas de instruções | Revisão identificada, árvore inicialmente limpa | Não trocou branch nem modificou histórico |
| `npm ls --depth=0` / `npm --prefix functions ls --depth=0` | Ambos concluíram sem dependência inválida reportada | Não equivalem a instalação limpa do repositório em outra máquina |
| `npm run lint` | Aprovado, exit 0 | Configuração principal cobre JS/JSX; CJS/MJS não têm cobertura equivalente, `functions/index.js` desabilita ESLint e o script próprio de Functions apenas imprime “lint ignorado” |
| `npm test` | 106 testes contabilizados: 92 aprovados, 14 ignorados, 0 falhas | Ignorados incluem testes condicionados aos emuladores; não são cobertura nativa |
| `npm run build` | Aprovado, Vite 7.3.7, saída em `dist` | Não produz Android/iOS; não confirma login em WebView nem configurações externas |
| `npm run test:compras:integracao` | 63 aprovados, 0 falhas, 0 ignorados; exit 0 | Auth/Firestore locais em `demo-ap1303` e subprojetos demo de isolamento; handlers `.run`, não deploy de Functions |

A suíte de integração usa `firebase emulators:exec --project demo-ap1303 --config firebase.compras-emulator.json --only firestore,auth` e os arquivos já listados no `package.json`. Endpoints locais: Firestore 8877, Auth 9098. As chamadas de envio push dos testes relevantes são substituídas por funções simuladas; nenhum token real foi usado. Testes de cupom injetam respostas, sem consulta de nota real. Emuladores encerrados pelo runner ao concluir.

Cobertura relevante: sequência de ponto e distância (`ponto.test.js`); timeout/fallback/permissão de GPS com objeto simulado (`localizacao.test.js`); próprio funcionário e recusa de admin/inativo/local errado (`tres-frentes-emulador.test.cjs`); regras e isolamento de grupos, cadastro e migração (`grupos*-emulador.test.cjs`); cupom e bruto/líquido; lembretes, doses e expediente; autoria/destino de pratos; ponte No Bolso; URL/ocorrência de notificação. Falta teste de resposta perdida do ponto, fila offline, persistência por encerramento, concorrência de chamadas de ponto e testes físicos.

Avisos dos emuladores sobre múltiplos project IDs são coerentes com testes que usam projetos `demo-*` distintos. Aviso de endpoint VSCode indisponível e bloqueios de segurança esperados nos cenários negativos não resultaram em falha da suíte. Não foram ajustados testes para fazê-los passar.

Buscas iniciais com globs de caminho literais no PowerShell e leituras de arquivos opcionais inexistentes falharam por forma de consulta/ausência; as buscas foram refeitas por diretórios e nomes efetivamente encontrados. São limitações de inspeção, não falhas de build ou do app.

## J. Riscos e pendências priorizados

Nenhum acesso cruzado indevido ou perda de registro confirmado foi demonstrado como **P0** nos cenários desta rodada. Isso não garante ausência de vulnerabilidades. Um protocolo offline que confirme sem persistir ou atribua pendência a outra conta introduziria P0 e não deve ser liberado.

| Prioridade | Achado, evidência e classificação | Impacto | Ação recomendada |
|---|---|---|---|
| P1 | Sem chave de ponto/recibo e confirmação ambígua; E4, leitura | Bloqueia ponto confiável sob conexão instável | Script 02: idempotência + reconciliação; separar commit do refresco de resumo |
| P1 | Sem ponto offline, outbox e app shell; E5, leitura | Bloqueia divulgação de suporte offline e uso sem rede | Script 02: contrato, persistência e UX honesta; shell web mínimo para reabertura, sem cache genérico de dados sensíveis |
| P1 | Dia do aparelho versus Fortaleza; E2, leitura | Pode consultar dia incorreto ou apresentar ação divergente | Unificar data operacional e testar virada/fuso |
| P1 | SDK web de push e payload data-only; H3, leitura/documentação | Bloqueia avisos nativos com app fechado | Adapter/transporte nativo e ensaios físicos |
| P1 | `testarNotificacaoPush` usa `destino` indefinido e perfil raiz; D/H, leitura | Bloqueia o teste manual como ferramenta confiável | Correção isolada e teste de conta de grupo, sem envio real na fase diagnóstica |
| P1 | Sem autoexclusão, política acessível e recuperação de senha; G, leitura | Ciclo de conta incompleto e bloqueios de submissão | Fluxos de identidade, política/retensão e suporte antes das lojas |
| P1 | Sem binários/configuração e Node local abaixo do requisito candidato; F, leitura/documentação | Não há artefato nativo nem build iOS neste ambiente Windows | Preparar ambiente sem confundir runtime do backend com toolchain mobile |
| P1 | `.firebaserc` tem default de outro projeto; `firebase.json` permite deploy geral; leitura | Risco operacional de publicar no destino errado em etapa posterior | Comandos com projeto explícito e guarda antes de qualquer release; nenhum deploy aqui |
| P1 | Ambientes de teste condicionados a DEV; `firebase.js`, leitura | Build de teste pode apontar para produção sem intenção | Configuração explícita e bloqueios verificáveis de destino nos Scripts 03/12 |
| P2 | Limpeza local/tokens em falha e mudança de vínculo; G/H, leitura e hipótese de cenários | Exige cobertura antes de novos fluxos de troca de conta | Casos negativos de logout/rotação, armazenamento mínimo e expiração |
| P2 | HTTP aceito para link de comprovante em `urlComprovante`; leitura | Link externo pode não ter transporte protegido/abrir em WebView | Rever política de URLs/arquivo na adaptação sem quebrar comprovantes existentes |
| P2 | Lint parcial, sem CI declarada e versão `0.0.0`; leitura | Menor reprodutibilidade/controle de release | Gate de qualidade e versionamento quando preparar empacotamento |
| P2 | Nome PWA “APP PONTO 3.0”, título “App Ponto”, marca AP1303; leitura | Identidade inconsistente na distribuição | Consolidar nomes e gerar assets nativos na etapa visual |

### Preparação para as lojas — situação e referências

| Item | Situação observada | Pendência |
|---|---|---|
| Nome e ícone | `manifest.json`, `icon-192.png`, `icon-512.png`, marca `ap1303.jpeg` | Nome final, ícones/máscaras, splash, ícone monocromático de push e screenshots por loja |
| IDs e versões | Sem applicationId/bundle identifier; package web `0.0.0` | Definir identificadores próprios, versionName/versionCode e equivalentes iOS; não inventados nesta análise |
| Privacidade/suporte | Não encontrados no cliente | Publicar documentos e URLs válidas após confirmar inventário/finalidades/retenção; campos das lojas devem corresponder aos SDKs finais |
| Conta e exclusão | Cadastro de titular/membros existe, autoexclusão não | Separar exclusão de acesso de retenção de histórico e dados pessoais |
| Permissões | Web pede localização para ponto, câmera QR, notificação e clipboard por gesto | Descrições nativas específicas e permissões mínimas; sem microfone ou localização contínua identificados |
| Revisão | Só dados e contas fictícias nos testes locais | Conta/modalidade demonstrativa própria, sem pacientes/funcionários reais e sem exigir presença no endereço operacional para reviewer testar |
| Assinaturas/planos | Não encontrados Billing/StoreKit, gateway de contratação ou enforce dos limites comerciais | Modelar depois conforme oferta; registros de pagamentos da folha não são compra de assinatura do app |
| Configuração externa | Firebase, FCM/APNs, domínio, API No Bolso e SEFA | Validar consoles, credenciais de assinatura, origens e apps vinculados em etapa autorizada |

Fontes oficiais consultadas em 22/10/2026: [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) exige utilidade além de um site reempacotado e acesso para revisão; a existência de Capacitor não garante aprovação. [Apple: exclusão de conta](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion/) orienta iniciar exclusão no app quando há criação de contas. [Google Play: exclusão](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en) inclui caminho no app e recurso web aplicável. [Google Play: Data safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en) deve refletir também bibliotecas e SDKs. Reavaliar regras e target SDK efetivamente vigentes no momento da submissão, sem fixar neste diagnóstico um número de API ou afirmar conformidade legal.

## K. Sequência recomendada dos Scripts 02 a 12

Sequência proposta para planejamento; não descreve trabalho já autorizado para implementação por este documento.

| Script | Escopo concreto | Condição de saída |
|---|---|---|
| 02 | Confiabilidade do ponto: operação idempotente, reconciliação, datas coerentes e captura offline explícita | Critérios de L aprovados no web/emulador; sem alegar validação nativa |
| 03 | Base Capacitor, toolchain compatível, assets locais e ambientes separados | Android e iOS de desenvolvimento reproduzíveis; armazenamento nativo da outbox definido e ensaiado |
| 04 | Identidade e ciclo de conta: sessão, reset de senha, logout, exclusão e matriz por grupo | Fluxos negativos cobertos; política de pendências ao sair; nenhuma migração implícita |
| 05 | Localização nativa e ponto em aparelho | Permissões, precisão/timeout, retomada, fuso e ausência de rede demonstrados em Android/iPhone |
| 06 | Câmera/QR, foto e importação de cupom | Scanner viável no aparelho, fallback de link/texto, validação fiscal compartilhada e sem duplicação |
| 07 | Exportar, abrir e compartilhar PDFs/links | Arquivos em diretório adequado, compartilhamento nativo, limpeza e regressão dos documentos existentes |
| 08 | Push nativo e correção do endpoint de teste | Token/transporte corretos, destinatários por grupo, abertura a frio, logout e foreground/background testados |
| 09 | Deep links completos e retorno No Bolso | Rotas permitidas após login, pareamento consentido e comunicação servidor a servidor preservados |
| 10 | UX e regressão móvel completa | Teclado, safe areas, voltar, acessibilidade/zoom, offline e processos interrompidos conferidos em dispositivos |
| 11 | Preparação de loja e negócio | Privacidade/suporte/exclusão, identidade, versão, demo e definição dos planos/assinaturas se fizerem parte da oferta |
| 12 | CI, assinatura e distribuição controlada | Builds reproduzíveis, testes internos/TestFlight, checklist e autorização específica antes de publicar |

As etapas 04 e 11 podem preparar documentos e decisões em paralelo ao desenvolvimento independente, mas push nativo e teste de aparelho dependem de base Capacitor e identidades corretas. Não instalar plugins antecipadamente para “preparar” sem esses contratos.

## L. Escopo proposto e critérios de aceite do Script 02

**Objetivo:** uma tentativa de ponto deve ter identidade própria, resultado recuperável e estado local honesto, mesmo se a rede cair. Reutilizar a validação atual e não liberar escrita direta em `dias`/`registros` pelo cliente.

### L1. Contrato mínimo

- Gerar uma `operacaoId` aleatória uma única vez no gesto e persistir antes do primeiro envio. Payload imutável vinculado ao UID, contexto de grupo conhecido na captura, funcionário, tipo, instante capturado, fuso/offset e coordenadas com precisão/idade quando disponíveis. Não armazenar senha ou token de sessão na fila.
- O grupo efetivo continua derivado do UID no backend. O grupo da captura é uma condição a comparar, não um seletor de banco confiável. Se o vínculo mudou, recusar reconciliação automática.
- Recibo da operação e gravações do dia/log devem ser atômicos. Repetir o mesmo ID e payload retorna o mesmo resultado; mesmo ID com payload diferente é conflito. Registrar versão do contrato e considerar IDs determinísticos/limites de retenção dos recibos.
- Manter a sequência validada no servidor. Uma nova operação não pode ser gerada automaticamente porque a anterior ficou sem resposta. O cliente consulta/reenvia a operação original e só depois oferece a próxima ação.
- Diferenciar erro de transporte, rejeição de negócio e erro de atualização de resumo. Um resumo que falhou após commit não transforma ponto confirmado em falha de marcação.

### L2. Tempo offline, ordem e conflitos

O modelo precisa preservar `capturadoEmDispositivo` e `recebidoEmServidor`, além do instante de commit. **O horário declarado pelo aparelho não é autenticado.** Na primeira versão proposta, marcações online mantêm horário atual do servidor como oficial; capturas feitas sem conexão entram como **pendentes de validação**, sem compor automaticamente jornada/folha até análise das regras e, quando necessário, revisão administrativa auditada.

Não substituir pelo horário da sincronização uma entrada capturada horas antes, nem aceitar retroatividade ilimitada. Definir janela máxima, tolerância de relógio, precisão/localização e política para jornada já encerrada, ajuste administrativo concorrente, conta desativada e dia diferente. Sem regra suficiente, apresentar conflito para revisão, preservando payload e motivo. Administração pode revisar a pendência com trilha, não criar uma marcação normal se passando pela funcionária.

Fila em ordem por proprietário/funcionário, com uma operação em trânsito por jornada. Reconectar e retomar o app dispara tentativa com backoff e jitter; não prometer sincronização em segundo plano com app encerrado. Conflitos bloqueiam eventos posteriores dependentes até resolução. Sem amostra de localização válida, exibir impossibilidade ou rascunho para revisão, nunca comprovar presença inexistente.

### L3. Persistência e isolamento

Outbox web transacional em IndexedDB, pequena e limitada, com falha de persistência exibida antes de anunciar “salvo no aparelho”. Registrar estados `pendente`, `enviando`, `confirmado`, `conflito`, `rejeitado` e recibo. Metadados de cache não substituem recibo do servidor.

Para reabrir PWA sem rede é necessário um app shell mínimo versionado; o worker atual só faz mensagens. Cachear assets do frontend é diferente de cachear dados autenticados. Não habilitar persistência global de documentos de saúde/folha sem desenho de retenção e limpeza.

No futuro binário, usar adapter de persistência durável adequado, validado em encerramento/reinício. A [orientação de armazenamento Capacitor](https://capacitorjs.com/docs/guides/storage) alerta sobre possível remoção de LocalStorage/IndexedDB por WebView e distingue Preferences para pequenos valores de alternativas de banco local. Portanto, não prometer a mesma durabilidade nativa só por reutilizar IndexedDB; escolha/versionamento de plugin fica condicionada à etapa de base nativa.

Ao sair, avisar sobre pendências e preservá-las com isolamento por conta/contexto; não enviá-las pela próxima sessão. Definir descarte explícito e retenção máxima, sem perda silenciosa. Depois de logout, nenhuma tela deve exibir dados da fila de outra pessoa. Login da mesma conta retoma reconciliação; grupo diferente exige tratamento explícito.

### L4. Critérios de aceite verificáveis

1. Dois toques/chamadas concorrentes com a mesma operação geram um único registro e o mesmo recibo. ID repetido com payload alterado é recusado.
2. Falha após commit e antes da resposta é recuperada por ID, com uma única marcação; interface distingue confirmação de erro no carregamento do resumo.
3. Captura pendente persistida sobrevive a fechar/reabrir no ambiente web testado. Se armazenamento falhar, não se informa que a operação está guardada.
4. Captura offline nunca aparece como confirmada pelo servidor. Sem rede, a interface informa o que foi apenas salvo localmente e o que ainda depende de revisão.
5. Ordem de eventos, jornada já encerrada, alterações concorrentes, relógio adulterado/fuso, virada do dia e ausência de GPS têm resultado explícito e auditável, sem aplicar evento a outra data silenciosamente.
6. Funcionário inativo, grupo inativo/mudado, admin e conta de consulta não conseguem confirmar marcação indevida. Logout/login de outra conta não envia nem mostra pendências do primeiro usuário.
7. Regras continuam bloqueando escrita direta no histórico; testes existentes de compras, folha, grupos e cuidados continuam passando.
8. Implementação em ambiente demonstrativo, sem migrar contas nem corrigir horários reais. Critérios nativos de durabilidade e retomada serão repetidos em aparelhos após o Script 03; resultados web não serão apresentados como testes de iPhone/Android.

Este é um escopo proposto, não uma implementação nem autorização para alterar política trabalhista/retroatividade. O Script 02 deve deixar a política conservadora visível em vez de adivinhar uma hora oficial offline.

## M. Informações e acessos externos ainda necessários

1. Disponibilidade de Mac/Xcode ou ambiente de build iOS autorizado e aparelhos de teste; versões mínimas Android/iOS desejadas e modelos reais usados.
2. Titularidade/contas Apple Developer e Google Play, applicationId/bundle ID pretendidos, assinatura e canais de distribuição. Nenhuma conta ou credencial foi criada.
3. Firebase: apps Android/iOS registrados, origens/domínios e restrições de chave, templates de recuperação, APNs/FCM, retenção/TTL, regras e índices efetivamente publicados. Verificar por acesso específico em etapa autorizada, sem presumir igualdade com arquivos locais.
4. Identificação do responsável, contato de suporte e decisões de finalidade/retenção/exclusão, incluindo dados de cuidado de pessoas e histórico trabalhista. Isso fundamentará política e formulários, não o contrário.
5. Política de captura de ponto sem rede: limite temporal, revisão administrativa, turno noturno, precisão mínima e tratamento de justificativas. A proposta conservadora de L permite avançar sem aprovação tácita de marcação retroativa automática.
6. Repositório/contrato atual do No Bolso e seus deep links; cadastro de destinatários/consentimento e separação entre preços compartilhados e dados financeiros individuais. Não requisitar chave de conta de serviço para embutir no app.
7. Ambiente demonstrativo separado para revisão das lojas, inclusive geofence de teste e dados de exemplo não pessoais, câmera com cupom fictício e lembretes sem uso assistencial real.
8. Definição comercial futura dos planos e forma de contratação. Limites e pagamentos não são implementados por este diagnóstico; exigências das lojas devem ser rechecadas quando houver oferta concreta.

**Próxima ação recomendada:** executar o Script 02 restrito a confiabilidade/idempotência do ponto e contrato de pendências offline, com testes locais de perda de resposta. Preparar Capacitor vem depois, preservando a aplicação e os dados atuais.
