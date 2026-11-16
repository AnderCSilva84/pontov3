# Google Play — verificação no backend

Rodada de 14/11/2026, implementação #9 e configuração #12. Código local, sem deploy e sem liberação de contratação.

## Implementado

- `functions/assinaturas-play-config.json`: pacote fixo `br.dev.acstech.ap1303`, base `mensal` e os três IDs reais confirmados no Console.
- `functions/assinaturas-play.cjs`: cliente autenticado por identidade de execução (ADC), consulta GET à Developer API, timeout e erros sanitizados. Não aceita URL, pacote, plano ou preço do cliente. Não devolve/loga o erro bruto que pode conter token/Authorization.
- Interpretação da resposta da API: produto/base permitidos, vínculo derivado por SHA-256 de `JSON.stringify([uid, grupoId])`, vigência e reconhecimento separados. Pendente, suspensa, pausada, expirada e pendência cancelada não têm vigência paga. Cancelamento preserva apenas vigência confirmada ainda não expirada; carência segue a data confirmada pelo provedor.
- Formatos ainda não homologados (tokens vinculados/trocas, múltiplos itens, promoções, pré-pago e parcelamento) são recusados para conferência, sem liberar direitos.
- `verificarCompraPlayTeste`: callable de homologação, limitado ao titular ativo de grupo previamente habilitado pelo servidor e somente a compras de teste. Cinco consultas por minuto/UID. Verifica novamente vínculo, titular, exclusão de conta e habilitação após a consulta externa.
- Recibo privado com vínculo imutável e tentativas append-only em `assinaturasCompras/.../validacoes/...`. Repetições não transferem a compra nem sobrescrevem um estado mais recente. Regras negam leitura/escrita direta de recibos, tentativas, limites e configuração, inclusive ao titular.

Não concede plano, não escreve `assinaturasGrupos`/`assinaturasAtivas`, não reconhece nem cancela compra na Play. A resposta ao cliente contém apenas o resultado resumido, sem token, pedido ou conta ofuscada. Reconhecimento e concessão devem ser conectados ao fluxo completo antes de iniciar compras reais de teste; não deixar compras sem reconhecimento enquanto se prepara o restante.

## Configuração externa executada e autorizada

A consulta inicial mostrou a Developer API desabilitada e a identidade compartilhada das Functions atuais. Habilitada `androidpublisher.googleapis.com` em `ponto-app-1c55a`.

A revisão automática inicialmente rejeitou criar uma identidade persistente sem autorização específica. O titular então autorizou expressamente criar a conta, dar leitura/gravação ao Firestore e conceder, somente no AP1303, visualização financeira/pedidos e gestão de pedidos/assinaturas.

Após essa aprovação:

- Criada `assinaturas-play@ponto-app-1c55a.iam.gserviceaccount.com`, sem chave privada exportada. Listagem de chaves gerenciadas pelo usuário retornou vazia.
- Concedido `roles/datastore.user` no projeto, confirmado em leitura da política IAM. O papel permite acesso de dados ao Firestore do projeto; regras de cliente não limitam Admin SDK. A autorização do titular abrange esse acesso, e somente a Function de verificação está configurada para executar como essa identidade.
- Play Console confirmou identidade **Ativa**, sem expiração e com acesso somente ao app AP1303. Selecionadas Ver dados financeiros e Gerenciar pedidos e assinaturas; leitura básica do app e qualidade aparecem como permissões implícitas da seleção. Nenhuma permissão de publicação, administrador ou acesso global à conta foi adicionada.
- `functions/index.js` define a identidade dedicada apenas em `verificarCompraPlayTeste`. As Functions existentes continuam com a configuração anterior. Nenhum deploy realizado.

O convite autorizado foi enviado para a conta de serviço na própria Play Console; não houve mensagem a outras pessoas. Resultado externo não comprova ainda chamada autenticada da Function à API real ou compra homologada.

## Habilitação para homologação — ainda não executada

O documento privado `assinaturasConfiguracao/google_play` deve conter `homologacaoAtiva: true` e `gruposPermitidos` com os IDs expressamente escolhidos para testes. Ausência/desativação recusa a chamada antes de acessar a API. Não criar esse documento em produção nem ativar grupos reais por inferência; confirmar grupo/identidade antes da rodada física. Os emuladores usam apenas fixtures no projeto `demo-ap1303`.

## Validação

- 9 testes dedicados aprovados: vínculo errado/ausente, produto/base inválidos, pendência/suspensão/expiração/cancelamento/carência, erros sem segredo, exclusão/troca de grupo durante a API, repetição, conflito de vínculo, rate limit e rejeição de compra real.
- 5 verificações de integração aprovadas no emulador demo-ap1303: regras comerciais privadas, transição sem alteração de direitos e duas verificações simultâneas com um vínculo e duas tentativas; desativação durante consulta bloqueia o novo registro.
- Suíte geral: 359 aprovados, 58 ignorados, zero falhas. Lint, sintaxe Node e `git diff --check` aprovados. Após um ajuste defensivo na validação da contagem do limite, os 9 testes dedicados foram repetidos e passaram.

## Próximas entregas

1. Reconciliação/RTDN, reconhecimento no servidor, prevenção de assinatura simultânea por grupo/canal, cadeia de tokens e mudanças agendadas. Eventos disparam consulta à API, sem conceder direitos pelo payload.
2. Adaptador Mercado Pago, segredos/webhooks, contratação/cancelamento idempotentes.
3. Cotas e permissões em todas as gravações, Free no aparelho do titular e migração dos grupos.
4. Preparar testadores/licença, ativação controlada dos planos e pacote de teste com backend pronto; testar os estados ponta a ponta antes da candidata #7.

Referências oficiais: [segurança de compras](https://developer.android.com/google/play/billing/security), [SubscriptionPurchaseV2](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2), [configuração e permissões](https://developers.google.com/android-publisher/getting_started).
