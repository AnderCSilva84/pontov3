# Script 07 — Notificações Android e ações

Execução: 23/10/2026. Branch `feat/ponto-operacoes-offline`. Alterações locais dos Scripts anteriores preservadas. Sem deploy, produção, migração, commit, push, PR ou alterações no No Bolso.

Continuação: o [Script 08](08-validacao-push-android.md) prepara dados emulados no mesmo projeto dedicado do FCM, sem ativá-lo no APK demo. O roteiro remoto deste documento permanece como alternativa; consultar o [checklist Android](encerramento-android.md) atualizado. Resultados do Script 07 não comprovam entrega real.

## Situação real

Implementados transporte/ponte Android, contratos de cadastro/envio, ações autenticadas de tarefas e cuidados, roteamento e controles locais. O APK continua **demo-ap1303**, com Auth 9098, Firestore 8877 e Functions 5007 via host 127.0.0.1/adb reverse.

**Não houve entrega FCM real.** Não existe `android/app/google-services.json` de projeto Firebase dedicado de teste neste ambiente. O aplicativo informa a falta da configuração e bloqueia obtenção de token, ativação e recebimento FCM nesse destino demo. Nenhum projeto/conta externa foi criado; nenhum token real foi inventado ou enviado. Configurar produção não foi usado como alternativa.

## Diagnóstico e eventos existentes

A inspeção do código confirmou que `testarNotificacaoPush` ainda referenciava `destino` indefinido e validava perfil na raiz. Corrigido para resolver o banco pelo vínculo autenticado e validar perfil ativo no grupo correto. Testes diretos com FCM simulado e callable HTTP com Auth do emulador exercitaram a correção.

Eventos reais encontrados:

- `listaCompras`: item solicitado, legado.
- `comprasListas/{listaId}/itens`: produto adicionado, exceto cópia de migração legado-v1.
- `notificacoes`: eventos criados pela gestão de tarefas.
- `registros`: entrada/saída confirmadas, com autoria de funcionária ativa e vínculo ao cadastro; avisam administradores.
- Scheduler **preexistente** de cuidados: ocorrências de lembretes, destinatários e administradores habilitados, preservando expediente da funcionária e avisos administrativos 24h.
- Teste manual explícito da própria conta.

Não foi criado trigger para fila local de ponto, `pontoOperacoes` ou `pontoPendencias`. `offline_pendente` continua gerando pendência de análise, sem criar registro confirmado nem avisar como ponto aceito. Não foi adicionado segundo trigger equivalente nem novo Scheduler.

## Mecanismo e dependências

Capacitor permanece 8.5.3. Nova dependência Android fixada: `com.google.firebase:firebase-messaging:25.0.1`, versão usada como padrão na documentação oficial v8 do plugin de push consultada. Sem Analytics, publicidade, plugin de notificações locais ou SDK nativo de Auth/Firestore.

A ponte local `PushNativoPlugin` usa o padrão já existente no app. `PushMessagingService` estende FirebaseMessagingService e é o único exibidor Android em background. Isso permite botões personalizados e filtragem nativa antes de exibir, sem depender de uma WebView viva. O plugin básico Capacitor não fornece sozinho esse comportamento com processo encerrado; instalar também o plugin básico criaria uma integração redundante para este caso.

Referências oficiais consultadas:

