# Acompanhamento ágil — Tá no Ponto

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
4. Assinaturas: definir planos, público, regras de acesso e cobrança depois da revisão de prontidão. Implementação ainda não iniciada.

Prioridades podem ser revistas com o usuário. Não prometer data de aprovação da Play nem marcar funcionalidades como homologadas sem evidência.
