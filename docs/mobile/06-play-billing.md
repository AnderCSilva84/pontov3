# Google Play Billing — base Android da issue #10

Implementação local em 14/11/2026. Integra a [#9](https://github.com/AnderCSilva84/pontov3/issues/9) e a candidata completa de produção [#7](https://github.com/AnderCSilva84/pontov3/issues/7). Não equivale a contratação disponível ou compra homologada.

## O que foi implementado

Dependência oficial `com.android.billingclient:billing:9.1.0`, permissão `com.android.vending.BILLING`, plugin Capacitor `PlayBilling` registrado na MainActivity. Consultas iniciadas somente ao abrir Planos no Android com grupo autenticado; PWA não chama a ponte.

O plugin conecta à Play com reconexão automática, limita a espera das chamadas a 25 segundos, consulta produtos/assinaturas e compras atuais, inclui assinaturas suspensas e escuta mudanças e retomada da Activity. Ofertas aceitas: plano-base `mensal`, uma fase P1M autorrenovável, sem promoção ou parcelamento. Preço Android vem da loja; ausência de produto/oferta mostra indisponibilidade, sem usar preço web como preço efetivo da Play.

Métodos: `configurarSessao`, `consultarProdutos`, `consultarCompras`, `comprar`, `encerrarSessao`. Eventos: `comprasAtualizadas`, `conexaoAlterada`. Contexto: hash SHA-256 de UID/grupo e ID efêmero por instância da tela. Esse hash apenas correlaciona a compra; não prova autorização ou titularidade. O backend deverá conferir grupo, titular, compra e vínculo independentemente antes de conceder direitos.

As respostas de compra são sempre não verificadas. Tokens não são gravados em localStorage nem logs. A consulta de recuperação não entrega tokens de compras com identificador de conta diferente ou ausente; informa apenas a quantidade para revisão futura. Troca de conta/grupo, logout e desmontagem invalidam callbacks e encerram a sessão. A limpeza atrasada de uma tela não fecha uma sessão nova do mesmo usuário.

## Bloqueio de contratação

`BuildConfig.BILLING_COMPRAS_HABILITADAS` está fixado em `false`, em todas as variantes. Não pode ser habilitado por parâmetro JavaScript. O código de abertura do fluxo Play está preparado, mas não está acessível nesta rodada. Nenhum botão de pagamento foi exposto.

Não alterar esse bloqueio antes de implementar na #9: autorização do titular no servidor, verificação pela Developer API, vínculo da compra ao grupo, reconhecimento no servidor, estados pendente/suspenso/cancelado, prevenção de assinatura duplicada e restauração entre dispositivos/canais. Também falta homologar produtos reais de teste na #12. A biblioteca estar presente no AAB pode liberar o cadastro no Console; isso não comprova funcionamento das compras.

## Testes e evidências

- Gradle `:app:compileDebugJavaWithJavac`: aprovado com JDK 21 e SDK 36.
- Gradle `:app:testDebugUnitTest`: 19 testes aprovados, incluindo 3 novos de isolamento de sessão Billing; sem instalação em aparelho.
- Oito testes JavaScript verificam consultas concorrentes sem cobrança, troca de grupo durante consulta, desmontagem durante hash/configuração, rejeição de eventos de outra sessão, bloqueio de compra, erro da loja e preço mensal retornado pela Play.
- Lint e build web aprovados. Manifesto mesclado debug conferido com permissão BILLING e metadado da biblioteca. A configuração gerada confirmou compras desabilitadas.
- Manifesto release/AAB final ainda será conferido na #11. Não usar resultados antigos da pasta build como evidência do release novo.
- Sem AAB, envio à Play, compra real de teste, ativação de assinatura, deploy Firebase/Netlify ou alteração de dados de usuários nesta rodada. Consulta efetiva de produtos na Play e validação física continuam pendentes do pacote de teste/produtos.

## Próximo passo — issue #11

Conferir o maior versionCode efetivamente usado, construir os assets mobile corretos, gerar AAB assinado com a chave existente, conferir manifesto/assinatura/ambiente e enviar somente ao teste interno. Depois verificar se a página Assinaturas permite cadastrar produtos; seguir a #12 para os três produtos/planos-base e testadores. A homologação completa continua na #9 antes da publicação conjunta #7.

Referências oficiais consultadas: [integração](https://developer.android.com/google/play/billing/integrate), [versões](https://developer.android.com/google/play/billing/release-notes), [preparação do Console](https://developer.android.com/google/play/billing/getting-ready).

## Atualização — etapa #11

Em 14/11/2026, o AAB 6 foi validado e disponibilizado no teste interno. Manifesto final confirma BILLING/9.1.0, com compras bloqueadas. A Play liberou o cadastro de assinaturas; #10 concluída para a base nativa. A atualização física segue pendente na #11 e a configuração dos produtos na #12. Ver [artefato e evidências](07-aab-billing-teste-interno.md).
