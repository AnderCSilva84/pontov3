# AP1303 — pacote local para revisão Google Play

**Rascunhos iniciados em 23/10/2026 e consolidados em 24/10/2026. Nada foi publicado ou enviado ao Play Console. Não são documentos jurídicos aprovados.**

Leia primeiro [o relatório do Script13](../13-versao-candidata-android.md). Os testes anteriores informados pelo usuário constam como histórico; as execuções novas são discriminadas nesse relatório.

Materiais:

* [Identidade, configuração e assinatura](configuracao-e-assinatura.md), exemplos JSON locais sem credenciais.
* [Inventário de dados/SDKs e rascunho de Segurança dos dados](dados-e-permissoes.md).
* [Política de privacidade — rascunho](privacidade-rascunho.md).
* [Exclusão, retenção e suporte — rascunho](exclusao-suporte-rascunho.md).
* [Ficha, imagens e notas](ficha-e-revisao.md).
* [Publicação futura e recuperação](roteiro-publicacao.md).
* [Artefatos/checksums](artefatos.json) e [inventário de fontes locais](inventario-fontes.json), necessários porque o HEAD não inclui as alterações sem commit.

Os campos pendentes estão descritos em seções próprias. Não publicar estes arquivos como política final nem inserir placeholders no Console. Nenhuma senha, chave administrativa ou conta de revisor real é incluída aqui.

## Decisões objetivas do titular

1. Confirmar nome público, applicationId definitivo, versão inicial e projeto Firebase final correspondente. O pacote atual `br.dev.acstech.ap1303.dev` não é a identidade final.
2. Definir responsável pelo tratamento, contato de suporte/privacidade, URLs públicas e fluxo de recuperação por email no destino final.
3. Definir finalidades, fundamento, critérios/prazos de retenção e descarte com orientação jurídica/contábil; decidir tratamento dos dados sensíveis de cuidados e menores representados.
4. Autorizar especificamente geração/uso e guarda da chave de upload. Nenhuma chave definitiva foi criada/substituída.
5. Definir público-alvo, classificação IARC, declaração de saúde e eventuais declarações financeiras conforme a versão realmente distribuída. Planos e cobrança em loja não estão implementados nesta rodada.
6. Disponibilizar ambiente demonstrativo acessível aos revisores fora da rede USB, com dados fictícios e recursos suficientes. Não usar a casa/endereço de cliente como condição de avaliação.

## Fontes oficiais consultadas em 23/10/2026

* [Target API](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en): a regra atual para novos apps/atualizações comuns pede API36 desde31/08/2026. O projeto declara36; isso não substitui inspeção do pacote.
* [Páginas de memória16KB](https://developer.android.com/guide/practices/page-sizes): conferir bibliotecas `.so` transitivas e ambiente de teste. A página consultada menciona bloqueio de atualizações incompatíveis em01/02/2027; revalidar a regra no Console na submissão. Não usar apenas uma data histórica para declarar conformidade.
* [Ficha e limites](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en) e [materiais gráficos](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en).
* [Exclusão de conta](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en): exige caminho no app e recurso web; retenções legítimas precisam ser explicitadas.
* [Declaração de saúde](https://support.google.com/googleplay/android-developer/answer/14738291?hl=en) e [conteúdo/serviços de saúde](https://support.google.com/googleplay/android-developer/answer/16679511?hl=en): lembretes de medicamentos aparecem no escopo da declaração. Não declarar ausência de saúde só porque o app também controla compras.
* [SDKs Firebase e Segurança dos dados](https://firebase.google.com/docs/android/play-data-disclosure) e [privacidade Firebase](https://firebase.google.com/support/privacy). Considerar também SDK web dentro da WebView e dados do próprio app, além do FCM nativo.
* [Assinatura Android](https://developer.android.com/studio/publish/app-signing), [App Bundle](https://developer.android.com/guide/app-bundle) e [acesso para revisão](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en).

Essas referências orientam preparação técnica e declarações; não garantem aprovação de loja ou conformidade jurídica.

## Estado atualizado dos documentos

Nome, identidade Android, chave de upload, Firebase compartilhado e responsável/contato já foram aprovados/configurados em rodadas posteriores. Para esta etapa documental, vale [Documentos públicos preparados](documentos-publicos.md): contém as três rotas ainda não publicadas e uma única lista de decisões de retenção pendentes. As listas iniciais desta página são históricas; não solicitar novamente decisões já aprovadas.