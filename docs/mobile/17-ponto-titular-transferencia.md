# Ponto no aparelho do titular e transferência Free

Implementação local da #9, em 15/11/2026. Publicação conjunta com a candidata #7; não ativar `assinaturasAtivas` antes da migração e homologação completa.

## Comportamento implementado

- Terminal na tela de acompanhamento do ponto, disponível ao titular administrador de grupo comercial no Free. Cadastro por nome sem criar login do funcionário; cota de dois cadastros não arquivados aplicada no servidor.
- Seleção explícita de até dois funcionários para novas entradas. Não selecionar automaticamente após redução. Mudança do documento de assinatura ou do titular exige confirmar novamente a seleção.
- Entrada, intervalo e saída usam horário/data do servidor, localização autorizada do funcionário e confirmação do funcionário selecionado. O registro identifica o titular que realizou a ação e o funcionário; não representa autenticação pessoal do empregado.
- Retirar da seleção não impede concluir jornada aberta no dia. Jornadas de datas anteriores seguem para revisão em Gestão; não são encerradas automaticamente. Arquivamento via servidor recusa qualquer jornada aberta e preserva o histórico. Regras impedem alterar diretamente o estado ativo em grupos comerciais.
- Terminal exige conexão. Antes do envio, guarda a tentativa original por conta/grupo no aparelho. Resultado desconhecido bloqueia outra marcação até reconciliação idempotente, sem recapturar GPS. Falta de armazenamento impede envio. Conta e saída reconhecem essas pendências; nenhum descarte automático.
- Configuração e recibos privados não podem ser alterados diretamente pelo cliente. Transações revalidam vínculo, titular, perfil, grupo, exclusão, plano, seleção e jornada.

## Decisão explícita do titular

Aprovado no chat: **“Sim, transferência automática no Free”**. Casos com cobrança paga ficam para procedimento assistido, preservando dados e assinatura existente.

O fluxo de exclusão permite escolher membro ativo do mesmo grupo como novo titular Free, com confirmação e reautenticação recentes. Promove o destinatário a único administrador e retira poderes administrativos/compartilhados do anterior, preservando histórico e recibos próprios. Recusa destinatário em exclusão ou com jornada própria aberta. A transferência apaga a seleção do terminal; o novo titular deve confirmar outra seleção. Repetição não duplica transferência.

Assinatura paga vigente, pendente ou renovável exige atendimento assistido. Histórico pago comprovadamente encerrado, sem renovação, pode voltar ao fluxo Free. Nenhum recibo ou vínculo de cobrança é transferido por este fluxo. O procedimento assistido com provedores permanece pendente e não deve ser tratado como implementado.

## Validação e homologação

Testes locais cobrem limite/seleção, autoria, concorrência, repetição com payload alterado, GPS, mudança de data, continuidade, arquivamento, cadastro sem Auth, transferência Free e bloqueio pago. Suíte geral, lint, build e regressão de conta/permissões devem estar aprovados antes de registrar a entrega.

Ainda validar em PWA e Android físicos: cadastro e configuração de locais/jornada; seleção de dois; quatro marcações; GPS negado/fora do raio; perda de conexão após envio e reconciliação após recarga/saída; troca de conta; redução com mais de dois cadastros; troca de titular e reabertura da tela. Conferir legibilidade e acessibilidade. Não há evidência física desta rodada.

Próxima frente: migração segura dos grupos atuais e fechamento da cobrança/homologação externa. Permanecem separadas a concessão Diamante do criador e a publicação da versão completa. Nenhum deploy, ativação de plano/grupo, cobrança ou alteração de identidade de produção nesta entrega.
