# Folha de pagamento em andamento

Implementação local. **Não publicada**, conforme solicitado.

## Evolução: lembretes, transporte e pagamentos especiais (21/10/2026)

- Lembretes novos têm destinatário explícito Global (todos os usuários já habilitados) ou usuário dedicado, independente do filtro de consulta e do responsável padrão da pessoa/pet. Após salvar, os filtros voltam para Todos. O servidor atribui UID, nome e data do criador e preserva esse carimbo na edição por outro administrador. Legados conservam a atribuição anterior; o nome é resolvido pelo UID quando disponível, sem inventar autoria ausente. Administradores continuam vendo os cuidados e supervisionando notificações da funcionária 24h; funcionárias recebem push somente no expediente. Global não habilita contas bloqueadas/sem permissão.
- A folha mensal soma os transportes já lançados para a funcionária/competência em tempo real, mostra **PAGO**, e não adiciona esse valor aos proventos nem gera outro pagamento de transporte. Novos lançamentos exigem mês de referência explícito. Legados com competência válida usam essa competência; os sem competência são rateados pelos dias do período entre meses. Sem período válido não se presume um valor.
- O desconto de VT é opcional por folha (inicialmente desligado): mínimo entre o transporte concedido e 6% do salário base, multiplicado pela proporção configurada do período (padrão 100%). Bônus/adicionais não aumentam a base dos 6%.
- INSS progressivo de 2026: 7,5% até 1.621; 9% até 2.902,84; 12% até 4.354,27; 14% até 8.475,55. Arredondamento no total para centavos. A base automática considera proventos menos faltas e horas descontadas; pode ser ajustada para incidências específicas. INSS manual permite reconciliar com eSocial/outros vínculos. Competências sem tabela conhecida não recebem cálculo automático silencioso. Rascunhos antigos preservam o INSS informado até ativar o modo automático.
- `salvarFolhaPagamento` agora calcula no servidor, valida administrador, lê transportes na mesma transação, mantém controle de versão e congela os valores ao fechar. O fechamento rejeita uma revisão desatualizada (por exemplo, VT lançado noutra sessão). Transportes que integram folha fechada não podem ser apagados. Pagamento mensal usa os valores congelados e continua idempotente.
- Avulsos oferece 13º, férias e rescisão, com cálculo compartilhado UI/servidor e recibos discriminados. 13º calcula avos informados ou meses com ao menos 15 dias, primeira parcela sem INSS e quitação com INSS do total e dedução do adiantamento. Férias calcula gozo, terço, abono e terço do abono; a estimativa de INSS exclui abono. Rescisão considera contrato doméstico por prazo indeterminado, motivo, saldo salarial, férias vencidas/proporcionais e terço, 13º, aviso e projeção. Pedido permite desconto de aviso limitado a 30 dias; acordo reduz o aviso indenizado pela metade; justa causa exclui proporcionais de 13º/férias. Férias em dobro são uma opção explícita para os dias vencidos informados.
- Limites deliberados dos especiais: médias variáveis, férias já gozadas/vencidas, dias de saldo ainda não pagos, avos e adiantamentos precisam refletir o histórico real. IRRF é informado após conferência, sem fingir cálculo completo com dependentes/múltiplos vínculos. INSS de férias é estimativa apenas dessa verba e exige reconciliação com a distribuição por competência no eSocial. Projeção de rescisão cruzando o ano exige avos conferidos manualmente. FGTS, DAE, indenização compensatória e contratos a termo não são calculados como líquido direto ao trabalhador. O formulário explica essas condições e exige confirmação de conferência no eSocial antes de gravar o pagamento. A rescisão não desativa o acesso automaticamente.
- Recibos mantêm marca/cores atuais e discriminam desconto de VT, transporte antecipado informativo e verbas especiais. Dois PDFs fictícios foram gerados/renderizados e tiveram o layout inspecionado. Corrigida sobreposição entre observação e assinatura no contracheque.
- Corrigido o uso de `admin.firestore.FieldValue` no endpoint financeiro (Firebase Admin instalado exige importação modular); o teste agora chama o callable real, além dos helpers.

Fontes primárias conferidas nesta rodada:

