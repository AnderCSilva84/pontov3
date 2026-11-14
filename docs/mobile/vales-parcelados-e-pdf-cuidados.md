# Vales parcelados e PDF de compromissos — 28-10-2026

Registro da implementação inicial em 28/10: validado localmente, sem publicação naquela etapa. Publicação efetiva das pendências registrada ao final deste documento. Alterações anteriores preservadas.

## Uso

- Escritório contábil → Folha → Registrar vale ou adiantamento (ou Avulsos/Pagamentos). Informar tipo, valor total pago, data/mês do lançamento, motivo, quantidade de parcelas, primeira competência e recorrência mensal, a cada dois ou três meses.
- Exemplo: R$ 3.000,00 / 10 mensais desde novembro/2026 → R$ 300,00 por competência até agosto/2027. Um único pagamento original e dez descontos previstos; não são geradas dez despesas ou folhas antecipadamente.
- Descontos automáticos aparecem separados dos adiantamentos manuais no resumo e discriminados no contracheque. Não repetir as parcelas no campo manual. Centavos são distribuídos nas primeiras parcelas, preservando a soma exata (R$ 100 / 3 = 33,34 + 33,33 + 33,33).
- Folhas já fechadas/pagas ficam congeladas. Não é permitido criar plano que alcance competência fechada. Cancelar parcelas futuras exige mês inicial aberto e justificativa; preserva pagamento original e parcelas já fechadas. Exclusão de origem usada em folha fechada é bloqueada.
- Automação é por competência da folha mensal. Não aplica novamente em 13º/férias/rescisão nem limita silenciosamente a parcela ao salário: descontos acima dos proventos impedem fechamento. Tabelas de INSS não foram alteradas; a limitação existente de tabela automática para 2026 permanece.
- Vales antigos sem plano explícito continuam manuais; nenhum histórico foi classificado ou migrado automaticamente.

## Modelo e segurança

`financeiro` guarda o pagamento único, assinatura idempotente e `parcelamento` v1: quantidade (1–120), primeira competência, intervalo de meses e parcelas em centavos. Identificador deriva da conta e chave da operação. Replay igual retorna o registro; conteúdo divergente com a mesma chave é recusado. Campos de autoria/nome vêm da sessão/perfil e funcionária do próprio grupo.

`adiantamentosControle/{funcionarioId}` contém revisão/data. Criar, cancelar ou excluir um plano altera esse controle; fechar a folha o lê na mesma transação que calcula os descontos. Evita fechamento concorrente com parcela adicionada em outra sessão. Autorizações administrativas e isolamento de grupo são validados no backend. Controle não é editável diretamente por clientes.

Folha v3 guarda `adiantamentosAutomaticos`, `totalAdiantamentos` e `parcelasAdiantamentos`, além do campo manual anterior. Fechamento recalcula no servidor e confere tanto valores quanto os detalhes das parcelas apresentados na revisão. Pagamento reutiliza esse snapshot e continua idempotente. Clientes legados sem parcelas continuam compatíveis; havendo controle de parcelamento, regras impedem salvar/fechar diretamente via SDK antigo, exigindo o cálculo no callable. Uma versão antiga que use escrita direta precisará atualizar para operar essa funcionária com parcelamentos.

Nenhum listener, polling, Scheduler, serviço pago ou índice novo foi acrescentado nesta rodada. A interface reutiliza os pagamentos já carregados. O servidor reutiliza a consulta financeira por funcionária que já existia na folha. A consulta atual ainda lê o histórico financeiro dessa funcionária para transporte; não foi ampliada para outros grupos nem se criou consulta por parcela. Reduzir essa consulta preexistente exige evolução específica, sem omitir planos vigentes.

Custos estimados, não medidos em faturamento: criação com N parcelas faz N leituras das folhas previstas para impedir competências fechadas, mais perfil/origem/funcionária/controle e resolução existente de grupo (aproximadamente N+8 leituras no caminho atual); duas escritas (pagamento e controle). Replay: nenhuma escrita e sem reler as N competências. Salvar/fechar folha acrescenta uma leitura do controle e nenhuma consulta financeira extra; mantém a escrita da folha existente. Cancelamento: leitura do registro, controle, perfil e folhas futuras; três escritas (origem, controle e auditoria). Não há escrita por mês futuro ou invocação em aplicativo parado.

