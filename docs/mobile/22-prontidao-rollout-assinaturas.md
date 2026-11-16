# Revisão de prontidão e matriz do rollout — #9

15/11/2026, retomada pelo guia do VS Code. Revisão local; não autoriza ativação comercial. Titular confirmou atualização pela Play e sessão preservada; homologação funcional permanece pendente. Continuação: [inspeção remota e lote candidato](23-lote-rollout-revisao.md), incluindo correção adicional de comprasRelatorio.

## Achado corrigido nesta revisão

`noBolsoConsulta` e `comprasEstimativa` consultavam dados de preços/listas do grupo com perfil ativo, mas sem aplicar a política comercial de compartilhamento. Membro Free, suspenso ou com assinatura expirada podia contornar o bloqueio da interface chamando essas consultas diretamente. São dados do grupo, não o catálogo público agregado nem histórico próprio de ponto.

Adicionada guarda transacional de leitura `exigirConsultaCompartilhada`, compartilhando a política já existente. Executa antes de ler dados comerciais e novamente antes de devolver consultas longas. O bloqueio precede até a consulta de existência da lista na estimativa. Sem novas escritas, cotas ou benefício exclusivo por plano. Titular Free, membro pago autorizado, legado e transição preservados. Não altera No Bolso externo nem concede acesso a finanças.

Teste de regressão primeiro reproduziu a ausência da restrição; depois passou com a correção. Casos adicionais suspendem o perfil durante a consulta para verificar a segunda guarda. Fonte: tests/assinaturas-consultas-precos-emulador.test.cjs. Correção **somente local**, ainda não implantada em noBolsoConsulta/comprasEstimativa.

## Capacidades e vias a revisar juntas

| Capacidade | Política | Fontes principais / testes |
| --- | --- | --- |
| Cadastros e membros | 2/5/15/50 não arquivados; Free sem conta compartilhada; administrador único | funcionarios-cadastro.cjs, grupos.cjs, gestao-acessos.cjs; assinaturas-membros-emulador |
| Listas, tarefas, lembretes | 3/10/30/60; 20/100/200/500; 10/30/100/200, respectivamente; contar reativação | assinaturas-cotas.cjs, compras.cjs, tarefas-cadastro.cjs, lembretes*.cjs; testes listas/tarefas/lembretes |
| Compartilhamento | Membro exige plano com recurso e acesso não suspenso; titular preservado | compartilhamento.cjs, Functions operacionais, regras; compartilhamento/consultas-precos-emulador |
| QR fiscal | Somente Ouro/Diamante, antes da API e da confirmação | cupom-operacoes.cjs; assinaturas-qr-emulador |
| Escritório contábil | Novas operações pagas; histórico próprio/permitido preservado | folha, adiantamentos, pagamentos, escritorio-operacoes.cjs, regras; assinaturas-escritorio-emulador |
| Ponto e jornada | Free no aparelho do titular, seleção explícita; continuidade e autoria | ponto-titular, ponto-operacoes, ponto-revisao; ponto-titular/compartilhamento-emulador |
| Conta/titularidade | Transferência automática Free; cobrança paga assistida; pendências preservadas | conta.cjs, titularidade.cjs, conta cliente; conta/ponto-titular-emulador |
| Direitos e cobrança | Prova do servidor, entrega atômica, ACK depois da entrega, vigência confirmada | assinaturas-play*.cjs; entrega-migracao/Play testes |
| Arquivos e avisos | Contexto/perfil/capacidade em anexos e destinatários operacionais | lembretes-anexos.cjs, push.cjs, push-acoes.cjs; regressão de compartilhamento |

Essa matriz não declara todos os caminhos aprovados para produção. Integrações de terceiros, variantes de revisão/reativação, cadeias de compra, mudança de canal/plano e concorrência com migração ainda exigem fechamento de evidências. Guardas visuais não substituem Functions/regras.

## Manifesto de revisão dos recursos remotos

O estado abaixo usa as implantações documentadas nas rodadas19–21 e as entradas do código atual. Não é uma nova inspeção em tempo real da nuvem e não é comando executável de deploy.

### Novas Functions já implantadas

Assinaturas: consultarAssinatura, verificarCompraPlayTeste, processarCompraPlayTeste, receberRtdnPlay, retomarRtdnPlay, reconhecerEntregaPlay. Suporte: cadastrarFuncionario, pontoTitular, gerirAcesso, escritorioOperacao, cadastrarTarefa. Não recriar identidades/tópicos nem presumir que todo o pacote dessas implantações atualizou outras Functions.

