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

Validação: suíte completa com 334 testes aprovados e 57 ignorados por condições de ambiente; lint dos arquivos alterados e builds web/mobile aprovados. Não foi gerado APK/AAB nem feita publicação. A distribuição exige publicar o frontend, as Functions alteradas e uma nova versão dos assets do app.