- [Tabela INSS 2026](https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/tabela-de-contribuicao-mensal).
- [Decreto 10.854/2021, arts. 114–117: VT](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/decreto/d10854.htm).
- [Manual do empregador doméstico/eSocial](https://www.gov.br/esocial/pt-br/empregador-domestico/manual-do-empregador-domestico).
- [Direitos do trabalhador doméstico](https://www.gov.br/esocial/pt-br/empregador-domestico/orientacoes/direitos-do-trabalhador-domestico).

Publicação futura precisa incluir frontend, `salvarFolhaPagamento`, `criarLancamentoFinanceiro`, `excluirLancamentoFinanceiro`, `lembretesOperacao` e `dispararLembretes`, com os módulos dependentes e as regras locais da rodada anterior. **Não houve publicação.**

Validação desta evolução: lint/build sem erros; 77 testes unitários aprovados (9 dependentes de emulador pulados no comando unitário); suíte completa emulada com 45 aprovações; após a inclusão da verificação do callable financeiro e da revisão concorrente, 18 testes direcionados aprovados, incluindo os 6 cálculos puros. O último ajuste da projeção aquisitiva também passou nos 6 testes de cálculos. No navegador local foram conferidos criação global sem troca de filtro, carimbo de autoria, transporte gravado pelo endpoint e refletido na folha, rascunho salvo, INSS/VT, segunda parcela do 13º, férias e rescisão com aviso/avos automáticos. Apenas dados fictícios; nenhum pagamento ou notificação real. Capturas em `output/ajustes-folha/` e PDFs de teste em `output/pdf/`.

## Uso

1. Escritório contábil → Folha: selecione a funcionária e a competência.
2. “Iniciar e salvar folha” cria um registro em andamento, mesmo que os valores ainda estejam incompletos.
3. Atualize bônus, horas, descontos e observações e use “Salvar alterações”. A folha pode ser retomada pela competência ou por “Continuar edição”. O recálculo do banco de horas só preenche folhas novas; não substitui campos salvos.
4. No dia escolhido, “Finalizar e fechar folha” pede confirmação e salva a versão final. A folha fica pronta para pagamento e não permite mais edição.
5. “Registrar pagamento” mantém a etapa financeira existente; o lançamento e a baixa da folha são atômicos e idempotentes.

O salvamento é explícito, pelo botão; alterações não salvas são indicadas. Há aviso ao fechar a página, sair pelo menu, trocar de funcionária ou competência. Uma folha única por funcionária/competência mantém versões: uma gravação desatualizada é recusada, em vez de sobrescrever outra sessão.

## Dados e acesso

`folhasPagamento/{funcionarioId}_{competencia}` preserva os campos e cálculos existentes e acrescenta `status: em_andamento`, `versao`, `criadaEm/Por`, `atualizadaEm/Por`. Fechar acrescenta `fechadaEm/Por` e muda para `pronta_pagamento`. Somente administradores ativos leem e escrevem. Regras permitem criar rascunhos e atualizar somente folhas em andamento, com versão crescente; folhas fechadas/pagas não podem ser alteradas ou apagadas pelo cliente.

O pagamento pela função existente `criarLancamentoFinanceiro` passa a usar `functions/folha-pagamento.cjs` quando há `folhaId`. Usa os valores salvos, exige fechamento, grava um lançamento determinístico e marca a folha paga na mesma transação. Repetições retornam o mesmo ID. Se uma folha antiga teve o lançamento registrado sem a baixa, um único lançamento compatível é reaproveitado; divergências exigem conferência. Folhas antigas fechadas/pagas são preservadas.

## Verificação e futura publicação

Testes locais: lint/build, suíte unitária, regressão dos módulos existentes e `tests/folha-emulador.test.cjs` (iniciar, retomar, versões, fechamento, permissões, pagamento concorrente e compatibilidade com folhas antigas). Conferência visual usa exclusivamente uma funcionária fictícia no emulador.

Quando houver autorização para publicar, atualizar em conjunto a função `criarLancamentoFinanceiro` (incluindo o novo módulo), as regras do Firestore e o frontend. Publicar somente a interface deixaria o fluxo incompatível com o backend anterior. Não aplicar estas regras sem atualizar o pagamento: o cliente deixou de marcar a folha como paga diretamente. Nenhum deploy foi realizado nesta rodada.
# Ajuste da base do bônus — outubro de 2026

A opção `bonusSemIncidenciaInss` permite excluir somente o bônus da base automática, preservando-o nos proventos e no líquido a receber. Horas extras e outros adicionais continuam na base. A base manual conferida no eSocial tem precedência. O servidor recalcula e persiste a escolha; folhas fechadas não são alteradas.

Na interface, novas folhas e rascunhos antigos sem essa escolha iniciam com “Bônus sem incidência de INSS” marcado, conforme solicitação do titular. Folhas fechadas antigas preservam o comportamento anterior. A classificação da verba deve ser conferida no eSocial: o nome “bônus” não determina isenção. Referência: [Receita Federal, prêmio por desempenho](https://normas.receita.fazenda.gov.br/sijut2consulta/anexoOutros.action?idArquivoBinario=54748).

Exemplo testado: salário/base de R$ 1.621,00 e bônus sem incidência de R$ 300,00, sem outros ajustes: INSS R$ 121,58; proventos R$ 1.921,00. Não houve alteração de folha real nem publicação neste ajuste.