### Functions existentes cuja versão comercial precisa entrar na revisão de rollout

| Domínio | Entradas a conferir | Motivo |
| --- | --- | --- |
| Grupos/conta | criarGrupo, criarMembroGrupo, contaOperacao, excluirUsuario | Cotas, titular único, transferência/suspensão |
| Ponto/revisão | registrarPonto, registrarOperacaoPonto, revisarPendenciaPonto, ajustarJornadaPonto | Compartilhamento, continuidade, prova offline |
| Compras/preços | comprasOperacao, comprasRelatorio, comprasEstimativa, noBolsoConsulta | Cotas, QR/associações e guardas; inclui correção desta rodada |
| Contábil | salvarFolhaPagamento, criarLancamentoFinanceiro, excluirLancamentoFinanceiro, cancelarParcelasAdiantamento | Recurso de Escritório e preservação do histórico |
| Rotina/anexos | lembretesOperacao, dispararLembretes, lembretesAnexos, acaoNotificacaoTarefa, acaoNotificacaoLembrete | Cotas e ações compartilhadas |
| Push operacional | alertaListaCompras/Grupo, alertaComprasItem/Grupo, alertaNotificacoes/Grupo, alertaRegistroPonto/Grupo | Destinatários após expiração/suspensão |

`/Grupo` na última linha abrevia a segunda Function com sufixo Grupo, não um nome literal para CLI. Revisar também emissores que usam enviarPush e entradas externas/centrais que consultam dados do grupo. A lista é de revisão e dependências, não uma ordem para publicar todas automaticamente.

Antes de qualquer rollout, conferir nomes/regiões/trigger/identidades realmente implantados, diff por entrada e compatibilidade com o cliente existente. Algumas entradas antigas deixam região implícita no código; não alterar localização por suposição nem gerar duplicatas. conferir retries e agendamentos sem ampliar o escopo autorizado.

## Ordem de implantação e ativação — pendente

1. Fechar revisão/testes e versionar o conjunto coerente após inspeção dos diffs, incluindo arquivos novos. Registrar commit e hashes da candidata; nenhuma dessas etapas cria aprovação automática para produção.
2. Conferir inventário/filas/locais da conta dedicada e comportamento com grupos em transição, sem modificar o principal. Preparar recuperação e critérios de parada para o rollout.
3. Preparar o lote exato de Functions existentes e Security Rules, preservando regiões e compatibilidade; aplicar somente no escopo autorizado. Rollout deve cobrir caminhos diretos do cliente e gatilhos, não somente os 11 endpoints novos.
4. Validar grupo dedicado com dados fictícios e cliente7 atualizado; só então avaliar ativação comercial de teste. Gates de cobrança e assinaturasAtivas continuam desligados nesta revisão.
5. Homologar a compra de teste e seus estados no Android/PWA, depois migração efetiva e publicação completa #7. Mercado Pago e concessão do criador seguem entregas separadas pendentes.

Rollback de dados não é reinstalar versão antiga ou apagar fila. Ao encontrar falha de autorização/cota, manter contas em transição e registrar evidências antes de nova ativação. Não alterar direitos/recibos para simular teste aprovado.

## Verificação desta rodada

Logs em output/prontidao9-*.log. Execução anterior à correção reproduziu a falha: dois cenários comerciais recusados pelo teste por ausência do bloqueio esperado. Depois da correção: **38 testes integrados aprovados**, **7 direcionados finais aprovados** (incluindo suspensão durante as duas consultas) e **380 gerais aprovados/67 ignorados/0 falhas**; lint e sintaxe dos três módulos aprovados. Ignorados não equivalem a integrações executadas. Build web refeito na revisão inicial, sem mudança de frontend posterior; lint/suíte geral repetidos após a correção de backend. Evidências: prontidao9-consultas-antes.log, prontidao9-integracao.log, prontidao9-consultas-final.log, prontidao9-tests-final.log, prontidao9-lint-final.log e prontidao9-build.log.

Sem deploy, nova versão Android, mudança IAM, ativação, commit/push ou escrita em produção nesta rodada. As duas consultas corrigidas permanecem pendentes de publicação junto do rollout revisado. A #9 continua em andamento.
