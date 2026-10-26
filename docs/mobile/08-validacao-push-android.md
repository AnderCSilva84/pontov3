# Script 08 — validação física de push Android

Atualizado em 23/10/2026. Testado no Samsung SM-A057M, Android 15, exclusivamente com contas e dados fictícios. A bateria deste script foi concluída no aparelho descrito; isso não significa que o Android esteja pronto para loja.

## Ambiente efetivamente usado

Projeto dedicado criado com autorização: **ap1303-android-push-teste**, número 649301878033. Aplicativo Android `br.dev.acstech.ap1303.dev`, nome AP1303 Teste, appId `1:649301878033:android:707b0fdd89459686b018b0`.

| Serviço | Destino |
|---|---|
| Auth | Emulador local 127.0.0.1:9098 |
| Firestore | Emulador local 127.0.0.1:8877 |
| Functions | Emulador local 127.0.0.1:5007 |
| FCM e Installations | Projeto real dedicado, somente Samsung autorizado |

O cliente usa `VITE_AP1303_DESTINO=teste`, `VITE_TEST_FIREBASE_EMULADORES=true` e host 127.0.0.1. As três portas são encaminhadas por USB com adb reverse. O projeto demo anterior foi exportado em `tmp/script08-demo-preservado` antes de parar seus emuladores; os atuais usam o ID dedicado. Não houve apagamento dos dados demo nem migração de produção.

A inspeção final confirmou `billingEnabled=false`, Analytics ausente, sem Auth, banco, Storage ou Functions remotos provisionados. APIs de dados habilitadas automaticamente durante a criação foram desativadas. Permanecem FCM/Installations e APIs de gestão/IAM/observabilidade padrão; nenhuma rotina remota foi criada.

A identidade de servidor é `ap1303-push-local@ap1303-android-push-teste.iam.gserviceaccount.com`, com papel firebasecloudmessaging.admin no projeto exclusivo. A impersonação foi concedida somente nessa conta. Nenhuma chave privada de service account foi criada. A credencial local de impersonação fica fora do repositório/APK, em arquivo temporário com ACL restrita ao usuário Windows. Configuração cliente e arquivo google-services.json estão ignorados pelo Git. Não imprimir os arquivos de credenciais.

## Reprodução do ambiente local

Com os emuladores atuais ainda ativos, não iniciar outra instância. Para reiniciar após encerrá-los:

```powershell
$meta = Get-Content tmp/push08-credential-path.json -Raw | ConvertFrom-Json
$env:GOOGLE_APPLICATION_CREDENTIALS = $meta.file
$env:GCLOUD_PROJECT = 'ap1303-android-push-teste'
npm exec --yes --package=node@24.22.1 -- node "$env:APPDATA/npm/node_modules/firebase-tools/lib/bin/firebase.js" emulators:start --project ap1303-android-push-teste --config firebase.compras-emulator.json --only "auth,firestore,functions"
C:\tools\platform-tools\adb.exe reverse tcp:9098 tcp:9098
C:\tools\platform-tools\adb.exe reverse tcp:8877 tcp:8877
C:\tools\platform-tools\adb.exe reverse tcp:5007 tcp:5007
```

Os reverses precisam ser refeitos após reconectar USB. Não alterar firewall nem expor os emuladores na rede. Para retornar ao demo, parar esta instância e iniciar o projeto demo com a exportação preservada; não misturar identidades.

## Falhas demonstradas e correções

- Snapshot de perfil/vínculo vazio vindo do cache era interpretado como ausência definitiva durante indisponibilidade do Firestore. Isso removia a sessão visual/contexto da ação antes da resposta autoritativa. O observador agora mantém o estado de carregamento até resposta do servidor; ausência/inatividade confirmadas continuam negadas. Não foram acrescentados listeners, consultas ou retries.
- Auth secundário conectava ao emulador apenas pelo nome do destino. Agora respeita o sinal explícito `ambiente.emuladores`, inclusive no ensaio híbrido; evita escapar para Auth remoto.
- A tela de avisos podia manter estado antigo após mudança de permissão nas configurações Android. Atualiza pelo evento existente de retomada e após operações; teste fica desabilitado quando o sistema bloqueia avisos. Consulta à bridge local, sem Function/Firestore adicional.
- Diagnóstico nativo opcional, somente debug e opt-in por tag, registra códigos de etapa; não tokens, payloads, coordenadas ou nomes. Desativado ao terminar a bateria.