## PDF de cuidados

Primeiras colunas: Data e Hora, depois compromisso/remédio, orientações e repetição/aviso. Consultas têm campos próprios `dataCompromisso` e `horarioCompromisso`, validados pelo servidor. Horário do aviso continua independente, inclusive antes da consulta, sem mudar disparos existentes. Ordenação por data e hora do compromisso.

Consultas antigas sem esses campos exibem explicitamente data do lembrete e hora do aviso; texto livre não é interpretado como compromisso. Editar a consulta para informar os valores reais. Medicamentos preservam início/repetição e horários cadastrados. Identidade AP1303 azul/branco/vermelho e logo preservadas. PWA mantém cuidados; a edição Android reduzida continua sem esses módulos.

PDF fictício renderizado e conferido: `output/pdf/escala-compromissos-exemplo.pdf` e PNG de conferência. Cabeçalho, datas/horas, quebras de texto, logo e rodapé conferidos sem sobreposição. O wrapper Poppler do runtime estava com caminho inválido; foi usado seu executável instalado diretamente. Avisos de fontes auxiliares não impediram a renderização conferida.

## Arquivos e validação

Backend: `functions/adiantamentos-calculos.mjs`, `functions/adiantamentos.cjs`, `functions/folha-calculos.mjs`, `functions/folha-pagamento.cjs`, `functions/index.js`, `functions/lembretes-dominio.cjs`, `firestore.rules`.

Interface: `src/components/Adiantamentos.jsx`, `src/pages/Financeiro.jsx`, `src/pages/Lembretes.jsx`; serviços `financeiro.js` e `folhaPagamento.js`; PDFs `exportarPdfLembretes.js` e `exportarReciboFinanceiro.js`.

Testes: `adiantamentos.test.js`, `adiantamentos-emulador.test.cjs`, `folha-calculos.test.js`, `folha-emulador.test.cjs`, `lembretes-escala.test.js`, `lembretes.test.cjs`, `lembretes-cuidados-emulador.test.cjs`.

Resultados: 19 testes unitários aprovados; 13 testes/subtestes emulados da rodada principal, mais a proteção específica de regras validada na execução final (total de 14 casos distintos). Cobertura de R$ 3.000 / 10, centavos, virada de ano, recorrência, manuais/legados, múltiplos planos, idempotência, parcelas novas após rascunho, revisão desatualizada, fechamento/pagamento único, cancelamento futuro, isolamento, perfis e corrida entre criação de plano e fechamento. Regras verificadas com SDK cliente: caminho legado sem controle funciona; fechar ignorando o controle é recusado; callable continua autorizado. Regressões de transporte, INSS/bônus, especiais e cuidados aprovadas.

Lint e builds PWA/mobile-release aprovados; Android reduzido confirmou zero módulos de saúde em `output/adiantamentos-android/edicao-build.json`. Mantido o aviso preexistente de chunk estático/dinâmico do push PWA. Não foi gerado/instalado um APK; teclado e operação física Android permanecem pendentes.

Para implantação futura, somente após autorização: regras de proteção; `criarLancamentoFinanceiro`, `salvarFolhaPagamento`, `excluirLancamentoFinanceiro`, novo `cancelarParcelasAdiantamento` e callable de cadastro/listagem dos lembretes (`lembretesOperacao`); depois frontend e novo build Android autorizado. Não exige migração, índice, agenda recorrente ou alteração do No Bolso. Confirmar nome/região e IAM necessário do novo callable sem ampliar permissões globalmente. Esta lista não autoriza publicar outros trabalhos locais pendentes.


## Correção e publicação do PDF — 29/10/2026

O PDF de cuidados desta seção foi autorizado e publicado separadamente dos vales parcelados. As alterações financeiras continuam locais. Causa confirmada: o artefato publicado preservava o exportador antigo; o backend publicado não validava os campos novos e a listagem não os devolvia. Corrigido em `lembretes-dominio.cjs`, `lembretes.cjs`, `Lembretes.jsx` e `exportarPdfLembretes.js`. Edição por cliente antigo que omite os campos preserva os valores anteriores; trocar de tipo continua limpando campos incompatíveis. Horário/data do aviso e cálculo do próximo disparo não mudaram.

