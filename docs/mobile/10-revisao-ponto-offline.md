# Script 10 — revisão administrativa de capturas offline

> Complementação em 23/10/2026: [validação com localização nativa real](10-complemento-gps-real.md). Capturas com rede ativa, preservação após reinício offline e decisões foram exercitadas com amostras reais. O trecho de obtenção da amostra iniciada sem rede continua pendente; não foi declarado concluído.

23/10/2026 · branch `feat/ponto-operacoes-offline`. Trabalho local, preservando as alterações dos Scripts 02–09. Sem produção, deploy, migração, commit, push, PR, serviços pagos ou trabalho Apple. Este documento substitui a limitação de aprovação indisponível descrita historicamente no Script 02.

## Contrato e persistência

O callable `revisarPendenciaPonto` oferece `listar`, `detalhe` e `decidir`. O grupo é resolvido pelo vínculo do UID autenticado, dentro da transação; `grupoId` do pedido apenas confere o contexto esperado. Legado continua disponível quando não há vínculo e a migração não o bloqueou.

Reutiliza `pontoPendencias` e o payload imutável do Script 02. Estados: `aguardando_analise`, `aprovada`, `rejeitada`. Falha de transporte, conflito de sequência, dia alterado e folha fechada não são decisões e não mudam esse estado.

Pedido de decisão v1: `pendenciaId`, `decisaoId` estável, `resultado`, `horaRevisada` HH:mm, `justificativa` (5–1000 caracteres), `revisaoDia` recebida ao examinar o detalhe. A data continua a da captura; não se permite deslocá-la para outra jornada. Hora declarada e hora administrativa ficam separadas. O instante da sincronização nunca é usado como horário revisado.

O documento protegido da pendência recebe `decisao`: versão, ID/hash, administrador, justificativa, timestamp de commit, horário revisado, revisão do dia e referências ao registro/jornada. `pontoDecisoes/{adminUid}_{decisaoId}` contém o recibo/auditoria da decisão, sem duplicar o payload da captura. Protege a reutilização de um ID para outra pendência ou outro conteúdo. As duas coleções e `pontoOperacoes` negam leitura/escrita direta, inclusive administrativa; o acesso é pelo callable. `registros` mantém a proibição de escrita direta.

Na aprovação, uma transação atualiza pendência, recibo original e dia, cria registro oficial determinístico e recibo da decisão. Se já houver folha aberta afetada, incrementa sua versão e exige reconferência. Na rejeição, escreve apenas pendência, recibo original e auditoria/recibo da decisão. Não cria registro, dia ou pagamento.

Repetir a mesma decisão devolve o resultado original, sem recalcular ou escrever. Mesmo ID com outro conteúdo retorna conflito. Decisões concorrentes diferentes não podem ambas vencer. Se a resposta se perder, o botão de recuperação reenvia exatamente o pedido mantido na tela. Após fechar/reabrir, o detalhe também permite consultar a decisão persistida; não é preciso reenviar captura ou recuperar seu armazenamento original.

O primeiro documento diário de `pontoPendencias` mantém também um ponteiro `pendenciaAtivaId` quando houver novas capturas após uma decisão. As posteriores ficam na mesma coleção, identificadas por UID/operação. Isso preserva o payload e a decisão de cada captura e serializa novas tentativas no mesmo dia sem outro repositório de capturas. Só uma pode aguardar análise por jornada. Captura aprovada/rejeitada não é reciclada: uma nova exige novo gesto/ID. O recibo original passa a devolver o resultado administrativo no replay.

## Autorizações

| Perfil/situação | Consulta | Decisão |
|---|---|---|
| Administrador ativo | Pendências do próprio grupo | Aprovar/rejeitar com justificativa |
| Funcionário ativo | Apenas seu UID e funcionário no próprio grupo | Não |
| Consulta/inativo | Não neste endpoint | Não |
| Outro grupo | Não | Não |
| Conta original excluída ou sem vínculo ativo | Administrador atual pode examinar | Aprovação bloqueada especificamente; rejeição justificada disponível |

O servidor verifica contexto, perfil e estado novamente na transação, inclusive no replay. Não recria Auth, usuário, vínculo ou funcionário de conta excluída. A política de retenção continua sob o titular com orientação contábil/jurídica, conforme Script 09.

