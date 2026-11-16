# Reconhecimento e RTDN Google Play

Rodada de 14/11/2026 — [#15](https://github.com/AnderCSilva84/pontov3/issues/15), parte da implementação #9, configuração #12 e candidata #7. Código local; sem deploy ou alteração externa nesta etapa.

## Fluxo implementado

`assinaturas-play.cjs` agora oferece POST de reconhecimento para pacote/produtos fixos, com autenticação ADC e erros sanitizados. O fluxo em `assinaturas-play-reconciliacao.cjs` consulta a loja antes de decidir; se o POST perde a resposta, consulta novamente para distinguir sucesso de falha. Repetir uma tarefa já reconhecida não repete o POST.

O reconhecimento exige compra de teste vigente/ativa, conta/grupo correspondentes, titular ativo e fora de exclusão, habilitação privada por grupo, `direitosHomologados` e `reconhecimentoTesteAtivo`. Também exige:

- `assinaturasEntregas/{compraId}` privado, versão 1, `confirmada: true`, `teste: true`, UID/grupo/compra/produto/base correspondentes;
- direito existente em `assinaturasGrupos/{grupoId}`, verificado, da mesma compra Google Play e do mesmo plano, com vigência suficiente;
- grupo já em modo de assinaturas, ativado somente pela futura migração homologada.

Não há operação pública que permita criar essa confirmação ou conceder direitos. O fluxo de contratação completo ainda deverá criar direito e confirmação atomicamente depois de entregar benefícios, cobrindo cotas/permissões. Até lá, não ativar gates nem iniciar compras de teste reais. O bloqueio nativo continua false.

## Notificações e retomada

- `receberRtdnPlay`: gatilho Cloud Pub/Sub no tópico `assinaturas-play-rtdn`; não é HTTP público. Valida tamanho/formato/pacote, exclusividade do tipo e token. Mensagens de teste só geram registro de recebimento. Avisos de assinatura e anulação de assinatura disparam consulta da API; outros formatos são ignorados.
- A deduplicação usa o ID da mensagem; tarefas privadas guardam somente hash da compra e origem, sem token/payload financeiro. Compra desconhecida aguarda vínculo, sem tentar descobrir UID/grupo pelo evento. A verificação inicial obtém o estado atual da API ao registrar a compra.
- Fila em `assinaturasEventos`, com `retomarEm` numérico; sweep a cada 15 minutos, até dez tarefas por rodada. Falhas transitórias e compra ocupada aguardam nova tentativa. Configuração/vínculo inválidos e formatos não homologados exigem revisão; pendências com mais de três dias também exigem revisão. Os registros não são apagados.
- Lease de 90 segundos por compra e ID de rodada impedem que uma consulta lenta sobrescreva uma nova. Uma conclusão não volta a pendente por resposta concorrente de outra execução.
- O gatilho de criação da confirmação privada de entrega gera tarefa própria; isso evita depender de um RTDN futuro para reconhecer uma compra que já entregou benefícios. A intenção de reconhecimento é registrada antes da chamada externa.
- Estado e vigência só são sincronizados atomicamente para um direito já entregue, confirmado e da mesma compra/canal/plano, com `direitosHomologados` e grupo ativo. Para manter direitos vigentes, a prova também precisa estar reconhecida. Suspensão/expiração retiram a vigência pelo estado confirmado da API. O fluxo não cria direito nem troca plano/canal/grupo.
- Direitos de outro token/provedor (por exemplo Mercado Pago) são preservados; prevenção de contratações simultâneas e troca/cadeia de tokens continuam pendentes na #9. Uma compra em formato não homologado vai para revisão, sem ser interpretada como atualização válida.

## Permissões e configuração externa pendentes

As três novas Functions usam a identidade dedicada já autorizada/configurada na rodada anterior. Ainda não foram criados tópico, assinatura de entrega, agendamento nem novos gatilhos em produção. Nenhum deploy ocorreu.

Quando o consumidor estiver pronto para homologação externa, preparar tópico no projeto aprovado, conceder publicação **somente nesse tópico** a `google-play-developer-notifications@system.gserviceaccount.com`, conferir as identidades de entrega/Eventarc e configurar RTDN do AP1303 no Console. Essa é uma permissão nova e deve ser apresentada ao titular antes de aplicá-la; não reutilizar autorização da conta de serviço para inferir acesso amplo de outro principal. Enviar mensagem de teste e confirmar registro privado no consumidor antes de habilitar compras. Custos/recursos de Functions, Pub/Sub e agendamento devem integrar a revisão de prontidão da candidata.

## Validação

- 10 testes novos: POST fixo, formato RTDN, duplicatas, aviso antigo contrário ao estado atual da API, reconhecimento sem entrega recusado, resposta perdida, fila/sweep, compra sem vínculo, mudança de titular, compra real recusada, concorrência/lease expirado e sincronização restrita ao direito correto.
- 19 testes ao incluir a verificação anterior. Suite geral final: 369 aprovados, 58 ignorados e zero falhas.
- Emuladores demo-ap1303: 6 testes aprovados, incluindo duas verificações simultâneas, privacidade da entrega, RTDN duplicado e reconhecimento após confirmação de benefício com API fictícia. Nenhum acesso a dados/compras reais.
- Lint, sintaxe Node e diff aprovados. Após ajuste defensivo de limpeza do lease, os dez testes direcionados foram repetidos e passaram.

Ainda faltam configuração externa/deploy, teste real Pub/Sub/Play, teste de falhas na infraestrutura implantada, integração da entrega/cotas e toda a homologação de contratação. Esses resultados não significam cobrança pronta ou aprovação de produção.

Referências: [RTDN](https://developer.android.com/google/play/billing/rtdn-reference), [acknowledge](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptions/acknowledge), [segurança e entrega antes de reconhecimento](https://developer.android.com/google/play/billing/security).
