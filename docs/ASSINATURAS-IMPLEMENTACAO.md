# Assinaturas na candidata completa de produção

Rodada de 14/11/2026 — [issue #9](https://github.com/AnderCSilva84/pontov3/issues/9), definição na [issue #8](https://github.com/AnderCSilva84/pontov3/issues/8), lançamento na [issue #7](https://github.com/AnderCSilva84/pontov3/issues/7).

## Estado verificável

Revisão local posterior — 15/11/2026: noBolsoConsulta e comprasEstimativa receberam a guarda de compartilhamento antes/depois das leituras do grupo. Teste reproduziu o contorno da restrição por membro Free/suspenso/expirado antes da correção; titular/transição preservados. Correção ainda não publicada. [Matriz do rollout e evidências](mobile/22-prontidao-rollout-assinaturas.md). Não ativar grupos só porque as 11 Functions novas já existem.

Atualização posterior — 15/11/2026: **código 7/1.0.0 disponível para testadores internos**, sem perda de dispositivos e sem erros bloqueantes. Compras seguem desabilitadas; grupo de teste em transição. Instalação e homologação física ainda aguardam o titular. [Publicação e verificações pendentes](mobile/21-teste-interno-codigo7.md). Registros de candidata apenas local abaixo são históricos.

Atualização posterior — 15/11/2026: RTDN do AP1303 conectado na Play Console com teste do painel recebido no backend. AAB **7/1.0.0** gerado e validado localmente, ainda não enviado; compras desabilitadas. Cinco APIs de suporte da interface também implantadas seletivamente, sem atualizar regras/Functions antigas. Gates desligados e grupos em transição. [Evidências e limites da candidata](mobile/20-play-rtdn-candidata7.md). Não confundir a conexão RTDN aprovada com contratação ou migração homologadas.

Atualização externa posterior — 15/11/2026: **seis Functions de assinaturas/notificações implantadas**, IAM restrito aprovado pelo titular e teste de transporte Pub/Sub recebido. Três APIs recusam anônimo, agendamento 15min habilitado. Gates continuam desligados e grupo dedicado em transição. [Estado e evidências finais](mobile/19-preparacao-backend-homologacao.md). Publicação pela identidade Google Play, Console, compra física, candidata atualizada, migração efetiva e integração Mercado Pago permanecem pendentes; os registros anteriores de “sem deploy” abaixo são históricos.

Atualização de 15/11/2026: cotas, permissões, ponto no aparelho do titular Free e transferência Free estão implementados localmente (roteiros 11–17). Produtor transacional de entrega automática de **compras Play de teste**, recuperação na tela de planos para grupos autorizados e inventário comercial somente leitura preparados no [roteiro 18](mobile/18-entrega-teste-migracao-homologacao.md). O titular confirmou Android com teste interno instalado; versão e homologação das mudanças atuais ainda precisam ser conferidas. Registros históricos abaixo não significam que a integração completa esteja liberada. Mercado Pago, compras públicas, migração/ativação real, RTDN externo e homologação física seguem pendentes; nenhum deploy nesta rodada.

Reconhecimento/RTDN: [#15](https://github.com/AnderCSilva84/pontov3/issues/15) implementada localmente e em validação do código. Fila privada, deduplicação, leases, retomada, reconhecimento após entrega e sincronização restrita de direito existente; ainda sem produtor de entrega integrado ao fluxo completo, tópico, agendamento/gatilhos implantados ou compra real. [Escopo, testes e pendências](mobile/10-play-rtdn-reconhecimento.md). As descrições anteriores abaixo são registros das etapas já executadas.

Avanço backend: verificação de compras de teste implementada localmente, com consulta autenticada à Developer API, vínculo imutável, provas privadas e validação de autorização antes/depois da API. Developer API habilitada; identidade dedicada criada e acessos Firestore/AP1303 concedidos após autorização explícita do titular. Sem deploy, reconhecimento ou concessão de plano. [Código, testes, permissões e limites atuais](mobile/09-verificacao-play-backend.md).

Atualização posterior da mesma rodada: AAB 6 disponível no teste interno; #10 concluída, #11 em validação física. Na #12, os três produtos reais e planos-base mensais foram salvos como rascunho com os preços aprovados e Brasil selecionado, sem ativação. Primeiro refino #13 implementado localmente e conferido em prévia responsiva. [Resultados e pendências atuais](mobile/08-produtos-play-e-refino.md). Registros abaixo preservam a sequência histórica e não substituem esse estado mais recente.

Preparação local, incompleta para produção. Catálogo compartilhado, resolução de vigência, consulta autenticada, tela informativa e ponte Android Google Play Billing implementados localmente. A ponte está compilada, com consultas e fluxo de compra preparado mas bloqueado no nativo. Não há checkout liberado, webhooks/RTDN, verificação Play homologada na API real, ponto no aparelho do titular ou aplicação integral de cotas. Sem deploy/ativação de plano; apenas configuração de API/identidade/permissões descrita acima foi aplicada externamente.

Código:

- `functions/assinaturas-planos.json`: única tabela de preços e cotas para frontend/backend.
- `functions/assinaturas-dominio.cjs`: vigência confirmada, expiração e verificação de cotas; não verifica recibos no provedor e não substitui contagem transacional.
- `functions/assinaturas.cjs`: consulta de estado por vínculo do usuário, sem aceitar grupo/plano do cliente; não expõe recibos nem emails de cobrança.
- `src/pages/Planos.jsx`: comparação dos quatro planos em Minha conta → Consultar planos. Sem botão de compra ou cancelamento fictício.
- `firestore.rules`: registros comerciais privados, sem leitura/escrita direta do cliente.
- `android/app/src/main/java/br/dev/acstech/ap1303/dev/PlayBillingPlugin.java`: Billing 9.1.0, conexão, consultas, recuperação de compras e fluxo de abertura protegido por bloqueio nativo. Não concede direito nem reconhece compra no cliente.
- `src/services/playBilling.js` e `src/utils/playBilling.js`: sessão por conta/grupo, descarte de callbacks antigos e consulta dos preços da loja no Android. Não persistem tokens.

Grupos sem `assinaturasAtivas: true` permanecem em transição, sem plano presumido. **Não definir essa flag em produção:** direitos ainda não são impostos nas operações existentes. Não há ferramenta de ativação nesta rodada. Os grupos atuais devem ser inventariados e migrados somente após a implementação completa e sua homologação.

## Correção de escopo

O titular esclareceu que o Free deve bloquear a seção já existente **Escritório contábil** (`/admin/financeiro`). Isso inclui novas operações administrativas de folha e pagamentos, não apenas convite a contador. O domínio comercial usa `escritorioContabil` para esse módulo. A v4 da definição substitui a interpretação anterior de acesso externo. Preservar histórico e exportação após redução requer um fluxo separado de consulta.

## Configuração externa necessária

O titular possui contas Mercado Pago e InfinitePay. Mercado Pago para PWA e Google Play Billing para Android são os canais planejados. Não inserir links de checkout web no app Android como atalho à integração da loja.

Atualização com capturas fornecidas pelo titular em 14/11/2026: aplicação Mercado Pago de Assinaturas criada (909885982963145), contas de teste vendedor/comprador Brasil criadas e credenciais de teste ativadas. Nenhuma chave foi copiada para documentação/GitHub. Configuração segura no backend, webhooks e pagamentos de teste ainda pendentes. Na Play Console, produtos ainda não criados; a tela mostrou somente “Faça upload de um novo APK”. Perfil de pagamentos acessível, sem comprovação de conclusão do cadastro bancário ou demais verificações.

## Sequência e cartões no GitHub Projects

| Ordem | Issue | Estado do quadro | Prioridade | Tamanho | Dependência |
| --- | --- | --- | --- | --- | --- |
| 1 | [#10 Integrar Google Play Billing](https://github.com/AnderCSilva84/pontov3/issues/10) | Em validação | P1 | L | Base compilada; validação final do binário na #11 |
| 2 | [#11 AAB e teste interno](https://github.com/AnderCSilva84/pontov3/issues/11) | A fazer | P1 | M | Base #10 compilada; conferir release e envio |
| 3 | [#12 Produtos e testes na Play](https://github.com/AnderCSilva84/pontov3/issues/12) | Backlog | P1 | M | #11 |
| 4 | [#9 Implementação completa](https://github.com/AnderCSilva84/pontov3/issues/9) | Em andamento | P1 | XL | Integração e homologação; tarefas PWA podem avançar em paralelo |
| 5 | [#7 Produção](https://github.com/AnderCSilva84/pontov3/issues/7) | A fazer | P0 | L | #9 homologada e demais critérios da candidata |

Todas atribuídas ao titular. Dependências documentadas nos corpos das issues; não foram criadas relações nativas de bloqueio. #8 permanece concluída como definição comercial. Essa organização não gerou nem enviou AAB e não publicou aplicativo.

### Mercado Pago — preparação pelo titular

1. Acessar o painel de desenvolvedores e criar/selecionar a aplicação do Tá no Ponto para integração de assinaturas. Conferir a habilitação da conta para esse produto.
2. Preparar ambiente e contas de teste conforme o fluxo documentado pelo provedor. Separar completamente credenciais de teste e produção.
3. Guardar Access Token exclusivamente como segredo do backend Firebase; nunca em `VITE_*`, repositório ou chat. A configuração do segredo e os nomes finais serão fornecidos quando o adaptador estiver implementado.
4. Configurar mensalidade em BRL para Prata 14,90, Ouro 29,90 e Diamante 49,90. O backend deve mapear identificadores do provedor para o catálogo interno; não aceitar valor informado pelo cliente.
5. Depois de existir endpoint de webhook homologado, cadastrar URL HTTPS e verificar sua assinatura/segredo. Não cadastrar endpoint fictício nem considerar retorno ao site como confirmação de pagamento.
6. Testar pagamento, falha, renovação, cancelamento, evento repetido e recuperação de notificações antes de usar credenciais de produção.

Referências oficiais: [assinaturas com plano associado](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/integration-configuration/subscription-associated-plan), [webhooks](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks). Configuração de aplicação não é uma cobrança ao titular.

### Play Console — preparação pelo titular

1. Conferir a configuração de monetização do app `br.dev.acstech.ap1303` e o perfil de pagamentos no Console. Dados financeiros e aceite de termos devem ser preenchidos pelo titular.
2. Primeiro integrar Billing (#10), gerar e conferir AAB com novo versionCode e enviar ao teste interno (#11). Confirmar que o Console permite criar assinaturas. Somente então preparar os três produtos (#12), com identificadores sugeridos `ta_no_ponto_prata`, `ta_no_ponto_ouro` e `ta_no_ponto_diamante`; cada um com plano-base `mensal` autorrenovável. Confirmar os IDs reais antes de fixá-los no código.
3. Definir preço brasileiro conforme a tabela aprovada, países e disponibilidade. O Android exibirá o preço retornado pela loja; não pressupor que a tabela local contém impostos e preços regionais do Console.
4. Preparar acesso mínimo do backend à Google Play Developer API e notificações em tempo real. Não compartilhar chaves privadas no chat. Seleção de credenciais e concessão de acesso serão tratadas na configuração segura da integração.
5. Cadastrar testadores de licença e homologar com build de teste instalado pela Play: compra, compra pendente, confirmação no servidor, reconhecimento, cancelamento, expiração, restauração e troca de conta/grupo.
6. Não enviar a candidata a produção antes de concluir os testes e atualizar as declarações da loja conforme a monetização real.

Referências oficiais: [integração Play Billing](https://developer.android.com/google/play/billing/integrate), [verificação de compra no backend](https://developer.android.com/google/play/billing/security).

## Próximas entregas do código

1. Adaptadores reais de pagamento e armazenamento privado de recibos; notificação recebida dispara reconciliação com API, sem confiar no payload para liberar recursos. Impedir que a mesma compra seja ligada a grupos diferentes.
2. Contratação e cancelamento idempotentes; falha de resposta não pode gerar assinatura paralela. Mapear vigência e estados reais, inclusive restauração e revogação. Validar compatibilidade da troca somente no próximo ciclo com ambos os canais.
3. Migrar criação/reativação de funcionários e tarefas para operações com cotas transacionais; cobrir também gravações diretas existentes. Bloqueio visual sozinho é insuficiente.
4. Aplicar limites de listas e lembretes, QR, compartilhamento e Escritório no servidor e nas regras. Implementar consulta histórica sem habilitar novas operações pagas.
5. Projetar identificação individual para ponto no aparelho do titular, seleção de funcionários após downgrade e conciliação de jornadas/filas offline sem perda de autoria.
6. Homologar PWA, backend e Android como uma candidata completa; preparar migração, compatibilidade com versão já instalada e publicação coordenada.

## Verificações desta rodada

Atualização Android #10: Billing 9.1.0 compilado, 19 testes Android e 8 testes JavaScript dedicados aprovados; suíte geral atualizada com 350 aprovados e 58 ignorados por ambiente, nenhuma falha. Lint e build web aprovados. Manifesto mesclado debug conferido; release final pendente da #11. Evidências e limites em [Play Billing](mobile/06-play-billing.md). Os números abaixo preservam o registro da preparação inicial.

- Lint e build web aprovados.
- Suíte geral antes do teste de emulador novo: 342 passaram, 57 ignorados, nenhuma falha. Ignorados não equivalem a integração aprovada.
- Oito testes dedicados verificaram expiração no instante exato, cancelamento ainda vigente, estado pendente/revogado, data inválida, redução acima da cota, origem do grupo e ausência de recibos no retorno.
- Teste dedicado de emulador em `tests/assinaturas-emulador.test.cjs`: quatro verificações aprovadas no projeto fictício demo-ap1303, incluindo negação de acesso direto aos documentos comerciais e estado resolvido sem modificar dados.
- A conferência visual no navegador não foi concluída: acesso ao servidor local expirou. Não registrar QA visual como aprovado.
- Não foi gerado nem enviado AAB nesta rodada. Build web não comprova compra real, aplicação integral de cotas ou homologação Android.