## Aprovação, conflitos e folha

Reutiliza `aplicarAcao` de `ponto-validacao.cjs`, com as regras existentes de sequência, intervalo e saldo. Só preenche a próxima marcação; não sobrescreve marcações. Horário precisa ser estritamente posterior às marcações já existentes. Exige a mesma revisão do dia examinada no detalhe. Não aprova data futura, funcionário inativo, dia encerrado, captura cuja data operacional diverge da declarada ou folha em estado diferente de `em_andamento`.

Capturas offline são declarações, não GPS autenticado. O detalhe mostra precisão/localização sem mapa e sem anunciar presença comprovada. O geofence e as validações das marcações online permanecem intactos; não se ampliou raio nem se inventou turno noturno, janela retroativa legal ou prazo de retenção.

Folha existente e aberta: aprovação altera apenas `versao` e `pontoRevisaoPendente`, sem recalcular dinheiro automaticamente. O administrador deve reabrir, conferir horas/descontos e marcar a confirmação exibida antes de salvar/fechar. A versão anterior é recusada; o backend exige confirmação e as regras impedem fechar/salvar diretamente pelo cliente enquanto há essa pendência. O fechamento e a aprovação compartilham o documento da folha na transação, serializando a concorrência. Folha fechada/paga nunca é reaberta.

**Limitação operacional explícita:** o ajuste manual antigo não foi convertido em conclusão transacional desta pendência. Jornadas encerradas, sequências incompatíveis, turno noturno e folha fechada continuam bloqueados para aprovação direta. A interface orienta examinar o ajuste existente e permite rejeitar justificadamente; não marca um ajuste externo como resolução automática. Casos que exigem aprovação após correção/reabertura ainda precisam desse vínculo e de política própria. Não estão classificados como resolvidos por apenas terem sido bloqueados.

## Interface e fila

Seção recolhida em Gestão para administrador; em Ponto, “Minhas capturas e decisões” para a funcionária. Consulta ao abrir ou por botão, período, estado administrativo, 20 itens por página (servidor máximo 50), cursor por data/ID. Sem carregar histórico completo, contagem global ou listener por item. A lista não consulta nome por item; o detalhe recupera o nome junto dos documentos necessários.

Resultados próprios podem ser consultados sem captura no aparelho. Quando ela existe, atualiza seu status e recibo no escopo UID/grupo, sem modificar o payload. Resposta antiga em trânsito não reverte um resultado administrativo terminal. Troca de conta/grupo descarta a resposta na interface e não a aplica à fila da nova conta. Não cria nova operação nem reenvia `recebida` para descobrir decisões. O listener diário que já existia reflete a jornada oficial; nenhum listener novo de revisão foi adicionado.

Registro aprovado tem `origem: revisao_offline`, `registradoPor` administrativo e `autorOriginal` separado. Triggers de alerta online ignoram essa origem antes de consultar grupo/destinatários. Não há notificação nova, envio FCM ou alegação de marcação online da funcionária.

## Consumo incremental estimado

Estimativas por execução sem retry da transação, para grupo ativo; não são medições de faturamento. Documentos inexistentes/consultas vazias podem gerar leitura mínima. Retries por contenção, índices e infraestrutura podem aumentar consumo.

| Fluxo | Functions | Leituras de documentos estimadas | Escritas |
|---|---:|---:|---:|
| Primeira página (20 itens, com sentinela) | 1 | 3 de autorização + até 21 resultados | 0 |
| Abrir detalhe | 1 | 7: autorização, pendência, dia, folha, funcionário | 0 |
| Aprovar | 1 | 12: inclui recibos, acesso original e ausência do registro | 5; 6 com folha aberta |
| Rejeitar | 1 | 9 | 3 |
| Repetir decisão concluída | 1 | 5 | 0 |
| Consultar resultados próprios | 1 | 3 + até 21 resultados | 0 remotas; atualização local dos recibos presentes |
| Seção ociosa/recolhida | 0 novas | 0 novas desta funcionalidade | 0 |

