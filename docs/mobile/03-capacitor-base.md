# Script 03 — Base Capacitor de desenvolvimento

Implementação local em 22/10/2026, branch `feat/ponto-operacoes-offline`, base `aabad8a5d08a634d0d4a3f82c997cbeb314bf952`. Alterações não rastreadas/modificadas do Script 02 preservadas. Não houve checkout, reset, stash, migração, commit, push, PR ou deploy. Nenhum projeto Firebase, aplicativo em console, certificado ou infraestrutura foi criado. Não foram encontrados AGENTS.md aplicáveis na árvore/ancestrais consultados.

## 1. Resultado e versões

Android e iOS foram gerados pelo CLI e sincronizados com `dist` local. Android debug compilou com sucesso; não houve instalação/execução nativa. `adb devices` não encontrou aparelho conectado e não há AVD configurado. iOS possui projeto Xcode e pacote SPM, sem compilação no Windows.

| Ferramenta | Versão/decisão |
|---|---|
| Capacitor core, CLI, Android, iOS | 8.5.3 exatos no lockfile |
| Único plugin nativo | `@capacitor/app` 8.1.2, peer Capacitor 8, oficial, licença MIT; ciclo de vida/Voltar |
| Node do sistema | 20.20.0; não substituído |
| Node local de desenvolvimento | 22.22.0 (`node` devDependency), instalado por npm, sem alterar variáveis globais |
| npm | 10.8.2; scripts npm passam a encontrar Node 22 local |
| React / Vite | 19.2.4 / 7.3.7, sem atualização nesta rodada |
| Java | Temurin 21.0.12 LTS |
| Android Studio | 2025.3.1, build AI-253.29346.138.2531.14876573 |
| Android SDK | plataforma 36 (35 também instalada), minSdk 24, target/compile 36 |
| Android Gradle Plugin / wrapper | 8.13.0 / 8.14.3, versões geradas pelo template Capacitor |
| iOS | deployment target 15.0, Swift Package Manager, exige macOS/Xcode 26+ |
| Backend Firebase | Continua com engine Node 24; Node 22 mobile não substitui esse requisito |

Capacitor 8 foi escolhido porque a toolchain Android existente atende ao SDK/Java/Studio exigidos e permite usar a geração atual, sem iniciar uma base sobre major em fim de suporte. Node 22 fica local ao projeto. A instalação com npm do sistema 20 informou EBADENGINE do CLI; a execução efetiva do CLI/build foi feita no Node 22 local. `npm ci` reproduz as versões; não usar `npx` para baixar versões flutuantes.

