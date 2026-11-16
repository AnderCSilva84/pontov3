# Permissões: importação fiscal — 15/11/2026

Primeira entrega da segunda etapa aprovada na #9: compartilhamento, QR e Escritório. Somente o bloqueio fiscal está integrado nesta entrega; os outros dois recursos ainda precisam de cobertura própria. Código local, sem deploy ou ativação de assinaturas.

## Servidor

`assinaturas-recursos.cjs` consulta direitos privados e revalida grupo, vínculo, perfil e exclusão na transação. O importador usa a capacidade `importacaoQr`, liberada somente em Ouro/Diamante vigentes e verificados; Free, Prata e assinatura expirada não a possuem.

- Antes da consulta externa automática: recusa sem chamar a SEFA.
- Ao preparar revisão: verifica novamente, inclusive se o plano mudou durante a rede. O caminho de texto conferido do mesmo importador também exige a capacidade, impedindo contornar o bloqueio.
- Ao confirmar: nova validação na transação final impede importar quando o direito expirou durante a revisão. Não grava listas, catálogo ou preços parcialmente.
- Repetição de confirmação já concluída retorna o resultado anterior, sem nova importação ou consumo. Notas anteriores não são apagadas e continuam nas consultas existentes conforme perfil.
- Grupos em transição e dados legados mantêm o comportamento anterior; a verificação não habilita assinaturas nem concede benefícios.

## Interface compartilhada Android/PWA

O importador só é montado após consultar o direito no servidor, antes de iniciar câmera/consulta. Bloqueio informa disponibilidade em Ouro/Diamante e oferece acesso aos planos. Falha de consulta impede abrir o recurso e oferece nova tentativa. A consulta é atualizada ao retornar à tela e periodicamente; respostas antigas e respostas de outra sessão não substituem a rodada atual. Servidor é a autoridade na confirmação.

`AcessoRecurso` poderá ser reutilizado para outros recursos depois de integrar a respectiva proteção do backend; nesta entrega ele envolve somente a importação fiscal. Não foi aplicado ao Escritório como proteção apenas visual.

## Evidências

30 testes aprovados em Auth/Firestore `demo-ap1303` (permissão fiscal e regressão de compras): Free/Prata sem rede ou rascunho, Ouro/Diamante, expiração entre revisão/confirmação, redução durante consulta, ausência de gravação parcial, repetição após expiração e transição.

Suíte geral: 370 aprovados, 62 ignorados, zero falhas. Lint e build web aprovados. Logs em `output/permissoes-qr-emulador.log`, `output/permissoes-qr-suite.log`, `output/permissoes-qr-lint.log`, `output/permissoes-qr-build.log`.

Conferência física do importador autenticado no Android/PWA ainda pendente. AAB 6 não contém esta interface nova; incorporar à candidata completa depois da homologação.

## Próxima cobertura

Escritório: impedir novas operações no Free pelo frontend, Functions e gravações diretas; preservar consulta/exportação do histórico pelo fluxo próprio. Compartilhamento: tratar usuários existentes, gestão de acesso e novas operações após expiração, preservando histórico próprio e a conclusão de jornadas abertas. Essas partes não estão concluídas por este bloqueio fiscal. Depois segue o ponto no aparelho do titular no Free e a cobrança/homologação completa.