Sem polling, Scheduler, mapa, TTL, listeners de revisão ou serviço pago novo. O registro oficial pode disparar a infraestrutura de trigger existente, mas o handler retorna antes de leituras/push para essa origem; execução de trigger não é sinônimo de custo zero. A assinatura diária já existente pode receber o dia alterado, gerando sua leitura habitual. O fluxo de salvamento da folha mantém a consulta financeira anterior; não foi ampliada para todos os meses.

Captura/replay inicial mantêm o consumo do Script 02: online aceito 8 leituras/3 escritas no caso de teste com um local; replay 4/0; primeira captura pendente 6/2. Depois de decisões no mesmo dia, o ponteiro ativo pode exigir mais uma leitura e uma captura posterior escreve também o ponteiro (3 escritas). App sem atividade não ganha consultas de revisão. Persistir decisões e três índices usados pelos filtros acrescenta armazenamento; cache local não substitui autorização.

## Arquivos e validação

Principais: `functions/ponto-revisao.cjs`, `ponto-operacoes.cjs`, `index.js`, `push.cjs`, `folha-pagamento.cjs`; `src/components/PontoRevisao.jsx`, `PontoOperacoes.jsx`, `usePontoOperacoes.js`; `src/services/pontoRevisao.js`, `pontoFila.js`; páginas Admin, Ponto e Financeiro; regras/índices; testes `ponto-revisao-*`.

Validação automatizada encerrada em 23/10/2026:

- `npm run lint`: passou.
- `npm test`: 194 testes, 167 aprovados, 27 ignorados por dependerem de integração/ambiente opt-in, zero falhas. Inclui recibo local, resposta antiga, sessão trocada e supressão de push administrativo.
- Bateria dirigida nos emuladores: `tests/ponto-revisao-emulador.test.cjs`, `ponto-operacoes-emulador.test.cjs`, `folha-emulador.test.cjs`: **33 aprovados, zero falhas**. Inclui sequência/cálculo, aprovação/rejeição concorrentes, replay simultâneo, hash, preservação, paginação, autorização, mudança de dia, folha aberta/fechada, conta removida, turno sem suporte e regras de acesso.
- `AP1303_TEST_REVISAO_HTTP=1 node --test tests/ponto-revisao-http.test.js`: **1 aprovado**. Auth e callable reais dos emuladores, aprovação/replay e negação de acesso direto a pendências, auditoria e registros. Não se confundiu execução de handler com validação HTTP.
- `npm run build`, `npm run build:mobile:dev`, `npm run cap:sync:android`, `android/gradlew.bat assembleDebug`: passaram. Avisos existentes de chunks/imports e APIs Gradle depreciadas continuam; não houve atualização de dependências.

Houve duas falhas de ambiente durante a preparação: tentativa de iniciar outra suíte nas portas já ocupadas (passou a reutilizar os emuladores existentes) e colisão de e-mails fixos da fixture legada de folha em reexecução. Os dois e-mails agora usam UUID; **nenhuma asserção ou autorização foi removida**. Cada reexecução da regressão usa `GCLOUD_PROJECT=demo-ap1303-s10-<sufixo-novo>` para isolar dados Firestore sem apagar ensaios anteriores. A primeira execução de `npm test` restrita também teve bloqueio de leitura do esbuild pelo sandbox; a execução permitida passou. Não foi interpretado como regressão de produto.

### Samsung — resultado físico parcial

Conferido por ADB: Samsung SM-A057M, Android 15, serial de teste terminado em CEJ, pacote `br.dev.acstech.ap1303.dev`. Grupo e contas exclusivos fictícios do Script 10, Auth/Firestore/Functions locais.