PDF: primeiras colunas Data do compromisso e Hora; aviso discriminado na última coluna. Consultas antigas sem campos próprios mostram Não informada e orientação de edição, sem interpretar texto livre nem atribuir o aviso ao compromisso. Cabeçalho azul 48→24mm (50% menor), faixa vermelha 2→1mm, tabela começa em 32mm. Logo e textos reposicionados sem distorção. PDF já aberto/baixado não é alterado: gerar um novo após atualizar o cadastro.

Validação: 9 testes unitários de escala/domínio e 1 integração com emulador aprovados. Integração cobre salvar/listar/editar por cliente antigo, recusa de data/hora inválida, funcionário sem autorização, grupos isolados e disparo preservado. Na interface local, consulta fictícia salva e reaberta com compromisso 06-11-26 13:30 e aviso 05-11-26 08:00. Nenhum dado real alterado. PDFs fictícios curto (1 página) e longo (7 páginas) renderizados com Poppler e conferidos; pdfplumber confirmou cabeçalho de 24mm, data/hora e repetição do título em todas as páginas. Avisos de fontes auxiliares do Poppler não impediram renderização. Artefatos: `output/pdf-cuidados-publicacao/pdf/curto.pdf`, `curto.png`, `multipagina.pdf` e `pagina-2.png`.

Publicação seletiva: projeto **ponto-app-1c55a**, região **us-central1**, somente **lembretesOperacao**, revisão **lembretesoperacao-00012-vas**, ACTIVE. Fonte da função publicada anterior recuperada pelo objeto geração1792887216528106 e alterados somente dois arquivos do contrato; geração publicada1793290438724589. Sem nova agenda, alteração de IAM, regras, índices ou dados. Consulta sem autenticação em produção recusada com HTTP401.

PWA Netlify **ponto1303** / **cf66ee21-9935-4013-8043-1471c62694e7**, deploy **6ae3723bbb9c5e4eb9457951**, ready, https://ponto.acstech.dev.br. Shell **411e8ce9b58bfc7869cb**; /lembretes, /ponto e /tarefas HTTP200. JS do exportador e tela conferidos byte a byte. Inclui destaque do título dos lembretes da rodada anterior. Demais contratos locais pendentes não publicados.

Lint e builds PWA/Android aprovados; :app:assembleRelease e apksigner verify aprovados. APK `output/AP1303-atualizado-2026-10-29-cuidados-pdf.apk`, 5.980.355 bytes, SHA-256 **140B0597E45D0E03E4F77102EC113677BCAAC48A79859C444981696CEA4FA2D7**. Mesma identidade/chave, 1.0.0/código2, Firebase produção. A edição Android continua sem módulos de saúde (verificação do bundle: modulosSaude0); o PDF de cuidados é recurso do PWA. Nenhuma instalação ou envio à Play; validação física não repetida. Sem commit/push.

Custos adicionais: nenhuma leitura/escrita, listener, polling, Scheduler ou serviço novo. Foram acrescentados dois campos pequenos à gravação/resposta já existentes; reutilizada a leitura do lembrete anterior para compatibilidade. PDF gerado no dispositivo; sem upload/Storage/Function para gerar. Deploy/build usam a infraestrutura existente e podem consumir processamento; não se promete custo zero.

## Todas as pendências funcionais publicadas — 29/10/2026

Autorização do titular: publicar todas as pendências. Comparação das fontes com o último PWA identificou vales/adiantamentos, arquivamento do prato do dia e paginação/pesquisa na associação de cupom. Git/alterações locais preservados; nenhum commit, push, migração de histórico ou teste com dados reais. Nenhuma publicação/instalação na Play. Política pública permanece idêntica à versão já aprovada/publicada.

