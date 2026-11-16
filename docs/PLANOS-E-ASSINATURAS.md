# Planos e regras de assinaturas — definição v4

[Issue #8](https://github.com/AnderCSilva84/pontov3/issues/8). Consolidado em 14/11/2026 para encerramento da definição comercial, conforme solicitação do titular nesta conversa. Implementação, cobrança e publicação são etapas separadas.

## Público, planos e recursos

Público: famílias e pequenos empregadores. Uma assinatura mensal por grupo. Custo atual informado: R$ 99/mês; taxas, tributos e crescimento do consumo não estão incluídos nesse valor.

| Recurso ou cota por grupo | Free | Prata | Ouro | Diamante |
| --- | --- | --- | --- | --- |
| Mensalidade | Grátis | R$ 14,90 | R$ 29,90 | R$ 49,90 |
| Funcionários cadastrados não arquivados | 2 | 5 | 15 | 50 |
| Listas abertas simultaneamente | 3 | 10 | 30 | 60 |
| Tarefas pendentes | 20 | 100 | 200 | 500 |
| Lembretes ativos | 10 | 30 | 100 | 200 |
| Ponto e jornada | Sim | Sim | Sim | Sim |
| Escritório: folha, pagamentos, filiais e documentos | Não | Sim | Sim | Sim |
| Compras manuais e histórico | Sim | Sim | Sim | Sim |
| Pratos e receitas | Sim | Sim | Sim | Sim |
| Compartilhamento com acessos individuais | Não | Sim | Sim | Sim |
| Escritório contábil | Não | Sim | Sim | Sim |
| Importação fiscal por QR Code | Não | Não | Sim | Sim |
| Titular administrador | 1 | 1 | 1 | 1 |

No Free, funcionários registram ponto no aparelho controlado pelo titular, sem login individual. A identificação individual nesse aparelho deve preservar autoria e auditoria; o mecanismo será projetado e homologado na implementação. A seção existente Escritório contábil (/admin/financeiro), incluindo novas operações de folha e pagamentos, não está incluída no Free.

Nos planos pagos, os funcionários podem registrar e consultar seus próprios dados com login individual; o limite de funcionários não é um limite de dispositivos. Não oferecer administradores adicionais nesta versão. Titular não ocupa vaga de funcionário, exceto quando também tiver cadastro funcional.

Escritório contábil significa a seção já existente na Gestão. O titular esclareceu expressamente que deseja bloquear essa seção no Free. A interpretação da v3 como um acesso externo de contador está substituída: não há contratação de vaga contábil externa incluída nesta definição. Nos planos pagos, continuam valendo as permissões administrativas do módulo existente.

Exportações seguem o módulo e o perfil, sem cota comercial por quantidade. Notificações acompanham os recursos incluídos e dependem de permissão, conexão e aparelho. Central de preços e integração No Bolso seguem disponibilidade, autorização e consentimento existentes, sem benefício exclusivo por plano. Cuidados de pessoas e pets somente na edição PWA habilitada; a assinatura não habilita esses módulos no Android.

Nesta versão, a oferta de importação fiscal automatizada é por QR Code, somente Ouro/Diamante. Outras modalidades não são prometidas como benefício de plano e precisam de especificação antes de serem comercializadas. Compras manuais continuam disponíveis em todos.

## Contagem e operações

- Funcionário cadastrado conta mesmo sem login, enquanto não estiver arquivado/desligado. Apenas desabilitar o login não libera vaga. Arquivar preserva histórico; reativar exige vaga e ausência de conflito com jornada em andamento. Não arquivar durante jornada aberta.
- Convite para novo funcionário reserva vaga até aceite ou revogação; aceitar não conta novamente. Convites vinculados ao mesmo cadastro não duplicam a contagem.
- Listas contam enquanto abertas, tarefas enquanto pendentes e lembretes enquanto ativos. Concluir, arquivar ou desativar libera capacidade. Reabrir exige capacidade. Histórico não consome essas cotas.
- O teto é por grupo e considera todos os dispositivos. Servidor valida atomicamente a última vaga/cota e identifica repetições pela mesma operação. O cliente não decide direitos comerciais.
- Ao atingir limite, recusar criação/reativação e mostrar uso, teto e como liberar capacidade. Permitir consulta, exportação, conclusão, arquivamento e correção dos dados existentes, respeitando perfil.
- Sem cotas comerciais para quantidade de marcações de ponto ou histórico. Limites técnicos de arquivo, importação e proteção contra abuso devem ser informados antes da operação; não equivalem a plano ilimitado.

## Contratação, renovação e cancelamento

1. Somente o titular contrata ou troca plano. Exibir preço final em reais, recursos, limites, periodicidade, próxima cobrança e canal de gestão antes da confirmação. Cadastro não inicia cobrança.
2. Planos pagos renovam mensalmente de forma automática após contratação explícita. O período segue datas confirmadas pelo provedor, sem presumir meses de 30 dias. Não há anual, adicionais de vagas ou teste com conversão automática nesta versão.
3. Cancelamento interrompe a renovação e mantém o plano até o término do período pago. Exibir a data final. Não apagar dados nem tratar cancelamento como reembolso automático.
4. Reativar a renovação antes do vencimento não gera assinatura paralela. Após expiração, nova contratação exige confirmação explícita e verificação de assinatura existente em outros canais.
5. Upgrade e downgrade entram no próximo ciclo, sem cobrança proporcional nem alteração retroativa do período pago. Mostrar preço e data efetiva; permitir cancelar a mudança antes da efetivação. A escolha de provedor/canal deve suportar essa regra; eventual incompatibilidade exige revisão documentada antes de vender.
6. Uma falha de rede não encerra assinatura. Ativação, renovação, restauração, reembolso e revogação exigem confirmação verificada no servidor. Eventos duplicados ou fora de ordem não podem duplicar cobrança ou remover período válido.
7. Falha de renovação: avisar o titular e respeitar eventual carência confirmada pelo canal. Não prometer dias adicionais de uso além do direito confirmado. Esgotado o período válido/carência, retornar ao Free. Prazo técnico da carência será documentado após seleção do provedor.
8. Reembolso e contestação seguem decisão confirmada do canal de compra, com ajuste do direito e comunicação ao titular. Reembolso/contestação não apagam dados.
9. Mudança futura de preço não altera o período já pago. Comunicação prévia e aceite quando aplicável precisam ser implementados conforme o canal antes de cobrar novo valor. Cancelamento e restauração devem ser acessíveis pelo canal da compra.

## Expiração, redução e preservação

Ao terminar o período válido, aplicar o plano de destino, inclusive Free após cancelamento. Comunicar data de término e efeitos ao titular e aos funcionários enquanto os canais estiverem disponíveis.

- Histórico, documentos e autoria são preservados. Titular mantém consulta/exportação de dados anteriores à redução por um fluxo de histórico, sem habilitar novas operações do Escritório no Free. Ex-funcionários e membros anteriormente autorizados mantêm consulta/exportação somente do próprio histórico permitido; isso não permite novas operações compartilhadas.
- No Free, o ponto continua disponível no aparelho do titular para até 2 funcionários selecionados por ele. Com mais de 2 cadastros, solicitar seleção explícita antes da redução. Sem seleção, bloquear novas entradas até regularizar; não escolher pessoas automaticamente. Arquivos históricos ficam preservados.
- Permitir concluir uma jornada iniciada com direito válido antes da redução, mesmo acima do novo limite; não liberar novas entradas por essa exceção. Não bloquear saída nem descartar marcações em trânsito.
- No downgrade, aplicar cotas do plano de destino sem apagar excesso. Impedir novas criações/reativações até liberar capacidade. Funcionários além das vagas selecionadas ficam com histórico em consulta, sem novas entradas; não excluir o cadastro.
- Free não permite novas ações compartilhadas nem uso operacional da seção Escritório contábil. Free e Prata não permitem novas importações por QR Code; notas previamente importadas permanecem consultáveis conforme perfil.
- Operações offline recebidas após a redução não são apagadas silenciosamente. Operações iniciadas com autorização verificável no período válido devem ser conciliadas de forma idempotente. Sem comprovação suficiente, manter pendência visível para revisão, sem confiar apenas no relógio do aparelho. Conclusão de jornada segue a exceção acima. O protocolo de autorização offline é requisito da implementação.
- Restabelecer assinatura recupera os direitos sem recriar dados ou duplicar operações.

Grupos atuais não serão convertidos em assinaturas pagas automaticamente. Inventariar uso, comunicar transição e definir data de vigência em rodada própria antes de ativar limites. Não interromper jornada já iniciada. Cancelamento não equivale à exclusão de conta; retenção segue os documentos de privacidade aprovados.

## Implementação e homologação separadas

Esta definição encerra a issue #8. A implementação depende da revisão de prontidão e de uma rodada própria:

Rodada de implementação: [issue #9](https://github.com/AnderCSilva84/pontov3/issues/9), vinculada à mesma candidata completa de produção da issue #7. Estado: em andamento local; sem deploy ou cobrança. O titular possui contas Mercado Pago e InfinitePay, mas ainda não tem integração nem produtos configurados na Play Console.

- Selecionar provedor e canais PWA/Android; verificar políticas vigentes de pagamento, reembolso, cancelamento e comunicação comercial. Nenhuma conformidade com loja foi presumida nesta definição.
- Documentar os estados: Free, contratação pendente, ativo, cancelamento agendado, mudança agendada, carência confirmada, expirado e revogado. Modelar situação de cobrança separadamente do plano efetivo.
- Implementar direitos protegidos no servidor, cotas atômicas, recibos verificados, idempotência, restauração e prevenção de assinaturas duplicadas.
- Implementar ponto no aparelho do titular e restrição da seção existente Escritório contábil no Free; não presumir que os perfis existentes já cobrem esses fluxos.
- Testar os quatro planos, fronteiras de cotas e concorrência, convites, funcionário arquivado/reativado, isolamento entre grupos, QR restrito, acesso contábil, cancelamento ainda vigente, downgrade acima do limite, saída de jornada aberta, eventos duplicados/fora de ordem, falha de rede, offline, restauração e migração de grupos atuais.
- Validar custos com taxas e consumo projetado antes da abertura de vendas. Definir data de lançamento após homologação.

## Registro de decisão e aceite

Em 14/11/2026, o titular definiu nomes e público; confirmou Free com ponto no aparelho do titular, 2/5/15/50 funcionários, ausência de compartilhamento e escritório contábil no Free e QR somente Ouro/Diamante. Aprovou os preços com “Os preços podem ser os sugeridos por vc”.

Na sequência, solicitou fechar os demais recursos/cotas e regras operacionais, aprovar renovação/cancelamento/expiração, registrar aprovação final e concluir a issue. Esta v3 consolida as cotas anteriormente propostas e detalha as regras operacionais no âmbito dessa autorização de fechamento. A seleção de provedor, homologação e publicação permanecem no escopo da implementação, sem impedir o encerramento desta definição comercial.

Correção v4: ao iniciar a implementação, o titular esclareceu “Bloquear a seção existente no Free” para Escritório contábil. Esta decisão substitui as referências da v3 a acesso contábil externo e a folha operacional incluída no Free.

- [x] Planos e preços definidos e documentados.
- [x] Recursos, cotas e permissões especificados.
- [x] Renovação, cancelamento, redução e expiração documentados.
- [x] Solicitação de aprovação final e encerramento registrada.
- [x] Definição concluída; implementação acompanhada na issue #9.
