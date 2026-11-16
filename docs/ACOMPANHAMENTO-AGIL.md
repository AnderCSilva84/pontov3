# Acompanhamento ágil — Tá no Ponto

## Situação para retomada — 15/11/2026

**Estado atual — rodada26:** 42 Functions e Rules do commit681ac8a publicadas com sucesso. 30 callables recusadas sem autenticação; 20 Functions fora do lote preservadas; regras remotas iguais ao arquivo versionado. Gates desligados, inventário dedicado preservado e retomada RTDN ativa. Próximo passo: homologação funcional/autenticada no Android e grupo dedicado. Sem push, PWA/Android novo ou cobrança. Roteiro26 documenta evidências e 10 avisos não bloqueantes do compilador das Rules. Os parágrafos seguintes preservam o histórico anterior ao deploy.

Rodada25: snapshot integrado versionado em Git local, sem push. Verificador local do manifesto42 criado; roteiro de publicação seletiva Functions → Rules preparado, sem execução de deploy. Histórico, evidências e critérios de parada em mobile/25-versionamento-publicacao-coordenada.md. Conferir o hash em git log e na issue9. Sem ativação de grupos ou compras.

Rodada seguinte #9 concluída: integrações externas/centrais revisadas e regras remotas comparadas (iguais ao HEAD, diferentes das comerciais locais). Corrigida localmente a gestão privada da central com guarda transacional; catálogo agregado preservado. Manifesto atualizado para 42 Functions. 21 regressões emuladas aprovadas, geral 380 aprovados/67 ignorados/0 falhas; lint aprovado. Roteiro24 detalha decisões e evidências. Nenhum deploy, gate ou cobrança alterado. Próximo fechamento: versionamento e publicação coordenada, depois homologação dedicada.

Ler [CONTINUAR-NO-VSCODE.md](CONTINUAR-NO-VSCODE.md) antes do histórico abaixo. Titular confirmou atualização pela Play e sessão preservada. Onze Functions novas/RTDN implantados, gates desligados e grupos em transição; homologação funcional/cobrança/migração/produção ainda pendentes. A evolução acumulada permanece local, sem novos commits/push. Workspace `ta-no-ponto.code-workspace` preparado para continuar o desenvolvimento e registrar conclusões no Projects.

Rodada de revisão do lote #9: 62 entradas locais correspondem a recursos remotos ACTIVE; 30 candidatas existentes documentadas com regiões e hashes no roteiro23. Corrigida localmente a guarda de compartilhamento de comprasRelatorio, seguindo as consultas anteriores. 16 regressões de consultas/compartilhamento/Rules aprovadas e lint aprovado. Sem deploy ou ativação. Integrações externas/centrais e regras remotas continuam pendentes de fechamento.

## Forma de trabalho

Usaremos rodadas curtas por objetivo, com backlog priorizado e quadro: A fazer → Em andamento → Em validação → Concluído. Cada rodada terá escopo e critérios de aceite explícitos. Novas ideias entram no backlog; falhas que impedem o uso têm prioridade.

Antes de implementar, registrar o resultado esperado e como será verificado. Durante a rodada, informar avanços e bloqueios. Ao encerrar, apresentar o que mudou, evidências, pendências e próximo objetivo. Ajustar o processo com o usuário após cada rodada.

Uma tarefa só está concluída quando os critérios de aceite forem atendidos e as verificações pertinentes passarem. Compilação não substitui teste no celular. Publicação é uma etapa separada, dentro da autorização da rodada. Preservar dados existentes e usar dados de teste para operações que alteram registros.

## Rodada 1 — validar Android código 4

Objetivo: confirmar as correções visuais antes de preparar uma atualização de produção.

| Item | Critério de aceite | Estado |
| --- | --- | --- |
| Atualização do aparelho | Código 4 instalado pela Play, sem reinstalação ou limpeza de dados | Concluído — ADB confirmou em 11/11/2026 |
| Seleção de equipe | Nomes legíveis e sem a logo no seletor de Ponto | Concluído — usuário confirmou no celular: “Os três passaram” |
| Seleção de texto | Menu de seleção em Minha conta sem fundo de logo | Concluído — usuário confirmou no celular: “Os três passaram” |
| Exclusão recolhida | Seção inicia fechada e expande ao toque; sem executar exclusão | Concluído — usuário confirmou no celular: “Os três passaram” |

Evidência técnica: build web, recursos Android e bundle release passaram; código 4 disponível no teste interno. Evidência física até agora: `versionCode=4`, `versionName=1.0.0`, instalador `com.android.vending`. Isso não comprova os três comportamentos visuais.