1. Captura pela interface tentada duas vezes sem rede e uma com rede, sempre escolhendo modalidade pendente. **GPS terminou em timeout, nenhuma operação foi salva no aparelho.** Permissões aproximada/precisa estavam concedidas e `location_mode=3`. Não se desativou validação, não se ampliou raio e não se substituiu a amostra por coordenadas inventadas.
2. Para testar independentemente a revisão, duas capturas **fictícias do servidor**, datadas de 22 e 23/10, foram recebidas pelo handler original; não foram apresentadas como capturas físicas bem-sucedidas.
3. Administrador fictício abriu Gestão, listou, examinou e aprovou uma captura com justificativa/confirmacão; examinou e rejeitou a outra. A consulta sofreu timeout enquanto o protetor de tela suspendeu a WebView; depois de retornar ao primeiro plano, foi retomada normalmente. Falha de rede não virou rejeição.
4. Funcionária fictícia consultou resultado próprio **sem captura na fila local**: aprovada e rejeitada apareceram; a jornada mostrou entrada aprovada às 16:38. Atualização explícita repetida não gerou marcação adicional.
5. Administrador de outro grupo fictício abriu a mesma seção e recebeu lista vazia. O teste automatizado cobre também a tentativa explícita de acessar/decidir ID de outro grupo, não apenas a ausência na interface.
6. Verificação independente no Firestore local: aprovada com **1 registro oficial**, autoria administrativa e payload preservado; rejeitada com **0 registros oficiais e sem dia criado**. Nenhuma conta ou dado real foi usado.
7. Logout realizado. Wi-Fi/dados móveis restaurados; protetor de tela voltou a 1, manter acordado no USB a 0 e timeout de tela permaneceu 30000 ms. PIN não alterado. Forward CDP 9223 removido; reverses dos emuladores preservados.

**Pendente:** ponta a ponta físico captura GPS offline → recebimento → decisão → atualização da mesma fila local. A parte de atualização local foi exercitada em IndexedDB fake e o recebimento/revisão em emuladores; isso não substitui esse ensaio físico. Investigar o timeout real do GPS no ambiente/aparelho, sem atribuir causa definitiva apenas à janela ou permissão. A bateria física completa e os bloqueadores do checklist continuam impedindo classificar Android como pronto para loja.

APK debug: `android/app/build/outputs/apk/debug/app-debug.apk`, 10.323.639 bytes, SHA-256 `291B74FD4B3A6A6613F1CD9EC059AFB4709B127608C792E2D46A36A4D99B1BFD`, ambiente `teste`, projeto de teste exclusivo com Auth/Firestore/Functions emulados em 127.0.0.1 e sem fallback para produção. Gerado e instalado no Samsung. Não é um release/AAB.

A revisão também bloqueia aprovação direta sobre dias com ajuste manual/afastamento (inclusive férias/atestado/dispensa), preservando o abono e os totais existentes. Esses casos podem ser examinados e rejeitados justificadamente; não se aplica uma entrada por cima do afastamento.

## Roteiro manual e publicação futura

1. Iniciar Auth/Firestore/Functions locais: `firebase emulators:start --project ap1303-android-push-teste --config firebase.compras-emulator.json --only auth,firestore,functions`. O ambiente híbrido já autorizado usa somente FCM do projeto de teste; dados/autenticação/callables são emulados.
2. Conferir serial/modelo do Samsung autorizado, instalar APK debug e fazer `adb reverse tcp:9098 tcp:9098`, `tcp:8877 tcp:8877` e `tcp:5007 tcp:5007`. Não expor emuladores na rede pública.
3. Conta fictícia funcionária: carregar o dia online, ficar offline e salvar captura com GPS real. Confirmar persistência local antes de reconectar. Não substituir GPS para fazer passar.
4. Reconectar; conferir “recebida”. Admin do mesmo grupo: Gestão → Revisar capturas offline → Examinar → horário e justificativa → confirmar aprovação.
5. Funcionária: Ponto → Minhas capturas e decisões → atualizar; conferir resultado e jornada. Repetir consulta/replay não cria registro adicional.
6. Nova captura/novo gesto: rejeitar com motivo e conferir que não há marcação. Outro grupo não acessa dados; conta excluída não é recriada.
7. Testar dia modificado após detalhe, folha fechada e reconferência da folha aberta. Os conflitos continuam pendentes até decisão válida; falha de rede não os rejeita.

Publicação futura, **não executada**: rever o diff preservado e bloqueadores do checklist; concluir ensaio físico pendente; disponibilizar índices e regras compatíveis, aguardar índices prontos; publicar backend compatível e testar em ambiente autorizado; só então frontend/APK e regressão no destino final. Não publicar cliente dependente de callable/índices ainda indisponíveis. Release/lojas e Apple continuam fora desta rodada.
