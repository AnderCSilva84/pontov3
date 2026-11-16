# Preparação externa do backend de homologação

15/11/2026 — #9/#15. Projeto explícito: `ponto-app-1c55a`. Grupo dedicado: `demo_play_ap1303_v1`.

**Estado atual após autorização IAM:** seis Functions ACTIVE; três APIs recusam chamadas anônimas; scheduler ENABLED a cada 15min; teste de transporte Pub/Sub recebido e registrado. Gates desligados e grupo dedicado em transição. A infraestrutura desta etapa foi implantada; integração Play Console/compra física ainda pendentes. As seções abaixo preservam os bloqueios anteriores e suas resoluções.

## Conferências realizadas

Inventário somente leitura executado no grupo dedicado: um funcionário, duas listas abertas, nove tarefas, um lembrete; sem excedentes, jornadas abertas ou bloqueios de titular/vínculos. Dois membros ativos. Grupo permanece em transição (`assinaturasAtivas` não ativada). Alertas: compartilhamento será restrito no Free; titular deve confirmar seleção do ponto; revisar cadastro/locais autorizados. Filas dos aparelhos continuam exigindo conferência independente.

Identidade `assinaturas-play@ponto-app-1c55a.iam.gserviceaccount.com` existe. Configuração `assinaturasConfiguracao/google_play` ausente: todas as portas de homologação permanecem desligadas. Nenhuma assinatura/direito foi criado.

Tópico **criado**: `projects/ponto-app-1c55a/topics/assinaturas-play-rtdn`. Política do tópico sem bindings explícitos na conferência. Não foi concedida publicação à Google Play nem configurado o Console. Permissões herdadas não são avaliadas por essa leitura da política do tópico.

## Implantação preparada e bloqueio

Somente estas seis Functions serão implantadas:

| Function | Região | Operação |
| --- | --- | --- |
| consultarAssinatura | us-central1 | Consulta autenticada |
| verificarCompraPlayTeste | us-central1 | Verificação de teste, sem entrega |
| processarCompraPlayTeste | us-central1 | Verificação e entrega de teste sob gates |
| receberRtdnPlay | us-central1 | Pub/Sub, retry, máximo duas instâncias |
| retomarRtdnPlay | us-central1 | Retomada a cada 15 minutos, máximo uma instância |
| reconhecerEntregaPlay | southamerica-east1 | Firestore, retry, máximo duas instâncias |

Regiões fixadas no código: callables compatíveis com `getFunctions(app)` do cliente; trigger de Firestore junto à região dos dados. Mudança de metadados validada com sintaxe, lint e 21 testes direcionados de Play/reconciliação/cliente, todos aprovados.

A primeira tentativa de deploy seletivo parou na confirmação de política de retry, antes de criar Functions. A CLI informou necessidade de aceitar novas tentativas recorrentes, potencialmente cobradas por até sete dias. A tentativa de aceitar essa política foi **rejeitada pela revisão automática**, que exige autorização explícita do titular para esse impacto operacional. Não contornar o bloqueio nem desabilitar a proteção de idempotência para avançar. Conferência posterior não encontrou nenhuma das seis Functions implantada.

Nenhuma regra geral, Function existente, frontend ou Android foi publicado. Não foram ativados planos, grupo ou compras. A criação do tópico é a única mudança externa concluída nesta rodada.

## Próxima autorização concreta

Implantar apenas as seis Functions acima, incluindo o agendamento e os retries descritos, no projeto aprovado. Manter gates de compra/desenvolvimento e grupo desligados. A autorização deve cobrir custo de execuções/retries; não abrange ativar produtos, iniciar cobranças, transferir assinaturas ou publicar em produção o app.

Depois do deploy, verificar estado/identidade de cada recurso, chamadas sem autenticação recusadas e notificações de teste. Preparar separadamente permissão `roles/pubsub.publisher` **somente no tópico dedicado** para `google-play-developer-notifications@system.gserviceaccount.com` e configuração do AP1303 na Play Console. Não atribuir esse papel no projeto inteiro. Nova identidade/permissões precisam de autorização própria quando aplicável; ainda não foram aplicadas.

Antes de habilitar o grupo: concluir cobertura de backend/regras aplicável, locais do ponto, pendências locais e teste físico da candidata atualizada. Ausência de gates impede uma compra válida de teste de ser entregue; não abrir compras antes de todo o circuito estar pronto.

Evidências locais sem segredos: `output/homologacao-inventario.json`, `output/homologacao-backend-deploy.log`, `output/homologacao-backend-tests.log`, `output/homologacao-backend-lint.log`. Estado registrado no Projects nas issues #9/#15, mantidas abertas.

## Implantação autorizada e resultado parcial — 15/11/2026

O titular autorizou explicitamente as seis Functions, retomada de 15 minutos e retries dos dois gatilhos, mantendo compras/grupos sem ativação. Essa autorização substitui a pendência do aceite de retries acima.