Ordem executada: cinco Functions seletivas → regras protetivas → PWA. Firebase **ponto-app-1c55a/us-central1**. Revisões ativas: `criarlancamentofinanceiro-00008-fir`, `salvarfolhapagamento-00006-lep`, `excluirlancamentofinanceiro-00008-diw`, `cancelarparcelasadiantamento-00001-vob`, `lembretesoperacao-00013-car`. O novo callable de cancelamento exige login, perfil admin ativo e grupo autorizado; minInstances0/maxInstances2, sem agendamento novo. Cinco chamadas anônimas recusadas com HTTP401/UNAUTHENTICATED, sem efeitos.

Regras remotas anteriores confirmadas iguais ao baseline publicado. Único acréscimo: verificar ausência de controle de parcelamento para permitir o fluxo direto legado nas folhas, tanto no legado quanto em grupos; clientes com parcelamento devem usar o cálculo do servidor. Regras compiladas e publicadas, conteúdo remoto comparado ao arquivo local. Ruleset **77a40f58-9888-4d6d-a3d4-7fdb8f096068**. Sem alteração/publicação de índices. Alertas do compilador nas linhas24–54 são anteriores a este acréscimo; a compilação e os testes de autorização passaram.

PWA: https://ponto.acstech.dev.br, Netlify **ponto1303/cf66ee21-9935-4013-8043-1471c62694e7**, deploy **6ae3786e5b305762782fe9c9**, ready. Publicado do `dist` do projeto completo, sem mais excluir as pendências financeiras. Shell **a8eabe08a23b1bc85c54**. /ponto, /tarefas, /lembretes, /admin/financeiro e /lista-compras/catalogo HTTP200. Entrada, CSS e módulos de folha/compras/tarefas/recibo idênticos ao build local. Nenhuma Function Netlify implantada.

Verificações: lint completo aprovado; 19 testes unitários aprovados/1 condicional de push fora do escopo ignorado; 10 testes/subtestes de emulador aprovados. R$3000/10, centavos, cancelamento, fechamento concorrente, regras/cliente legado, perfis e grupos, arquivamento e receitas preservadas. Conferência UI fictícia: salvou um adiantamento de R$3000 e mostrou parcela1/10 de R$300 na folha. Não foi fechada/paga uma folha real. Na conferência foi corrigida a apresentação de competência YYYY-MM, antes convertida em dia do mês anterior pelo fuso: agora MM-AA, sem alterar armazenamento/cálculos. Três testes direcionados de data/cadastro/cardápio reaprovados após esse ajuste. Captura: `capturas/escritorio-profissional/vales-parcelados-300.png`.

Builds PWA e Android reduzido, assembleRelease e verificação de assinatura aprovados. APK **output/AP1303-vales-cardapio-importacao-2026-10-29.apk**, **5.972.991 bytes**, SHA-256 **5FCC750A46C25C9DBC21ACE4D6B9B42945338B033C90252FDEB26ED874D492E9**. AP1303/br.dev.acstech.ap1303/1.0.0/código2, mesma chave de upload, Firebase produção. Android segue sem cuidados (modulosSaude0), com cardápio em Tarefas. Nenhum AAB gerado/enviado. Não instalado; teclado/leitor externo/fluxo físico permanecem pendentes. Não presumir compatibilidade da chave de upload com a instalação assinada pela Play.

Sem polling/listeners ou serviços recorrentes novos. Custos de parcelas e arquivamento mantêm as estimativas descritas nesta seção e em cardapio-do-dia.md. Regra de escrita direta da folha acrescenta uma verificação exists do controle, que pode gerar leitura dependente de regra; não se aplica por renderização e não substitui autorização. Criação de N parcelas verifica N folhas, sem criar folhas/pagamentos futuros; salvar/fechar reutiliza consulta financeira e controle transacional. Sem consumo extra de Functions quando o app está ocioso por causa desta rodada. Custos não medidos na fatura, sujeitos a retries e consultas já existentes.

Recuperação: deploy PWA anterior **6ae3723bbb9c5e4eb9457951** preservado na Netlify; regras anteriores em `output/publicacao-pendencias/regras-antes.rules`, metadados novos em `resultado-backend.json`. Não fazer rollback de regras isoladamente após criar parcelamentos, pois retiraria a proteção; eventual recuperação deve manter o cálculo no servidor e as origens/folhas preservadas.
