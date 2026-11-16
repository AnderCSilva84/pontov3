# RTDN na Play Console e candidata Android 7

Atualização posterior: código 7 enviado e disponível para testadores internos em 15/11/2026. [Publicação e roteiro físico](21-teste-interno-codigo7.md). As indicações de artefato ainda não enviado abaixo descrevem a preparação anterior.

15/11/2026 — #9, #11 e #15. O titular confirmou que o maior código de versão listado na Play Console é **6**. Candidata local preparada com código **7**, nome **1.0.0**; não enviada nesta rodada.

## Notificações conectadas

Concedido `roles/pubsub.publisher` à identidade oficial `google-play-developer-notifications@system.gserviceaccount.com` **somente** no tópico `projects/ponto-app-1c55a/topics/assinaturas-play-rtdn`, conforme solicitação de conectar as notificações. Sem papel de publicação no projeto inteiro.

No AP1303, Monetizar → Configuração de monetização: notificações em tempo real ativadas, tópico completo preenchido, conteúdo **Somente assinaturas e compras anuladas** preservado. Console confirmou **“Suas alterações foram salvas”**. Nenhuma outra configuração de monetização foi alterada.

Notificação de teste enviada pelo botão da Play Console. Confirmado novo registro privado `teste_recebido` no backend, com origem RTDN e instante compatível com o envio pelo painel. Isso valida Play Console → Pub/Sub → consumidor → Firestore, sem token/compra nem concessão de plano. Evidências locais: output/play-console-rtdn-confirmado.json, output/play-console-topico-iam.json e output/play-rtdn-configuracao.png.

Referência oficial consultada: [configuração RTDN](https://developer.android.com/google/play/billing/getting-ready#configure-rtdn). O evento apenas provoca consulta da API; não é prova suficiente de pagamento.

## Candidata local

| Campo | Resultado |
| --- | --- |
| Arquivo | output/Ta-no-Ponto-7-1.0.0-Homologacao.aab |
| Bytes | 10.510.490 |
| SHA-256 | AEECC68718F43BED16166BA45F2E654135234E7EB86DE6C184DF9FB53C61177B |
| Pacote / versão | br.dev.acstech.ap1303 / 1.0.0 / 7 |
| Certificado SHA-256 | D000F2D0DF9AC8DF6D0F1B1BCF2EA8F01C09F53E9C3DCFC837C9437691156734 |
| Compras nativas | Desabilitadas |
| Retrato obrigatório | Não |
| Firebase | ponto-app-1c55a, sem emuladores ou host remoto |

Build release local, lint vital, bundletool 1.18.1 validate, manifesto extraído e jarsigner aprovados. Certificado público confere com a chave de upload existente; nenhuma chave nova ou senha exposta. Artefato 6 preservado. Primeiro ensaio encontrou SDK sem caminho no ambiente; repetição com SDK existente explícito passou, sem alterar validadores.

Gerado com modo **artefato local** do preparador existente. Os resultados de assinatura/estrutura não aprovam distribuição, cobrança ou toda a candidata. Sem upload, lançamento interno ou produção nesta rodada. Código 7 ainda não foi consumido na Play; conferir novamente se outra versão for enviada antes dele. Evidências: output/candidata7-build-final.log, output/candidata7-bundletool.log, output/candidata7-assinatura.log, output/candidata7-manifest.xml e output/candidata7-validacao.json.

## Dependências da interface

Para a candidata não chamar endpoints inexistentes, implantadas seletivamente cinco APIs novas: cadastrarFuncionario, pontoTitular, gerirAcesso, escritorioOperacao e cadastrarTarefa. Região us-central1, min0/max2, timeout60s. Não foram atualizadas Functions antigas ou regras gerais. As cinco estão ACTIVE e recusam chamadas sem login com HTTP401/UNAUTHENTICATED. Sintaxe e lint aprovados; lógica já coberta pelas suítes integradas anteriores. Conferência remota em output/candidata7-apis.json.

Gates de homologação continuam desligados e grupo dedicado em transição, conforme output/candidata7-backend-gates.json. Não ativar regime comercial antes da implantação/revisão completa das cotas e regras; apenas disponibilizar as APIs novas não cobre escritas diretas nem todos os fluxos existentes.

## Próximo passo

Revisar a candidata e preparar envio à faixa interna, sem desinstalar/limpar dados do Android atual. Homologar interface/compatibilidade, depois completar cobertura/regime de teste, produtos/testador e liberação controlada de compras de teste. AAB7 consulta loja e prepara recuperação de compra existente, mas não inicia contratação. Não alegar teste de compra/ACK/cancelamento/expiração física por conta do teste RTDN aprovado. Mercado Pago, migração efetiva, concessão do criador e publicação completa permanecem pendentes.