**Cinco Functions criadas e ACTIVE:** consultarAssinatura, verificarCompraPlayTeste, processarCompraPlayTeste, receberRtdnPlay e retomarRtdnPlay, todas em us-central1. Runtime Node.js 24. As três callables responderam HTTP 401/UNAUTHENTICATED sem autenticação. Agendamento ENABLED, `every 15 minutes`. Identidade dedicada conferida nas quatro Functions comerciais/eventos; consulta usa a identidade padrão existente. Gates continuam desligados, configuração privada ausente e grupo dedicado em transição.

**reconhecerEntregaPlay não criada:** validação do trigger falhou por falta de `eventarc.events.receiveEvent`. Tentativa de conceder `roles/eventarc.eventReceiver` à conta dedicada no projeto foi rejeitada pela revisão automática, pois autorização do deploy não aprova explicitamente ampliação IAM persistente. Permissão não concedida; bloqueio não contornado.

Teste Pub/Sub publicou uma única `testNotification` sem compra/token. Ainda sem registro no consumidor; logs confirmam HTTP 403 e ausência de `run.routes.invoke`. A identidade de entrega do trigger é a própria conta dedicada. Política explícita de receberrtdnplay vazia; retomarrtdnplay já tem roles/run.invoker para a identidade dedicada e não precisa dessa alteração. Estado ACTIVE sozinho não comprova entrega de eventos.

Próxima autorização exata para concluir a infraestrutura:

- Conta existente `assinaturas-play@ponto-app-1c55a.iam.gserviceaccount.com`: `roles/eventarc.eventReceiver` no projeto `ponto-app-1c55a`, permitindo receber eventos do Eventarc nesse projeto.
- Mesma conta: `roles/run.invoker` **somente nos serviços** receberrtdnplay (us-central1) e reconhecerentregaplay (southamerica-east1, após criação). Sem invoker público nos gatilhos nem papel de invocação no projeto inteiro.
- Repetir implantação apenas do gatilho faltante e validar entrega/retomada. Não conceder papel de publicação à identidade da Google Play nesta autorização; essa integração com o Console permanece separada.

Conferência automatizada em `scripts/verificar-homologacao-backend.cjs`: relatório parcial `aprovado:false` reflete recurso faltante; não significa falha das verificações já aprovadas. Teste de transporte em `scripts/testar-rtdn-homologacao.cjs` não recebe token nem cria direito. Evidências: output/homologacao-backend-deploy-autorizado.log, output/homologacao-backend-verificacao.json, output/homologacao-rtdn-teste.json. Sintaxe/lint dos scripts aprovados. Não houve atualização de regras, outras Functions, frontend ou Android; nenhum plano/grupo ativado ou compra/cobrança iniciada. Backend permanece parcialmente implantado, ainda sem homologação ponta a ponta.

## Resolução autorizada das permissões e verificação final

O titular aprovou explicitamente os papéis solicitados. Aplicados à identidade dedicada existente: Eventarc Event Receiver no projeto e Run Invoker somente nos serviços receberrtdnplay/us-central1 e reconhecerentregaplay/southamerica-east1. Políticas explícitas dos dois serviços conferidas com apenas essa identidade no papel de invocação; sem allUsers/allAuthenticatedUsers. Não foram concedidos outros papéis nem criada chave privada.

Deploy seletivo de reconhecerEntregaPlay concluído. Seis Functions ACTIVE; identidades, regiões, limites (2 instâncias, 1 no sweep) e retries dos dois gatilhos conferidos. Callables devolvem HTTP401/UNAUTHENTICATED sem login. Job firebase-schedule-retomarRtdnPlay-us-central1 ENABLED/every15min; identidade de invocação já correta.

A primeira tentativa após aplicar IAM ainda recebeu 403 durante propagação. A mesma mensagem de teste foi posteriormente entregue: registro privado em estado teste_recebido, logs HTTP200. Não foi necessário conceder acesso adicional. O teste usa testNotification sem token/compra; não valida ainda publicação pela identidade da Google Play nem entrega de benefícios/ACK de uma compra real de teste. Evidência final: output/homologacao-rtdn-confirmado.json. A propagação de políticas é eventual, conforme [documentação oficial IAM](https://docs.cloud.google.com/iam/docs/access-change-propagation).

Verificação final automatizada: output/homologacao-backend-verificacao-final.json, aprovado:true, com gatesDesligados:true e grupoEmTransicao:true. Log do deploy faltante: output/homologacao-entrega-deploy-autorizado.log. O campo aprovado se limita às verificações técnicas desse script e não aprova cobrança/produção.

Próximo: habilitar publicação da identidade oficial Google Play somente no tópico dedicado, configurar RTDN do AP1303 no Console e conferir o envio pelo Console. Isso permanece separado da autorização IAM da conta assinaturas-play. Depois preparar candidata atualizada, cobertura/regras e grupo de homologação antes de iniciar compra de teste. Nenhuma assinatura, grupo comercial ou compra foi ativada; sem alteração de outras Functions/regras/frontend/Android nesta conclusão. #9/#15 continuam abertas, com a infraestrutura implantada e homologação completa pendente.