## Rodada 2 — compras e associação de produtos

O usuário confirmou: “importação e baixa deu 100% certo”. Esses dois fluxos estão aceitos na validação do código 4.

| Item | Critério de aceite | Estado |
| --- | --- | --- |
| Importação e baixa | Importar e finalizar compra corretamente | Concluído — confirmação do usuário |
| Digitação na janela de compra | Campo permanece visível com teclado aberto; cabeçalho não encobre a digitação | Implementado localmente — validar em celular |
| Sugestões de associação | Reconhecer abreviações fiscais e aliases normalizados, preservando confirmação, categoria e apresentação | Testes automatizados passaram — validar no uso |
| Leitura pela câmera | Registrar condição em que a leitura incomoda antes de atribuir limitação ao hardware | Pendente de reprodução; foco contínuo já é solicitado quando disponível |

Alterações compartilhadas pelo PWA e Android, ainda sem publicação nesta rodada. Não alteram notas nem associações existentes. Mais detalhes em `mobile/rodada-2-compras.md`.

Rodada 1 encerrada com aceite do usuário: “Os três passaram”. Os três comportamentos foram validados no código 4 instalado pela Play. Próxima rodada: homologação dos fluxos essenciais, começando por compras e associação de produtos existentes, conforme histórico de dificuldades. Este aceite não significa homologação integral do app nem aprovação de produção pelo Google.

## Backlog priorizado

