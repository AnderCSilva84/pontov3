# Modalidades semanais — issue #6

Em Gestão → Jornada de trabalho, selecione a modalidade, a vigência e ajuste os horários antes de salvar.

| Modalidade | Distribuição inicial | Folgas iniciais |
| --- | --- | --- |
| 44h | Segunda a sexta: 8h; sábado: 4h | Domingo |
| 42h | Segunda a sexta: 8h24 | Sábado e domingo |
| 40h | Segunda a sexta: 8h | Sábado e domingo |

O modelo de 42h aceita vigência a partir de 01/12/2026, conforme o requisito do produto na issue. A seleção não migra automaticamente os funcionários. Os dias podem ser redistribuídos, mantendo 42h e exatamente cinco dias de trabalho. Os horários sugeridos incluem uma hora de intervalo nos dias úteis; a carga informada exclui o intervalo.

As modalidades são gravadas em `funcionarios.jornadas`, com snapshots completos por vigência. Os campos antigos permanecem como base para datas anteriores à primeira mudança. Novas vigências não podem ser anteriores ao dia atual. Para alterar uma modalidade programada, selecione novamente o modelo e sua data; salvar na mesma vigência substitui essa programação.

O módulo compartilhado `functions/jornada.mjs` resolve a carga por data para Gestão, Ponto, metas mensais, banco legado, fechamento no servidor, revisão, ajustes e lembretes. PWA e Capacitor usam a mesma implementação React. O runtime Node 24 das Functions permite carregar esse módulo ESM nos handlers CommonJS.

## Revisão de encerramento técnico — 14/11/2026

Oito testes dedicados aprovados: modelos 44/42/40, datas e modalidades inválidas, mudança de vigência, duas folgas, redistribuição dos dias, fechamento e saldo em folga. Corrigida validação de calendário antes da conversão ISO, evitando interromper o formulário com data inexistente. Suíte geral: 370 aprovados, 59 ignorados, nenhuma falha; lint e build web aprovados.

O AAB 6 já gerado em `output/Ta-no-Ponto-6-1.0.0-Billing.aab` contém, no asset Admin, as modalidades 44/42/40 e a vigência `2026-12-01`, conferidas diretamente no ZIP. Ele está no teste interno conforme `mobile/07-aab-billing-teste-interno.md`. A correção defensiva de calendário desta revisão é posterior ao AAB 6 e deverá entrar na candidata completa. Não foi gerado outro binário nesta revisão.

A publicação do PWA e das Functions compatíveis permanece pendente, vinculada à candidata completa da #7 com assinaturas (#9), conforme a decisão do titular. Não marcar a #6 concluída enquanto esse critério não tiver evidência. Não houve deploy, alteração de jornada real ou migração automática de funcionários nesta revisão. A data de dezembro é requisito configurado do produto, sem afirmar mudança legal geral.