- [Capacitor Push Notifications v8: versão do SDK e limitações data-only](https://capacitorjs.com/docs/apis/push-notifications).
- [FCM Android: recebimento por FirebaseMessagingService](https://firebase.google.com/docs/cloud-messaging/android/receive-messages).
- [Firebase Android: notas da versão 25.0.1](https://firebase.google.com/support/release-notes/android).
- [Android: autenticação em ações](https://developer.android.com/reference/android/app/Notification.Action.Builder#setAuthenticationRequired(boolean)).

Nova permissão explícita: POST_NOTIFICATIONS. O manifesto mesclado inclui permissões usuais do SDK FCM, como RECEIVE C2DM e WAKE_LOCK transitório; não há alarme exato, tela cheia, localização de fundo ou serviço contínuo criado por esta etapa. Ícone vetorial monocromático `ic_notificacao`. Canais: cuidados, tarefas, compras e ponto.

## Ambiente e privacidade

Firebase Messaging auto-init desativado. Só `getToken` após preferência/permissão e configuração válida. A validação nativa compara o projeto de FirebaseApp ao stamp `mobile-build.json`, exige destino `teste` e recusa o projeto conhecido de produção. Essa verificação também protege o serviço de recebimento com processo frio, não apenas os botões JS.

Gradle verifica package/applicationId `br.dev.acstech.ap1303.dev`, projeto do google-services e stamp. Se um google-services for colocado no build demo, ou pertencer a outro projeto/pacote, a compilação é bloqueada. Não há fallback silencioso.

O logging de payload do Capacitor segue desabilitado no Android, conforme Script 06. Não foram adicionados logs de tokens completos, dados de cuidados, coordenadas ou documentos. O APK não contém credencial administrativa. UIDs/grupo e token necessários à operação ficam em armazenamento privado; backup do app continua desativado.

## Contrato de dispositivos

Web Push continua usando VAPID/Service Worker. Android usa token FCM nativo, `transporte=fcm-android`, `plataforma=android`, versão 1 e UUID de instalação local. Não se converte VAPID/APNs em token Android.

Cadastro valida autenticação, UID do pedido, vínculo confiável, grupo e perfil ativo. Documento nativo no grupo tem identidade estável por instalação. Transação de propriedade nas coleções privadas `pushInstalacoes` e `pushTokensNativos` impede apropriação por outra conta/grupo usando apenas payload. Repetir o mesmo cadastro não regrava o documento; rotação atualiza a mesma instalação e retira a reserva do token anterior.

As regras existentes negam leitura de tokens aos clientes, inclusive administradores; coleções auxiliares novas ficam sob o deny padrão. Isso foi exercitado por HTTP autenticado contra o Firestore Emulator.

ACK local do cadastro guarda token/contexto confirmado, evitando callable em navegação/renderização/retomada sem mudança. `onNewToken` é um evento, não polling; com app encerrado, o token persistido será conferido no próximo vínculo válido. Pedido concorrente é deduplicado. Falha de cadastro pede intervenção/repetição explícita, sem loop indefinido. O teste manual distingue vínculo comprovadamente ausente de intervalo de rate limit; ausência permite invalidar o ACK local e recuperar no próximo gesto de ativar.

Tokens inválidos são removidos por resposta do FCM, com conferência do proprietário e token ainda atuais; reservas auxiliares correspondentes também são removidas. Não existe varredura global ou limpeza agendada nova.

## Permissão e escolha do usuário

Controles ficam em Minha conta → Notificações Android. Ativar é gesto explícito, com explicação do contexto. A permissão do Android e a preferência local por UID/grupo são estados diferentes. Recusa/bloqueio orienta Configurações do Android, sem impedir login, ponto ou outros módulos. O controller não repete automaticamente o pedido após recusa. Desativação explícita é respeitada após reiniciar/navegar.

Não existe chamada de cadastro por `appStateChange`/retomada ociosa. Na abertura com vínculo previamente habilitado, a consulta local/SDK do token usa ACK persistido e só registra se houver mudança ou ausência comprovada.

## Payload e apresentação

PWA preservado: data com título, corpo, URL interna, tag, UID/grupo e headers webpush anteriores. Worker e feature detection web não foram substituídos.

Android: data-only **específico do serviço próprio**, sem objeto `notification`, contendo versão, hash estável do evento, UID/grupo, rota permitida, canal, expiração e, quando aplicável, IDs mínimos da ação. Sem nome de paciente, salário, medicamento, posologia, credencial ou URL arbitrária. FCM Android recebe TTL correspondente ao evento e prioridade alta; cuidados mantêm TTL/urgência existentes. Não se usa collapseKey que descartaria ocorrências diferentes.

Foreground: um banner/fluxo interno genérico, sem notificação do sistema duplicada. Background/processo normalmente encerrado: serviço monta NotificationCompat localmente, sem executar conclusão. Há deduplicação persistida dos últimos 100 eventos e tag/ID estável por evento; não é um histórico ilimitado. O mesmo evento não cria duas apresentações simultâneas. Permissão negada não apresenta aviso nem banner nativo.

Não enviar pelo Firebase Console um `notification` payload misturado esperando os mesmos controles: esse contrato é data-only processado pelo serviço próprio. A exibição automática do sistema de payloads de outro formato não é protegida por filtros JS. O backend desta integração só produz o contrato específico.

## Logout e mudança de contexto

Suspensão local remove apresentações, estado ativo, detalhes JS e intenção anterior; invalida callbacks. Native receiver/cancelamento são sincronizados para reduzir a corrida entre exibir e sair. Ativação confirma novamente UID/grupo/token na ponte antes de marcar o vínculo ativo.

A revogação remota é tentada antes de signOut, quando existe instalação dessa conta a remover; espera limitada a 3 segundos, sem impedir logout offline. Não se reutiliza pendência de remoção de outro usuário. Revogação confirmada limpa o marcador local para evitar novas chamadas sem operação. SDK deleteToken é best-effort quando havia token; próxima ativação renova token/instalação quando necessário.

Mudança real de grupo/conta limpa contexto e invalida o cadastro anterior. A primeira resolução do **mesmo** grupo após abertura a frio preserva a intenção recebida; isso não é tratado como troca de conta. Mensagens são revalidadas em native e JS contra o contexto atual; detalhes e alterações continuam autorizados no servidor.

Limites: FCM e Firestore não formam transação; mensagem aceita pelo FCM não comprova exibição, e mensagem já entregue não é revogável. Payload genérico minimiza exposição. Falha offline de remoção ou mudança de grupo pode deixar registros auxiliares órfãos até remoção explícita/resposta de token inválido. Não foi criado TTL/scheduler para fingir que essa limpeza é gratuita. O armazenamento residual não autoriza outra conta a usar o vínculo.

## Rotas e abertura a frio

Rotas permitidas: `/ponto`, `/lista-compras`, `/lembretes`, `/admin`. Administração exige perfil administrativo; cuidados exigem perfil elegível. Payload não controla origem externa/deep link arbitrário. Não houve pareamento No Bolso.

PendingIntent imutável aponta diretamente para MainActivity, sem trampoline em receiver. O toque é capturado tanto no intent inicial quanto em onNewIntent. Uma intenção mínima fica privada até sua expiração/contexto; perfil indefinido não navega nem consulta conteúdo protegido. Sem usuário, o app solicita login e só revalida após carregar o perfil. Outro usuário/grupo não executa a intenção antiga.

Tocar no corpo navega para a tela autorizada, sem concluir. Arrastar/fechar não escreve negócio. Telas e endpoints mantêm suas próprias verificações, inclusive se o acesso mudou depois de gerar o aviso.

## Ações de tarefa e cuidado

| Evento | Ação |
|---|---|
| Tarefa avulsa de hoje criada com tarefaId | Concluir tarefa → revisão curta → confirmação |
| Rotina fixa criada para o dia atual | Concluir tarefa → ocorrência diária individual da funcionária |
| Ocorrência de cuidado | Confirmar cuidado → revisar medicamento/posologia autorizados → confirmação explícita |
| Compras, ponto, teste e outros avisos | Abrir destino, sem botão de conclusão |
| Evento legado sem tarefaId ou tarefa futura | Aviso comum; abertura da tela existente |

Tarefas não ganharam agendador de vencimento nesta rodada: o evento existente é criação/alteração da rotina. Logo, um aviso de criação para data futura não oferece conclusão antecipada. A revisão/hash detecta alterações relevantes na tarefa; item excluído/inativo não é recriado. A rotina fixa continua individual por funcionária/data, sem encerrar a série.

O fluxo curto não exige navegar manualmente pelas listas. O botão nativo abre Activity; não executa código de negócio invisivelmente. Android 31+ usa `setAuthenticationRequired(true)` e a Activity não usa showWhenLocked/full-screen. Nas versões anteriores, a abertura normal da Activity continua sujeita ao bloqueio do sistema. Cuidado exige sessão e confirmação após desbloquear; dispensar aviso nunca significa dose administrada.

Tarefas usam novo callable estreito `acaoNotificacaoTarefa`, pois o fluxo anterior era update direto do Firestore e não oferecia transação de revisão/ocorrência/idempotência para o botão. Cuidados usam `acaoNotificacaoLembrete`, wrapper mínimo que valida grupo confiável antes de chamar as regras existentes de `operarLembretes`.

Servidor valida ativo, grupo, perfil, tarefa/ocorrência atual e autoria; não confia no UID/grupo notificado. A identidade é estável por item/revisão/dia/ator para tarefas e por ocorrência/versionamento para cuidados. Transações fazem repetição/concorrência responder sem nova conclusão ou efeito secundário. Auditoria preserva autor, instante declarado e confirmação do servidor. Ocorrências futuras não são concluídas automaticamente.

Sem rede detectada: informa reconexão e não confirma nem enfileira alteração. A fila do ponto não foi reutilizada. Resultado incerto após gravação: consultar/repetir a mesma ação recupera estado idempotente; nenhum sucesso é exibido antes da resposta. Sem polling e sem retry automático da ação. Aviso é removido após conclusão confirmada/já concluída ou rejeição definitiva de item removido/alterado/acesso revogado; erro transitório mantém opção de recuperar.

## Custos incrementais — estimativas, não medição de faturamento

Contagens abaixo supõem grupo e sucesso sem retries de transação; SDK/cache local e HTTP FCM são separados. Firestore pode cobrar mínimos de consulta/índices; não há promessa de custo zero/cota gratuita.

| Fluxo | Functions | Firestore estimado | Local/FCM |
|---|---:|---|---|
| Primeiro cadastro Android | 1 | ~7 leituras, 3 escritas (perfil/vínculo e três registros de dispositivo/propriedade) | permissão/contexto locais; SDK obtém token FCM |
| Mesmo cadastro confirmado/reabertura | 0 | 0 adicional pelo push | ACK e token SDK/cache; nenhuma leitura por item |
| Retomada sem alterações | 0 | 0 adicional | não há hook de recadastro/polling |
| Rotação de token | 1 | ~7 leituras, 4 escritas com exclusão da reserva anterior | evento SDK; nenhuma varredura |
| Logout com vínculo válido | até 1 | ~5 leituras e até 3 exclusões | limpeza imediata; SDK deleteToken best-effort; limite de espera 3 s |
| Logout sem vínculo a remover | 0 | 0 | somente limpeza local |
| Aplicativo ocioso | 0 novo | 0 novo pelo módulo push | listeners locais, sem timer de token/recibo |
| Teste explícito | 1 | autorização + rate transacional (1 leitura/1 escrita) + dispositivos/recibos do próprio UID | somente conta atual; no máximo um teste por 30 s |

Envio de evento reutiliza o trigger/scheduler existente: consulta D dispositivos e U perfis do **grupo**, mais até D recibos; S envios aceitos gravam S recibos. No destinatário individual, consulta limitada por UID e somente seu perfil (removida a leitura de todos os perfis do grupo nesse caso). Batching até 500; limites de segurança em dispositivos/perfis evitam leitura ilimitada. Invalidar I tokens custa a leitura de conferência e até três exclusões por dispositivo nativo. O lease de evento existente mantém suas leituras/escritas; reentrega concluída não chama FCM novamente. Retry transitório preserva recibos e as políticas já existentes, com corte de idade/TTL; não foi adicionado loop/Scheduler novo.

| Ação | Consumo esperado, sem retry de transação |
|---|---|
| Revisar tarefa avulsa por funcionária | 1 callable, ~6 leituras, 0 escritas |
| Confirmar tarefa avulsa | 1 callable, ~6 leituras, 1 escrita no item existente |
| Rotina fixa diária | adiciona leitura da conclusão diária; 1 escrita na conclusão existente do domínio |
| Ação repetida/já concluída | mesmas leituras de autorização/estado, 0 novas escritas de conclusão |
| Revisar/confirmar cuidado | 1 callable por gesto; ~6–7 leituras conforme cadastro vinculado; confirmação 1–2 escritas de ocorrência/resumo |
| Ação rejeitada | leituras até a rejeição; 0 escritas de negócio |
| Offline detectado | 0 callables/leituras/escritas; só aviso local |
| Resposta perdida | execução no servidor pode já ter sido cobrada; reenvio idempotente não duplica escrita de conclusão |

Perfil é validado na resolução do grupo e novamente na transação de domínio. Essa redundância de autorização permanece deliberadamente; não foi removida para reduzir custo. Não há listener por dispositivo/notificação. Campos expiresAt preexistentes não ativam política TTL por si; nenhuma política de cobrança nova foi criada.

## Testes e evidências

Automatizados:

- Controller: primeiro vínculo, concorrência, rotação, desativação explícita, recusa/configuração ausente, logout sem rede, callbacks de outra sessão, expiração e rotas proibidas.
- Contratos: Web Push preservado; Android sem conteúdo sensível/notification payload, com TTL/eventId e ocorrência específica; revisão de tarefas.
- Firestore demo + FCM simulado: propriedade do token/instalação, outra conta/grupo, perfil inativo, rotação, rate limit próprio, destinatário do teste, conclusão concorrente/idempotente, item alterado/removido, rotina individual e cuidado sem avançar série futura.
- Callable HTTP real nos emuladores Auth/Firestore/Functions: autenticação e grupo obrigatórios, perfil inativo, teste sem dispositivo, regras negando leitura de tokens. Não se enviou FCM real nesses ensaios.
- Java/JUnit: filtro nativo de UID/grupo/versão/expiração e deduplicação limitada.

A rodada ampliada inicial falhou por fixtures preexistentes (contagem de cadastros e sequência de ponto já gravada). Repetida em emuladores separados, portas 18877/19098, projeto `demo-push07-regressao` e seus namespaces de teste. Asserções originais preservadas; runner temporário só ajustou portas e caminho de fixture. Houve também falha inicial do runner por caminho relativo da fixture de cupom, corrigida no runner. Após limpar exclusivamente esses namespaces criados nesta execução: **22/22 aprovados**. Ambiente demo do aparelho não foi apagado.

Suíte padrão final: **177 testes, 154 aprovados, 23 condicionais ignorados, 0 falhas**. Integração nova executada explicitamente: **2/2 aprovados**. Java: **2/2 aprovados**. Lint sem erros/warnings, builds PWA/mobile e `assembleDebug` aprovados. Avisos existentes de chunks/Gradle e aviso de strip de biblioteca transitiva do SDK não motivaram atualização de dependências fora do escopo.

## Aparelho e limites físicos

Samsung SM-A057M conectado e autorizado. APK instalado com `adb install -r`, preservando dados. Diálogo de permissão exibido; permissão concedida com toque ADB no botão Permitir do sistema. Estado observado: permitido/granted, ativo=false e configurado=false. Recusa foi ensaiada, mas não confirmada como cenário físico isolado; permanece coberta por simulação automatizada e pendente de repetição física controlada.

A ponte `token()` retornou `PUSH_CONFIG`, não token. Em Minha conta, o botão Ativar exibiu a mensagem de configuração Firebase de teste ausente e a página continuou carregada. Não houve disparo de teste real nem cadastro FCM real.

**Pendentes físicos por falta de configuração real de teste:** entrega aberto/background/processo normalmente encerrado, ações sob bloqueio de tela, abertura a frio com FCM, logout/troca real de usuário/grupo durante entrega e rotação/invalidação real do token. JUnit/fixtures/HTTP não são apresentados como prova de entrega Android.

Force-stop é diferente de fechar normalmente: não se promete recebimento após Forçar parada, entrega instantânea ou sincronização de ações com o app encerrado. Doze, restrições do fabricante, rede, canais e permissões continuam relevantes. iOS nativo não foi implementado/validado; APNs não é tratado como token FCM Android. PWA mantém seu comportamento e não promete os mesmos botões em todos os navegadores.

## Arquivos principais

Android: `PushNativoPlugin.java`, `PushMessagingService.java`, `PushEstado.java`, `PushFiltro.java`, `PushFiltroTest.java`, MainActivity, AndroidManifest, ícone `ic_notificacao.xml`, dependência/guarda em app/build.gradle.

Frontend: `src/utils/pushAndroid.js`, `src/services/pushNativo.js`, `src/components/NotificacoesAndroid.jsx`, integração em App/Conta, suspensão nativa no serviço push existente, tarefaId nos eventos de criação em Tarefas.

Backend: `functions/push.cjs`, `push-contrato.cjs`, `push-dispositivos.cjs`, `push-acoes.cjs`, auditoria opcional em lembretes.cjs e exports de ação em index.js. Regras existentes preservadas.

Testes: `push-android.test.js`, `push-contrato.test.cjs`, `push-android-emulador.test.cjs`, `push-android-callable.test.js` e JUnit Android. Não houve alteração no repositório do No Bolso.

## APK e comandos locais

APK debug: `android/app/build/outputs/apk/debug/app-debug.apk`. Versão dev, não release/loja. Stamp deve permanecer destino emuladores/projectId demo-ap1303 nesta entrega.

```powershell
npm run lint
npm test
npm run build
npm run build:mobile:usb
npm run cap:sync:android:usb
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
# executar dentro de android
.\gradlew.bat :app:testDebugUnitTest :app:assembleDebug --console=plain
```

Os três emuladores do ambiente demo podem ser iniciados, se ainda não estiverem ativos, com Node 24 e CLI local existente:

```powershell
npm exec --yes --package=node@24.22.1 -- node "$env:APPDATA/npm/node_modules/firebase-tools/lib/bin/firebase.js" emulators:start --project demo-ap1303 --config firebase.compras-emulator.json --only "auth,firestore,functions"
```

Não iniciar outra instância nas mesmas portas nem limpar o projeto do aparelho. Integração explícita utiliza FIRESTORE_EMULATOR_HOST=127.0.0.1:8877, FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9098, GCLOUD_PROJECT=demo-ap1303 e AP1303_TEST_CALLABLE=1. A suíte padrão deve rodar sem essas flags quando não se pretende executar todos os testes legados de integração.

## Próximo teste real, sem executar publicação

1. Disponibilizar configuração **já autorizada** de Firebase dedicado de teste para `br.dev.acstech.ap1303.dev`, diferente de produção/demo. Não colocar service account ou chave administrativa no APK.
2. Configurar `.env.mobile.local` com VITE_AP1303_DESTINO=teste e os campos VITE_TEST_FIREBASE_API_KEY, AUTH_DOMAIN, PROJECT_ID, APP_ID, MESSAGING_SENDER_ID e STORAGE_BUCKET correspondentes; colocar google-services.json Android do mesmo projeto/pacote no local apropriado.
3. Usar `build:mobile:dev` e `cap:sync:android` **sem :usb**, pois :usb força demo/emuladores. Conferir stamp e guarda Gradle. Auth, Firestore e Functions precisam corresponder ao mesmo projeto dedicado, sem misturar produção por conveniência.
4. Preparar backend/regras e contas fictícias desse ambiente mediante autorização separada; infraestrutura real/billing não foi criada. Functions/Firestore/rede terão custos conforme uso e configuração do projeto, não uma garantia de gratuidade.
5. Identificar e confirmar que a conta e seus dispositivos vinculados são exclusivamente de teste e que o destino é o aparelho autorizado antes de enviar qualquer FCM real. O teste manual envia aos dispositivos da própria conta, não a UID/token arbitrários.
6. Executar matriz física pendente, inclusive ações sob bloqueio e troca de sessão. Só depois avaliar publicação; nenhum desses passos de infraestrutura/publicação foi executado nesta rodada.

### Identidade final e encerramento

APK final: 10.323.639 bytes; SHA-256 `77529BED531DC2FA3A4BD98ADCBB3D4DF83C7F9DF66893A9636F44843C6606B1`. Instalado no aparelho por atualização, sem limpar dados. Stamp final demo-ap1303/127.0.0.1. Estado final da ponte: configurado=false, permitido=true, permissao=granted, ativo=false; página principal renderizada.

Emuladores temporários das portas 18877/19098/14400 encerrados após os testes, sem encerrar os originais 8877/9098/5007. Porta CDP temporária e XML de inspeção removidos. Nenhum documento do usuário foi apagado; apenas fixtures dos namespaces isolados criados nesta rodada foram limpas.