1. Validar os ajustes de digitação e associação da rodada 2 no celular e no PWA.
2. Concluir a homologação dos fluxos essenciais conforme `mobile/homologacao-codigo-3.md`, registrando a versão efetivamente testada: ponto, compras/importação, PDF, notificações, fotos e alimentação.
3. Preparar o primeiro lançamento público na [issue #7](https://github.com/AnderCSilva84/pontov3/issues/7), conforme [roteiro de lançamento](mobile/primeiro-lancamento-publico.md). Em 13/11/2026, a mensagem apresentada pelo titular confirmou concessão de acesso à produção e aos testes abertos, sem comprovar aprovação de uma versão específica. Conferir a faixa Produção e definir a candidata após validação, antes da publicação correspondente.
4. Assinaturas — [issue #8](https://github.com/AnderCSilva84/pontov3/issues/8): [definição comercial v4](PLANOS-E-ASSINATURAS.md), corrigida conforme esclarecimento de que Escritório contábil é a seção existente, bloqueada no Free. [Implementação #9](https://github.com/AnderCSilva84/pontov3/issues/9) iniciada localmente para compor a mesma versão completa de produção da #7. [Estado, dependências e homologação](ASSINATURAS-IMPLEMENTACAO.md); sem cobrança ou deploy.

Prioridades podem ser revistas com o usuário. Não prometer data de aprovação da Play nem marcar funcionalidades como homologadas sem evidência.

## Rodada 3 — AAB com Billing no teste interno

Em 14/11/2026, AAB 6 (1.0.0) disponível para testadores internos. Assinatura, manifesto release e ambiente validados; compatibilidade preservada. Base nativa #10 concluída; #11 em validação, aguardando atualização física pela Play sem limpeza de dados. Cadastro de assinaturas desbloqueado: #12 a fazer. Compras continuam desabilitadas; produção conjunta permanece na #7 após #9 homologada. [Artefato e evidências](mobile/07-aab-billing-teste-interno.md).

## Próximas melhorias — solicitação de 14/11/2026

Avanço #15: reconhecimento e reconciliação RTDN implementados localmente, com entrega privada obrigatória, fila/deduplicação/lease e sincronização apenas do direito existente correspondente. 369 testes aprovados/58 ignorados, mais 6 nos emuladores. Em validação do código, sem deploy/configuração externa ou compra real; integração das cotas/entrega na #9 e configuração RTDN na #12 continuam necessárias. [Roteiro](mobile/10-play-rtdn-reconhecimento.md).

Backend #9/#12: verificação de compras de teste da Play implementada localmente; 9 testes dedicados, 5 de integração nos emuladores e suíte geral com 359 aprovados/58 ignorados, nenhuma falha. API habilitada e identidade dedicada com permissões Firestore/AP1303 configurada após autorização explícita. Sem deploy, compra, reconhecimento ou concessão de direitos. [Evidências e próximos passos](mobile/09-verificacao-play-backend.md).

Avanço posterior: produtos Prata/Ouro/Diamante e planos-base mensais salvos como rascunho na Play, sem ativação. Primeiro refino de Planos/Escritório implementado localmente; lint/build e prévia desktop/320/390/768 aprovados para os cenários conferidos. #13 segue para validação física/aceite, não concluída como refino integral do app. [Evidências e pendências](mobile/08-produtos-play-e-refino.md).

- [#13](https://github.com/AnderCSilva84/pontov3/issues/13): próxima frente de interface, refino visual profissional no Android/PWA começando por Planos e Escritório contábil. Melhorar hierarquia, legibilidade, densidade, espaçamento, valores, ações e navegação; validar com dados fictícios e preservar regras e cálculos. A fazer, P1, L.
- [#14](https://github.com/AnderCSilva84/pontov3/issues/14): acesso do criador aos recursos/cotas Diamante por concessão administrativa protegida no backend, separada de assinatura paga. Confirmar identidade/grupo e testar isolamento/revogação antes de conceder. A fazer, P1, M.

Vinculadas à implementação #9 e à candidata completa #7. Este planejamento não concede direitos, altera dados ou ativa compras. Evidências visuais devem omitir dados pessoais e financeiros reais da captura do titular.

Avanço #9 — 14/11/2026: direitos e cota transacionais no cadastro de membros implementados localmente. Free sem novas contas compartilhadas; titular como único administrador; funcionários 5/15/50 em planos pagos. 13 testes nos emuladores aprovados; suíte geral 369 aprovados/59 ignorados/0 falhas; lint aprovado. Cobertura parcial: escritas diretas, demais cotas, permissões e migração pendentes. Sem ativação ou deploy. Roteiro: mobile/11-direitos-cadastro-membros.md. Progresso registrado na issue #9, que permanece Em andamento no Projects.

Avanço #9 — cadastro de funcionários: criar/garantir/reativar agora têm callable transacional com cota e contexto revalidados; Escritório e edição de acesso usam o servidor. Regras fecham criação/exclusão/reativação direta para grupos com assinaturas ativas. 20 testes nos emuladores aprovados, suíte geral 369 aprovados/59 ignorados, lint/build aprovados. Sem deploy ou ativação. Registro atualizado na issue #9 do Projects. Roteiro: mobile/12-cotas-cadastro-funcionarios.md.

Revisão #6 — 14/11/2026: implementação 44/42/40 validada, oito testes dedicados e suíte geral 370 aprovados/59 ignorados; lint/build aprovados. Corrigida data inválida no formulário. Geração do APP comprovada no AAB 6, sem novo binário nesta revisão. Critério publicar PWA/Functions continua aberto e vinculado à candidata completa #7/#9; #6 não encerrada antes de comprovar publicação. Issues #6 e #7 atualizadas. Roteiro: jornadas-semanais.md.

15/11/2026 — primeira etapa da ordem aprovada na #9 concluída localmente: cotas de listas, tarefas e lembretes aplicadas em transações, incluindo concorrência, reativação, múltiplos domínios e proteção das regras. Registrado na issue #9 do Projects após a conclusão: listas (29 testes), integração conjunta (64 testes) e reabertura idempotente final (11 testes repetidos); suíte geral 370 aprovados/61 ignorados, lint/build aprovados. Próxima etapa: permissões compartilhamento/QR/Escritório; depois ponto do titular no Free; depois cobrança/homologação. Sem deploy, ativação ou migração. Roteiro: mobile/13-cotas-listas-tarefas-lembretes.md.

15/11/2026 — permissões da #9: primeira entrega fiscal concluída localmente. Ouro/Diamante verificados antes da consulta externa e ao preparar/confirmar; interface só monta importador após confirmação de direito. Histórico preservado. 30 testes nos emuladores aprovados, suíte geral 370 aprovados/62 ignorados, lint/build aprovados. Registro na issue #9 do Projects. Escritório e compartilhamento seguem pendentes; validação física da nova tela pendente. Sem deploy/ativação. Roteiro: mobile/14-permissoes-importacao-fiscal.md.

15/11/2026 — Escritório no Free: implementação local concluída na #9. Capacidade validada na interface e transações de folhas/pagamentos/vales/cadastros/documentos; regras fecham gravações diretas. Histórico independente com consulta e exportação de resumo PDF, sem ações de alteração. 31 testes integrados aprovados e 7 direcionados após idempotência final; suíte geral 370 aprovados/63 ignorados, lint/build aprovados. Registrado na issue #9 do Projects. Validação física da tela/PDF pendente; sem deploy/ativação. Próxima frente: compartilhamento e gestão de acesso após expiração. Roteiro: mobile/15-escritorio-free-historico.md.

15/11/2026 — compartilhamento/acessos na #9: núcleo local implementado e registrado no Projects. Gestão transacional com titular único, suspensão separada do login, auditoria/idempotência e cota na conversão funcional; operações e regras protegem membros após expiração. Histórico próprio e conclusão de jornada preservados; captura offline sem prova permanece pendente. 112 testes integrados e 33 finais aprovados; suíte geral 374 aprovados/64 ignorados, lint/build aprovados. Próxima frente: ponto do titular no Free e migração. Antes de ativar, adequar transferência de titularidade ao admin único/identidade de cobrança. Validação física e cobrança/homologação pendentes. Sem deploy/ativação. Roteiro: mobile/16-compartilhamento-acessos-expiracao.md.

15/11/2026 — ponto do titular Free e transferência na #9 implementados localmente. Terminal online com seleção explícita de dois funcionários, cadastro sem login, GPS/horário do servidor, autoria e recibos idempotentes; envios desconhecidos preservados para reconciliação. Jornada aberta pode ser concluída após retirada da seleção; arquivamento via servidor recusa jornada aberta. Aprovado pelo titular: transferência automática somente no Free; cobrança paga exige procedimento assistido, sem mover assinatura. Novo titular exige nova seleção. Validação: 31 testes integrados e suíte geral 378 aprovados/65 ignorados/0 falhas; lint/build aprovados. Roteiro: mobile/17-ponto-titular-transferencia.md. Registrar na issue #9 do Projects, mantendo-a em andamento. Homologação física, migração, concessão do criador e cobrança externa pendentes. Sem deploy, ativação ou cobrança.

15/11/2026 — #9/#15: produtor de entrega automática Google Play de teste implementado localmente. Verificação autenticada, nova consulta sob lease compartilhado, direito+entrega atômicos e ACK posterior pelo gatilho existente. Repetição não reativa expirado; concorrência e conflito de canal bloqueados. Android autorizado ganha recuperação de compras existentes, sem iniciar compra. Inventário comercial somente leitura com cotas reais, vínculos/admin único, jornadas e hash de versões, sem ativação. Titular confirmou Android com teste interno instalado; versão solicitada, homologação atual não realizada. Validação: 23 testes integrados + 6 direcionados finais, 380 gerais aprovados/66 ignorados/0 falhas; lint/build aprovados. Registro nas issues #9 e #15 do Projects, abertas. Roteiro: mobile/18-entrega-teste-migracao-homologacao.md. Mercado Pago, RTDN externo, nova candidata, migração real e homologação física pendentes. Sem deploy, plano ativado ou cobrança.

15/11/2026 — preparação externa #9/#15: inventário somente leitura do grupo demo_play_ap1303_v1 sem excedentes/jornadas abertas/bloqueios; transição preservada, locais/seleção/filas pendentes. Tópico assinaturas-play-rtdn criado no projeto aprovado, sem novo binding de publicação. Seis Functions preparadas com regiões explícitas; deploy parou antes da criação ao exigir aceite de retries. Revisão automática rejeitou continuação sem autorização explícita de retries potencialmente recorrentes/cobrados por até sete dias. Nenhuma das seis Functions encontrada na conferência posterior. 21 testes direcionados, lint/sintaxe aprovados. Configuração privada ausente, gates desligados. Roteiro mobile/19-preparacao-backend-homologacao.md. Sem frontend/regras/app publicados, ativação ou cobrança. Aprovação específica de implantação pendente; registrado na #9/#15 do Projects.

15/11/2026 — autorização explícita recebida para seis Functions/retries/agendamento. Cinco criadas ACTIVE; três callables recusam anônimo 401; scheduler 15min ENABLED. reconhecerEntregaPlay não criada: falta eventarc.events.receiveEvent. Concessão roles/eventarc.eventReceiver bloqueada pela revisão automática por exigir aprovação IAM persistente específica; não aplicada. Teste Pub/Sub sem compra/token encontra 403 no consumidor por run.routes.invoke ausente; identidade exata confirmada. Agendador já tem invoker. Preparado pedido restrito à conta assinaturas-play: Eventarc Event Receiver no projeto e Run Invoker só receberrtdnplay/reconhecerentregaplay. Gates desligados e grupo em transição. Sem outras Functions/regras/frontend/app atualizados ou cobrança. Roteiro mobile/19-preparacao-backend-homologacao.md; #9/#15 registram progresso parcial e pendência de permissão.

15/11/2026 — IAM explicitamente aprovado e aplicado à conta dedicada: Eventarc Event Receiver no projeto e Run Invoker apenas nos dois serviços de eventos. reconhecerEntregaPlay implantada; seis Functions ACTIVE, três APIs recusam anônimo 401, scheduler 15min ENABLED. Teste de transporte Pub/Sub recebido/registrado (HTTP200 após propagação IAM). Verificação final aprovado:true com gates desligados e grupo em transição. Evidências output/homologacao-backend-verificacao-final.json e output/homologacao-rtdn-confirmado.json. Publicador Google Play/Console, compra física, candidata e regras/cobertura ainda pendentes. Sem plano/cobrança/grupo ativado ou demais publicações. #9/#15 atualizadas; roteiro mobile/19-preparacao-backend-homologacao.md.

15/11/2026 — #9/#11/#15: identidade oficial Google Play recebeu Publisher só no tópico dedicado; RTDN do AP1303 salvo na Play Console e teste do painel confirmado no backend. Titular confirmou maior código6; AAB7/1.0.0 gerado localmente, assinado com certificado existente, bundletool/manifesto/assinatura/lint aprovados, compras desabilitadas. Artefato6 preservado; AAB7 não enviado. Cinco APIs novas necessárias à interface implantadas seletivamente (cadastro/ponto/acessos/Escritório/tarefas); ACTIVE e401 sem login, min0/max2. Gates desligados/grupo transição; regras e Functions antigas não publicadas, cobertura comercial completa pendente. Roteiro mobile/20-play-rtdn-candidata7.md; próximas etapas envio interno/revisão e homologação física, sem cobrança ou ativação.

15/11/2026 — fluxograma completo solicitado pelo titular gerado e conferido: docs/arquitetura/fluxograma-completo-2026-11-15.png (4000x5790), documentação e fonte Python preservadas. Mapa separa base, marcos implantados, candidata local e pendências; cobre frontend/backend, dados/arquivos/offline/push, integrações, Play/MP, planos, Projects e lançamento. #9 atualizada com a entrega e resumo atual corrigido (11 Functions novas e RTDN implantados; compras/gates desligados, AAB7 local). Sem commit/push, deploy ou alteração de dados nesta rodada.

15/11/2026 — código7/1.0.0 enviado e publicado no teste interno, nome 7 (1.0.0) - Validação interna. Console Disponível para testadores internos; sem erros/perda de dispositivos, dois avisos de símbolos/desofuscação. Compras desabilitadas; gates desligados e grupo em transição. Código7 consumido e guard local atualizado. Titular orientado a atualizar pela Play sem limpar dados; abertura/sessão e homologação física aguardam retorno, sem Android por ADB. #9/#11/#7 registradas e mantidas abertas. Fluxograma atualizado; roteiro mobile/21-teste-interno-codigo7.md e screenshot output/candidata7-play-interno.png. Sem promoção a Produção.

15/11/2026 — organização para VS Code: workspace ta-no-ponto.code-workspace com seis tarefas locais, busca/navegação sem gerados e guia docs/CONTINUAR-NO-VSCODE.md. README/organização/acompanhamento/produção alinhados ao código7 interno e atualização física ainda indisponível ao titular. JSON/tarefas/22 links/diff conferidos; arquivos privados continuam ignorados. Comando de abertura enviado; janela do VS Code não confirmada; #9 registrada no Projects. Alterações acumuladas preservadas, sem commit/push/reset, mudança de lógica, deploy ou publicação nesta rodada.

15/11/2026 — retomada #9: revisão de prontidão encontrou consultas No Bolso/estimativa sem guarda comercial. Teste reproduziu falha; corrigida localmente com guarda transacional antes/depois da leitura, mantendo titular/legado/transição. 38 testes integrados e7 direcionados finais aprovados, 380 gerais/67 ignorados/0 falhas; lint/sintaxe e build aprovados na revisão. Matriz de rollout mobile/22-prontidao-rollout-assinaturas.md, guia VSCode/README atualizados e #9 registrada no Projects. Correção pendente de publicação; sem deploy/ativação/IAM/compra/commit/push. Homologação física #11 continua pendente.

15/11/2026 — titular confirmou app atualizado pela Play e usuário continuou logado. Atualização/sessão aprovadas por relato; demais testes funcionais/cobrança pendentes, sem leitura ADB. #11/#9/#7 atualizadas. Melhorias adicionais do Projects ficam para o futuro por orientação explícita; foco atual fechar revisão/rollout #9, grupo dedicado e cobrança/homologação essencial para produção. Sem deploy/ativação nesta rodada.
