?# Auditoria de robustez e segurança — 13/10/2026

Revisão do código disponível no workspace, incluindo alterações locais preexistentes. Nenhuma alteração foi publicada em produção.

Atualização posterior: a pedido do usuário, as integrações Telegram e WhatsApp foram removidas do código local. Os avisos usam Firebase Cloud Messaging. As instruções de configuração Telegram abaixo são históricas; seguir [NOTIFICACOES_PUSH.md](NOTIFICACOES_PUSH.md) para a integração atual. A revogação da credencial Telegram anteriormente exposta continua necessária.

## Falhas encontradas e corrigidas

| Gravidade | Falha | Correção |
| --- | --- | --- |
| Crítica | Credencial do Telegram embutida no código | Token retirado do código e substituído por Firebase Secret Manager. O token anterior precisa ser revogado; removê-lo não invalida cópias nem o histórico Git. |
| Crítica | Webhook público permitia modificar compras usando privilégios do Admin SDK | Exige POST, segredo do webhook e chat configurado; valida IDs antes de escrever. |
| Alta | Funcionário podia alterar horários, saldo e proprietário de documentos de ponto diretamente | Escritas de funcionários bloqueadas em `dias` e `registros`; marcações passam pela callable `registrarPonto`. |
| Alta | Histórico e resumo eram escritos separadamente, permitindo inconsistências e duplicação concorrente | Transação verifica a sequência e grava ambos atomicamente. |
| Alta | Relógio e GPS dependiam exclusivamente da validação no navegador | Data/hora do servidor no fuso America/Fortaleza; servidor verifica coordenadas e raio de locais ativos autorizados. Coordenadas enviadas pelo dispositivo ainda podem ser falsificadas. |
| Alta | Conclusão de tarefa permitia modificar campos extras e não verificava autoria | Lista explícita de campos alteráveis, funcionário vinculado e timestamp do servidor. |
| Média | Solicitação de compra podia assumir uma solicitação ativa de outra pessoa | Verificação do proprietário anterior ou de solicitação inativa. |
| Média | Perfil inativo continuava autorizado; falha ao carregar perfil deixava a interface carregando | Bloqueio de perfil inativo nas regras e callables; captura de erro e proteção contra resposta de sessão antiga. |
| Média | Desconto negativo elevava valor líquido; Infinity e datas impossíveis podiam ser persistidos | Validação de valores finitos, desconto entre zero e valor, existência do funcionário e datas reais. Nome do funcionário vem do cadastro. |
| Média | Push do próprio funcionário era bloqueado pelas regras | Atualização própria limitada exclusivamente a `fcmToken`. |

Novos fechamentos persistem `calculoVersao: 1`, mantendo o saldo calculado mesmo se a configuração da jornada mudar posteriormente. O comportamento de recálculo dos documentos antigos foi preservado por compatibilidade.

## Publicação e configuração obrigatórias

1. Revogar o token anterior no BotFather e obter outro. Não reutilizar a credencial exposta.
2. Configurar os secrets `TELEGRAM_TOKEN` e `TELEGRAM_WEBHOOK_SECRET` no Firebase. Configurar `TELEGRAM_CHAT_ID` no ambiente das Functions.
3. Atualizar o webhook com `setWebhook`, passando o mesmo `secret_token` armazenado no Firebase. Referência: [Telegram Bot API](https://core.telegram.org/bots/api#setwebhook).
4. Publicar as Functions antes do frontend, depois regras e frontend na mesma janela de manutenção. Frontends antigos escrevem diretamente e deixarão de registrar ponto após a publicação das regras.
5. Usar Node 24 para validar e publicar o backend, conforme `functions/package.json`. O ambiente local desta revisão usa Node 20.20.0.
6. Validar em homologação login por perfil, funcionário inativo, ponto dentro/fora do raio, duas chamadas simultâneas, jornada completa, sábado, tarefas e compras.

As gravações agrupadas seguem a garantia de atomicidade das [transações do Firestore](https://firebase.google.com/docs/firestore/manage-data/transactions).

## Verificações

- 12 testes automatizados passaram: calendário, perfis, sequência de ponto, cálculo de jornada, datas e distância.
- 8 verificações de autorização passaram no emulador Firestore: bloqueio de criação/alteração direta do ponto, escalada de perfil, perfil inativo, alteração indevida de tarefa e apropriação de compra; atualização própria de token push permitida. Script: `scripts/auditar-regras.mjs`.
- ESLint, build de produção e verificação de sintaxe das Functions passaram.
- `npm audit fix --ignore-scripts` nos dois pacotes, com atualizações compatíveis registradas nos lockfiles. Nenhum downgrade forçado aplicado.
- Restam alertas de produção: frontend, quatro altos na cadeia Firebase/gRPC (Firebase fixa gRPC em `~1.9.0`); backend, dez moderados na cadeia de dependências. Reavaliar após releases oficiais e verificar o relatório atualizado antes da publicação. Alertas transitivos não comprovam exploração no fluxo do aplicativo.

## Riscos e próximos trabalhos

- Os testes das regras cobrem os casos acima; ainda falta executar as callables em integração e os fluxos completos em homologação. Esta auditoria não comprova o estado atualmente publicado.
- Consultas administrativas e banco de horas ainda carregam coleções amplas; paginar e limitar períodos.
- Atualização da integração: o estado pendente do bot foi removido. O push agora usa controle transacional do evento, recibos por dispositivo e retry. A entrega ainda precisa ser validada em celular real.
- Atualização da integração: lotes de push acima de 500 foram divididos e tokens inválidos são removidos; esse fluxo foi verificado no emulador.
- Criação de usuário no cliente pode deixar conta Auth órfã se a gravação do cadastro falhar; migrar para operação administrativa no servidor com compensação.
- Revisar isolamento de tarefas/compras/notificações entre funcionários caso existam equipes ou filiais distintas. As leituras compartilhadas atuais foram preservadas.
- Administradores ainda ajustam ponto diretamente. Centralizar ajustes em callable com motivo e trilha imutável de auditoria.
- Revisar registros históricos com horários inválidos, jornadas que atravessam meia-noite e saldos recalculados sob configurações posteriores. A implementação atual mantém jornadas por dia civil.
- Conclusões da rotina validam tarefa existente, autoria, timestamp e ID determinístico; restringir também data e recorrência no servidor.