Fontes oficiais consultadas nesta rodada: [ambiente](https://capacitorjs.com/docs/getting-started/environment-setup), [instalação](https://capacitorjs.com/docs/getting-started), [atualização para 8](https://capacitorjs.com/docs/updating/8-0), [configuração/navegação externa](https://capacitorjs.com/docs/config), [App/ciclo de vida](https://capacitorjs.com/docs/apis/app), [armazenamento](https://capacitorjs.com/docs/guides/storage). As versões e licenças também foram conferidas nos manifests instalados. Não foram contratados serviços Ionic/OutSystems.

## 2. Identidade e arquivos desta etapa

Não existia identidade nativa no repositório. ID Android e bundle identifier iOS provisórios: **`br.dev.acstech.ap1303.dev`**. Nome AP1303, Android versionCode 1 / versionName `0.1.0-dev`, iOS build 1 / marketing version `0.1.0`. Não são IDs finais registrados nas lojas. Assinatura Android debug padrão do ambiente; nenhuma chave de produção criada.

Novos: `capacitor.config.json`, `android/`, `ios/`, `scripts/mobile.mjs`, `scripts/test.mjs`, `.env.example`, `.env.mobile.example`, `src/utils/ambiente.js`, `src/services/plataforma.js`, `src/services/cicloMobile.js`, `tests/mobile-base.test.js`, `tests/mobile-webguards.test.cjs` e este documento.

Ampliados nesta rodada: `package.json`/lock, `.gitignore`, `eslint.config.js`, `vite.config.js`, `src/services/firebase.js`, `src/services/auth.js`, `src/services/appShell.js`, `src/services/push.js`, `src/App.jsx`, `src/components/usePontoOperacoes.js`, `src/styles/redesign.css`. Os demais arquivos modificados/não rastreados do Script 02 não representam trabalho novo deste script. Backend, payload, recibos, regras, adaptador IndexedDB, domínio e sincronizador do ponto não foram reescritos.

`npm test` agora enumera os arquivos de teste por script portátil: o comando anterior `node --test tests` não funciona no Node 22 instalado. Fontes nativos ficam versionáveis; assets copiados, builds, SDK path local, caches, keystores e dados de IDE ficam ignorados.

## 3. Destinos explícitos e comandos

O resolver compartilhado é usado pelo Vite e Firebase. Web normal mantém `VITE_FIREBASE_*` e seu build de produção. Web `compras-test` usa emuladores, inclusive fora de `DEV`. Mobile (`--mode mobile`) exige `VITE_AP1303_DESTINO`, recusa `producao`, e aceita:

- `emuladores`: config fixa `demo-ap1303`, API key fictícia, Auth 9098, Firestore 8877 e Functions 5007 no mesmo host explícito.
- `teste`: exige `VITE_TEST_FIREBASE_PROJECT_ID`, `API_KEY`, `AUTH_DOMAIN`, `APP_ID`; bucket/sender conforme uso. Recusa ID de produção conhecido, o mesmo ID de `VITE_FIREBASE_PROJECT_ID`, e `demo-*` nesse modo. Usa somente o prefixo TEST; não preenche campos a partir da produção. Projeto dedicado não foi criado e precisa conter o backend/regras de teste antes de validar os fluxos.

O selo TESTE identifica o destino. A configuração pública Firebase não é credencial administrativa. Nenhuma chave privada ou segredo deve entrar em VITE_*. O Auth secundário do cadastro legado também é conectado ao emulador quando esse for o destino.

PowerShell, na raiz:

```powershell
npm ci
npm run dev:emuladores
# Em outro terminal, com toolchain Node 24 para Functions:
firebase emulators:start --project demo-ap1303 --config firebase.compras-emulator.json --only auth,firestore,functions
```

Os testes de integração desta rodada usaram Auth/Firestore e handlers diretamente, não a execução completa do Functions Emulator. Para testar chamadas pelo app, iniciar também Functions em ambiente Node 24 compatível. O backend novo do Script 02 continua sem deploy remoto. Nunca usar o default de `.firebaserc`, que aponta para outro projeto.

Build/sync nativo:

```powershell
Copy-Item .env.mobile.example .env.mobile.local # uma vez; ajustar host nesse arquivo
npm run build:mobile:dev
npm run cap:sync:android
npm run cap:open:android
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk" # somente este terminal, se necessário
Set-Location android
.\gradlew.bat :app:assembleDebug --console=plain
```

Também é possível definir `VITE_AP1303_DESTINO=emuladores` e `VITE_EMULATOR_HOST` no terminal, sem arquivo local. Não basta abrir Android Studio antes de gerar/sincronizar os assets. `mobile-build.json` contém somente destino/project ID/host; sync compara com o ambiente atual. Um build web normal não gera esse marcador e não pode ser sincronizado pelos scripts mobile. Gradle valida o marcador, recusa produção e bloqueia tarefas Release nesta base. Não há AAB/store build.

### Host e HTTP de desenvolvimento

| Execução | Host dos emuladores |
|---|---|
| Navegador no computador | 127.0.0.1 |
| Android Emulator | 10.0.2.2, alias do loopback do computador |
| Android físico por USB | 127.0.0.1, com `adb reverse` abaixo |
| Aparelho pela rede local | IP LAN acessível do computador; exige configurar conscientemente a escuta na interface privada |
| iOS Simulator | 127.0.0.1; HTTP/ATS ainda precisa validação no Mac, ou usar projeto dedicado HTTPS |

Preferir USB para o aparelho Android, sem expor serviços na LAN:

```powershell
adb reverse tcp:9098 tcp:9098
adb reverse tcp:8877 tcp:8877
adb reverse tcp:5007 tcp:5007
# ajustar host para 127.0.0.1, build e sync novamente antes da instalação
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Não foram alterados firewall nem bindings públicos. Não apontar para emuladores públicos nem usar 0.0.0.0 como destino. Para LAN, uma configuração local separada deve limitar o binding à interface privada; não copiar uma liberação global para configurações distribuíveis.

`server.url` e `allowNavigation` estão ausentes; assets locais continuam em origem HTTPS. Android main recusa cleartext e mixed content. O sync gera XML **somente em `src/debug`**, permitindo HTTP apenas ao host configurado dos emuladores. MainActivity só permite mixed content quando `BuildConfig.DEBUG` e marcador `emuladores`; o network-security-config ainda restringe o domínio. No modo `teste` HTTPS essa abertura não é ativada. Release permanece bloqueado e não herda o manifest debug. Não foi habilitado CapacitorHttp ou proxy genérico de requisições.

## 4. PWA, navegação e sessão

`recursosWeb()` centraliza a detecção Capacitor. No nativo, o registro do shell retorna antes de acessar Service Worker; suporte/registro/teste/desativação/observação de Web Push não iniciam messaging nem pedem permissão. O componente de push não é montado. Login não depende de avisos. Nenhum cache, fila ou dado de navegador é apagado. O worker web e o protocolo de atualização do Script 02 ficam intactos.

A navegação existente usa History API. O host local Capacitor serve a SPA e a raiz leva a `/ponto`; não foi introduzido outro roteador. O único listener de App por montagem tem cleanup, inclusive para handles resolvidos depois de desmontar no StrictMode. Retomada dispara `ap1303-retomar`; o hook existente reaproveita sua exclusão de execução simultânea, lease e guardas UID/grupo. Não existe segundo sincronizador nativo ou polling novo. Logout conserva suspensão da fila antes de signOut.

Voltar Android: envia `cancel` ao último dialog aberto, permitindo que o componente feche/confirme; modais React com botão Fechar usam esse botão, e um modal sem fechador conhecido impede que Voltar atravesse a tela. Sem modal, usa history.back quando há histórico; na raiz minimiza, sem apagar a fila. Callbacks desmontados não atuam. A confirmação de saída de formulários por ações próprias continua sendo responsabilidade dos componentes existentes; conferir fluxos com dados não salvos no teste físico.

Links externos usam a política padrão do Capacitor: navegação para fora da origem vai ao navegador/aplicativo externo, sem allowNavigation. Não foi instalado plugin Browser adicional. URLs blob/download/PDF e compartilhamento continuam caminhos web existentes e precisam ensaio nativo; não se promete integração de compartilhamento pronta. Pareamento/deep links No Bolso completos ficam para outra etapa.

## 5. Persistência: decisão explícita e porta do piloto

Foi lido o contrato do Script 02 e mantido o adapter `pontoFila.js` **somente para desenvolvimento**. Ele usa transação IDB para operações+leases, escreve antes de enviar, só confirma persistência no oncomplete, mantém ID/payload/recibo, isola por UID/contexto, limita 200 registros por escopo, serializa envios e trata erro/quota. Nada foi copiado do PWA para o app.

Isso não comprova durabilidade em Android WebView/WKWebView. A documentação oficial alerta sobre remoção de armazenamento web pelo SO, especialmente no iOS. Preferences não oferece o protocolo transacional multi-registro necessário, portanto não foi instalado como substituto da fila. SQLite com transação é candidato adequado, mas nenhum plugin/adapter SQLite foi escolhido/instalado sem ambiente de execução para validar interrupções e compatibilidade. O único plugin desta rodada é o App oficial MIT, sem serviço/licença paga.

Antes do piloto que dependa de pendências: validar adapter durável (ou comprovar formalmente a solução escolhida) com kill do processo/SO durante escrita/envio, reabertura/lease expirada, storage cheio, concorrência, logout/troca de grupo, mesma identidade/payload e replay após commit perdido. Não liberar marcação offline nativa como concluída a partir destes testes Node. O selo nativo identifica offline em validação. O contexto de perfil/jornada ainda pode não ser recuperável numa partida offline, conforme Script 02.

PWA instalado e app nativo têm armazenamentos distintos. Resolver pendências do cliente anterior antes de trocar; não migrar fila por cópia nem criar IDs novos para operações incertas.

## 6. Android, iOS e testes desta rodada

APK gerado em `android/app/build/outputs/apk/debug/app-debug.apk`, versão `0.1.0-dev`, assinatura debug. Primeira compilação: BUILD SUCCESSFUL, 125 tarefas; recompilação final após sync: BUILD SUCCESSFUL, 92 tarefas. O wrapper baixou Gradle 8.14.3 uma vez. Avisos do template: flatDir e APIs Gradle deprecated; não exigiram alteração de versões nesta base.

Conferência do APK: `apksigner verify` aprovado; `aapt dump badging` confirmou ID, versão, minSdk24/target36. ZIP contém marcador `demo-ap1303`/`10.0.2.2` e configuração sem server.url/allowNavigation. SHA-256: `3D11FA542A54B84BBCEB4282E58EC0445B2A2AB989D11C425723551DE3AFC57B`. `:app:preReleaseBuild` foi executado para testar a trava e falhou deliberadamente com “Release desabilitado nesta base de desenvolvimento”. Não é uma falha do build debug. Ícones/splash nativos ainda são os do template; identidade visual para lojas fica para a etapa própria.

Checks executados agora, sem reaproveitar resultados do Script 02:

- Lint aprovado.
- Unitários: **128 contabilizados, 113 aprovados, 15 condicionais ignorados, zero falhas**.
- Integrações demo Auth/Firestore: **75 aprovadas, zero falhas/ignorados**, incluindo contrato/idempotência, isolamento, regra e recibos do Script 02.
- Build web de produção aprovado; build mobile emuladores aprovado.
- Build mobile sem destino explícito recusado antes de empacotar.
- Sync Android/iOS aprovados; build Android debug aprovado.
- `git diff --check` aprovado, sem alterar staging/commits.
- Testes de ambiente recusam produção/fallback, distinguem host e projeto dedicado. Testes executam guardas web com mocks e comprovam zero acesso a SW/messaging/permissão/rede no nativo, mantendo registro web do shell. Lifecycle usa API App simulada para modal/history/raiz, cleanup tardio e retomada.
- Testes do Script 02 continuam verificando fila vazia sem Function, retry limitado, sessão antiga, ID/payload, replay e isolamento. Nenhum listener/consulta foi adicionado por item.

São testes automatizados e compilação, **não execução Android**. Não foram testados GPS/câmera/push nativos, aparelho físico, modo avião nativo, login na WebView ou iPhone. Não há permissões/plugins de câmera/geolocalização/push nesta base; não usar o APK como cliente de trabalho/ponto de produção.

iOS: projeto `ios/App/App.xcodeproj`, dependências `ios/App/CapApp-SPM/Package.swift`, assets sincronizados, versão 0.1.0/build1. No Mac com Node 22+, Xcode26+ e ferramentas de linha de comando:

```sh
npm ci
# configurar .env.mobile.local para destino de teste explícito
npm run build:mobile:dev
npm run cap:sync:ios
npm run cap:open:ios
```

Usar esquema App no Xcode, resolver SPM, compilar inicialmente para simulador. HTTP de emuladores no WKWebView/ATS não foi liberado globalmente; validar configuração Debug local específica no Mac ou usar projeto dedicado HTTPS. Assinatura para iPhone, certificados, conta Apple, archive e publicação não foram preparados. Não foi usado build remoto pago.

## 7. Dependências: alertas revisados, sem correção forçada

Audit raiz desta rodada: **4 altos e 3 moderados**. São cadeias, não sete exploits independentes.

| Cadeia | Escopo e condição | Decisão |
|---|---|---|
| firebase12.10.0 → @firebase/firestore4.12.0 → @grpc/grpc-js1.9.16; firestore-compat também propaga | Os quatro altos são firebase/firestore/compat/grpc. Advisory alto exige servidor gRPC aceitando certificado cliente opcional e usando getAuthContext para autorizar. Outro advisory baixo transmite mensagens de handler de servidor. O frontend Vite resolve a entrada browser WebChannel, sem servidor Node gRPC; isso reduz a alcançabilidade observada, não remove o pacote vulnerável do lock. Ferramentas Node que importem essa entrada devem ser avaliadas. | Firestore restringe grpc a `~1.9.0`; patches oficiais 1.13.6/1.14.5 ultrapassam a restrição. Não aplicar override ou downgrade sugerido pelo audit para firebase9.14.0 sem validar SDK/Node. Pendência concreta: atualização compatível ou override estritamente testado em rodada de dependências. |
| @capacitor/cli8.5.3 → xcode3.0.1 → uuid7.0.3 | Três moderados novos (CLI/xcode/uuid), ferramenta de desenvolvimento, não bundle cliente. Advisory afeta v3/v5/v6 quando recebem buffer inadequado; xcode consultado usa uuid.v4 sem buffer nessa geração. | Correção disponível uuid11.1.1+, fora de `^7.0.3`, com mudança de API/CJS possível. Não forçar major transitivo; acompanhar atualização xcode/CLI ou validar patch compatível separadamente. |
| functions: firebase-admin → @google-cloud/firestore → google-gax → grpc1.14.6 | gRPC backend já supera patches citados; **zero altos** nesse audit. Há **12 moderados preexistentes**, envolvendo uuid/qs/ts-deepmerge e cadeias de Admin/Functions/storage/gax. Não são introduzidos pelo Capacitor. | Nenhuma atualização backend nesta etapa. Revisar por alcance e compatibilidade em rodada própria; não tratar ausência de altos como ausência de risco. |

Fontes dos advisories: [gRPC certificados](https://github.com/advisories/GHSA-m9gg-hp2v-232j), [gRPC erros de handlers](https://github.com/advisories/GHSA-f596-whhp-79r4), [uuid e buffers](https://github.com/advisories/GHSA-w5hq-g745-h8pq). Nenhum `npm audit fix --force` foi executado. Contagem não comprova exploração; testes passando não eliminam alertas. Não foram registradas coordenadas/payloads/tokens em logs adicionados ao app.

## 8. Custos incrementais e comparação

Nenhum serviço pago, scheduler, TTL, backup, analytics, push nativo, infraestrutura recorrente ou polling foi criado. Downloads npm/Gradle/SDK e artefatos ocupam rede/disco de desenvolvimento, sem serviço novo de cobrança recorrente. A dependência Node local aumenta o disco de desenvolvimento, não o APK por si só.

Estimativas pelo código, não medição de fatura. Quantidades Firestore abaixo presumem grupo ativo, um local, sem retry da transação; efeitos/listeners preexistentes separados.

| Fluxo | Functions | Leituras/escritas adicionais pelo Capacitor | Total do handler de ponto existente no Script 02 |
|---|---:|---|---|
| Inicialização/fila vazia | 0 novas | 0/0 remotas; listener de App e assets locais | Sem operação de ponto |
| Ocioso | 0 novas | 0/0 remotas; nenhum timer novo | Sem operação de ponto |
| Pausa/retomada sem operação | 0 novas | 0/0 remotas; consulta IDB local/evento | Sem operação de ponto |
| Online aceita | 1 por operação | 0/0 extras | 8 leituras / 3 escritas |
| Replay do mesmo ID/payload | 1 por reenvio necessário | 0/0 extras | 4 leituras / 0 escritas |
| Sincronização de pendência offline | 1 por operação enviada | 0/0 extras | 6 leituras / 2 escritas |

Retomada com operação elegível usa o mesmo ID/recibo e a resposta, sem consulta remota prévia. Duplicação de eventos visibility/App encontra exclusão de execução e depois registro finalizado, não uma nova marcação. Retry mantém o limite/backoff/jitter do Script 02; sincronização não é garantida com processo encerrado. Após logout/sessão diferente não processa a fila de outro dono.

Números dos handlers foram revalidados por testes instrumentados em emulador nesta rodada; são contagens de operações do código, não billing observado. Reexecuções transacionais, regras, leituras de UI, gatilhos de notificação antigos, renovação de Auth e reconexão de listeners preexistentes podem acrescentar consumo. Atividade remota dos módulos de cuidados/pratos/tarefas já existentes não é atribuída ao Capacitor.

Comparação: Script 03 não introduz consulta Firestore nova e não remove consulta de domínio. Mantém as economias do Script 02 (resposta-recibo, ausência de releitura de dia após cada tentativa, consulta de banco mensal limitada). A leitura repetida do cadastro para meses atual/anterior e atualizações antigas de módulos permanecem; não houve reescrita para otimizar outras telas. Assets nativos são lidos do pacote, sem baixar shell da hospedagem a cada abertura. Custos reais exigem medição após piloto autorizado; não há promessa de custo zero/cota gratuita.

## 9. Próximo passo e roteiro físico

Próxima etapa: criar/usar AVD ou conectar Android de teste, iniciar backend demo compatível e instalar este APK. Não habilitar clientes reais com fila nativa ainda não validada.

1. Configurar host/emuladores e dados fictícios; confirmar selo TESTE e projectId demo no pacote.
2. Abrir sem servidor de hospedagem: tela vem do APK. Primeira instalação ainda exige rede local/backend para login/perfil.
3. Login demo, rotas, links externos, diálogos e Voltar; conferir raiz minimiza sem perder estado.
4. Pausar/retomar repetidamente, trocar usuário/grupo e confirmar isolamento/um envio por operação.
5. Criar pendência fictícia, interromper processo durante escrita/transmissão e reabrir após lease; manter ID/payload e recibo.
6. Modo avião após instalação, storage cheio, virada de data/fuso e partida sem contexto: mensagem honesta, sem ponto inventado.
7. Validar solução nativa durável antes do piloto offline; testar iOS no Mac/iPhone em rodada própria.
8. Câmera, GPS, push nativo, compartilhamento nativo, pareamento e lojas seguem em scripts específicos, sem publicação automática desta base.

## 10. Correção de conexão Android/Auth — 22/10/2026

### Evidência e limites do diagnóstico

O APK anterior foi aberto como ZIP: continha `demo-ap1303`, host **10.0.2.2**, Auth9098/Firestore8877/Functions5007. Na inspeção inicial **nenhuma dessas três portas estava em escuta**. `10.0.2.2` é alias do computador apenas no Android Emulator; não é o host adequado para o celular físico. São dois problemas de configuração confirmados, sem fallback para produção. Sem captura da tentativa original no aparelho não se atribui o erro original a um pacote de rede observado.

Rastro do código e do teste pela rede: `CadastroGrupo.salvar` → `cadastrarTitular` → `createUserWithEmailAndPassword` → `httpsCallable('criarGrupo')`. O primeiro POST esperado é `http://HOST:9098/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`. Em seguida o callable autenticado usa `http://HOST:5007/demo-ap1303/us-central1/criarGrupo`; o backend escreve via Firestore8877. No teste de indisponibilidade do Auth, o SDK retornou exatamente `auth/network-request-failed`, etapa `auth`, sem chamar criarGrupo. Na tentativa real relatada pelo usuário não houve trace contemporâneo para excluir outras causas; o erro agora identifica a etapa na interface.

Firebase é inicializado uma vez em `src/services/firebase.js`, com os três `connect*Emulator` executados sincronamente antes de exportar o módulo para seus consumidores. Projeto/config demo fixos; produção mobile segue recusada. Auth secundário legado também permanece conectado ao mesmo emulador. Não há retry automático novo, polling, serviço ou atualização de dependência nesta correção.

### Conexão adotada: celular físico por USB

O novo APK desta correção usa **127.0.0.1**, com `adb reverse` para as três portas. O arquivo de exemplo agora é USB; o Android Emulator continua exigindo escolha explícita de 10.0.2.2. Novos atalhos evitam herdar um host antigo de `.env.mobile.local`:

```powershell
npm run build:mobile:usb
npm run cap:sync:android:usb
```

Eles forçam somente neste processo de desenvolvimento `VITE_AP1303_DESTINO=emuladores` e `VITE_EMULATOR_HOST=127.0.0.1`. Não mudam configurações globais nem o destino web. `firebase.compras-emulator.json` agora declara explicitamente bind **127.0.0.1** nas três portas. Nenhum firewall foi alterado e os emuladores não foram expostos à LAN.

Comando exato usado para iniciar os três emuladores no Windows com Node24, sem substituir o Node do sistema e sem alterar dependências do repositório:

```powershell
npm exec --yes --package=node@24.22.1 -- node "$env:APPDATA\npm\node_modules\firebase-tools\lib\bin\firebase.js" emulators:start --project demo-ap1303 --config firebase.compras-emulator.json --only "auth,firestore,functions"
```

Esse comando usa o Firebase CLI já instalado globalmente e um runtime Node24 local ao cache npm. A saída confirmou `Using node@24 from host`, `Loaded functions definitions` incluindo criarGrupo e `All emulators ready`. Em uma instalação na qual Node24 já seja a toolchain ativa do CLI, o equivalente é:

```powershell
firebase emulators:start --project demo-ap1303 --config firebase.compras-emulator.json --only "auth,firestore,functions"
```

Manter esse terminal/computador ligados durante o uso do APK demo. O APK não contém o backend. Emuladores sem export/import são efêmeros; a retomada não recupera contas que tenham sido apagadas pela reinicialização do próprio ambiente demo.

Passos mínimos para o celular, em outro terminal:

```powershell
adb devices # precisa aparecer device, não unauthorized/offline
adb reverse tcp:9098 tcp:9098
adb reverse tcp:8877 tcp:8877
adb reverse tcp:5007 tcp:5007
adb reverse --list
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Reconectar/reaplicar reverse se o USB cair. `localhost`/127.0.0.1 sem reverse aponta para o próprio celular. Sem USB, não basta trocar o IP: uma alternativa LAN exige binding privado explícito e acesso controlado, não configurados automaticamente aqui. O APK de Android Emulator pode ser produzido com build/sync normais e host explícito 10.0.2.2, sem `--usb`.

Cleartext continua restrito a Debug: o XML gerado permite somente 127.0.0.1 nesse APK, com base-config false, main usesCleartextTraffic=false, mixed content ativado apenas no debug/emuladores e release bloqueado. Não foram ampliadas navegação, permissões ou regras Firebase.

### Retomada após falha parcial

`src/services/cadastroTitular.js` separa as etapas e reutiliza a sessão Auth. Se criarGrupo falhar após criar a conta, guarda somente UID/nome/nome do grupo em rascunho local isolado por projeto/UID, nunca senha/token. O formulário oferece **Concluir meu grupo**, sem criar outro login ou exigir senha novamente enquanto a sessão for válida. Logout/conta diferente não acessa o rascunho de outro UID. Sem rascunho recuperável, uma sessão válida ainda pode concluir informando apenas os nomes.

O callable permanece o existente, com autorização e grupo determinístico `g_UID` dentro de transação. Reenvio após resposta perdida retorna `jaCriado`; não foi adicionada consulta remota prévia. Uma sessão diferente é recusada antes de criar outra conta; duplo toque compartilha a mesma Promise local. Cadastro continua visível durante carregamento do perfil para que uma conta sem grupo não fique presa atrás do loading. Regras/autorização do backend não mudaram.

Não se faz login automático com senha armazenada. Caso a sessão tenha expirado, autenticar normalmente na conta existente e voltar ao cadastro. Não apagar a conta Auth como rollback de uma resposta incerta. A interface mostra etapa/código de falha e detalhes de host/portas apenas no ambiente de emuladores; não foram adicionados logs de payload, senha, token ou dados pessoais.

### Verificações desta correção

- Lint e builds web/mobile USB aprovados; sync Android e assembleDebug executados.
- Unitários com teste callable habilitado: **132 contabilizados, 117 aprovados, 15 condicionais ignorados, zero falhas**.
- Regressões grupos/ponto em Auth/Firestore demo: **19 aprovadas, zero falhas/ignorados**. Na primeira invocação manual faltou GCLOUD_PROJECT; o guard demo recusou a execução antes das operações e a execução corrigida passou.
- Novo teste `cadastro-callable-emulador.test.js` usa SDK cliente + HTTP real do Functions Emulator, não `.run` de handler. Captura somente caminho/porta/status em memória: Auth accounts:signUp na9098 HTTP200, duas chamadas criarGrupo na5007 HTTP200, mesmo grupo após descartar a primeira resposta já confirmada. Confere no Firestore o titular/grupo fictícios. Teste negativo Auth indisponível não chama criarGrupo.
- Testes unitários de rascunho, isolamento de UID, falha parcial, concorrência local e ausência de senha no armazenamento aprovados.

Fontes: [Auth Emulator](https://firebase.google.com/docs/emulator-suite/connect_auth), [Functions Emulator](https://firebase.google.com/docs/emulator-suite/connect_functions), [ADB reverse para WebView](https://developer.android.com/develop/ui/views/layout/webapps/access-local-server).

Artefato desta correção: `android/app/build/outputs/apk/debug/app-debug.apk`, SHA-256 `D5FC464CF2FFA5E33D89F0CAECC407DCEEE01416AA935D4EF5053BF57ED2B3D2`, assinatura verificada. Essa versão substitui o APK de host10.0.2.2 descrito na seção6; não usar o hash antigo para verificar o APK USB novo. Os fontes iOS anteriores foram preservados; esta correção foi sincronizada/compilada apenas para Android.

Consumo adicional: rascunho e observação Auth usam armazenamento/eventos locais; nenhum polling/listener Firestore ou leitura rotineira nova. Cadastro mantém uma criação Auth e uma chamada criarGrupo, que lê3 documentos e grava3 na transação inicial. Retomada após resposta perdida usa outra chamada ao mesmo endpoint com3 leituras/0escritas quando já criado, sem consulta prévia extra. São estimativas do caminho do código, não medição de faturamento; o custo do ponto permanece o da seção8.

### Validação física concluída após reconectar o USB

O Samsung SM-A057M foi reconhecido como `device`. Foram aplicados os três reverse, instalado o APK USB com `adb install -r` (sem limpar dados), aberto o app e preenchido/submetido o formulário real da WebView com conta/nome/grupo fictícios. O app navegou para `/admin`, mostrou Gestão e o perfil `Teste Android Demo`, sem erro. Evidência local ignorada: `output/mobile-auth/cadastro-resultado.png`. Não foram testados GPS/câmera/push ou modo offline nesta correção.

A conexão USB oscilou antes dessa execução; foi necessário reconectar e reaplicar os reverse. A instalação isolada anterior não havia sido tomada como prova de cadastro. O ambiente permanece demo e o servidor local precisa continuar ativo enquanto se testa. O encaminhamento temporário de inspeção da WebView foi removido após a execução; os três encaminhamentos necessários ao app foram mantidos. Sem deploy, commit, push ou mudança de produção.

## 11. Localização Android adicionada posteriormente

A base acima inicialmente não possuía plugin/permissões de localização. A correção posterior adiciona Geolocation8.2.4 para o ponto Android, sem mudar ambiente/geofence. Configuração, evidência física, limites, custos e novo APK estão em [04-localizacao-android.md](04-localizacao-android.md). Os hashes anteriores desta página são históricos e não verificam o APK com localização.