Principais arquivos desta etapa: `src/services/auth.js`, `src/utils/ambiente.js`, `src/services/firebase.js`, `src/components/NotificacoesAndroid.jsx`, `scripts/mobile.mjs`, `vite.config.js`, `android/app/build.gradle`, `PushDiagnostico.java`, `PushMessagingService.java`, `PushEstado.java`, `tests/mobile-base.test.js`, `tests/auth-perfil-carregando.test.js`, configuração de exemplo/ignore e estes relatórios. Alterações dos scripts anteriores preservadas.

## Matriz física e evidências

| Cenário | Resultado observado |
|---|---|
| Primeiro plano | FCM real mostrou aviso interno, sem duplicar notificação do sistema |
| Segundo plano | Notificação nativa e ações recebidas; tarefa também passou pelo gatilho Firestore local real |
| App fechado normalmente | Removido somente AP1303 dos recentes, processo ausente; FCM abriu novo processo e ação funcionou. Não usado force-stop |
| Tarefa | Revisar, cancelar confirmação e confirmar testados; autoria correspondeu à conta de teste |
| Duplo toque / já concluída / removida | Uma conclusão; item já concluído sem nova ação; removido não foi recriado |
| Replay | Mesmo recibo produziu sent=0; duplicata FCM direta foi recebida e filtrada no aparelho sem novo aviso |
| Cuidado | Medicamento/posologia fictícios apresentados; só ocorrência indicada concluída e próxima ocorrência preservada |
| Processador de cuidados | Função existente executada manualmente no emulador enviou aviso real; nenhum Scheduler criado |
| Offline na confirmação | Wi-Fi/dados desligados; mensagem explícita, sem falsa conclusão. Após reconectar, confirmação válida |
| Permissão negada | Diálogo real negado; sem repetição infinita; envio aceito pelo FCM não exibiu aviso. Recuperação nas configurações e UI bloqueada verificadas |
| Logout / troca de conta e grupo | Contexto anterior removido; payload de outro usuário/grupo enviado ao mesmo Samsung descartado; consulta cross-group retornou 403 |
| Perfil ainda carregando | Ação sem botões de conclusão enquanto Firestore indisponível; após restaurar porta, contexto reapareceu. Ensaiado por Intent controlado e repetido com FCM real |
| Ponto confirmado | Gatilho real sobre registro fictício enviou aviso ao administrador; toque abriu /admin |
| Ponto offline | Callable HTTP real com fixture retornou recebida; nenhum registro confirmado ou aviso extra. Não equivale a captura GPS física |
| Bloqueio seguro | Android informou deviceLocked=1. Tocar Concluir tarefa manteve secure-lock08 pendente. Titular desbloqueou; deviceLocked=0; revisão e confirmação explícitas concluíram por push08-admin |

Contas locais fictícias: cuidadora/admin no grupo A e outra conta no grupo B. Nenhum paciente, tarefa ou ponto real foi alterado. Os avisos exibem conteúdo genérico no sistema; detalhes são obtidos após autorização no app.

Alguns envios aceitos pelo FCM chegaram atrasados/em lote; causa de transporte não foi conclusivamente identificada. Token SDK correspondeu ao servidor, relógio e conectividade foram conferidos. Não se garante entrega instantânea, nem se confunde aceitação FCM com entrega observada. No teste de perfil a recuperação respeitou backoff do SDK e ultrapassou a espera inicial de 9 segundos da ferramenta de ensaio.

## Testes e APK

