# Cotas operacionais — 15/11/2026

Primeira etapa da ordem aprovada pelo titular: cotas → permissões → ponto do titular no Free → cobrança/homologação. Integra a #9 e a candidata #7. Código local, sem deploy, ativação de grupos ou cobrança.

## Regras implementadas

| Recurso | Free | Prata | Ouro | Diamante | Consumo |
| --- | --- | --- | --- | --- | --- |
| Listas | 3 | 10 | 30 | 60 | Rascunho e em compra |
| Tarefas | 20 | 100 | 200 | 500 | Fixas ativas + avulsas pendentes |
| Lembretes | 10 | 30 | 100 | 200 | Ativos, somando cuidados, avisos gerais e refeições |

`assinaturas-cotas.cjs` resolve direitos privados dentro da transação, revalida vínculo/perfil/exclusão/grupo e retorna confirmação para executar somente após todas as leituras. A revisão no grupo serializa inclusões concorrentes, inclusive entre tipos de tarefas/lembretes. Não há contadores comerciais mantidos pelo cliente nem consultas truncadas que possam liberar vagas incorretas.

Grupos em transição e o conjunto legado mantêm o comportamento anterior. Após expiração, novas inclusões usam o Free; excesso e histórico são preservados. Edição sem aumento e redução de uso permanecem possíveis. Não ativar assinaturas antes de concluir permissões e migração.

## Listas

Criação e migração `legado-v1` verificam vagas na mesma transação. Migração recusada não grava categorias parcialmente. Repetição já concluída não consome nova vaga. Iniciar a compra mantém a vaga; finalizada/anulada/excluída deixa de contar. Cupom cria lista finalizada, sem vaga aberta. Escrita direta em `comprasListas` já era recusada pelas regras.

## Tarefas

`cadastrarTarefa` cria tarefas e notificações atomicamente, com autoria e campos validados no servidor. A interface usa identificação estável por tentativa; repetição não cria outra tarefa/notificação. Fixas e avulsas dividem a mesma cota. Reabertura tem marcador privado de operação: repetir uma tentativa antiga após nova conclusão não reabre a tarefa novamente.

Regras de grupos com assinaturas ativas recusam criação e reabertura direta, inclusive por remoção do campo de estado. Edição, conclusão, desativação e exclusão continuam possíveis, respeitando as permissões existentes. Conclusão diária individual de rotina fixa não desativa sua definição e não libera a vaga da tarefa recorrente.

## Lembretes

Cuidados, avisos gerais e alimentação usam a mesma cota. Criação/reativação por edição e pausa respeitam capacidade; alteração de programação alimentar considera a diferença líquida de refeições ativas e grava plano/avisos atomicamente. Cada refeição é um lembrete, independentemente da quantidade de destinatários.

Concluir a ocorrência de um lembrete recorrente mantém sua vaga. Um aviso único é desativado ao concluir seu último horário, somente quando não restam outras doses/ocorrências pendentes da mesma versão. Pausar/excluir libera capacidade. Arquivar um aviso somente para um destinatário não desativa o lembrete compartilhado e não libera vaga global.

## Validação

- 29 testes de listas/regressão de compras aprovados antes do avanço para tarefas/lembretes.
- 64 testes integrados nos emuladores Auth/Firestore `demo-ap1303` aprovados, incluindo fronteiras dos quatro planos, concorrência, bloqueios nas regras, histórico, migração, alimentação atômica e conclusão de aviso único/recorrente/múltiplas doses.
- Suíte geral: 370 aprovados, 61 ignorados, zero falhas; lint e build web aprovados. Novos testes de integração são executados explicitamente nos emuladores.
- Dois testes antigos de cuidados foram ajustados para simular a saída de push na dependência do agendador, sem desativar a guarda do transporte real nos emuladores. A guarda continua verificada como zero envio real.
- Logs locais: `output/assinaturas-listas-emulador.log`, `output/cotas-final-emulador.log`, `output/cotas-reabertura-emulador.log`, `output/cotas-final-suite.log`, `output/cotas-final-lint.log` e `output/cotas-final-build.log`.

## Próxima etapa

Permissões de compartilhamento, QR e Escritório contábil, incluindo gestão de usuários e efeitos da expiração; depois ponto no aparelho do titular no Free; depois cobrança e homologação completa. Creator Diamante (#14), migração e habilitação operacional continuam pendentes. Esta entrega não encerra a #9 nem comprova homologação física ou cobrança pronta.

Frontend, Functions e regras precisam ser publicados no mesmo ciclo compatível. O Android atual ainda não contém esta nova interface de gravação pelo callable; preparar nova candidata após concluir o escopo combinado.
