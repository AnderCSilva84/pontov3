# Complemento do Script 10 — localização real no Samsung

23/10/2026, horários operacionais de Fortaleza (UTC−3). Branch `feat/ponto-operacoes-offline`. Alterações anteriores preservadas. Sem produção, deploy, commit, push, migração, nova dependência ou serviço pago.

> Continuação posterior em 23/10/2026: o usuário disponibilizou área aberta; o ciclo iniciado offline foi concluído no Samsung, conforme [Script11](11-fechamento-tecnico-android.md). O relato abaixo mantém a evidência e os limites da tentativa anterior.

## Resultado e limite

**O ciclo físico completo de captura iniciada offline não está concluído.** A obtenção de localização no gesto funcionou com conectividade. Sem rede, em modo avião, o provedor nativo terminou em timeout. Não foi possível executar o teste em área aberta nesta rodada: o usuário informou essa indisponibilidade. Portanto, não foi confirmada uma causa definitiva ambiental/hardware, nem um defeito de código a corrigir.

Não se alterou timeout, raio, geofence, estratégia de amostras ou retry. Não se passou a aceitar localização anterior, coordenadas fictícias ou rastreamento contínuo. O APK não foi recompilado: não houve alteração de aplicação que justificasse outro artefato. Continua o APK do Script 10, SHA-256 `291B74FD4B3A6A6613F1CD9EC059AFB4709B127608C792E2D46A36A4D99B1BFD`.

## Preparação e permissões

- Samsung SM-A057M, Android 15, mesmo aparelho autorizado dos ensaios anteriores; pacote de desenvolvimento `br.dev.acstech.ap1303.dev`.
- Auth/Firestore/Functions exclusivamente nos emuladores locais, projeto de teste `ap1303-android-push-teste`, portas 9098/8877/5007 via USB. Foram criados um grupo e contas fictícios novos, sem reutilizar identidade real ou autorizar geofence por coordenadas do aparelho.
- `ACCESS_FINE_LOCATION` e `ACCESS_COARSE_LOCATION` concedidas; plugin retornou `location: granted`, `coarseLocation: granted`. Serviço global `location_mode=3`.
- Manifest mantém somente permissões de localização durante uso, sem background. Plugin instalado `@capacitor/geolocation` 8.2.4, Capacitor 8.5.3, biblioteca Android ION 2.2.2.
- A primeira abertura encontrou o protetor de tela em primeiro plano. O usuário liberou o aparelho; o ensaio foi feito com a WebView visível. Protetor de tela e opção de manter acordado no USB foram ajustados temporariamente e restaurados no fim. PIN e permissões não foram modificados.

## Etapas e medições reais

Medições de duração com `performance.now()` na própria WebView. A instrumentação temporária de depuração envolveu somente chamadas `Geolocation` da ponte Capacitor: método, início, sucesso/erro, duração, código e visibilidade. Não modificou opções/respostas e não imprimiu coordenadas, payloads, tokens ou dados pessoais. A instrumentação desapareceu ao reiniciar o processo; não foi incluída no app.

| Cenário | Etapa/permissão | Aquisição | Resultado |
|---|---:|---:|---|
| Chamada nativa pontual online, mesmas opções do adapter | 9 ms | 2.141 ms; total 2.150 ms | Amostra obtida; app visível |
| Logo após acionar modo avião, ainda com `navigator.onLine=true` | 3 ms | 2.086 ms; total 2.089 ms | Amostra obtida; **não classificado como teste sem rede**, pois a transição não estava concluída |
| Gesto real de captura pendente, modo avião, Wi-Fi/dados desligados, `navigator.onLine=false` | 39 ms | 10.051 ms | Erro nativo `OS-PLUG-GLOC-0010`; nenhuma operação salva |
| Diagnóstico pontual sem fallback, realmente sem rede | Permissão já concedida | Total 35 ms | `OS-PLUG-GLOC-0016`; comparação diagnóstica somente, sem alterar o adapter |
| Gesto real **Registrar Entrada**, com conectividade restaurada | 7 ms | 5.909 ms | Localização obtida; servidor recusou local não autorizado, conforme esperado |
| Gesto real **Salvar captura offline pendente**, mas **com rede ativa** | 28 ms | 1.948 ms | Amostra real, captura recebida pelo servidor em uma tentativa |