- Lint aprovado.
- Testes JS: **180, sendo 157 aprovados, 23 skips condicionais, zero falhas**.
- Builds web/mobile e sync Android aprovados.
- Gradle debug aprovado; JUnit nativo **2/2**. Nenhuma dependência atualizada nesta rodada.
- APK instalado e usado na bateria: `android/app/build/outputs/apk/debug/app-debug.apk`, 10.323.639 bytes.
- SHA256: `191C40219A477C6EF5163D46F060C73272061009DFBEF9575CBDF22F70471A94`.
- Release continua bloqueado. Nenhum deploy, commit, push, PR ou alteração em produção.

Os testes de integração antigos em demo não foram apresentados como reexecutados neste projeto; nesta bateria foram usados os endpoints HTTP reais dos emuladores e o aparelho para os cenários descritos.

## Consumo: medição e estimativas

Medição local final: grupo A com 25 recibos push, um dispositivo, uma pendência de ponto e dois registros fictícios; grupo B sem recibos/dispositivos. Houve também dois envios diretos de diagnóstico aceitos (duplicata e contexto divergente). Esses números não medem todas as tentativas HTTP nem significam 27 entregas observadas. Tráfego OAuth, registro de token e bytes não foram medidos. Todos os documentos de negócio ficaram no Firestore Emulator.

Estimativas por fluxo, dependentes dos caminhos de autorização/concorrência:

| Fluxo | Functions / Firestore estimados |
|---|---|
| Cadastro nativo inicial | 1 chamada, cerca de 7 leituras e 3 escritas |
| Reabertura com vínculo/ACK válido ou app ocioso | 0 novas chamadas/leituras pelo módulo push; SDK pode gerar tráfego de manutenção |
| Rotação de token | 1 chamada, cerca de 7 leituras e 4 escritas incluindo reserva anterior |
| Logout | Até 1 chamada, cerca de 5 leituras e até 3 exclusões |
| Revisar tarefa / confirmar | 1 chamada por gesto, cerca de 6 leituras; revisão 0 escritas, conclusão 1 |
| Replay de conclusão | Validações continuam necessárias; nenhuma nova escrita de conclusão |
| Confirmar cuidado | 1 chamada, cerca de 6–7 leituras e 1–2 escritas por ocorrência/resumo |
| Envio para D dispositivos | Consulta de dispositivos/perfis, leitura de recibo por dispositivo, gravações de recibos efetivamente enviados e lease; retries podem acrescentar operações |
| Atualização de permissão na UI | Somente bridge local; 0 Functions e 0 leituras Firestore |

Consultas de autorização existentes não foram removidas para economizar. A correção de cache reutiliza os observadores atuais e evita uma interpretação errada, sem nova consulta por aviso ou item. A estimativa de ociosidade é incremental do push, não de todo o aplicativo: outras rotinas existentes mantêm seu comportamento. Cache Firestore remoto ainda pode gerar leituras faturáveis; aqui o banco é emulado.

Não foram adicionados polling, Scheduler, TTL, backups, Analytics ou serviços pagos. FCM consta sem cobrança de serviço na tabela Firebase; isso não representa promessa de custo zero para rede, computador ou outros produtos. [Preços Firebase](https://firebase.google.com/pricing), [emuladores com projeto real](https://firebase.google.com/docs/emulator-suite/connect_functions), [autorização FCM](https://firebase.google.com/docs/cloud-messaging/send/v1-api).

## Segurança e limites restantes

Uma consulta inicial a login:list do Firebase CLI emitiu credenciais na saída da ferramenta. Não foram copiadas para código/relatórios/APK; recomenda-se renovar a sessão CLI utilizada. Nenhuma credencial global foi revogada silenciosamente, pois isso ultrapassaria o projeto de teste.

Ajustes temporários de energia, AppOps, diagnóstico e encaminhamento CDP foram restaurados/removidos; permissão de avisos e Wi-Fi/dados ficaram habilitados. O bloqueio seguro configurado pelo titular foi preservado, sem consultar PIN. Mantidos os três reverses USB e os emuladores locais de teste.

Permanecem os bloqueadores de distribuição em [encerramento-android.md](encerramento-android.md), incluindo exclusão efetiva de conta, revisão administrativa offline, recuperação de senha final, identidade/assinatura/AAB, privacidade e regressão física no destino final. Não iniciar Apple como consequência desta etapa.