O gesto offline efetivo começou às 16:59:24, o gesto online às 17:01:28 e a captura declarada pendente com rede às 17:02:34. Tempos não constituem medição de faturamento. Não foram inventados tempos para etapas sem instrumentação.

Na tentativa efetivamente offline, o Android apresentava métricas GNSS agregadas com zero relatórios de posição, zero relatórios de primeiro fix e zero relatórios de sinal C/N0; nenhuma constelação usada em fix foi indicada. Foram extraídas apenas essas métricas, sem copiar posições ou históricos do `dumpsys`. É evidência de ausência de fix registrado no ensaio, **não prova de defeito do receptor**, nem identificação definitiva da condição ambiental.

As opções mantidas foram `enableHighAccuracy:true`, `maximumAge:0`, `timeout:10000`, `enableLocationFallback:true`. O erro nativo chegou antes da proteção JS de 10,5 s; portanto, nesse caso medido, a proteção JS não foi a origem da recusa. Não se observou uma resposta de sucesso tardia que justificasse aumentar o prazo.

O código e as definições **da versão instalada** foram conferidos. A [documentação oficial Capacitor 8](https://capacitorjs.com/docs/apis/geolocation#positionoptions) explica que, em caso de falha das configurações dos serviços Google, o fallback usa `LocationManager`; em modo avião pode depender somente do provedor GPS, com maior dependência de recepção. Isso é compatível com os resultados, sem tornar a hipótese uma causa confirmada. Não se usa `watchPosition`.

### Comparação com o ensaio anterior

O relatório de localização de 22/10 registrou gesto físico que obteve posição e foi recusado pelo geofence da conta fictícia, sem locais permitidos. Esse caminho **foi reproduzido nesta rodada**: o registro online recebeu “Você está fora do local autorizado”, após obter amostra. O requisito de localização e o backend não foram afrouxados.

O relato anterior de captura offline pelo usuário não trouxe a mesma trilha de tempos, estado de rede/provedor e recepção GNSS. Sem uma comparação controlada antes/depois nessa condição, não se declara regressão descartada nem confirmada. A evidência atual demonstra funcionamento online e falha offline no local do ensaio.

Localização nativa online pode usar o provedor fundido. Não foi identificado o provedor final da amostra; **não se apresenta sucesso online como prova de fix de satélites offline**.

## Validações independentes executadas no APK

As etapas abaixo usaram amostras reais obtidas no gesto, sem substituição de coordenadas. As capturas pendentes foram feitas **com rede ativa**; não representam o trecho offline ainda bloqueado.

1. Entrada online: amostra posterior ao gesto, uma tentativa de envio, recibo de recusa do local. Nenhum ponto oficial criado por esse pedido. Conta fictícia sem locais permitidos, sem copiar a localização para cadastro autorizado.
2. Nova entrada na modalidade pendente com rede ativa: amostra nativa posterior ao gesto em 462 ms, uma tentativa de envio, estado `recebida`. Não é captura obtida sem rede.
3. Aparelho colocado realmente offline; `am force-stop` somente do pacote de teste e abertura novamente, **sem limpar dados**. IndexedDB preservou IDs, estados, contagem de tentativas e payloads. Comparação SHA-256 do payload antes/depois retornou igualdade; os hashes não exigiram imprimir seu conteúdo. A captura já estava recebida antes de desconectar, portanto esse teste **não valida sincronização inicial após captura offline**.
4. Rede restaurada: a captura recebida não foi reenviada como nova. Administrador demo examinou e aprovou às 17:02, com justificativa explícita sobre a amostra real e a rede ativa.
5. Funcionária consultou a decisão própria e a jornada. A fila passou de `recebida` para `confirmado`; o payload permaneceu o mesmo e o número de tentativas ficou em 1.
6. Outra captura real de saída, na modalidade pendente e com rede ativa, apresentou amostra posterior ao gesto (198 ms) e foi recebida uma vez. Administrador rejeitou com justificativa. Funcionária consultou a rejeição; a fila passou a `rejeitada`, sem mudar a entrada aprovada ou criar saída.
7. Verificação no Firestore emulado: 2 capturas pendentes históricas (1 aprovada, 1 rejeitada), 1 registro oficial administrativo, 3 recibos de operação (incluindo a entrada online recusada). Sem duplicação. Isso é verificação de integridade do fluxo, não consulta remota para diagnosticar GPS.

Após o reinício offline apareceu também um aviso de conectividade referente a lembretes. Não foi usado como evidência de falha GPS nem alterado fora deste escopo; na consulta posterior online não havia alerta.

## Testes e custos

`node --test tests/localizacao-nativa.test.js tests/localizacao.test.js tests/ponto-fila.test.js tests/ponto-revisao-local.test.js tests/ponto-revisao-client.test.cjs`: **27 aprovados, zero falhas/ignorados**. Nenhuma validação ou asserção foi removida. Não houve mudança no adapter, SDK, interface ou backend nesta complementação, portanto não houve build/APK novo. Os builds e integrações do Script 10 continuam documentados separadamente, sem apresentá-los como executados novamente.

Diagnóstico de permissões, serviços e posição é local: **0 chamadas de Functions, 0 leituras/escritas Firestore para diagnosticar GPS**. Amostra recusada por timeout não foi salva nem transmitida. As etapas de registro, recebimento, decisão e consulta usaram os fluxos e custos já descritos no Script 10; as verificações emuladas não são medição de cobrança. Não há polling, listener diagnóstico, rastreamento contínuo, Scheduler, serviço pago ou novo armazenamento remoto. A instrumentação não permanece no aplicativo.

Artefatos locais ignorados: `tmp/gps10-before-restart.json`, `gps10-after-restart.json`, `gps10-final.json`, `gps10-server-results.json`, `gps10-tests.log` e helpers do ensaio. Contêm metadados/estados e fingerprints sanitizados; não contêm cópia dos payloads ou coordenadas. Os payloads originais continuam somente nos armazenamentos do fluxo de ponto.

## Pendência e instrução objetiva para retomar

**Dependência física não disponível nesta rodada:** área aberta com recepção GNSS suficiente. Nenhuma correção de código foi aplicada sem causa comprovada.

1. Conectar ao demo, entrar como funcionária, carregar a jornada do dia no AP1303. Não usar conta administrativa para registrar.
2. Levar o aparelho para área aberta, com visão do céu, mantendo Localização ligada, permissão precisa/durante o uso e app visível. Pode desconectar o USB depois de carregar o dia. Não precisa abrir mapa, instalar outro serviço ou habilitar localização em segundo plano.
3. Ativar modo avião e confirmar Wi-Fi/dados desligados. Deixar o aparelho na área por 1–2 minutos para estabilizar as condições; **essa espera não inicia rastreamento no app**. Tocar uma vez em “Salvar captura offline pendente” e confirmar.
4. O gesto deve produzir amostra nova no prazo atual. Conferir “salva no aparelho, pendente de envio”. Se terminar em timeout, registrar código/duração e não declarar sucesso; não continuar repetindo indefinidamente. Ainda será preciso investigar recepção/provedor/aparelho nessa condição.
5. Com uma captura realmente pendente e não enviada, encerrar/reabrir offline, verificar preservação e reconectar. Confirmar um único recibo/captura com mesmo ID/payload, sem nova obtenção de posição no retry.
6. Administrador aprovar caso válido; funcionária consultar decisão e jornada. Repetir com nova captura para rejeição justificada. Conferir contagens e isolamento.

Somente após executar esse roteiro completo será possível encerrar o bloqueador de captura offline no checklist. Não se amplia prazo/raio, não se reutiliza fix antigo e não se declara o ciclo concluído antecipadamente.

## Restauração do aparelho

Logout da conta demo efetuado. Modo avião voltou a 0, Wi-Fi/dados reativados, protetor de tela a 1, manter acordado no USB a 0 e timeout de tela 30000 ms. PIN e localização não alterados. Forward CDP 9223 removido; reverses dos emuladores mantidos para o ambiente de teste.
